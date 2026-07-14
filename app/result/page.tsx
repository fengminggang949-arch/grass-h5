"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileShell, PageHeader } from "@/components/mobile-shell";
import { CopyButton } from "@/components/copy-button";
import { createClientId, loadFlow, saveFlow, saveHistory, type FlowState } from "@/lib/client-store";
import { track } from "@/lib/analytics";
import { defaultStore } from "@/lib/data";
import type { StoreConfig } from "@/types/store";
import type { NoteResult } from "@/types/note";

export default function ResultPage(){
  const router=useRouter(); const [flow,setFlow]=useState<FlowState>({}); const [ready,setReady]=useState(false);
  const [result,setResult]=useState<NoteResult|undefined>(undefined); const [title,setTitle]=useState(""); const [toast,setToast]=useState("");
  const [hashtags,setHashtags]=useState("");
  const [storeShortName,setStoreShortName]=useState(defaultStore.shortName);
  useEffect(()=>{const timer=window.setTimeout(()=>{const stored=loadFlow();setFlow(stored);setResult(stored.result);setTitle(stored.selectedTitle||stored.result?.titles[0]||"");setHashtags(stored.result?.hashtags.join(" ")||"");setReady(true);fetch(`/api/store?storeId=${encodeURIComponent(stored.storeId||defaultStore.id)}`,{cache:"no-store"}).then((response)=>response.json()).then((config:StoreConfig)=>setStoreShortName(config.store.shortName)).catch(()=>{})},0);return()=>window.clearTimeout(timer)},[]);
  useEffect(()=>{if(ready&&!result)router.replace("/")},[ready,result,router]);
  useEffect(()=>{if(!ready||!result)return; const timer=setTimeout(()=>saveFlow({result:{...result,hashtags:hashtags.split(/\s+/).filter(Boolean)},selectedTitle:title}),350); return()=>clearTimeout(timer)},[ready,result,title,hashtags]);
  const all=useMemo(()=>`${title}\n\n${result?.content||""}\n\n${hashtags}`,[title,result,hashtags]);
  function copied(event:"copy_title"|"copy_content"|"copy_all"){track(event);setToast("复制成功，可以打开小红书粘贴发布。");setTimeout(()=>setToast(""),2400)}
  function persist(){if(!result||!flow.experience||!flow.projectId||!flow.projectName||!flow.style||!flow.storeId||!flow.sessionId)return; const finalResult={...result,hashtags:hashtags.split(/\s+/).filter(Boolean)}; saveHistory({...flow,experience:flow.experience,projectId:flow.projectId,projectName:flow.projectName,style:flow.style,storeId:flow.storeId,sessionId:flow.sessionId,id:createClientId(),createdAt:new Date().toISOString(),selectedTitle:title,result:finalResult}); setToast("已保存到历史记录");setTimeout(()=>setToast(""),1800)}
  if(!ready||!result)return null;
  return <MobileShell><div className="page no-dock"><PageHeader backHref="/experience"/><div className="section-title"><div><h1 style={{margin:0}}>你的文案已生成</h1><p className="sub" style={{marginTop:6}}>可以直接修改，确认真实后再使用</p></div></div>
    <section className="result-section"><div className="result-label"><h3>选一个标题</h3><span className="badge">5个候选</span></div>{result.titles.map((item)=><button type="button" key={item} className={`title-choice ${title===item?"selected":""}`} aria-pressed={title===item} onClick={()=>{setTitle(item);track("title_selected")}}><span className="radio"/><span>{item}</span></button>)}<label className="field">编辑当前标题<input className="input" maxLength={50} value={title} onChange={(e)=>setTitle(e.target.value)}/></label><CopyButton text={title} onCopied={()=>copied("copy_title")}>复制标题</CopyButton></section>
    <section className="card result-section"><div className="result-label"><h3>正文</h3><span className="counter">{result.content.length}字</span></div><textarea className="textarea" style={{minHeight:420}} value={result.content} maxLength={1200} onChange={(e)=>{setResult({...result,content:e.target.value});track("content_edited")}}/><CopyButton text={result.content} className="btn btn-secondary" onCopied={()=>copied("copy_content")}>复制正文</CopyButton></section>
    <section className="card result-section"><div className="result-label"><h3>话题标签</h3><span className="counter">8—12个</span></div><textarea className="textarea hashtag-editor" value={hashtags} maxLength={260} onChange={(e)=>setHashtags(e.target.value)}/></section>
    <section className="card result-section"><h3>拍照建议</h3>{result.photoSuggestions.map((item,i)=><div className="suggestion" key={item}><span className="badge">{i+1}</span><span>{item}</span></div>)}</section>
    <div className="card result-section" style={{background:"#fffaf0"}}><strong>发布前请确认</strong><p className="sub" style={{marginTop:8}}>{result.complianceNotice}</p></div>
    <div className="actions section"><CopyButton text={all} className="btn btn-primary" onCopied={()=>copied("copy_all")}>复制全部内容</CopyButton><Link href="/publish" className="btn btn-secondary" style={{display:"grid",placeItems:"center"}}>查看发布教程</Link><button type="button" className="btn btn-ghost" onClick={persist}>保存到历史记录</button><button type="button" className="btn btn-ghost" onClick={()=>router.push("/generating")}>重新生成</button><Link href="/" className="btn btn-ghost" style={{display:"grid",placeItems:"center"}}>返回首页</Link></div>
    <p className="fine-print section">{storeShortName} · 内容仅供真实体验分享使用</p>{toast&&<div className="toast">{toast}</div>}
  </div></MobileShell>
}
