ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMPTZ;

DROP POLICY IF EXISTS "public shared reports" ON public.reports;
CREATE POLICY "public shared reports"
ON public.reports
FOR SELECT
USING (is_public = true AND (share_expires_at IS NULL OR share_expires_at > now()));