# Pilot Gym Launch Checklist

**Final validation before going live with your first paying gym**

---

## Pre-Launch: System Validation

### Database Health Check
```sql
-- Verify all migrations applied
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;

-- Test vault functions
SELECT vault.create_secret('test-value', 'pilot-test');
SELECT vault_get_gym_secret('00000000-0000-0000-0000-000000000000', 'razorpay_key_id');

-- Verify RLS policies
SET ROLE authenticated;
SELECT * FROM gyms; -- Should return empty or only user's gym
```

### API Endpoints Test
```bash
# Health check
curl https://gymos.in/api/admin/health \
  -H "x-internal-secret: $INTERNAL_API_SECRET"

# Vault secret (should return 404 for non-existent)
curl -X POST https://gymos.in/api/internal/gym-secret \
  -H "x-internal-secret: $INTERNAL_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"gym_id":"test","secret_name":"razorpay_key_id"}'

# WhatsApp validation
curl -X POST https://gymos.in/api/gym/pilot-gym/validate-whatsapp \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"+919900000100"}'
```

---

## Pilot Gym Setup

### 1. Create Pilot Gym Account
- [ ] Register at `/register` with real email
- [ ] Verify email confirmation works
- [ ] Login and access dashboard

### 2. Configure Gym Settings
- [ ] **Basic Info:** Name, city, phone, batch timings
- [ ] **Pricing:** Set realistic plan prices in JSON
- [ ] **AI Instructions:** Customize personality for the gym
- [ ] **Razorpay Keys:** Enter live keys (will be vaulted)
- [ ] **WhatsApp Token:** Enter AiSensy/provider token
- [ ] Save and verify no plain-text secrets in database

### 3. Add Sample Data
- [ ] **Members:** Add 5-10 real members with valid phones
- [ ] **Plans:** Create 2-3 membership plans with discounts
- [ ] **Staff:** Add reception staff if applicable

---

## Razorpay Integration Test

### Test Payment Link Generation
```bash
# Should return valid Razorpay link
curl -X POST https://gymos.in/api/gym/pilot-gym-slug/payment-link \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "plan_id": "plan-uuid-from-db",
    "member_id": "member-uuid-from-db"
  }'
```

### Verify Webhook Processing
1. **Create test subscription** via billing page
2. **Complete payment** with test card: `4111 1111 1111 1111`
3. **Check webhook logs** in Razorpay dashboard
4. **Verify invoice created** in GymOS billing page
5. **Confirm gym activated** (`is_active = true`)

---

## WhatsApp Flow Validation

### n8n Workflow Test
```json
{
  "test_message": {
    "gym_id": "pilot-gym-uuid",
    "phone": "+919900000100", 
    "message": "I want to join your gym, what are the plans?"
  }
}
```

**Expected Flow:**
1. ✅ Message queued in `inbound_message_queue`
2. ✅ WhatsApp validation passes (not opted out, under daily limit)
3. ✅ AI processes intent → detects membership inquiry
4. ✅ Payment link generated using vaulted Razorpay keys
5. ✅ WhatsApp message sent with link
6. ✅ Daily count incremented
7. ✅ Audit trail in `payment_link_audit`

### Compliance Test
```bash
# Test opt-out flow
curl -X POST https://gymos.in/api/gym/pilot-gym/handle-whatsapp-optout \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"+919900000100"}'

# Verify subsequent messages blocked
curl -X POST https://gymos.in/api/gym/pilot-gym/validate-whatsapp \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"+919900000100"}'
# Should return: {"valid": false, "reason": "Recipient has opted out"}
```

---

## Reception PWA Test

### Offline Functionality
1. **Disconnect internet** on reception tablet
2. **Log attendance** for 3-5 members
3. **Record cash payments** 
4. **Reconnect internet**
5. **Verify sync** — all records appear in dashboard
6. **Check idempotency** — no duplicates if sync runs twice

### Sync Status
```bash
# Check pending sync items
curl https://gymos.in/api/gym/pilot-gym/sync-status \
  -H "Authorization: Bearer $RECEPTION_JWT"
```

---

## Billing Subscription Test

### End-to-End Subscription Flow
1. **Owner visits** `/billing` page
2. **Selects Growth plan** (₹5,999/mo)
3. **Redirected to Razorpay** hosted checkout
4. **Completes payment** with live card
5. **Webhook processes** `subscription.charged` event
6. **Invoice generated** with GST (18%)
7. **Gym activated** and plan visible in dashboard

### Payment Failure Test
1. **Use card** with insufficient funds
2. **Webhook receives** `subscription.failed` event  
3. **Super-admin alert** sent to Slack/WhatsApp
4. **Gym status** remains active (grace period)
5. **Owner sees** payment failure notice

