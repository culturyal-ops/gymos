# Phase 2: AI Cost Optimization, n8n Scaling, and Offline Reception

This document outlines the three performance and reliability fixes implemented in Phase 2.

---

## Fix #4: AI Intent Classifier + Response Cache

### Problem
- Every WhatsApp message calls Claude API (~$0.001 per call)
- At 300k messages/month, that's $300/month just for AI
- Many queries are repetitive (batch timings, pricing, membership status)
- Response latency is 2-3 seconds per message (Claude API call)

### Solution
Implement a lightweight intent classifier that identifies cacheable queries and stores responses for 30 minutes.

### Files Created

#### 1. Database Migration
**File:** `supabase/migrations/004_phase2_ai_cache_and_queues.sql`

Creates:
- `response_cache` table (intent_key, query_hash, response_json, expires_at)
- `ai_cost_log` table (tracks cache hits vs misses)
- Indexes for O(1) lookups
- RLS policies for multi-tenancy

#### 2. Intent Classifier
**File:** `lib/ai-intent-classifier.ts`

Provides:
- `classifyIntent(message)` – Keyword-based classification
- `isCacheableIntent(intent)` – Check if intent can be cached
- `getCacheTTL(intent)` – Get cache duration (30 min for pricing, 24h for timings)
- `generateCacheKey(message)` – Normalize query for deduplication

**Intents:**
- `batch_timings` – "What are the morning timings?" (TTL: 24h)
- `pricing_query` – "How much is the membership?" (TTL: 30m)
- `membership_status` – "When does my membership expire?" (TTL: 5m)
- `renewal_intent` – "I want to renew" (requires Claude)
- `diet_consultation` – "What protein should I take?" (TTL: 1h)
- `general_query` – Anything else (requires Claude)

#### 3. Response Cache Utility
**File:** `lib/response-cache.ts`

Provides:
- `getCachedResponse()` – Check cache before calling Claude
- `cacheResponse()` – Store response in cache
- `logAICost()` – Track cache hits/misses
- `invalidateGymCache()` – Clear cache when gym settings change
- `getCacheStats()` – Analytics (hit rate, estimated savings)

#### 4. AI Cost Log
Tracks every query:
- Cache hit or miss
- Tokens used (if Claude called)
- Cost in USD
- Intent key

### How It Works

**Flow:**
1. Message arrives: "What are the morning batch timings?"
2. Classify intent: `batch_timings` (confidence: 0.95)
3. Check cache: Found! (cached 2 hours ago)
4. Return cached response (sub-millisecond)
5. Log cache hit
6. Send to member

**vs. Without Cache:**
1. Message arrives
2. Call Claude API (2-3 seconds)
3. Pay $0.001
4. Send response

### Expected Impact

- **60-70% reduction in Claude API calls** (most queries are batch timings or pricing)
- **Sub-second response time** for cached queries (vs. 2-3 seconds)
- **$180-210/month savings** at 300k messages/month
- **Better UX** – Members get instant replies

### Testing

```typescript
// Test intent classification
const { intent, confidence } = classifyIntent("What are the morning timings?");
expect(intent).toBe("batch_timings");
expect(confidence).toBeGreaterThan(0.8);

// Test cache hit
const { cached, response } = await getCachedResponse(supabase, gymId, "batch_timings", "morning timings");
expect(cached).toBe(true);

// Test cache invalidation
await invalidateGymCache(supabase, gymId, ["batch_timings", "pricing_query"]);
const { cached: cached2 } = await getCachedResponse(supabase, gymId, "batch_timings", "morning timings");
expect(cached2).toBe(false);
```

---

## Fix #5: n8n Queue Mode + Worker Scaling

### Problem
- Single n8n instance runs Node.js single-threaded
- 50+ concurrent messages cause queueing and delays
- At 100 gyms, peak load can crash the instance
- No horizontal scaling capability

### Solution
Implement Redis-backed queue mode with multiple n8n workers.

### Files Created

#### 1. Database Migration
**File:** `supabase/migrations/004_phase2_ai_cache_and_queues.sql`

Creates:
- `inbound_message_queue` table (status: pending/processing/completed/failed)
- `gym_processing_slots` table (concurrency limiting per gym)
- Indexes for efficient polling

#### 2. Message Queue Utility
**File:** `lib/message-queue.ts`

Provides:
- `enqueueMessage()` – Add message to queue (webhook receiver)
- `dequeueMessage()` – Get next pending message (worker)
- `markProcessing()` – Mark as being processed
- `markCompleted()` – Mark as done
- `markFailed()` – Mark as failed (with retry logic)
- `getQueueStats()` – Monitor queue health

#### 3. Concurrency Limiter
**File:** `lib/concurrency-limiter.ts`

Provides:
- `hasAvailableSlot()` – Check if gym has available slots
- `acquireSlot()` – Reserve a slot for processing
- `releaseSlot()` – Release slot after processing
- `getSlotStatus()` – Monitor utilization

### Architecture

