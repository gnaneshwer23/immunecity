import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { neonAuth } from "@/integrations/neon/auth-client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await neonAuth.getUser();
    if (!data?.user) throw redirect({ to: "/auth", search: { redirect: location.pathname } });
  },
  component: () => <Outlet />,
});
