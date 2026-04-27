import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";
import { errorResponse, safeJson } from "@/lib/api";
import { getGymSecret } from "@/lib/secrets";

/**
 * POST /api/gym/[slug]/payment-link
 * 
 * Generates a deterministic Razorpay payment link server-side.
 * Never lets the AI construct URLs or prices directly.
 * 
 * Request body:
 * {
 *   plan_id?: string,
 *   supplement_id?: string,
 *   coupon_code?: string,
 *   member_id?: string,
 *   amount?: number (only for custom payments, must be validated)
 * }
 * 
 * Response:
 * {
 *   short_url: string,
 *   razorpay_link_id: string,
 *   amount: number,
 *   discount_applied: number | null
 * }
 */

const paymentLinkSchema = z.object({
  plan_id: z.string().uuid().optional(),
  supplement_id: z.string().uuid().optional(),
  coupon_code: z.string().optional(),
  member_id: z.string().uuid().optional(),
  amount: z.number().positive().optional()
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const parsed = paymentLinkSchema.safeParse(await safeJson(request));

    if (!parsed.success) {
      return errorResponse("Invalid request body", 400);
    }

    // Authenticate user
    const serverClient = await getServerSupabase();
    const { data: { user } } = await serverClient.auth.getUser();

    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    const supabase = getAdminSupabase();

    // Fetch gym by slug — only need id, owner_id, and vault reference columns
    const { data: gym, error: gymError } = await supabase
      .from("gyms")
      .select("id, owner_id, razorpay_key_id_secret_id, razorpay_secret_secret_id, razorpay_key_id, razorpay_secret")
      .eq("slug", slug)
      .single();

    if (gymError || !gym) {
      return errorResponse("Gym not found", 404);
    }

    // Verify user is the gym owner
    if (gym.owner_id !== user.id) {
      return errorResponse("Forbidden", 403);
    }

    // Resolve Razorpay credentials — prefer vault, fall back to legacy plain-text
    const razorpayKeyId =
      gym.razorpay_key_id_secret_id
        ? await getGymSecret(gym.id, "razorpay_key_id")
        : gym.razorpay_key_id;

    const razorpaySecret =
      gym.razorpay_secret_secret_id
        ? await getGymSecret(gym.id, "razorpay_secret")
        : gym.razorpay_secret;

    // Validate Razorpay credentials
    if (!razorpayKeyId || !razorpaySecret) {
      return errorResponse("Razorpay not configured for this gym", 400);
    }

    let finalAmount = 0;
    let discountApplied = 0;
    let discountCode: string | null = null;
    let planId: string | null = null;

    // Case 1: Plan-based payment
    if (parsed.data.plan_id) {
      const { data: plan, error: planError } = await supabase
        .from("plans")
        .select("id, price")
        .eq("id", parsed.data.plan_id)
        .eq("gym_id", gym.id)
        .eq("is_active", true)
        .single();

      if (planError || !plan) {
        return errorResponse("Plan not found or inactive", 404);
      }

      finalAmount = plan.price;
      planId = plan.id;
    }
    // Case 2: Custom amount (must be explicitly allowed and validated)
    else if (parsed.data.amount) {
      // Only allow custom amounts if explicitly configured per gym
      // For now, reject custom amounts to prevent AI hallucination
      return errorResponse("Custom amounts not allowed", 400);
    }
    // Case 3: Supplement (future feature)
    else if (parsed.data.supplement_id) {
      return errorResponse("Supplements not yet implemented", 400);
    }
    else {
      return errorResponse("Must provide plan_id, supplement_id, or amount", 400);
    }

    // Apply discount if coupon code provided
    if (parsed.data.coupon_code) {
      const { data: discount, error: discountError } = await supabase
        .from("discounts")
        .select("id, percentage, max_uses, current_uses, expires_at")
        .eq("gym_id", gym.id)
        .eq("code", parsed.data.coupon_code)
        .eq("is_active", true)
        .single();

      if (discountError || !discount) {
        return errorResponse("Coupon code not found or inactive", 404);
      }

      // Check expiry
      if (discount.expires_at && new Date(discount.expires_at) < new Date()) {
        return errorResponse("Coupon code expired", 400);
      }

      // Check usage limit
      if (discount.max_uses && discount.current_uses >= discount.max_uses) {
        return errorResponse("Coupon code usage limit reached", 400);
      }

      discountApplied = Math.round((finalAmount * discount.percentage) / 100);
      finalAmount = Math.max(0, finalAmount - discountApplied);
      discountCode = parsed.data.coupon_code;

      // Increment discount usage
      await supabase
        .from("discounts")
        .update({ current_uses: (discount.current_uses || 0) + 1 })
        .eq("code", discountCode)
        .eq("gym_id", gym.id);
    }

    // Create Razorpay payment link
    const razorpayResponse = await createRazorpayLink(
      razorpayKeyId,
      razorpaySecret,
      {
        amount: Math.round(finalAmount * 100), // Razorpay expects amount in paise
        description: `GymOS Payment - ${gym.id}`,
        customer_notify: 1,
        notes: {
          gym_id: gym.id,
          member_id: parsed.data.member_id || null,
          plan_id: planId || null,
          coupon_code: discountCode || null
        }
      }
    );

    if (!razorpayResponse.success) {
      return errorResponse(
        `Razorpay error: ${razorpayResponse.error}`,
        500
      );
    }

    // Audit log: Record payment link generation
    const { error: auditError } = await supabase
      .from("payment_link_audit")
      .insert({
        gym_id: gym.id,
        member_id: parsed.data.member_id || null,
        plan_id: planId,
        type: parsed.data.plan_id ? "plan" : "custom",
        amount: finalAmount + discountApplied, // Original amount before discount
        discount_applied: discountApplied > 0 ? discountApplied : null,
        discount_code: discountCode,
        created_by_ai: false, // Set to true if called from n8n AI workflow
        razorpay_link_id: razorpayResponse.id
      });

    if (auditError) {
      console.error("Audit log error:", auditError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      short_url: razorpayResponse.short_url,
      razorpay_link_id: razorpayResponse.id,
      amount: finalAmount,
      discount_applied: discountApplied > 0 ? discountApplied : null
    });
  } catch (error) {
    console.error("Payment link error:", error);
    return errorResponse("Internal server error", 500);
  }
}

/**
 * Create a Razorpay payment link
 * https://razorpay.com/docs/api/payment-links/
 */
async function createRazorpayLink(
  keyId: string,
  keySecret: string,
  payload: {
    amount: number;
    description: string;
    customer_notify: number;
    notes: Record<string, unknown>;
  }
): Promise<{
  success: boolean;
  id?: string;
  short_url?: string;
  error?: string;
}> {
  try {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    const response = await fetch("https://api.razorpay.com/v1/payment_links", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error?.description || "Razorpay API error"
      };
    }

    const data = await response.json();
    return {
      success: true,
      id: data.id,
      short_url: data.short_url
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
