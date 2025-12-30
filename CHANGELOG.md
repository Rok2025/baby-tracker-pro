# Changelog

All notable changes to this project will be documented in this file.

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
