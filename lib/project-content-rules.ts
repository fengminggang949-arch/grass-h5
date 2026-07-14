import type { NoteStyle } from "@/types/note";

export interface ProjectContentRule {
  id: string;
  names: string[];
  feelings: string[];
  concerns: string[];
  narrativeInstruction: string;
  mockFocus: string;
  neutralReminder: string;
}

export const STYLE_OPTIONS: Array<{ value: NoteStyle; description: string }> = [
  { value: "真实分享", description: "像顾客回忆一次真实经历，不刻意总结。" },
  { value: "更口语化", description: "句子更松弛，允许短句和轻微停顿。" },
  { value: "简短一点", description: "保留关键细节，正文控制在较短篇幅。" },
  { value: "详细一点", description: "把担心、过程和感受写得更完整。" },
];

export const HUMAN_WRITING_RULES = [
  "使用第一人称，只描述这一次体验，不代表所有人。",
  "长短句混合，允许轻微口语、停顿和不完整句，不写成标准作文。",
  "开头直接进入担心、现场细节或一个具体感受，不使用统一的品牌介绍开头。",
  "至少保留一个担心、犹豫或中性判断，不能把全文写成单向赞美。",
  "门店全称最多出现一次，门店简称最多再出现一次，不重复地址和宣传信息。",
  "不主动使用推荐、种草、宝藏等营销结论，由读者根据事实自行判断。",
  "结尾使用个人提醒、仍需考虑的问题或适用条件，不喊口号、不强行升华。",
  "不同标题分别从担心、细节、过程、问题和简短记录切入，避免统一句式。",
];

export const DEFAULT_FORBIDDEN_EXPRESSIONS = [
  "强烈推荐", "宝藏店铺", "闭眼冲", "天花板", "必须安排", "绝绝子", "YYDS",
  "全程无痛", "完全不痛", "效果立竿见影", "百分百", "零风险", "保证治愈",
  "最权威", "全网第一", "顶级专家", "最便宜", "一定有效", "永不复发",
];

