import { submitXiaoiceVideoTask } from '@/lib/server/xiaoice';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const result = await submitXiaoiceVideoTask(req.body);
    res.json({ success: true, message: '小冰接口已响应', data: result });
  } catch (e) {
    console.error('[API] /api/xiaoice/generate 错误:', e && e.response ? e.response.data : e);
    res.status(500).json({ success: false, error: e.message, detail: e && e.response ? e.response.data : undefined });
  }
}
