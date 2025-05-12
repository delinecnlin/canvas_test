import React, { useEffect, useState } from "react";

interface Avatar {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  summaryImage?: string;
}

interface AvatarListPageProps {
  token: string;
  username: string;
  onSelectAvatar: (avatar: Avatar) => void;
  onLogout: () => void;
}

const backendUrl = "http://localhost:3001";

const AvatarListPage: React.FC<AvatarListPageProps> = ({
  token,
  username,
  onSelectAvatar,
  onLogout,
}) => {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`${backendUrl}/api/xiaoice/avatars`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
      .then(res => res.json())
      .then(data => {
        setAvatars(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setMsg("获取数字人列表失败");
        setLoading(false);
      });
  }, []);

  // 草稿任务列表
  const [drafts, setDrafts] = useState<any[]>([]);

  React.useEffect(() => {
    try {
      const ds = JSON.parse(localStorage.getItem("drafts") || "[]");
      setDrafts(Array.isArray(ds) ? ds : []);
    } catch {
      setDrafts([]);
    }
  }, []);

  const handleOpenDraft = (draft: any) => {
    // 跳转到 /editor/:taskId
    window.location.href = `/editor/${draft.taskId}`;
  };

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", background: "#fff", borderRadius: 10, boxShadow: "0 2px 12px #0001", padding: 32 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0 }}>欢迎回来，{username}</h2>
        </div>
        <button onClick={onLogout} style={{ background: "#e11d48", color: "#fff", border: "none", borderRadius: 5, padding: "8px 18px", fontSize: 16, cursor: "pointer" }}>
          退出登录
        </button>
      </header>
      {/* 草稿任务列表 */}
      {drafts.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 18, margin: "0 0 10px 0" }}>我的项目</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
            {drafts.map((d, i) => (
              <div
                key={d.taskId}
                style={{
                  border: "1px solid #b6b6b6",
                  borderRadius: 8,
                  padding: 12,
                  minWidth: 180,
                  background: "#f7f7fa",
                  cursor: "pointer",
                  boxShadow: "0 1px 4px #0001"
                }}
                onClick={() => handleOpenDraft(d)}
                title={d.name}
              >
                <div style={{ fontWeight: 600, fontSize: 16 }}>{d.name || "未命名项目"}</div>
                <div style={{ color: "#888", fontSize: 13, marginTop: 2 }}>
                  {d.time ? new Date(d.time).toLocaleString() : ""}
                </div>
                <div style={{ color: "#2563eb", fontSize: 13, marginTop: 6 }}>点击进入编辑</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <h3>请选择一个数字人进入编辑器</h3>
      {loading ? (
        <div>加载中...</div>
      ) : msg ? (
        <div style={{ color: "#e11d48" }}>{msg}</div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 32 }}>
          {avatars.map(a => (
            <div
              key={a.id}
              className="avatar-card"
              style={{
                border: "1px solid #eee",
                borderRadius: 8,
                padding: 16,
                cursor: "pointer",
                width: 180,
                textAlign: "center",
                boxShadow: "0 1px 4px #0001",
                transition: "box-shadow 0.2s"
              }}
              onClick={() => onSelectAvatar(a)}
            >
              <img
                src={a.thumbnail || a.summaryImage || ""}
                alt={a.name}
                style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover" }}
              />
              <div style={{ marginTop: 8, fontWeight: "bold" }}>{a.name}</div>
              <div style={{ fontSize: 13, color: "#888" }}>{a.description || ""}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AvatarListPage;
