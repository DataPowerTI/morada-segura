-- Fix: Restrict units table SELECT to admins and operators only
-- This prevents unauthorized access to resident PII (names, phone numbers)

DROP POLICY IF EXISTS "Authenticated users can view units" ON public.units;

CREATE POLICY "Admins and operators can view units"
  ON public.units FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'operator'));