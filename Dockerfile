FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json（如果存在）
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 复制 TypeScript 配置文件
COPY tsconfig.json ./

# 复制源代码
COPY source/ ./source/

# 安装 TypeScript 并构建项目
RUN npm install && npm run build

# 删除源代码和 TypeScript 配置（只保留编译后的 JavaScript）
RUN rm -rf source/ tsconfig.json

# 暴露端口（可通过 PORT 环境变量自定义，默认 3000）
EXPOSE 3000

# 启动应用
CMD ["npm", "start"]
