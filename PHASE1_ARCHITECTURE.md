# Phase 1 Architecture Overview

## System Architecture After Phase 1

```
┌─────────────────────────────────────────────────────────────────┐
│                         GymOS Platform                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                         │
│  - Dashboard (owner)                                            │
│  - Reception (PWA - Phase 2)                                    │
│  - Member portal                                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    API Routes (Next.js)                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ /api/gym/[slug]/payment-link (NEW - Fix #10)            │  │
│  │ - Validates plan from plans table                        │  │
│  │ - Validates coupon from discounts table                  │  │
│  │ - Creates Razorpay link server-side                      │  │
│  │ - Logs to payment_link_audit                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ /api/gym/[slug]/validate-whatsapp (NEW - Fix #3)        │  │
│  │ - Checks whatsapp_opt_outs table                         │  │
│  │ - Checks whatsapp_daily_counts table                     │  │
│  │ - Returns validation result                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ /api/gym/[slug]/increment-whatsapp-count (NEW - Fix #3) │  │
│  │ - Increments daily message counter                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ /api/gym/[slug]/handle-whatsapp-optout (NEW - Fix #3)   │  │
│  │ - Handles STOP/UNSUBSCRIBE commands                      │  │
│  │ - Adds to whatsapp_opt_outs table                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Existing routes (members, leads, transactions, etc.)    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Utilities (lib/)                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ lib/whatsapp-compliance.ts (NEW - Fix #3)               │  │
│  │ - isPhoneOptedOut()                                      │  │
│  │ - addPhoneOptOut()                                       │  │
│  │ - hasReachedDailyLimit()                                 │  │
│  │ - getDailyMessageCount()                                 │  │
│  │ - incrementDailyCount()                                  │  │
│  │ - validateWhatsAppMessage()                              │  │
│  │ - handleOptOutCommand()                                  │  │
│  │ - getComplianceStatus()                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ lib/migrations/migrate-pricing-to-plans.ts (NEW - Fix #5)│  │
│  │ - One-time data migration script                         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  n8n Workflows (Updated)                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Inbound Message Router                                   │  │
│  │ - Receives WhatsApp message                              │  │
│  │ - Detects purchase intent (AI)                           │  │
│  │ - Calls /api/gym/[slug]/payment-link                     │  │
│  │ - Validates with validateWhatsAppMessage()               │  │
│  │ - Sends link via WhatsApp                                │  │
│  │ - Increments daily count                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Opt-Out Handler                                          │  │
│  │ - Receives STOP/UNSUBSCRIBE command                      │  │
│  │ - Calls handleOptOutCommand()                            │  │
│  │ - Sends confirmation message                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Existing workflows (leads, members, transactions, etc.)  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  External Services                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Razorpay API                                             │  │
│  │ - Create payment links (called from /api/payment-link)   │  │
│  │ - Webhooks for payment status                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ AiSensy (WhatsApp)                                       │  │
│  │ - Send WhatsApp messages                                 │  │
│  │ - Receive inbound messages                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Claude API                                               │  │
│  │ - AI intent detection (Phase 2: with caching)            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Supabase (PostgreSQL)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Core Tables (Existing)                                   │  │
│  │ - gyms                                                   │  │
│  │ - gym_settings                                           │  │
│  │ - members                                                │  │
│  │ - leads                                                  │  │
│  │ - transactions                                           │  │
│  │ - attendance_logs                                        │  │
│  │ - campaigns                                              │  │
│  │ - notifications_queue                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ NEW Tables (Phase 1 - Fix #5)                            │  │
│  │ - plans (replaces pricing_json)                          │  │
│  │ - discounts (coupon management)                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ NEW Tables (Phase 1 - Fix #3)                            │  │
│  │ - whatsapp_opt_outs (compliance)                         │  │
│  │ - whatsapp_daily_counts (rate limiting)                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ NEW Tables (Phase 1 - Fix #10)                           │  │
│  │ - payment_link_audit (audit trail)                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ RLS Policies (Multi-tenancy)                             │  │
│  │ - All tables isolated by gym_id                          │  │
│  │ - Owners can only see their gym's data                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Payment Link Generation

```
Member sends WhatsApp message
         ↓
n8n receives webhook
         ↓
AI detects purchase intent
         ↓
n8n calls /api/gym/[slug]/payment-link
         ↓
API validates:
  ✓ Plan exists in plans table
  ✓ Plan is active
  ✓ Coupon (if provided) exists in discounts table
  ✓ Coupon not expired
  ✓ Coupon usage limit not reached
  ✓ User is gym owner
         ↓
API calculates final amount:
  - Base price from plans table
  - Minus discount percentage (if coupon applied)
         ↓
API calls Razorpay API
         ↓
Razorpay returns payment link
         ↓
API logs to payment_link_audit table
         ↓
API increments discount usage (if applied)
         ↓
API returns short_url to n8n
         ↓
n8n validates WhatsApp message:
  ✓ Recipient not in whatsapp_opt_outs
  ✓ Daily count < 50
         ↓
n8n sends WhatsApp message with link
         ↓
n8n increments whatsapp_daily_counts
         ↓
Member clicks link → Razorpay payment → webhook → transaction logged
```

---

## Data Flow: WhatsApp Compliance

```
Inbound WhatsApp Message
         ↓
n8n receives webhook
         ↓
