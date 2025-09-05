# Claude Proxy

一个强大的代理服务器，能够将 Claude API 格式的请求无缝转换为 OpenAI API 格式，让您能够在任何支持 OpenAI API 的服务上使用 Claude 客户端工具。

## ✨ 功能特性

- **🔄 API 格式转换**：自动将 Claude API 请求转换为 OpenAI API 格式，响应时再转换回来
- **🌐 动态路由**：支持通过 URL 路径动态指定目标 API 端点和模型，无需重新部署
- **🛠️ Tool Calling 支持**：完整支持函数调用功能，自动转换工具格式并清理 schema
- **📡 流式响应**：完全支持 Server-Sent Events (SSE) 流式响应
- **⚡ Cloudflare Workers**：部署在全球边缘网络，提供低延迟访问
- **🔧 预配置路由**：为常用模型（如 Haiku）提供快捷配置

## 🎯 使用场景

- 使用 Claude CLI 工具访问 OpenAI、Google Gemini、Groq、Ollama 等服务
- 在不修改现有 Claude 客户端代码的情况下切换到其他 AI 服务
- 为团队提供统一的 AI API 访问入口

## 🚀 快速开始

### 方式一：使用公共代理服务

如果您想快速体验，可以直接使用预部署的公共服务：

```bash
# 配置 Claude CLI 使用代理
export CLAUDE_API_URL="https://your-proxy-domain.workers.dev"
export CLAUDE_API_KEY="your-target-api-key"

# 发送请求（以 Groq 为例）
claude "你好，世界！" --model "https/api.groq.com/openai/v1/llama3-70b-8192"
```

### 方式二：部署自己的代理服务

1. **克隆仓库**

   ```bash
   git clone https://github.com/yinxulai/claude-proxy.git
   cd claude-proxy
   ```

2. **安装依赖**

   ```bash
   npm install
   ```

3. **配置环境变量（可选）**

   创建 `wrangler.toml` 文件：

   ```toml
   name = "claude-proxy"
   main = "source/proxy.ts"
   compatibility_date = "2023-12-01"

   [vars]
   HAIKU_MODEL_NAME = "gpt-4o-mini"
   HAIKU_BASE_URL = "https://api.openai.com/v1"
   HAIKU_API_KEY = "your-openai-api-key"
   ```

4. **部署到 Cloudflare Workers**

   ```bash
   # 安装 Wrangler CLI
   npm install -g wrangler
   
   # 登录 Cloudflare
   npx wrangler login
   
   # 部署
   npx wrangler deploy
   ```

## 🔧 API 使用说明

### 动态路由格式

```text
https://your-proxy-domain.workers.dev/<protocol>/<api-domain>/<path>/<model>/v1/messages
```

**参数说明：**

- `protocol`: `https` 或 `http`
- `api-domain`: 目标 API 的域名
- `path`: API 路径（通常是 `openai/v1` 或 `v1`）
- `model`: 要使用的模型名称

### 请求示例

**使用 Groq API：**

```bash
curl -X POST "https://your-proxy-domain.workers.dev/https/api.groq.com/openai/v1/llama3-70b-8192/v1/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-groq-api-key" \
  -d '{
    "model": "claude-3-haiku-20240307",
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": "Hello, world!"
      }
    ]
  }'
```

**使用 OpenAI API：**

```bash
curl -X POST "https://your-proxy-domain.workers.dev/https/api.openai.com/v1/gpt-4/v1/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-openai-api-key" \
  -d '{
    "model": "claude-3-haiku-20240307",
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user", 
        "content": "Hello, world!"
      }
    ]
  }'
```

### 预配置的 Haiku 路由

如果您在 `wrangler.toml` 中配置了 Haiku 相关的环境变量，可以直接使用：

```bash
curl -X POST "https://your-proxy-domain.workers.dev/v1/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: will-be-ignored-uses-configured-key" \
  -d '{
    "model": "claude-3-haiku-20240307",
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": "Hello, world!"
      }
    ]
  }'
```

## 🧪 本地开发

1. **设置开发环境变量**

   ```env
   HAIKU_MODEL_NAME=gpt-4o-mini
   HAIKU_BASE_URL=https://api.openai.com/v1
   HAIKU_API_KEY=your-openai-api-key
   ```

2. **启动开发服务器**

   ```bash
   npx wrangler dev
   ```

3. **运行测试**

   ```bash
   # 运行所有测试
   npm test
   
   # 运行单次测试
   npm run test:run
   
   # 查看测试覆盖率
   npm run test:coverage
   
   # 开启测试 UI
   npm run test:ui
   ```

## 📝 支持的 API 提供商

- **OpenAI** - `api.openai.com/v1`
- **Google Gemini** - `generativelanguage.googleapis.com/v1beta`
- **Groq** - `api.groq.com/openai/v1`
- **Ollama** - `localhost:11434/v1`（本地部署）
- **Azure OpenAI** - `your-resource.openai.azure.com/openai/deployments/your-deployment`
- 以及其他任何兼容 OpenAI API 格式的服务

## 🔍 工作原理

1. **请求解析**：从 URL 路径中提取目标 API 地址和模型信息
2. **格式转换**：将 Claude API 请求格式转换为 OpenAI API 格式
3. **请求转发**：将转换后的请求发送到目标 API
4. **响应转换**：将 OpenAI API 响应转换回 Claude API 格式
5. **流式处理**：支持实时流式响应的转换和转发

## 🛡️ 安全注意事项

- 代理服务器会转发您的 API 密钥，请确保部署在可信的环境中
- 建议为生产环境设置适当的访问控制和速率限制
- 定期更新依赖项以获取安全补丁

## 📁 项目结构

```text
claude-proxy/
├── source/              # 源代码目录
│   ├── proxy.ts        # 主要代理逻辑
│   └── server.ts       # 服务器入口
├── test/               # 测试文件
│   ├── basic-api.test.ts
│   ├── dynamic-routing.test.ts
│   ├── haiku-model.test.ts
│   ├── streaming.test.ts
│   ├── tool-calling.test.ts
│   └── utils.ts
├── package.json        # 项目配置
├── tsconfig.json       # TypeScript 配置
├── vitest.config.ts    # 测试配置
└── README.md          # 项目文档
```

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建您的功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Anthropic](https://www.anthropic.com/) - Claude API
- [OpenAI](https://openai.com/) - OpenAI API 标准
- [Cloudflare](https://www.cloudflare.com/) - Workers 平台

---

如果这个项目对您有帮助，请给个 ⭐️ 星标支持！
