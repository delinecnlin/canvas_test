import React, { useState } from "react";

interface AuthPageProps {
  onAuthSuccess: (token: string, username: string) => void;
}

const backendUrl = "http://localhost:3001";

const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    if (!username || !password) {
      setMsg("请输入用户名和密码");
      return;
    }
    const url = mode === "login" ? "/auth/login" : "/auth/register";
    try {
      const res = await fetch(`${backendUrl}${url}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok && mode === "login" && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.username);
        onAuthSuccess(data.token, data.username);
      } else if (res.ok && mode === "register") {
        setMsg("注册成功，请登录");
        setMode("login");
      } else {
        setMsg(data.error || "操作失败");
      }
    } catch (e) {
      setMsg("网络错误");
    }
  };

  return (
    <div style={{
      maxWidth: 340,
      margin: "80px auto",
      background: "#fff",
      borderRadius: 10,
      boxShadow: "0 2px 12px #0001",
      padding: 32,
      textAlign: "center"
    }}>
      <h2>{mode === "login" ? "登录" : "注册"}</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="用户名"
          value={username}
          onChange={e => setUsername(e.target.value)}
          style={{ width: "90%", margin: "10px 0", padding: 8, fontSize: 16 }}
          required
        />
        <input
          type="password"
          placeholder="密码"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ width: "90%", margin: "10px 0", padding: 8, fontSize: 16 }}
          required
        />
        <button
          type="submit"
          style={{
            width: "100%",
            padding: 10,
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 5,
            fontSize: 16,
            marginTop: 10,
            cursor: "pointer"
          }}
        >
          {mode === "login" ? "登录" : "注册"}
        </button>
      </form>
      <div style={{ margin: "16px 0" }}>
        {mode === "login" ? (
          <>
            还没有账号？{" "}
            <a href="#" onClick={e => { e.preventDefault(); setMode("register"); setMsg(""); }}>
              注册
            </a>
          </>
        ) : (
          <>
            已有账号？{" "}
            <a href="#" onClick={e => { e.preventDefault(); setMode("login"); setMsg(""); }}>
              登录
            </a>
          </>
        )}
      </div>
      {msg && <div style={{ color: mode === "register" && msg.startsWith("注册成功") ? "#16a34a" : "#e11d48", marginTop: 8 }}>{msg}</div>}
    </div>
  );
};

export default AuthPage;
