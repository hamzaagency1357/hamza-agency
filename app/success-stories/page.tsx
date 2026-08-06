import PublicLanguageMain from "@/components/PublicLanguageMain";
import SuccessStoriesWithPublishedTranslations from "@/components/SuccessStoriesWithPublishedTranslations";
import type { SuccessStory } from "@/components/SuccessStoriesPageContent";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getSuccessStories(): Promise<SuccessStory[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("success_stories")
    .select("id, title, person_name, country, platform, result_summary, story, image_url, is_featured, sort_order, status, is_visible, created_at")
    .eq("is_visible", true)
    .eq("status", "published")
    .order("is_featured", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as SuccessStory[];
}

export default async function SuccessStoriesPage() {
  const stories = await getSuccessStories();
  return (
    <PublicLanguageMain className="relative min-h-screen overflow-hidden bg-[#070009] text-white">
      <SuccessStoriesBackground />
      <SuccessStoriesWithPublishedTranslations stories={stories} />
    </PublicLanguageMain>
  );
}

function SuccessStoriesBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#070009]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.16)_0%,rgba(124,58,237,0.22)_34%,rgba(7,0,9,0.98)_72%)]" />
      <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-purple-600/14 blur-3xl" />
      <div className="absolute -right-24 top-44 hidden h-96 w-96 rounded-full bg-yellow-400/10 blur-3xl md:block" />
      <div className="absolute bottom-0 left-1/2 h-72 w-[70rem] -translate-x-1/2 rounded-full bg-purple-700/10 blur-3xl" />
      <div className="absolute inset-0 opacity-[0.055] [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.5)_1px,transparent_0)] [background-size:48px_48px]" />
    </div>
  );
}
