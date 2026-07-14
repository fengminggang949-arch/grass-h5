"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomDock, MobileShell, PageHeader } from "@/components/mobile-shell";
import { projects } from "@/lib/data";
import { loadFlow, saveFlow } from "@/lib/client-store";
import { track } from "@/lib/analytics";
import type { StoreConfig } from "@/types/store";

export default function ProjectPage() {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [availableProjects, setAvailableProjects] = useState(projects);
  useEffect(() => {
    const flow=loadFlow();
    const timer = window.setTimeout(() => setSelected(flow.projectId || ""), 0);
    fetch(`/api/store?storeId=${encodeURIComponent(flow.storeId||"store001")}`,{cache:"no-store"}).then((response)=>response.json()).then((config:StoreConfig)=>{
      setAvailableProjects(config.projects);
      if(flow.projectId&&!config.projects.some((project)=>project.id===flow.projectId))setSelected("");
    }).catch(()=>{});
    return () => window.clearTimeout(timer);
  }, []);
  function next() { const project = availableProjects.find((item) => item.id === selected); if (!project) return; saveFlow({ projectId: project.id, projectName: project.name }); track("project_selected"); router.push("/experience"); }
  return <MobileShell><div className="page"><PageHeader backHref="/"/><h1>你这次体验了什么项目？</h1><p className="sub">选择最符合本次真实体验的项目</p>
    <div className="project-grid">{availableProjects.map((project) => <button type="button" key={project.id} className={`project-card ${selected === project.id ? "selected" : ""}`} aria-pressed={selected === project.id} onClick={() => setSelected(project.id)}><span className="project-icon">{project.icon}</span><strong>{project.name}</strong></button>)}</div>
  </div><BottomDock><button type="button" className="btn btn-primary" disabled={!selected} style={{ opacity:selected ? 1 : .45 }} onClick={next}>下一步</button></BottomDock></MobileShell>;
}
