export const VISUAL_BACKGROUND_PRESET_IDS = [
  "global-luxury-aurora",
  "classic-purple-agency",
  "royal-creator-waves",
  "golden-network-pulse",
  "galaxy-agency-flow",
  "live-streaming-signal",
  "premium-glass-orbits",
  "digital-stage-lights",
] as const;

export type VisualBackgroundPresetId =
  (typeof VISUAL_BACKGROUND_PRESET_IDS)[number];

export const DEFAULT_VISUAL_BACKGROUND_PRESET: VisualBackgroundPresetId =
  "global-luxury-aurora";

export const VISUAL_BACKGROUND_PRESET_CLASSES: Record<
  VisualBackgroundPresetId,
  string
> = {
  "global-luxury-aurora": "preset-global-luxury-aurora",
  "classic-purple-agency": "preset-classic-purple-agency",
  "royal-creator-waves": "preset-royal-creator-waves",
  "golden-network-pulse": "preset-golden-network-pulse",
  "galaxy-agency-flow": "preset-galaxy-agency-flow",
  "live-streaming-signal": "preset-live-streaming-signal",
  "premium-glass-orbits": "preset-premium-glass-orbits",
  "digital-stage-lights": "preset-digital-stage-lights",
};

const legacyPresetMap: Record<string, VisualBackgroundPresetId> = {
  royal: "classic-purple-agency",
  hepta: "global-luxury-aurora",
  gold: "golden-network-pulse",
  nebula: "galaxy-agency-flow",
};

export function normalizeVisualBackgroundPreset(
  value: string | null | undefined
): VisualBackgroundPresetId {
  if (!value) return DEFAULT_VISUAL_BACKGROUND_PRESET;

  if (
    VISUAL_BACKGROUND_PRESET_IDS.includes(
      value as VisualBackgroundPresetId
    )
  ) {
    return value as VisualBackgroundPresetId;
  }

  return legacyPresetMap[value] || DEFAULT_VISUAL_BACKGROUND_PRESET;
}
