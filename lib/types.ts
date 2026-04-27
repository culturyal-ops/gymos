export type MemberStatus = "active" | "expiring" | "churned" | "paused";
export type LeadStage = "new" | "ai_replied" | "followed_up" | "converted" | "cold";
export type PaymentMode = "cash" | "counter_upi" | "razorpay_link" | "razorpay_subscription";

export interface Plan {
  id: string;
  gym_id: string;
  name: string;
  duration_days: number;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Discount {
  id: string;
  gym_id: string;
  code: string;
  percentage: number;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppOptOut {
  id: string;
  gym_id: string;
  phone_number: string;
  opted_out_at: string;
  reason: string | null;
  created_at: string;
}

export interface PaymentLinkAudit {
  id: string;
  gym_id: string;
  member_id: string | null;
  plan_id: string | null;
  type: "plan" | "supplement" | "custom";
  amount: number;
  discount_applied: number | null;
  discount_code: string | null;
  created_by_ai: boolean;
  razorpay_link_id: string | null;
  created_at: string;
}

export interface Member {
  id: string;
  gym_id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  plan_type: string | null;
  plan_id: string | null;
  status: MemberStatus | null;
  expiry_date: string | null;
  joined_at: string | null;
  streak_count: number | null;
  notes: string | null;
  added_by: string | null;
  created_at: string | null;
}

export interface Lead {
  id: string;
  gym_id: string;
  name: string | null;
  phone: string | null;
  source: string | null;
  query_text: string | null;
  stage: LeadStage | null;
  ai_reply_sent: boolean | null;
  discount_sent: boolean | null;
  converted_member: string | null;
  last_interaction: string | null;
  created_at: string | null;
}

export interface Transaction {
  id: string;
  gym_id: string;
  member_id: string | null;
  amount: number | null;
  payment_mode: PaymentMode | null;
  razorpay_payment_id: string | null;
  plan_purchased: string | null;
  logged_by: string | null;
  auto_logged: boolean | null;
  created_at: string | null;
}
