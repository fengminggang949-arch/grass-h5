export type NoteStyle = "真实分享" | "更口语化" | "简短一点" | "详细一点";

export interface ExperienceData {
  feelings: string[];
  concern: string;
  confirmed: boolean;
}

export interface NoteResult {
  titles: string[];
  content: string;
  hashtags: string[];
  photoSuggestions: string[];
  complianceNotice: string;
}

export interface GenerationPayload {
  storeId: string;
  campaignId?: string;
  channelId?: string;
  projectId: string;
  projectName: string;
  experience: ExperienceData;
  style: NoteStyle;
  sessionId: string;
}

export interface HistoryRecord extends GenerationPayload {
  id: string;
  createdAt: string;
  selectedTitle: string;
  result: NoteResult;
}
