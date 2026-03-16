export const STRIPE_PRODUCTS = {
  tenant_basic: {
    product_id: "prod_U9mi2XMZdwKSKC",
    price_id: "price_1TBT8jC4M1A6BcTPiyEyHu24",
    name: "Tenant Basic",
    amount: 850_00,
    interval: "month" as const,
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
