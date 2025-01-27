-- Add company_id column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS profiles_company_id_idx ON public.profiles(company_id);

-- Update RLS policies to allow users to see their own company_id
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (
    auth.uid() = id
    OR
    (
        -- Allow admins to view profiles from their company
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
        AND
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
); 