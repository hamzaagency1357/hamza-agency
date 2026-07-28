import { generatePublicMetadataForRequest } from "@/lib/i18n/serverPublicMetadata";

export const generateMetadata = generatePublicMetadataForRequest;

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
