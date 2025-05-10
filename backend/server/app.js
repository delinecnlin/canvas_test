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
const DIFY_API_KEY = process.env.DIFY_API_KEY; // 请在部署环境中设置

app.use(cors());
app.use(bodyParser.json());
/*
// app.use(wechatAuthRouter);
*/
app.use(localAuthRouter);

// 通用 Dify 工作流调用
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

// 端口监听
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
