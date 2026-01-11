# 更新日志 (CHANGELOG)

All notable changes to this project will be documented in this file.

## [1.3.1] - 2026-01-11
### 修复
- **Web 端同步**：移除 API 层 5 分钟缓存，确保全家多端同步 100% 实时。
- **构建错误**：修复了 `Sidebar.tsx` 中可能导致生产构建失败的 TypeScript 类型检查。
- **环境兼容性**：修复了 GitHub Pages 下带尾部斜杠路径 (`/login/`) 的跳转失效问题。
- **数据准确性**：修正侧边栏统计逻辑，补齐 `user_id` 过滤。

## [1.1.0] - 2025-12-31

### Added
- **Authentication System**: Full Email/Password login and signup using Supabase Auth.
- **Multi-user Support**: Data is now isolated per user using `user_id`.
- **Data Migration Tool**: Added a feature in Settings to migrate anonymous local data to a registered account.
- **Internationalization (i18n)**: Added translations for the login/signup flow.
- **Route Protection**: Automatic redirection to login for unauthenticated users.

## [1.0.0] - 2025-12-30

### Added
- Initial stable release of Baby Tracker Pro.
- Integration with Supabase for data storage (Sleep, Feeding, Activities).
- Dashboard with summary cards and activity feed.
- Multi-language support (English/Chinese).
- Dark/Light theme support.
- Automated deployment to GitHub Pages via GitHub Actions.
- Static export configuration for Next.js.
