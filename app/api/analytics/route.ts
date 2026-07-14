import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const allowed=new Set(["page_view","start_click","project_selected","experience_submitted","style_selected","generate_started","generate_success","generate_failed","title_selected","content_edited","copy_title","copy_content","copy_all","publish_guide_view","history_view"]);
const clean=(value:unknown)=>String(value||"").replace(/[^a-zA-Z0-9_-]/g,"").slice(0,80);
export async function POST(request:NextRequest){try{const body=await request.json();if(!allowed.has(body.eventName))return NextResponse.json({ok:false},{status:400});await prisma.analyticsEvent.create({data:{eventName:body.eventName,storeId:clean(body.storeId)||null,campaignId:clean(body.campaignId)||null,channelId:clean(body.channelId)||null,projectId:clean(body.projectId)||null,sessionId:clean(body.sessionId),ipHash:null}});return NextResponse.json({ok:true})}catch{return NextResponse.json({ok:true})}}
