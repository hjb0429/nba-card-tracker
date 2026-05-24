# 部署上线指南（免费方案，约15分钟）

## 你需要准备

- 一个邮箱（用于注册账号）
- 15-20分钟时间
- 你的电脑（已经有项目代码）

## 第一步：注册GitHub账号（5分钟）

1. 打开 https://github.com 点击 Sign up
2. 输入邮箱、密码、用户名，完成注册
3. 验证邮箱（GitHub会发一封邮件）

## 第二步：推送代码到GitHub（2分钟）

打开终端（命令行），依次执行：

```bash
cd "c:/Users/Administrator/Desktop/nba球星卡"

# 创建GitHub仓库
git add .
git commit -m "Initial commit"

# 在GitHub网页上创建一个新仓库（记下仓库地址）
# 然后执行：
git remote add origin https://github.com/你的用户名/nba-card-tracker.git
git push -u origin main
```

## 第三步：部署后端到Render（5分钟）

1. 打开 https://render.com 点击 "Get Started"，用GitHub账号登录
2. 点击 "New +" → "Web Service"
3. 选择你的GitHub仓库
4. 配置：
   - **Name**: nba-card-api
   - **Root Directory**: backend
   - **Build Command**: npm install && npm run build
   - **Start Command**: npm start
   - **Plan**: Free
5. 点击 "Deploy Web Service"
6. 等待部署完成，记录下你的后端地址（如 `https://nba-card-api.onrender.com`）

## 第四步：部署前端到Vercel（3分钟）

1. 打开 https://vercel.com 点击 "Sign Up"，用GitHub账号登录
2. 点击 "New Project"
3. 选择你的GitHub仓库
4. 配置：
   - **Root Directory**: frontend
   - **Build Command**: npm run build
   - **Output Directory**: dist
5. 点击 "Deploy"
6. 部署完成后，进入项目 Settings → Rewrites，添加：
   ```
   Source: /api/(.*)
   Destination: https://你的后端地址.onrender.com/api/$1
   ```
7. Vercel会给你一个地址（如 `https://xxx.vercel.app`），这就是你的网站地址

## 注意事项

- Render免费版15分钟无人访问会休眠，下次打开需等30-60秒
- 如果想保持7×24小时在线，升级Render到$7/月
- 数据库文件在Render重启后会丢失，用户数据需重新录入
- 稳定使用建议后续升级到付费方案

## 升级到稳定版（可选，月均30-50元）

| 部分 | 方案 | 费用 |
|------|------|------|
| 服务器 | 阿里云轻量服务器（2核2G） | 34元/月 |
| 域名 | 阿里云/腾讯云 .com | 约50元/年 |
| 部署 | 前后端放同一台服务器 | 免费 |

好处：7×24小时在线，数据库不丢失，访问速度更快。
