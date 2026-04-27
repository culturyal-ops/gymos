# n8n Integration Guide for Phase 1 Fixes

This guide shows how to update your n8n workflows to use the new Phase 1 APIs and utilities.

---

## 1. Payment Link Generation (Fix #10)

### Before (❌ WRONG - AI Constructs Link)
```json
{
  "nodes": [
    {
      "name": "Generate Payment Link",
      "type": "code",
      "typeVersion": 1,
      "position": [500, 300],
      "parameters": {
        "jsCode": "// ❌ DANGEROUS: AI constructs the link\nconst plan = $input.all()[0].body.plan;\nconst price = $input.all()[0].body.price;\nconst link = `https://rzp.io/l/${plan}?amount=${price}`;\nreturn { link };"
      }
    }
  ]
}
```

**Problems:**
- AI can hallucinate prices
- No validation against database
- No audit trail
- Razorpay credentials exposed in workflow

### After (✅ CORRECT - API Validates)
```json
{
  "nodes": [
    {
      "name": "Call Payment Link API",
      "type": "httpRequest",
      "typeVersion": 4,
      "position": [500, 300],
      "parameters": {
        "url": "{{ $env.NEXT_PUBLIC_APP_URL }}/api/gym/{{ $json.gym_slug }}/payment-link",
        "method": "POST",
        "headers": {
          "Content-Type": "application/json"
        },
        "body": {
          "plan_id": "{{ $json.plan_id }}",
          "coupon_code": "{{ $json.coupon_code }}",
          "member_id": "{{ $json.member_id }}"
        }
      }
    },
    {
      "name": "Extract Short URL",
      "type": "code",
      "typeVersion": 1,
      "position": [700, 300],
      "parameters": {
        "jsCode": "// ✅ SAFE: API validated everything\nconst response = $input.all()[0].json;\nreturn {\n  short_url: response.short_url,\n  amount: response.amount,\n  discount_applied: response.discount_applied\n};"
      }
    }
  ]
}
```

**Benefits:**
- ✅ All amounts validated server-side
- ✅ Coupons verified before applying
- ✅ Complete audit trail
- ✅ Razorpay credentials never exposed

---

## 2. WhatsApp Message Validation (Fix #3)

### Before (❌ WRONG - No Validation)
```json
{
  "nodes": [
    {
      "name": "Send WhatsApp Message",
      "type": "aisensy",
      "typeVersion": 1,
      "parameters": {
        "phone": "{{ $json.recipient_phone }}",
        "message": "{{ $json.message_text }}"
      }
    }
  ]
}
```

**Problems:**
- Sends to opted-out numbers
- No rate limiting
- Can trigger Meta bans
- No compliance tracking

### After (✅ CORRECT - Validate Before Sending)
```json
{
  "nodes": [
    {
      "name": "Validate WhatsApp Message",
      "type": "httpRequest",
      "typeVersion": 4,
      "position": [300, 300],
      "parameters": {
        "url": "{{ $env.NEXT_PUBLIC_APP_URL }}/api/gym/{{ $json.gym_slug }}/validate-whatsapp",
        "method": "POST",
        "body": {
          "phone_number": "{{ $json.recipient_phone }}"
        }
      }
    },
    {
      "name": "Check Validation Result",
      "type": "if",
      "typeVersion": 1,
      "position": [500, 300],
      "parameters": {
        "conditions": {
          "if": [
            {
              "value1": "{{ $node['Validate WhatsApp Message'].json.valid }}",
              "operation": "equals",
              "value2": true
            }
          ]
        }
      }
    },
    {
      "name": "Send WhatsApp Message",
      "type": "aisensy",
      "typeVersion": 1,
      "position": [700, 200],
      "parameters": {
        "phone": "{{ $json.recipient_phone }}",
        "message": "{{ $json.message_text }}"
      }
    },
    {
      "name": "Increment Daily Count",
      "type": "httpRequest",
      "typeVersion": 4,
      "position": [900, 200],
      "parameters": {
        "url": "{{ $env.NEXT_PUBLIC_APP_URL }}/api/gym/{{ $json.gym_slug }}/increment-whatsapp-count",
        "method": "POST"
      }
    },
    {
      "name": "Skip - Validation Failed",
      "type": "code",
      "typeVersion": 1,
      "position": [700, 400],
      "parameters": {
        "jsCode": "return {\n  skipped: true,\n  reason: $node['Validate WhatsApp Message'].json.reason\n};"
      }
    }
  ]
}
```

**Benefits:**
- ✅ Checks opt-out status before sending
- ✅ Enforces daily rate limit
- ✅ Increments counter after send
- ✅ Prevents Meta bans

---

## 3. Handle STOP/UNSUBSCRIBE Command (Fix #3)

### Workflow: Process Inbound WhatsApp Message
```json
{
  "nodes": [
    {
      "name": "Receive WhatsApp Message",
      "type": "webhook",
      "typeVersion": 1,
      "parameters": {
        "path": "whatsapp-webhook"
      }
    },
    {
      "name": "Check for STOP Command",
      "type": "if",
      "typeVersion": 1,
      "parameters": {
        "conditions": {
          "if": [
            {
              "value1": "{{ $json.message_text.toUpperCase() }}",
              "operation": "regex",
              "value2": "^(STOP|UNSUBSCRIBE|QUIT)$"
            }
          ]
        }
      }
    },
    {
      "name": "Handle Opt-Out",
      "type": "httpRequest",
      "typeVersion": 4,
      "position": [700, 200],
      "parameters": {
        "url": "{{ $env.NEXT_PUBLIC_APP_URL }}/api/gym/{{ $json.gym_slug }}/handle-whatsapp-optout",
        "method": "POST",
        "body": {
          "phone_number": "{{ $json.sender_phone }}"
        }
      }
    },
    {
      "name": "Send Confirmation",
      "type": "aisensy",
      "typeVersion": 1,
      "position": [900, 200],
      "parameters": {
        "phone": "{{ $json.sender_phone }}",
        "message": "{{ $node['Handle Opt-Out'].json.message }}"
      }
    },
    {
      "name": "Process Normally",
      "type": "code",
      "typeVersion": 1,
      "position": [700, 400],
      "parameters": {
        "jsCode": "// Continue with normal AI processing\nreturn $json;"
      }
    }
  ]
}
```

---

## 4. Complete Payment Flow (Integration)

### Workflow: Member Requests Membership
```json
{
  "nodes": [
    {
      "name": "Receive Lead Message",
      "type": "webhook",
      "typeVersion": 1,
      "parameters": {
        "path": "lead-webhook"
      }
    },
    {
      "name": "AI: Detect Purchase Intent",
      "type": "claude",
      "typeVersion": 1,
      "parameters": {
        "prompt": "User message: {{ $json.message }}. Detect if they want to buy a membership. Return { intent: 'purchase' | 'inquiry', plan_name: string, coupon_code?: string }"
      }
    },
    {
      "name": "Lookup Plan",
      "type": "httpRequest",
      "typeVersion": 4,
      "parameters": {
        "url": "{{ $env.NEXT_PUBLIC_SUPABASE_URL }}/rest/v1/plans",
        "method": "GET",
        "headers": {
          "Authorization": "Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}"
        },
        "qs": {
          "gym_id": "eq.{{ $json.gym_id }}",
          "name": "eq.{{ $node['AI: Detect Purchase Intent'].json.plan_name }}",
          "is_active": "eq.true"
        }
      }
    },
    {
      "name": "Validate WhatsApp",
      "type": "httpRequest",
      "typeVersion": 4,
      "parameters": {
        "url": "{{ $env.NEXT_PUBLIC_APP_URL }}/api/gym/{{ $json.gym_slug }}/validate-whatsapp",
        "method": "POST",
        "body": {
          "phone_number": "{{ $json.sender_phone }}"
        }
      }
    },
    {
      "name": "Check Validation",
      "type": "if",
      "typeVersion": 1,
      "parameters": {
        "conditions": {
          "if": [
            {
              "value1": "{{ $node['Validate WhatsApp'].json.valid }}",
              "operation": "equals",
              "value2": true
            }
          ]
        }
      }
    },
    {
      "name": "Generate Payment Link",
      "type": "httpRequest",
      "typeVersion": 4,
      "parameters": {
        "url": "{{ $env.NEXT_PUBLIC_APP_URL }}/api/gym/{{ $json.gym_slug }}/payment-link",
        "method": "POST",
        "body": {
          "plan_id": "{{ $node['Lookup Plan'].json[0].id }}",
          "coupon_code": "{{ $node['AI: Detect Purchase Intent'].json.coupon_code }}",
          "member_id": "{{ $json.member_id }}"
        }
      }
    },
    {
      "name": "Send Payment Link",
      "type": "aisensy",
      "typeVersion": 1,
      "position": [900, 200],
      "parameters": {
        "phone": "{{ $json.sender_phone }}",
        "message": "Great! Here's your membership link: {{ $node['Generate Payment Link'].json.short_url }}\n\nAmount: ₹{{ $node['Generate Payment Link'].json.amount }}"
      }
    },
    {
      "name": "Increment Counter",
      "type": "httpRequest",
      "typeVersion": 4,
      "position": [1100, 200],
      "parameters": {
        "url": "{{ $env.NEXT_PUBLIC_APP_URL }}/api/gym/{{ $json.gym_slug }}/increment-whatsapp-count",
        "method": "POST"
      }
    },
    {
      "name": "Send Blocked Message",
      "type": "aisensy",
      "typeVersion": 1,
      "position": [900, 400],
      "parameters": {
        "phone": "{{ $json.sender_phone }}",
        "message": "Sorry, we've reached our daily message limit. Please try again tomorrow."
      }
    }
  ]
}
```

---

## 5. API Endpoints to Create

You'll need to create these Next.js API routes to support n8n:

### `/api/gym/[slug]/validate-whatsapp` (POST)
```typescript
// Validates if a message can be sent to a phone number
// Returns: { valid: boolean, reason?: string }
```

### `/api/gym/[slug]/increment-whatsapp-count` (POST)
```typescript
// Increments daily message count for the gym
// Returns: { success: boolean, count: number }
```

### `/api/gym/[slug]/handle-whatsapp-optout` (POST)
```typescript
// Handles STOP/UNSUBSCRIBE command
// Returns: { success: boolean, message: string }
```

---

## 6. Environment Variables for n8n

Add these to your n8n environment:

```bash
NEXT_PUBLIC_APP_URL=https://gymos.in
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 7. Testing the Workflows

