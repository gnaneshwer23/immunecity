/** ISI owns its database; never reuse the HSI substrate connection. */
export function isiDatabaseConnectionOptions(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Invalid ISI PostgreSQL connection URL"); }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("ISI requires PostgreSQL");
  if (!/^(?:[a-z0-9.-]+|\[::1\])$/i.test(url.hostname)) throw new Error("Invalid database hostname");
  if (/ep-restless-dew|red-wave/i.test(url.hostname)) throw new Error("HSI substrate database must not be used by ISI");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const mode = url.searchParams.get("sslmode");
  if (!local && mode && !["require", "verify-ca", "verify-full"].includes(mode)) throw new Error("Remote ISI databases require verified TLS");
  const tls = !local || (mode !== null && mode !== "disable");
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  return { url: url.toString(), ssl: tls ? { rejectUnauthorized: true } : false as const };
}
