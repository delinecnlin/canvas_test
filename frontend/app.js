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
    const backendUrl = window.BACKEND_URL || 'http://localhost:3001';
    const res = await fetch(`${backendUrl}/auth/login`, {
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
    const backendUrl = window.BACKEND_URL || 'http://localhost:3001';
    const res = await fetch(`${backendUrl}/auth/register`, {
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
  alert('[DEBUG] showMainApp 被调用，avatarId: ' + avatarId);
  console.log('[DEBUG] showMainApp 被调用，avatarId:', avatarId, 'avatarObj:', avatarObj);
  document.body.innerHTML = `
  <button id="back-to-home-btn" style="position:fixed;top:10px;left:20px;z-index:999;background:#2563eb;color:#fff;border:none;border-radius:5px;padding:6px 14px;cursor:pointer;">返回主页</button>
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
              <label>姿势：</label>
              <div id="posture-list" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">
                ${
                  avatarObj.postureInfos && avatarObj.postureInfos.length
                  ? avatarObj.postureInfos.map((p, idx) =>
                      `<div class="posture-item" data-url="${p.previewPicture}" style="display:inline-block;text-align:center;cursor:pointer;" tabindex="0">
                        <img src="${p.previewPicture}" alt="${p.name}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;border:1px solid #eee;">
                        <div style="font-size:12px;margin-top:2px;">${p.name}</div>
                      </div>`
                    ).join('')
                  : '<span style="color:#888;">无可用姿势</span>'
                }
              </div>
            </div>
          </div>
        ` : '<div>未选择数字人</div>'}
      </div>
      <div id="voice-panel" style="margin-top:24px; display:none;">
        <button id="show-voice-btn" style="padding:4px 12px; margin-bottom:8px;">选择声音</button>
        <div id="voice-filter-panel" style="display:none; margin-bottom:8px;">
          <select id="voice-gender" style="margin-right:8px;">
            <option value="">全部性别</option>
            <option value="male">男</option>
            <option value="female">女</option>
          </select>
          <select id="voice-lang">
            <option value="">全部语言</option>
            <option value="zh-CN">中文</option>
            <option value="en-US">英文</option>
          </select>
        </div>
        <ul id="voice-list"></ul>
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

  // 修复属性面板无法显示的根因：事件绑定时机需在DOM渲染后，canvas初始化后再绑定事件
  // 用 requestAnimationFrame 替代 setTimeout，确保 DOM 已渲染
  function bindHeaderBtns(attempt = 1) {
    const logoutBtn = document.getElementById('logout-btn');
    const backBtn = document.getElementById('back-to-home-btn');
    if (logoutBtn && backBtn) {
      logoutBtn.onclick = logout;
      backBtn.onclick = showHomePage;
      console.log('[DEBUG] 按钮事件绑定成功');
    } else if (attempt < 20) {
      // 元素还没渲染出来，递归等待
      requestAnimationFrame(() => bindHeaderBtns(attempt + 1));
    } else {
      if (!logoutBtn) console.error('[ERROR] logout-btn 未找到，已重试20次');
      if (!backBtn) console.error('[ERROR] back-to-home-btn 未找到，已重试20次');
    }
  }
  requestAnimationFrame(() => bindHeaderBtns(1));

  // 语音面板显示/隐藏逻辑
  const voicePanel = document.getElementById('voice-panel');
  const showVoiceBtn = document.getElementById('show-voice-btn');
  const filterPanel = document.getElementById('voice-filter-panel');
  if (showVoiceBtn && voicePanel && filterPanel) {
    showVoiceBtn.onclick = () => {
      if (filterPanel.style.display === 'none') {
        filterPanel.style.display = '';
        document.getElementById('voice-list').style.display = '';
        window.fetchVoices && window.fetchVoices();
      } else {
        filterPanel.style.display = 'none';
        document.getElementById('voice-list').style.display = 'none';
      }
    };
    // 默认隐藏
    filterPanel.style.display = 'none';
    document.getElementById('voice-list').style.display = 'none';
    voicePanel.style.display = '';
  }

  // 语音筛选逻辑
  const voiceGender = document.getElementById('voice-gender');
  const voiceLang = document.getElementById('voice-lang');
  if (voiceGender && voiceLang) {
    voiceGender.onchange = voiceLang.onchange = function() {
      window.fetchVoices && window.fetchVoices();
    };
  }

  // 防止多次事件委托冲突，先移除旧的事件
  if (window._postureClickHandler) {
    document.removeEventListener('click', window._postureClickHandler);
  }
  window._postureClickHandler = function postureClickHandler(e) {
    const item = e.target.closest('.posture-item');
    if (item && item.getAttribute('data-url')) {
      const url = item.getAttribute('data-url');
      // 查找现有姿势图片
      const postureImg = canvas.getObjects('image').find(obj => obj.postureTag === true);
      if (postureImg) {
        // 替换图片内容，保留原有位置和缩放
        window.fabric.Image.fromURL(url, function(newImg) {
          if (!newImg) {
            alert('图片加载失败，可能目标服务器未允许跨域（CORS）。');
            return;
          }
          newImg.set({
            left: postureImg.left,
            top: postureImg.top,
            scaleX: postureImg.scaleX,
            scaleY: postureImg.scaleY
          });
          newImg.postureTag = true;
          canvas.remove(postureImg);
          canvas.add(newImg);
          canvas.setActiveObject(newImg);
          canvas.requestRenderAll();
        });
      } else {
        window.fabric.Image.fromURL(url, function(img) {
          if (!img) {
            alert('图片加载失败，可能目标服务器未允许跨域（CORS）。');
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
          img.postureTag = true;
          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.requestRenderAll();
        });
      }
    }
  };
  document.addEventListener('click', window._postureClickHandler);

  // 设置URL为带任务ID的独立地址
  let taskId = getCurrentTaskId();
  if (!taskId) {
    taskId = genRandomTaskId();
    // 移除“task_”前缀（兼容历史数据，防止误加）
    if (taskId.startsWith('task_')) {
      taskId = taskId.slice(5);
    }
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, '', `${location.origin}/?task=${encodeURIComponent(taskId)}`);
    }
  }

  function getCurrentTaskId() {
    const m = location.search.match(/[?&]task=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }
  function genRandomTaskId() {
    // 生成不带“task_”前缀的纯随机ID
    return Math.random().toString(36).slice(2, 10) + Date.now();
  }

  // 初始化fabric.js画布
  canvas = new window.fabric.Canvas('editor-canvas');
  console.log('[DEBUG] fabric.Canvas 初始化完成', canvas);

  // 画布事件绑定调试
  if (canvas && canvas.on) {
    console.log('[DEBUG] canvas.on 可用，开始绑定 selection:created/updated/cleared 事件');
  } else {
    console.error('[ERROR] canvas.on 不可用，事件无法绑定');
  }

  // 只在插入图片素材时弹出URL粘贴界面
  // 加载声音列表
  if (typeof window.fetchVoices !== 'function') {
    window.fetchVoices = async function fetchVoices() {
      try {
        const backendUrl = window.BACKEND_URL || 'http://localhost:3001';
        const res = await fetch(`${backendUrl}/api/xiaoice/voices`);
        if (res.ok) {
          let voices = await res.json();
          // 筛选
          const gender = document.getElementById('voice-gender') ? document.getElementById('voice-gender').value : '';
          const lang = document.getElementById('voice-lang') ? document.getElementById('voice-lang').value : '';
          if (gender) {
            voices = voices.filter(v => (v.gender || '').toLowerCase() === gender);
          }
          if (lang) {
            voices = voices.filter(v => (v.language || '').toLowerCase() === lang.toLowerCase());
          }
          const list = document.getElementById('voice-list');
          if (list) {
            list.innerHTML = voices.map(v =>
              `<li>
                <strong>${v.name}</strong>
                <span style="color:#888;font-size:12px;">（${v.language || ''}${v.gender ? ' ' + v.gender : ''}）</span>
                ${v.auditionFile ? `<audio src="${v.auditionFile}" controls style="vertical-align:middle;width:120px;"></audio>` : ''}
              </li>`
            ).join('');
          }
        }
      } catch (e) {
        // ignore
      }
    };
  }
  // 默认不显示语音列表
  // window.fetchVoices();

  // 移除底部粘贴图片/视频/音频URL界面，只在上传图片时弹窗
  const urlUploadDiv = document.getElementById('url-upload');
  if (urlUploadDiv) urlUploadDiv.remove();

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
              // 选中后立即显示属性面板
              showPropertyPanel(img);
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

  // 选中元素时显示属性面板
  function showPropertyPanel(obj) {
    // 日志输出，帮助定位属性面板问题
    console.log('[属性面板] showPropertyPanel 被调用，传入 obj:', obj);
    if (!obj) {
      if (canvas && typeof canvas.getActiveObject === 'function') {
        const activeObj = canvas.getActiveObject();
        console.log('[属性面板] canvas.getActiveObject() 返回:', activeObj);
        obj = activeObj;
        if (!obj) {
          document.getElementById('property-content').innerHTML = '选中元素后可编辑属性';
          return;
        }
      } else {
        document.getElementById('property-content').innerHTML = '选中元素后可编辑属性';
        return;
      }
    }
    // 输出对象的 type、id、zIndex、坐标等关键信息
    console.log('[属性面板] 选中对象 type:', obj.type, 'id:', obj.id, 'zIndex:', obj.zIndex, 'left:', obj.left, 'top:', obj.top, 'x:', obj.x, 'y:', obj.y);
    let html = '';
    // 图片/数字人/视频/音频/背景音乐/文本/字幕等通用属性
    if (obj.type === 'image' || obj.type === 'virtualHuman' || obj.type === 'displayImage' || obj.type === 'displayVideo') {
      html = `
        <div style="padding:8px;">
          <div style="margin-bottom:8px;"><strong>${obj.type === 'virtualHuman' ? '数字人属性' : obj.type === 'displayVideo' ? '视频属性' : '图片属性'}</strong></div>
          <div style="margin-bottom:6px;">
            <label>坐标：</label>
            X <input type="number" id="prop-x" value="${Math.round(obj.left || obj.x || 0)}" style="width:60px;">
            Y <input type="number" id="prop-y" value="${Math.round(obj.top || obj.y || 0)}" style="width:60px;">
          </div>
          <div style="margin-bottom:6px;">
            <label>宽高：</label>
            W <input type="number" id="prop-w" value="${Math.round((obj.width || obj.attributes?.width || 0) * (obj.scaleX || 1))}" style="width:60px;">
            H <input type="number" id="prop-h" value="${Math.round((obj.height || obj.attributes?.height || 0) * (obj.scaleY || 1))}" style="width:60px;">
          </div>
          <div style="margin-bottom:6px;">
            <label>旋转：</label>
            <input type="number" id="prop-angle" value="${Math.round(obj.angle || obj.rotation || 0)}" style="width:60px;">°
          </div>
          <div style="margin-bottom:6px;">
            <label>图层(zIndex)：</label>
            <input type="number" id="prop-zindex" value="${obj.zIndex || 1}" style="width:60px;">
          </div>
        </div>
      `;
      // 背景音乐/音频/视频可扩展
      if (obj.type === 'displayVideo' || obj.type === 'audio' || obj.type === 'backgroundMusic') {
        html += `
          <div style="margin-bottom:6px;">
            <label>音量：</label>
            <input type="number" step="0.01" min="0" max="1" id="prop-volume" value="${obj.volume !== undefined ? obj.volume : 1}" style="width:60px;">
          </div>
          <div style="margin-bottom:6px;">
            <label>倍速：</label>
            <input type="number" step="0.01" min="0" max="3" id="prop-speed" value="${obj.speed !== undefined ? obj.speed : 1}" style="width:60px;">
          </div>
          <div style="margin-bottom:6px;">
            <label>循环：</label>
            <input type="checkbox" id="prop-loop" ${obj.loop !== false ? 'checked' : ''}>
          </div>
        `;
      }
    } else if (obj.type === 'textbox' || obj.type === 'text' || obj.type === 'caption' || obj.type === 'displayText') {
      html = `
        <div style="padding:8px;">
          <div style="margin-bottom:8px;"><strong>文字/字幕属性</strong></div>
          <div style="margin-bottom:6px;">
            <label>内容：</label>
            <input type="text" id="prop-text" value="${obj.text || obj.content || ''}" style="width:180px;">
          </div>
          <div style="margin-bottom:6px;">
            <label>坐标：</label>
            X <input type="number" id="prop-x" value="${Math.round(obj.left || obj.x || 0)}" style="width:60px;">
            Y <input type="number" id="prop-y" value="${Math.round(obj.top || obj.y || 0)}" style="width:60px;">
          </div>
          <div style="margin-bottom:6px;">
            <label>字号：</label>
            <input type="number" id="prop-fontsize" value="${obj.fontSize || obj.attributes?.fontSize || 32}" style="width:60px;">
          </div>
          <div style="margin-bottom:6px;">
            <label>颜色：</label>
            <input type="color" id="prop-color" value="${obj.fill || obj.fontColor || obj.attributes?.fontColor || '#222'}">
          </div>
          <div style="margin-bottom:6px;">
            <label>加粗</label>
            <input type="checkbox" id="prop-bold" ${obj.bold || obj.attributes?.bold ? 'checked' : ''}>
            <label>斜体</label>
            <input type="checkbox" id="prop-italic" ${obj.italic || obj.attributes?.italic ? 'checked' : ''}>
            <label>下划线</label>
            <input type="checkbox" id="prop-underline" ${obj.underline || obj.attributes?.underline ? 'checked' : ''}>
          </div>
          <div style="margin-bottom:6px;">
            <label>字间距：</label>
            <input type="number" id="prop-spacing" value="${obj.spacing || obj.attributes?.spacing || 0}" style="width:60px;">
          </div>
          <div style="margin-bottom:6px;">
            <label>图层(zIndex)：</label>
            <input type="number" id="prop-zindex" value="${obj.zIndex || 1}" style="width:60px;">
          </div>
        </div>
      `;
    } else if (obj.type === 'backgroundMusic') {
      html = `
        <div style="padding:8px;">
          <div style="margin-bottom:8px;"><strong>背景音乐属性</strong></div>
          <div style="margin-bottom:6px;">
            <label>音乐URL：</label>
            <input type="text" id="prop-mediaurl" value="${obj.mediaUrl || ''}" style="width:180px;">
          </div>
          <div style="margin-bottom:6px;">
            <label>音量：</label>
            <input type="number" step="0.01" min="0" max="1" id="prop-volume" value="${obj.volume !== undefined ? obj.volume : 1}" style="width:60px;">
          </div>
          <div style="margin-bottom:6px;">
            <label>倍速：</label>
            <input type="number" step="0.01" min="0" max="3" id="prop-speed" value="${obj.speed !== undefined ? obj.speed : 1}" style="width:60px;">
          </div>
          <div style="margin-bottom:6px;">
            <label>循环：</label>
            <input type="checkbox" id="prop-loop" ${obj.loop !== false ? 'checked' : ''}>
          </div>
        </div>
      `;
    }
    document.getElementById('property-content').innerHTML = html;

    // 绑定属性编辑事件
    // 通用
    if (document.getElementById('prop-x')) document.getElementById('prop-x').onchange = e => { obj.left = obj.x = parseInt(e.target.value, 10) || 0; canvas.requestRenderAll && canvas.requestRenderAll(); };
    if (document.getElementById('prop-y')) document.getElementById('prop-y').onchange = e => { obj.top = obj.y = parseInt(e.target.value, 10) || 0; canvas.requestRenderAll && canvas.requestRenderAll(); };
    if (document.getElementById('prop-w')) document.getElementById('prop-w').onchange = e => {
      const w = parseInt(e.target.value, 10) || 1;
      if (obj.width) obj.scaleX = w / obj.width;
      if (obj.attributes) obj.attributes.width = w;
      canvas.requestRenderAll && canvas.requestRenderAll();
    };
    if (document.getElementById('prop-h')) document.getElementById('prop-h').onchange = e => {
      const h = parseInt(e.target.value, 10) || 1;
      if (obj.height) obj.scaleY = h / obj.height;
      if (obj.attributes) obj.attributes.height = h;
      canvas.requestRenderAll && canvas.requestRenderAll();
    };
    if (document.getElementById('prop-angle')) document.getElementById('prop-angle').onchange = e => {
      obj.angle = obj.rotation = parseInt(e.target.value, 10) || 0;
      canvas.requestRenderAll && canvas.requestRenderAll();
    };
    if (document.getElementById('prop-zindex')) document.getElementById('prop-zindex').onchange = e => {
      obj.zIndex = parseInt(e.target.value, 10) || 1;
      // 这里如需同步zIndex到后端数据结构可补充
    };
    // 音乐/音频/视频
    if (document.getElementById('prop-volume')) document.getElementById('prop-volume').onchange = e => { obj.volume = parseFloat(e.target.value) || 1; };
    if (document.getElementById('prop-speed')) document.getElementById('prop-speed').onchange = e => { obj.speed = parseFloat(e.target.value) || 1; };
    if (document.getElementById('prop-loop')) document.getElementById('prop-loop').onchange = e => { obj.loop = e.target.checked; };
    if (document.getElementById('prop-mediaurl')) document.getElementById('prop-mediaurl').onchange = e => { obj.mediaUrl = e.target.value; };
    // 字幕/文字
    if (document.getElementById('prop-text')) document.getElementById('prop-text').onchange = e => { obj.text = obj.content = e.target.value; canvas.requestRenderAll && canvas.requestRenderAll(); };
    if (document.getElementById('prop-fontsize')) document.getElementById('prop-fontsize').onchange = e => { obj.fontSize = obj.attributes ? (obj.attributes.fontSize = parseInt(e.target.value, 10) || 32) : (parseInt(e.target.value, 10) || 32); canvas.requestRenderAll && canvas.requestRenderAll(); };
    if (document.getElementById('prop-color')) document.getElementById('prop-color').onchange = e => { obj.fill = obj.fontColor = obj.attributes ? (obj.attributes.fontColor = e.target.value) : e.target.value; canvas.requestRenderAll && canvas.requestRenderAll(); };
    if (document.getElementById('prop-bold')) document.getElementById('prop-bold').onchange = e => { obj.bold = obj.attributes ? (obj.attributes.bold = e.target.checked) : e.target.checked; canvas.requestRenderAll && canvas.requestRenderAll(); };
    if (document.getElementById('prop-italic')) document.getElementById('prop-italic').onchange = e => { obj.italic = obj.attributes ? (obj.attributes.italic = e.target.checked) : e.target.checked; canvas.requestRenderAll && canvas.requestRenderAll(); };
    if (document.getElementById('prop-underline')) document.getElementById('prop-underline').onchange = e => { obj.underline = obj.attributes ? (obj.attributes.underline = e.target.checked) : e.target.checked; canvas.requestRenderAll && canvas.requestRenderAll(); };
    if (document.getElementById('prop-spacing')) document.getElementById('prop-spacing').onchange = e => { obj.spacing = obj.attributes ? (obj.attributes.spacing = parseInt(e.target.value, 10) || 0) : (parseInt(e.target.value, 10) || 0); canvas.requestRenderAll && canvas.requestRenderAll(); };
  }

  // 画布选中元素时显示属性
  if (canvas && canvas.on) {
    canvas.on('selection:created', function(e) {
      console.log('[DEBUG] selection:created 事件触发', e);
      let obj = e.selected ? e.selected[0] : e.target;
      showPropertyPanel(obj);
    });
    canvas.on('selection:updated', function(e) {
      console.log('[DEBUG] selection:updated 事件触发', e);
      let obj = e.selected ? e.selected[0] : e.target;
      showPropertyPanel(obj);
    });
    canvas.on('selection:cleared', function() {
      console.log('[DEBUG] selection:cleared 事件触发');
      showPropertyPanel(null);
    });
  }
  // 兼容直接点击对象（如fabric 3.x/4.x/5.x差异）
  if (canvas) {
    canvas.on('mouse:down', function(e) {
      console.log('[DEBUG] mouse:down 事件触发', e);
      if (e && e.target) {
        showPropertyPanel(e.target);
      }
    });
  }

  // 姿势图片点击添加到画布（同一画面只允许一个数字人姿势，点击其他姿势会替换）
  document.addEventListener('click', function postureClickHandler(e) {
    const item = e.target.closest('.posture-item');
    if (item && item.getAttribute('data-url')) {
      const url = item.getAttribute('data-url');
      // 查找现有姿势图片
      const postureImg = canvas.getObjects('image').find(obj => obj.postureTag === true);
      if (postureImg) {
        // 替换图片内容，保留原有位置和缩放
        window.fabric.Image.fromURL(url, function(newImg) {
          if (!newImg) {
            alert('图片加载失败，可能目标服务器未允许跨域（CORS）。');
            return;
          }
          // 保留原有位置和缩放
          newImg.set({
            left: postureImg.left,
            top: postureImg.top,
            scaleX: postureImg.scaleX,
            scaleY: postureImg.scaleY
          });
          newImg.postureTag = true;
          canvas.remove(postureImg);
          canvas.add(newImg);
          canvas.setActiveObject(newImg);
          canvas.requestRenderAll();
        });
      } else {
        // 没有姿势图片则直接插入
        window.fabric.Image.fromURL(url, function(img) {
          if (!img) {
            alert('图片加载失败，可能目标服务器未允许跨域（CORS）。');
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
          img.postureTag = true;
          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.requestRenderAll();
        });
      }
    }
  });

  // 拖拽上传/URL粘贴弹窗
  function showMaterialUploadDialog(type) {
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
  console.log('[DEBUG] DOMContentLoaded 事件触发');
  if (!checkAuth()) return;
  showHomePage();
});

// 新增主页逻辑
async function showHomePage() {
  const username = localStorage.getItem('username') || '';
  let avatars = [];
  try {
    const backendUrl = window.BACKEND_URL || 'http://localhost:3001';
    const res = await fetch(`${backendUrl}/api/xiaoice/avatars`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
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
            <img src="${a.thumbnail || a.summaryImage || ''}" alt="${a.name}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;">
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
  document.querySelectorAll('.avatar-card').forEach(card => {
    card.onclick = () => {
      const avatarId = card.getAttribute('data-id');
      showMainApp(avatarId, avatars.find(a => a.id === avatarId));
    };
  });
}
