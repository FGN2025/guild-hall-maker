export const STRIPE_PRODUCTS = {
  tenant_basic: {
    product_id: "prod_U9mi2XMZdwKSKC",
    price_id: "price_1TBT8jC4M1A6BcTPiyEyHu24",
    name: "Tenant Basic",
    amount: 600_00,
    interval: "month" as const,
    tier: "basic" as const,
    description: "Core tenant portal, subscriber management, marketing tools.",
  },
  tenant_pro: {
    // TODO: replace with real Stripe product/price ids when wired up
    product_id: "prod_tenant_pro_placeholder",
    price_id: "price_tenant_pro_placeholder",
    name: "Tenant Pro",
    amount: 850_00,
    interval: "month" as const,
    tier: "pro" as const,
    description: "Everything in Basic plus advanced marketing agent, universal assets, and priority support.",
  },
  cloud_gaming_seat: {
    product_id: "prod_U9mfAZOF0p23ub",
    price_id: "price_1TBT6ZC4M1A6BcTPCCEGAQp7",
    name: "Cloud Gaming",
    amount: 29_99,
    interval: "month" as const,
  },
} as const;

export type StripeProductKey = keyof typeof STRIPE_PRODUCTS;
export type TenantPlanTier = "basic" | "pro";

export const TENANT_PLANS = [STRIPE_PRODUCTS.tenant_basic, STRIPE_PRODUCTS.tenant_pro] as const;
