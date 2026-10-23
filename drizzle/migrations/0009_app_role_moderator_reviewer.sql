-- Additive app_role labels: moderator and reviewer.
-- Existing role rows stay as they are. Evidence rows are not touched.
-- Signup continues to store only 'user'. Administrator remains 'admin'.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'reviewer';
