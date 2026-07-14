"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MobileShell, PageHeader } from "@/components/mobile-shell";
import { clearHistory, deleteHistory, loadHistory, saveFlow } from "@/lib/client-store";
import { CopyButton } from "@/components/copy-button";
import { track } from "@/lib/analytics";
import type { HistoryRecord } from "@/types/note";

export default function HistoryPage(){const [items,setItems]=useState<HistoryRecord[]>([]);const [toast,setToast]=useState("");useEffect(()=>{const timer=window.setTimeout(()=>setItems(loadHistory()),0);track("history_view");return()=>window.clearTimeout(timer)},[]);function remove(id:string){deleteHistory(id);setItems(loadHistory())}function clear(){if(confirm("确定清空最近10条历史记录吗？")){clearHistory();setItems([])}}
 return <MobileShell><div className="page no-dock"><PageHeader backHref="/"/><div className="section-title"><div><h1 style={{margin:0}}>我的历史记录</h1><p className="sub" style={{marginTop:6}}>仅保存在当前浏览器，最近10条</p></div>{items.length>0&&<button type="button" className="btn btn-danger" style={{width:"auto",minHeight:40}} onClick={clear}>清空</button>}</div>
 {items.length===0?<div className="card empty"><div style={{fontSize:36,marginBottom:12}}>◌</div><strong>还没有生成过内容</strong><p className="sub">完成一次生成后，可以手动保存到这里。</p><Link href="/" className="btn btn-primary" style={{display:"grid",placeItems:"center",marginTop:18}}>开始生成</Link></div>:items.map((item)=><article className="card history-card" key={item.id}><div className="history-meta"><span>{new Date(item.createdAt).toLocaleString("zh-CN")}</span><span>{item.style}</span></div><span className="badge">{item.projectName}</span><h3 style={{marginTop:12,lineHeight:1.5}}>{item.selectedTitle}</h3><p className="sub" style={{display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{item.result.content}</p><div className="split-actions" style={{marginTop:14}}><CopyButton text={`${item.selectedTitle}\n\n${item.result.content}\n\n${item.result.hashtags.join(" ")}`} onCopied={()=>setToast("复制成功")}>再次复制</CopyButton><button type="button" className="btn btn-ghost" onClick={()=>{saveFlow(item);location.href="/result"}}>查看内容</button></div><button type="button" className="btn btn-danger" style={{marginTop:10}} onClick={()=>remove(item.id)}>删除记录</button></article>)}{toast&&<div className="toast">{toast}</div>}</div></MobileShell>}
