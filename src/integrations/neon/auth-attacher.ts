import { createMiddleware } from "@tanstack/react-start";
import { neonAuth } from "./auth-client";

/** Anonymous public serverFns must not wait forever on Neon Auth `/token` (401/slow). */
const TOKEN_ATTACH_MS = 1_500;

/** Attach Neon Auth JWT to server-function requests (mirrors prior Supabase Bearer flow). */
export const attachNeonAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  let token: string | undefined;
  try {
    const raced = await Promise.race([
      neonAuth.token(),
      new Promise<{ data: null }>((resolve) => {
        setTimeout(() => resolve({ data: null }), TOKEN_ATTACH_MS);
      }),
    ]);
    token = raced.data?.token;
  } catch {
    token = undefined;
  }
  return next({
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
});
