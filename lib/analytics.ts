"use client";

import { getSessionId, loadFlow } from "@/lib/client-store";
import type { AnalyticsEventName } from "@/types/analytics";

export function track(eventName: AnalyticsEventName) {
  try {
    const flow = loadFlow();
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventName, storeId: flow.storeId, campaignId: flow.campaignId, channelId: flow.channelId, projectId: flow.projectId, sessionId: getSessionId() }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // 埋点永远不应阻断用户操作和页面跳转。
  }
}
