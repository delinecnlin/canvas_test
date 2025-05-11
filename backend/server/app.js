/**
 * Node.js Express 后端伪代码
 * 支持多租户、微信认证可扩展，Dify 工作流接口预留
 * 仅为结构示例，实际部署需完善认证、错误处理等
 */
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

/*
// const wechatAuthRouter = require('./wechat-auth');
*/
const localAuthRouter = require('./local-auth');

const DIFY_API_BASE = 'https://rag02.de-line.net/v1';
// 小冰API Key仅在后端设置，前端不再传递
const XIAOBING_API_KEY = process.env.XIAOBING_API_KEY; // 请在Azure环境变量中设置

app.use(cors());
app.use(bodyParser.json());
/*
// app.use(wechatAuthRouter);
*/
app.use(localAuthRouter);

/**
 * 通用小冰API调用（示例，需根据实际API文档调整）
 */
async function callXiaoiceApi(apiPath, data) {
  try {
    const response = await axios.post(
      `https://aibeings-vip.xiaoice.com${apiPath}`,
      data,
      { headers: { 'Ocp-Apim-Subscription-Key': XIAOBING_API_KEY, 'Content-Type': 'application/json' } }
    );
    return response.data;
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

// 通用 Dify 工作流调用（如需保留）
async function runDifyWorkflow(inputs, user, responseMode = 'blocking') {
  try {
    const response = await axios.post(
      `${DIFY_API_BASE}/workflows/run`,
      { inputs, response_mode: responseMode, user },
      { headers: { 'Authorization': `Bearer ${DIFY_API_KEY}`, 'Content-Type': 'application/json' } }
    );
    return response.data;
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

// 生成课程大纲
app.post('/generate/outline', async (req, res) => {
  const { courseTopic, user } = req.body;
  const inputs = {
    query: `请基于课程主题"${courseTopic}"生成课程大纲。`
  };
  const result = await runDifyWorkflow(inputs, user);
  res.json(result);
});

// 生成口播脚本
app.post('/generate/voice-script', async (req, res) => {
  const { outline, user } = req.body;
  const inputs = {
    query: `请基于以下大纲生成详细的口播脚本：${outline}`
  };
  const result = await runDifyWorkflow(inputs, user);
  res.json(result);
});

// 生成思维导图
app.post('/generate/mindmap', async (req, res) => {
  const { detailedScript, user } = req.body;
  const inputs = {
    query: `请基于以下口播脚本生成思维导图：${detailedScript}`
  };
  const result = await runDifyWorkflow(inputs, user);
  res.json(result);
});

// 生成双人播客音频
app.post('/generate/podcast', async (req, res) => {
  const { script, user } = req.body;
  const inputs = {
    query: `请基于以下脚本生成双人播客音频内容：${script}`
  };
  const result = await runDifyWorkflow(inputs, user);
  res.json(result);
});

// 生成PPT
app.post('/generate/ppt', async (req, res) => {
  const { script, user } = req.body;
  const inputs = {
    query: `请基于以下脚本生成PPT大纲和内容：${script}`
  };
  const result = await runDifyWorkflow(inputs, user);
  res.json(result);
});

/**
 * 获取所有小冰数字人
 * 文档: https://aibeings-vip.xiaoice.com/developer-doc/show/114
 * 返回格式: [{ id, name, description, thumbnail, gestures: [] }]
 */
app.get('/api/xiaoice/avatars', async (req, res) => {
  try {
    // 假设API为 /api/avatar/list，实际以小冰文档为准
    const result = await callXiaoiceApi('/api/avatar/list', {});
    if (result && Array.isArray(result.data)) {
      // 只保留必要字段
      const avatars = result.data.map(a => ({
        id: a.avatarId || a.id,
        name: a.name,
        description: a.description,
        thumbnail: a.thumbnail,
        gestures: a.gestures || []
      }));
      res.json(avatars);
    } else {
      res.status(500).json({ error: '小冰API返回异常' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * 健康检查路由，GET /
 */
app.get('/', (req, res) => {
  res.send('Backend is running');
});

// 端口监听
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
