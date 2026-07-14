import type { Project, Store } from "@/types/store";

export const projects: Project[] = [
  { id: "cleaning", name: "洗牙", icon: "✦" },
  { id: "fluoride", name: "儿童涂氟", icon: "☀" },
  { id: "orthodontics", name: "正畸咨询", icon: "◎" },
  { id: "implant", name: "种植咨询", icon: "◇" },
  { id: "whitening", name: "牙齿美白", icon: "✧" },
  { id: "filling", name: "补牙", icon: "+" },
  { id: "extraction", name: "拔牙", icon: "−" },
  { id: "checkup", name: "口腔检查", icon: "✓" },
  { id: "other", name: "其他", icon: "…" },
];

export const defaultStore: Store = {
  id: "store001",
  name: "星圣贝口腔朝阳店",
  shortName: "星圣贝口腔",
  logoText: "星圣贝",
  city: "北京",
  district: "朝阳",
  address: "北京市朝阳区示例地址",
  description: "选择本次真实体验，1分钟生成专属小红书分享文案。",
  projectIds: projects.map((project) => project.id),
  defaultHashtags: ["北京口腔", "朝阳本地生活", "真实体验"],
  recommendedKeywords: ["真实", "清楚", "耐心"],
  forbiddenWords: ["百分百", "保证治愈", "零风险"],
};

export function getProject(id?: string) {
  return projects.find((project) => project.id === id);
}
