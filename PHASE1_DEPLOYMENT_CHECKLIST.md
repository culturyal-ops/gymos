# Phase 1 Deployment Checklist

Use this checklist to ensure all Phase 1 fixes are properly deployed and tested.

---

## Pre-Deployment

- [ ] All code reviewed and approved
- [ ] No merge conflicts
- [ ] TypeScript compiles without errors
- [ ] ESLint passes
- [ ] Environment variables configured

---

## Database Migration

- [ ] Backup production database
- [ ] Apply migration: `supabase migration up`
- [ ] Verify migration applied successfully
- [ ] Check all new tables exist:
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('plans', 'discounts', 'whatsapp_opt_outs', 'whatsapp_daily_counts', 'payment_link_audit');
  ```
- [ ] Verify RLS policies are enabled:
  ```sql
  SELECT tablename FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename IN ('plans', 'discounts', 'whatsapp_opt_outs', 'payment_link_audit');
  ```

---

## Data Migration

- [ ] Run pricing migration script:
  ```bash
  npx ts-node lib/migrations/migrate-pricing-to-plans.ts
  ```
- [ ] Verify plans created for all gyms:
  ```sql
  SELECT gym_id, COUNT(*) as plan_count FROM plans GROUP BY gym_id;
  ```
- [ ] Verify members mapped to plans:
  ```sql
  SELECT COUNT(*) as members_with_plan_id FROM members WHERE plan_id IS NOT NULL;
  ```
- [ ] Spot-check a few gyms:
  ```sql
  SELECT g.name, COUNT(p.id) as plans, COUNT(m.id) as members_mapped
  FROM gyms g
  LEFT JOIN plans p ON g.id = p.gym_id
  LEFT JOIN members m ON g.id = m.gym_id AND m.plan_id IS NOT NULL
  GROUP BY g.id, g.name
  LIMIT 5;
  ```

---

## API Route Testing

### Payment Link API

- [ ] Create test plan:
  ```sql
  INSERT INTO plans (gym_id, name, duration_days, price, is_active)
  VALUES ('test-gym-id', 'test_plan_30d', 30, 5000, true);
  ```

- [ ] Test basic payment link generation:
  ```bash
  curl -X POST http://localhost:3000/api/gym/test-gym-slug/payment-link \
    -H "Content-Type: application/json" \
    -d '{"plan_id": "test-plan-uuid"}'
  ```

- [ ] Verify response includes:
  - [ ] `short_url` (Razorpay link)
  - [ ] `razorpay_link_id`
  - [ ] `amount` (5000)
  - [ ] `discount_applied` (null)

- [ ] Test with coupon:
  ```sql
  INSERT INTO discounts (gym_id, code, percentage, is_active)
  VALUES ('test-gym-id', 'TEST20', 20, true);
  ```
  ```bash
  curl -X POST http://localhost:3000/api/gym/test-gym-slug/payment-link \
    -H "Content-Type: application/json" \
    -d '{"plan_id": "test-plan-uuid", "coupon_code": "TEST20"}'
  ```
  - [ ] Verify `amount` is 4000 (20% discount)
  - [ ] Verify `discount_applied` is 1000

- [ ] Test invalid plan:
  ```bash
  curl -X POST http://localhost:3000/api/gym/test-gym-slug/payment-link \
    -H "Content-Type: application/json" \
    -d '{"plan_id": "invalid-uuid"}'
  ```
  - [ ] Verify returns 404

- [ ] Test expired coupon:
  ```sql
  INSERT INTO discounts (gym_id, code, percentage, is_active, expires_at)
  VALUES ('test-gym-id', 'EXPIRED', 20, true, NOW() - INTERVAL '1 day');
  ```
  ```bash
  curl -X POST http://localhost:3000/api/gym/test-gym-slug/payment-link \
    -H "Content-Type: application/json" \
    -d '{"plan_id": "test-plan-uuid", "coupon_code": "EXPIRED"}'
  ```
  - [ ] Verify returns 400 with "expired" message

- [ ] Test coupon at usage limit:
  ```sql
  UPDATE discounts SET max_uses = 1, current_uses = 1 WHERE code = 'TEST20';
  ```
  ```bash
  curl -X POST http://localhost:3000/api/gym/test-gym-slug/payment-link \
    -H "Content-Type: application/json" \
    -d '{"plan_id": "test-plan-uuid", "coupon_code": "TEST20"}'
  ```
  - [ ] Verify returns 400 with "usage limit" message

- [ ] Verify audit log populated:
  ```sql
  SELECT * FROM payment_link_audit WHERE gym_id = 'test-gym-id' ORDER BY created_at DESC LIMIT 5;
  ```
  - [ ] Verify all link generations are logged
  - [ ] Verify discount_applied is correct

---

## WhatsApp Compliance Testing

### Opt-Out Functionality

- [ ] Add test phone to opt-out list:
  ```sql
  INSERT INTO whatsapp_opt_outs (gym_id, phone_number, reason)
  VALUES ('test-gym-id', '+919876543210', 'Test opt-out');
  ```

- [ ] Test `isPhoneOptedOut()`:
  ```typescript
  const optedOut = await isPhoneOptedOut(supabase, 'test-gym-id', '+919876543210');
  expect(optedOut).toBe(true);
  ```

- [ ] Test `validateWhatsAppMessage()` with opted-out number:
  ```typescript
  const { valid, reason } = await validateWhatsAppMessage(supabase, 'test-gym-id', '+919876543210');
  expect(valid).toBe(false);
  expect(reason).toContain('opted out');
  ```

### Rate Limiting

- [ ] Insert 50 messages for today:
  ```sql
  INSERT INTO whatsapp_daily_counts (gym_id, date, count)
  VALUES ('test-gym-id', CURRENT_DATE, 50);
  ```

- [ ] Test `hasReachedDailyLimit()`:
  ```typescript
  const limitReached = await hasReachedDailyLimit(supabase, 'test-gym-id');
  expect(limitReached).toBe(true);
  ```

- [ ] Test `validateWhatsAppMessage()` with limit reached:
  ```typescript
  const { valid, reason } = await validateWhatsAppMessage(supabase, 'test-gym-id', '+919999999999');
  expect(valid).toBe(false);
  expect(reason).toContain('Daily message limit');
  ```

- [ ] Test `incrementDailyCount()`:
  ```typescript
  await incrementDailyCount(supabase, 'test-gym-id');
  const count = await getDailyMessageCount(supabase, 'test-gym-id');
  expect(count).toBe(51);
  ```

- [ ] Verify daily count resets at midnight:
  ```sql
  -- Check tomorrow's count (should be 0)
  SELECT count FROM whatsapp_daily_counts 
  WHERE gym_id = 'test-gym-id' 
  AND date = CURRENT_DATE + INTERVAL '1 day';
  ```

### Compliance Status

- [ ] Test `getComplianceStatus()`:
  ```typescript
  const status = await getComplianceStatus(supabase, 'test-gym-id');
  expect(status.dailyCount).toBe(50);
  expect(status.dailyLimit).toBe(50);
  expect(status.percentageUsed).toBe(100);
  expect(status.isNearLimit).toBe(true);
  expect(status.canSendMessages).toBe(false);
  ```

### Opt-Out Command Handling

- [ ] Test `handleOptOutCommand()`:
  ```typescript
  const { success, message } = await handleOptOutCommand(supabase, 'test-gym-id', '+919111111111');
  expect(success).toBe(true);
  expect(message).toContain('unsubscribed');
  ```

- [ ] Verify phone added to opt-outs:
  ```sql
  SELECT * FROM whatsapp_opt_outs WHERE phone_number = '+919111111111';
  ```

---

## n8n Workflow Updates

- [ ] Update "Generate Payment Link" workflow to call `/api/gym/[slug]/payment-link`
- [ ] Update "Send WhatsApp Message" workflow to call `validateWhatsAppMessage()`
- [ ] Update "Send WhatsApp Message" workflow to call `incrementDailyCount()` after send
- [ ] Add "Handle STOP Command" workflow
- [ ] Test payment link generation in n8n
- [ ] Test WhatsApp validation in n8n
- [ ] Test opt-out command handling in n8n

---

## Monitoring & Observability

- [ ] Set up alerts for:
  - [ ] Payment link API errors (500s)
  - [ ] Razorpay API failures
  - [ ] Daily message count approaching limit (>40/50)
  - [ ] Unusual opt-out patterns

- [ ] Create dashboard queries:
  ```sql
  -- Payment links generated today
  SELECT COUNT(*) FROM payment_link_audit 
  WHERE gym_id = 'gym-id' 
  AND DATE(created_at) = CURRENT_DATE;

  -- Discounts applied today
  SELECT SUM(discount_applied) FROM payment_link_audit 
  WHERE gym_id = 'gym-id' 
  AND DATE(created_at) = CURRENT_DATE 
  AND discount_applied > 0;

  -- WhatsApp messages sent today
  SELECT COUNT(*) FROM whatsapp_daily_counts 
  WHERE gym_id = 'gym-id' 
  AND date = CURRENT_DATE;

  -- Opt-outs this month
  SELECT COUNT(*) FROM whatsapp_opt_outs 
  WHERE gym_id = 'gym-id' 
  AND DATE(opted_out_at) >= DATE_TRUNC('month', CURRENT_DATE);
  ```

---

## Documentation

- [ ] Update API documentation with new endpoints
- [ ] Update n8n workflow documentation
- [ ] Add troubleshooting guide
- [ ] Add FAQ for gym owners
- [ ] Update deployment runbook

---

## Rollback Plan

If issues arise:

1. [ ] Identify the issue
2. [ ] Check logs in Sentry/console
3. [ ] Rollback code to previous version
4. [ ] Keep database migration (it's backward compatible)
5. [ ] Notify affected gyms
6. [ ] Post-mortem and fix

---

## Post-Deployment

- [ ] Monitor error rates for 24 hours
- [ ] Check payment link generation success rate
- [ ] Verify WhatsApp messages are being sent
- [ ] Confirm opt-out functionality works
- [ ] Check daily message counts are accurate
- [ ] Review audit logs for anomalies
- [ ] Get feedback from gym owners
- [ ] Document any issues found

---

## Sign-Off

- [ ] QA: All tests passed
- [ ] DevOps: Deployment successful
- [ ] Product: Feature working as expected
- [ ] Security: No vulnerabilities introduced

---

## Next Steps

Once Phase 1 is fully deployed and stable:

1. **Phase 2: AI Cost Optimization**
   - Intent classifier
   - Response cache
   - Tiered models

2. **Phase 2: n8n Queue Scaling**
   - Redis setup
   - Queue mode configuration
   - Worker scaling

3. **Phase 2: Offline Reception**
   - PWA setup
   - IndexedDB sync
   - Tablet testing

---

## Questions?

See `PHASE1_FIXES.md` for detailed implementation guide.
