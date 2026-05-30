import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/branding";
import { PWA_COLORS, pwaManifestIconPaths } from "@/lib/pwa";

export default function manifest(): MetadataRoute.Manifest {
  const { icons } = pwaManifestIconPaths();

  return {
    id: "/",
    name: BRAND.pageTitle,
    short_name: BRAND.pwaShortName,
    description: BRAND.pageDescription,
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    orientation: "portrait",
    theme_color: PWA_COLORS.theme,
    background_color: PWA_COLORS.background,
    lang: "en",
    dir: "ltr",
    categories: ["finance", "business"],
    prefer_related_applications: false,
    icons,
  };
}
