-- 在 Supabase SQL Editor 中运行，插入初始数据
-- 默认管理员账号：admin / admin123

INSERT INTO "Store" ("id", "name", "shortName", "logo", "city", "district", "address", "description", "recommendedKeywords", "forbiddenWords", "defaultHashtags", "enabled", "createdAt", "updatedAt")
VALUES ('store001', '星圣贝口腔朝阳店', '星圣贝口腔', '星圣贝', '北京', '朝阳', '北京市朝阳区示例地址', '选择本次真实体验，30秒生成专属小红书分享文案。', '[]', '[]', '[]', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Project" ("id", "storeId", "name", "enabled", "createdAt", "updatedAt") VALUES
('cleaning', 'store001', '洗牙', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('fluoride', 'store001', '儿童涂氟', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('orthodontics', 'store001', '正畸咨询', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('implant', 'store001', '种植咨询', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('whitening', 'store001', '牙齿美白', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('filling', 'store001', '补牙', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('extraction', 'store001', '拔牙', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('checkup', 'store001', '口腔检查', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('other', 'store001', '其他', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Campaign" ("id", "storeId", "name", "enabled", "createdAt", "updatedAt")
VALUES ('summer001', 'store001', '夏日真实体验活动', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "AdminUser" ("id", "username", "passwordHash", "enabled", "createdAt", "updatedAt")
VALUES ('admin001', 'admin', '$2b$12$6VETmcU0G3OnCAXKhfn0OOezbLhM4UdqXx.MkDuVJ0muQ4JwdF1Na', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("username") DO NOTHING;
