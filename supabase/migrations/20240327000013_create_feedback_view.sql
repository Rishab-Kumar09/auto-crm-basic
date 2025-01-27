-- Create a view for feedback with ticket details
CREATE OR REPLACE VIEW public.feedback_with_details AS
SELECT 
    f.id,
    f.rating,
    f.comment,
    f.created_by,
    f.created_at,
    f.ticket_id,
    t.title as ticket_title,
    t.status as ticket_status,
    p.full_name as customer_name,
    p.email as customer_email
FROM public.feedback f
LEFT JOIN public.tickets t ON t.id = f.ticket_id
LEFT JOIN public.profiles p ON p.id = f.created_by;

-- Grant access to authenticated users
GRANT SELECT ON public.feedback_with_details TO authenticated; 