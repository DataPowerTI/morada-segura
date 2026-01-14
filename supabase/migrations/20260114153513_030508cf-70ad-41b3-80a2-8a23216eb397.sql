
-- Create table for temporary rental guests (Airbnb, etc.)
CREATE TABLE public.rental_guests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  document TEXT,
  photo_url TEXT,
  vehicle_plate TEXT,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  entry_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  exit_time TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rental_guests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view rental guests"
ON public.rental_guests
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert rental guests"
ON public.rental_guests
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update rental guests"
ON public.rental_guests
FOR UPDATE
USING (true);

-- Add index for faster lookups
CREATE INDEX idx_rental_guests_unit_id ON public.rental_guests(unit_id);
CREATE INDEX idx_rental_guests_entry_time ON public.rental_guests(entry_time DESC);
