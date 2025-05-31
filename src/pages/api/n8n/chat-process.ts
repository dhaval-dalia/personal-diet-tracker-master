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
    const { user_id, message, created_at, context } = req.body;

    if (!user_id || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: {
          user_id: !user_id,
          message: !message
        }
      });
    }

    // Fetch user profile data for context
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      // Continue without profile data
    }

    // Get n8n webhook URL from environment variable
    const n8nWebhookUrl = process.env.N8N_CHAT_WEBHOOK_URL;
    
    if (!n8nWebhookUrl) {
      console.error('N8N_CHAT_WEBHOOK_URL is not configured');
      return res.status(500).json({ 
        error: 'Chat service configuration error',
        message: 'Chat service is not properly configured. Please try again later.'
      });
    }

    console.log('Sending request to n8n webhook:', n8nWebhookUrl);

    // Send request to n8n
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id,
        message,
        created_at: created_at || new Date().toISOString(),
        userProfile: profileData || null,
        context: context || {
          platform: 'web',
          source: 'chat-widget'
        }
      }),
    });

    if (!n8nResponse.ok) {
      const errorData = await n8nResponse.json().catch(() => ({ message: 'Unknown error' }));
      console.error('n8n webhook error:', {
        status: n8nResponse.status,
        statusText: n8nResponse.statusText,
        error: errorData
      });
      throw new Error(errorData.message || `n8n webhook failed: ${n8nResponse.statusText}`);
    }

    // Try to parse the response as JSON, with a fallback for empty responses
    let botResponse;
    try {
      const responseText = await n8nResponse.text();
      botResponse = responseText ? JSON.parse(responseText) : { message: 'I received your message but could not process it at this time.' };
    } catch (parseError) {
      console.error('Error parsing n8n response:', parseError);
      botResponse = { message: 'I received your message but encountered an error processing it.' };
    }

    // Ensure we have a valid response message
    if (!botResponse.message && !botResponse.response) {
      botResponse.message = 'I received your message but could not generate a proper response.';
    }
    
    // Save bot response to database
    const { error: saveError } = await supabase
      .from('chat_interactions')
      .insert([
        {
          user_id,
          message: botResponse.message || botResponse.response,
          created_at: new Date().toISOString(),
          metadata: { ...context, is_bot: true },
          is_bot: true
        }
      ]);

    if (saveError) {
      console.error('Error saving bot response:', saveError);
      // Continue even if save fails
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(botResponse);

  } catch (error: any) {
    console.error('Error in chat process endpoint:', error);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to process your message. Please try again later.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
