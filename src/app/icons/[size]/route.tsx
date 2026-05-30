import {
  isPwaIconSize,
  pwaIconImageResponse,
} from "@/lib/pwa-icon";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ size: string }> },
) {
  const size = Number((await context.params).size);
  if (!isPwaIconSize(size)) {
    return new Response("Not found", { status: 404 });
  }

  return pwaIconImageResponse(size);
}
