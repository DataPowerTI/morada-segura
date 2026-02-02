-- Add party room count and naming configuration
ALTER TABLE public.condominium
ADD COLUMN party_room_count integer DEFAULT 1,
ADD COLUMN party_room_naming text DEFAULT 'numbers';

-- Add party_room_id to bookings table
ALTER TABLE public.party_room_bookings
ADD COLUMN party_room_id integer DEFAULT 1;