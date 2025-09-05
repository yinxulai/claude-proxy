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

- 使用 Claude Code 工具访问 OpenAI、Google Gemini、Groq、Ollama 等服务
- 在不修改现有 Claude 客户端代码的情况下切换到其他 AI 服务
- 为团队提供统一的 AI API 访问入口

## 🔧 API 使用说明

### 动态路由格式

```text
https://your-proxy-domain/<protocol>/<api-domain>/<path>/<model>/v1/messages
```

**参数说明：**

- `protocol`: `https` 或 `http`
- `api-domain`: 目标 API 的域名
- `path`: API 路径（通常是 `openai/v1` 或 `v1`）
- `model`: 要使用的模型名称

### Claude Code 工具使用

**基本环境变量配置：**

```bash
# 设置代理服务器地址
export ANTHROPIC_BASE_URL=https://claude-proxy.yinxulai.com/<protocol>/<api-domain>/<path>/<model>
# API Key（使用动态路由时可以设置任意值）
export ANTHROPIC_API_KEY="any-value"

# 测试使用
claude code "Hello, how are you?"
```

**永久配置：**

```bash
# 添加到 shell 配置文件
echo 'export ANTHROPIC_BASE_URL=https://claude-proxy.yinxulai.com/<protocol>/<api-domain>/<path>/<model>' >> ~/.zshrc
echo 'export ANTHROPIC_API_KEY="any-value"' >> ~/.zshrc
source ~/.zshrc
```

### 支持的 API 提供商

- **OpenAI** - `api.openai.com/v1`
- **Google Gemini** - `generativelanguage.googleapis.com/v1beta`
- **Groq** - `api.groq.com/openai/v1`
- **Ollama** - `localhost:11434/v1`（本地部署）
- **Azure OpenAI** - `your-resource.openai.azure.com/openai/deployments/your-deployment`
- 以及其他任何兼容 OpenAI API 格式的服务

### 直接 API 调用示例

**使用公共服务 + Groq API：**

```bash
curl -X POST "https://claude-proxy.yinxulai.com/https/api.groq.com/openai/v1/llama3-70b-8192/v1/messages" \
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

**使用公共服务 + OpenAI API：**

```bash
curl -X POST "https://claude-proxy.yinxulai.com/https/api.openai.com/v1/gpt-4o-mini/v1/messages" \
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

## 🚀 部署指南

### 方式一：使用公共服务（最简单）

我们提供了一个免费的公共代理服务，您可以直接使用而无需部署：

**服务地址：** `https://claude-proxy.yinxulai.com`

**特点：**

- ✅ 免费使用，无需注册
- ✅ 支持所有主流 AI API 提供商
- ✅ 完整支持流式响应和 Tool Calling
- ⚠️ 仅用于测试和开发，生产环境建议自部署

### 方式二：使用 Docker（推荐自部署）

如果您需要在生产环境使用或希望更好的隐私保护，建议自行部署：

```bash
# 拉取镜像
docker pull ghcr.io/yinxulai/claude-proxy

# 运行容器
docker run -p 3000:3000 \
  -e HAIKU_MODEL_NAME="gpt-4o-mini" \
  -e HAIKU_BASE_URL="https://api.openai.com/v1" \
  -e HAIKU_API_KEY="your-openai-api-key" \
  ghcr.io/yinxulai/claude-proxy
```

**环境变量配置：**

```bash
# 设置代理服务器地址
export ANTHROPIC_BASE_URL=http://localhost:3000
export ANTHROPIC_API_KEY="any-value"

# 测试使用
claude code "你好，请介绍一下自己"
```

**自定义端口部署：**

```bash
# 运行在端口 8082
docker run -p 8082:3000 \
  -e HAIKU_MODEL_NAME="gpt-4o-mini" \
  -e HAIKU_BASE_URL="https://api.openai.com/v1" \
  -e HAIKU_API_KEY="your-openai-api-key" \
  ghcr.io/yinxulai/claude-proxy

# 对应的环境变量配置
export ANTHROPIC_BASE_URL=http://localhost:8082
export ANTHROPIC_API_KEY="any-value"
claude code "请写一首关于春天的诗"
```

### 方式三：从源码构建

如果您希望从源码构建或进行自定义开发：

```bash
# 克隆仓库
git clone https://github.com/yinxulai/claude-proxy.git
cd claude-proxy

# 安装依赖
npm install

# 构建镜像
docker build -t claude-proxy .

# 运行容器
docker run -p 3000:3000 \
  -e HAIKU_MODEL_NAME="gpt-4o-mini" \
  -e HAIKU_BASE_URL="https://api.openai.com/v1" \
  -e HAIKU_API_KEY="your-openai-api-key" \
  claude-proxy
```

### 预配置的 Haiku 路由

如果您配置了 Haiku 相关的环境变量，可以直接使用简化的路由：

```bash
curl -X POST "https://your-proxy-domain/v1/messages" \
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

## 🔍 工作原理

1. **请求解析**：从 URL 路径中提取目标 API 地址和模型信息
2. **格式转换**：将 Claude API 请求格式转换为 OpenAI API 格式
3. **请求转发**：将转换后的请求发送到目标 API
4. **响应转换**：将 OpenAI API 响应转换回 Claude API 格式
5. **流式处理**：支持实时流式响应的转换和转发

## 🧪 开发测试

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

## 🛡️ 安全注意事项

### 公共服务使用须知

- **仅用于测试和开发**：公共服务 `claude-proxy.yinxulai.com` 仅供学习、测试和开发使用
- **数据隐私**：虽然代理服务器不会记录您的请求内容，但建议生产环境使用自部署的服务
- **服务稳定性**：公共服务可能会有维护停机，不保证 100% 可用性
- **使用限制**：可能会对频繁请求进行限制以保证服务质量

### 自部署安全建议

- 代理服务器会转发您的 API 密钥，请确保部署在可信的环境中
- 建议为生产环境设置适当的访问控制和速率限制
- 定期更新依赖项以获取安全补丁

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

- [claude_proxy](https://github.com/tingxifa/claude_proxy) 核心转换器
- [Anthropic](https://www.anthropic.com/) - Claude API
- [OpenAI](https://openai.com/) - OpenAI API 标准
- [Cloudflare](https://www.cloudflare.com/) - Workers 平台

---

如果这个项目对您有帮助，请给个 ⭐️ 星标支持！
