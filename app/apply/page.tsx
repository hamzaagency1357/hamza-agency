import { redirect } from "next/navigation";
import { localizePublicPath } from "@/lib/i18n/publicLocales";
import { getRequestSiteContext } from "@/lib/i18n/serverPublicMetadata";

export default async function ApplyPage() {
  const { language } = await getRequestSiteContext();
  redirect(localizePublicPath("/programs", language));
}
