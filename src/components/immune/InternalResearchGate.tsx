import { useEffect, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { requireInternalResearchAccess } from "@/lib/research/internalProgramme.functions";

/** Child tools never mount until a server-verified administrator is present. */
export default function InternalResearchGate({ children }: { children: ReactNode }) {
  const verify = useServerFn(requireInternalResearchAccess);
  const [access, setAccess] = useState<"pending" | "denied" | "allowed">("pending");
  useEffect(() => {
    let active = true;
    verify().then((r) => { if (active) setAccess(r.allowed ? "allowed" : "denied"); }).catch(() => { if (active) setAccess("denied"); });
    return () => { active = false; };
  }, [verify]);
  if (access !== "allowed") return <main className="page"><h1>Internal research tool</h1><p role="status">{access === "pending" ? "Checking access…" : "Administrator access is required. Sign in with a provisioned administrator account."}</p></main>;
  return <>{children}</>;
}
