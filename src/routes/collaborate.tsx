import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { MarketingBody, MarketingHero, MarketingSection } from "@/components/immune/marketing";
import { CONTACT_EMAIL, pageTitle, PRODUCT_NAME } from "@/lib/brand";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/collaborate")({
  head: () =>
    seoHead({
      title: pageTitle("Collaborate"),
      description: `Partner with ${PRODUCT_NAME} on education, immunology research, knowledge graphs and responsible scientific AI.`,
      path: "/collaborate",
    }),
  component: Collaborate,
});

const STAKEHOLDERS = [
  "Education",
  "Immunology research",
  "Computational biology",
  "Biotech or pharma",
  "AI engineering",
  "Other",
] as const;

/** Practical work-email check — requires a domain with a dot; not a full RFC parser. */
function isValidWorkEmail(value: string): boolean {
  const v = value.trim();
  if (v.length < 5 || v.length > 254) return false;
  if (/\s/.test(v)) return false;
  const at = v.lastIndexOf("@");
  if (at < 1) return false;
  const local = v.slice(0, at);
  const domain = v.slice(at + 1);
  if (!local || !domain || local.includes("@")) return false;
  if (!domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) return false;
  if (domain.split(".").some((p) => !p)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function Collaborate() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [org, setOrg] = useState("");
  const [stakeholder, setStakeholder] = useState<(typeof STAKEHOLDERS)[number]>("Immunology research");
  const [interest, setInterest] = useState("");
  const [message, setMessage] = useState("");
  const [privacy, setPrivacy] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!privacy || !name.trim() || !message.trim()) return;
    if (!isValidWorkEmail(email)) {
      setEmailError("Enter a valid work email (name@organisation.domain).");
      return;
    }
    setEmailError(null);
    const body = [
      `Name: ${name.trim()}`,
      `Email: ${email.trim()}`,
      `Organisation: ${org.trim() || "(not provided)"}`,
      `Stakeholder type: ${stakeholder}`,
      `Area of interest: ${interest.trim() || "(not provided)"}`,
      "",
      message.trim(),
      "",
      "— Sent from the Collaborate page. Do not include patient details, PHI, or confidential research data.",
    ].join("\n");
    const href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      `[Collaborate] ${stakeholder} — ${PRODUCT_NAME}`,
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
  }

  return (
    <div className="mkt-page">
      <MarketingHero
        eyebrow="Organisation · Collaborate"
        title="Help shape an evidence-aware platform."
        lede={`We welcome conversations with immunology educators, researchers, computational biologists and technology teams interested in knowledge graphs, literature curation and responsible scientific AI for ${PRODUCT_NAME}.`}
        foot="No patient details · no PHI · no confidential research data via this form"
      />

      <MarketingBody>
        <div className="mkt-collab-layout">
          <aside className="mkt-collab-aside">
            <MarketingSection
              id="direct"
              eyebrow="Contact"
              title="Email first."
              lede="Prefer a short note? Write to the public collaboration inbox."
            >
              <div className="mkt-collab-address">
                <code>{CONTACT_EMAIL}</code>
                <div className="bio-actions">
                  <Button type="button" variant="ghost" className="bio-secondary" onClick={copyAddress}>
                    {copied ? "Copied" : "Copy address"}
                  </Button>
                  <a className="mkt-text-link" href={`mailto:${CONTACT_EMAIL}`}>
                    Open mail app
                  </a>
                </div>
              </div>
              <p className="mkt-aside">
                Explore first: <Link to="/overview">Platform</Link>
                {" · "}
                <Link to="/methods">Evidence &amp; Methods</Link>
                {" · "}
                <Link to="/privacy">Privacy</Link>
              </p>
            </MarketingSection>
          </aside>

          <div className="mkt-collab-main">
            <MarketingSection
              id="form"
              eyebrow="Enquiry"
              title="Start a conversation."
              lede="Submitting opens your email client with a pre-filled message."
            >
              <form className="collab-form" onSubmit={onSubmit} noValidate>
                <label>
                  Name
                  <input
                    name="name"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label>
                  Work email
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    aria-invalid={emailError ? true : undefined}
                    aria-describedby={emailError ? "email-error" : undefined}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    onBlur={() => {
                      if (email.trim() && !isValidWorkEmail(email)) {
                        setEmailError("Enter a valid work email (name@organisation.domain).");
                      }
                    }}
                  />
                  {emailError ? (
                    <span id="email-error" className="collab-error" role="alert">
                      {emailError}
                    </span>
                  ) : null}
                </label>
                <label>
                  Organisation <span className="muted">(optional)</span>
                  <input
                    name="org"
                    autoComplete="organization"
                    value={org}
                    onChange={(e) => setOrg(e.target.value)}
                  />
                </label>
                <label>
                  Stakeholder type
                  <select
                    value={stakeholder}
                    onChange={(e) => setStakeholder(e.target.value as (typeof STAKEHOLDERS)[number])}
                  >
                    {STAKEHOLDERS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Area of interest <span className="muted">(optional)</span>
                  <input name="interest" value={interest} onChange={(e) => setInterest(e.target.value)} />
                </label>
                <label>
                  Message
                  <textarea
                    name="message"
                    required
                    rows={6}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your interest. Do not include patient identifiers or PHI."
                  />
                </label>
                <label className="collab-check">
                  <input
                    type="checkbox"
                    checked={privacy}
                    onChange={(e) => setPrivacy(e.target.checked)}
                    required
                  />
                  <span>
                    I understand this enquiry may be processed as described in the{" "}
                    <Link to="/privacy">privacy notice</Link>, and I will not include patient-identifiable information
                    (PHI) or confidential research data.
                  </span>
                </label>
                <div className="bio-actions">
                  <Button type="submit" className="bio-primary" disabled={!privacy}>
                    Start a conversation
                  </Button>
                </div>
                <p className="small muted collab-form-note">
                  If mail is not configured on your device, use Copy address and send manually to{" "}
                  <code>{CONTACT_EMAIL}</code>.
                </p>
              </form>
            </MarketingSection>
          </div>
        </div>
      </MarketingBody>
    </div>
  );
}
