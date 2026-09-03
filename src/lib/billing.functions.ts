import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const PLANS = {
  monthly: { label: "Monthly", amount: 900, interval: "month" as const, blurb: "$9 / month" },
  yearly: { label: "Yearly", amount: 5900, interval: "year" as const, blurb: "$59 / year" },
};

export type PlanKey = keyof typeof PLANS;

export type PlanStatus = {
  active: boolean;
  status: string;
  interval: string | null;
  currentPeriodEnd: string | null;
  hasCustomer: boolean;
};

export const getSubscriptionStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlanStatus> => {
    const { data } = await context.supabase
      .from("subscribers")
      .select("status, plan_interval, current_period_end, stripe_customer_id")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!data) {
      return {
        active: false,
        status: "inactive",
        interval: null,
        currentPeriodEnd: null,
        hasCustomer: false,
      };
    }

    const notExpired =
      !data.current_period_end || new Date(data.current_period_end).getTime() > Date.now();

    return {
      active: ["active", "trialing"].includes(data.status) && notExpired,
      status: data.status,
      interval: data.plan_interval,
      currentPeriodEnd: data.current_period_end,
      hasCustomer: Boolean(data.stripe_customer_id),
    };
  });

export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { kind: "subscription" | "report"; plan?: PlanKey; reportId?: string; origin: string }) =>
      input,
  )
  .handler(async ({ data, context }): Promise<{ url: string }> => {
    const key = process.env["STRIPE_SECRET_KEY"];
    if (!key) throw new Error("Payments are not configured yet.");

    const { getStripe } = await import("./stripe.server");
    const stripe = getStripe(key);

    const email = (context.claims as { email?: string } | null)?.email;

    const { data: row } = await context.supabase
      .from("subscribers")
      .select("stripe_customer_id")
      .eq("user_id", context.userId)
      .maybeSingle();

    const common = {
      ...(row?.stripe_customer_id
        ? { customer: row.stripe_customer_id }
        : email
          ? { customer_email: email }
          : {}),
      client_reference_id: context.userId,
      allow_promotion_codes: true,
    };

    if (data.kind === "subscription") {
      const plan = PLANS[data.plan ?? "monthly"];
      const session = await stripe.checkout.sessions.create({
        ...common,
        mode: "subscription",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: plan.amount,
              recurring: { interval: plan.interval },
              product_data: {
                name: `Looxrater Pro — ${plan.label}`,
                description: "Unlimited analyses, all ten measurements and your private history.",
              },
            },
          },
        ],
        subscription_data: { metadata: { user_id: context.userId } },
        metadata: { user_id: context.userId, kind: "subscription" },
        success_url: `${data.origin}/account?checkout=success`,
        cancel_url: `${data.origin}/account?checkout=cancelled`,
      });
      if (!session.url) throw new Error("Could not start checkout.");
      return { url: session.url };
    }

    if (!data.reportId) throw new Error("Missing report.");

    // Confirm the report belongs to the caller before selling an unlock for it.
    const { data: report } = await context.supabase
      .from("reports")
      .select("id")
      .eq("id", data.reportId)
      .maybeSingle();
    if (!report) throw new Error("Report not found.");

    const session = await stripe.checkout.sessions.create({
      ...common,
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: 400,
            product_data: {
              name: "Looxrater — full report",
              description: "One-time unlock for a single proportion report.",
            },
          },
        },
      ],
      metadata: { user_id: context.userId, kind: "report", report_id: data.reportId },
      success_url: `${data.origin}/report/${data.reportId}?checkout=success`,
      cancel_url: `${data.origin}/report/${data.reportId}?checkout=cancelled`,
    });
    if (!session.url) throw new Error("Could not start checkout.");
    return { url: session.url };
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { origin: string }) => input)
  .handler(async ({ data, context }): Promise<{ url: string }> => {
    const key = process.env["STRIPE_SECRET_KEY"];
    if (!key) throw new Error("Payments are not configured yet.");

    const { data: row } = await context.supabase
      .from("subscribers")
      .select("stripe_customer_id")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!row?.stripe_customer_id) throw new Error("No billing account yet.");

    const { getStripe } = await import("./stripe.server");
    const session = await getStripe(key).billingPortal.sessions.create({
      customer: row.stripe_customer_id,
      return_url: `${data.origin}/account`,
    });
    return { url: session.url };
  });
