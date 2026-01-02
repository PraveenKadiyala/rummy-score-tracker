import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const { gameId } = req.query;

  if (req.method === 'GET') {
    const game = await kv.get(`game:${gameId}`);
    return res.status(200).json(game || null);
  }

  if (req.method === 'POST') {
    const gameData = req.body;
    await kv.set(`game:${gameId}`, gameData);
    return res.status(200).json({ success: true });
  }

  res.status(405).end();
}
