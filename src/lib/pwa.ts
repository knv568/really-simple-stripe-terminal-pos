import { BRAND } from "@/lib/branding";
import { type PwaIconSize, pwaIconUrl } from "@/lib/pwa-icon";

/** Manifest / viewport colors — sourced from `BRAND` (match `--accent` in globals.css). */
export const PWA_COLORS = {
  theme: BRAND.accentColor,
  background: BRAND.backgroundColor,
} as const;

export function pwaManifestIconPaths() {
  const icon192 = pwaIconUrl(192);
  const icon512 = pwaIconUrl(512);

  return {
    icon192,
    icon512,
    appleTouch: pwaIconUrl(180),
    icons: [
      {
        src: icon192,
        sizes: "192x192" as const,
        type: "image/png" as const,
        purpose: "any" as const,
      },
      {
        src: icon512,
        sizes: "512x512" as const,
        type: "image/png" as const,
        purpose: "any" as const,
      },
      {
        src: icon512,
        sizes: "512x512" as const,
        type: "image/png" as const,
        purpose: "maskable" as const,
      },
    ],
  };
}

export type { PwaIconSize };
