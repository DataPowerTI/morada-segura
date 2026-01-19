-- Fix 1: Make photos storage bucket private and update policies
UPDATE storage.buckets 
SET public = false 
WHERE id = 'photos';

-- Remove the overly permissive public policy
DROP POLICY IF EXISTS "Anyone can view photos" ON storage.objects;

-- Create new policy that requires authentication to view photos
CREATE POLICY "Authenticated users can view photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'photos');

-- Fix 2: Add DELETE policies for tables that lack them

-- DELETE policy for rental_guests
CREATE POLICY "Admins can delete rental guests"
  ON public.rental_guests FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- DELETE policy for parcels
CREATE POLICY "Admins can delete parcels"
  ON public.parcels FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- DELETE policy for service_providers
CREATE POLICY "Admins can delete service providers"
  ON public.service_providers FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));