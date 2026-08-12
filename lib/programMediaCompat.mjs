export const PROGRAM_MEDIA_FIELD_NAMES = [
  "logo_url",
  "hero_image_url",
  "mobile_image_url",
  "og_image_url",
  "alt_ar",
  "alt_en",
  "alt_tr",
  "media_display_mode",
  "detail_layout",
];

function nullableText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function mediaMode(value) {
  return value === "cover" || value === "logo_cover" ? value : "logo";
}
function detailLayout(value) {
  const parsed = Number(value);
  return parsed === 2 || parsed === 3 ? parsed : 1;
}

export function normalizeProgramMediaRow(row = {}) {
  const parsedId = Number(row.id);
  return {
    id: Number.isSafeInteger(parsedId) && parsedId > 0 ? parsedId : null,
    slug: nullableText(row.slug),
    logo_url: nullableText(row.logo_url),
    hero_image_url: nullableText(row.hero_image_url),
    mobile_image_url: nullableText(row.mobile_image_url),
    og_image_url: nullableText(row.og_image_url),
    alt_ar: nullableText(row.alt_ar),
    alt_en: nullableText(row.alt_en),
    alt_tr: nullableText(row.alt_tr),
    media_display_mode: mediaMode(row.media_display_mode),
    detail_layout: detailLayout(row.detail_layout),
  };
}

export function mergeProgramMediaRows(programs, mediaRows) {
  const byId = new Map();
  const bySlug = new Map();
  for (const raw of mediaRows || []) {
    const media = normalizeProgramMediaRow(raw);
    if (media.id) byId.set(media.id, media);
    if (media.slug) bySlug.set(media.slug, media);
  }
  return (programs || []).map((program) => {
    const id = Number(program?.id);
    const slug = nullableText(program?.slug);
    const media = (Number.isSafeInteger(id) && byId.get(id)) || (slug && bySlug.get(slug));
    return media ? { ...program, ...media } : program;
  });
}
