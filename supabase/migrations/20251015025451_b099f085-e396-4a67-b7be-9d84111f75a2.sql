-- Remove cascade delete from todos table
-- First, we need to find and drop any existing foreign key constraints on user_id
DO $$ 
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the foreign key constraint name
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name = 'todos'
      AND kcu.column_name = 'user_id'
      AND tc.table_schema = 'public';
    
    -- Drop the constraint if it exists
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.todos DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Dropped foreign key constraint: %', constraint_name;
    END IF;
END $$;

-- Now add the foreign key back without cascade delete
-- This way todos will persist even if the user is deleted
ALTER TABLE public.todos
ADD CONSTRAINT todos_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- Update any orphaned todos (those without a user_id) to be visible to admins
-- This is just informational - the RLS policies already allow admins to see all todos

COMMENT ON CONSTRAINT todos_user_id_fkey ON public.todos IS 'Todos persist when users are deleted (SET NULL)';