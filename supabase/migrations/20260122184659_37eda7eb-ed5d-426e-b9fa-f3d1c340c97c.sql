-- Add protocol_number column to parcels table
ALTER TABLE public.parcels 
ADD COLUMN IF NOT EXISTS protocol_number TEXT UNIQUE;

-- Create function to generate protocol number (format: YYYYMMDD-XXX)
CREATE OR REPLACE FUNCTION public.generate_parcel_protocol()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  today_date TEXT;
  seq_num INTEGER;
  new_protocol TEXT;
BEGIN
  -- Get today's date in YYYYMMDD format
  today_date := to_char(CURRENT_DATE, 'YYYYMMDD');
  
  -- Count existing parcels for today and add 1
  SELECT COALESCE(
    (SELECT COUNT(*) + 1 FROM public.parcels 
     WHERE protocol_number LIKE today_date || '-%'),
    1
  ) INTO seq_num;
  
  -- Generate protocol: YYYYMMDD-XXX (e.g., 20250122-001)
  new_protocol := today_date || '-' || LPAD(seq_num::TEXT, 3, '0');
  
  NEW.protocol_number := new_protocol;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_generate_parcel_protocol ON public.parcels;

CREATE TRIGGER trigger_generate_parcel_protocol
  BEFORE INSERT ON public.parcels
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_parcel_protocol();