### Test Payment Link Generation
1. Create a test plan in the database
2. Trigger the workflow with a test message
3. Verify payment link is generated
4. Check `payment_link_audit` table for the entry

### Test WhatsApp Validation
1. Add a phone to `whatsapp_opt_outs`
2. Trigger the workflow with that phone
3. Verify message is not sent
4. Check logs for "Blocked: Recipient has opted out"

### Test Rate Limiting
1. Insert 50 rows in `whatsapp_daily_counts` for today
2. Trigger the workflow
3. Verify message is not sent
4. Check logs for "Blocked: Daily message limit reached"

---

## 8. Monitoring & Debugging

### Check Payment Link Audit
```sql
SELECT * FROM payment_link_audit 
WHERE gym_id = 'your-gym-id' 
ORDER BY created_at DESC 
LIMIT 10;
```

### Check WhatsApp Opt-Outs
```sql
SELECT * FROM whatsapp_opt_outs 
WHERE gym_id = 'your-gym-id';
```

### Check Daily Message Count
```sql
SELECT * FROM whatsapp_daily_counts 
WHERE gym_id = 'your-gym-id' 
AND date = CURRENT_DATE;
```

### Check Compliance Status
```sql
SELECT 
  COUNT(*) as total_messages,
  MAX(count) as max_daily_count,
  COUNT(DISTINCT phone_number) as unique_opt_outs
FROM whatsapp_daily_counts
WHERE gym_id = 'your-gym-id'
AND date >= CURRENT_DATE - INTERVAL '7 days';
```

