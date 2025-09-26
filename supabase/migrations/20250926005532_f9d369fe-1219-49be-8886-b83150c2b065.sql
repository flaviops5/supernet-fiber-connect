-- Ensure the current user has admin role
DO $$
DECLARE
    current_user_id uuid := 'c14740c7-baea-4b11-bb29-a51810853811'; -- From auth logs
BEGIN
    -- Create profile if doesn't exist
    INSERT INTO public.profiles (user_id, name, email)
    SELECT current_user_id, 'Admin', email
    FROM auth.users 
    WHERE id = current_user_id
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Ensure admin role exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (current_user_id, 'admin')
    ON CONFLICT (user_id, role) DO UPDATE SET role = 'admin';
    
    -- Remove any viewer role for this user
    DELETE FROM public.user_roles 
    WHERE user_id = current_user_id AND role = 'viewer';
END $$;