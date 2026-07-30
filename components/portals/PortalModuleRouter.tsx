import ProductAiAssistant from "@/components/ai/ProductAiAssistant";
import PortalAccountModule from "@/components/portals/PortalAccountModule";
import PortalModule from "@/components/portals/PortalModule";
import PortalNotificationCenter from "@/components/portals/PortalNotificationCenter";
import PortalSessionCenter from "@/components/portals/PortalSessionCenter";
import type { PortalRole } from "@/lib/productExpansion/domain";

export default function PortalModuleRouter({ role, moduleKey }: { role: PortalRole; moduleKey: string }) {
  if (moduleKey === "profile" || moduleKey === "privacy") {
    return <PortalAccountModule role={role} moduleKey={moduleKey} />;
  }
  if (moduleKey === "sessions") {
    return <PortalSessionCenter role={role} />;
  }
  if (moduleKey === "notifications") {
    return <PortalNotificationCenter role={role} />;
  }
  if (moduleKey === "support") {
    return <ProductAiAssistant surface={role} title="الدعم والمعرفة والمساعد الذكي" />;
  }
  return <PortalModule role={role} moduleKey={moduleKey} />;
}
