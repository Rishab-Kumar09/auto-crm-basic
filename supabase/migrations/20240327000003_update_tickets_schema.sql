-- Add customer_id column to tickets table
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.profiles(id);

-- Update existing tickets to set customer_id equal to created_by
UPDATE public.tickets 
SET customer_id = created_by 
WHERE customer_id IS NULL; 