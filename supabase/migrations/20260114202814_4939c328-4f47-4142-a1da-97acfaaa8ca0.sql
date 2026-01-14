-- Add unit_id column to service_providers table
ALTER TABLE public.service_providers 
ADD COLUMN unit_id UUID REFERENCES public.units(id);