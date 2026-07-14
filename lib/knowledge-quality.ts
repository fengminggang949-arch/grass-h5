import type { KnowledgeBundle } from "@/lib/knowledge-engine";
import type { GenerationPayload, NoteResult } from "@/types/note";
import type { Store } from "@/types/store";

export type KnowledgeIssueLevel = "fatal" | "retry" | "warning";

export interface KnowledgeIssue {
  code: string;
  level: KnowledgeIssueLevel;
  message: string;
}

export interface KnowledgeAssessment {
  issues: KnowledgeIssue[];
  blockingIssues: KnowledgeIssue[];
  metrics: {
    contentLength: number;
    paragraphCount: number;
    hashtagCount: number;
    colloquialHits: number;
    projectKeywordHits: number;
    backendKeywordHits: number;
    unsupportedNumberHits: number;
    aiFlavorHits: number;
    medicalRiskHits: number;
  };
}

const AI_FLAVOR_TERMS = [
  "在这个时代", "近年来", "当今社会", "众所周知", "值得一提的是", "一言以蔽之", "总而言之", "综上所述",
  "让我们一起", "快来试试吧", "相信你也会爱上", "赶快行动起来吧", "心动不如行动", "闭眼入", "绝绝子", "yyds",
  "封神", "天花板", "赋能", "打造", "深耕", "引领", "助力", "重塑", "驱动", "构建", "数据显示", "研究表明", "统计表明",
];
const MEDICAL_RISK_PATTERNS = [
  /保证(?:治好|治愈|有效)/gi, /100%有效/gi, /治愈率\s*\d+/gi, /根治(?:口臭|牙龈出血)/gi, /绝对安全/gi, /零风险/gi,
  /牙医(?:推荐|力荐)/gi, /医生力荐/gi, /专家(?:认证|推荐)/gi, /临床验证/gi, /科学研究表明/gi, /实验证明/gi,
  /儿童专用/gi, /孕妇可用/gi, /老人推荐/gi,
];
const AI_FLAVOR_PATTERNS = [/随着[^。\n]{0,24}(?:不断)?发展/gi, /在消费升级的大背景下/gi, /作为一个口腔护理爱好者/gi];
const COLLOQUIAL_TERMS = ["说真的", "其实", "说实话", "没想到", "谁懂啊", "然后", "真的", "对了", "还有就是", "哈哈", "就是说", "不吹不黑", "有一说一"];
const CORE_KEYWORDS: Record<string, string[]> = {
  wash: ["洗牙"], ortho: ["正畸", "牙齿矫正", "牙套"], implant: ["种植牙", "种牙"], child: ["儿童牙科", "儿童齿科", "宝宝看牙", "孩子看牙", "涂氟"],
  whitening: ["牙齿美白", "牙黄", "黄牙"], filling: ["补牙", "蛀牙"], extraction: ["拔牙", "智齿"], "root-canal": ["根管治疗", "牙疼"], checkup: ["口腔检查"],
};

function countTerms(text: string, terms: string[]) {
  return terms.reduce((count, term) => count + (text.toLowerCase().split(term.toLowerCase()).length - 1), 0);
}

function numberTokens(text: string) {
  return text.match(/\d+(?:\.\d+)?/g) ?? [];
}

function push(issues: KnowledgeIssue[], code: string, level: KnowledgeIssueLevel, message: string) {
  issues.push({ code, level, message });
}