**Before (Single Instance):**
```
Webhook → n8n (single-threaded) → Claude → WhatsApp
         (blocks on each message)
```

**After (Queue Mode):**
```
Webhook → Redis Queue → n8n Worker 1 → Claude → WhatsApp
                     → n8n Worker 2 → Claude → WhatsApp
                     → n8n Worker 3 → Claude → WhatsApp
```

### Deployment

**1. Add Redis to Railway**
```bash
# In Railway dashboard:
# Add Redis plugin (one-click)
# Get REDIS_HOST and REDIS_PORT
```

**2. Update n8n Configuration**
```yaml
# docker-compose.yml or railway.toml
services:
  n8n-main:
    environment:
      EXECUTIONS_MODE: queue
      QUEUE_BULL_REDIS_HOST: ${REDIS_HOST}
      QUEUE_BULL_REDIS_PORT: 6379
      N8N_RUNNERS_ENABLED: false
    ports:
      - "5678:5678"

  n8n-worker-1:
    environment:
      EXECUTIONS_MODE: queue
      QUEUE_BULL_REDIS_HOST: ${REDIS_HOST}
      QUEUE_BULL_REDIS_PORT: 6379
      N8N_RUNNERS_ENABLED: true

  n8n-worker-2:
    environment:
      EXECUTIONS_MODE: queue
      QUEUE_BULL_REDIS_HOST: ${REDIS_HOST}
      QUEUE_BULL_REDIS_PORT: 6379
      N8N_RUNNERS_ENABLED: true
```

**3. Split Workflows**

**Workflow 00: Message Receiver (Main Instance)**
```
Webhook (AiSensy) 
  → Validate phone number
  → Call enqueueMessage()
  → Return 200 OK (fast)
```

**Workflow 01: Message Processor (Workers)**
```
Poll inbound_message_queue
  → Get pending messages
  → For each message:
    - markProcessing()
    - acquireSlot()
    - Classify intent
    - Check cache
    - Call Claude (if needed)
    - Validate WhatsApp compliance
    - Send WhatsApp
    - releaseSlot()
    - markCompleted()
```

### Expected Impact

- **No more timeouts** – Webhook returns immediately
- **Horizontal scaling** – Add workers as load increases
- **Per-gym concurrency limits** – Prevent one gym from hogging resources
- **Better reliability** – Failed messages are retried automatically
- **Monitoring** – Queue stats show health in real-time

### Testing

```typescript
// Test queue operations
const { success, messageId } = await enqueueMessage(supabase, gymId, "+919876543210", "Hello");
expect(success).toBe(true);

// Test dequeue
const { messages } = await dequeueMessage(supabase, 10);
expect(messages.length).toBeGreaterThan(0);

// Test concurrency limiting
const { acquired: slot1 } = await acquireSlot(supabase, gymId);
expect(slot1).toBe(true);

// Simulate 100 concurrent messages
for (let i = 0; i < 100; i++) {
  await enqueueMessage(supabase, gymId, `+919876543${i}`, "Test");
}

// Verify no messages lost
const stats = await getQueueStats(supabase, gymId);
expect(stats.pending).toBe(100);
```

---

## Fix #6: Offline-First Reception PWA

### Problem
- Indian gyms have frequent power cuts and patchy internet
- Reception staff revert to paper when internet is down
- Attendance and cash payments are lost
- GymOS becomes "the software that doesn't work when you need it"

### Solution
Build a Progressive Web App (PWA) with offline-first capability using IndexedDB.

### Files Created

#### 1. Database Migration
**File:** `supabase/migrations/004_phase2_ai_cache_and_queues.sql`

Creates:
- `offline_attendance_queue` table (synced: boolean)
- `offline_payment_queue` table (synced: boolean)
- Indexes for efficient sync

#### 2. Offline Sync Utility
**File:** `lib/offline-sync.ts`

Provides:
- `syncOfflineAttendance()` – Sync attendance records
- `syncOfflinePayments()` – Sync payment records
- `getUnsyncedRecords()` – Get pending records
- `getSyncStatus()` – Monitor sync progress

### Client-Side Implementation

**1. Add PWA Manifest**
```json
// public/manifest.json
{
  "name": "GymOS Reception",
  "short_name": "Reception",
  "display": "standalone",
  "start_url": "/reception/[slug]",
  "scope": "/reception/",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ],
  "theme_color": "#000000",
  "background_color": "#ffffff"
}
```

**2. Add Service Worker**
```typescript
// Use next-pwa or serwist package
// Automatically caches app shell and assets
// Enables offline functionality
```

