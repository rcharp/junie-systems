-- Fix state column by parsing business_address correctly
UPDATE public.business_settings
SET state = SUBSTRING(
  REGEXP_REPLACE(
    SPLIT_PART(business_address, ',', 3),
    '^\s*([A-Z]{2})\s+\d{5}.*$',
    '\1'
  ),
  1, 2
)
WHERE business_address IS NOT NULL 
  AND business_address LIKE '%,%,%'
  AND TRIM(SPLIT_PART(business_address, ',', 3)) ~ '^[A-Z]{2}\s+\d{5}';