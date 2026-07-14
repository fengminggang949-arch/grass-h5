import { defaultStore, projects as defaultProjects } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import type { Project, Store, StoreConfig } from "@/types/store";

const iconById = new Map(defaultProjects.map((project) => [project.id, project.icon]));

function stringList(value: string, fallback: string[] = []) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : fallback;
  } catch {
    return fallback;
  }
}

export function fallbackStoreConfig(): StoreConfig {
  return { store: defaultStore, projects: defaultProjects };
}

export async function getStoreConfig(storeId = defaultStore.id): Promise<StoreConfig> {
  const record = await prisma.store.findFirst({
    where: { id: storeId, enabled: true, deletedAt: null },
    include: { projects: { where: { enabled: true, deletedAt: null }, orderBy: { createdAt: "asc" } } },
  });
  if (!record) return fallbackStoreConfig();

  const projectList: Project[] = record.projects.map((project) => ({
    id: project.id,
    name: project.name,
    icon: iconById.get(project.id) || "·",
  }));
  const store: Store = {
    id: record.id,
    name: record.name,
    shortName: record.shortName,
    logoText: record.logo || record.shortName,
    city: record.city,
    district: record.district,
    address: record.address,
    description: record.description,
    projectIds: projectList.map((project) => project.id),
    defaultHashtags: stringList(record.defaultHashtags, defaultStore.defaultHashtags),
    recommendedKeywords: stringList(record.recommendedKeywords, defaultStore.recommendedKeywords),
    forbiddenWords: stringList(record.forbiddenWords, defaultStore.forbiddenWords),
  };
  return { store, projects: projectList };
}
