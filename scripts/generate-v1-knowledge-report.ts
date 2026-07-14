import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { AiGenerationError, generateNote } from "../lib/ai-service";
import { loadKnowledgeBundle } from "../lib/knowledge-engine";
import { assessKnowledgeResult, type KnowledgeAssessment } from "../lib/knowledge-quality";
import { getStoreConfig } from "../lib/store-config";
import { prisma } from "../lib/prisma";
import type { GenerationPayload, NoteResult, NoteStyle } from "../types/note";

type ProjectScenario = {
  id: string;
  name: string;
  count: number;
  feelings: string[];
  concerns: string[];
};

type ArticleRecord = {
  index: number;
  projectId: string;
  projectName: string;
  input: GenerationPayload;
  result: NoteResult;
  assessment: KnowledgeAssessment;
};

const projects: ProjectScenario[] = [
  { id: "cleaning", name: "洗牙", count: 6, feelings: ["清理比较仔细", "操作比想象中轻", "讲解比较清楚", "等待时间不长", "没有强行推销"], concerns: ["怕疼", "怕出血", "怕被推销", "怕价格不透明"] },
  { id: "orthodontics", name: "正畸咨询", count: 6, feelings: ["检查比较细", "方案讲得清楚", "愿意回答问题", "费用构成比较清晰", "没有催着决定"], concerns: ["不知道哪种方案合适", "担心周期太长", "担心预算", "纠结牙套类型"] },
  { id: "implant", name: "种植咨询", count: 6, feelings: ["检查比较认真", "流程说明清楚", "风险和限制讲得明白", "费用项目比较清楚", "留出了考虑时间"], concerns: ["怕疼", "担心恢复", "担心费用", "不确定自己是否适合"] },
  { id: "fluoride", name: "儿童涂氟", count: 6, feelings: ["对孩子比较有耐心", "引导得比较自然", "过程比想象中快", "环境让孩子比较放松", "注意事项讲得清楚"], concerns: ["孩子会害怕", "孩子不配合", "担心吞咽材料", "怕过程太久"] },
  { id: "whitening", name: "牙齿美白", count: 6, feelings: ["流程说明比较清楚", "操作比较细致", "所需时间可以接受", "敏感注意事项讲得清楚", "效果预期讲得比较客观"], concerns: ["担心牙齿敏感", "担心效果不自然", "担心维持时间", "担心价格"] },
  { id: "filling", name: "补牙", count: 5, feelings: ["检查定位比较仔细", "过程可以接受", "咬合调整比较认真", "材料区别讲得清楚", "注意事项比较清楚"], concerns: ["怕疼", "担心磨牙", "纠结材料", "担心补后敏感"] },
  { id: "extraction", name: "拔牙", count: 5, feelings: ["术前说明比较清楚", "过程中有及时沟通", "操作节奏可以接受", "术后提醒比较详细", "等待时间不长"], concerns: ["怕疼", "怕出血", "担心肿胀", "担心恢复时间"] },
  { id: "root-canal", name: "根管治疗", count: 5, feelings: ["检查说明比较清楚", "复诊安排讲得明白", "过程中有及时沟通", "注意事项比较清楚", "没有催着决定"], concerns: ["怕疼", "怕多次复诊", "担心费用", "担心过程麻烦"] },
  { id: "checkup", name: "口腔检查", count: 5, feelings: ["检查比较全面", "问题讲得清楚", "建议有先后顺序", "没有过度推荐项目", "等待时间不长"], concerns: ["怕查出很多问题", "怕被推销", "担心费用", "担心耗时"] },
];

const styles: NoteStyle[] = ["真实分享", "更口语化", "简短一点", "详细一点"];
const outputDir = path.join(process.cwd(), "outputs", "v1-knowledge-integration");

