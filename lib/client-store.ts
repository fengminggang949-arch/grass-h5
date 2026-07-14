"use client";

import type { GenerationPayload, HistoryRecord, NoteResult } from "@/types/note";

const FLOW_KEY = "recommendation-assistant-flow";
const HISTORY_KEY = "recommendation-assistant-history";

export type FlowState = Partial<GenerationPayload> & { result?: NoteResult; selectedTitle?: string };

export function loadFlow(): FlowState {
  try { return JSON.parse(localStorage.getItem(FLOW_KEY) || "{}"); } catch { return {}; }
}

export function saveFlow(patch: Partial<FlowState>) {
  const next = { ...loadFlow(), ...patch };
  try { localStorage.setItem(FLOW_KEY, JSON.stringify(next)); } catch { /* Safari 隐私模式下可能禁止存储 */ }
  return next;
}

export function getSessionId() {
  const key = "recommendation-assistant-session";
  try {
    const stored = sessionStorage.getItem(key);
    if (stored) return stored;
  } catch { /* 继续使用内存会话标识 */ }

  const randomUUID = globalThis.crypto?.randomUUID?.bind(globalThis.crypto);
  const id = randomUUID
    ? randomUUID()
    : `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  try { sessionStorage.setItem(key, id); } catch { /* 不让存储失败阻断页面跳转 */ }
  return id;
}

export function createClientId(prefix = "record") {
  const randomUUID = globalThis.crypto?.randomUUID?.bind(globalThis.crypto);
  return randomUUID
    ? randomUUID()
    : `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function loadHistory(): HistoryRecord[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
}

export function saveHistory(record: HistoryRecord) {
  const next = [record, ...loadHistory().filter((item) => item.id !== record.id)].slice(0, 10);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* Safari 隐私模式下可能禁止存储 */ }
}

export function deleteHistory(id: string) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(loadHistory().filter((item) => item.id !== id))); } catch { /* 存储失败不阻断页面操作 */ }
}

export function clearHistory() { try { localStorage.removeItem(HISTORY_KEY); } catch { /* 存储失败不阻断页面操作 */ } }
