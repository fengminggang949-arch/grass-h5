import { DEFAULT_FORBIDDEN_EXPRESSIONS } from "@/lib/project-content-rules";

const builtInForbidden = ["保证治愈", "绝对有效", "完全无痛", "永不复发", "包治"];

export function sanitizeGeneratedText(value: string, configuredWords: string[] = []) {
  return [...new Set([...builtInForbidden, ...DEFAULT_FORBIDDEN_EXPRESSIONS, ...configuredWords])]
    .reduce((text, word) => text.replaceAll(word, "需结合实际情况"), value)
    .replace(/[<>]/g, "");
}
