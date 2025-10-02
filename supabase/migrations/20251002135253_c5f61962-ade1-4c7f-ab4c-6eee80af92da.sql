-- Create business_types table
CREATE TABLE IF NOT EXISTS public.business_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  value text NOT NULL UNIQUE,
  label text NOT NULL,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_types ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read business types (they're public data)
CREATE POLICY "Anyone can view active business types"
  ON public.business_types
  FOR SELECT
  USING (is_active = true);

-- Only admins can manage business types
CREATE POLICY "Admins can manage business types"
  ON public.business_types
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert existing business types
INSERT INTO public.business_types (value, label, display_order) VALUES
  ('electric', 'Electric Services', 1),
  ('garage-door', 'Garage Door Services', 2),
  ('handyman', 'Handyman Services', 3),
  ('hvac', 'HVAC & Air Conditioning', 4),
  ('landscaping', 'Landscaping', 5),
  ('pest-control', 'Pest Control', 6),
  ('plumbing', 'Plumbing', 7),
  ('pool-spa', 'Pool & Spa Services', 8),
  ('cleaning', 'Professional Cleaning', 9),
  ('roofing', 'Roofing', 10),
  ('gym', 'Gym', 11),
  ('doctor-office', 'Doctor Office', 12),
  ('dentist-office', 'Dentist Office', 13),
  ('health-wellness', 'Health and Wellness', 14),
  ('physician', 'Physician', 15),
  ('dentist', 'Dentist', 16),
  ('other', 'Other', 99);

-- Create trigger for updated_at
CREATE TRIGGER update_business_types_updated_at
  BEFORE UPDATE ON public.business_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();