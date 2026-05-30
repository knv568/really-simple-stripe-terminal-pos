export const BRAND = {
  businessName: "My Business",
  /** Home screen label when staff add the POS to their device (aim for ≤12 characters). */
  pwaShortName: "My Business",
  /**
   * Home screen icon glyph (1–2 characters). Leave empty to use the first letter of
   * `pwaShortName` (e.g. "My Business" → "M").
   */
  iconMark: "",
  /** UI accent — keep in sync with `--accent` in `src/app/globals.css`. */
  accentColor: "#3d5a47",
  /** Page / manifest background — keep in sync with `--background` in globals.css. */
  backgroundColor: "#f7f4ef",
  /** Text on the generated home screen icon. */
  iconForeground: "#f7f4ef",
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