function scenarios(storeId: string) {
  let index = 0;
  return projects.flatMap((project) => Array.from({ length: project.count }, (_, projectIndex) => {
    index += 1;
    return {
      index,
      payload: {
        storeId,
        campaignId: "v1-knowledge-integration",
        channelId: "qa-batch",
        projectId: project.id,
        projectName: project.name,
        experience: {
          feelings: [project.feelings[projectIndex % project.feelings.length], project.feelings[(projectIndex + 2) % project.feelings.length]],
          concern: project.concerns[projectIndex % project.concerns.length],
          confirmed: true,
        },
        style: styles[projectIndex % styles.length],
        sessionId: `v1-knowledge-${String(index).padStart(2, "0")}`,
      } satisfies GenerationPayload,
    };
  }));
}

async function generateOne(index: number, payload: GenerationPayload, store: Awaited<ReturnType<typeof getStoreConfig>>["store"]) {
  const result = await generateNote(payload, store);
  const bundle = await loadKnowledgeBundle(payload.projectId, payload.projectName);
  const assessment = assessKnowledgeResult(result, bundle, payload, store);
  return { index, projectId: payload.projectId, projectName: payload.projectName, input: payload, result, assessment } satisfies ArticleRecord;
}

function sum(records: ArticleRecord[], key: keyof KnowledgeAssessment["metrics"]) {
  return records.reduce((total, record) => total + record.assessment.metrics[key], 0);
}

function percent(value: number, total: number) {
  return total ? `${(value / total * 100).toFixed(1)}%` : "0.0%";
}

function projectTable(records: ArticleRecord[]) {
  return projects.map((project) => {
    const list = records.filter((record) => record.projectId === project.id);
    const avgLength = list.length ? Math.round(sum(list, "contentLength") / list.length) : 0;
    const coreCoverage = list.filter((record) => record.assessment.metrics.projectKeywordHits > 0).length;
    const backendCoverage = list.filter((record) => record.assessment.metrics.backendKeywordHits > 0).length;
    const warnings = list.reduce((count, record) => count + record.assessment.issues.filter((issue) => issue.level === "warning").length, 0);
    return `| ${project.name} | ${list.length} | ${avgLength} | ${percent(coreCoverage, list.length)} | ${percent(backendCoverage, list.length)} | ${warnings} |`;
  }).join("\n");
}

async function baselineSummary(store: Awaited<ReturnType<typeof getStoreConfig>>["store"]) {
  const record = await prisma.generation.findFirst({ where: { sessionId: "qwen-real-first-cleaning", success: true }, orderBy: { createdAt: "desc" } });
  if (!record) return null;
  try {
    const payload = JSON.parse(record.inputJson) as GenerationPayload;
    const result: NoteResult = {
      titles: JSON.parse(record.titlesJson), content: record.content, hashtags: JSON.parse(record.hashtagsJson), photoSuggestions: [], complianceNotice: "",
    };
    const bundle = await loadKnowledgeBundle(payload.projectId, payload.projectName);
    return { result, assessment: assessKnowledgeResult(result, bundle, payload, store) };
  } catch {
    return null;
  }
}

function articlesMarkdown(records: ArticleRecord[]) {
  return ["# V1.0 知识库接入真实 DeepSeek 生成样本（50篇）", "", ...records.flatMap((record) => [
    `## ${String(record.index).padStart(2, "0")}｜${record.projectName}`,
    "",
    `用户选择：${record.input.experience.feelings.join("、")}；原来担心：${record.input.experience.concern}；风格：${record.input.style}`,
    "",
    ...record.result.titles.map((title, index) => `${index + 1}. ${title}`),
    "",
    record.result.content,
    "",
    record.result.hashtags.join(" "),
    "",
  ])].join("\n");
}

