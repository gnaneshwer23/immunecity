/**
 * Client stand-in for the Postgres driver. The real driver is `driver.server.ts`.
 * Header and auth code must never construct a database connection in the browser.
 */
function serverOnly(): never {
  throw new Error("Database is server-only");
}

export function getDb(): never {
  return serverOnly();
}

export function getSqlClient(): never {
  return serverOnly();
}
