#!/usr/bin/env tsx
/**
 * Create a user account in the Aegis dashboard
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function createUser() {
  const email = 'aegis@davidfrench.io';
  const password = 'Aegis1!';

  try {
    // Create the user using the Admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        name: 'Aegis Admin'
      }
    });

    if (error) {
      console.error('Error creating user:', error);
      return;
    }

    console.log('✅ User created successfully!');
    console.log('Email:', email);
    console.log('User ID:', data.user?.id);
    console.log('');
    console.log('You can now log in at: https://aegis.davidfrench.io');
    console.log('Email:', email);
    console.log('Password:', password);

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createUser();