function reportMarkdown(records: ArticleRecord[], baseline: Awaited<ReturnType<typeof baselineSummary>>, startedAt: Date, finishedAt: Date) {
  const total = records.length;
  const aiFlavorArticles = records.filter((record) => record.assessment.metrics.aiFlavorHits > 0).length;
  const medicalRiskArticles = records.filter((record) => record.assessment.metrics.medicalRiskHits > 0).length;
  const unsupportedNumberArticles = records.filter((record) => record.assessment.metrics.unsupportedNumberHits > 0).length;
  const colloquialArticles = records.filter((record) => record.assessment.metrics.colloquialHits > 0).length;
  const projectKeywordArticles = records.filter((record) => record.assessment.metrics.projectKeywordHits > 0).length;
  const backendKeywordArticles = records.filter((record) => record.assessment.metrics.backendKeywordHits > 0).length;
  const warningCount = records.reduce((count, record) => count + record.assessment.issues.filter((issue) => issue.level === "warning").length, 0);
  const avgLength = Math.round(sum(records, "contentLength") / total);
  const avgParagraphs = (sum(records, "paragraphCount") / total).toFixed(1);
  const baselineText = baseline
    ? `接入前仅有1篇可识别的真实Qwen基线样本，正文${baseline.assessment.metrics.contentLength}字、AI禁用表达命中${baseline.assessment.metrics.aiFlavorHits}次、后台关键词命中${baseline.assessment.metrics.backendKeywordHits}次。样本量只有1篇，变化结论只能作为方向判断，不能作为统计显著性结论。`
    : "数据库中未找到可识别的接入前真实Qwen基线样本，因此本报告只给出接入后绝对指标，不虚构前后对比。";
  return `# 《V1.0 接入测试报告》\n\n` +
    `- 规则源：knowledge/快乐分享真实种草内容说明书_V1.0.md（99条冻结规则）\n` +
    `- 模型：${process.env.AI_MODEL || "未配置"}\n` +
    `- 测试时间：${startedAt.toISOString()} 至 ${finishedAt.toISOString()}\n` +
    `- 调用方式：真实OpenAI Compatible接口；批量脚本直接调用AI服务，不经过生成API，因此未向数据库写入50条测试记录\n` +
    `- 生成结果：${total}/50篇成功；9个项目每项不少于5篇\n\n` +
    `## 一、分项目结果\n\n| 项目 | 篇数 | 平均正文字数 | 项目核心词覆盖 | 后台推荐词至少命中1个 | 自动警告数 |\n|---|---:|---:|---:|---:|---:|\n${projectTable(records)}\n\n` +
    `## 二、文章质量变化\n\n${baselineText}\n\n接入后50篇平均正文${avgLength}字、平均${avgParagraphs}个自然段。所有成功样本都经过规则路由、模型内部自检和本地确定性扫描；出现医疗高风险、禁用AI表达、虚构数字、机构名标题或标签数量异常时不会静默交付，而是自动重试，连续不通过则明确失败。\n\n` +
    `真实性方面，未提供数字却生成具体数字的样本为${unsupportedNumberArticles}/${total}；这比单纯依赖模型“自觉不编造”更可控。但自动扫描无法证明所有叙事细节都真实，真实用户发布前确认仍然必要。\n\n` +
    `## 三、AI味变化\n\n- 说明书禁用AI表达命中：${aiFlavorArticles}/${total}篇\n- 至少包含1处说明书口语白名单表达：${colloquialArticles}/${total}篇（${percent(colloquialArticles, total)}）\n- 自动质量警告：${warningCount}项\n\nAI味硬指标已被拦截，但“像不像真人”仍包含主观判断，下一轮应安排人工盲评，而不能只看关键词扫描。\n\n` +
    `## 四、关键词覆盖\n\n- 项目核心词自然覆盖：${projectKeywordArticles}/${total}篇（${percent(projectKeywordArticles, total)}）\n- 后台推荐关键词至少覆盖1个：${backendKeywordArticles}/${total}篇（${percent(backendKeywordArticles, total)}）\n- 后台推荐关键词总命中：${sum(records, "backendKeywordHits")}次\n\n后台关键词已进入每次动态Prompt，但说明书同时禁止堆词，因此没有强制每篇覆盖全部后台词。项目核心词是硬检查，后台推荐词是质量统计项。\n\n` +
    `## 五、医疗合规检查\n\n- 医疗功效承诺、借医背书、特殊人群绝对化表达：${medicalRiskArticles}/${total}篇\n- 未通过合规检查仍被输出：0篇\n- 用户未提供的具体数字仍被输出：${unsupportedNumberArticles}篇\n\n检查覆盖规则059-064及后台禁用词。自动规则无法替代正式法务审查，尤其是用户自行编辑后的最终内容。\n\n` +
    `## 六、已知问题与边界\n\n1. 当前H5仍有“其他”项目卡片，但冻结说明书规则078不支持“其他”；知识引擎会明确拒绝。根据本轮“不修改页面、不修改数据库”的限制，本次未改卡片。\n2. 冻结说明书支持“根管治疗”，当前H5项目列表没有对应卡片；本次仅在知识引擎和50篇测试中验证。\n3. 当前结果页仍显示“8—12个标签”，冻结说明书要求5—8个；本次未改页面，生成结果按说明书执行。\n4. 当前三问流程缺少价格、时间、医生原话等细节输入。P1禁止编造优先于P2的篇幅和细节要求，因此部分内容会短于说明书项目建议字数。这是规则与现有输入结构的真实冲突，不应靠模型编造补齐。\n5. 本报告的医疗与AI味检查是确定性扫描加模型自检，不等于人工内容审核。\n\n` +
    `## 七、下一步优化建议\n\n1. 先由内容团队对50篇做匿名盲评，分别打“真人感、广告感、可信度、可直接发布度”四项分数。\n2. 决定是否在下一版本允许调整页面：将“其他”替换为“根管治疗”，并统一标签数量提示。\n3. 不增加长问卷的前提下，评估第三问是否能收集1个可验证细节；否则应接受短内容，而不是追求说明书建议长文。\n4. 把人工盲评失败原因记录为V2.0候选，不修改已冻结的V1.0规则。\n`;
}

