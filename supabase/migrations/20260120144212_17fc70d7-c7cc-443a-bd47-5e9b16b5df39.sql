-- Add must_change_password column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

-- Add email column to profiles for easier admin management
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create default admin user function (to be called once)
-- This will create admin@admin.com with password 'admin123' on first signup