import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { PageHead } from "@/components/immune/ui";
import { Button } from "@/components/ui/button";
import { CONTACT_EMAIL, pageTitle, PRODUCT_NAME } from "@/lib/brand";

export const Route = createFileRoute("/collaborate")({
  head: () => ({
    meta: [
      { title: pageTitle("Collaborate") },
      {
        name: "description",
        content: `Partner with ${PRODUCT_NAME} on education, immunology research, knowledge graphs and responsible scientific AI.`,
      },
      { property: "og:title", content: pageTitle("Collaborate") },
    ],
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

function Collaborate() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [org, setOrg] = useState("");
  const [stakeholder, setStakeholder] = useState<(typeof STAKEHOLDERS)[number]>("Immunology research");
  const [interest, setInterest] = useState("");
  const [message, setMessage] = useState("");
  const [privacy, setPrivacy] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!privacy || !name.trim() || !email.trim() || !message.trim()) return;
    const body = [
      `Name: ${name.trim()}`,
      `Email: ${email.trim()}`,
      `Organisation: ${org.trim() || "(not provided)"}`,
      `Stakeholder type: ${stakeholder}`,
      `Area of interest: ${interest.trim() || "(not provided)"}`,
      "",
      message.trim(),
      "",
      "— Sent from the Collaborate page. Do not include patient details or confidential research data.",
    ].join("\n");
    const href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      `[Collaborate] ${stakeholder} — ${PRODUCT_NAME}`,
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
  }

  return (
    <div className="page marketing-page">
      <PageHead
        kicker="Organisation"
        title="Help shape an evidence-aware platform"
        lede={`We welcome conversations with immunology educators, researchers, computational biologists and technology teams interested in knowledge graphs, literature curation and responsible scientific AI for ${PRODUCT_NAME}.`}
      />

      <section className="section">
        <p>
          Do not send patient details or confidential research data through this form. For product exploration, start
          with the <Link to="/overview">platform overview</Link> or{" "}
          <Link to="/methods">Methods &amp; trust</Link>.
        </p>
      </section>

      <form className="collab-form" onSubmit={onSubmit} noValidate>
        <label>
          Name
          <input name="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Work email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Organisation <span className="muted">(optional)</span>
          <input name="org" autoComplete="organization" value={org} onChange={(e) => setOrg(e.target.value)} />
        </label>
        <label>
          Stakeholder type
          <select value={stakeholder} onChange={(e) => setStakeholder(e.target.value as (typeof STAKEHOLDERS)[number])}>
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
          <textarea name="message" required rows={6} value={message} onChange={(e) => setMessage(e.target.value)} />
        </label>
        <label className="collab-check">
          <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} required />
          <span>
            I understand this enquiry may be processed as described in the <Link to="/privacy">privacy notice</Link>,
            and I will not include patient-identifiable or confidential research data.
          </span>
        </label>
        <div className="bio-actions" style={{ marginTop: 8 }}>
          <Button type="submit" className="bio-primary" disabled={!privacy}>
            Start a conversation
          </Button>
        </div>
        <p className="small muted" style={{ marginTop: 12 }}>
          Opens your email client to {CONTACT_EMAIL}. If mail is not configured on your device, copy the address and
          send manually.
        </p>
      </form>
    </div>
  );
}
