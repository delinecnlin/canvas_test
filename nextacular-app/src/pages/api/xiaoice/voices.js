import { getXiaoiceVoices } from '@/lib/server/xiaoice';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const voices = await getXiaoiceVoices();
    res.json(voices);
  } catch (e) {
    console.error('小冰声音API调用异常:', e && e.response ? e.response.data : e);
    res.status(500).json({ error: e.message, stack: e.stack, detail: e && e.response ? e.response.data : undefined });
  }
}
