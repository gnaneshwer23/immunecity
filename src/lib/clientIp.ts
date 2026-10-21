/* Client identity for rate limiting. The site is served directly by Vercel (no Cloudflare),
   so `cf-connecting-ip` is just a client-supplied header and must not be trusted — rotating it
   would mint a fresh rate-limit bucket per request. Vercel overwrites `x-real-ip` and
   `x-forwarded-for` with the connecting client's address. */
export function clientIp(headers: Headers): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const vercel = headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercel) return vercel;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "anon";
}
