-- Create condominium info table (single row for the condo)
CREATE TABLE public.condominium (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  cnpj text,
  address text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.condominium ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view
CREATE POLICY "Authenticated users can view condominium"
  ON public.condominium FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert condominium"
  ON public.condominium FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- Only admins can update
CREATE POLICY "Admins can update condominium"
  ON public.condominium FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Only admins can delete
CREATE POLICY "Admins can delete condominium"
  ON public.condominium FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Add updated_at trigger
CREATE TRIGGER update_condominium_updated_at
  BEFORE UPDATE ON public.condominium
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default empty row
INSERT INTO public.condominium (name) VALUES ('Meu Condomínio');