---

## 9. Error Handling

### Payment Link API Errors
- `400` – Invalid request (missing plan_id, invalid coupon)
- `401` – Unauthorized (not authenticated)
- `403` – Forbidden (not gym owner)
- `404` – Plan or coupon not found
- `500` – Razorpay API error

### WhatsApp Validation Errors
- `400` – Invalid phone number
- `401` – Unauthorized
- `500` – Database error

### Recommended n8n Error Handling
```json
{
  "name": "Handle API Error",
  "type": "if",
  "parameters": {
    "conditions": {
      "if": [
        {
          "value1": "{{ $node['Call API'].executionStatus }}",
          "operation": "equals",
          "value2": "error"
        }
      ]
    }
  }
}
```

---

## Questions?

See `PHASE1_FIXES.md` for detailed implementation guide.

---

## 10. n8n Queue Mode – Production Config

When running n8n in queue mode with Redis, add these environment variables to **every** worker and main instance:

```bash
# Queue mode
EXECUTIONS_MODE=queue
QUEUE_BULL_REDIS_HOST=your-redis-host
QUEUE_BULL_REDIS_PORT=6379

# Isolate queue keys per environment — prevents collisions with other apps
QUEUE_BULL_PREFIX=gymos_prod   # use gymos_staging for staging

# Health check — exposes /healthz on each worker for load balancer probes
QUEUE_HEALTH_CHECK_ACTIVE=true
QUEUE_HEALTH_CHECK_PORT=5678
```

> **Why `QUEUE_BULL_PREFIX`?** Bull uses Redis keys like `bull:<queue>:<job>`. Without a prefix, two apps sharing the same Redis instance will stomp on each other's jobs. Set a unique prefix per environment.
