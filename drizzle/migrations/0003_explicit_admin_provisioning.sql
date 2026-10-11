-- P0 security: stop granting admin to whichever account signs up first on an open signup path.
-- New users always receive the 'user' role. Admins must be provisioned explicitly, e.g.:
--   INSERT INTO public.user_roles (user_id, role) VALUES ('<uuid>', 'admin')
--   ON CONFLICT (user_id, role) DO NOTHING;
-- Existing admin rows are left unchanged.

CREATE OR REPLACE FUNCTION public.assign_initial_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;
