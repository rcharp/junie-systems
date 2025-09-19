-- Add full business type name column to business_settings table
ALTER TABLE public.business_settings 
ADD COLUMN business_type_full_name text;

-- Update existing records with full business type names
UPDATE public.business_settings 
SET business_type_full_name = CASE 
  WHEN business_type = 'hvac' THEN 'HVAC & Air Conditioning'
  WHEN business_type = 'plumbing' THEN 'Plumbing'
  WHEN business_type = 'electrical' THEN 'Electrical Services'
  WHEN business_type = 'roofing' THEN 'Roofing Services'
  WHEN business_type = 'landscaping' THEN 'Landscaping Services'
  WHEN business_type = 'cleaning' THEN 'Cleaning Services'
  WHEN business_type = 'pest_control' THEN 'Pest Control'
  WHEN business_type = 'handyman' THEN 'Handyman Services'
  WHEN business_type = 'painting' THEN 'Painting Services'
  WHEN business_type = 'flooring' THEN 'Flooring Services'
  WHEN business_type = 'appliance_repair' THEN 'Appliance Repair'
  WHEN business_type = 'locksmith' THEN 'Locksmith Services'
  WHEN business_type = 'garage_door' THEN 'Garage Door Services'
  WHEN business_type = 'pool_service' THEN 'Pool & Spa Services'
  WHEN business_type = 'solar' THEN 'Solar Installation'
  WHEN business_type = 'security' THEN 'Security Systems'
  WHEN business_type = 'moving' THEN 'Moving Services'
  WHEN business_type = 'junk_removal' THEN 'Junk Removal'
  WHEN business_type = 'carpet_cleaning' THEN 'Carpet Cleaning'
  WHEN business_type = 'window_cleaning' THEN 'Window Cleaning'
  ELSE business_type
END
WHERE business_type IS NOT NULL;