Check if message is STOP/UNSUBSCRIBE
         ↓
YES: Call handleOptOutCommand()
  ↓
  - Add phone to whatsapp_opt_outs
  - Send confirmation message
  ↓
  Future messages to this number are blocked
         ↓
NO: Continue with normal processing
  ↓
  Before sending any message:
    - Call validateWhatsAppMessage()
    - Check whatsapp_opt_outs (opted out?)
    - Check whatsapp_daily_counts (limit reached?)
  ↓
  If valid:
    - Send message
    - Increment whatsapp_daily_counts
  ↓
  If invalid:
    - Skip message
    - Log reason
```

---

## Database Schema Relationships

```
gyms (1)
  ├─→ (many) plans
  │   └─→ (many) members (via plan_id)
  │   └─→ (many) payment_link_audit
  │
  ├─→ (many) discounts
  │   └─→ (many) payment_link_audit (via discount_code)
  │
  ├─→ (many) whatsapp_opt_outs
  │
  ├─→ (many) whatsapp_daily_counts
  │
  ├─→ (many) members
  │   ├─→ (1) plans (via plan_id)
  │   └─→ (many) payment_link_audit
  │
  └─→ (many) gym_settings
      └─→ pricing_json (DEPRECATED - use plans table)

members (1)
  ├─→ (1) plans (via plan_id)
  └─→ (many) payment_link_audit

plans (1)
  ├─→ (many) members
  └─→ (many) payment_link_audit

discounts (1)
  └─→ (many) payment_link_audit

payment_link_audit (many)
  ├─→ (1) gym
  ├─→ (1) member (nullable)
  ├─→ (1) plan (nullable)
  └─→ (1) discount (via discount_code)

whatsapp_opt_outs (many)
  └─→ (1) gym

whatsapp_daily_counts (many)
  └─→ (1) gym
```

---

## Security & Multi-Tenancy

### RLS Policies
All new tables have RLS policies that ensure:
- Owners can only see their gym's data
- Service role can access all data (for n8n)
- No cross-gym data leakage

### API Authentication
- `/api/gym/[slug]/payment-link` requires authenticated user
- User must be gym owner
- Razorpay credentials never exposed

### Audit Trail
- All payment links logged to `payment_link_audit`
- Tracks who created the link (AI or human)
- Tracks discount applied
- Tracks Razorpay link ID

---

## Performance Optimizations

### Indexes
```sql
CREATE INDEX idx_plans_gym_id ON plans(gym_id);
CREATE INDEX idx_discounts_gym_id ON discounts(gym_id);
CREATE INDEX idx_whatsapp_opt_outs_gym_id ON whatsapp_opt_outs(gym_id);
CREATE INDEX idx_whatsapp_daily_counts_gym_id_date ON whatsapp_daily_counts(gym_id, date);
CREATE INDEX idx_payment_link_audit_gym_id ON payment_link_audit(gym_id);
CREATE INDEX idx_members_plan_id ON members(plan_id);
```

### Query Optimization
- Unique constraints on (gym_id, code) for discounts
- Unique constraints on (gym_id, phone_number) for opt-outs
- Unique constraints on (gym_id, date) for daily counts
- Prevents duplicate entries and enables efficient lookups

---

## Scaling Considerations

### Current Capacity (Phase 1)
- ✅ Handles 100+ gyms
- ✅ Handles 300k messages/month
- ✅ Handles 1000+ members per gym
- ✅ Single n8n instance (Phase 2: queue mode)

### Phase 2 Improvements
- Redis queue for n8n scaling
- Intent classifier to reduce Claude calls
- Response cache for common queries
- Horizontal scaling to 5+ n8n workers

### Phase 3 Improvements
- Sharding by gym_id (if needed)
- Read replicas for analytics
- Caching layer (Redis)
- CDN for static assets

---

## Monitoring & Observability

### Key Metrics
- Payment link generation success rate
- Average payment link generation time
- WhatsApp message send success rate
- Daily message count per gym
- Opt-out rate
- Coupon usage rate
- Razorpay API error rate

### Alerts
- Payment link API errors (500s)
- Razorpay API failures
- Daily message count approaching limit (>40/50)
- Unusual opt-out patterns
- Coupon usage anomalies

### Dashboards
- Payment link audit trail
- WhatsApp compliance status
- Coupon performance
- Revenue tracking

---

## Backward Compatibility

### Deprecated (But Still Functional)
- `members.plan_type` (use `plan_id` instead)
- `gym_settings.pricing_json` (use `plans` table instead)

### Migration Path
1. New gyms use `plans` table directly
2. Existing gyms migrated via `migrate-pricing-to-plans.ts`
3. Old columns remain for backward compatibility
4. Can be removed in Phase 3 (after 6 months)

---

## Next Steps (Phase 2)

### AI Cost Optimization
- Intent classifier (simple queries don't hit Claude)
- Response cache table (batch timings, pricing)
- Tiered models (GPT-4-mini for simple queries)

### n8n Queue Scaling
- Redis instance on Railway
- n8n queue mode (main + workers)
- Per-gym concurrency limits
- Horizontal scaling to 5+ workers

### Offline Reception
- PWA with Service Worker
- IndexedDB for offline storage
- Sync queue on reconnection
- Works on cheap Android tablet

---

## Questions?

See `PHASE1_FIXES.md` for detailed implementation guide.
