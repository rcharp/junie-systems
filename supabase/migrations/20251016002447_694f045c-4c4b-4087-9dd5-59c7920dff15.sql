-- Add missing business types from the reference images
INSERT INTO public.business_types (value, label, is_active, display_order) VALUES
  ('home-services', 'Home Services', true, 25),
  ('emergency-restoration', 'Emergency Restoration', true, 26),
  ('pet-grooming', 'Pet Grooming', true, 27),
  ('salons', 'Salons & Beauty', true, 28),
  ('small-business', 'Small Business', true, 29),
  ('funeral-homes', 'Funeral Homes', true, 30),
  ('electronics-repair', 'Electronics Repair', true, 31),
  ('franchises', 'Franchises', true, 32),
  ('automotive', 'Automotive Services', true, 33),
  ('electricians', 'Electricians', true, 34),
  ('financial', 'Financial Services', true, 35),
  ('chiropractors', 'Chiropractors', true, 36),
  ('veterinary', 'Veterinary', true, 37),
  ('locksmiths', 'Locksmiths', true, 38),
  ('insurance', 'Insurance', true, 39)
ON CONFLICT (value) DO NOTHING;