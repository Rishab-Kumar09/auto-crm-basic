-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create new policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (
    auth.uid() = id
    OR
    (
        -- Check if the current user is an admin
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND id IN (
                SELECT id FROM public.profiles
                WHERE role = 'admin'
            )
        )
        -- And they belong to the same company
        AND (
            SELECT company_id FROM public.profiles
            WHERE id = auth.uid()
        ) = profiles.company_id
    )
);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id); 