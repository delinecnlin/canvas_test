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
    const res = await fetch('https://canvastest-f8dub2hzg4avgca2.japanwest-01.azurewebsites.net/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok && data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      showHomePage();
    } else {
      document.getElementById('auth-msg').textContent = data.error || '登录失败';
    }
  };

  document.getElementById('register-form').onsubmit = async e => {
    e.preventDefault();
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    const res = await fetch('https://canvastest-f8dub2hzg4avgca2.japanwest-01.azurewebsites.net/auth/register', {
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
  showAuthForm();
}

// ========== 编辑器主逻辑 ==========
function showMainApp(avatarId, avatarObj) {
  // 还原 index.html 主结构，增加素材上传和URL粘贴功能
  document.body.innerHTML = `
  <div class="main-layout">
    <aside class="sidebar left">
      <h2>场景</h2>
      <ul id="scene-list">
        <li class="scene-item active" data-index="0">1</li>
      </ul>
      <button id="add-scene-btn">添加场景</button>
    </aside>
    <main class="center">
      <div class="canvas-toolbar">
        <button id="upload-image-btn">上传图片/粘贴图片URL</button>
        <button id="add-text-btn">添加文字</button>
        <button id="upload-video-btn">上传视频/粘贴视频URL</button>
        <button id="upload-audio-btn">上传音频/粘贴音频URL</button>
      </div>
      <div id="canvas-container">
        <canvas id="editor-canvas" width="540" height="960"></canvas>
      </div>
    </main>
    <aside class="sidebar right">
      <h2>素材库</h2>
      <div id="material-list">
        <div>
          <strong>图片</strong>
          <ul id="image-list"></ul>
        </div>
        <div>
          <strong>视频</strong>
          <ul id="video-list"></ul>
        </div>
        <div>
          <strong>音频</strong>
          <ul id="audio-list"></ul>
        </div>
      </div>
      <div id="avatar-panel" style="margin-top:24px;">
        <h3>数字人</h3>
        ${avatarObj ? `
          <div style="text-align:center;">
            <img src="${avatarObj.thumbnail}" alt="${avatarObj.name}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;">
            <div style="margin-top:8px;font-weight:bold;">${avatarObj.name}</div>
            <div style="font-size:13px;color:#888;">${avatarObj.description || ''}</div>
            <div style="margin-top:8px;">
              <label>手势：</label>
              <select id="gesture-select">
                ${(avatarObj.gestures || []).map(g => `<option value="${g}">${g}</option>`).join('')}
              </select>
            </div>
          </div>
        ` : '<div>未选择数字人</div>'}
      </div>
      <div id="property-panel">
        <h3>属性</h3>
        <div id="property-content">选中元素后可编辑属性</div>
      </div>
    </aside>
  </div>
  <div class="bottom-panel">
    <label>
      输出视频名称:
      <input type="text" id="outputVideoName" value="我的视频">
    </label>
    <label>
      输出格式:
      <select id="outputVideoFormat">
        <option value="mp4">mp4</option>
        <option value="mkv">mkv</option>
      </select>
    </label>
    <label>
      分辨率:
      <input type="number" id="width" value="540" min="2" step="2" style="width:60px;"> x
      <input type="number" id="height" value="960" min="2" step="2" style="width:60px;">
    </label>
    <button id="generateBtn">生成视频</button>
    <span id="task-status"></span>
  </div>
  <div id="video-result"></div>
  <div id="url-upload" style="margin: 20px auto; max-width: 600px; text-align:center;">
    <input type="text" id="material-url-input" placeholder="粘贴图片/视频/音频URL" style="width:70%; padding: 6px;">
    <select id="material-url-type" style="padding: 6px;">
      <option value="image">图片</option>
      <option value="video">视频</option>
      <option value="audio">音频</option>
    </select>
    <button id="add-url-btn" style="padding: 6px 12px; margin-left: 8px;">添加素材</button>
  </div>
  <input type="file" id="hidden-image-input" accept="image/*" style="display:none;">
  <input type="file" id="hidden-video-input" accept="video/*" style="display:none;">
  <input type="file" id="hidden-audio-input" accept="audio/*" style="display:none;">
  <button id="logout-btn" style="position:fixed;top:10px;right:20px;z-index:999;background:#e11d48;color:#fff;border:none;border-radius:5px;padding:6px 14px;cursor:pointer;">退出登录</button>
  `;

  document.getElementById('logout-btn').onclick = logout;

  // 初始化fabric.js画布
  canvas = new window.fabric.Canvas('editor-canvas');

  // 上传图片
  document.getElementById('upload-image-btn').onclick = () => {
    showMaterialUploadDialog('image');
  };

  // 添加文字
  document.getElementById('add-text-btn').onclick = () => {
    const text = prompt('请输入要添加的文字：');
    if (text) {
      const textbox = new window.fabric.Textbox(text, {
        left: 120,
        top: 120,
        fontSize: 32,
        fill: '#222'
      });
      canvas.add(textbox);
      canvas.setActiveObject(textbox);
      canvas.requestRenderAll();
    }
  };
  document.getElementById('hidden-image-input').onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      alert('本地图片上传功能待接入后端/云存储');
    }
  };

  // 上传视频
  document.getElementById('upload-video-btn').onclick = () => {
    showMaterialUploadDialog('video');
  };
  document.getElementById('hidden-video-input').onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      alert('本地视频上传功能待接入后端/云存储');
    }
  };

  // 上传音频
  document.getElementById('upload-audio-btn').onclick = () => {
    showMaterialUploadDialog('audio');
  };
  document.getElementById('hidden-audio-input').onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      alert('本地音频上传功能待接入后端/云存储');
    }
  };

  // 粘贴URL方式
  document.getElementById('add-url-btn').onclick = () => {
    const url = document.getElementById('material-url-input').value.trim();
    const type = document.getElementById('material-url-type').value;
    if (!url) return;
    // 直接添加，不做HEAD检测，预览失败由浏览器自行处理
    addMaterialUrl(url, type);
  };

  // 素材预览添加，并支持点击添加到画布
  function addMaterialUrl(url, type) {
    let listId = '';
    let html = '';
    if (type === 'image') {
      listId = 'image-list';
      html = `<li class="material-item" data-url="${url}" data-type="image" style="cursor:pointer;"><img src="${url}" style="max-width:80px;max-height:80px;" alt="图片素材"></li>`;
    } else if (type === 'video') {
      listId = 'video-list';
      html = `<li class="material-item" data-url="${url}" data-type="video" style="cursor:pointer;"><video src="${url}" controls style="max-width:120px;max-height:80px;"></video></li>`;
    } else if (type === 'audio') {
      listId = 'audio-list';
      html = `<li class="material-item" data-url="${url}" data-type="audio" style="cursor:pointer;"><audio src="${url}" controls></audio></li>`;
    }
    if (listId) {
      document.getElementById(listId).insertAdjacentHTML('beforeend', html);
      // 绑定点击事件
      const items = document.querySelectorAll(`#${listId} .material-item`);
      items.forEach(item => {
        item.onclick = () => {
          const url = item.getAttribute('data-url');
          const type = item.getAttribute('data-type');
          if (type === 'image') {
            // 先移除 scaleX/scaleY，图片加载后自适应缩放
            // 解决CORS问题：不设置 crossOrigin，优先尝试本地同源图片或已允许CORS的图片
            window.fabric.Image.fromURL(url, function(img) {
              if (!img) {
                alert('图片加载失败，可能目标服务器未允许跨域（CORS）。请换用本地图片或支持CORS的图片链接。');
                return;
              }
              const maxW = canvas.getWidth() || 540;
              const maxH = canvas.getHeight() || 960;
              const iw = img.width, ih = img.height;
              let scale = 1;
              if (iw > maxW || ih > maxH) {
                scale = Math.min(maxW / iw, maxH / ih, 1);
              }
              img.set({
                left: 100,
                top: 100,
                scaleX: scale,
                scaleY: scale
              });
              canvas.add(img);
              canvas.setActiveObject(img);
              canvas.requestRenderAll();
            });
          } else if (type === 'video') {
            alert('视频素材暂不支持直接添加到画布，可用于生成视频时合成。');
          } else if (type === 'audio') {
            alert('音频素材暂不支持直接添加到画布，可用于生成视频时合成。');
          }
        };
      });
    }
  }

  // 拖拽上传/URL粘贴弹窗
  function showMaterialUploadDialog(type) {
    // 简单实现：弹窗+拖拽区+URL输入
    const dialog = document.createElement('div');
    dialog.style.position = 'fixed';
    dialog.style.left = '50%';
    dialog.style.top = '50%';
    dialog.style.transform = 'translate(-50%,-50%)';
    dialog.style.background = '#fff';
    dialog.style.border = '1px solid #ccc';
    dialog.style.borderRadius = '8px';
    dialog.style.zIndex = 9999;
    dialog.style.padding = '32px 24px 24px 24px';
    dialog.innerHTML = `
      <h3>上传${type === 'image' ? '图片' : type === 'video' ? '视频' : '音频'}素材</h3>
      <div id="drag-area" style="border:2px dashed #aaa;padding:32px;text-align:center;margin-bottom:16px;">
        拖拽本地文件到此处上传
      </div>
      <input type="text" id="dialog-url-input" placeholder="粘贴${type === 'image' ? '图片' : type === 'video' ? '视频' : '音频'}URL" style="width:80%;padding:6px;">
      <button id="dialog-add-url-btn" style="margin-left:8px;">添加</button>
      <button id="dialog-cancel-btn" style="margin-left:16px;">取消</button>
    `;
    document.body.appendChild(dialog);

    // 拖拽上传
    const dragArea = dialog.querySelector('#drag-area');
    dragArea.ondragover = e => { e.preventDefault(); dragArea.style.background = '#f0f6ff'; };
    dragArea.ondragleave = e => { e.preventDefault(); dragArea.style.background = ''; };
    dragArea.ondrop = e => {
      e.preventDefault();
      dragArea.style.background = '';
      const file = e.dataTransfer.files[0];
      if (file) {
        alert('本地上传功能待接入后端/云存储');
      }
    };

    // URL粘贴
    dialog.querySelector('#dialog-add-url-btn').onclick = () => {
      const url = dialog.querySelector('#dialog-url-input').value.trim();
      if (!url) return;
      addMaterialUrl(url, type);
      document.body.removeChild(dialog);
    };
    dialog.querySelector('#dialog-cancel-btn').onclick = () => {
      document.body.removeChild(dialog);
    };
  }
}