---

## Monitoring & Alerts

### Health Dashboard Validation
Visit `/admin/health` and verify:
- [ ] **Queue Pending:** 0 (all messages processed)
- [ ] **Dead Letters:** 0 (no failed messages)
- [ ] **Cache Hit Rate:** >70% (AI responses cached)
- [ ] **AI Calls/Hour:** Reasonable volume
- [ ] **Errors/Hour:** 0 or minimal
- [ ] **MRR:** Shows pilot gym subscription amount

### Error Handling Test
1. **Trigger intentional error** (invalid Razorpay key)
2. **Check Sentry** receives error report
3. **Verify error logged** in `error_log` table
4. **Confirm alert sent** to super-admin webhook

---

## Performance Validation

### Load Test (Light)
```bash
# Simulate 20 concurrent WhatsApp validations
for i in {1..20}; do
  curl -X POST https://gymos.in/api/gym/pilot-gym/validate-whatsapp \
    -H "Content-Type: application/json" \
    -d "{\"phone_number\":\"+9199000001$i\"}" &
done
wait

# Check response times < 500ms
# Verify no errors in health dashboard
```

### AI Cache Efficiency
```bash
# Send same query twice
curl -X POST https://n8n.gymos.in/webhook/whatsapp \
  -d '{"gym_id":"pilot","phone":"+919900000100","message":"what are your timings?"}'

# Second call should be faster (cache hit)
curl -X POST https://n8n.gymos.in/webhook/whatsapp \
  -d '{"gym_id":"pilot","phone":"+919900000100","message":"what are your timings?"}'
```

---

## Security Audit

### Secrets Verification
```sql
-- Confirm no plain-text secrets in gyms table
SELECT id, name, razorpay_key_id, razorpay_secret, waba_token 
FROM gyms WHERE id = 'pilot-gym-uuid';
-- All secret columns should be NULL

-- Verify vault references exist
SELECT id, name, razorpay_key_id_secret_id, razorpay_secret_secret_id 
FROM gyms WHERE id = 'pilot-gym-uuid';
-- Secret ID columns should have UUIDs
```

### Access Control Test
```bash
# Try to access another gym's data (should fail)
curl https://gymos.in/api/gym/other-gym-slug/payment-link \
  -H "Authorization: Bearer $PILOT_GYM_JWT"
# Should return 403 Forbidden

# Try internal API without secret (should fail)  
curl -X POST https://gymos.in/api/internal/gym-secret \
  -d '{"gym_id":"pilot","secret_name":"razorpay_key_id"}'
# Should return 403 Forbidden
```

---

## Go-Live Checklist

### Final Verification
- [ ] All tests above pass ✅
- [ ] Pilot gym owner trained on dashboard
- [ ] Reception staff trained on PWA
- [ ] WhatsApp number connected to n8n
- [ ] Razorpay webhook receiving events
- [ ] Super-admin alerts configured
- [ ] Backup procedures documented

### Launch Day
- [ ] **Morning:** Final health check
- [ ] **Go-Live:** Switch DNS to production
- [ ] **Monitor:** Watch health dashboard for 2 hours
- [ ] **Test:** Send real WhatsApp message to pilot gym
- [ ] **Verify:** Payment link generation works
- [ ] **Confirm:** Billing subscription active

### Post-Launch (24 hours)
- [ ] **Revenue:** Verify subscription charged correctly
- [ ] **Messages:** Check WhatsApp compliance metrics
- [ ] **Errors:** Review any issues in Sentry/logs
- [ ] **Performance:** Confirm cache hit rates stable
- [ ] **Feedback:** Collect pilot gym owner feedback

---

## Success Criteria

**✅ Ready to scale** when pilot gym shows:
- **0 payment failures** in first billing cycle
- **>90% WhatsApp delivery rate** with no compliance issues  
- **<200ms average response time** for dashboard
- **0 data loss** during offline sync periods
- **Owner satisfaction** with automation and insights

**🚀 Scale to 10 gyms** once pilot runs smoothly for 1 month.

---

## Emergency Contacts

**Technical Issues:**
- Health Dashboard: `/admin/health`
- Error Logs: Sentry dashboard
- Database: Supabase dashboard

**Business Issues:**
- Payment Failures: Razorpay dashboard
- WhatsApp Blocks: Provider support
- Gym Owner Support: Direct contact

**Escalation:**
- System Down: Check all services, contact hosting provider
- Revenue Impact: Immediate Razorpay investigation
- Security Incident: Rotate secrets, audit access logs

---

**GymOS is production-ready. Execute this checklist with your pilot gym, then scale with confidence.**