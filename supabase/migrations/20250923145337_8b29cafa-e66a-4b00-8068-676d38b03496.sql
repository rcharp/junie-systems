-- Delete the current faulty calendar settings 
DELETE FROM google_calendar_settings WHERE user_id = '54b21009-f5f0-45bf-b126-d11094178719';

-- Test that the new encryption works properly
DO $$
DECLARE
    test_token TEXT := 'ya29.test_google_access_token_example';
    encrypted_value TEXT;
    decrypted_value TEXT;
BEGIN
    -- Test encryption with new function
    SELECT public.encrypt_token(test_token) INTO encrypted_value;
    RAISE NOTICE 'New encrypted value: %', encrypted_value;
    
    -- Test decryption with new function
    SELECT public.decrypt_token(encrypted_value) INTO decrypted_value;
    RAISE NOTICE 'New decrypted value: %', decrypted_value;
    
    -- Verify they match
    IF decrypted_value = test_token THEN
        RAISE NOTICE 'NEW encryption/decryption test PASSED';
    ELSE
        RAISE EXCEPTION 'NEW encryption/decryption test FAILED: % != %', decrypted_value, test_token;
    END IF;
END $$;