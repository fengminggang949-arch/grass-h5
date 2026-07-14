import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { defaultStore } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { getStoreConfig } from "@/lib/store-config";

const text = (value: unknown, max: number) => String(value ?? "").replace(/[<>]/g, "").trim().slice(0, max);
const list = (value: unknown, maxItems = 20) => Array.from(new Set(String(value ?? "").split(/[、,，\s]+/).map((item) => text(item.replace(/^#/, ""), 30)).filter(Boolean))).slice(0, maxItems);

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ message: "请登录" }, { status: 401 });
  return NextResponse.json(await getStoreConfig(defaultStore.id), { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ message: "请登录" }, { status: 401 });
  try {
    const body = await request.json();
    const store = body.store || {};
    const projectNames = list(body.projectNames, 20);
    if (!text(store.name, 60) || !text(store.shortName, 40) || !text(store.city, 30) || !text(store.district, 30) || !text(store.description, 300)) {
      return NextResponse.json({ message: "请完整填写门店名称、简称、城市、商圈和门店介绍。" }, { status: 400 });
    }
    if (!projectNames.length) return NextResponse.json({ message: "请至少保留一个服务项目。" }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      await tx.store.update({
        where: { id: defaultStore.id },
        data: {
          name: text(store.name, 60), shortName: text(store.shortName, 40), logo: text(store.logoText, 20),
          city: text(store.city, 30), district: text(store.district, 30), address: text(store.address, 120), description: text(store.description, 300),
          recommendedKeywords: JSON.stringify(list(store.recommendedKeywords)),
          forbiddenWords: JSON.stringify(list(store.forbiddenWords)),
          defaultHashtags: JSON.stringify(list(store.defaultHashtags)),
        },
      });
      const existing = await tx.project.findMany({ where: { storeId: defaultStore.id, deletedAt: null }, orderBy: { createdAt: "asc" } });
      for (let index = 0; index < existing.length; index += 1) {
        await tx.project.update({ where: { id: existing[index].id }, data: { name: projectNames[index] || existing[index].name, enabled: index < projectNames.length } });
      }
      for (let index = existing.length; index < projectNames.length; index += 1) {
        await tx.project.create({ data: { id: `custom-${Date.now().toString(36)}-${index}`, storeId: defaultStore.id, name: projectNames[index] } });
      }
    });
    return NextResponse.json(await getStoreConfig(defaultStore.id), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ message: "保存失败，请稍后重试。" }, { status: 500 });
  }
}
