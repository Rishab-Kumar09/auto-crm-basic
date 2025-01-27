-- Create basic schema for the CRM system
do $$ begin
    create type user_role as enum ('admin', 'agent', 'customer');
exception when duplicate_object then null;
end $$;

-- Create a table for user profiles
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade primary key,
    email text unique not null,
    full_name text,
    role user_role not null default 'customer',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

-- Create policies
create policy "Users can view their own profile"
    on public.profiles for select
    using ( auth.uid() = id );

create policy "Users can update their own profile"
    on public.profiles for update
    using ( auth.uid() = id );

-- Create a trigger to set updated_at on profiles
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists handle_profiles_updated_at on public.profiles;
create trigger handle_profiles_updated_at
    before update on public.profiles
    for each row
    execute procedure public.handle_updated_at();

-- Create a function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, email, full_name, role)
    values (
        new.id,
        new.email,
        new.raw_user_meta_data->>'full_name',
        'customer'
    );
    return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if it exists
drop trigger if exists on_auth_user_created on auth.users;

-- Trigger the function every time a user is created
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- Create companies table
create table if not exists public.companies (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    description text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    created_by uuid references public.profiles(id)
);

-- Enable RLS on companies
alter table public.companies enable row level security;

-- Create tickets table
create table if not exists public.tickets (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    description text,
    status text not null default 'open',
    priority text not null default 'medium',
    assigned_to uuid references public.profiles(id),
    company_id uuid references public.companies(id),
    created_by uuid references public.profiles(id),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on tickets
alter table public.tickets enable row level security;

-- Drop existing triggers if they exist
drop trigger if exists handle_companies_updated_at on public.companies;
drop trigger if exists handle_tickets_updated_at on public.tickets;

-- Create trigger for companies updated_at
create trigger handle_companies_updated_at
    before update on public.companies
    for each row
    execute procedure public.handle_updated_at();

-- Create trigger for tickets updated_at
create trigger handle_tickets_updated_at
    before update on public.tickets
    for each row
    execute procedure public.handle_updated_at();

-- Create comments table
create table if not exists public.comments (
    id uuid default gen_random_uuid() primary key,
    content text not null,
    ticket_id uuid references public.tickets(id) on delete cascade,
    created_by uuid references public.profiles(id),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on comments
alter table public.comments enable row level security;

-- Drop existing trigger if it exists
drop trigger if exists handle_comments_updated_at on public.comments;

-- Create trigger for comments updated_at
create trigger handle_comments_updated_at
    before update on public.comments
    for each row
    execute procedure public.handle_updated_at(); 