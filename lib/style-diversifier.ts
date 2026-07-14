/**
 * 文章结构多样化引擎
 *
 * 数据来源：
 * - part3_文章结构数据库.md：开头/中间/结尾类型、段落结构、情绪线
 * - part4_真人表达数据库.md：350+句真人表达、情绪词库
 *
 * 核心功能：每次生成时随机抽取不同的结构组合，确保批量生成不重复。
 */

// ============================================================
// 开头类型（6种，来自 part3 2.1）
// ============================================================
const OPENING_TYPES = [
  {
    name: "悬念钩子式",
    weight: 28,
    templates: [
      `用一个关于牙齿的真实金句或俗语开头，然后用自己的经历去印证它`,
      `先抛出一个反常识的结论或画面，再倒叙讲经过`,
      `从一句自嘲或吐槽开始，快速拉近和读者的距离`,
    ],
    expressions: ["说真的", "没想到", "谁懂啊", "天呐", "真服了"],
  },
  {
    name: "背景引入式",
    weight: 25,
    templates: [
      `先介绍自己是什么样的人（职业/性格/经历），再引出为什么要做这个项目`,
      `用"作为一个...的人"开头，交代牙齿问题的来龙去脉`,
      `先写牙齿问题给自己的困扰，再过渡到下决心去解决`,
    ],
    expressions: ["作为一个", "一直以来", "从小到大", "其实"],
  },
  {
    name: "拖延恐惧式",
    weight: 20,
    templates: [
      `用"这件事我纠结了整整X"开头，详细写纠结的原因和心理活动`,
      `先写自己有多害怕、搜了多少帖子、取消了多次预约`,
      `从"一直拖着没去"到"终于鼓起勇气"的转折过程`,
    ],
    expressions: ["我一直拖着", "纠结了好久", "能拖就拖", "怕得要死", "心里一直打鼓"],
  },
  {
    name: "问题驱动式",
    weight: 15,
    templates: [
      `从一次具体的牙疼/不适事件开始，描述当时的感受和行为`,
      `先写"平时都是以为...直到..."的认知转变过程`,
      `从某个具体症状（出血/黑点/酸痛）切入，引出就医决定`,
    ],
    expressions: ["疼起来真要命", "以为是上火", "不就是", "结果越来越严重"],
  },
  {
    name: "结果反转式",
    weight: 7,
    templates: [
      `先写困扰已久的问题，再用"直到我试了XX"引出转折`,
      `用"XX的痛谁懂"开头，然后写解决方案和惊喜结果`,
      `先写后悔情绪（后悔没早去），再倒叙讲为什么后悔`,
    ],
    expressions: ["后悔没早点去", "终于敢笑了", "效果真的绝了", "完全没想到"],
  },
  {
    name: "数据价格式",
    weight: 5,
    templates: [
      `开篇就点出花了多少钱/用了多长时间，用真实数据建立信任感`,
      `用"花XX做XX，X个月后真实反馈"这种干货型标题感开头`,
    ],
    expressions: ["花了", "一共", "全程", "前前后后"],
  },
];

// ============================================================
// 中间结构（5种，来自 part3 2.2）
// ============================================================
const MIDDLE_STRUCTURES = [
  {
    name: "时间线型",
    weight: 35,
    description: "按时间顺序从预约→到店→检查→操作→恢复，每个节点写具体感受和细节",
    segments: ["出发前/预约时的心情", "到店第一印象", "检查环节", "核心操作过程", "操作后的即时感受"],
  },
  {
    name: "步骤流程型",
    weight: 25,
    description: "用清晰的步骤感叙述，每一步穿插个人感受，不要写成说明书",
    segments: ["第一步：术前准备和沟通", "第二步：关键操作环节", "第三步：术中感受和互动", "第四步：术后收尾和医嘱"],
  },
  {
    name: "对比式叙述",
    weight: 15,
    description: "穿插对比：想象中 vs 现实中、之前 vs 之后、其他地方的体验 vs 这次的体验",
    segments: ["想象 vs 现实的反差", "之前状态 vs 现在的对比", "不同选择之间的权衡"],
  },
  {
    name: "感受+细节式",
    weight: 15,
    description: "以个人感官体验为主线，大量使用触觉/听觉/视觉细节描写，穿插内心独白",
    segments: ["触觉描写（温度/震动/压力）", "听觉描写（器械声/对话）", "视觉描写（环境/器械/镜子里的自己）", "内心独白（当时的想法/情绪波动）"],
  },
  {
    name: "问题解答式",
    weight: 10,
    description: "以回答读者最关心的问题来组织中间段落，每个问题是一个自然段，但不要用问答格式，要融入叙事",
    segments: ["会不会疼？→ 用真实体验回答", "要多久？→ 用过程时长来体现", "效果怎么样？→ 用细节对比来展示", "有什么要注意的？→ 用亲身体会来提醒"],
  },
];

