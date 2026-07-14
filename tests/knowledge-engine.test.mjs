import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { expandRuleSpec, loadKnowledgeBundle, parseRuleDocument } from "../lib/knowledge-engine.ts";
import { assessKnowledgeResult } from "../lib/knowledge-quality.ts";
import { defaultStore } from "../lib/data.ts";

test("冻结说明书完整解析为99条规则", async () => {
  const source = await readFile("knowledge/快乐分享真实种草内容说明书_V1.0.md", "utf8");
  const rules = parseRuleDocument(source);
  assert.equal(rules.size, 99);
  assert.match(rules.get("001"), /成功的种草内容定义/);
  assert.match(rules.get("099"), /自检结果记录/);
});

test("规则范围路由可以展开且自动去重", () => {
  assert.deepEqual(expandRuleSpec("001-003,003,099"), ["001", "002", "003", "099"]);
});

test("9类项目分别加载对应的说明书专属结构", async () => {
  const cases = [
    ["cleaning", "洗牙", "024"], ["orthodontics", "正畸", "025"], ["implant", "种植牙", "026"],
    ["fluoride", "儿童牙科", "027"], ["whitening", "牙齿美白", "031"], ["filling", "补牙", "028"],
    ["extraction", "拔牙", "029"], ["root-canal", "根管治疗", "030"], ["checkup", "口腔检查", "032"],
  ];
  for (const [id, name, rule] of cases) {
    const bundle = await loadKnowledgeBundle(id, name);
    assert.ok(bundle.projectRuleIds.includes(rule), `${name}应加载规则${rule}`);
    assert.match(bundle.projectPrompt, new RegExp(`规则${rule}`));
  }
});

test("说明书范围外的其他项目按规则078明确拒绝", async () => {
  await assert.rejects(() => loadKnowledgeBundle("other", "其他"), /暂不在支持范围内/);
});

test("事实检查不会把内部会话编号当成用户提供的数字", async () => {
  const bundle = await loadKnowledgeBundle("cleaning", "洗牙");
  const payload = { storeId: "store001", projectId: "cleaning", projectName: "洗牙", experience: { feelings: ["操作比想象中轻"], concern: "怕疼", confirmed: true }, style: "真实分享", sessionId: "internal-05" };
  const result = { titles: ["洗牙前怕疼的真实感受啊", "洗牙时我最在意的事情啊", "关于洗牙疼不疼的记录啊", "这次洗牙让我注意到的事", "怕疼时去洗牙是什么感觉"], content: "说真的，我原来怕疼。洗牙时操作比想象中轻。花了05元。", hashtags: ["#洗牙", "#口腔护理", "#真实体验", "#护牙日常", "#怕疼"], photoSuggestions: [], complianceNotice: "" };
  const assessment = assessKnowledgeResult(result, bundle, payload, defaultStore);
  assert.ok(assessment.metrics.unsupportedNumberHits > 0);
  assert.ok(assessment.blockingIssues.some((issue) => issue.code === "R051-NUMBERS"));
});

test("用户没有提供医生原话时会阻断模型编造的医生引语", async () => {
  const bundle = await loadKnowledgeBundle("cleaning", "洗牙");
  const payload = { storeId: "store001", projectId: "cleaning", projectName: "洗牙", experience: { feelings: ["讲解比较清楚"], concern: "怕疼", confirmed: true }, style: "真实分享", sessionId: "internal" };
  const result = { titles: ["洗牙前怕疼的真实感受啊", "洗牙时我最在意的事情啊", "关于洗牙疼不疼的记录啊", "这次洗牙让我注意到的事", "怕疼时去洗牙是什么感觉"], content: "其实我原来怕疼。医生跟我说：'忍一下就好。'后来讲解比较清楚。", hashtags: ["#洗牙", "#口腔护理", "#真实体验", "#护牙日常", "#怕疼"], photoSuggestions: [], complianceNotice: "" };
  const assessment = assessKnowledgeResult(result, bundle, payload, defaultStore);
  assert.ok(assessment.blockingIssues.some((issue) => issue.code === "R051-R060-DOCTOR-QUOTE"));
});
