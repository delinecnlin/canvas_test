import axios from 'axios';

const XIAOBING_API_KEY = process.env.XIAOBING_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    // 1. 获取数字人列表
    const result = await axios.post(
      'https://openapi.xiaoice.com/vh/openapi/video/queryDigitalEmployee',
      {
        categoryList: [],
        modelType: 'STUDIO',
        pageIndex: 1,
        pageSize: 20
      },
      {
        headers: {
          'subscription-key': XIAOBING_API_KEY ? XIAOBING_API_KEY.trim() : '',
          'Content-Type': 'application/json'
        }
      }
    );
    const data = result.data && result.data.data && Array.isArray(result.data.data.records)
      ? result.data.data.records
      : [];
    // 2. 并发获取每个数字人详情，提取手势
    const details = await Promise.all(
      data.map(async a => {
        try {
          const detailRes = await axios.post(
            'https://openapi.xiaoice.com/vh/openapi/video/detailDigitalEmployee',
            { bizId: a.bizId },
            {
              headers: {
                'subscription-key': XIAOBING_API_KEY ? XIAOBING_API_KEY.trim() : '',
                'Content-Type': 'application/json'
              }
            }
          );
          const gestures = (detailRes.data && detailRes.data.data && Array.isArray(detailRes.data.data.gestures))
            ? detailRes.data.data.gestures
            : [];
          const postureInfos = (detailRes.data && detailRes.data.data && Array.isArray(detailRes.data.data.postureInfos))
            ? detailRes.data.data.postureInfos
            : [];
          return { ...a, gestures, postureInfos };
        } catch {
          return { ...a, gestures: [], postureInfos: [] };
        }
      })
    );
    // 只保留必要字段
    const avatars = details.map(a => ({
      id: a.bizId,
      name: a.name,
      description: a.introduce,
      thumbnail: a.summaryImage,
      summaryVideo: a.summaryVideo,
      projectVideo: a.projectVideo,
      industry: a.industry,
      language: a.language,
      experience: a.experience,
      category: a.category,
      gestures: a.gestures,
      postureInfos: a.postureInfos
    }));
    res.json(avatars);
  } catch (e) {
    console.error('小冰API调用异常:', e && e.response ? e.response.data : e);
    res.status(500).json({ error: e.message, stack: e.stack, detail: e && e.response ? e.response.data : undefined });
  }
}
