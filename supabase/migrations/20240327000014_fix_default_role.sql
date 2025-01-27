-- Update the default role in profiles table
ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'customer'::user_role;

-- Update any existing profiles with role 'agent' to 'customer' if they weren't explicitly set
-- Only update agents, preserve admin roles
UPDATE public.profiles 
SET role = 'customer'::user_role 
WHERE role = 'agent'::user_role 
AND role != 'admin'; 