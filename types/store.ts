export interface Store {
  id: string;
  name: string;
  shortName: string;
  logoText: string;
  city: string;
  district: string;
  address: string;
  description: string;
  projectIds: string[];
  defaultHashtags: string[];
  recommendedKeywords: string[];
  forbiddenWords: string[];
}

export interface Project {
  id: string;
  name: string;
  icon: string;
}

export interface QrParams {
  storeId: string;
  campaignId: string;
  channelId: string;
  projectId: string;
}

export interface StoreConfig {
  store: Store;
  projects: Project[];
}
