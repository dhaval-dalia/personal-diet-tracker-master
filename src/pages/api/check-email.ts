// src/pages/api/check-email.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Create a service role client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role key for admin access
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      exists: false, 
      error: 'Method not allowed' 
    });
  }

  const { email } = req.body;
  console.log('Server-side email check for:', email);

  if (!email) {
    return res.status(400).json({ 
      exists: false, 
      error: 'Email is required' 
    });
  }

  try {
    // Use the admin client to query auth.users directly
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('Supabase Auth API error:', error);
      return res.status(500).json({ 
        exists: false, 
        error: 'Failed to check email availability' 
      });
    }

    // Check if email exists in the users list
    const emailExists = data.users.some(user => user.email === email);
    
    console.log('Email exists check result:', emailExists);

    return res.status(200).json({ 
      exists: emailExists,
      error: null 
    });

  } catch (error) {
    console.error('Unexpected server error:', error);
    return res.status(500).json({ 
      exists: false, 
      error: 'Internal server error' 
    });
  }
}
