# Claude Proxy

[![测试状态](https://github.com/yinxulai/claude-proxy/actions/workflows/test.yml/badge.svg)](https://github.com/yinxulai/claude-proxy/actions/workflows/test.yml)

一个强大的代理服务器，能够将 Claude API 格式的请求无缝转换为 OpenAI API 格式，让您能够在任何支持 OpenAI API 的服务上使用 Claude 客户端工具。

## 🎉 免费公共服务

我们提供一个**免费的公共代理服务**，您可以立即开始使用而无需任何部署或配置：

**🌐 服务地址：** `https://claude-proxy.yinxulai.com`

### ✨ 公共服务特点

- ✅ **完全免费**：无需注册，无需付费
- ✅ **开箱即用**：无需部署，立即可用
- ✅ **多平台支持**：支持 OpenAI、Google Gemini、Groq、Ollama 等
- ✅ **完整功能**：支持流式响应、Tool Calling、函数调用
- ✅ **全球加速**：基于 Cloudflare Workers，全球低延迟
- ⚠️ **适用场景**：测试、开发、学习（生产环境建议自部署）

### 🚀 立即开始使用

#### 方式一：直接在 Claude Code 中使用

```bash
# 设置环境变量（以 OpenAI 为例）
export ANTHROPIC_BASE_URL=https://claude-proxy.yinxulai.com/https/api.openai.com/v1/gpt-4o-mini
export ANTHROPIC_API_KEY="any-value"

# 立即使用
claude code "Hello, how are you?"
```

#### 方式二：直接 API 调用

```bash
# 使用 Groq API
curl -X POST "https://claude-proxy.yinxulai.com/https/api.groq.com/openai/v1/llama3-70b-8192/v1/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-groq-api-key" \
  -d '{
    "model": "claude-3-haiku-20240307",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello, world!"}]
  }'
```

### 🔧 支持的 AI 服务商

| 服务商 | URL 格式示例 |
|--------|-------------|
| **OpenAI** | `https://claude-proxy.yinxulai.com/https/api.openai.com/v1/gpt-4o-mini` |
| **Google Gemini** | `https://claude-proxy.yinxulai.com/https/generativelanguage.googleapis.com/v1beta/gemini-pro` |
| **Groq** | `https://claude-proxy.yinxulai.com/https/api.groq.com/openai/v1/llama3-70b-8192` |
| **Ollama 本地** | `https://claude-proxy.yinxulai.com/http/localhost:11434/v1/llama3` |

## ✨ 功能特性

- **🔄 API 格式转换**：自动将 Claude API 请求转换为 OpenAI API 格式，响应时再转换回来
- **🌐 动态路由**：支持通过 URL 路径动态指定目标 API 端点和模型，无需重新部署
- **🛠️ Tool Calling 支持**：完整支持函数调用功能，自动转换工具格式并清理 schema
- **📡 流式响应**：完全支持 Server-Sent Events (SSE) 流式响应
- **⚡ 全球加速**：部署在 Cloudflare Workers 边缘网络，提供低延迟访问
- **🔧 预配置路由**：为常用模型（如 Haiku）提供快捷配置

## 🎯 使用场景

- 使用 Claude Code 工具访问 OpenAI、Google Gemini、Groq、Ollama 等服务
- 在不修改现有 Claude 客户端代码的情况下切换到其他 AI 服务
- 为团队提供统一的 AI API 访问入口
- 快速测试和比较不同 AI 模型的效果

## � 详细使用指南

### 动态路由格式

```text
https://claude-proxy.yinxulai.com/<protocol>/<api-domain>/<path>/<model>/v1/messages
```

**参数说明：**

- `protocol`: `https` 或 `http`
- `api-domain`: 目标 API 的域名
- `path`: API 路径（通常是 `openai/v1` 或 `v1`）
- `model`: 要使用的模型名称

### Claude Code 工具配置

#### 快速配置（推荐）

```bash
# 一键配置 OpenAI
export ANTHROPIC_BASE_URL=https://claude-proxy.yinxulai.com/https/api.openai.com/v1/gpt-4o-mini
export ANTHROPIC_API_KEY="any-value"

# 一键配置 Groq
export ANTHROPIC_BASE_URL=https://claude-proxy.yinxulai.com/https/api.groq.com/openai/v1/llama3-70b-8192
export ANTHROPIC_API_KEY="any-value"

# 测试使用
claude code "请介绍一下自己"
```

#### 永久配置

```bash
# 添加到 shell 配置文件
echo 'export ANTHROPIC_BASE_URL=https://claude-proxy.yinxulai.com/https/api.openai.com/v1/gpt-4o-mini' >> ~/.zshrc
echo 'export ANTHROPIC_API_KEY="any-value"' >> ~/.zshrc
source ~/.zshrc
```

### 更多 API 调用示例

#### 使用 OpenAI API

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

#### 使用 Google Gemini API

```bash
curl -X POST "https://claude-proxy.yinxulai.com/https/generativelanguage.googleapis.com/v1beta/gemini-pro/v1/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-gemini-api-key" \
  -d '{
    "model": "claude-3-haiku-20240307",
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": "请用中文回答：什么是人工智能？"
      }
    ]
  }'
```

## 🚀 自部署指南

### 方式一：使用 Docker（推荐）

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

### 方式二：从源码构建

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

## 🛡️ 安全须知

### 🔥 公共服务使用说明

#### ⚠️ 重要提醒

- **测试和开发专用**：公共服务 `claude-proxy.yinxulai.com` 仅供学习、测试和开发使用
- **生产环境须知**：生产环境强烈建议使用自部署服务以保证数据安全和服务稳定性
- **数据隐私**：代理服务器不会记录或存储您的请求内容，但请勿在公共服务中处理敏感信息
- **服务稳定性**：公共服务可能会有维护停机，无法保证 100% 可用性
- **合理使用**：请合理使用公共服务，避免过度频繁的请求

### 🔐 自部署安全建议

- **API 密钥安全**：代理服务器会转发您的 API 密钥，请确保部署在可信的环境中
- **访问控制**：建议为生产环境设置适当的访问控制和速率限制
- **定期更新**：定期更新依赖项以获取最新的安全补丁
- **网络安全**：确保部署环境的网络安全配置

## ❓ 常见问题

### Q: 公共服务是否真的免费？

A: 是的，完全免费。我们提供这个服务是为了帮助开发者更容易地测试和学习各种 AI 服务。

### Q: 支持哪些 AI 模型？

A: 支持所有兼容 OpenAI API 格式的服务，包括 OpenAI、Google Gemini、Groq、Ollama、Azure OpenAI 等。

### Q: 公共服务有使用限制吗？

A: 为了保证服务质量，我们可能会对频繁请求进行适当限制。正常使用不会受到影响。

### Q: 如何报告问题或建议？

A: 请在 GitHub 仓库中提交 Issue，我们会及时回复和处理。

## 🔍 技术原理

1. **请求解析**：从 URL 路径中提取目标 API 地址和模型信息
2. **格式转换**：将 Claude API 请求格式转换为 OpenAI API 格式
3. **请求转发**：将转换后的请求发送到目标 API
4. **响应转换**：将 OpenAI API 响应转换回 Claude API 格式
5. **流式处理**：支持实时流式响应的转换和转发

## 🧪 开发与测试

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

- [claude_proxy](https://github.com/tingxifa/claude_proxy) - 核心转换器
- [Anthropic](https://www.anthropic.com/) - Claude API
- [OpenAI](https://openai.com/) - OpenAI API 标准
- 所有为开源社区做出贡献的开发者们
