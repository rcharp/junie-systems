-- Populate individual address fields from business_address for existing records
UPDATE public.business_settings
SET 
  street_address = CASE 
    WHEN business_address IS NOT NULL AND business_address != '' THEN
      -- Extract street address (everything before the first comma)
      TRIM(SPLIT_PART(business_address, ',', 1))
    ELSE NULL
  END,
  city = CASE 
    WHEN business_address IS NOT NULL AND business_address != '' THEN
      -- Extract city (second to last part before the comma)
      TRIM(SPLIT_PART(business_address, ',', GREATEST(1, LENGTH(business_address) - LENGTH(REPLACE(business_address, ',', '')) - 1)))
    ELSE NULL
  END,
  state = CASE 
    WHEN business_address IS NOT NULL AND business_address != '' THEN
      -- Extract state from last part (before zip code)
      TRIM(SPLIT_PART(TRIM(SPLIT_PART(business_address, ',', LENGTH(business_address) - LENGTH(REPLACE(business_address, ',', '')) + 1)), ' ', 1))
    ELSE NULL
  END,
  zip_code = CASE 
    WHEN business_address IS NOT NULL AND business_address != '' THEN
      -- Extract zip code from last part (after state)
      TRIM(REGEXP_REPLACE(SPLIT_PART(business_address, ',', LENGTH(business_address) - LENGTH(REPLACE(business_address, ',', '')) + 1), '^[A-Za-z]+\s+', ''))
    ELSE NULL
  END
WHERE business_address IS NOT NULL AND business_address != '';

-- Normalize all phone numbers to 10 digits only (remove formatting)
-- Function to strip phone number formatting
CREATE OR REPLACE FUNCTION normalize_phone(phone text) RETURNS text AS $$
BEGIN
  IF phone IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove all non-digit characters
  RETURN REGEXP_REPLACE(phone, '[^0-9]', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update business_settings phone numbers
UPDATE public.business_settings
SET 
  business_phone = normalize_phone(business_phone),
  twilio_phone_number = normalize_phone(twilio_phone_number),
  transfer_number = normalize_phone(transfer_number)
WHERE business_phone IS NOT NULL 
   OR twilio_phone_number IS NOT NULL 
   OR transfer_number IS NOT NULL;

-- Update call_logs phone numbers
UPDATE public.call_logs
SET 
  phone_number = normalize_phone(phone_number),
  incoming_call_phone_number = normalize_phone(incoming_call_phone_number)
WHERE phone_number IS NOT NULL 
   OR incoming_call_phone_number IS NOT NULL;

-- Update appointments phone numbers
UPDATE public.appointments
SET phone_number = normalize_phone(phone_number)
WHERE phone_number IS NOT NULL;

-- Update call_messages phone numbers
UPDATE public.call_messages
SET 
  phone_number = normalize_phone(phone_number),
  incoming_call_phone_number = normalize_phone(incoming_call_phone_number)
WHERE phone_number IS NOT NULL 
   OR incoming_call_phone_number IS NOT NULL;