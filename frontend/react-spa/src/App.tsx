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

  React.useEffect(() => {
    if (!canvasRef.current) {
      console.log("[DEBUG] canvasRef.current is null");
      return;
    }
    if (!fabricRef.current && fabric && fabric.Canvas) {
      console.log("[DEBUG] fabric.Canvas init");
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: 540,
        height: 960,
        backgroundColor: "#fff",
        preserveObjectStacking: true,
      });
      fabricRef.current = canvas;
      canvas.on("selection:created", (e: any) => {
        console.log("[DEBUG] selection:created", e);
        setSelected(e.selected ? e.selected[0] : e.target);
      });
      canvas.on("selection:updated", (e: any) => {
        console.log("[DEBUG] selection:updated", e);
        setSelected(e.selected ? e.selected[0] : e.target);
      });
      canvas.on("selection:cleared", () => {
        console.log("[DEBUG] selection:cleared");
        setSelected(null);
      });
      canvas.on("mouse:down", (e: any) => {
        console.log("[DEBUG] mouse:down", e);
        if (e && e.target) setSelected(e.target);
      });
    } else {
      if (!fabric) console.log("[DEBUG] fabric is not loaded");
      if (fabricRef.current) console.log("[DEBUG] fabricRef.current already exists");
    }
  }, []);

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
    console.log("[DEBUG] addText click");
    if (!fabricRef.current || !fabric.Textbox) {
      console.log("[DEBUG] addText: fabricRef.current or fabric.Textbox missing");
      return;
    }
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
    console.log("[DEBUG] addImage click");
    if (!fabricRef.current || !fabric.Image) {
      console.log("[DEBUG] addImage: fabricRef.current or fabric.Image missing");
      return;
    }
    const url = window.prompt("请输入图片URL");
    if (!url) return;
    fabric.Image.fromURL(url, (img: any) => {
      if (!img) {
        console.log("[DEBUG] addImage: 图片加载失败", url);
        return;
      }
      img.set({ left: 100, top: 300, scaleX: 0.5, scaleY: 0.5 });
      fabricRef.current!.add(img);
      fabricRef.current!.setActiveObject(img);
      fabricRef.current!.requestRenderAll();
      setSelected(img);
    });
  };

  // 姿势点击
  const handlePostureClick = (posture: PostureInfo) => {
    console.log("[DEBUG] handlePostureClick", posture);
    setSelectedPosture(posture);
    if (!fabricRef.current || !fabric.Image) {
      console.log("[DEBUG] handlePostureClick: fabricRef.current or fabric.Image missing");
      return;
    }
    // 查找当前画布 postureTag=true 的对象
    const canvas = fabricRef.current;
    const postureImg = canvas.getObjects("image").find((obj: any) => obj.postureTag === true);
    if (postureImg) {
      // 替换图片内容，保留原有位置和缩放
      fabric.Image.fromURL(posture.previewPicture, (newImg: any) => {
        if (!newImg) {
          console.log("[DEBUG] handlePostureClick: 新姿势图片加载失败", posture.previewPicture);
          return;
        }
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
      // 没有姿势图片则直接插入
      fabric.Image.fromURL(posture.previewPicture, (img: any) => {
        if (!img) {
          console.log("[DEBUG] handlePostureClick: 新插入姿势图片加载失败", posture.previewPicture);
          return;
        }
        img.set({ left: 120, top: 120, scaleX: 0.5, scaleY: 0.5 });
        img.postureTag = true;
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.requestRenderAll();
        setSelected(img);
      });
    }
  };

  return (
    <div>
      <button onClick={onBack} style={{ position: "fixed", top: 10, left: 20, zIndex: 999, background: "#2563eb", color: "#fff", border: "none", borderRadius: 5, padding: "6px 14px", cursor: "pointer" }}>返回主页</button>
      <button onClick={onLogout} style={{ position: "fixed", top: 10, right: 20, zIndex: 999, background: "#e11d48", color: "#fff", border: "none", borderRadius: 5, padding: "6px 14px", cursor: "pointer" }}>退出登录</button>
      <div className="main-layout">
        {/* 左侧：场景管理 */}
        <aside className="sidebar left">
          {/* 素材Tab栏 */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 18 }}>
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
                  backgroundColor: tab.key === (window as any).materialTab ? "#e0e7ff" : "transparent"
                }}
                onClick={() => { setMaterialTab(tab.key); }}
                title={tab.label}
              >
                <div>{tab.icon}</div>
                <div style={{ fontSize: 12 }}>{tab.label}</div>
              </button>
            ))}
          </div>
          {/* 素材内容区 */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {materialTab === "scene" && (
              <div>
                <h3>场景</h3>
                <ul id="scene-list">
                  <li className="scene-item active" data-index="0">1</li>
                </ul>
                <button id="add-scene-btn">添加场景</button>
              </div>
            )}
            {materialTab === "image" && (
              <div>
                <h3>图片素材</h3>
                <div
                  style={{
                    border: "2px dashed #aaa",
                    borderRadius: 8,
                    padding: 18,
                    textAlign: "center",
                    marginBottom: 12,
                    background: "#fafbfc",
                    cursor: "pointer"
                  }}
                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleImageFileChange(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.onchange = e => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) handleImageFileChange(file);
                    };
                    input.click();
                  }}
                >
                  <div style={{ color: "#888" }}>拖拽或点击上传图片</div>
                </div>
                <input
                  type="text"
                  placeholder="粘贴图片URL"
                  value={imageUrlInput}
                  onChange={e => handleImageUrlInput(e.target.value)}
                  style={{ width: "100%", padding: 6, borderRadius: 4, border: "1px solid #ddd", marginBottom: 8 }}
                />
                <button
                  onClick={handleInsertImage}
                  style={{ padding: "6px 18px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 5, fontSize: 15, cursor: "pointer", marginBottom: 10 }}
                  disabled={!imagePreview && !imageUrlInput}
                >
                  插入到画布
                </button>
                <div style={{ marginTop: 8 }}>
                  {imagePreview && (
                    <img src={imagePreview} alt="预览" style={{ maxWidth: 120, maxHeight: 120, borderRadius: 6, marginBottom: 8 }} />
                  )}
                </div>
              </div>
            )}
            {materialTab === "video" && (
              <div>
                <h3>视频素材</h3>
                <div style={{ color: "#888" }}>拖拽或点击上传视频（待实现）</div>
              </div>
            )}
            {materialTab === "audio" && (
              <div>
                <h3>音乐素材</h3>
                <div style={{ color: "#888" }}>拖拽或点击上传音频（待实现）</div>
              </div>
            )}
            {materialTab === "text" && (
              <div>
                <h3>文字素材</h3>
                <button onClick={addText}>插入文字到画布</button>
              </div>
            )}
            {materialTab === "sticker" && (
              <div>
                <h3>贴纸素材</h3>
                <div style={{ color: "#888" }}>拖拽或点击上传贴纸（待实现）</div>
              </div>
            )}
          </div>
        </aside>
        {/* 中间：画布编辑区 */}
        <main className="center">
          <div id="canvas-container">
            <canvas ref={canvasRef} width={540} height={960} id="editor-canvas" />
          </div>
        </main>
        {/* 右侧：仅保留姿势和属性 */}
        <aside className="sidebar right">
          <div style={{ margin: "18px 0" }}>
            <h3>姿势选择</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {avatar.postureInfos && avatar.postureInfos.length > 0 ? (
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
          </div>
          <div id="property-panel">
            <h3>属性</h3>
            <div id="property-content">
              {selected ? (
                <div>
                  <div>
                    <strong>类型：</strong>
                    {selected.type === "textbox" || selected.type === "text"
                      ? "文字"
                      : selected.type === "image"
                      ? "图片"
                      : selected.type}
                  </div>
                  {/* 仅实现部分属性，后续可扩展 */}
                  {selected.type === "textbox" || selected.type === "text" ? (
                    <>
                      <div>
                        <label>内容：</label>
                        <input
                          type="text"
                          value={(selected as any).text || ""}
                          onChange={e => handlePropChange({ text: e.target.value })}
                        />
                      </div>
                      <div>
                        <label>字号：</label>
                        <input
                          type="number"
                          value={(selected as any).fontSize || 32}
                          onChange={e => handlePropChange({ fontSize: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label>颜色：</label>
                        <input
                          type="color"
                          value={
                            (selected as any).fill
                              ? (selected as any).fill as string
                              : "#222222"
                          }
                          onChange={e => handlePropChange({ fill: e.target.value })}
                        />
                      </div>
                    </>
                  ) : null}
                  {selected.type === "image" ? (
                    <>
                      <div>
                        <label>X：</label>
                        <input
                          type="number"
                          value={Math.round(selected.left || 0)}
                          onChange={e => handlePropChange({ left: Number(e.target.value) })}
                        />
                        <label>Y：</label>
                        <input
                          type="number"
                          value={Math.round(selected.top || 0)}
                          onChange={e => handlePropChange({ top: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label>宽：</label>
                        <input
                          type="number"
                          value={Math.round((selected.width || 0) * (selected.scaleX || 1))}
                          onChange={e => {
                            const w = Number(e.target.value);
                            if (selected.width) handlePropChange({ scaleX: w / selected.width });
                          }}
                        />
                        <label>高：</label>
                        <input
                          type="number"
                          value={Math.round((selected.height || 0) * (selected.scaleY || 1))}
                          onChange={e => {
                            const h = Number(e.target.value);
                            if (selected.height) handlePropChange({ scaleY: h / selected.height });
                          }}
                        />
                      </div>
                    </>
                  ) : null}
                </div>
              ) : (
                "选中元素后可编辑属性"
              )}
            </div>
          </div>
        </aside>
      </div>
      {/* 声音/数字人弹窗 */}
      {showVoiceModal && (
        <div style={{
          position: "fixed", left: 0, top: 0, width: "100vw", height: "100vh", background: "#0006", zIndex: 2000,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 32, minWidth: 400, maxWidth: 600, maxHeight: "80vh", overflowY: "auto" }}>
            <h3>选择声音/数字人</h3>
            <div style={{ marginBottom: 12 }}>
              <label>性别：</label>
              <select value={voiceGender} onChange={e => setVoiceGender(e.target.value)}>
                <option value="">全部</option>
                <option value="male">男</option>
                <option value="female">女</option>
              </select>
              <label style={{ marginLeft: 16 }}>语言：</label>
              <select value={voiceLang} onChange={e => setVoiceLang(e.target.value)}>
                <option value="">全部</option>
                <option value="zh-CN">中文</option>
                <option value="en-US">英文</option>
              </select>
            </div>
            {voiceLoading ? (
              <div>加载中...</div>
            ) : (
              <ul style={{ maxHeight: 200, overflowY: "auto", padding: 0, margin: 0 }}>
                {voiceList.map(v => (
                  <li key={v.id || v.name} style={{ listStyle: "none", marginBottom: 8 }}>
                    <strong>{v.name}</strong>
                    <span style={{ color: "#888", fontSize: 12, marginLeft: 8 }}>
                      {v.language} {v.gender}
                    </span>
                    {v.auditionFile && (
                      <audio src={v.auditionFile} controls style={{ verticalAlign: "middle", width: 120, marginLeft: 8 }} />
                    )}
                  </li>
                ))}
                {voiceList.length === 0 && <li style={{ color: "#888" }}>无可用声音</li>}
              </ul>
            )}
            <div style={{ marginTop: 18, textAlign: "right" }}>
              <button onClick={() => setShowVoiceModal(false)} style={{ padding: "6px 18px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 5, fontSize: 15, cursor: "pointer" }}>关闭</button>
            </div>
          </div>
        </div>
      )}
      {/* 底部操作栏 */}
      <div className="bottom-panel" style={{ display: "flex", alignItems: "center", gap: 18, padding: "12px 24px", borderTop: "1px solid #eee", background: "#fafbfc" }}>
        <button
          onClick={() => {
            // 暂存草稿
            if (!fabricRef.current) return;
            const draft = {
              taskId,
              elements: fabricRef.current.toJSON(),
              time: Date.now(),
              name: "草稿-" + new Date().toLocaleString(),
              avatar: avatar // 保存avatar信息
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
            // 这里可POST到后端
            await fetch("/api/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ taskId, elements: json })
            });
            alert("已提交生成请求");
          }}
          style={{ padding: "8px 22px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 5, fontSize: 16, cursor: "pointer" }}
        >最终生成</button>
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
