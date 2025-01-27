-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;

-- Create policy to allow users to create their own profile
CREATE POLICY "Users can create their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = id
); 