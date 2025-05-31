import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../services/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Request body:', req.body);
    const { user_id, message, created_at, context } = req.body;

    if (!user_id || !message) {
      console.log('Missing required fields:', { user_id, message });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('Processing chat message:', { user_id, message, created_at, context });

    // Save the chat interaction
    const chatData = {
      user_id,
      message,
      created_at: created_at || new Date().toISOString(),
      metadata: context || {},
      is_bot: false
    };

    console.log('Attempting to save chat interaction:', chatData);

    const { data: savedChat, error: chatError } = await supabase
      .from('chat_interactions')
      .insert([chatData])
      .select()
      .single();

    if (chatError) {
      console.error('Supabase error details:', {
        code: chatError.code,
        message: chatError.message,
        details: chatError.details,
        hint: chatError.hint
      });

      // Check if it's an RLS error
      if (chatError.code === '42501') {
        return res.status(403).json({ 
          error: 'Permission denied',
          details: 'You do not have permission to save chat interactions'
        });
      }
      return res.status(500).json({ 
        error: 'Failed to save chat interaction',
        details: chatError.message
      });
    }

    console.log('Chat interaction saved successfully:', savedChat);

    // Return a JSON response
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({
      success: true,
      message: 'Message received and processed',
      data: savedChat
    });

  } catch (error: any) {
    console.error('Error in chat endpoint:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 