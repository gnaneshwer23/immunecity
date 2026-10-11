import { createMiddleware } from "@tanstack/react-start";
import { neonAuth } from "./auth-client";

/** Attach Neon Auth JWT to server-function requests (mirrors prior Supabase Bearer flow). */
export const attachNeonAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  let token: string | undefined;
  try {
    const { data } = await neonAuth.token();
    token = data?.token;
  } catch {
    token = undefined;
  }
  return next({
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
});
