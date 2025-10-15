-- Fix state and zip_code columns by correctly parsing business_address
UPDATE public.business_settings
SET 
  state = CASE
    WHEN business_address LIKE '%,%,%,%' THEN
      -- Extract state from "Street, City, State, Zip" format
      TRIM(SPLIT_PART(SPLIT_PART(business_address, ',', 3), ' ', 1))
    ELSE state
  END,
  zip_code = CASE
    WHEN business_address LIKE '%,%,%,%' THEN
      -- Extract zip from last part
      TRIM(SPLIT_PART(business_address, ',', 4))
    ELSE zip_code
  END
WHERE business_address IS NOT NULL 
  AND business_address LIKE '%,%,%,%';