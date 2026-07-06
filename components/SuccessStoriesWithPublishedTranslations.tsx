"use client";

import SuccessStoriesPageContent, {
  type SuccessStory,
} from "@/components/SuccessStoriesPageContent";
import { usePublishedSuccessStories } from "@/components/SuccessStoriesPublishedTranslations";

export default function SuccessStoriesWithPublishedTranslations({
  stories,
}: {
  stories: SuccessStory[];
}) {
  const localizedStories = usePublishedSuccessStories(stories);
  return <SuccessStoriesPageContent stories={localizedStories} />;
}
