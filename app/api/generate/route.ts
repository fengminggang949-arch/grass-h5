import { NextRequest, NextResponse } from "next/server";
import { AiGenerationError, generateNote } from "@/lib/ai-service";
import { allowRequest } from "@/lib/rate-limit";
import { getStoreConfig } from "@/lib/store-config";
import { prisma } from "@/lib/prisma";
import type { GenerationPayload } from "@/types/note";

export async function POST(request:NextRequest){
  const ip=request.headers.get("x-forwarded-for")?.split(",")[0]||"local"; if(!allowRequest(ip,6,60_000))return NextResponse.json({message:"操作太频繁，请稍后再试。"},{status:429});
  try{const payload=await request.json() as GenerationPayload;if(!payload?.experience?.confirmed||!payload.experience.feelings?.length||!payload.experience.concern||!payload.style||!payload.projectId||!payload.projectName)return NextResponse.json({message:"请完成3个问题并确认真实体验。"},{status:400});const config=await getStoreConfig(payload.storeId);const project=config.projects.find((item)=>item.id===payload.projectId);if(!project)return NextResponse.json({message:"当前体验项目已停用，请返回重新选择。"},{status:400});const normalizedPayload={...payload,storeId:config.store.id,projectName:project.name};const result=await generateNote(normalizedPayload,config.store);try{await prisma.generation.create({data:{storeId:config.store.id,projectId:project.id,sessionId:payload.sessionId,style:payload.style,inputJson:JSON.stringify(normalizedPayload),titlesJson:JSON.stringify(result.titles),content:result.content,hashtagsJson:JSON.stringify(result.hashtags)}})}catch{/* 记录失败不阻断用户生成主流程 */}return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}})}catch(error){if(error instanceof AiGenerationError)return NextResponse.json({message:error.message},{status:error.status});return NextResponse.json({message:"暂时无法生成，请稍后再试。"},{status:500})}
}
