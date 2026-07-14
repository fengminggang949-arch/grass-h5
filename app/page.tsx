"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/mobile-shell";
import { defaultStore, getProject, projects } from "@/lib/data";
import { getSessionId, saveFlow } from "@/lib/client-store";
import { track } from "@/lib/analytics";
import type { QrParams, StoreConfig } from "@/types/store";

export default function Home() {
  const [params, setParams] = useState<QrParams>({ storeId: "store001", campaignId: "", channelId: "", projectId: "" });
  const [store, setStore] = useState(defaultStore);
  const [availableProjects, setAvailableProjects] = useState(projects);
  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const clean = (key: string) => (search.get(key) || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 50);
    const next = { storeId: clean("storeId") || "store001", campaignId: clean("campaignId"), channelId: clean("channelId"), projectId: clean("projectId") };
    const timer = window.setTimeout(() => setParams(next), 0);
    saveFlow({ ...next, sessionId: getSessionId(), projectName: getProject(next.projectId)?.name }); track("page_view");
    fetch(`/api/store?storeId=${encodeURIComponent(next.storeId)}`, { cache:"no-store" }).then((response) => response.json()).then((config:StoreConfig) => {
      setStore(config.store); setAvailableProjects(config.projects);
      saveFlow({ storeId:config.store.id, projectName:config.projects.find((project)=>project.id===next.projectId)?.name });
    }).catch(()=>{});
    return () => window.clearTimeout(timer);
  }, []);
  const selectedProject = availableProjects.find((project)=>project.id===params.projectId);
  return <MobileShell><div className="page">
    <div className="hero-card">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}><div className="logo">{store.logoText}</div><span className="eyebrow">AI 真实分享助手</span></div>
      <h1>{store.name}</h1><p>{store.description}</p>
      <div className="store-meta">
        <div className="meta-row"><span className="meta-icon">◉</span><span>{store.city} · {store.district}</span></div>
        <div className="meta-row"><span className="meta-icon">⌖</span><span>{store.address}</span></div>
        {selectedProject && <div className="meta-row"><span className="meta-icon">✓</span><span>当前体验：{selectedProject.name}</span></div>}
      </div>
    </div>
    <div className="card section"><div className="section-title"><h3>选项目，再回答3个问题</h3><span className="badge">约30秒</span></div><p className="sub">不用写长文，根据本人的真实体验简单选择，即可生成可编辑的分享文案。</p></div>
    <div className="section actions"><Link className="btn btn-primary" style={{ display:"grid", placeItems:"center" }} href={selectedProject ? "/experience" : "/project"} onClick={() => track("start_click")}>开始生成</Link><Link className="btn btn-ghost" style={{ display:"grid", placeItems:"center" }} href="/history">查看我的历史记录</Link></div>
    <p className="fine-print section">内容由AI辅助生成，请根据本人真实体验核对后使用。<br/><Link href="/privacy">隐私政策</Link> · <Link href="/terms">用户协议</Link></p>
  </div></MobileShell>;
}
