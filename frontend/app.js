/**
 * 小冰所见即所得视频编辑器 - 前端主逻辑（含本地用户认证）
 * 依赖: fabric.js
 */

let canvas;
let scenes = [
  { objects: [], materials: { images: [], videos: [], audios: [] } }
];
let currentScene = 0;

// ========== 用户认证相关 ==========
function showAuthForm() {
  document.body.innerHTML = `
    <div class="auth-panel">
      <h2>登录</h2>
      <form id="login-form">
        <input type="text" id="login-username" placeholder="用户名" required>
        <input type="password" id="login-password" placeholder="密码" required>
        <button type="submit">登录</button>
      </form>
      <div style="margin:12px 0;">还没有账号？<a href="#" id="show-register">注册</a></div>
      <div id="auth-msg" style="color:#e11d48;margin-top:8px;"></div>
    </div>
    <div class="auth-panel" style="display:none;" id="register-panel">
      <h2>注册</h2>
      <form id="register-form">
        <input type="text" id="register-username" placeholder="用户名" required>
        <input type="password" id="register-password" placeholder="密码" required>
        <button type="submit">注册</button>
      </form>
      <div style="margin:12px 0;">已有账号？<a href="#" id="show-login">登录</a></div>
      <div id="register-msg" style="color:#e11d48;margin-top:8px;"></div>
    </div>
  `;

  document.getElementById('show-register').onclick = e => {
    e.preventDefault();
    document.querySelector('.auth-panel').style.display = 'none';
    document.getElementById('register-panel').style.display = '';
  };
  document.getElementById('show-login').onclick = e => {
    e.preventDefault();
    document.querySelector('.auth-panel').style.display = '';
    document.getElementById('register-panel').style.display = 'none';
  };

  document.getElementById('login-form').onsubmit = async e => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const res = await fetch('http://localhost:3001/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok && data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      location.reload();
    } else {
      document.getElementById('auth-msg').textContent = data.error || '登录失败';
    }
  };

  document.getElementById('register-form').onsubmit = async e => {
    e.preventDefault();
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    const res = await fetch('http://localhost:3001/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok) {
      document.getElementById('register-msg').style.color = '#16a34a';
      document.getElementById('register-msg').textContent = '注册成功，请登录';
    } else {
      document.getElementById('register-msg').style.color = '#e11d48';
      document.getElementById('register-msg').textContent = data.error || '注册失败';
    }
  };
}

function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    showAuthForm();
    return false;
  }
  // 可选：校验token有效性
  return true;
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  location.reload();
}

// ========== 编辑器主逻辑 ==========
function showMainApp() {
  // 恢复原有页面结构
  location.reload();
}

// ========== 入口 ==========
window.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth()) return;

  // 显示主页面（原有编辑器逻辑）
  // ...原有 fabric.js 编辑器初始化和事件绑定...
  // 由于 location.reload() 会重新加载页面，实际部署时可用更优雅的方式切换视图
});
