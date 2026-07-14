import { readFile } from "node:fs/promises";
import path from "node:path";

const KNOWLEDGE_ROOT = path.join(process.cwd(), "knowledge");
const MANUAL_FILE = "快乐分享真实种草内容说明书_V1.0.md";

export class KnowledgeError extends Error {
  constructor(message: string, public status = 500) {
    super(message);
    this.name = "KnowledgeError";
  }
}

export interface KnowledgeBundle {
  projectKey: string;
  projectLabel: string;
  sourceFile: string;
  systemRuleIds: string[];
  projectRuleIds: string[];
  verificationRuleIds: string[];
  systemPrompt: string;
  projectPrompt: string;
  verificationPrompt: string;
}

interface ProjectKnowledge {
  key: string;
  label: string;
  promptFile: string;
  ids: string[];
  names: string[];
}

const PROJECTS: ProjectKnowledge[] = [
  { key: "wash", label: "洗牙", promptFile: "wash.md", ids: ["cleaning", "wash"], names: ["洗牙", "洁牙"] },
  { key: "ortho", label: "正畸", promptFile: "ortho.md", ids: ["orthodontics", "ortho"], names: ["正畸", "牙齿矫正", "牙套"] },
  { key: "implant", label: "种植牙", promptFile: "implant.md", ids: ["implant"], names: ["种植牙", "种牙", "种植"] },
  { key: "child", label: "儿童牙科", promptFile: "child.md", ids: ["fluoride", "child"], names: ["儿童涂氟", "儿童牙科", "儿童齿科"] },
  { key: "whitening", label: "牙齿美白", promptFile: "whitening.md", ids: ["whitening"], names: ["牙齿美白", "美白"] },
  { key: "filling", label: "补牙", promptFile: "filling.md", ids: ["filling"], names: ["补牙", "蛀牙"] },
  { key: "extraction", label: "拔牙", promptFile: "extraction.md", ids: ["extraction"], names: ["拔牙", "智齿"] },
  { key: "root-canal", label: "根管治疗", promptFile: "root-canal.md", ids: ["root-canal", "root_canal", "rootcanal"], names: ["根管治疗", "根管", "牙疼"] },
  { key: "checkup", label: "口腔检查", promptFile: "checkup.md", ids: ["checkup"], names: ["口腔检查"] },
];

export const SUPPORTED_KNOWLEDGE_PROJECTS = PROJECTS.map(({ key, label }) => ({ key, label }));

export function parseRuleDocument(source: string) {
  const headings = [...source.matchAll(/^\*\*规则(\d{3})[：:].+\*\*\s*$/gm)];
  const rules = new Map<string, string>();
  headings.forEach((heading, index) => {
    const id = heading[1];
    const start = heading.index ?? 0;
    const end = headings[index + 1]?.index ?? source.indexOf("## 附录A", start);
    rules.set(id, source.slice(start, end > start ? end : source.length).trim());
  });
  return rules;
}

export function expandRuleSpec(spec: string) {
  const ids: string[] = [];
  for (const token of spec.split(",").map((part) => part.trim()).filter(Boolean)) {
    const range = token.match(/^(\d{3})-(\d{3})$/);
    if (!range) {
      if (!/^\d{3}$/.test(token)) throw new KnowledgeError(`知识路由包含无效规则编号：${token}`);
      ids.push(token);
      continue;
    }
    const start = Number(range[1]);
    const end = Number(range[2]);
    if (end < start) throw new KnowledgeError(`知识路由包含无效规则范围：${token}`);
    for (let value = start; value <= end; value += 1) ids.push(String(value).padStart(3, "0"));
  }
  return [...new Set(ids)];
}

function ruleSpecFromManifest(source: string, file: string) {
  const match = source.match(/<!--\s*rules:\s*([\d,\-\s]+)\s*-->/i);
  if (!match) throw new KnowledgeError(`知识路由文件缺少规则编号：${file}`);
  return expandRuleSpec(match[1]);
}

function resolveProject(projectId: string, projectName: string) {
  const normalizedId = projectId.trim().toLowerCase();
  const project = PROJECTS.find((item) => item.ids.includes(normalizedId))
    ?? PROJECTS.find((item) => item.names.some((name) => projectName.includes(name)));
  if (!project) {
    throw new KnowledgeError("该口腔项目暂不在支持范围内，当前支持：洗牙、正畸、种植牙、儿童牙科、牙齿美白、补牙、拔牙、根管治疗、口腔检查", 400);
  }
  return project;
}

function selectRules(ruleMap: Map<string, string>, ids: string[], routeName: string) {
  return ids.map((id) => {
    const rule = ruleMap.get(id);
    if (!rule) throw new KnowledgeError(`${routeName}引用了说明书中不存在的规则：${id}`);
    return rule;
  }).join("\n\n");
}

export async function loadKnowledgeBundle(projectId: string, projectName: string): Promise<KnowledgeBundle> {
  const project = resolveProject(projectId, projectName);
  const sourceFile = path.join(KNOWLEDGE_ROOT, MANUAL_FILE);
  const routeFiles = [
    "PromptEngine/system_prompt.md",
    "keywords/rules.md",
    "blacklist/rules.md",
    "templates/rules.md",
  ];
  const [manual, ...routes] = await Promise.all([
    readFile(sourceFile, "utf8"),
    ...routeFiles.map((file) => readFile(path.join(KNOWLEDGE_ROOT, file), "utf8")),
  ]).catch((error) => {
    const detail = error instanceof Error ? error.message : "未知读取错误";
    throw new KnowledgeError(`无法读取 V1.0 知识库：${detail}`);
  });
  const projectRoutePath = path.join(KNOWLEDGE_ROOT, "PromptEngine", project.promptFile);
  const projectRoute = await readFile(projectRoutePath, "utf8").catch((error) => {
    const detail = error instanceof Error ? error.message : "未知读取错误";
    throw new KnowledgeError(`无法读取项目 Prompt 路由：${detail}`);
  });
  const ruleMap = parseRuleDocument(manual);
  if (ruleMap.size !== 99) throw new KnowledgeError(`V1.0 说明书规则数量异常：应为99条，实际解析到${ruleMap.size}条`);
  const systemRuleIds = [...new Set(routes.flatMap((route, index) => ruleSpecFromManifest(route, routeFiles[index])))];
  const projectRuleIds = ruleSpecFromManifest(projectRoute, project.promptFile);
  const verificationRuleIds = ["051", "059", "060", "061", "062", "063", "064", "089", "090", "091", "093"];
  return {
    projectKey: project.key,
    projectLabel: project.label,
    sourceFile,
    systemRuleIds,
    projectRuleIds,
    verificationRuleIds,
    systemPrompt: selectRules(ruleMap, systemRuleIds, "system_prompt"),
    projectPrompt: selectRules(ruleMap, projectRuleIds, project.promptFile),
    verificationPrompt: selectRules(ruleMap, verificationRuleIds, "真实性核验"),
  };
}
