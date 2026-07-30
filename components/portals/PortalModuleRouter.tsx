import ProductAiAssistant from "@/components/ai/ProductAiAssistant";
import PortalAccountModule from "@/components/portals/PortalAccountModule";
import PortalModule from "@/components/portals/PortalModule";
import type { PortalRole } from "@/lib/productExpansion/domain";

const accountModules = new Set(["profile", "privacy", "sessions", "notifications"]);

export default function PortalModuleRouter({ role, moduleKey }: { role: PortalRole; moduleKey: string }) {
  if (accountModules.has(moduleKey)) {
    return <PortalAccountModule role={role} moduleKey={moduleKey as "profile" | "privacy" | "sessions" | "notifications"} />;
  }
  if (moduleKey === "support") {
    return <ProductAiAssistant surface={role} title="الدعم والمعرفة والمساعد الذكي" />;
  }
  return <PortalModule role={role} moduleKey={moduleKey} />;
}
