/**
 * 微信扫码登录后端接口（Node.js/Express 伪代码）
 * 需在 .env 配置 WECHAT_APPID, WECHAT_SECRET, JWT_SECRET
 */
const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const supabase = require('./db');

const router = express.Router();

const WECHAT_APPID = process.env.WECHAT_APPID;
const WECHAT_SECRET = process.env.WECHAT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;

// 1. 前端获取二维码后，用户扫码，微信服务器回调到此接口
// 2. 前端通过 code 换取 openid、session_key
router.get('/auth/wechat/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: '缺少 code' });

  try {
    // 用 code 换取 openid 和 session_key
    const wxRes = await axios.get(
      `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${WECHAT_APPID}&secret=${WECHAT_SECRET}&code=${code}&grant_type=authorization_code`
    );
    const { openid, unionid, access_token, refresh_token } = wxRes.data;
    if (!openid) return res.status(400).json({ error: '微信认证失败', detail: wxRes.data });

    // 可选：用 access_token 拉取用户信息
    // const userInfoRes = await axios.get(
    //   `https://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}&lang=zh_CN`
    // );
    // const userInfo = userInfoRes.data;

    // 写入/更新用户到数据库
    // users 表需有 openid, unionid 字段
    await supabase
      .from('users')
      .upsert([
        { openid, unionid, updated_at: new Date().toISOString() }
      ], { onConflict: ['openid'] });

    // 生成 JWT
    const payload = { openid, unionid };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    // 返回 token 给前端
    res.json({ token, openid, unionid });
  } catch (err) {
    res.status(500).json({ error: '微信认证异常', detail: err.message });
  }
});

module.exports = router;
