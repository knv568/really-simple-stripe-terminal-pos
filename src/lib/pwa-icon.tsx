import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/branding";

export const PWA_ICON_SIZES = [32, 180, 192, 512] as const;
export type PwaIconSize = (typeof PWA_ICON_SIZES)[number];

const SIZE_SET = new Set<number>(PWA_ICON_SIZES);

export function isPwaIconSize(value: number): value is PwaIconSize {
  return SIZE_SET.has(value);
}

/** Letter(s) on the home screen icon — from `iconMark` or first character of `pwaShortName`. */
export function getPwaIconMark(): string {
  const custom = BRAND.iconMark.trim();
  if (custom) return custom.slice(0, 2).toUpperCase();
  const first = BRAND.pwaShortName.trim()[0];
  return first ? first.toUpperCase() : "P";
}

export function pwaIconUrl(size: PwaIconSize): string {
  return `/icons/${size}`;
}

export function pwaIconImageResponse(size: PwaIconSize): ImageResponse {
  const mark = getPwaIconMark();
  const radius = Math.round(size * 0.18);
  const fontSize =
    mark.length > 1 ? Math.round(size * 0.36) : Math.round(size * 0.5);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND.accentColor,
          borderRadius: radius,
        }}
      >
        <div
          style={{
            fontSize,
            fontWeight: 600,
            color: BRAND.iconForeground,
            lineHeight: 1,
            fontFamily: "system-ui, sans-serif",
            marginTop: Math.round(size * 0.03),
          }}
        >
          {mark}
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