export function assessKnowledgeResult(result: NoteResult, bundle: KnowledgeBundle, payload: GenerationPayload, store: Store): KnowledgeAssessment {
  const issues: KnowledgeIssue[] = [];
  const titles = result.titles.join("\n");
  const allText = `${titles}\n${result.content}\n${result.hashtags.join(" ")}`;
  const userFacts = [payload.projectName, ...payload.experience.feelings, payload.experience.concern, payload.style].join("\n");
  const allowedFacts = `${userFacts}\n${[store.name, store.shortName, store.city, store.district, store.address, store.description, ...store.recommendedKeywords, ...store.defaultHashtags].join("\n")}`;
  const aiFlavorHits = countTerms(allText, AI_FLAVOR_TERMS) + AI_FLAVOR_PATTERNS.reduce((count, pattern) => count + (allText.match(pattern)?.length ?? 0), 0);
  const medicalRiskHits = MEDICAL_RISK_PATTERNS.reduce((count, pattern) => count + (allText.match(pattern)?.length ?? 0), 0);
  const configuredForbiddenHits = countTerms(allText, store.forbiddenWords.filter(Boolean));
  const projectKeywords = CORE_KEYWORDS[bundle.projectKey] ?? [bundle.projectLabel];
  const projectKeywordHits = countTerms(allText, projectKeywords);
  const backendKeywordHits = countTerms(allText, store.recommendedKeywords.filter(Boolean));
  const unsupportedNumbers = numberTokens(allText).filter((token) => !allowedFacts.includes(token));
  const paragraphs = result.content.split(/\n\s*\n|\n/).map((part) => part.trim()).filter(Boolean);
  const colloquialHits = countTerms(result.content, COLLOQUIAL_TERMS);
  const contentLength = Array.from(result.content).length;

  if (result.titles.length !== 5) push(issues, "FORMAT-TITLES", "retry", "标题候选必须正好5条");
  result.titles.forEach((title, index) => {
    const length = Array.from(title.replace(/\s/g, "")).length;
    if (length < 10 || length > 30) push(issues, `R012-TITLE-${index + 1}`, "warning", `第${index + 1}条标题长度不在10至30字范围`);
    if (title.includes(store.name) || title.includes(store.shortName)) push(issues, `R011-TITLE-STORE-${index + 1}`, "retry", `第${index + 1}条标题包含机构名称`);
  });
  if (result.hashtags.length < 5 || result.hashtags.length > 8) push(issues, "R057-HASHTAGS", "retry", "标签数量必须为5至8个");
  if (contentLength < 400 || contentLength > 550) push(issues, "CONTENT-LENGTH", "retry", "正文应控制在400至500字左右");
  if (medicalRiskHits > 0) push(issues, "R059-061-MEDICAL", "fatal", "检测到医疗功效、借医背书或特殊人群绝对化表达");
  if (aiFlavorHits > 0) push(issues, "R039-040-R065-073-AI", "retry", "检测到说明书禁用的AI味表达");
  if (configuredForbiddenHits > 0) push(issues, "BACKEND-BLACKLIST", "retry", "检测到后台配置的禁用词");
  if (/首先[\s\S]{0,120}其次|第一点|第二点|步骤一|步骤二/.test(result.content)) push(issues, "R021-SEQUENCE", "retry", "检测到机械分点结构");
  if (/不仅[\s\S]{0,40}而且|既是[\s\S]{0,40}也是|无论是[\s\S]{0,40}还是/.test(result.content)) push(issues, "R068-PARALLEL", "retry", "检测到排比或对偶句式");
  if (unsupportedNumbers.length > 0) push(issues, "R051-NUMBERS", "retry", `检测到用户和门店资料未提供的数字：${[...new Set(unsupportedNumbers)].join("、")}`);
  if (/医生[^\n。]{0,30}[：:]?[“\"'][^”\"']+[”\"']/.test(result.content) && !/[“\"'][^”\"']+[”\"']/.test(userFacts)) {
    push(issues, "R051-R060-DOCTOR-QUOTE", "retry", "检测到用户未提供的医生直接引语");
  }
  if (projectKeywordHits === 0) push(issues, "R053-R058-KEYWORD", "retry", "标题和正文未自然覆盖项目核心词");
  if (colloquialHits === 0) push(issues, "R036-COLLOQUIAL", "warning", "未检测到说明书白名单中的口语表达");
  if (paragraphs.length < 3) push(issues, "R017-PARAGRAPHS", "warning", "正文自然段少于3段");
  const cityBodyHits = store.city ? countTerms(result.content, [store.city]) : 0;
  const districtBodyHits = store.district ? countTerms(result.content, [store.district]) : 0;
  const regionOverused = result.titles.some((title) => {
    const cityTotal = cityBodyHits + (store.city ? countTerms(title, [store.city]) : 0);
    const districtTotal = districtBodyHits + (store.district ? countTerms(title, [store.district]) : 0);
    return cityTotal > 1 || districtTotal > 1;
  });
  if (regionOverused) push(issues, "R056-REGION", "warning", "部分候选标题与正文组合后地域词超过1次，属于关键词优化提醒，不阻断内容输出");

  return {
    issues,
    blockingIssues: issues.filter((issue) => issue.level !== "warning"),
    metrics: {
      contentLength,
      paragraphCount: paragraphs.length,
      hashtagCount: result.hashtags.length,
      colloquialHits,
      projectKeywordHits,
      backendKeywordHits,
      unsupportedNumberHits: unsupportedNumbers.length,
      aiFlavorHits,
      medicalRiskHits,
    },
  };
}
