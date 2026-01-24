-- Add party room configuration columns to condominium table
ALTER TABLE public.condominium 
ADD COLUMN IF NOT EXISTS party_room_name text DEFAULT 'Salão de Festas',
ADD COLUMN IF NOT EXISTS party_room_capacity integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS party_room_rules text DEFAULT NULL;