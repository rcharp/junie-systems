-- Add missing business types
-- Existing types: Electric Services, Garage Door, Handyman, HVAC, Landscaping, Pest Control, Plumbing, 
-- Pool & Spa, Cleaning, Roofing, Gym, Health & Wellness, Physician, Dentist, Mechanic, Doctor's Office, Real Estate, Restaurant

-- Add Construction
INSERT INTO public.business_types (label, value, is_active, display_order)
VALUES ('Construction', 'construction', true, 20)
ON CONFLICT (value) DO NOTHING;

-- Add Accounting
INSERT INTO public.business_types (label, value, is_active, display_order)
VALUES ('Accounting', 'accounting', true, 21)
ON CONFLICT (value) DO NOTHING;

-- Add Law Firm
INSERT INTO public.business_types (label, value, is_active, display_order)
VALUES ('Law Firm', 'law-firm', true, 22)
ON CONFLICT (value) DO NOTHING;

-- Add Property Management
INSERT INTO public.business_types (label, value, is_active, display_order)
VALUES ('Property Management', 'property-management', true, 23)
ON CONFLICT (value) DO NOTHING;

-- Note: Plumbing, HVAC, Electricians (Electric Services), Real Estate already exist in the database