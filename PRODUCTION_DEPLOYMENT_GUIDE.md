# GymOS Production Deployment Guide

**Complete deployment checklist for all 3 phases**

---

## Pre-Deployment: Infrastructure Setup

### 1. Supabase Project
```bash
# Create new Supabase project
# Enable extensions: uuid-ossp, pgsodium (vault)
# Note down: Project URL, anon key, service role key
```

### 2. Domain & SSL
```bash
# Point gymos.in to your server
# Ensure SSL certificate is valid
# Test: curl -I https://gymos.in
```

### 3. Environment Variables
Create `.env.production`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Phase 1 - Core
TEST_GYM_ID=00000000-0000-0000-0000-000000000000

# Phase 3 - Secrets & Security
INTERNAL_API_SECRET=your-super-secret-32-char-key-here
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SUPER_ADMIN_ALERT_WEBHOOK=https://hooks.slack.com/your-webhook

# Phase 3 - Billing (GymOS Razorpay Account)
RAZORPAY_GYMOS_KEY_ID=rzp_live_your_gymos_key
RAZORPAY_GYMOS_KEY_SECRET=your_gymos_secret
RAZORPAY_WEBHOOK_SECRET=webhook_secret_from_razorpay

# Client-side
NEXT_PUBLIC_RZP_PLAN_STARTER=plan_GymOS_Starter_2999
NEXT_PUBLIC_RZP_PLAN_GROWTH=plan_GymOS_Growth_5999
NEXT_PUBLIC_RZP_PLAN_SCALE=plan_GymOS_Scale_9999
NEXT_PUBLIC_INTERNAL_SECRET=same-as-INTERNAL_API_SECRET
```

---

## Step 1: Database Setup

### Run All Migrations
```bash
# In Supabase SQL Editor, run in order:
# 1. supabase/migrations/001_core_schema.sql
# 2. supabase/migrations/002_rls_policies.sql  
# 3. supabase/migrations/003_plans_and_discounts.sql
# 4. supabase/migrations/004_phase2_ai_cache_and_queues.sql
# 5. supabase/migrations/005_vault_secrets.sql
# 6. supabase/migrations/006_observability.sql
```

### Verify Extensions
```sql
-- Check vault is enabled
SELECT * FROM pg_extension WHERE extname = 'vault';

-- Test vault functions
SELECT vault.create_secret('test-value', 'test-secret');
```

### Seed Data (Optional)
```bash
# Run supabase/seed.sql for demo data
```

---

## Step 2: Application Deployment

### Build & Deploy
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Deploy to your hosting platform
# (Vercel, Railway, DigitalOcean, etc.)
```

### Verify Deployment
```bash
# Test core endpoints
curl https://gymos.in/api/health
curl -H "x-internal-secret: your-secret" https://gymos.in/api/admin/health

# Test authentication
curl https://gymos.in/login
```

---

## Step 3: Razorpay Configuration

### Create Subscription Plans
In Razorpay Dashboard → Subscriptions → Plans:

1. **Starter Plan**
   - Plan ID: `plan_GymOS_Starter_2999`
   - Amount: ₹2,999 (299900 paise)
   - Interval: 1 month

2. **Growth Plan**  
   - Plan ID: `plan_GymOS_Growth_5999`
   - Amount: ₹5,999 (599900 paise)
   - Interval: 1 month

3. **Scale Plan**
   - Plan ID: `plan_GymOS_Scale_9999` 
   - Amount: ₹9,999 (999900 paise)
   - Interval: 1 month

### Configure Webhook
In Razorpay Dashboard → Webhooks:
- **URL:** `https://gymos.in/api/billing/webhook`
- **Secret:** Your `RAZORPAY_WEBHOOK_SECRET` value
- **Events:** `subscription.charged`, `subscription.failed`, `subscription.cancelled`

### Test Billing
```bash
# Create test subscription
curl -X POST https://gymos.in/api/billing/create-subscription \
  -H "Content-Type: application/json" \
  -d '{"gym_id":"test-gym-id","plan_item_id":"plan_GymOS_Starter_2999"}'
```

---

## Step 4: n8n Setup

