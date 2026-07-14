import { defaultStore } from "@/lib/data";
import { sanitizeGeneratedText } from "@/lib/content-safety";
import { getProjectContentRule } from "@/lib/project-content-rules";
import type { GenerationPayload, NoteResult } from "@/types/note";
import type { Store } from "@/types/store";

const join = (items: string[]) => items.join("、");

export function generateMockNote(payload: GenerationPayload, store: Store = defaultStore): NoteResult {
  const { experience, projectId, projectName, style } = payload;
  const rule = getProjectContentRule(projectId, projectName);
  const location = `${store.city}${store.district}`;
  const feelings = join(experience.feelings);
  const intro = experience.concern === "没特别担心"
    ? `这次去做${projectName}之前，我没有特别紧张，但还是想先看看现场沟通和流程是不是清楚。`
    : `做${projectName}之前，我最担心的是${experience.concern}。说完全不紧张也不是，到了现场还是会多问几句。`;
  const detail = `这次去的是${store.name}。实际让我比较有感的是${feelings}。这些不是很夸张的大变化，就是我当天确实注意到的几个小地方。`;
  const focus = rule.mockFocus;
  const ending = `${rule.neutralReminder}我把这次经历记下来，给同样在做功课的人多一个参考。`;
  const conversational = `整个过程怎么说呢，和我原来脑补的有点不一样。${feelings}，这几项是我印象最深的。`;
  const paragraphs = style === "更口语化"
    ? [intro, conversational, focus, ending]
    : style === "简短一点"
      ? [intro, detail, ending]
      : style === "详细一点"
        ? [intro, detail, focus, `我没有因为一次体验就马上下结论。对我来说，先把担心的地方问明白，再结合自己的情况决定，会更踏实一些。`, ending]
        : [intro, detail, focus, ending];

  return {
    titles: [
      `做${projectName}前我最担心的，其实是${experience.concern}`,
      `${location}${projectName}，记几个当天的小细节`,
      `没有写成攻略，只说说这次${projectName}`, 
      `${projectName}过程中，我注意到的是${experience.feelings[0]}`,
      `第一次认真记录一次${projectName}体验`,
    ].map((value) => sanitizeGeneratedText(value, store.forbiddenWords).slice(0, 50)),
    content: sanitizeGeneratedText(paragraphs.join("\n\n"), store.forbiddenWords),
    hashtags: Array.from(new Set([
      ...store.defaultHashtags.map((tag) => `#${tag.replace(/^#/, "")}`),
      `#${store.city}本地生活`, `#${store.district}`, `#${projectName}`, "#真实体验", "#生活记录", "#口腔健康", "#到店体验",
    ])).slice(0, 12),
    photoSuggestions: [
      "拍一张门店外景或门头，注意避免拍到路人正脸。",
      "记录一个本人确实注意到的环境细节，不展示他人隐私。",
      `如有本人拍摄且适合公开的${projectName}相关照片，可以作为过程记录。`,
    ],
    complianceNotice: "内容由AI辅助生成，请确认全部内容符合本人真实体验后再使用。",
  };
}
