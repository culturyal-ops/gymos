# Phase 1: Critical Hardening Fixes

This document outlines the three foundational fixes implemented in Phase 1 of the GymOS hardening sprint. These fixes unblock all subsequent phases and address the highest-impact architectural gaps.

---

## Fix #5: Migrate from JSONB Pricing to Proper Plans Table

### Problem
- `gym_settings.pricing_json` is an unstructured JSONB blob with no schema enforcement
- A missing key or typo breaks AI prompts and payment links
- Hard to query, validate, or audit pricing changes
- Makes it impossible to build deterministic payment generation

### Solution
Created a normalized `plans` table with proper schema and referential integrity.

### Files Created/Modified

#### 1. Database Migration
**File:** `supabase/migrations/003_plans_and_discounts.sql`

Creates:
- `plans` table (id, gym_id, name, duration_days, price, is_active)
- `discounts` table (code, percentage, max_uses, expires_at)
- `whatsapp_opt_outs` table (phone_number, opted_out_at)
- `whatsapp_daily_counts` table (gym_id, date, count)
- `payment_link_audit` table (all payment link generations)
- Proper indexes and RLS policies

#### 2. TypeScript Types
**File:** `lib/types.ts`

Added interfaces:
- `Plan` – Represents a membership plan
- `Discount` – Represents a coupon code
- `WhatsAppOptOut` – Represents opted-out phone numbers
- `PaymentLinkAudit` – Audit trail for payment links

#### 3. Data Migration Utility
**File:** `lib/migrations/migrate-pricing-to-plans.ts`

Utility script to:
- Read all gyms' `pricing_json` from `gym_settings`
- Parse plan names to extract duration (e.g., "gold_6m" → 180 days)
- Insert corresponding rows into `plans` table
- Map existing `members.plan_type` to new `plan_id`

**Usage:**
```bash
# Run as a one-time migration
npx ts-node lib/migrations/migrate-pricing-to-plans.ts
```

### How to Test
1. Apply migration: `supabase migration up`
2. Run data migration script
3. Verify `plans` table is populated:
   ```sql
   SELECT * FROM plans WHERE gym_id = 'your-gym-id';
   ```
4. Verify members are mapped:
   ```sql
   SELECT id, plan_type, plan_id FROM members WHERE gym_id = 'your-gym-id' LIMIT 5;
   ```

### Backward Compatibility
- `members.plan_type` remains for backward compatibility (deprecated)
- New code should use `members.plan_id` → `plans` table
- `gym_settings.pricing_json` remains but is no longer used

---

## Fix #10: Deterministic Payment & Discount API

### Problem
- AI agent constructs payment links and prices directly
- If AI hallucinates a price or non-existent plan, you've charged money for something that doesn't exist
- No validation layer between AI and Razorpay
- No audit trail of who generated which payment links

### Solution
Built a secure API route that validates all inputs against the database before creating payment links.

### Files Created/Modified

#### 1. Payment Link API Route
**File:** `app/api/gym/[slug]/payment-link/route.ts`

Endpoint: `POST /api/gym/[slug]/payment-link`

**Request Body:**
```json
{
  "plan_id": "uuid",           // Required: UUID of plan from plans table
  "coupon_code": "SUMMER20",   // Optional: Coupon code from discounts table
  "member_id": "uuid",         // Optional: Member receiving the link
  "amount": 5000               // NOT ALLOWED (prevents AI hallucination)
}
```

**Response:**
```json
{
  "short_url": "https://rzp.io/...",
  "razorpay_link_id": "plink_...",
  "amount": 4000,
  "discount_applied": 1000
}
```

**Validation:**
- ✅ Verifies plan exists and is active
- ✅ Validates coupon code (if provided)
- ✅ Checks coupon expiry and usage limits
- ✅ Rejects custom amounts (prevents AI hallucination)
- ✅ Verifies user is gym owner
- ✅ Validates Razorpay credentials

**Audit Trail:**
Every payment link generation is logged to `payment_link_audit` table with:
- gym_id, member_id, plan_id
- Original amount, discount applied, discount code
- created_by_ai flag (for tracking AI-generated links)
- Razorpay link ID

### How to Use from n8n

