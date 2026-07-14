#!/bin/sh
set -e

echo "=== 等待数据库连接 ==="
for i in $(seq 1 30); do
  if node -e "
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    p.\$connect().then(() => { console.log('ok'); process.exit(0); }).catch(() => { process.exit(1); });
  " 2>/dev/null; then
    echo "数据库连接成功"
    break
  fi
  echo "等待数据库... ($i/30)"
  sleep 2
done

echo "=== 同步数据库表结构 ==="
node ./node_modules/prisma/build/index.js db push --skip-generate 2>&1

echo "=== 写入种子数据 ==="
node -e "
const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');
const prisma = new PrismaClient();
(async () => {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const pwdHash = await hash(process.env.ADMIN_PASSWORD || 'admin123', 12);

  await prisma.store.upsert({
    where: { id: 'store001' },
    update: {},
    create: { id:'store001', name:'星圣贝口腔朝阳店', shortName:'星圣贝口腔', logo:'星圣贝', city:'北京', district:'朝阳', address:'北京市朝阳区示例地址', description:'选择本次真实体验，30秒生成专属小红书分享文案。' }
  });

  for (const [id, name] of [['cleaning','洗牙'],['fluoride','儿童涂氟'],['orthodontics','正畸咨询'],['implant','种植咨询'],['whitening','牙齿美白'],['filling','补牙'],['extraction','拔牙'],['checkup','口腔检查'],['other','其他']]) {
    await prisma.project.upsert({ where: { id }, update: {}, create: { id, storeId:'store001', name } });
  }

  await prisma.campaign.upsert({
    where: { id: 'summer001' },
    update: {},
    create: { id:'summer001', storeId:'store001', name:'夏日真实体验活动' }
  });

  await prisma.adminUser.upsert({
    where: { username },
    update: { passwordHash:pwdHash, enabled:true, deletedAt:null },
    create: { username, passwordHash:pwdHash }
  });

  console.log('种子数据写入完成');
  await prisma.\$disconnect();
})();
"

echo "=== 启动服务 ==="
exec node server.js
