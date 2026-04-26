export type MemberStatus = "active" | "expiring" | "churned" | "paused";
export type LeadStage = "new" | "ai_replied" | "followed_up" | "converted" | "cold";
export type PaymentMode = "cash" | "counter_upi" | "razorpay_link" | "razorpay_subscription";

export interface Member {
  id: string;
  gym_id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  plan_type: string | null;
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
