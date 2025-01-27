-- Drop existing policies if they exist
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
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'agent')
);

-- Policy for users to create tickets
CREATE POLICY "Users can create tickets"
ON public.tickets FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
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
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  auth.uid() = created_by
  OR
  auth.uid() = assigned_to
  OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
); 