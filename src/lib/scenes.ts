export type SceneId = "austin" | "nashville";

export const SCENES = [
  { id: "austin", label: "Austin, TX", timezone: "America/Chicago" },
  { id: "nashville", label: "Nashville, TN", timezone: "America/Chicago" },
] as const;
