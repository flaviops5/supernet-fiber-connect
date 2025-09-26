-- Create profiles and roles for all existing users
DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- Loop through all users and create profiles/roles
    FOR user_record IN 
        SELECT id, email, 
               COALESCE(raw_user_meta_data ->> 'name', raw_user_meta_data ->> 'full_name', 'Usuário') as display_name
        FROM auth.users 
    LOOP
        -- Create profile
        INSERT INTO public.profiles (user_id, name, email)
        VALUES (user_record.id, user_record.display_name, user_record.email)
        ON CONFLICT (user_id) DO UPDATE SET 
            name = EXCLUDED.name,
            email = EXCLUDED.email;
        
        -- Create role (first user gets admin, others get viewer)
        INSERT INTO public.user_roles (user_id, role)
        VALUES (
            user_record.id, 
            CASE 
                WHEN user_record.id = 'c14740c7-baea-4b11-bb29-a51810853811' THEN 'admin'::user_role
                ELSE 'viewer'::user_role
            END
        )
        ON CONFLICT (user_id, role) DO NOTHING;
    END LOOP;
END $$;