/**
 * 本地用户注册/登录接口（内存版，仅测试用）
 * 保留接口结构，后续可无缝切换到数据库
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = {
  hash: async (pw, saltRounds) => Promise.resolve(pw), // 明文直通，仅本地测试用
  compare: async (pw, hash) => Promise.resolve(pw === hash)
};
const jwt = require('jsonwebtoken');
require('dotenv').config();

const router = express.Router();
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'undefined') JWT_SECRET = 'test_secret';

// JSON 文件持久化用户表
const USERS_FILE = path.join(__dirname, 'users.json');
function loadUsers() {
  if (fs.existsSync(USERS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } catch {
      return [];
    }
  }
  return [];
}
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}
let users = loadUsers();

// 用户注册
router.post('/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码必填' });

  // 检查用户名是否已存在（忽略大小写）
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(400).json({ error: '用户名已存在' });
  }

  // 加密密码
  const password_hash = await bcrypt.hash(password, 10);

  // 插入用户
  users.push({
    id: users.length + 1,
    username,
    password_hash,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  saveUsers(users);

  res.json({ message: '注册成功' });
});

// 用户登录
router.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码必填' });

  // 查找用户
  users = loadUsers(); // 每次登录前重新加载
  const user = users.find(u => u.username === username);
  if (!user) return res.status(400).json({ error: '用户不存在' });

  // 校验密码
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(400).json({ error: '密码错误' });

  // 生成 JWT
  const payload = { id: user.id, username: user.username };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

  res.json({ token, username: user.username });
});

module.exports = router;
