"use client";

import { GalleryBackHomeLink, GalleryCard, GalleryCta, GalleryHero, GalleryPerformancePanel, GallerySectionHeader, type GalleryDisplayItem } from "@/components/GalleryStaticUi";
import { usePublishedGalleryItems } from "@/components/GalleryPublishedTranslations";

export default function GalleryWithPublishedTranslations({ items }: { items: GalleryDisplayItem[] }) {
  const localizedItems = usePublishedGalleryItems(items);
  const featuredItems = localizedItems.filter((item) => item.is_featured);
  const regularItems = localizedItems.filter((item) => !item.is_featured);
  return <section className="relative z-10 mx-auto max-w-7xl px-5 py-16"><GalleryBackHomeLink /><GalleryHero />{featuredItems.length > 0 && <section className="mt-14"><GallerySectionHeader kind="featured" /><div className="grid gap-6 lg:grid-cols-3">{featuredItems.map((item) => <GalleryCard key={item.id} item={item} featured />)}</div></section>}{regularItems.length > 0 && <section className="mt-14"><GallerySectionHeader kind="regular" /><div className="grid gap-6 md:grid-cols-2">{regularItems.map((item) => <GalleryCard key={item.id} item={item} />)}</div></section>}<GalleryPerformancePanel /><GalleryCta /></section>;
}
