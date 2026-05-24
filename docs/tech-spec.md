# NBA球星卡市场走势软件 — 技术规范

## 技术栈

### 前端
| 项目 | 选型 | 理由 |
|------|------|------|
| 框架 | React 18 + TypeScript | 生态成熟、类型安全 |
| 构建 | Vite | 快速开发构建 |
| 样式 | TailwindCSS | 快速实现响应式、主题定制 |
| 图表 | Recharts | React原生、轻量、够用 |
| 状态 | React Context + useReducer | 当前规模无需Redux |
| 路由 | React Router v6 | SPA路由标准方案 |

### 后端
| 项目 | 选型 | 理由 |
|------|------|------|
| 框架 | Node.js + Express + TypeScript | 与前端统一语言，减少环境依赖 |
| 数据库 | SQLite (better-sqlite3) | 零配置，同步操作简单 |
| 图片存储 | 本地文件系统 → OSS | 初期量小存本地 |
| 抓取 | cheerio + node-fetch | Node.js网页解析 |
| 定时任务 | node-cron | 轻量定时调度 |

> 注：原计划用Python FastAPI，因Windows环境未安装Python，改用Node.js全栈方案。

### 部署
| 项目 | 选型 | 理由 |
|------|------|------|
| 前端 | Vercel (免费版) | 零成本、自动HTTPS、CDN |
| 后端 | 阿里云轻量服务器 | 国内访问快、月费低 |
| 域名 | 可选，初期IP访问 | 节省成本 |

## 项目结构

```
nba球星卡/
├── frontend/                  # 前端项目
│   ├── src/
│   │   ├── components/        # 通用组件
│   │   ├── pages/             # 页面组件
│   │   ├── hooks/             # 自定义hooks
│   │   ├── utils/             # 工具函数
│   │   ├── types/             # TypeScript类型
│   │   └── assets/            # 静态资源
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
├── backend/                   # 后端项目
│   ├── app/
│   │   ├── api/               # API路由
│   │   ├── models/            # 数据库模型
│   │   ├── services/          # 业务逻辑
│   │   ├── scrapers/          # 数据抓取模块
│   │   └── core/              # 配置、依赖
│   ├── data/                  # SQLite数据文件
│   ├── uploads/               # 用户上传图片
│   ├── requirements.txt
│   └── main.py
├── docs/                      # 项目文档
├── dev-logs/                  # 开发日志
└── CLAUDE.md
```

## 数据流

```
[eBay/卡淘] --(定时抓取)--> [后端 scraper] --> [SQLite]
                                                      |
                                                      v
[浏览器] --(HTTP/REST)--> [FastAPI] --(查询)--> [SQLite]
                              ^
                              |
[用户上传图片] -------------->
```

## 数据库核心表（初版）

- `players` — 球员信息
- `card_series` — 卡片系列
- `cards` — 具体卡片（系列+球员+年份+型号）
- `price_records` — 历史价格记录（关联card + 时间 + 价格 + 来源）
- `user_cards` — 用户持仓（关联card + 用户 + 照片路径 + 备注）
