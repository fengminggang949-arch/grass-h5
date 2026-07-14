import { KnowledgeError, loadKnowledgeBundle, type KnowledgeBundle } from "@/lib/knowledge-engine";
import { assessKnowledgeResult } from "@/lib/knowledge-quality";
import { defaultStore } from "@/lib/data";
import { getProjectKeywords } from "@/lib/keyword-database";
import { generateStyleConfig, styleConfigToPrompt, getStyleConfigTypes, type StyleConfig } from "@/lib/style-diversifier";
import type { GenerationPayload, NoteResult } from "@/types/note";
import type { Store } from "@/types/store";

export class AiGenerationError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
    this.name = "AiGenerationError";
  }
}

function safe(value: unknown, max = 100) {
  return String(value ?? "").replace(/[<>]/g, "").replace(/(system|assistant|developer)\s*:/gi, "").slice(0, max);
}

function normalize(payload: GenerationPayload): GenerationPayload {
  return {
    ...payload,
    storeId: safe(payload.storeId, 50), campaignId: safe(payload.campaignId, 50), channelId: safe(payload.channelId, 50),
    projectId: safe(payload.projectId, 50), projectName: safe(payload.projectName, 30), sessionId: safe(payload.sessionId, 80),
    experience: {
      feelings: payload.experience.feelings.slice(0, 2).map((value) => safe(value, 80)),
      concern: safe(payload.experience.concern, 80),
      confirmed: Boolean(payload.experience.confirmed),
    },
  };
}

function cleanText(value: unknown, max: number) {
  return String(value ?? "").replace(/[<>]/g, "").trim().slice(0, max);
}

