/**
 * Discovery email alert delivery — provider adapter, env-gated.
 * Never pretends email was sent. Default: deferred (in-app only).
 *
 * Enable with:
 *   DISCOVERY_EMAIL_ALERTS=1
 *   EMAIL_PROVIDER=resend
 *   RESEND_API_KEY=…
 *   EMAIL_FROM=alerts@your-domain
 * Optional: EMAIL_ALERT_TO override for ops smoke tests.
 */
export const EMAIL_ALERT_POLICY = {
  defaultChannel: "in_app" as const,
  deferredChannel: "email_deferred" as const,
  pretendSentForbidden: true as const,
  note: "Email alerts stay deferred until DISCOVERY_EMAIL_ALERTS=1 and a configured provider. Failures never forge a sent receipt.",
} as const;

export type EmailProviderId = "resend" | "none";

export type EmailAlertPayload = {
  to: string;
  subject: string;
  text: string;
  /** Correlation for logs — never a scientific claim. */
  alertDedupeKey?: string;
};

export type EmailSendResult =
  | { ok: true; provider: "resend"; messageId: string; pretended: false }
  | {
      ok: false;
      deferred: true;
      reason: string;
      pretended: false;
      provider: EmailProviderId;
    }
  | {
      ok: false;
      deferred: false;
      error: string;
      pretended: false;
      provider: EmailProviderId;
    };

export function isDiscoveryEmailAlertsEnabled(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): boolean {
  const raw = (env.DISCOVERY_EMAIL_ALERTS ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export function resolveEmailProvider(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): EmailProviderId {
  const p = (env.EMAIL_PROVIDER ?? "").trim().toLowerCase();
  if (p === "resend") return "resend";
  return "none";
}

/** Pure gate used by monitor + unit tests — does not send. */
export function planEmailAlertDelivery(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): {
  enabled: boolean;
  provider: EmailProviderId;
  from: string | null;
  canSend: boolean;
  reason: string;
} {
  const provider = resolveEmailProvider(env);
  const enabled = isDiscoveryEmailAlertsEnabled(env);
  const from = (env.EMAIL_FROM ?? "").trim() || null;
  const hasKey = Boolean((env.RESEND_API_KEY ?? "").trim());

  if (!enabled) {
    return {
      enabled: false,
      provider,
      from,
      canSend: false,
      reason: "DISCOVERY_EMAIL_ALERTS unset — email_deferred / in-app only.",
    };
  }
  if (provider !== "resend") {
    return {
      enabled: true,
      provider: "none",
      from,
      canSend: false,
      reason: "EMAIL_PROVIDER must be resend (only adapter shipped). Delivery deferred.",
    };
  }
  if (!hasKey || !from) {
    return {
      enabled: true,
      provider,
      from,
      canSend: false,
      reason: "RESEND_API_KEY and EMAIL_FROM required. Delivery deferred — not pretended sent.",
    };
  }
  return {
    enabled: true,
    provider,
    from,
    canSend: true,
    reason: "Resend adapter ready.",
  };
}

/**
 * Attempt a real Resend send when gated on. Never returns pretended success.
 */
export async function sendDiscoveryAlertEmail(
  payload: EmailAlertPayload,
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
  fetchImpl: typeof fetch = fetch,
): Promise<EmailSendResult> {
  const plan = planEmailAlertDelivery(env);
  if (!plan.canSend || plan.provider !== "resend" || !plan.from) {
    return {
      ok: false,
      deferred: true,
      pretended: false,
      provider: plan.provider,
      reason: plan.reason,
    };
  }

  const apiKey = (env.RESEND_API_KEY ?? "").trim();
  try {
    const res = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: plan.from,
        to: [payload.to],
        subject: payload.subject,
        text: payload.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        deferred: false,
        pretended: false,
        provider: "resend",
        error: `Resend HTTP ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
      };
    }
    const json = (await res.json()) as { id?: string };
    if (!json.id) {
      return {
        ok: false,
        deferred: false,
        pretended: false,
        provider: "resend",
        error: "Resend response missing id — treating as failure (not pretended sent).",
      };
    }
    return { ok: true, provider: "resend", messageId: json.id, pretended: false };
  } catch (err) {
    return {
      ok: false,
      deferred: false,
      pretended: false,
      provider: "resend",
      error: err instanceof Error ? err.message : "Resend request failed",
    };
  }
}
