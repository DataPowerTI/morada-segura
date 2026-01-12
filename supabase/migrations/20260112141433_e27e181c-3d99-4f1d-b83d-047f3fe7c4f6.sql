-- Create vehicles table
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  plate TEXT NOT NULL,
  model TEXT NOT NULL,
  color TEXT,
  type TEXT DEFAULT 'car',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for plate search
CREATE INDEX idx_vehicles_plate ON public.vehicles(plate);

-- Enable RLS
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view vehicles"
ON public.vehicles
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert vehicles"
ON public.vehicles
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update vehicles"
ON public.vehicles
FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete vehicles"
ON public.vehicles
FOR DELETE
USING (is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_vehicles_updated_at
BEFORE UPDATE ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();