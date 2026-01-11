# 👶 BabyTracker Pro (宝宝成长助手)

[![Version](https://img.shields.io/badge/version-1.3.1-blue.svg)](package.json)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green)](https://supabase.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> **为了不再手忙脚乱，我给宝宝写了个“成长助手” ✨**
> 
> 作为一个新手家长，每天最头疼的就是记不清宝宝几点喝了奶、睡了多久。市面的 App 要么广告太多，要么功能太杂。于是我利用业余时间，用最新的技术栈自己“手搓”了一个。这是一个纯粹、干净、好用的工具，希望能让育儿生活少一点焦虑，多一点从容。

[查看在线演示](https://rok2025.github.io/baby-tracker-pro)

---

## 📸 软件截图

| 仪表盘 (Dashboard) | 历史记录 (History) | 侧边栏 (Sidebar) |
| :---: | :---: | :---: |
| ![Dashboard](public/screenshots/ybp.png) | ![History](public/screenshots/lsjl.png) | ![Sidebar](public/screenshots/sz.png) |

---

## ✨ 核心功能详解

### 📊 智能仪表盘 (Smart Dashboard)
- **实时汇总**：自动计算当日累计奶量和总睡眠时长。
- **目标达成反馈**：根据您在设置中定义的标准，卡片颜色会动态变化（绿色代表达标，红色代表待补充），进度条直观展示完成百分比。
- **快速概览**：一眼掌握宝宝当天的生理状态。

### 🍼 极简记录 (Quick Logging)
- **单手操作设计**：针对家长可能正在抱娃的场景，优化了表单布局。
- **智能时间处理**：支持“昨天/今天”快速切换，自动处理跨天睡眠（如昨晚 10 点睡到今天早上 6 点）的时长统计。
- **备注功能**：记录每次喂养或睡眠的特殊情况。

### 📅 历史数据回顾 (History & Insights)
- **日历筛选**：通过优雅的日历组件，快速跳转查看任意日期的历史记录。
- **数据追溯**：每一条记录都支持二次编辑或删除，确保数据的准确性。

### 🔐 安全与同步 (Auth & Sync)
- **多端同步**：基于 Supabase Auth，全家人可以使用同一个账号登录，数据实时云端同步。
- **数据隔离**：严格的行级安全策略 (RLS)，确保您的数据只有您自己可见。

### 🌍 个性化设置 (Personalization)
- **国际化**：完整支持中英文切换。
- **清新视觉**：提供浅色/深色模式，采用清新淡雅的色彩基调，缓解视觉疲劳。
- **灵活标准**：自由设定宝宝的每日奶量和睡眠目标。

---

## 🛠️ 技术栈

-   **框架**: [Next.js 15](https://nextjs.org/) (App Router)
-   **语言**: TypeScript
-   **数据库/认证**: [Supabase](https://supabase.com/) (PostgreSQL)
-   **样式**: [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
-   **图标**: [Lucide React](https://lucide.dev/)
-   **部署**: GitHub Pages (通过 GitHub Actions 自动部署)

---

## 🚀 快速开始

### 环境要求
- Node.js 18.x 或更高版本
- 一个 Supabase 项目

### 本地开发

1. **克隆仓库**
   ```bash
   git clone https://github.com/zruifeng0/baby-tracker-pro.git
   cd baby-tracker-pro
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   在根目录创建 `.env.local` 文件：
   ```env
   NEXT_PUBLIC_SUPABASE_URL=你的Supabase地址
   NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase匿名Key
   ```

4. **启动项目**
   ```bash
   npm run dev
   ```

---

## 📦 版本发布

项目遵循 [语义化版本 (SemVer)](https://semver.org/lang/zh-CN/) 规范。详细更新日志请参阅 [CHANGELOG.md](CHANGELOG.md)。

-   **v1.1.0**: 引入用户认证系统与多用户数据隔离。
-   **v1.0.0**: 初始版本发布，包含核心记录与统计功能。

---

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

---

## 👨‍💻 作者

**Ruifeng** - [GitHub](https://github.com/zruifeng0)

---
*如果您觉得这个项目有帮助，欢迎给一个 ⭐️ Star！*
