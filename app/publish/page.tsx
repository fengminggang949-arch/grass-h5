"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MobileShell, PageHeader } from "@/components/mobile-shell";
import { CopyButton } from "@/components/copy-button";
import { loadFlow, type FlowState } from "@/lib/client-store";
import { track } from "@/lib/analytics";

const steps=["点击复制全部内容","准备本次真实体验的照片","打开小红书并点击底部发布","添加图片、粘贴文案并自行确认发布"];
export default function PublishPage(){const [toast,setToast]=useState("");const [flow,setFlow]=useState<FlowState>({});useEffect(()=>{const timer=window.setTimeout(()=>setFlow(loadFlow()),0);track("publish_guide_view");return()=>window.clearTimeout(timer)},[]); const all=useMemo(()=>`${flow.selectedTitle||""}\n\n${flow.result?.content||""}\n\n${flow.result?.hashtags.join(" ")||""}`,[flow]);
 return <MobileShell><div className="page no-dock"><PageHeader backHref="/result"/><h1>发布到小红书</h1><p className="sub">四步完成发布，最后由你自行确认</p><div className="card section">{steps.map((item,i)=><div className="step" key={item}><span className="step-num">{i+1}</span><span style={{paddingTop:4}}>{item}</span></div>)}</div><div className="card section" style={{background:"#fffaf0"}}><strong>真实提醒</strong><p className="sub">请只发布基于本人真实体验的内容。本工具不会也不能自动发布。</p></div><div className="actions section"><CopyButton text={all} className="btn btn-primary" onCopied={()=>{track("copy_all");setToast("复制成功，请打开小红书粘贴。")}}>再次复制全部内容</CopyButton><Link className="btn btn-ghost" style={{display:"grid",placeItems:"center"}} href="/result">返回生成结果</Link><Link className="btn btn-ghost" style={{display:"grid",placeItems:"center"}} href="/">返回首页</Link></div>{toast&&<div className="toast">{toast}</div>}</div></MobileShell>}