// ============================================================
// 结尾类型（5种，来自 part3 2.3）
// ============================================================
const ENDING_TYPES = [
  {
    name: "总结感悟式",
    weight: 30,
    templates: [
      "回顾整个过程，最大的感受是...",
      "这次经历不只是...更是...",
      "回头看，带给我最大的改变是...",
    ],
    closings: ["希望我的经历能帮到你", "以上就是我的真实经历", "希望对大家有帮助"],
  },
  {
    name: "建议攻略式",
    weight: 25,
    templates: [
      "给还在犹豫的朋友几点真心建议...",
      "总结几个关键点，真的值得记下来...",
      "如果你也在纠结，我的建议是...",
    ],
    closings: ["少走弯路", "避坑指南", "过来人的忠告"],
  },
  {
    name: "后悔反思式",
    weight: 15,
    templates: [
      "回想整个过程，真的悔不当初。如果我能...",
      "我现在真的好后悔，早知道...",
      "所以大家千万不要像我一样...",
    ],
    closings: ["血泪教训", "千万别学我", "早去早省钱"],
  },
  {
    name: "鼓励号召式",
    weight: 15,
    templates: [
      "如果你也在犹豫，别等了。真的没有你想象中那么可怕。",
      "说了这么多，其实就想告诉你：早做早享受！",
      "你以为的再等等，其实是...所以赶紧去吧！",
    ],
    closings: ["早做早享受", "赶紧去", "别等了"],
  },
  {
    name: "经验教训式",
    weight: 10,
    templates: [
      "这些事千万别做：1...2...3...",
      "经验总结：这些坑千万别踩！",
      "用真金白银换来的教训分享给你...",
    ],
    closings: ["吃一堑长一智", "这个坑我替大家踩过了", "血的教训啊"],
  },
  {
    name: "开放互动式",
    weight: 5,
    templates: [
      "以上就是我的真实经历，如果你有相关问题欢迎留言～",
      "大家有什么想问的可以在评论区说，我尽量回复",
    ],
    closings: ["欢迎评论区留言", "就酱！", "吃嘛嘛香"],
  },
];

// ============================================================
// 情绪线模板（来自 part3 各品类分析）
// ============================================================
const EMOTIONAL_ARCS = [
  { label: "恐惧→紧张→放松→满意", stages: ["害怕", "忐忑", "逐渐放松", "惊喜满意"] },
  { label: "不在意→担心→后悔→教训", stages: ["轻视", "发现问题后的担忧", "治疗中的后悔", "事后的教训"] },
  { label: "自卑→期待→坚持→惊喜→自信", stages: ["长期困扰", "下定决心", "过程中的坚持", "看到变化", "自信重生"] },
  { label: "纠结→害怕→轻松→满意→后悔没早做", stages: ["反复犹豫", "鼓起勇气", "发现没想象中可怕", "效果满意", "后悔拖延"] },
  { label: "剧痛→恐惧→治疗→轻松→教训", stages: ["疼痛难忍", "害怕就医", "接受治疗", "如释重负", "总结教训"] },
  { label: "焦虑→惊喜→满意→分享经验", stages: ["出发前焦虑", "过程中的意外惊喜", "对结果满意", "想分享给其他人"] },
];

// ============================================================
// 叙事手法（来自 part3 2.2）
// ============================================================
const NARRATIVE_TECHNIQUES = [
  "多用内心独白：'我当时就想...''心里暗暗想...'",
  "加入感官细节：声音、触感、温度、气味",
  "制造对比反差：想象 vs 现实、之前 vs 之后",
  "加入小插曲/小意外：让叙事不完美反而更真实",
  "用停顿和转折制造节奏：'结果呢？''但接下来发生的事让我...'",
  "穿插和医生/护士的简短互动（不编造引号原话，写感受即可）",
];

