"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomDock, MobileShell, PageHeader } from "@/components/mobile-shell";
import { loadFlow, saveFlow } from "@/lib/client-store";
import { getProjectContentRule, STYLE_OPTIONS } from "@/lib/project-content-rules";
import { track } from "@/lib/analytics";
import type { ExperienceData, NoteStyle } from "@/types/note";

const emptyExperience: ExperienceData = { feelings: [], concern: "", confirmed: false };

function Options({ options, value, multiple = false, max = 1, onChange }: { options: string[]; value: string | string[]; multiple?: boolean; max?: number; onChange: (value: string | string[]) => void }) {
  const selected = (item: string) => Array.isArray(value) ? value.includes(item) : value === item;
  function choose(item: string) {
    if (!multiple) return onChange(item);
    const list = value as string[];
    if (list.includes(item)) return onChange(list.filter((valueItem) => valueItem !== item));
    if (list.length < max) onChange([...list, item]);
  }
  return <div className="option-grid">{options.map((item) => <button type="button" key={item} className={`option ${selected(item) ? "selected" : ""}`} aria-pressed={selected(item)} onClick={() => choose(item)}>{selected(item) ? "✓ " : ""}{item}</button>)}</div>;
}

export default function ExperiencePage() {
  const router = useRouter();
  const [projectId, setProjectId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [experience, setExperience] = useState<ExperienceData>(emptyExperience);
  const [style, setStyle] = useState<NoteStyle | "">("");
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const flow = loadFlow();
      if (!flow.projectId || !flow.projectName) {
        router.replace("/project");
        return;
      }
      setProjectId(flow.projectId);
      setProjectName(flow.projectName);
      const stored = flow.experience as Partial<ExperienceData> | undefined;
      setExperience({
        feelings: Array.isArray(stored?.feelings) ? stored.feelings.slice(0, 2) : [],
        concern: typeof stored?.concern === "string" ? stored.concern : "",
        confirmed: false,
      });
      if (STYLE_OPTIONS.some((option) => option.value === flow.style)) setStyle(flow.style as NoteStyle);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [router]);

  const rule = useMemo(() => getProjectContentRule(projectId, projectName), [projectId, projectName]);
  const answered = Number(experience.feelings.length > 0) + Number(Boolean(experience.concern)) + Number(Boolean(style));
  const valid = answered === 3 && experience.confirmed;

  function updateExperience(patch: Partial<ExperienceData>) {
    setExperience((current) => ({ ...current, ...patch }));
    setError("");
  }

  function generate() {
    if (!valid || !style) {
      setError("请完成3个问题并确认内容基于本人真实体验。");
      return;
    }
    saveFlow({ experience, style });
    track("experience_submitted");
    track("style_selected");
    router.push("/generating");
  }

  return <MobileShell><div className="page"><PageHeader backHref="/project"/><h1>{projectName ? `关于${projectName}，再选3项` : "再选3项"}</h1><p className="sub">只选符合本人真实情况的内容，大约20秒完成。</p><div className="progress-wrap"><div className="progress" style={{ width: `${answered / 3 * 100}%` }}/></div><span className="counter">已完成 {answered}/3</span>
    <section className="section"><div className="section-title"><h3>1. 你最明显的感受是什么？ <span className="required">*</span></h3><span className="counter">最多2项</span></div><Options options={rule.feelings} value={experience.feelings} multiple max={2} onChange={(value) => updateExperience({ feelings: value as string[] })}/></section>
    <section className="section"><div className="section-title"><h3>2. 你原来最担心什么？ <span className="required">*</span></h3></div><Options options={rule.concerns} value={experience.concern} onChange={(value) => updateExperience({ concern: value as string })}/></section>
    <section className="section"><div className="section-title"><h3>3. 希望文章是什么感觉？ <span className="required">*</span></h3></div><div className="style-list">{STYLE_OPTIONS.map((option) => <button type="button" key={option.value} className={`style-card ${style === option.value ? "selected" : ""}`} aria-pressed={style === option.value} onClick={() => { setStyle(option.value); setError(""); }}><span className="radio"/><span><strong>{option.value}</strong><span className="sub" style={{ display: "block", marginTop: 4 }}>{option.description}</span></span></button>)}</div></section>
    <label className="check-row"><input type="checkbox" checked={experience.confirmed} onChange={(event) => updateExperience({ confirmed: event.target.checked })}/><span>我确认以上选择基于本人真实体验，并会在发布前自行核对。</span></label>
    {error && <div className="error">{error}</div>}
  </div><BottomDock><button type="button" className="btn btn-primary" disabled={!valid} style={{ opacity: valid ? 1 : .45 }} onClick={generate}>确认并生成</button></BottomDock></MobileShell>;
}
