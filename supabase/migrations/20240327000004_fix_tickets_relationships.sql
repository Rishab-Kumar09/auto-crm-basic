-- Drop existing foreign key if it exists
ALTER TABLE public.tickets 
DROP CONSTRAINT IF EXISTS tickets_assigned_to_fkey;

-- Add proper foreign key constraint for assigned_to
ALTER TABLE public.tickets 
ADD CONSTRAINT tickets_assigned_to_fkey 
FOREIGN KEY (assigned_to) 
REFERENCES public.profiles(id);

-- Add indexes to improve query performance
CREATE INDEX IF NOT EXISTS tickets_assigned_to_idx ON public.tickets(assigned_to);
CREATE INDEX IF NOT EXISTS tickets_created_by_idx ON public.tickets(created_by);
CREATE INDEX IF NOT EXISTS tickets_customer_id_idx ON public.tickets(customer_id); 