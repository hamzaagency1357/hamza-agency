import { notFound } from "next/navigation";
import PR99E2EHarness from "@/components/PR99E2EHarness";
import { fixtureEnabled } from "@/lib/pr99E2EFixture";

export const dynamic="force-dynamic";
export default function Page(){if(!fixtureEnabled())notFound();return <PR99E2EHarness/>}
