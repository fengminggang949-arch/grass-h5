import { NextRequest, NextResponse } from "next/server";
import { defaultStore } from "@/lib/data";
import { fallbackStoreConfig, getStoreConfig } from "@/lib/store-config";

function cleanId(value: string | null) {
  return (value || defaultStore.id).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 50) || defaultStore.id;
}

export async function GET(request: NextRequest) {
  try {
    const config = await getStoreConfig(cleanId(request.nextUrl.searchParams.get("storeId")));
    return NextResponse.json(config, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return NextResponse.json(fallbackStoreConfig(), { headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}
