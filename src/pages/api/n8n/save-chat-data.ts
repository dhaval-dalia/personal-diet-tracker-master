import { supabase } from '../../../services/supabase';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId, data } = req.body;

  const { error } = await supabase.from('chat_interactions').insert([
    {
      user_id: userId,
      message: 'Saved via UI Confirm',
      response: data,
      confirmed: true,
    },
  ]);

  if (error) return res.status(500).json({ error: 'Supabase insert error' });

  res.status(200).json({ success: true });
}
