import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request:NextRequest){
  if(!isAdmin(request))return NextResponse.json({message:"请登录"},{status:401});
  const date=request.nextUrl.searchParams.get("date")||"";
  const query=(request.nextUrl.searchParams.get("q")||"").trim().toLowerCase().slice(0,50);
  const rows=await prisma.generation.findMany({where:{enabled:true,deletedAt:null},include:{store:{select:{name:true}},project:{select:{name:true}}},orderBy:{createdAt:"desc"},take:100});
  const records=rows.map((row)=>{let channelId="";try{channelId=String((JSON.parse(row.inputJson) as {channelId?:string}).channelId||"")}catch{}return{id:row.id,createdAt:row.createdAt.toISOString(),storeName:row.store.name,projectName:row.project.name,channelId,style:row.style,content:row.content}}).filter((row)=>{
    const dateMatches=!date||row.createdAt.slice(0,10)===date;
    const queryMatches=!query||[row.storeName,row.projectName,row.channelId,row.style,row.content].some((value)=>value.toLowerCase().includes(query));
    return dateMatches&&queryMatches;
  });
  return NextResponse.json({records},{headers:{"Cache-Control":"no-store"}});
}
