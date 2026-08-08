"use client";

import SmartSupportPanel from "@/components/SmartSupportPanel";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

export default function AiSupportClient(){
 const language=useSiteLanguage();
 return <SmartSupportPanel language={language}/>;
}
