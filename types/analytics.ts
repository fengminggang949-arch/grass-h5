export type AnalyticsEventName =
  | "page_view" | "start_click" | "project_selected" | "experience_submitted"
  | "style_selected" | "generate_started" | "generate_success" | "generate_failed"
  | "title_selected" | "content_edited" | "copy_title" | "copy_content"
  | "copy_all" | "publish_guide_view" | "history_view";

export interface AnalyticsEvent {
  eventName: AnalyticsEventName;
  storeId?: string;
  campaignId?: string;
  channelId?: string;
  projectId?: string;
  timestamp: string;
  sessionId: string;
}
