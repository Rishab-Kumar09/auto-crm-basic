-- Drop existing view policy
DROP POLICY IF EXISTS "Users can view companies" ON public.companies;

-- Create a new policy that allows public access to view companies
CREATE POLICY "Anyone can view companies"
ON public.companies
FOR SELECT
USING (true); 