// ========== 入口 ==========
window.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth()) return;
  showHomePage();
});

// 新增主页逻辑
async function showHomePage() {
  const username = localStorage.getItem('username') || '';
  // 获取所有小冰数字人
  let avatars = [];
  try {
    const res = await fetch('/api/xiaoice/avatars');
    if (res.ok) {
      avatars = await res.json();
    }
  } catch (e) {
    avatars = [];
  }
  document.body.innerHTML = `
    <header>
      <h1>欢迎回来，${username}</h1>
      <div class="profile-panel">
        <strong>用户信息：</strong>
        <div>用户名：${username}</div>
      </div>
      <button id="logout-btn">退出登录</button>
    </header>
    <section id="avatar-list-section">
      <h2>小冰数字人</h2>
      <div id="avatar-list" style="display:flex;flex-wrap:wrap;gap:24px;">
        ${avatars.map(a => `
          <div class="avatar-card" data-id="${a.id}" style="border:1px solid #eee;border-radius:8px;padding:12px;cursor:pointer;width:160px;text-align:center;">
            <img src="${a.thumbnail}" alt="${a.name}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;">
            <div style="margin-top:8px;font-weight:bold;">${a.name}</div>
            <div style="font-size:13px;color:#888;">${a.description || ''}</div>
          </div>
        `).join('')}
      </div>
    </section>
    <section id="home-tasks">
      <button id="new-task-btn">开始新任务</button>
      <div id="task-list">
        <!-- 这里可加载任务列表 -->
      </div>
    </section>
  `;
  document.getElementById('logout-btn').onclick = logout;
  document.getElementById('new-task-btn').onclick = () => {
    showMainApp();
  };
  // 数字人卡片点击进入编辑界面
  document.querySelectorAll('.avatar-card').forEach(card => {
    card.onclick = () => {
      const avatarId = card.getAttribute('data-id');
      showMainApp(avatarId, avatars.find(a => a.id === avatarId));
    };
  });
}
