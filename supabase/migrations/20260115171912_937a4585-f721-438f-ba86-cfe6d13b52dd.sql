-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can update condominium" ON public.condominium;
DROP POLICY IF EXISTS "Admins can delete condominium" ON public.condominium;
DROP POLICY IF EXISTS "Admins can insert condominium" ON public.condominium;
DROP POLICY IF EXISTS "Authenticated users can view condominium" ON public.condominium;

-- Recreate as PERMISSIVE policies (default)
CREATE POLICY "Authenticated users can view condominium" 
ON public.condominium 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admins can insert condominium" 
ON public.condominium 
FOR INSERT 
TO authenticated
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update condominium" 
ON public.condominium 
FOR UPDATE 
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete condominium" 
ON public.condominium 
FOR DELETE 
TO authenticated
USING (is_admin(auth.uid()));