-- Fix the normalize_phone function to have a stable search_path
CREATE OR REPLACE FUNCTION normalize_phone(phone text) RETURNS text AS $$
BEGIN
  IF phone IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove all non-digit characters
  RETURN REGEXP_REPLACE(phone, '[^0-9]', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public;