In your n8n workflow, instead of:
```javascript
// ❌ WRONG: AI constructs the link
const link = `https://rzp.io/l/${plan.id}?amount=${price}`;
```

Do this:
```javascript
// ✅ CORRECT: API validates and creates the link
const response = await fetch(
  `https://gymos.in/api/gym/${gymSlug}/payment-link`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      plan_id: planId,
      coupon_code: couponCode,
      member_id: memberId
    })
  }
);
const { short_url } = await response.json();
```

### How to Test
1. Create a test plan:
   ```sql
   INSERT INTO plans (gym_id, name, duration_days, price, is_active)
   VALUES ('gym-id', 'test_plan', 30, 5000, true);
   ```

2. Call the API:
   ```bash
   curl -X POST https://localhost:3000/api/gym/my-gym/payment-link \
     -H "Content-Type: application/json" \
     -d '{"plan_id": "plan-uuid"}'
   ```

3. Verify audit log:
   ```sql
   SELECT * FROM payment_link_audit WHERE gym_id = 'gym-id' ORDER BY created_at DESC;
   ```

---

## Fix #3: WhatsApp Compliance & Rate Limiting

### Problem
- Meta aggressively bans numbers that send unsolicited messages
- No opt-out management (STOP/UNSUBSCRIBE)
- No rate limiting (can spam 1000 messages/day and get banned)
- No quality rating monitoring
- Losing a WABA number = losing the entire gym's communication channel

### Solution
Implemented opt-out tracking, per-gym rate limiting (max 50 messages/day), and compliance utilities.

### Files Created/Modified

#### 1. Compliance Utilities
**File:** `lib/whatsapp-compliance.ts`

Provides functions:

**Check Opt-Out Status:**
```typescript
const optedOut = await isPhoneOptedOut(supabase, gymId, phoneNumber);
```

**Add to Opt-Out List:**
```typescript
await addPhoneOptOut(supabase, gymId, phoneNumber, "User sent STOP");
```

**Check Daily Limit:**
```typescript
const limitReached = await hasReachedDailyLimit(supabase, gymId);
```

**Get Daily Count:**
```typescript
const count = await getDailyMessageCount(supabase, gymId);
```

**Increment Daily Count:**
```typescript
await incrementDailyCount(supabase, gymId);
```

**Validate Before Sending:**
```typescript
const { valid, reason } = await validateWhatsAppMessage(
  supabase,
  gymId,
  phoneNumber
);
if (!valid) {
  console.log(`Cannot send: ${reason}`);
}
```

**Handle STOP Command:**
```typescript
const { success, message } = await handleOptOutCommand(
  supabase,
  gymId,
  phoneNumber
);
// message: "You have been unsubscribed from WhatsApp messages..."
```

**Get Compliance Status:**
```typescript
const status = await getComplianceStatus(supabase, gymId);
// {
//   dailyCount: 35,
//   dailyLimit: 50,
//   percentageUsed: 70,
//   isNearLimit: true,
//   canSendMessages: true
// }
```

### Database Tables

**whatsapp_opt_outs:**
```sql
CREATE TABLE whatsapp_opt_outs (
  id UUID PRIMARY KEY,
  gym_id UUID NOT NULL,
  phone_number TEXT NOT NULL,
  opted_out_at TIMESTAMP,
  reason TEXT,
  UNIQUE(gym_id, phone_number)
);
```

**whatsapp_daily_counts:**
```sql
CREATE TABLE whatsapp_daily_counts (
  id UUID PRIMARY KEY,
  gym_id UUID NOT NULL,
  date DATE NOT NULL,
  count INTEGER DEFAULT 0,
  UNIQUE(gym_id, date)
);
```

### How to Integrate with n8n

In your "Send WhatsApp Message" workflow:

```javascript
// Before sending, validate
const { valid, reason } = await validateWhatsAppMessage(
  supabase,
  gymId,
  recipientPhone
);

if (!valid) {
  console.log(`Skipping: ${reason}`);
  return;
}

// Send the message
await sendWhatsAppMessage(recipientPhone, messageText);

// Increment counter
await incrementDailyCount(supabase, gymId);
```

### How to Test
1. Add a phone to opt-out list:
   ```sql
   INSERT INTO whatsapp_opt_outs (gym_id, phone_number, reason)
   VALUES ('gym-id', '+919876543210', 'Test');
   ```

2. Verify it's blocked:
   ```typescript
   const optedOut = await isPhoneOptedOut(supabase, 'gym-id', '+919876543210');
   expect(optedOut).toBe(true);
   ```

3. Simulate 50 messages:
   ```sql
   INSERT INTO whatsapp_daily_counts (gym_id, date, count)
   VALUES ('gym-id', CURRENT_DATE, 50);
   ```

4. Verify limit is enforced:
   ```typescript
   const limitReached = await hasReachedDailyLimit(supabase, 'gym-id');
   expect(limitReached).toBe(true);
   ```

---

## Integration: How These Fixes Work Together

### Scenario: Member Requests a Payment Link

1. **AI detects purchase intent** (n8n workflow)
2. **AI calls `/api/gym/[slug]/payment-link`** with plan_id
3. **API validates:**
   - Plan exists and is active ✅
   - Coupon (if provided) is valid ✅
   - User is gym owner ✅
4. **API creates Razorpay link** with validated amount
5. **API logs to `payment_link_audit`** (audit trail)
6. **AI sends link via WhatsApp:**
   - Checks `validateWhatsAppMessage()` ✅
   - Verifies recipient not opted out ✅
   - Verifies daily limit not reached ✅
   - Increments `whatsapp_daily_counts` ✅
7. **Member clicks link** → Razorpay payment → webhook → transaction logged

### Scenario: Member Sends "STOP"

1. **n8n receives WhatsApp message** with "STOP"
2. **Calls `handleOptOutCommand()`**
3. **Phone added to `whatsapp_opt_outs`**
4. **AI sends confirmation:** "You have been unsubscribed..."
5. **Future messages to this number are blocked** by `validateWhatsAppMessage()`

---

## Deployment Checklist

- [ ] Apply migration: `supabase migration up`
- [ ] Run data migration: `npx ts-node lib/migrations/migrate-pricing-to-plans.ts`
- [ ] Update n8n workflows to use `/api/gym/[slug]/payment-link`
- [ ] Update n8n workflows to call `validateWhatsAppMessage()` before sending
- [ ] Test payment link generation with test plan
- [ ] Test opt-out functionality
- [ ] Test rate limiting (send 50+ messages, verify 51st is blocked)
- [ ] Monitor `payment_link_audit` table for anomalies
- [ ] Set up alerts if daily message count approaches limit

---

## Next Steps (Phase 2)

Once Phase 1 is merged:
- **AI Cost Optimization:** Intent classifier + response cache
- **n8n Queue Scaling:** Redis + worker mode
- **Offline Reception:** PWA with IndexedDB sync

---

## Questions?

Refer to the inline comments in each file for implementation details.
