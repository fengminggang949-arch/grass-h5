import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const passwordHash = await hash(process.env.ADMIN_PASSWORD || "admin123", 12);
  await prisma.store.upsert({
    where: { id: "store001" },
    update: {},
    create: { id: "store001", name: "星圣贝口腔朝阳店", shortName: "星圣贝口腔", logo: "星圣贝", city: "北京", district: "朝阳", address: "北京市朝阳区示例地址", description: "选择本次真实体验，30秒生成专属小红书分享文案。" },
  });
  for (const [id, name] of [["cleaning", "洗牙"], ["fluoride", "儿童涂氟"], ["orthodontics", "正畸咨询"], ["implant", "种植咨询"], ["whitening", "牙齿美白"], ["filling", "补牙"], ["extraction", "拔牙"], ["checkup", "口腔检查"], ["other", "其他"]]) {
    await prisma.project.upsert({ where: { id }, update: {}, create: { id, storeId: "store001", name } });
  }
  await prisma.campaign.upsert({ where: { id: "summer001" }, update: {}, create: { id: "summer001", storeId: "store001", name: "夏日真实体验活动" } });
  await prisma.adminUser.upsert({
    where: { username },
    update: { passwordHash, enabled: true, deletedAt: null },
    create: { username, passwordHash },
  });
}

main().finally(() => prisma.$disconnect());
