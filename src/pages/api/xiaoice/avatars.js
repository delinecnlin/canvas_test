import { getXiaoiceAvatars } from '@/lib/server/xiaoice';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const avatars = await getXiaoiceAvatars();
    res.json(avatars);
  } catch (e) {
    console.error('小冰API调用异常:', e && e.response ? e.response.data : e, e);
    res.status(500).json({ error: e.message, stack: e.stack, detail: e && e.response ? e.response.data : undefined });
  }
}