function normalizeHashtag(value: unknown) {
  const hashtag = cleanText(value, 30).replace(/^#+/, "");
  return hashtag ? `#${hashtag}` : "";
}

function normalizeCandidate(value: unknown): NoteResult {
  const result = value as Partial<NoteResult> | null;
  if (!result || !Array.isArray(result.titles) || typeof result.content !== "string" || !Array.isArray(result.hashtags) || !Array.isArray(result.photoSuggestions)) {
    throw new AiGenerationError("真实AI返回的内容格式不正确，请稍后重试。");
  }
  return {
    titles: result.titles.slice(0, 5).map((item) => cleanText(item, 60)),
    content: cleanText(result.content, 3000),
    hashtags: result.hashtags.slice(0, 10).map(normalizeHashtag).filter(Boolean),
    photoSuggestions: result.photoSuggestions.slice(0, 3).map((item) => cleanText(item, 120)),
    complianceNotice: "内容由AI辅助生成，请确认全部内容符合本人真实体验后再使用。",
  };
}

function cleanProviderMessage(value: unknown) {
  return String(value ?? "").replace(/[<>\r\n]/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
}

async function providerError(response: Response) {
  let detail = "";
  try {
    const body = await response.json() as { error?: { code?: string; message?: string }; code?: string; message?: string };
    const code = cleanProviderMessage(body.error?.code || body.code);
    const message = cleanProviderMessage(body.error?.message || body.message);
    detail = [code, message].filter(Boolean).join(" · ");
  } catch {
    detail = cleanProviderMessage(response.statusText);
  }
  const reason = response.status === 401
    ? "API Key无效"
    : response.status === 402
      ? "DeepSeek账户余额不足"
    : response.status === 403
      ? "当前API Key没有模型调用权限或账户状态受限"
      : response.status === 404
        ? "AI_BASE_URL或AI_MODEL配置不正确"
        : response.status === 429
          ? "模型调用过于频繁、额度不足或触发限流"
          : response.status >= 500
            ? "DeepSeek服务暂时异常"
            : "DeepSeek拒绝了本次请求";
  return `真实AI调用失败（${response.status}）：${reason}${detail ? `；${detail}` : ""}`;
}

function transportContract() {
  return [
    "以下只规定H5数据交换格式，不是新的内容创作规则。",
    "只输出一个JSON对象，不添加Markdown代码块或解释。",
    "JSON字段：titles为5条候选标题；content为正文；hashtags为5至8条标签；photoSuggestions为3条基于已提供事实的配图建议。",
    "正文以400至500个汉字为目标，保持4至6个自然段；若说明书中的项目模板要求更长，以本产品本轮400至500字目标为准。",
    "titles、content、hashtags的所有内容规则只以本消息中的《快乐分享真实种草内容说明书 V1.0》原文为准。",
  ].join("\n");
}

function conflictResolution(payload: GenerationPayload) {
  const facts = [payload.projectName, ...payload.experience.feelings, payload.experience.concern, payload.style].join("\n");
  const resolutions = [
    "按照规则089-093执行优先级：P0安全合规 > P1真实性 > P2质量优化。",
    "这是依据规则089-093得到的强制解析结果，不是新增创作规则。只限制高危、可核验且可能造成医疗或个人权益风险的虚构内容；普通到店场景、环境、沟通方式、感官、过程动作、口语表达和情绪转折可以依据项目常识与用户选择自然扩写。",
  ];
  if (!/\d/.test(facts)) resolutions.push("用户未提供具体数字：不得编造精确价格、具体日期、年龄、疗程次数或诊断数值；可以使用“大概一会儿、没等太久、前后有一阵”等非精确时间感受来增强叙事。");
  if (!/[“\"'][^”\"']+[”\"']/.test(facts)) resolutions.push("用户未提供医生原话：不得编造带引号的医生原话、诊断结论或治疗保证；可以描写讲解清楚、沟通耐心、操作前有提醒等普通互动。");
  return resolutions.join("\n");
}

function factWhitelist(payload: GenerationPayload, store: Store) {
  return {
    project: payload.projectName,
    confirmedExperience: payload.experience.confirmed ? `用户已确认本人真实体验了${payload.projectName}` : "用户尚未确认真实体验",
    selectedFeelings: payload.experience.feelings,
    selectedConcern: payload.experience.concern,
    selectedStyle: payload.style,
    store: { name: store.name, shortName: store.shortName, city: store.city, district: store.district, address: store.address, description: store.description },
    backendKeywords: { recommendedKeywords: store.recommendedKeywords, forbiddenWords: store.forbiddenWords, defaultHashtags: store.defaultHashtags },
  };
}

function highRiskVerificationPrompt(prompt: string) {
  const rules = new Set(["051", "059", "060", "061", "062", "063", "064", "089", "090", "091", "093"]);
  return prompt
    .split(/(?=^\*\*规则\d{3}[：:])/gm)
    .filter((section) => {
      const id = section.match(/^\*\*规则(\d{3})[：:]/)?.[1];
      return !id || rules.has(id);
    })
    .join("\n\n");
}

function creativeExpansionPolicy(payload: GenerationPayload) {
  return [
    "【内容展开方式｜执行说明书的项目结构与真人表达规则】",
    `围绕“${payload.projectName}”、用户顾虑和已选感受充分展开，正文目标400至500字。`,
    "允许自然补充低风险叙事细节，包括到店前后的心理、环境观察、普通流程动作、沟通方式、声音或触感、停顿和不完美的小插曲，让内容像一次真实回忆，而不是把用户选项重复改写。",
    "细节使用口语化、近似和个人感受表达，不要把项目常识写成诊断或保证。禁止编造医生或患者姓名、带引号的医生原话、精确价格、具体日期、检查诊断结果、疗效承诺和其他患者经历。",
    "优先写出画面、过程和情绪变化，减少总结、口号和泛泛评价。",
  ].join("\n");
}

function buildMessages(bundle: KnowledgeBundle, payload: GenerationPayload, store: Store, correction = "", previousCandidate?: NoteResult, styleConfig?: StyleConfig) {
  const keywordData = getProjectKeywords(bundle.projectKey);
  const system = [
    "【① system_prompt｜唯一规则来源：快乐分享真实种草内容说明书 V1.0】",
    bundle.systemPrompt,
    "【技术输出契约】",
    transportContract(),
    "【冻结说明书规则冲突解析结果｜依据规则089-093，效力高于被覆盖的P2要求】",
    conflictResolution(payload),
  ].join("\n\n");
  const user = [
    `【② 项目 Prompt｜${bundle.projectLabel}】\n${bundle.projectPrompt}`,
    `【③ 门店资料｜后台当前值】\n${JSON.stringify({ name: store.name, shortName: store.shortName, city: store.city, district: store.district, address: store.address, description: store.description })}`,
    `【④ 后台关键词｜后台当前值】\n${JSON.stringify({ recommendedKeywords: store.recommendedKeywords, forbiddenWords: store.forbiddenWords, defaultHashtags: store.defaultHashtags })}`,
    keywordData.searchKeywords.length > 0
      ? `【⑤ 搜索关键词嵌词策略｜必须执行】\n以下是真实用户在搜「${bundle.projectLabel}」时最常使用的搜索词。你的文章必须让至少 2-3 个搜索词**自然融入标题或正文**，不能只是硬塞：\n- 搜索高频词：${keywordData.searchKeywords.slice(0, 6).join("、")}\n- 长尾场景词：${keywordData.longTailKeywords.slice(0, 4).join("、")}\n嵌入方式：用真实体验场景带动关键词出现，例如写"洗牙疼不疼"不应该直接写这个问句，而是写成"躺下那一刻我还在想洗牙到底疼不疼"这类自然叙事。`
      : "",
    styleConfig ? styleConfigToPrompt(styleConfig) : "",
    `【⑥ 用户输入｜只可作为事实使用】\n${JSON.stringify(payload)}`,
    `【已确认资料与高危事实边界】\n${JSON.stringify(factWhitelist(payload, store))}`,
    creativeExpansionPolicy(payload),
    previousCandidate ? `【上一版候选｜针对问题修订】\n${JSON.stringify(previousCandidate)}\n保留已经自然、有画面且合规的部分，只修改下方未通过项；可以继续使用低风险场景和过程细节，但不得新增医生或患者身份、精确价格日期、诊断结论或医疗效果保证。` : "",
    correction ? `【上一次自检未通过项｜按对应说明书规则修正】\n${correction}` : "",
  ].filter(Boolean).join("\n\n");
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

async function requestModel(messages: Array<{ role: string; content: string }>, temperature = 0.75, maxTokens = 4096) {
  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;
  if (!baseUrl || !apiKey || !model) {
    const missing = [!baseUrl && "AI_BASE_URL", !apiKey && "AI_API_KEY", !model && "AI_MODEL"].filter(Boolean).join("、");
    throw new AiGenerationError(`真实AI配置不完整，缺少：${missing}。`, 503);
  }
  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature,
        thinking: { type: "disabled" },
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages,
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) throw new AiGenerationError("真实AI响应超时，请稍后重试。", 504);
    const detail = error instanceof Error ? cleanProviderMessage(error.message) : "未知网络错误";
    throw new AiGenerationError(`无法连接DeepSeek：${detail}。请检查AI_BASE_URL和网络连接。`, 502);
  }
  if (!response.ok) throw new AiGenerationError(await providerError(response), [401, 402, 403, 429].includes(response.status) ? response.status : 502);
  try {
    const json = await response.json() as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("empty");
    return content.replace(/^```json\s*|\s*```$/g, "");
  } catch (error) {
    if (error instanceof AiGenerationError) throw error;
    throw new AiGenerationError("真实AI返回的内容无法解析，请稍后重试。", 502);
  }
}

async function callModel(messages: Array<{ role: string; content: string }>) {
  try {
    return normalizeCandidate(JSON.parse(await requestModel(messages, 0.9)));
  } catch (error) {
    if (error instanceof AiGenerationError) throw error;
    throw new AiGenerationError("真实AI返回的内容无法解析，请稍后重试。", 502);
  }
}

async function verifyHighRiskSafety(bundle: KnowledgeBundle, candidate: NoteResult, payload: GenerationPayload, store: Store) {
  const response = await requestModel([
    {
      role: "system",
      content: [
        "【高危真实性与医疗合规核验规则来源：快乐分享真实种草内容说明书 V1.0】",
        highRiskVerificationPrompt(bundle.verificationPrompt),
        "【技术输出契约】只输出JSON对象：passed为布尔值；violations为数组，每项包含rule、claim和reason。不得改写文章。",
      ].join("\n\n"),
    },
    {
      role: "user",
      content: [
        `【用户与门店已提供资料】\n${JSON.stringify(factWhitelist(payload, store))}`,
        `【待核验候选】\n${JSON.stringify({ titles: candidate.titles, content: candidate.content, hashtags: candidate.hashtags })}`,
        "只检查高危内容：编造医生或患者身份、编造带引号的医生原话、未提供的精确价格或具体日期、检查诊断结论、治疗效果保证、借医背书、特殊人群绝对化宣称、其他患者经历。普通场景、环境、沟通方式、项目常识、近似时间、感官描写、操作过程、个人情绪和口语化细节不属于违规，不要因为这些内容没有逐字出现在用户选择中而拦截。",
      ].join("\n\n"),
    },
  ], 0, 900);
  try {
    const parsed = JSON.parse(response) as { passed?: boolean; violations?: Array<{ rule?: string; claim?: string }> };
    if (typeof parsed.passed !== "boolean" || !Array.isArray(parsed.violations)) throw new Error("invalid verifier response");
    const violations = parsed.violations.slice(0, 8).map((item) => ({ rule: cleanText(item.rule, 20) || "051", claim: cleanText(item.claim, 120) }));
    return {
      passed: parsed.passed && violations.length === 0,
      violations,
    };
  } catch {
    throw new AiGenerationError("真实AI的内容真实性核验结果无法解析，本次未输出内容。", 502);
  }
}

export async function generateNote(input: GenerationPayload, store: Store = defaultStore): Promise<NoteResult> {
  const payload = normalize(input);
  let bundle: KnowledgeBundle;
  try {
    bundle = await loadKnowledgeBundle(payload.projectId, payload.projectName);
  } catch (error) {
    if (error instanceof KnowledgeError) throw new AiGenerationError(error.message, error.status);
    throw error;
  }

  // 生成本次专属的风格配置（基于 sessionId 确保同一会话内风格一致）
  const styleConfig = generateStyleConfig(payload.sessionId || undefined);

  let correction = "";
  let lastIssueCodes = "";
  let lastIssueDetails = "";
  let previousCandidate: NoteResult | undefined;
  let currentStyleConfig = styleConfig;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const candidate = await callModel(buildMessages(bundle, payload, store, correction, previousCandidate, currentStyleConfig));
    const assessment = assessKnowledgeResult(candidate, bundle, payload, store);
    const fatal = assessment.blockingIssues.find((issue) => issue.level === "fatal");
    if (fatal) throw new AiGenerationError(`生成内容未通过医疗合规检查（${fatal.code}），请补充真实信息后重试。`, 422);
    if (assessment.blockingIssues.length > 0) {
      lastIssueCodes = assessment.blockingIssues.map((issue) => issue.code).join("、");
      lastIssueDetails = assessment.blockingIssues.map((issue) => issue.message).join("；");
      correction = assessment.blockingIssues.map((issue) => `${issue.code}：${issue.message}`).join("\n");
      previousCandidate = candidate;
      // 重试时换一种风格配置，避免同样的结构再次失败
      const previousTypes = getStyleConfigTypes(currentStyleConfig);
      currentStyleConfig = generateStyleConfig(undefined, previousTypes);
      continue;
    }
    const verification = await verifyHighRiskSafety(bundle, candidate, payload, store);
    if (verification.passed) return candidate;
    lastIssueCodes = [...new Set(verification.violations.map((item) => `R${item.rule}-HIGH-RISK`))].join("、") || "R051-HIGH-RISK";
    lastIssueDetails = verification.violations.map((item) => item.claim).filter(Boolean).slice(0, 3).join("；");
    correction = verification.violations.map((item) => `规则${item.rule}：候选中存在事实白名单未提供的内容“${item.claim}”`).join("\n");
    previousCandidate = candidate;
  }
  throw new AiGenerationError(`真实AI连续3次未通过《快乐分享真实种草内容说明书 V1.0》自检（${lastIssueCodes || "未知检查项"}${lastIssueDetails ? `：${lastIssueDetails}` : ""}），本次未输出内容，请补充更具体的真实体验后重试。`, 422);
}
