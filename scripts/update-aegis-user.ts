#!/usr/bin/env tsx
/**
 * Update existing user password in the Aegis dashboard
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

async function updateUserPassword() {
  const email = 'aegis@davidfrench.io';
  const password = 'Aegis1!';

  try {
    // First, get the user by email
    const { data: users, error: fetchError } = await supabase.auth.admin.listUsers();
    
    if (fetchError) {
      console.error('Error fetching users:', fetchError);
      return;
    }

    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      console.error('User not found with email:', email);
      return;
    }

    // Update the user's password
    const { data, error } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        password: password
      }
    );

    if (error) {
      console.error('Error updating user password:', error);
      return;
    }

    console.log('✅ Password updated successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('User ID:', user.id);
    console.log('');
    console.log('You can now log in at: https://aegis.davidfrench.io');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

updateUserPassword();