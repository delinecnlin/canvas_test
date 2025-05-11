# 后端 API 文档

> 版本：v1  
> 基础路径：`https://<your-domain>/`  
> 所有接口均为 RESTful，数据格式为 JSON。  
> 认证方式：部分接口需登录（JWT Token），部分开放。

---

## 认证相关

### POST /auth/login
用户登录

- 请求体：
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- 响应：
  ```json
  {
    "token": "JWT Token",
    "username": "string"
  }
  ```

### POST /auth/register
用户注册

- 请求体：
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- 响应：
  ```json
  {
    "message": "注册成功"
  }
  ```

---

## 业务功能

### POST /generate/outline
生成课程大纲

- 请求体：
  ```json
  {
    "courseTopic": "string",
    "user": "string"
  }
  ```
- 响应：
  ```json
  {
    // 由 Dify 或小冰返回的结构
  }
  ```

### POST /generate/voice-script
生成口播脚本

- 请求体：
  ```json
  {
    "outline": "string",
    "user": "string"
  }
  ```
- 响应：
  ```json
  {
    // 由 Dify 或小冰返回的结构
  }
  ```

### POST /generate/mindmap
生成思维导图

- 请求体：
  ```json
  {
    "detailedScript": "string",
    "user": "string"
  }
  ```
- 响应：
  ```json
  {
    // 由 Dify 或小冰返回的结构
  }
  ```

### POST /generate/podcast
生成双人播客音频

- 请求体：
  ```json
  {
    "script": "string",
    "user": "string"
  }
  ```
- 响应：
  ```json
  {
    // 由 Dify 或小冰返回的结构
  }
  ```

### POST /generate/ppt
生成PPT

- 请求体：
  ```json
  {
    "script": "string",
    "user": "string"
  }
  ```
- 响应：
  ```json
  {
    // 由 Dify 或小冰返回的结构
  }
  ```

---

## 健康检查

### GET /
健康检查，返回字符串 "Backend is running"

---

## 说明

- 所有 POST 接口均需 Content-Type: application/json
- 后续如有文件上传、任务管理、素材管理等接口会补充
- 小冰 API Key 仅在后端配置，前端无需传递
- 如需扩展多端支持，可根据客户端类型在 Header 或参数中区分
