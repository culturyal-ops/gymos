import type { Lead, Member, Transaction } from "@/lib/types";
import { TEST_GYM_ID } from "@/lib/gym-context";

const now = Date.now();

export const demoMembers: Member[] = [
  {
    id: "m1f8f9d0-2b8a-4d14-a7cb-5f87f9adf101",
    gym_id: TEST_GYM_ID,
    name: "Arun Mathew",
    phone: "+919900000101",
    email: "arun@example.com",
    plan_type: "gold_6m",
    status: "active",
    expiry_date: new Date(now + 62 * 86400000).toISOString(),
    joined_at: new Date(now - 120 * 86400000).toISOString(),
    streak_count: 18,
    notes: null,
    added_by: null,
    created_at: new Date(now - 120 * 86400000).toISOString()
  },
  {
    id: "ee5a9167-c66c-4cfe-8aa1-10a4da0a7f02",
    gym_id: TEST_GYM_ID,
    name: "Riya Thomas",
    phone: "+919900000103",
    email: "riya@example.com",
    plan_type: "bronze_1m",
    status: "expiring",
    expiry_date: new Date(now + 5 * 86400000).toISOString(),
    joined_at: new Date(now - 25 * 86400000).toISOString(),
    streak_count: 7,
    notes: null,
    added_by: null,
    created_at: new Date(now - 25 * 86400000).toISOString()
  },
  {
    id: "36ec12d5-997d-460f-b283-35f282be4f03",
    gym_id: TEST_GYM_ID,
    name: "Sneha George",
    phone: "+919900000104",
    email: "sneha@example.com",
    plan_type: "silver_3m",
    status: "churned",
    expiry_date: new Date(now - 15 * 86400000).toISOString(),
    joined_at: new Date(now - 120 * 86400000).toISOString(),
    streak_count: 2,
    notes: "May return next month",
    added_by: null,
    created_at: new Date(now - 120 * 86400000).toISOString()
  },
  {
    id: "fccf0fc7-f0fe-4f84-b6d6-0db8049ab204",
    gym_id: TEST_GYM_ID,
    name: "Meera Nair",
    phone: "+919900000108",
    email: "meera@example.com",
    plan_type: "gold_6m",
    status: "active",
    expiry_date: new Date(now + 150 * 86400000).toISOString(),
    joined_at: new Date(now - 30 * 86400000).toISOString(),
    streak_count: 26,
    notes: null,
    added_by: null,
    created_at: new Date(now - 30 * 86400000).toISOString()
  }
];

export const demoLeads: Lead[] = [
  {
    id: "l1",
    gym_id: TEST_GYM_ID,
    name: "Kiran",
    phone: "+919900000201",
    source: "instagram_ad",
    query_text: "What are your monthly packages?",
    stage: "new",
    ai_reply_sent: false,
    discount_sent: false,
    converted_member: null,
    last_interaction: new Date(now - 3600000).toISOString(),
    created_at: new Date(now - 3600000).toISOString()
  },
  {
    id: "l2",
    gym_id: TEST_GYM_ID,
    name: "Vivek",
    phone: "+919900000202",
    source: "whatsapp",
    query_text: "Do you have personal training?",
    stage: "ai_replied",
    ai_reply_sent: true,
    discount_sent: true,
    converted_member: null,
    last_interaction: new Date(now - 12 * 3600000).toISOString(),
    created_at: new Date(now - 24 * 3600000).toISOString()
  }
];

export const demoTransactions: Transaction[] = [
  {
    id: "t1",
    gym_id: TEST_GYM_ID,
    member_id: demoMembers[0].id,
    amount: 8000,
    payment_mode: "razorpay_link",
    razorpay_payment_id: "pay_test_001",
    plan_purchased: "gold_6m",
    logged_by: null,
    auto_logged: true,
    created_at: new Date(now - 4 * 86400000).toISOString()
  },
  {
    id: "t2",
    gym_id: TEST_GYM_ID,
    member_id: demoMembers[1].id,
    amount: 1500,
    payment_mode: "cash",
    razorpay_payment_id: null,
    plan_purchased: "bronze_1m",
    logged_by: null,
    auto_logged: false,
    created_at: new Date(now - 2 * 86400000).toISOString()
  },
  {
    id: "t3",
    gym_id: TEST_GYM_ID,
    member_id: demoMembers[3].id,
    amount: 4500,
    payment_mode: "counter_upi",
    razorpay_payment_id: null,
    plan_purchased: "silver_3m",
    logged_by: null,
    auto_logged: false,
    created_at: new Date(now - 1 * 86400000).toISOString()
  }
];
