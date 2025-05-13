import React, { useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useParams, Navigate } from "react-router-dom";
import AuthPage from "./AuthPage";
import AvatarListPage from "./AvatarListPage";
const fabric: any = (window as any).fabric || {};
import "./App.css";

// Avatar 类型定义
interface PostureInfo {
  bizId: string;
  name: string;
  previewPicture: string;
  postureTags?: string[];
}
interface Avatar {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  summaryImage?: string;
  postureInfos?: PostureInfo[];
  // 可扩展 voiceInfos 等
}

// 生成唯一任务ID
function genTaskId() {
  return Math.random().toString(36).slice(2, 10) + Date.now();
}

// 支持的画布比例
const CANVAS_RATIOS = [
  { label: "9:16", value: 9 / 16, width: 540, height: 960 },
  { label: "16:9", value: 16 / 9, width: 960, height: 540 },
  { label: "1:1", value: 1, width: 720, height: 720 }
];

// fabric.js 编辑器主界面
const EditorPage: React.FC<{
  avatar?: Avatar;
  username: string;
  onLogout: () => void;
  onBack: () => void;
  taskId: string;
}> = ({ avatar: propAvatar, username, onLogout, onBack, taskId }) => {
  // 尝试从草稿恢复
  const [avatar, setAvatar] = React.useState<Avatar | undefined>(propAvatar);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const fabricRef = React.useRef<any>();
  const [selected, setSelected] = React.useState<any>(null);

  // 新增：口播文本
  const [voiceScript, setVoiceScript] = useState<string>("");

  // 画布比例
  const [canvasRatio, setCanvasRatio] = useState(CANVAS_RATIOS[0]);
  const [canvasWidth, setCanvasWidth] = useState(CANVAS_RATIOS[0].width);
  const [canvasHeight, setCanvasHeight] = useState(CANVAS_RATIOS[0].height);

  // 草稿恢复
  React.useEffect(() => {
    try {
      const drafts = JSON.parse(localStorage.getItem("drafts") || "[]");
      const draft = drafts.find((d: any) => d.taskId === taskId);
      if (draft) {
        // 恢复 avatar
        if (draft.avatar) setAvatar(draft.avatar);
        // 恢复 fabric 元素
        setTimeout(() => {
          if (fabricRef.current && draft.elements) {
            fabricRef.current.loadFromJSON(draft.elements, () => {
              fabricRef.current.requestRenderAll();
            });
          }
        }, 300);
        // 恢复口播文本
        if (draft.voiceScript) setVoiceScript(draft.voiceScript);
      }
    } catch {}
  }, [taskId]);

  // 素材Tab
  const [materialTab, setMaterialTab] = useState("scene");

  // 图片上传相关
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string>("");

  // 声音弹窗相关
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceList, setVoiceList] = useState<any[]>([]);
  const [voiceGender, setVoiceGender] = useState("");
  const [voiceLang, setVoiceLang] = useState("");
  const [voiceLoading, setVoiceLoading] = useState(false);

  // 姿势选择
  const [selectedPosture, setSelectedPosture] = useState<PostureInfo | null>(null);

  // 处理文件拖拽/选择
  const handleImageFileChange = (file: File | null) => {
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = e => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 处理URL输入
  const handleImageUrlInput = (url: string) => {
    setImageUrlInput(url);
    setImagePreview(url);
  };

  // 插入图片到画布
  const handleInsertImage = () => {
    if (!fabricRef.current || !fabric.Image) {
      console.log("[DEBUG] handleInsertImage: fabricRef.current or fabric.Image missing");
      return;
    }
    let src = "";
    if (imageFile && imagePreview) {
      src = imagePreview;
    } else if (imageUrlInput) {
      src = imageUrlInput;
    } else {
      return;
    }
    fabric.Image.fromURL(src, (img: any) => {
      if (!img) {
        console.log("[DEBUG] handleInsertImage: 图片加载失败", src);
        return;
      }
      img.set({ left: 100, top: 300, scaleX: 0.5, scaleY: 0.5 });
      fabricRef.current!.add(img);
      fabricRef.current!.setActiveObject(img);
      fabricRef.current!.requestRenderAll();
      setSelected(img);
      setImageFile(null);
      setImageUrlInput("");
      setImagePreview("");
    });
  };

  // 画布比例切换
  const handleRatioChange = (ratio: typeof CANVAS_RATIOS[0]) => {
    setCanvasRatio(ratio);
    setCanvasWidth(ratio.width);
    setCanvasHeight(ratio.height);
    if (fabricRef.current) {
      fabricRef.current.setWidth(ratio.width);
      fabricRef.current.setHeight(ratio.height);
      fabricRef.current.requestRenderAll();
    }
  };

  React.useEffect(() => {
    if (!canvasRef.current) {
      console.log("[DEBUG] canvasRef.current is null");
      return;
    }
    if (!fabricRef.current && fabric && fabric.Canvas) {
      console.log("[DEBUG] fabric.Canvas init");
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: "#fff",
        preserveObjectStacking: true,
      });
      fabricRef.current = canvas;
      canvas.on("selection:created", (e: any) => {
        setSelected(e.selected ? e.selected[0] : e.target);
      });
      canvas.on("selection:updated", (e: any) => {
        setSelected(e.selected ? e.selected[0] : e.target);
      });
      canvas.on("selection:cleared", () => {
        setSelected(null);
      });
      canvas.on("mouse:down", (e: any) => {
        if (e && e.target) setSelected(e.target);
      });
    } else {
      if (!fabric) console.log("[DEBUG] fabric is not loaded");
      if (fabricRef.current) console.log("[DEBUG] fabricRef.current already exists");
    }
  }, [canvasWidth, canvasHeight]);

  // 声音弹窗相关
  const fetchVoices = async () => {
    setVoiceLoading(true);
    try {
      const res = await fetch("http://localhost:3001/api/xiaoice/voices", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      let voices = await res.json();
      if (voiceGender) {
        voices = voices.filter((v: any) => (v.gender || "").toLowerCase() === voiceGender);
      }
      if (voiceLang) {
        voices = voices.filter((v: any) => (v.language || "").toLowerCase() === voiceLang.toLowerCase());
      }
      setVoiceList(voices);
    } catch {
      setVoiceList([]);
    }
    setVoiceLoading(false);
  };

  React.useEffect(() => {
    if (showVoiceModal) fetchVoices();
    // eslint-disable-next-line
  }, [showVoiceModal, voiceGender, voiceLang]);

  const handlePropChange = (props: any) => {
    if (!selected || !fabricRef.current) return;
    selected.set(props);
    fabricRef.current.requestRenderAll();
    setSelected({ ...selected });
  };

  const addText = () => {
    if (!fabricRef.current || !fabric.Textbox) return;
    const textbox = new fabric.Textbox("双击编辑文字", {
      left: 200,
      top: 100,
      fontSize: 36,
      fill: "#222222",
      fontWeight: "bold",
    });
    fabricRef.current.add(textbox);
    fabricRef.current.setActiveObject(textbox);
    fabricRef.current.requestRenderAll();
    setSelected(textbox);
  };

  const addImage = () => {
    if (!fabricRef.current || !fabric.Image) return;
    const url = window.prompt("请输入图片URL");
    if (!url) return;
    fabric.Image.fromURL(url, (img: any) => {
      if (!img) return;
      img.set({ left: 100, top: 300, scaleX: 0.5, scaleY: 0.5 });
      fabricRef.current!.add(img);
      fabricRef.current!.setActiveObject(img);
      fabricRef.current!.requestRenderAll();
      setSelected(img);
    });
  };

  // 姿势点击
  const handlePostureClick = (posture: PostureInfo) => {
    setSelectedPosture(posture);
    if (!fabricRef.current || !fabric.Image) return;
    const canvas = fabricRef.current;
    const postureImg = canvas.getObjects("image").find((obj: any) => obj.postureTag === true);
    if (postureImg) {
      fabric.Image.fromURL(posture.previewPicture, (newImg: any) => {
        if (!newImg) return;
        newImg.set({
          left: postureImg.left,
          top: postureImg.top,
          scaleX: postureImg.scaleX,
          scaleY: postureImg.scaleY,
        });
        newImg.postureTag = true;
        canvas.remove(postureImg);
        canvas.add(newImg);
        canvas.setActiveObject(newImg);
        canvas.requestRenderAll();
        setSelected(newImg);
      });
    } else {
      fabric.Image.fromURL(posture.previewPicture, (img: any) => {
        if (!img) return;
        img.set({ left: 120, top: 120, scaleX: 0.5, scaleY: 0.5 });
        img.postureTag = true;
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.requestRenderAll();
        setSelected(img);
      });
    }
  };

  // 场景列表（示例，后续可扩展多场景）
  const [scenes, setScenes] = useState([{ id: 1, name: "场景1" }]);
  const [currentScene, setCurrentScene] = useState(0);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* 顶部操作栏 */}
      <div style={{ display: "flex", alignItems: "center", padding: "8px 16px", background: "#f5f6fa" }}>
        <button onClick={onBack} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 5, padding: "6px 14px", cursor: "pointer", marginRight: 12 }}>返回主页</button>
        <div style={{ flex: 1 }} />
        {/* 画布比例选择器 */}
        <div style={{ marginRight: 18 }}>
          <label style={{ fontWeight: 600, marginRight: 6 }}>画布比例：</label>
          <select value={canvasRatio.label} onChange={e => {
            const ratio = CANVAS_RATIOS.find(r => r.label === e.target.value) || CANVAS_RATIOS[0];
            handleRatioChange(ratio);
          }}>
            {CANVAS_RATIOS.map(r => (
              <option key={r.label} value={r.label}>{r.label}</option>
            ))}
          </select>
        </div>
        <button onClick={onLogout} style={{ background: "#e11d48", color: "#fff", border: "none", borderRadius: 5, padding: "6px 14px", cursor: "pointer" }}>退出登录</button>
      </div>
      {/* 主体区域 */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* 左侧菜单 */}
        <aside style={{ width: 80, background: "#f5f6fa", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 18 }}>
          {[
            { key: "scene", icon: "📁", label: "场景" },
            { key: "image", icon: "🖼️", label: "图片" },
            { key: "video", icon: "🎬", label: "视频" },
            { key: "audio", icon: "🎵", label: "音乐" },
            { key: "text", icon: "🔤", label: "文字" },
            { key: "sticker", icon: "⭐", label: "贴纸" }
          ].map(tab => (
            <button
              key={tab.key}
              style={{
                width: 48, height: 48, border: "none", background: "none", fontSize: 22,
                color: "inherit", borderRadius: 8, cursor: "pointer",
                backgroundColor: tab.key === materialTab ? "#e0e7ff" : "transparent",
                marginBottom: 8
              }}
              onClick={() => { setMaterialTab(tab.key); }}
              title={tab.label}
            >
              <div>{tab.icon}</div>
              <div style={{ fontSize: 12 }}>{tab.label}</div>
            </button>
          ))}
        </aside>
        {/* 场景列表 */}
        <aside style={{ width: 160, background: "#fff", borderRight: "1px solid #eee", padding: 16, overflowY: "auto" }}>
          <h3 style={{ fontSize: 16, margin: "0 0 12px 0" }}>场景列表</h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {scenes.map((scene, idx) => (
              <li key={scene.id} style={{ marginBottom: 8 }}>
                <button
                  style={{
                    width: "100%",
                    background: idx === currentScene ? "#e0e7ff" : "#f5f6fa",
                    border: "none",
                    borderRadius: 5,
                    padding: "6px 0",
                    fontWeight: idx === currentScene ? 700 : 400,
                    cursor: "pointer"
                  }}
                  onClick={() => setCurrentScene(idx)}
                >{scene.name}</button>
              </li>
            ))}
          </ul>
          <button
            style={{ marginTop: 10, width: "100%", background: "#2563eb", color: "#fff", border: "none", borderRadius: 5, padding: "6px 0", cursor: "pointer" }}
            onClick={() => setScenes([...scenes, { id: scenes.length + 1, name: `场景${scenes.length + 1}` }])}
          >增加场景</button>
        </aside>
        {/* 画布区 */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", background: "#fafbfc", minWidth: 0 }}>
          <div style={{ marginTop: 18, background: "#fff", borderRadius: 10, boxShadow: "0 2px 12px #0001", padding: 12 }}>
            <canvas ref={canvasRef} width={canvasWidth} height={canvasHeight} id="editor-canvas" style={{ display: "block" }} />
          </div>
        </main>
        {/* 右侧：姿势选择 */}
        <aside style={{ width: 200, background: "#fff", borderLeft: "1px solid #eee", padding: 16, overflowY: "auto" }}>
          <h3 style={{ fontSize: 16, margin: "0 0 12px 0" }}>姿势选择</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {avatar && avatar.postureInfos && avatar.postureInfos.length > 0 ? (
              avatar.postureInfos.map(p => (
                <div key={p.bizId} style={{ cursor: "pointer", textAlign: "center" }} onClick={() => handlePostureClick(p)}>
                  <img src={p.previewPicture} alt={p.name} style={{ width: 60, height: 60, borderRadius: 8, objectFit: "cover", border: selectedPosture?.bizId === p.bizId ? "2px solid #2563eb" : "1px solid #eee" }} />
                  <div style={{ fontSize: 12, marginTop: 2 }}>{p.name}</div>
                </div>
              ))
            ) : (
              <span style={{ color: "#888" }}>无可用姿势</span>
            )}
          </div>
        </aside>
      </div>
      {/* 底部操作栏 */}
      <div style={{ display: "flex", alignItems: "center", padding: "16px 32px", borderTop: "1px solid #eee", background: "#fafbfc" }}>
        {/* 口播文本输入框 */}
        <div style={{ flex: 1, marginRight: 24 }}>
          <label style={{ fontWeight: 600, marginBottom: 4, display: "block" }}>口播文本：</label>
          <textarea
            value={voiceScript || ""}
            onChange={e => setVoiceScript(e.target.value)}
            placeholder="请输入口播文本，将与画布一起生成"
            style={{ width: "100%", minHeight: 48, borderRadius: 6, border: "1px solid #ccc", padding: 8, fontSize: 15 }}
          />
        </div>
        {/* 操作按钮组 */}
        <div style={{ display: "flex", gap: 18 }}>
          <button
            onClick={() => {
              // 暂存草稿
              if (!fabricRef.current) return;
              const draft = {
                taskId,
                elements: fabricRef.current.toJSON(),
                time: Date.now(),
                name: "草稿-" + new Date().toLocaleString(),
                avatar: avatar, // 保存avatar信息
                voiceScript // 保存口播文本
              };
              const drafts = JSON.parse(localStorage.getItem("drafts") || "[]");
              const idx = drafts.findIndex((d: any) => d.taskId === taskId);
              if (idx >= 0) drafts[idx] = draft;
              else drafts.push(draft);
              localStorage.setItem("drafts", JSON.stringify(drafts));
              alert("草稿已保存");
            }}
            style={{ padding: "8px 22px", background: "#64748b", color: "#fff", border: "none", borderRadius: 5, fontSize: 16, cursor: "pointer" }}
          >暂存草稿</button>
          <button
            onClick={() => {
              // 预览
              if (!fabricRef.current) return;
              alert("预览功能待完善：此处可实现素材和声音按时间轴播放，数字人静止。");
            }}
            style={{ padding: "8px 22px", background: "#22c55e", color: "#fff", border: "none", borderRadius: 5, fontSize: 16, cursor: "pointer" }}
          >预览</button>
          <button
            onClick={async () => {
              // 最终生成
              if (!fabricRef.current) return;
              const json = fabricRef.current.toJSON();
              // 这里可POST到后端，带上口播文本
              await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ taskId, elements: json, voiceScript })
              });
              alert("已提交生成请求");
            }}
            style={{ padding: "8px 22px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 5, fontSize: 16, cursor: "pointer" }}
          >最终生成</button>
        </div>
      </div>
      {/* 隐藏文件输入，后续可用Ref控制 */}
      <input type="file" accept="image/*" style={{ display: "none" }} />
      <input type="file" accept="video/*" style={{ display: "none" }} />
      <input type="file" accept="audio/*" style={{ display: "none" }} />
    </div>
  );
};

