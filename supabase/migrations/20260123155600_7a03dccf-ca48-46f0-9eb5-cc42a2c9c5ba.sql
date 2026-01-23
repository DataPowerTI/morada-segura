-- Create enum for booking periods
CREATE TYPE public.booking_period AS ENUM ('full_day', 'morning', 'afternoon');

-- Create party room bookings table
CREATE TABLE public.party_room_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  period booking_period NOT NULL DEFAULT 'full_day',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Prevent double booking for same period on same date
  CONSTRAINT unique_booking_per_period UNIQUE (booking_date, period)
);

-- Enable RLS
ALTER TABLE public.party_room_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view bookings"
ON public.party_room_bookings
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert bookings"
ON public.party_room_bookings
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update bookings"
ON public.party_room_bookings
FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete bookings"
ON public.party_room_bookings
FOR DELETE
USING (is_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_party_room_bookings_updated_at
BEFORE UPDATE ON public.party_room_bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();