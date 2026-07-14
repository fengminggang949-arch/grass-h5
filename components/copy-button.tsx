"use client";

import { useState } from "react";

export function CopyButton({ text, children, className = "btn btn-secondary", onCopied }: { text: string; children: React.ReactNode; className?: string; onCopied?: () => void }) {
  const [fallback, setFallback] = useState(false);
  async function copy() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard_unavailable");
      await navigator.clipboard.writeText(text); onCopied?.();
    }
    catch {
      const area = document.createElement("textarea");
      area.value = text; area.setAttribute("readonly", ""); area.style.position = "fixed"; area.style.left = "-9999px"; area.style.top = "0"; area.style.fontSize = "16px";
      document.body.appendChild(area); area.focus(); area.select(); area.setSelectionRange(0, area.value.length);
      const ok = document.execCommand("copy"); area.remove();
      if (ok) onCopied?.(); else setFallback(true);
    }
  }
  return <><button type="button" className={className} onClick={copy}>{children}</button>{fallback && <div className="error">当前浏览器未允许复制，请长按正文手动选择复制。</div>}</>;
}
