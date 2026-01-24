-- Add tower configuration columns to condominium table
ALTER TABLE public.condominium 
ADD COLUMN IF NOT EXISTS tower_count integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS tower_prefix text DEFAULT 'Bloco',
ADD COLUMN IF NOT EXISTS tower_naming text DEFAULT 'letters';

-- tower_prefix: 'Torre' or 'Bloco'
-- tower_naming: 'letters' (A, B, C...) or 'numbers' (1, 2, 3...)