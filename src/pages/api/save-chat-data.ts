import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../services/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, userMessage, botResponse } = req.body;

    // Log the incoming request data
    console.log('Received request data:', {
      userId,
      userMessage,
      botResponse
    });

    if (!userId || !userMessage || !botResponse) {
      console.error('Missing required fields:', { userId, userMessage, botResponse });
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: {
          userId: !userId,
          userMessage: !userMessage,
          botResponse: !botResponse
        }
      });
    }

    // First, mark existing chat interactions as archived in the database
    const { error: archiveError } = await supabase
      .from('chat_interactions')
      .update({ archived: true })
      .eq('user_id', userId)
      .eq('archived', false);

    if (archiveError) {
      console.error('Error archiving existing chat interactions:', archiveError);
      return res.status(500).json({ 
        error: 'Failed to archive existing chat interactions',
        details: archiveError
      });
    }

    // Prepare the messages with proper metadata for new session
    const userMessageData = {
      user_id: userId,
      message: userMessage.message || '',
      is_bot: false,
      created_at: userMessage.created_at || new Date().toISOString(),
      metadata: {
        ...userMessage.metadata,
        session_id: new Date().getTime().toString(), // Add unique session ID
        is_new_session: true
      },
      archived: false
    };

    const botMessageData = {
      user_id: userId,
      message: botResponse.message || '',
      is_bot: true,
      created_at: botResponse.created_at || new Date().toISOString(),
      metadata: {
        ...botResponse.metadata,
        session_id: userMessageData.metadata.session_id, // Use same session ID
        is_new_session: true
      },
      archived: false
    };

    // Log the prepared data
    console.log('Prepared data for new session:', {
      userMessageData,
      botMessageData
    });

    // Save the new chat interaction to Supabase
    const { data, error: insertError } = await supabase
      .from('chat_interactions')
      .insert([userMessageData, botMessageData])
      .select();

    if (insertError) {
      console.error('Error inserting new chat interaction:', insertError);
      return res.status(500).json({ 
        error: 'Failed to save new chat interaction',
        details: insertError
      });
    }

    // Log successful insertion
    console.log('Successfully saved new chat session:', data);

    return res.status(200).json({ 
      success: true,
      data: data,
      message: 'New chat session started successfully',
      session_id: userMessageData.metadata.session_id
    });

  } catch (error) {
    console.error('Unexpected error in save-chat-data:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}