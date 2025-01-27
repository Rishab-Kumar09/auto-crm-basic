-- Create feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id uuid REFERENCES public.tickets(id) ON DELETE CASCADE,
    rating int CHECK (rating >= 1 AND rating <= 5),
    comment text,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS feedback_ticket_id_idx ON public.feedback(ticket_id);
CREATE INDEX IF NOT EXISTS feedback_created_by_idx ON public.feedback(created_by);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view feedback for tickets they have access to"
ON public.feedback FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.tickets t
        LEFT JOIN public.profiles p ON p.id = t.customer_id
        WHERE t.id = feedback.ticket_id
        AND (
            t.customer_id = auth.uid()
            OR t.assigned_to = auth.uid()
            OR t.created_by = auth.uid()
            OR (
                p.company_id = (
                    SELECT company_id 
                    FROM public.profiles 
                    WHERE id = auth.uid()
                )
                AND EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE id = auth.uid()
                    AND role = 'admin'
                )
            )
        )
    )
);

CREATE POLICY "Users can create feedback for their tickets"
ON public.feedback FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.tickets t
        WHERE t.id = ticket_id
        AND t.customer_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own feedback"
ON public.feedback FOR UPDATE
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own feedback"
ON public.feedback FOR DELETE
USING (created_by = auth.uid()); 