-- Enable pgcrypto extension for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Test that encryption/decryption is working
DO $$
DECLARE
    test_token TEXT := 'test_access_token_123';
    encrypted_value TEXT;
    decrypted_value TEXT;
BEGIN
    -- Test encryption
    SELECT public.encrypt_token(test_token) INTO encrypted_value;
    RAISE NOTICE 'Encrypted value: %', encrypted_value;
    
    -- Test decryption
    SELECT public.decrypt_token(encrypted_value) INTO decrypted_value;
    RAISE NOTICE 'Decrypted value: %', decrypted_value;
    
    -- Verify they match
    IF decrypted_value = test_token THEN
        RAISE NOTICE 'Encryption/decryption test PASSED';
    ELSE
        RAISE EXCEPTION 'Encryption/decryption test FAILED: % != %', decrypted_value, test_token;
    END IF;
END $$;