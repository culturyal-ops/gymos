/**
 * Response Cache Utility
 * 
 * Manages caching of AI responses to reduce Claude API calls.
 * Integrates with the response_cache table in Supabase.
 */

import { createClient } from "@supabase/supabase-js";
import { IntentKey, generateCacheKey, getCacheTTL } from "./ai-intent-classifier";

interface CachedResponse {
  id: string;
  response_json: Record<string, unknown>;
  expires_at: string;
}

/**
 * Check if a response is cached
 */
export async function getCachedResponse(
  supabase: ReturnType<typeof createClient>,
  gymId: string,
  intentKey: IntentKey,
  queryMessage: string
): Promise<{ cached: boolean; response?: Record<string, unknown> }> {
  try {
    const cacheKey = generateCacheKey(queryMessage);

    const { data, error } = await supabase
      .from("response_cache")
      .select("response_json, expires_at")
      .eq("gym_id", gymId)
      .eq("intent_key", intentKey)
      .eq("query_hash", cacheKey)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found (expected)
      console.error("Cache lookup error:", error);
      return { cached: false };
    }

    if (data) {
      return {
        cached: true,
        response: data.response_json as Record<string, unknown>
      };
    }

    return { cached: false };
  } catch (error) {
    console.error("Cache retrieval error:", error);
    return { cached: false };
  }
}

/**
 * Store a response in cache
 */
export async function cacheResponse(
  supabase: ReturnType<typeof createClient>,
  gymId: string,
  intentKey: IntentKey,
  queryMessage: string,
  response: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    const cacheKey = generateCacheKey(queryMessage);
    const ttlMinutes = getCacheTTL(intentKey);

    if (ttlMinutes === 0) {
      // Not cacheable
      return { success: true };
    }

    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

    const { error } = await supabase
      .from("response_cache")
      .upsert(
        {
          gym_id: gymId,
          intent_key: intentKey,
          query_hash: cacheKey,
          response_json: response,
          expires_at: expiresAt
        },
        {
          onConflict: "gym_id,intent_key,query_hash"
        }
      );

    if (error) {
      console.error("Cache storage error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Cache storage error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Log AI cost (cache hit or miss)
 */
export async function logAICost(
  supabase: ReturnType<typeof createClient>,
  gymId: string,
  intentKey: IntentKey,
  cacheHit: boolean,
  tokensUsed?: number,
  costUsd?: number
): Promise<{ success: boolean }> {
  try {
    const { error } = await supabase
      .from("ai_cost_log")
      .insert({
        gym_id: gymId,
        intent_key: intentKey,
        cache_hit: cacheHit,
        tokens_used: tokensUsed || null,
        cost_usd: costUsd || null
      });

    if (error) {
      console.error("Cost log error:", error);
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.error("Cost log error:", error);
    return { success: false };
  }
}

/**
 * Invalidate cache for a gym
 * Called when gym settings (pricing, timings) are updated
 */
export async function invalidateGymCache(
  supabase: ReturnType<typeof createClient>,
  gymId: string,
  intentKeys?: IntentKey[]
): Promise<{ success: boolean; deletedCount?: number }> {
  try {
    let query = supabase
      .from("response_cache")
      .delete()
      .eq("gym_id", gymId);

    // Optionally filter by specific intent keys
    if (intentKeys && intentKeys.length > 0) {
      query = query.in("intent_key", intentKeys);
    }

    const { count, error } = await query;

    if (error) {
      console.error("Cache invalidation error:", error);
      return { success: false };
    }

    return { success: true, deletedCount: count || 0 };
  } catch (error) {
    console.error("Cache invalidation error:", error);
    return { success: false };
  }
}

/**
 * Get cache statistics for a gym
 */
export async function getCacheStats(
  supabase: ReturnType<typeof createClient>,
  gymId: string,
  days: number = 7
): Promise<{
  totalQueries: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  estimatedSavings: number;
}> {
  try {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("ai_cost_log")
      .select("cache_hit, cost_usd")
      .eq("gym_id", gymId)
      .gte("created_at", startDate);

    if (error) {
      console.error("Stats error:", error);
      return {
        totalQueries: 0,
        cacheHits: 0,
        cacheMisses: 0,
        hitRate: 0,
        estimatedSavings: 0
      };
    }

    const logs = data || [];
    const cacheHits = logs.filter((log) => log.cache_hit).length;
    const cacheMisses = logs.filter((log) => !log.cache_hit).length;
    const totalQueries = logs.length;
    const hitRate = totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0;

    // Estimate savings: assume each cache hit saves $0.001 (rough Claude API cost)
    const estimatedSavings = cacheHits * 0.001;

    return {
      totalQueries,
      cacheHits,
      cacheMisses,
      hitRate,
      estimatedSavings
    };
  } catch (error) {
    console.error("Stats error:", error);
    return {
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      hitRate: 0,
      estimatedSavings: 0
    };
  }
}

/**
 * Example usage in n8n workflow:
 * 
 * 1. Classify intent:
 *    const { intent, confidence } = classifyIntent(message);
 * 
 * 2. Check cache:
 *    const { cached, response } = await getCachedResponse(supabase, gymId, intent, message);
 *    if (cached) {
 *      await logAICost(supabase, gymId, intent, true);
 *      return response; // Skip Claude
 *    }
 * 
 * 3. Call Claude:
 *    const aiResponse = await callClaude(message);
 *    await cacheResponse(supabase, gymId, intent, message, aiResponse);
 *    await logAICost(supabase, gymId, intent, false, tokensUsed, costUsd);
 *    return aiResponse;
 */
