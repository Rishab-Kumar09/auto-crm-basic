-- Rename created_by column to user_id in comments table
ALTER TABLE public.comments 
RENAME COLUMN created_by TO user_id;

-- Update the foreign key constraint name to match
ALTER TABLE public.comments
DROP CONSTRAINT IF EXISTS comments_created_by_fkey,
ADD CONSTRAINT comments_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id);

-- Create an index on user_id for better query performance
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON public.comments(user_id); 