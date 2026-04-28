/**
 * Data migration utility: Convert gym_settings.pricing_json to plans table
 * 
 * Usage:
 * 1. Run this in a Node.js script or as a one-time migration
 * 2. It reads all gyms' pricing_json and creates corresponding plan records
 * 3. Maps existing members.plan_type to the new plan_id where possible
 * 
 * Example pricing_json structure:
 * {
 *   "gold_6m": 8000,
 *   "silver_3m": 4500,
 *   "bronze_1m": 1500
 * }
 */

import { createClient } from "@supabase/supabase-js";

interface PricingEntry {
  name: string;
  price: number;
  durationDays: number;
}

/**
 * Parse plan name to extract duration in days
 * Examples: "gold_6m" -> 180, "silver_3m" -> 90, "bronze_1m" -> 30
 */
function parseDurationFromName(name: string): number {
  const match = name.match(/(\d+)([myd])/i);
  if (!match) return 30; // default to 1 month

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case "y":
      return value * 365;
    case "m":
      return value * 30;
    case "d":
      return value;
    default:
      return 30;
  }
}

/**
 * Migrate pricing from JSONB to plans table
 */
export async function migratePricingToPlans() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Fetch all gyms with pricing_json
  const { data: gyms, error: gymsError } = await supabase
    .from("gyms")
    .select("id, name")
    .eq("is_active", true);

  if (gymsError) throw gymsError;
  if (!gyms || gyms.length === 0) {
    console.log("No gyms found");
    return;
  }

  console.log(`Found ${gyms.length} gyms. Starting migration...`);

  for (const gym of gyms) {
    console.log(`\nProcessing gym: ${gym.name} (${gym.id})`);

    // Fetch gym settings
    const { data: settings, error: settingsError } = await supabase
      .from("gym_settings")
      .select("pricing_json")
      .eq("gym_id", gym.id)
      .single();

    if (settingsError) {
      console.warn(`  ⚠️  No settings found for gym ${gym.id}`);
      continue;
    }

    if (!settings?.pricing_json || typeof settings.pricing_json !== "object") {
      console.log(`  ⚠️  No pricing_json found for gym ${gym.id}`);
      continue;
    }

    // Parse pricing_json and create plan entries
    const pricingJson = settings.pricing_json as Record<string, number>;
    const plansToInsert: PricingEntry[] = [];

    for (const [planName, price] of Object.entries(pricingJson)) {
      const durationDays = parseDurationFromName(planName);
      plansToInsert.push({
        name: planName,
        price,
        durationDays
      });
    }

    if (plansToInsert.length === 0) {
      console.log(`  ⚠️  No valid plans found in pricing_json`);
      continue;
    }

    // Insert plans
    const { data: insertedPlans, error: insertError } = await supabase
      .from("plans")
      .insert(
        plansToInsert.map((p) => ({
          gym_id: gym.id,
          name: p.name,
          duration_days: p.durationDays,
          price: p.price,
          is_active: true
        }))
      )
      .select("id, name");

    if (insertError) {
      console.error(`  ❌ Error inserting plans: ${insertError.message}`);
      continue;
    }

    console.log(`  ✅ Created ${insertedPlans?.length || 0} plans`);

    // Map existing members to new plans
    if (insertedPlans && insertedPlans.length > 0) {
      const planMap = new Map(insertedPlans.map((p) => [p.name, p.id]));

      // Fetch members with plan_type
      const { data: members, error: membersError } = await supabase
        .from("members")
        .select("id, plan_type")
        .eq("gym_id", gym.id)
        .not("plan_type", "is", null);

      if (membersError) {
        console.warn(`  ⚠️  Error fetching members: ${membersError.message}`);
        continue;
      }

      if (members && members.length > 0) {
        let mappedCount = 0;

        for (const member of members) {
          const planId = planMap.get(member.plan_type);
          if (planId) {
            const { error: updateError } = await supabase
              .from("members")
              .update({ plan_id: planId })
              .eq("id", member.id);

            if (!updateError) {
              mappedCount++;
            }
          }
        }

        console.log(`  ✅ Mapped ${mappedCount}/${members.length} members to new plans`);
      }
    }
  }

  console.log("\n✅ Migration complete!");
}

// Run if executed directly
if (require.main === module) {
  migratePricingToPlans().catch(console.error);
}
