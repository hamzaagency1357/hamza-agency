export const portalRoles = ["creator", "client", "employee", "partner"] as const;
export type PortalRole = (typeof portalRoles)[number];

export const tenantRoles = ["super_admin", "tenant_admin", ...portalRoles] as const;
export type TenantRole = (typeof tenantRoles)[number];

export const productFeatures = [
  "creator_portal",
  "client_portal",
  "employee_portal",
  "partner_portal",
  "tasks",
  "sla",
  "workflows",
  "marketplace",
  "payments",
  "whatsapp",
  "advanced_ai",
  "privacy_center",
  "cookie_consent",
  "pwa",
  "push",
  "mobile_clients",
  "advanced_sessions",
  "monitoring",
] as const;
export type ProductFeature = (typeof productFeatures)[number];

export type ProviderKind = "payment" | "whatsapp" | "ai" | "push";
export type ProviderMode = "disabled" | "manual" | "sandbox" | "live";

export interface ProviderAdapter<TInput, TResult> {
  readonly kind: ProviderKind;
  readonly key: string;
  readonly mode: ProviderMode;
  health(): Promise<{ ok: boolean; detail: string }>;
  execute(input: TInput, context: ProviderExecutionContext): Promise<TResult>;
}

export interface ProviderExecutionContext {
  tenantId: string;
  actorUserId?: string;
  idempotencyKey: string;
  correlationId: string;
}

export class DisabledProviderAdapter<TInput, TResult>
  implements ProviderAdapter<TInput, TResult>
{
  readonly mode = "disabled" as const;

  constructor(
    readonly kind: ProviderKind,
    readonly key: string,
    private readonly resultFactory: (input: TInput) => TResult,
  ) {}

  async health() {
    return { ok: true, detail: `${this.kind}:${this.key} is safely disabled` };
  }

  async execute(input: TInput): Promise<TResult> {
    return this.resultFactory(input);
  }
}

export function assertSupportedPortalRole(value: string): asserts value is PortalRole {
  if (!portalRoles.includes(value as PortalRole)) {
    throw new Error("Unsupported portal role");
  }
}

export function safeProviderMode(value: string | undefined): ProviderMode {
  return value === "manual" || value === "sandbox" || value === "live"
    ? value
    : "disabled";
}
