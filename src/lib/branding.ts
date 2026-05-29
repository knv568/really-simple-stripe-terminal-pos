export const BRAND = {
  businessName: "My Business",
  locationSubtitle: "Point of Sale",
  pageTitle: "Really Simple Stripe Terminal POS",
  pageDescription:
    "A really simple, staff-facing POS for in-person card payments via Stripe Terminal",
} as const;

export const STRIPE_TAGS = {
  paymentType: "pos",
  source: "really-simple-stripe-terminal-pos",
} as const;

export const QUICK_AMOUNTS_GBP = [5, 10, 15, 20] as const;
