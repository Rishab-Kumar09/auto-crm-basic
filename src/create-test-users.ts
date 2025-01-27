import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../.env');
const envConfig = dotenv.parse(readFileSync(envPath));

const supabase = createClient(
  envConfig.VITE_SUPABASE_URL,
  envConfig.VITE_SUPABASE_ANON_KEY
);

const testUsers = [
  {
    email: 'admin@test.com',
    password: 'admin123456',
    role: 'admin',
    fullName: 'Admin User',
    company: {
      name: 'Tech Support Inc.',
      description: 'Professional IT Support Services'
    }
  },
  {
    email: 'agent1@test.com',
    password: 'agent123456',
    role: 'agent',
    fullName: 'Agent One'
  },
  {
    email: 'agent2@test.com',
    password: 'agent123456',
    role: 'agent',
    fullName: 'Agent Two'
  },
  {
    email: 'customer1@test.com',
    password: 'customer123456',
    role: 'customer',
    fullName: 'Customer One'
  },
  {
    email: 'customer2@test.com',
    password: 'customer123456',
    role: 'customer',
    fullName: 'Customer Two'
  }
];

async function createTestUser(userData: typeof testUsers[0]) {
  try {
    console.log(`\nCreating user: ${userData.email} (${userData.role})`);
    
    // Create the user
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          full_name: userData.fullName
        }
      }
    });

    if (error) {
      console.error('Error creating user:', error.message);
      return;
    }

    console.log('User created successfully');

    // Update the user's role in the profiles table
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: userData.role })
      .eq('id', data.user!.id);

    if (updateError) {
      console.error('Error updating user role:', updateError.message);
      return;
    }

    console.log('User role updated successfully');

    // If this is an admin user, create their company
    if (userData.role === 'admin' && userData.company) {
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: userData.company.name,
          description: userData.company.description,
          created_by: data.user!.id
        })
        .select()
        .single();

      if (companyError) {
        console.error('Error creating company:', companyError.message);
      } else {
        console.log('Company created successfully:', companyData);
      }
    }

    // Test signing in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: userData.email,
      password: userData.password
    });

    if (signInError) {
      console.error('Error signing in:', signInError.message);
      return;
    }

    console.log('Sign in test successful');

    // Get the profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', signInData.user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError.message);
      return;
    }

    console.log('User profile:', profile);
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

async function createAllTestUsers() {
  for (const userData of testUsers) {
    await createTestUser(userData);
  }
  console.log('\nAll test users created successfully!');
  console.log('\nCredentials:');
  testUsers.forEach(user => {
    console.log(`\n${user.role.toUpperCase()}:`);
    console.log(`Email: ${user.email}`);
    console.log(`Password: ${user.password}`);
    if (user.company) {
      console.log(`Company: ${user.company.name}`);
    }
  });
}

createAllTestUsers(); 