const EditorPageWrapper: React.FC<{
  avatar: Avatar;
  username: string;
  onLogout: () => void;
  onBack: () => void;
}> = (props) => {
  const { taskId } = useParams<{ taskId: string }>();
  if (!taskId) return <Navigate to="/" />;
  return <EditorPage {...props} taskId={taskId} />;
};

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [username, setUsername] = useState<string>(localStorage.getItem("username") || "");
  const [avatar, setAvatar] = useState<Avatar | null>(null);

  const navigate = typeof window !== "undefined" && (window as any).location ? (path: string) => { window.history.pushState({}, "", path); window.dispatchEvent(new PopStateEvent("popstate")); } : () => {};

  const handleAuthSuccess = (tk: string, user: string) => {
    setToken(tk);
    setUsername(user);
    setAvatar(null);
  };

  const handleLogout = () => {
    setToken(null);
    setUsername("");
    setAvatar(null);
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/");
  };

  const handleSelectAvatar = (a: Avatar) => {
    setAvatar(a);
    // 进入编辑器时自动生成 taskId 并跳转
    const taskId = genTaskId();
    navigate(`/editor/${taskId}`);
  };

  const handleBackToHome = () => {
    setAvatar(null);
    navigate("/");
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          !token ? <AuthPage onAuthSuccess={handleAuthSuccess} /> :
          !avatar ? <AvatarListPage token={token} username={username} onSelectAvatar={handleSelectAvatar} onLogout={handleLogout} /> :
          <Navigate to={`/editor/${genTaskId()}`} />
        } />
        <Route path="/editor/:taskId" element={
          token && avatar ?
            <EditorPageWrapper avatar={avatar} username={username} onLogout={handleLogout} onBack={handleBackToHome} />
            : <Navigate to="/" />
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
