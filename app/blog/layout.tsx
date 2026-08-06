import type { Metadata } from "next";
import { generatePublicMetadataForRequest } from "@/lib/i18n/serverPublicMetadata";

export const generateMetadata = generatePublicMetadataForRequest;

export const metadata: Metadata = {
  title: "Blog | HAMZA AGENCY",
  description: "Professional articles about digital operations, programs, and brand identity.",
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
