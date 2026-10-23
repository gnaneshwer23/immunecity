import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkRecord } from "@/lib/evidenceCheck";
import { sourceVerificationFromLookup } from "@/lib/research/workbench";

/**
 * Confirms an identifier the user already typed.
 * A failed lookup returns unverified and no PMID or DOI.
 */
export const lookupWorkbenchSource = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      pmid: z.string().max(16).optional(),
      doi: z.string().max(240).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const pmid = data.pmid?.trim() ?? "";
    const doi = data.doi?.trim() ?? "";
    const pmidOk = /^\d{6,9}$/.test(pmid);
    const doiOk = /^10\.\d{4,9}\//.test(doi);
    if (!pmidOk && !doiOk) return sourceVerificationFromLookup({ ok: false });
    try {
      const res = await checkRecord({
        id: "workbench",
        node_name: "",
        source_ref: null,
        pmid: pmidOk ? pmid : null,
        doi: !pmidOk && doiOk ? doi : null,
      });
      if (res.status !== "verified") return sourceVerificationFromLookup({ ok: false });
      return sourceVerificationFromLookup({
        ok: true,
        pmid: pmidOk ? pmid : null,
        doi: doiOk ? doi : null,
      });
    } catch {
      return sourceVerificationFromLookup({ ok: false });
    }
  });
