-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can update their tickets" ON public.tickets;

-- Policy for users to view tickets
CREATE POLICY "Users can view their tickets"
ON public.tickets FOR SELECT
TO authenticated
USING (
  auth.uid() = created_by
  OR
  auth.uid() = assigned_to
  OR
  auth.uid() = customer_id
  OR
  (
    -- Admin can view tickets from their company
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    AND
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  )
  OR
  (
    -- Agent can view tickets from their company
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'agent'
    AND
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- Policy for users to create tickets
CREATE POLICY "Users can create tickets"
ON public.tickets FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  OR
  auth.uid() = customer_id
);

-- Policy for users to update tickets
CREATE POLICY "Users can update their tickets"
ON public.tickets FOR UPDATE
TO authenticated
USING (
  auth.uid() = created_by
  OR
  auth.uid() = assigned_to
  OR
  auth.uid() = customer_id
  OR
  (
    -- Admin can update tickets from their company
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    AND
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  auth.uid() = created_by
  OR
  auth.uid() = assigned_to
  OR
  auth.uid() = customer_id
  OR
  (
    -- Admin can update tickets from their company
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    AND
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  )
); 