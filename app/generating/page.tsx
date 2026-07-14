"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileShell } from "@/components/mobile-shell";
import { loadFlow, saveFlow } from "@/lib/client-store";
import { track } from "@/lib/analytics";
import type { GenerationPayload } from "@/types/note";

const tips=["正在整理体验细节","正在生成不同角度标题","正在检查违规和夸张表达","正在优化小红书阅读体验"];
export default function GeneratingPage(){ const router=useRouter(); const [tip,setTip]=useState(0); const [error,setError]=useState(""); const [retry,setRetry]=useState(0);
  useEffect(()=>{const timer=setInterval(()=>setTip((v)=>(v+1)%tips.length),700); const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),240000); const flow=loadFlow();
    if(!flow.experience||!flow.projectId||!flow.projectName||!flow.style){const errorTimer=window.setTimeout(()=>setError("填写信息不完整，请返回首页重新开始。"),0);return()=>{clearInterval(timer);clearTimeout(timeout);clearTimeout(errorTimer)}}
    track("generate_started"); fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(flow as GenerationPayload),signal:controller.signal}).then(async(r)=>{const data=await r.json().catch(()=>({message:"生成服务返回异常，请稍后重试。"}));if(!r.ok)throw new Error(data.message||"暂时没有生成成功，请稍后再试。");return data}).then((result)=>{saveFlow({result,selectedTitle:result.titles[0]});track("generate_success");router.replace("/result")}).catch((reason)=>{setError(reason instanceof Error&&reason.name!=="AbortError"?reason.message:"生成请求超时，请稍后重试。");track("generate_failed")}).finally(()=>{clearInterval(timer);clearTimeout(timeout)});
    return()=>{controller.abort();clearInterval(timer);clearTimeout(timeout)}},[retry,router]);
  return <MobileShell><div className="page no-dock"><div className="loader-wrap"><div><div className="loader"/><h1>正在根据你的真实体验生成内容……</h1><p className="sub" style={{marginTop:14}}>{tips[tip]}</p>{error&&<><div className="error">{error}</div><button type="button" className="btn btn-primary" onClick={()=>{setError("");setRetry(v=>v+1)}}>重新生成</button><button type="button" className="btn btn-ghost" style={{marginTop:10}} onClick={()=>router.push("/")}>返回首页</button></>}</div></div></div></MobileShell> }