**3. IndexedDB Schema (Dexie.js)**
```typescript
import Dexie, { Table } from 'dexie';

export interface OfflineAttendance {
  offline_id: string;
  member_id: string;
  gym_id: string;
  logged_at: string;
  synced: boolean;
}

export interface OfflinePayment {
  offline_id: string;
  member_id: string | null;
  gym_id: string;
  amount: number;
  payment_mode: 'cash' | 'counter_upi';
  logged_at: string;
  synced: boolean;
}

export class ReceptionDB extends Dexie {
  attendance!: Table<OfflineAttendance>;
  payments!: Table<OfflinePayment>;

  constructor() {
    super('ReceptionDB');
    this.version(1).stores({
      attendance: '++offline_id, gym_id, synced',
      payments: '++offline_id, gym_id, synced'
    });
  }
}
```

**4. Sync Service**
```typescript
// lib/reception-sync-service.ts
export class ReceptionSyncService {
  private db: ReceptionDB;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor(db: ReceptionDB) {
    this.db = db;
  }

  // Start periodic sync when online
  startSync() {
    if (this.syncInterval) return;
    
    this.syncInterval = setInterval(async () => {
      if (navigator.onLine) {
        await this.syncAll();
      }
    }, 5000); // Check every 5 seconds
  }

  // Sync all pending records
  async syncAll() {
    const attendance = await this.db.attendance
      .where('synced').equals(false).toArray();
    const payments = await this.db.payments
      .where('synced').equals(false).toArray();

    if (attendance.length > 0) {
      const result = await syncOfflineAttendance(supabase, gymId, attendance);
      if (result.success) {
        await this.db.attendance
          .bulkUpdate(
            result.synced.map(id => ({ key: id, changes: { synced: true } }))
          );
      }
    }

    if (payments.length > 0) {
      const result = await syncOfflinePayments(supabase, gymId, payments);
      if (result.success) {
        await this.db.payments
          .bulkUpdate(
            result.synced.map(id => ({ key: id, changes: { synced: true } }))
          );
      }
    }
  }

  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}
```

**5. UI Components**
```typescript
// components/reception/OfflineIndicator.tsx
export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4">
        <p className="text-yellow-700">
          📡 Internet disconnected. Changes saved locally. Will sync when reconnected.
        </p>
        {syncStatus && syncStatus.totalPending > 0 && (
          <p className="text-sm text-yellow-600 mt-2">
            {syncStatus.totalPending} records waiting to sync
          </p>
        )}
      </div>
    );
  }

  return null;
}
```

### Expected Impact

- **Zero data loss** – Attendance and payments saved locally
- **Seamless UX** – Staff doesn't notice internet outages
- **Automatic sync** – Records sync when connectivity returns
- **Idempotent** – No duplicate records even if sync fails
- **Installable** – "Add to Home Screen" on Android tablet

### Testing

```typescript
// Test offline storage
const db = new ReceptionDB();
await db.attendance.add({
  offline_id: 'test-1',
  member_id: 'member-1',
  gym_id: 'gym-1',
  logged_at: new Date().toISOString(),
  synced: false
});

// Simulate offline
window.dispatchEvent(new Event('offline'));

// Verify record is stored
const records = await db.attendance.where('synced').equals(false).toArray();
expect(records.length).toBe(1);

// Simulate online
window.dispatchEvent(new Event('online'));

// Verify sync happens
await new Promise(resolve => setTimeout(resolve, 6000)); // Wait for sync
const synced = await db.attendance.where('synced').equals(true).toArray();
expect(synced.length).toBe(1);
```

---

## Integration: How These Fixes Work Together

### Scenario: 100 Gyms, 300k Messages/Month

**Before Phase 2:**
- Claude API cost: $300/month
- Response time: 2-3 seconds
- Peak load crashes n8n
- Reception staff uses paper during outages

**After Phase 2:**
- Claude API cost: $90-120/month (60-70% savings)
- Response time: <100ms for cached queries
- Handles 100+ concurrent messages
- Reception works offline, syncs automatically

### Data Flow

```
Member sends WhatsApp
         ↓
Webhook → enqueueMessage() → Redis Queue
         ↓
n8n Worker picks up message
         ↓
classifyIntent() → batch_timings
         ↓
getCachedResponse() → Cache hit!
         ↓
validateWhatsAppMessage() → OK
         ↓
Send WhatsApp (sub-second)
         ↓
markCompleted() → releaseSlot()
```

---

## Deployment Checklist

- [ ] Apply migration: `supabase migration up`
- [ ] Add Redis to Railway
- [ ] Update n8n configuration (queue mode)
- [ ] Deploy n8n main instance
- [ ] Deploy n8n workers (start with 2)
- [ ] Update n8n workflows (split into receiver + processor)
- [ ] Test intent classifier
- [ ] Test cache hits/misses
- [ ] Test queue operations
- [ ] Test concurrency limiting
- [ ] Test offline reception (PWA)
- [ ] Test offline sync
- [ ] Monitor AI cost savings
- [ ] Monitor queue health

---

## Next Steps (Phase 3)

- **Security Vaulting** – Supabase Vault for API keys
- **Observability** – Sentry error tracking
- **Dead-Letter Queue** – Handle failed messages
- **Owner Billing** – Razorpay Subscriptions + GST

---

## Questions?

See inline comments in each file for implementation details.
