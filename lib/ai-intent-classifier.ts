/**
 * AI Intent Classifier
 * 
 * Lightweight keyword-based intent classification that runs BEFORE Claude.
 * Reduces API calls by identifying cacheable queries.
 * 
 * Intents:
 * - batch_timings: Query about class timings
 * - pricing_query: Questions about membership cost
 * - membership_status: Check membership expiry/status
 * - renewal_intent: Want to renew membership
 * - diet_consultation: Diet/supplement questions
 * - general_query: Anything else (requires Claude)
 */

export type IntentKey =
  | "batch_timings"
  | "pricing_query"
  | "membership_status"
  | "renewal_intent"
  | "diet_consultation"
  | "general_query";

interface IntentClassification {
  intent: IntentKey;
  confidence: number; // 0-1
  keywords_matched: string[];
}

/**
 * Keyword patterns for each intent
 * Lowercase for case-insensitive matching
 */
const INTENT_KEYWORDS: Record<IntentKey, string[]> = {
  batch_timings: [
    "timing",
    "batch",
    "time",
    "class",
    "schedule",
    "when",
    "morning",
    "evening",
    "6am",
    "7am",
    "5pm",
    "6pm",
    "hours",
    "open"
  ],
  pricing_query: [
    "price",
    "fee",
    "cost",
    "how much",
    "rate",
    "membership",
    "plan",
    "package",
    "discount",
    "offer",
    "rupees",
    "rs",
    "₹"
  ],
  membership_status: [
    "status",
    "expiry",
    "expire",
    "days left",
    "plan",
    "active",
    "valid",
    "when expire",
    "membership",
    "renew"
  ],
  renewal_intent: [
    "renew",
    "extend",
    "continue",
    "reactivate",
    "restart",
    "rejoin",
    "want to join",
    "interested",
    "sign up",
    "register"
  ],
  diet_consultation: [
    "diet",
    "supplement",
    "whey",
    "protein",
    "nutrition",
    "food",
    "meal",
    "eating",
    "weight",
    "muscle",
    "fat loss",
    "gain"
  ],
  general_query: []
};

/**
 * Classify a message into an intent category
 * Returns the most likely intent based on keyword matching
 */
export function classifyIntent(message: string): IntentClassification {
  const normalizedMessage = message.toLowerCase().trim();

  // Score each intent based on keyword matches
  const scores: Record<IntentKey, { score: number; matched: string[] }> = {
    batch_timings: { score: 0, matched: [] },
    pricing_query: { score: 0, matched: [] },
    membership_status: { score: 0, matched: [] },
    renewal_intent: { score: 0, matched: [] },
    diet_consultation: { score: 0, matched: [] },
    general_query: { score: 0, matched: [] }
  };

  // Check each intent's keywords
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    const intentKey = intent as IntentKey;
    let matchCount = 0;
    const matched: string[] = [];

    for (const keyword of keywords) {
      if (normalizedMessage.includes(keyword)) {
        matchCount++;
        matched.push(keyword);
      }
    }

    // Score: number of matches + bonus for multiple matches
    scores[intentKey].score = matchCount + (matchCount > 1 ? 0.5 : 0);
    scores[intentKey].matched = matched;
  }

  // Find the intent with the highest score
  let bestIntent: IntentKey = "general_query";
  let bestScore = 0;
  let bestMatched: string[] = [];

  for (const [intent, data] of Object.entries(scores)) {
    if (data.score > bestScore) {
      bestScore = data.score;
      bestIntent = intent as IntentKey;
      bestMatched = data.matched;
    }
  }

  // If no keywords matched, default to general_query
  if (bestScore === 0) {
    bestIntent = "general_query";
  }

  // Calculate confidence (0-1)
  // More matches = higher confidence
  const confidence = Math.min(bestScore / 3, 1); // Max 3 matches for 100% confidence

  return {
    intent: bestIntent,
    confidence,
    keywords_matched: bestMatched
  };
}

/**
 * Check if an intent is cacheable
 * Some intents require fresh Claude responses
 */
export function isCacheableIntent(intent: IntentKey): boolean {
  // These intents have static or semi-static answers
  const cacheableIntents: IntentKey[] = [
    "batch_timings",
    "pricing_query",
    "diet_consultation"
  ];

  return cacheableIntents.includes(intent);
}

/**
 * Get cache TTL (time-to-live) in minutes for an intent
 */
export function getCacheTTL(intent: IntentKey): number {
  switch (intent) {
    case "batch_timings":
      return 1440; // 24 hours (timings rarely change)
    case "pricing_query":
      return 30; // 30 minutes (prices might change)
    case "diet_consultation":
      return 60; // 1 hour (general advice)
    default:
      return 0; // Not cacheable
  }
}

/**
 * Generate a cache key from a message
 * Used to deduplicate similar queries
 */
export function generateCacheKey(message: string): string {
  // Normalize: lowercase, trim, remove extra spaces
  const normalized = message
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

  // Simple hash: just use the normalized message as key
  // In production, use SHA256 for better deduplication
  return normalized;
}

/**
 * Example usage:
 * 
 * const classification = classifyIntent("What are the morning batch timings?");
 * // { intent: "batch_timings", confidence: 0.9, keywords_matched: ["batch", "timing", "morning"] }
 * 
 * if (isCacheableIntent(classification.intent)) {
 *   const ttl = getCacheTTL(classification.intent);
 *   // Check cache, then call Claude if miss
 * }
 */
