import axios from 'axios';

const XIAOBING_API_KEY = process.env.XIAOBING_API_KEY;

/**
 * 获取所有小冰数字人及其手势、姿态信息
 * @returns {Promise<Array>}
 */
export async function getXiaoiceAvatars() {
  if (!XIAOBING_API_KEY) {
    console.error('[小冰API] 未配置 XIAOBING_API_KEY');
    return [];
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
    // 2. 并发获取每个数字人详情，提取手势和姿态
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
        } catch (err) {
          console.error('[小冰API] 获取数字人详情失败:', err);
          return { ...a, gestures: [], postureInfos: [] };
        }
      })
    );
    // 只保留必要字段
    return details.map(a => ({
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
  } catch (e) {
    console.error('[小冰API] 获取数字人列表失败:', e);
    return [];
  }
}

/**
 * 获取小冰声音列表
 * @returns {Promise<Array>}
 */
export async function getXiaoiceVoices() {
  if (!XIAOBING_API_KEY) {
    console.error('[小冰API] 未配置 XIAOBING_API_KEY');
    return [];
  }
  try {
    const result = await axios.get(
      'https://openapi.xiaoice.com/vh/openapi/customize/zero/voice-list',
      {
        headers: {
          'subscription-key': XIAOBING_API_KEY ? XIAOBING_API_KEY.trim() : '',
          'Content-Type': 'application/json'
        }
      }
    );
    return result.data && result.data.data ? result.data.data : [];
  } catch (e) {
    console.error('[小冰API] 获取声音列表失败:', e);
    return [];
  }
}

/**
 * 提交小冰视频生成任务
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
export async function submitXiaoiceVideoTask(payload) {
  if (!XIAOBING_API_KEY) {
    throw new Error('[小冰API] 未配置 XIAOBING_API_KEY');
  }
  const result = await axios.post(
    'https://openapi.xiaoice.com/vh/openapi/video/task/v2/submit',
    payload,
    {
      headers: {
        'subscription-key': XIAOBING_API_KEY ? XIAOBING_API_KEY.trim() : '',
        'Content-Type': 'application/json'
      }
    }
  );
  return result.data;
}
