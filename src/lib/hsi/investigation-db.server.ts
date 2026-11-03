import { getSqlClient } from "@/lib/db.server";
import type { InvestigationDatabase, InvestigationSql } from "./vendor/investigationBackend";

/** Product DB only. app.hsi_research_owner is local to each transaction, never shared on a pooled session. */
export function isiInvestigationDatabase(ownerId: string): InvestigationDatabase {
  async function transaction<T>(work: (sql: InvestigationSql) => Promise<T>): Promise<T> {
    return getSqlClient().begin(async (tx) => {
      await tx`SELECT set_config('app.hsi_research_owner',${ownerId},true)`;
      return work({ query: async (text, values) => [...await tx.unsafe(text, values as never[])] as Array<Record<string, unknown>> });
    }) as Promise<T>;
  }
  return { transaction, query: (text, values) => transaction((sql) => sql.query(text, values)) };
}