### Install n8n with Queue Mode
```yaml
# docker-compose.yml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    
  n8n-main:
    image: n8nio/n8n:latest
    environment:
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      - QUEUE_BULL_PREFIX=gymos_prod
      - QUEUE_HEALTH_CHECK_ACTIVE=true
      - NEXT_PUBLIC_APP_URL=https://gymos.in
      - SUPABASE_SERVICE_ROLE_KEY=your-service-key
      - INTERNAL_API_SECRET=your-internal-secret
    depends_on:
      - redis
      
  n8n-worker:
    image: n8nio/n8n:latest
    command: worker
    environment:
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      - QUEUE_BULL_PREFIX=gymos_prod
      - QUEUE_HEALTH_CHECK_ACTIVE=true
    depends_on:
      - redis
    deploy:
      replicas: 2
```

### Import Workflows
1. **WhatsApp Message Processing** (with validation-first order)
2. **Payment Link Generation** (using vault secrets)
3. **Lead Follow-up Automation**
4. **Renewal Reminders**

### Test n8n Integration
```bash
# Send test webhook to n8n
curl -X POST https://your-n8n.com/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"gym_id":"test","phone":"+919900000100","message":"I want to join"}'
```

---

## Step 5: Monitoring Setup

### Sentry (Optional)
1. Create Sentry project
2. Add DSN to environment variables
3. Verify error reporting works

### Health Dashboard Access
```bash
# Super-admin health check
curl -H "x-internal-secret: your-secret" \
  https://gymos.in/api/admin/health
```

### Set Up Alerts
Configure Slack/WhatsApp webhook for:
- Dead letter queue alerts
- Payment failures
- System errors

---

## Step 6: Production Testing

### End-to-End Flow Test
1. **Registration:** Create new gym account
2. **Settings:** Configure Razorpay keys (vault encryption)
3. **Members:** Add test members
4. **WhatsApp:** Send message, verify validation order
5. **Payment:** Generate payment link, complete transaction
6. **Billing:** Subscribe to plan, verify webhook processing
7. **Offline:** Test reception PWA sync
8. **Health:** Check admin dashboard metrics

### Load Testing
```bash
# Test concurrent WhatsApp messages
for i in {1..50}; do
  curl -X POST https://gymos.in/api/gym/test-gym/validate-whatsapp \
    -H "Content-Type: application/json" \
    -d "{\"phone_number\":\"+9199000001$i\"}" &
done
```

### Security Audit
- [ ] Secrets never appear in logs
- [ ] RLS policies prevent cross-gym access  
- [ ] Internal API requires secret header
- [ ] Webhook signatures verified
- [ ] Rate limiting active

---

## Step 7: Go Live

### DNS & SSL
```bash
# Final DNS switch
# Verify SSL certificate
# Test from multiple locations
```

### Monitoring
- [ ] Sentry receiving errors
- [ ] Health dashboard accessible
- [ ] Slack alerts working
- [ ] n8n workers healthy

### Documentation
- [ ] Share admin credentials securely
- [ ] Document emergency procedures
- [ ] Create runbook for common issues

---

## Post-Launch Monitoring

### Daily Checks
- Health dashboard metrics
- Dead letter queue depth
- Subscription payment failures
- Error rates in Sentry

### Weekly Reviews
- MRR growth from billing dashboard
- AI cache hit rates
- WhatsApp compliance status
- n8n workflow performance

### Monthly Tasks
- Review and archive old error logs
- Update Razorpay webhook signatures
- Audit vault secret access
- Performance optimization

---

## Emergency Procedures

### System Down
1. Check health dashboard
2. Review recent error logs
3. Verify n8n worker status
4. Check Supabase status page

### Payment Issues
1. Check Razorpay webhook logs
2. Verify webhook signature
3. Review failed subscriptions
4. Contact affected gym owners

### Security Incident
1. Rotate INTERNAL_API_SECRET
2. Check vault access logs
3. Review RLS policy violations
4. Update n8n credentials

---

## Success Metrics

After deployment, you should see:

- **Security:** 0 plain-text secrets in database
- **Reliability:** <1% message failure rate
- **Performance:** >80% AI cache hit rate
- **Revenue:** Automated billing with 0 manual intervention
- **Scalability:** System handles 100+ concurrent gyms

**GymOS is now production-ready and can scale to thousands of gyms across India.**