// ============================================================
// 真人表达词库（精选自 part4，按情绪分类）
// ============================================================
const EXPRESSION_POOL = {
  hesitation: [
    "我一直拖着没去", "纠结了好久", "说真的，这件事我纠结了整整",
    "想着过段时间再说", "能拖就拖", "预约了又取消了好几次",
    "每次想到要去看牙就怂了", "犹犹豫豫好几年", "一直没当回事",
  ],
  fear: [
    "其实挺害怕的", "紧张得手心都是汗", "怕得要死",
    "光是想想那个画面我就头皮发麻", "我对看牙有心理阴影",
    "心里特别忐忑", "心里一直在打退堂鼓", "我是那种特别怕疼的人",
  ],
  surprise: [
    "没想到这么轻松", "后悔没早点去", "比想象中轻松一百倍",
    "完全不疼", "感觉太爽了", "太惊喜了",
    "出乎意料的好", "现实狠狠打了我的脸",
  ],
  satisfaction: [
    "太值了", "效果真的绝了", "终于敢露齿笑了",
    "医生真的超级温柔", "像做SPA一样舒服", "现在吃嘛嘛香",
    "体验感满分", "这钱花得太值了",
  ],
  regret: [
    "后悔死了", "早知道就早点去了", "血泪教训",
    "早补早省钱", "越拖越严重", "千万别学我",
    "这个教训太深刻了", "牙齿健康真的不能侥幸",
  ],
  selfDeprecation: [
    "我也是个憨憨", "一口烂牙", "感觉自己像个傻子",
    "全身上下最值钱的就是这口牙了", "现在笑一下都觉得自己很贵",
    "看牙看得快破产了", "花钱找罪受说的就是我",
  ],
  colloquial: [
    "说真的", "其实", "说实话", "没想到", "结果",
    "反正", "就是", "而且", "关键是", "有一说一",
    "不吹不黑", "怎么说呢", "讲真", "划重点", "说白了就是",
  ],
};

// ============================================================
// 随机抽取工具函数
// ============================================================

/** 基于权重的加权随机选择 */
function weightedPick<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * total;
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item;
  }
  return items[items.length - 1];
}

/** 从数组中随机取 n 个不重复元素 */
function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

/** 伪随机种子（基于 sessionId 的 hash），确保同一会话内风格一致 */
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const normalized = (hash >>> 0) / 4294967296;
  return normalized;
}

function seededWeightedPick<T extends { weight: number }>(items: T[], seed: string): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let random = seededRandom(seed) * total;
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item;
  }
  return items[items.length - 1];
}

// ============================================================
// 主函数：生成多样化配置
// ============================================================

export interface StyleConfig {
  opening: {
    type: string;
    instruction: string;
    suggestedExpressions: string[];
  };
  middle: {
    type: string;
    instruction: string;
    segments: string[];
  };
  ending: {
    type: string;
    instruction: string;
    suggestedClosings: string[];
  };
  emotionalArc: {
    label: string;
    stages: string[];
  };
  narrativeTechniques: string[];
  mustUseExpressions: {
    hesitation: string[];
    fear: string[];
    surprise: string[];
    satisfaction: string[];
    regret: string[];
    selfDeprecation: string[];
    colloquial: string[];
  };
}

/**
 * 生成一次多样化的风格配置
 * @param sessionId 可选，传入后基于 sessionId 生成确定性结果（同一会话内保持一致）
 * @param previousConfigs 之前用过的配置类型名称，用于避免重复
 */
