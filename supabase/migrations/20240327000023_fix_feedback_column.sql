-- Rename created_by column to user_id in feedback table
ALTER TABLE public.feedback 
RENAME COLUMN created_by TO user_id;

-- Update the foreign key constraint name to match
ALTER TABLE public.feedback
DROP CONSTRAINT IF EXISTS feedback_created_by_fkey,
ADD CONSTRAINT feedback_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id);

-- Create an index on user_id for better query performance
CREATE INDEX IF NOT EXISTS feedback_user_id_idx ON public.feedback(user_id); 