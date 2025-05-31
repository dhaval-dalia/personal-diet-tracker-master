// src/pages/api/n8n/recommendations.ts
// This Next.js API route acts as a secure proxy for the n8n Recommendations Workflow.
// It receives a request from the frontend (e.g., for user recommendations)
// and securely forwards it to the n8n webhook URL.

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(200).end();
  }

  // Ensure the request method is POST (or GET, depending on your n8n webhook setup)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Ensure the n8n webhook URL is configured
  const n8nWebhookUrl = process.env.N8N_RECOMMENDATIONS_WEBHOOK_URL;
  if (!n8nWebhookUrl) {
    console.error('N8N_RECOMMENDATIONS_WEBHOOK_URL is not set in environment variables!');
    return res.status(500).json({ error: 'Server configuration error: n8n webhook URL missing.' });
  }

  try {
    const { user_id, created_at, context } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required.' });
    }

    // Forward the request to the n8n webhook
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id,
        created_at: created_at || new Date().toISOString(),
        context: context || {
          platform: 'web',
          source: 'recommendations'
        }
      }),
    });

    // Check if the n8n webhook call was successful
    if (!n8nResponse.ok) {
      const errorData = await n8nResponse.text(); // Get raw error response from n8n
      console.error(`Error from n8n recommendations webhook (Status: ${n8nResponse.status}):`, errorData);
      // Re-throw to be caught by the outer catch block
      throw new Error(`n8n recommendations webhook failed with status: ${n8nResponse.status}`);
    }

    // Parse n8n's response and send it back to the client
    const data = await n8nResponse.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(data);

  } catch (error: any) {
    console.error('API route error for n8n recommendations:', error);
    // Send a generic error message to the client, log detailed error on server
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ error: error.message || 'Internal Server Error during recommendations request.' });
  }
}
