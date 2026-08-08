export type ProgramMediaCompatRow = {
  id: number | null;
  slug: string | null;
  logo_url: string | null;
  hero_image_url: string | null;
  mobile_image_url: string | null;
  og_image_url: string | null;
  alt_ar: string | null;
  alt_en: string | null;
  alt_tr: string | null;
};
export const PROGRAM_MEDIA_FIELD_NAMES: readonly string[];
export function normalizeProgramMediaRow(row?: Record<string, unknown>): ProgramMediaCompatRow;
export function mergeProgramMediaRows<T extends object>(programs: T[], mediaRows: Array<Record<string, unknown> | ProgramMediaCompatRow>): Array<T & Partial<ProgramMediaCompatRow>>;
