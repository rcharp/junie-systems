-- Extract state correctly from business_address
UPDATE public.business_settings
SET state = TRIM(SPLIT_PART(business_address, ',', 3))
WHERE business_address IS NOT NULL 
  AND business_address LIKE '%,%,%,%'
  AND (state IS NULL OR state = '');