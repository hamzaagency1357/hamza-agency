import Link from "next/link";
import type { PublicSectionRecord } from "@/lib/publicPageData";

function parseSettings(section: PublicSectionRecord) {
  return section.settings && typeof section.settings === "object" ? section.settings : {};
}
function text(value: unknown) { return typeof value === "string" ? value : ""; }
function list(value: unknown) { return Array.isArray(value) ? value : []; }
function safeHref(value: string) { return value.startsWith("/") || value.startsWith("https://") || value.startsWith("http://") ? value : "#"; }

export default function PublicPageBuilderRenderer({ sections }: { sections: PublicSectionRecord[] }) {
  return <>{sections.map((section) => <Section key={section.id} section={section} />)}</>;
}

function Section({ section }: { section: PublicSectionRecord }) {
  const type = section.section_type || "rich_text";
  const settings = parseSettings(section);
  const title = section.title || "";
  const body = section.content || "";
  const image = section.media_url || text(settings.image_url);
  const buttonLabel = text(settings.button_label);
  const buttonUrl = safeHref(text(settings.button_url));
  const common = "mx-auto w-full max-w-6xl px-5 py-12 md:py-20";

  if (type === "spacer") return <div aria-hidden="true" style={{ height: Math.min(Number(settings.height) || 64, 240) }} />;
  if (type === "divider") return <div className={`${common} py-4`}><hr className="border-white/10" /></div>;
  if (type === "hero") return <section className={`${common} text-center`}><div className="rounded-[2.5rem] border border-purple-400/20 bg-gradient-to-b from-purple-500/15 to-black/25 p-8 md:p-16">{image&&<img src={image} alt="" className="mx-auto mb-8 max-h-80 w-full rounded-3xl object-cover"/>}<h1 className="text-4xl font-black leading-tight md:text-7xl">{title}</h1>{body&&<p className="mx-auto mt-6 max-w-3xl whitespace-pre-line text-lg leading-9 text-white/70">{body}</p>}{buttonLabel&&<Link href={buttonUrl} className="mt-8 inline-flex rounded-full bg-purple-600 px-8 py-4 font-black">{buttonLabel}</Link>}</div></section>;
  if (type === "text_image") return <section className={`${common} grid items-center gap-8 md:grid-cols-2`}><div><h2 className="text-3xl font-black md:text-5xl">{title}</h2><p className="mt-5 whitespace-pre-line leading-8 text-white/70">{body}</p>{buttonLabel&&<Link href={buttonUrl} className="mt-6 inline-flex rounded-full border border-purple-400/40 px-6 py-3 font-bold">{buttonLabel}</Link>}</div>{image&&<img src={image} alt={title} className="w-full rounded-[2rem] border border-white/10 object-cover"/>}</section>;
  if (["rich_text","text"].includes(type)) return <section className={common}><div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-7 md:p-10"><h2 className="text-3xl font-black">{title}</h2><div className="mt-5 whitespace-pre-line leading-9 text-white/70">{body}</div></div></section>;
  if (type === "cta") return <section className={common}><div className="rounded-[2rem] border border-yellow-400/20 bg-yellow-400/10 p-8 text-center"><h2 className="text-3xl font-black text-yellow-100">{title}</h2><p className="mx-auto mt-4 max-w-2xl whitespace-pre-line leading-8 text-yellow-50/75">{body}</p>{buttonLabel&&<Link href={buttonUrl} className="mt-6 inline-flex rounded-full bg-yellow-400 px-7 py-3 font-black text-black">{buttonLabel}</Link>}</div></section>;
  if (type === "contact") return <section className={common}><div className="rounded-[2rem] border border-green-400/20 bg-green-500/10 p-8 text-center"><h2 className="text-3xl font-black">{title}</h2><p className="mt-4 whitespace-pre-line text-white/70">{body}</p><Link href={buttonUrl==="#"?"/contact":buttonUrl} className="mt-6 inline-flex rounded-full bg-green-500 px-7 py-3 font-black">{buttonLabel||"تواصل معنا"}</Link></div></section>;
  if (["cards","programs","stats","faq","gallery","partners","reviews","success_stories"].includes(type)) {
    const items = list(settings.items).length ? list(settings.items) : body.split(/\n\n+/).filter(Boolean).map((item)=>({ title:item.split("\n")[0], body:item.split("\n").slice(1).join("\n") }));
    return <section className={common}><h2 className="text-center text-3xl font-black md:text-5xl">{title}</h2>{section.subtitle&&<p className="mx-auto mt-4 max-w-3xl text-center text-white/60">{section.subtitle}</p>}<div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map((raw,index)=>{const item=raw&&typeof raw==="object"?raw as Record<string,unknown>:{};const itemImage=text(item.image)||text(item.media_url);return <article key={index} className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">{itemImage&&<img src={itemImage} alt={text(item.title)} className="mb-5 h-48 w-full rounded-2xl object-cover"/>}<h3 className="text-xl font-black">{text(item.title)||text(item.label)||String(raw)}</h3><p className="mt-3 whitespace-pre-line leading-7 text-white/65">{text(item.body)||text(item.description)||text(item.value)}</p>{text(item.url)&&<Link href={safeHref(text(item.url))} className="mt-4 inline-flex text-purple-300 underline">{text(item.button_label)||"عرض المزيد"}</Link>}</article>})}</div></section>;
  }
  return <section className={common}><div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-7"><h2 className="text-3xl font-black">{title}</h2><p className="mt-5 whitespace-pre-line leading-8 text-white/70">{body}</p></div></section>;
}