const rules: ProjectContentRule[] = [
  {
    id: "cleaning", names: ["洗牙"],
    feelings: ["清理比较仔细", "操作比想象中轻", "讲解比较清楚", "等待时间不长", "没有强行推销"],
    concerns: ["怕疼", "怕出血", "怕被推销", "怕价格不透明", "没特别担心"],
    narrativeInstruction: "按来之前的担心、实际操作中的一个细节、最明显的个人感受、给同类顾客的理性提醒展开。不要写清洁效果、牙齿变化等用户未提供的结果。",
    mockFocus: "洗牙这类体验，我更在意操作时的沟通和自己的实际感受，而不是把结果说得很夸张。",
    neutralReminder: "每个人对酸胀、出血和操作感受都可能不同，还是以自己的实际情况为准。",
  },
  {
    id: "fluoride", names: ["儿童涂氟", "儿童齿科"],
    feelings: ["对孩子比较有耐心", "引导得比较自然", "过程比想象中快", "环境让孩子比较放松", "注意事项讲得清楚"],
    concerns: ["孩子会害怕", "孩子不配合", "担心吞咽材料", "怕过程太久", "没特别担心"],
    narrativeInstruction: "从家长视角写孩子开始时的状态、工作人员如何引导、过程中观察到的细节和家长自己的感受。不能编造孩子的反应或涂氟效果。",
    mockFocus: "带孩子做项目时，我最关注的不是话术，而是现场怎么引导、孩子能不能慢慢放松下来。",
    neutralReminder: "孩子当天的状态差异很大，是否配合还是要看年龄、情绪和现场情况。",
  },
  {
    id: "orthodontics", names: ["正畸咨询", "正畸"],
    feelings: ["检查比较细", "方案讲得清楚", "愿意回答问题", "费用构成比较清晰", "没有催着决定"],
    concerns: ["不知道哪种方案合适", "担心周期太长", "担心预算", "纠结牙套类型", "怕被推销"],
    narrativeInstruction: "写为什么来咨询、重点了解了哪些问题、哪些信息被讲清楚、自己还有哪些需要考虑。不能替用户决定方案，也不能编造周期、报价或效果。",
    mockFocus: "正畸咨询对我来说更像一次信息梳理，先把选择、周期和自己的疑问问清楚，再决定下一步。",
    neutralReminder: "方案是否适合仍要结合个人检查结果，也没必要在一次咨询后马上做决定。",
  },
  {
    id: "implant", names: ["种植咨询", "种植"],
    feelings: ["检查比较认真", "流程说明清楚", "风险和限制讲得明白", "费用项目比较清楚", "留出了考虑时间"],
    concerns: ["怕疼", "担心恢复", "担心费用", "不确定自己是否适合", "怕被催着决定"],
    narrativeInstruction: "围绕来之前的顾虑、检查与沟通、风险和费用信息是否清楚、为什么仍需理性考虑来写。不得编造适应证、手术过程、品牌、价格和恢复结果。",
    mockFocus: "这类咨询信息比较多，我更关注对方有没有把流程、限制和需要考虑的地方说清楚。",
    neutralReminder: "种植是否适合以及具体方案，需要以完整检查和专业判断为准。",
  },
  {
    id: "whitening", names: ["牙齿美白", "美白"],
    feelings: ["流程说明比较清楚", "操作比较细致", "所需时间可以接受", "敏感注意事项讲得清楚", "效果预期讲得比较客观"],
    concerns: ["担心牙齿敏感", "担心效果不自然", "担心维持时间", "担心价格", "没特别担心"],
    narrativeInstruction: "从效果预期和敏感顾虑切入，写流程沟通、操作感受及注意事项。不得编造色阶变化、维持时间或保证效果。",
    mockFocus: "美白项目我最在意的是预期有没有讲得客观，以及敏感和后续注意事项有没有提前说明。",
    neutralReminder: "实际感受和变化因人而异，不能只根据一篇分享判断自己是否适合。",
  },
  {
    id: "filling", names: ["补牙"],
    feelings: ["检查定位比较仔细", "过程可以接受", "咬合调整比较认真", "材料区别讲得清楚", "注意事项比较清楚"],
    concerns: ["怕疼", "担心磨牙", "纠结材料", "担心补后敏感", "担心费用"],
    narrativeInstruction: "写就诊前担心、检查和沟通、过程中注意到的一个细节、结束后获得的提醒。不得编造龋坏程度、材料品牌、治疗效果或术后反应。",
    mockFocus: "补牙前我其实更想知道问题在哪里、材料怎么选，以及过程中会不会及时沟通。",
    neutralReminder: "牙齿情况和材料选择不一样，具体处理方式仍要根据检查决定。",
  },
  {
    id: "extraction", names: ["拔牙"],
    feelings: ["术前说明比较清楚", "过程中有及时沟通", "操作节奏可以接受", "术后提醒比较详细", "等待时间不长"],
    concerns: ["怕疼", "怕出血", "担心肿胀", "担心恢复时间", "没特别担心"],
    narrativeInstruction: "写术前顾虑、现场沟通、过程中的个人感受和收到的术后提醒。不得使用无痛承诺，也不能编造难度、出血、肿胀和恢复情况。",
    mockFocus: "拔牙前的紧张很真实，所以我更在意术前有没有说明、过程中有没有沟通，以及结束后提醒是否清楚。",
    neutralReminder: "术中感受和恢复情况存在个体差异，具体注意事项应听从现场专业人员说明。",
  },
  {
    id: "checkup", names: ["口腔检查", "检查"],
    feelings: ["检查比较全面", "问题讲得清楚", "建议有先后顺序", "没有过度推荐项目", "等待时间不长"],
    concerns: ["怕查出很多问题", "怕被推销", "担心费用", "担心耗时", "没特别担心"],
    narrativeInstruction: "写为什么来检查、检查和说明方式、建议是否有优先级以及自己下一步准备如何考虑。不得编造诊断结果或治疗建议。",
    mockFocus: "做检查时我最想弄清楚的是目前有哪些问题、哪些需要优先处理，而不是一下子接受很多项目。",
    neutralReminder: "这只是一次个人到店感受，具体问题和处理顺序仍要以个人检查结果为准。",
  },
  {
    id: "other", names: ["其他"],
    feelings: ["沟通比较自然", "流程比较清楚", "操作比较细致", "环境比较舒服", "没有强行推销"],
    concerns: ["怕疼", "怕被推销", "怕价格不清楚", "怕等待太久", "没特别担心"],
    narrativeInstruction: "按担心、到店过程、一个真实细节和个人判断展开。只使用用户选择，不推断具体治疗过程或效果。",
    mockFocus: "这次我主要记录自己实际注意到的流程和沟通细节，不把一次体验写成普遍结论。",
    neutralReminder: "不同项目和个人情况差异很大，做决定前仍需要了解清楚。",
  },
];

const fallback = rules[rules.length - 1];

export function getProjectContentRule(projectId: string, projectName = "") {
  return rules.find((rule) => rule.id === projectId)
    || rules.find((rule) => rule.names.some((name) => projectName.includes(name)))
    || fallback;
}

export const PROJECT_CONTENT_RULES = rules;
