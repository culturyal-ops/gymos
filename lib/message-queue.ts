/**
 * Message Queue Utility
 * 
 * Manages the inbound message queue for n8n.
 * Decouples webhook reception from message processing.
 * Enables horizontal scaling via queue-based workers.
 */

import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/supabase/typed-client";

export type MessageStatus = "pending" | "processing" | "completed" | "failed";

interface QueuedMessage {
  id: string;
  gym_id: string;
  phone_number: string;
  message_text: string;
  status: MessageStatus;
  attempts: number;
  max_attempts: number;
  error_log: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Add a message to the queue
 * Called by the webhook receiver (fast path)
 */
export async function enqueueMessage(
  supabase: ReturnType<typeof createClient>,
  gymId: string,
  phoneNumber: string,
  messageText: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { data, error } = await db(supabase)
      .from("inbound_message_queue")
      .insert({
        gym_id: gymId,
        phone_number: phoneNumber,
        message_text: messageText,
        status: "pending",
        attempts: 0,
        max_attempts: 3
      })
      .select("id")
      .single();

    if (error) {
      console.error("Queue enqueue error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error("Queue enqueue error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Get next pending message from queue
 * Called by n8n worker
 */
export async function dequeueMessage(
  supabase: ReturnType<typeof createClient>,
  limit: number = 1
): Promise<{ messages: QueuedMessage[]; error?: string }> {
  try {
    const { data, error } = await db(supabase)
      .from("inbound_message_queue")
      .select("*")
      .eq("status", "pending")
      .lt("attempts", "max_attempts")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("Queue dequeue error:", error);
      return { messages: [], error: error.message };
    }

    return { messages: (data || []) as QueuedMessage[] };
  } catch (error) {
    console.error("Queue dequeue error:", error);
    return { messages: [], error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Mark message as processing
 */
export async function markProcessing(
  supabase: ReturnType<typeof createClient>,
  messageId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await db(supabase)
      .from("inbound_message_queue")
      .update({
        status: "processing",
        updated_at: new Date().toISOString()
      })
      .eq("id", messageId);

    if (error) {
      console.error("Mark processing error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Mark processing error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Mark message as completed
 */
export async function markCompleted(
  supabase: ReturnType<typeof createClient>,
  messageId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await db(supabase)
      .from("inbound_message_queue")
      .update({
        status: "completed",
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", messageId);

    if (error) {
      console.error("Mark completed error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Mark completed error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Mark message as failed and increment attempts
 */
export async function markFailed(
  supabase: ReturnType<typeof createClient>,
  messageId: string,
  errorLog: string
): Promise<{ success: boolean; shouldRetry: boolean; error?: string }> {
  try {
    // Get current attempts
    const { data: message, error: fetchError } = await db(supabase)
      .from("inbound_message_queue")
      .select("attempts, max_attempts")
      .eq("id", messageId)
      .single();

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      return { success: false, shouldRetry: false, error: fetchError.message };
    }

    const newAttempts = (message?.attempts || 0) + 1;
    const shouldRetry = newAttempts < (message?.max_attempts || 3);
    const newStatus = shouldRetry ? "pending" : "failed";

    const { error } = await db(supabase)
      .from("inbound_message_queue")
      .update({
        status: newStatus,
        attempts: newAttempts,
        error_log: errorLog,
        updated_at: new Date().toISOString()
      })
      .eq("id", messageId);

    if (error) {
      console.error("Mark failed error:", error);
      return { success: false, shouldRetry: false, error: error.message };
    }

    return { success: true, shouldRetry };
  } catch (error) {
    console.error("Mark failed error:", error);
    return { success: false, shouldRetry: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats(
  supabase: ReturnType<typeof createClient>,
  gymId?: string
): Promise<{
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  avgProcessingTime: number;
}> {
  try {
    let query = db(supabase).from("inbound_message_queue").select("status, created_at, processed_at");

    if (gymId) {
      query = query.eq("gym_id", gymId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Stats error:", error);
      return { pending: 0, processing: 0, completed: 0, failed: 0, avgProcessingTime: 0 };
    }

    const messages = data || [];
    const pending = messages.filter((m) => m.status === "pending").length;
    const processing = messages.filter((m) => m.status === "processing").length;
    const completed = messages.filter((m) => m.status === "completed").length;
    const failed = messages.filter((m) => m.status === "failed").length;

    // Calculate average processing time
    const completedMessages = messages.filter((m) => m.status === "completed" && m.processed_at);
    const avgProcessingTime =
      completedMessages.length > 0
        ? completedMessages.reduce((sum, m) => {
            const created = new Date(m.created_at).getTime();
            const processed = new Date(m.processed_at).getTime();
            return sum + (processed - created);
          }, 0) / completedMessages.length
        : 0;

    return {
      pending,
      processing,
      completed,
      failed,
      avgProcessingTime: Math.round(avgProcessingTime / 1000) // Convert to seconds
    };
  } catch (error) {
    console.error("Stats error:", error);
    return { pending: 0, processing: 0, completed: 0, failed: 0, avgProcessingTime: 0 };
  }
}

/**
 * Example n8n workflow integration:
 * 
 * WEBHOOK RECEIVER (Fast path):
 * 1. Receive WhatsApp message
 * 2. Call enqueueMessage(supabase, gymId, phone, message)
 * 3. Return 200 OK immediately
 * 
 * WORKER (Slow path):
 * 1. Poll: const { messages } = await dequeueMessage(supabase, 10)
 * 2. For each message:
 *    a. markProcessing(supabase, messageId)
 *    b. Process: classify intent, check cache, call Claude, send WhatsApp
 *    c. If success: markCompleted(supabase, messageId)
 *    d. If error: markFailed(supabase, messageId, errorLog)
 */
