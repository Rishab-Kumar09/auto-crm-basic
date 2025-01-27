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

async function createTestUser() {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: 'test.user2@gmail.com',
      password: 'testpassword123',
      options: {
        data: {
          full_name: 'Test User'
        }
      }
    });

    if (error) {
      console.error('Error creating user:', error.message);
      return;
    }

    console.log('User created successfully:', data);

    // Now let's try to sign in with the created user
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'test.user2@gmail.com',
      password: 'testpassword123'
    });

    if (signInError) {
      console.error('Error signing in:', signInError.message);
      return;
    }

    console.log('Signed in successfully:', signInData);

    // Let's check the profile
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

createTestUser(); 