export function generateStyleConfig(sessionId?: string, previousConfigs?: string[]): StyleConfig {
  // 选择开头类型（避开最近用过的）
  let availableOpenings = OPENING_TYPES;
  let availableMiddles = MIDDLE_STRUCTURES;
  let availableEndings = ENDING_TYPES;

  if (previousConfigs && previousConfigs.length > 0) {
    const recentOpenings = previousConfigs.filter((c) => c.startsWith("open:")).map((c) => c.replace("open:", ""));
    const recentMiddles = previousConfigs.filter((c) => c.startsWith("mid:")).map((c) => c.replace("mid:", ""));
    const recentEndings = previousConfigs.filter((c) => c.startsWith("end:")).map((c) => c.replace("end:", ""));

    if (recentOpenings.length > 0 && availableOpenings.length > recentOpenings.length) {
      availableOpenings = availableOpenings.filter((o) => !recentOpenings.includes(o.name)) as typeof OPENING_TYPES;
      if (availableOpenings.length === 0) availableOpenings = OPENING_TYPES;
    }
    if (recentMiddles.length > 0 && availableMiddles.length > recentMiddles.length) {
      availableMiddles = availableMiddles.filter((m) => !recentMiddles.includes(m.name)) as typeof MIDDLE_STRUCTURES;
      if (availableMiddles.length === 0) availableMiddles = MIDDLE_STRUCTURES;
    }
    if (recentEndings.length > 0 && availableEndings.length > recentEndings.length) {
      availableEndings = availableEndings.filter((e) => !recentEndings.includes(e.name)) as typeof ENDING_TYPES;
      if (availableEndings.length === 0) availableEndings = ENDING_TYPES;
    }
  }

  const opening = sessionId
    ? seededWeightedPick(availableOpenings, sessionId + "open")
    : weightedPick(availableOpenings);

  const middle = sessionId
    ? seededWeightedPick(availableMiddles, sessionId + "mid")
    : weightedPick(availableMiddles);

  const ending = sessionId
    ? seededWeightedPick(availableEndings, sessionId + "end")
    : weightedPick(availableEndings);

  const emotionalArc = EMOTIONAL_ARCS[Math.floor(Math.random() * EMOTIONAL_ARCS.length)];

  // 每次随机选 2-3 个叙事手法
  const narrativeTechniques = pickRandom(NARRATIVE_TECHNIQUES, 2 + Math.floor(Math.random() * 2));

  // 从每个情绪池中随机抽 1-2 个表达（确保多样性）
  const mustUseExpressions = {
    hesitation: pickRandom(EXPRESSION_POOL.hesitation, 1 + Math.floor(Math.random() * 2)),
    fear: pickRandom(EXPRESSION_POOL.fear, 1 + Math.floor(Math.random() * 2)),
    surprise: pickRandom(EXPRESSION_POOL.surprise, 1 + Math.floor(Math.random() * 2)),
    satisfaction: pickRandom(EXPRESSION_POOL.satisfaction, 1 + Math.floor(Math.random() * 2)),
    regret: pickRandom(EXPRESSION_POOL.regret, 1),
    selfDeprecation: pickRandom(EXPRESSION_POOL.selfDeprecation, 1),
    colloquial: pickRandom(EXPRESSION_POOL.colloquial, 2 + Math.floor(Math.random() * 2)),
  };

  return {
    opening: {
      type: opening.name,
      instruction: pickRandom(opening.templates, 1)[0],
      suggestedExpressions: opening.expressions,
    },
    middle: {
      type: middle.name,
      instruction: middle.description,
      segments: middle.segments,
    },
    ending: {
      type: ending.name,
      instruction: pickRandom(ending.templates, 1)[0],
      suggestedClosings: ending.closings,
    },
    emotionalArc,
    narrativeTechniques,
    mustUseExpressions,
  };
}

/**
 * 将风格配置转为 AI prompt 注入片段
 */
export function styleConfigToPrompt(config: StyleConfig): string {
  const lines: string[] = [
    "【文章结构多样化指令｜本次生成专属风格】",
    "",
    "⚠️ 以下结构组合是本次生成独有的。如果你要连续生成多篇文章，每次都必须使用不同的结构组合。",
    "",
    `📌 开头方式：${config.opening.type}`,
    `   → ${config.opening.instruction}`,
    `   → 建议口语词：${config.opening.suggestedExpressions.join("、")}`,
    "",
    `📌 中间结构：${config.middle.type}`,
    `   → ${config.middle.instruction}`,
    `   → 叙事段落：${config.middle.segments.join(" → ")}`,
    "",
    `📌 结尾方式：${config.ending.type}`,
    `   → ${config.ending.instruction}`,
    `   → 建议收尾语：${config.ending.suggestedClosings.join(" / ")}`,
    "",
    `📌 情绪变化线：${config.emotionalArc.label}`,
    `   → ${config.emotionalArc.stages.join(" → ")}`,
    "",
    `📌 叙事手法（本次必须使用）：`,
    ...config.narrativeTechniques.map((t) => `   • ${t}`),
    "",
    `📌 必须自然融入的真人高频表达（至少使用 60%）：`,
    `   犹豫/拖延：${config.mustUseExpressions.hesitation.join(" / ")}`,
    `   害怕/紧张：${config.mustUseExpressions.fear.join(" / ")}`,
    `   惊喜/反转：${config.mustUseExpressions.surprise.join(" / ")}`,
    `   满意/开心：${config.mustUseExpressions.satisfaction.join(" / ")}`,
    `   后悔/教训：${config.mustUseExpressions.regret.join(" / ")}`,
    `   自嘲/幽默：${config.mustUseExpressions.selfDeprecation.join(" / ")}`,
    `   口语过渡：${config.mustUseExpressions.colloquial.join(" / ")}`,
    "",
    "❗ 禁止复用上一篇文章的结构模式。如果你上一篇文章用了"悬念钩子式"开头+时间线结构+总结感悟结尾，这一次必须全部换掉。",
  ];
  return lines.join("\n");
}

/**
 * 导出类型名称列表（用于去重追踪）
 */
export function getStyleConfigTypes(config: StyleConfig): string[] {
  return [
    `open:${config.opening.type}`,
    `mid:${config.middle.type}`,
    `end:${config.ending.type}`,
  ];
}
