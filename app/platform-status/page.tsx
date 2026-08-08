import type { Metadata } from "next";
import PlatformStatusClient from "@/components/PlatformStatusClient";

export const metadata:Metadata={title:"Platform Status | HAMZA AGENCY",description:"Operational status for HAMZA AGENCY public services.",robots:{index:false,follow:false}};
export default function PlatformStatusPage(){return <PlatformStatusClient/>}