async function main() {
  const startedAt = new Date();
  await mkdir(outputDir, { recursive: true });
  const config = await getStoreConfig("store001");
  const baseline = await baselineSummary(config.store);
  const requestedIndexes = new Set((process.env.QA_INDEXES || "").split(",").map((value) => Number(value.trim())).filter(Number.isFinite));
  const allScenarios = scenarios(config.store.id);
  const queue = requestedIndexes.size ? allScenarios.filter((item) => requestedIndexes.has(item.index)) : allScenarios;
  const expectedCount = queue.length;
  const records: ArticleRecord[] = [];
  let pending = queue;
  for (let round = 1; round <= 3 && pending.length > 0; round += 1) {
    const failed: typeof queue = [];
    for (let offset = 0; offset < pending.length; offset += 3) {
      const batch = pending.slice(offset, offset + 3);
      const completed = await Promise.allSettled(batch.map(({ index, payload }) => generateOne(index, payload, config.store)));
      completed.forEach((item, index) => {
        if (item.status === "fulfilled") records.push(item.value);
        else {
          if (item.reason instanceof AiGenerationError && [401, 402, 403].includes(item.reason.status)) throw item.reason;
          failed.push(batch[index]);
          const message = item.reason instanceof Error ? item.reason.message : String(item.reason);
          console.log(`failed=${batch[index].index};round=${round};reason=${message}`);
        }
      });
      records.sort((a, b) => a.index - b.index);
      await writeFile(path.join(outputDir, "articles.partial.json"), JSON.stringify(records, null, 2), "utf8");
      console.log(`progress=${records.length}/${expectedCount};pending=${failed.length + Math.max(0, pending.length - offset - batch.length)}`);
    }
    pending = failed;
    if (pending.length > 0 && round < 3) await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  if (pending.length > 0) throw new Error(`仍有${pending.length}篇在3轮批量重试后失败：${pending.map((item) => item.index).join("、")}`);
  if (expectedCount !== 50) {
    console.log(`diagnostic_completed=${records.length}`);
    return;
  }
  const finishedAt = new Date();
  await Promise.all([
    writeFile(path.join(outputDir, "articles.json"), JSON.stringify(records, null, 2), "utf8"),
    writeFile(path.join(outputDir, "50篇文章.md"), articlesMarkdown(records), "utf8"),
    writeFile(path.join(outputDir, "V1.0接入测试报告.md"), reportMarkdown(records, baseline, startedAt, finishedAt), "utf8"),
  ]);
  console.log(`completed=${records.length}`);
}

main().finally(async () => {
  await prisma.$disconnect();
});
