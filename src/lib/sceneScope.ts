import type { PersistedData } from "./backend/types";
import type { Band, Opening } from "./types";
import type { SceneId } from "./scenes";

const LEGACY_SCENE: SceneId = "austin";

/** Older local/cloud records predate scene ownership and belong to Austin. */
export function normalizeOpeningScene(opening: Opening | Omit<Opening, "scene">): Opening {
  return { ...opening, scene: (opening as Partial<Opening>).scene ?? LEGACY_SCENE } as Opening;
}

/** Pickup projects have always been serialized as bands; normalize old documents. */
export function normalizeProjectScene(project: Band | Omit<Band, "scene">): Band {
  return { ...project, scene: (project as Partial<Band>).scene ?? LEGACY_SCENE } as Band;
}

/** Preserve all stored content while normalizing records created before scenes existed. */
export function normalizePersistedData<T extends PersistedData>(data: T): T {
  return {
    ...data,
    openings: data.openings.map(normalizeOpeningScene),
    projects: data.projects.map(normalizeProjectScene),
  } as T;
}

/** Expose only the user-created content in their selected scene. */
export function scopePersistedData<T extends PersistedData>(data: T): T {
  const normalized = normalizePersistedData(data);
  const scene = normalized.user?.scene ?? LEGACY_SCENE;
  return {
    ...normalized,
    openings: normalized.openings.filter((opening) => opening.scene === scene),
    projects: normalized.projects.filter((project) => project.scene === scene),
  } as T;
}
