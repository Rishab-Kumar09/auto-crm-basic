-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create a simpler policy without recursion
CREATE POLICY "Users can view profiles"
ON public.profiles FOR SELECT
USING (
  -- Users can view their own profile
  auth.uid() = id
  OR
  -- Admins can view profiles from their company
  EXISTS (
    SELECT 1 
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    WHERE u.id = auth.uid()
    AND p.role = 'admin'
    AND p.company_id = profiles.company_id
  )
); 