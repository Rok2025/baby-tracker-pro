# 登录鉴权与权限系统文档

## 1. 核心架构

项目使用 **Supabase** 作为后端服务，结合 **WeChat Mini Program** 进行身份验证。

### 1.1 身份验证流程
- **账号体系**：基于邮箱/密码的主账号体系 + 微信 OAuth 绑定。
- **Edge Function**：使用 Supabase Edge Function (`wechat-auth`) 处理微信 `code2session` 和 JWT 生成。
- **JWT 签名**：自行签发 JWT，包含 Supabase 要求的 `aud: authenticated` 和 `role: authenticated`，确保能通过 RLS 策略。

## 2. 关键问题与解决方案

### 2.1 微信登录与账号绑定
**问题**：Supabase 原生支持的微信登录需要配置 Web 回调，而小程序的机制是 `code2session` 直接获取 OpenID，二者不完全兼容。且一个邮箱账号可能需要绑定微信，或者直接用微信登录创建新账号。

**解决方案**：
1. **自定义 Edge Function (`wechat-auth`)**：
   - 接收小程序的 `code`。
   - 调用微信 API 获取 `openid`。
   - 检查 `auth.identities` 表中是否已存在该 `openid` 绑定的用户。
   - **登录模式**：如果存在，签发该用户的 JWT。
   - **绑定模式**：如果请求包含 `userId`（已登录状态），将微信 `openid` 作为新的 identity 插入到该用户下。
   - **自动注册模式**：如果不存在且未登录，自动创建一个基于 `openid` 的匿名邮箱用户，并绑定 identity。

2. **解决 "Multiple identities" 错误**：
   - 在绑定前，必须查询 `auth.identities` 确保该微信号未被其他账号占用。
   - 使用 SQL 查询：`select user_id from auth.identities where provider = 'wechat' and identity_data->>'sub' = $openid`。

### 2.4 邮箱注册功能
**问题**：小程序默认可能未提供完整的邮箱注册流程。

**解决方案**：
1. **Supabase Adapter**：
   - 在 `src/lib/supabase.ts` 中实现 `signUp` 方法，调用 `/auth/v1/signup` 接口。
2. **UI 交互**：
   - 改造 Login 组件，支持"登录/注册"模式切换。
   - 增加 `signUp` 到 `AuthContext`，处理注册后的邮箱验证提示或自动登录。

### 2.2 权限控制 (RLS Policies)
**问题**：用户不仅需要访问自己的数据，还需要访问"家庭成员"（即同一个宝宝）的数据。

**解决方案**：
1. **家庭关系表 (`family_members`)**：
   - 存储 `user_id` 和 `family_id` (通常是宝宝 ID 或主家长 ID)。
   
2. **防递归的 RLS 策略**：
   - 直接在 RLS 中使用 `select * from family_members` 会导致无限递归。
   - **优化**：创建 `security definer` 函数 `get_family_members(uid)` 获取该用户的所有家庭成员 ID。
   - **策略示例**：
     ```sql
     create policy "Access family data" on activities
     for all using (
       auth.uid() = user_id OR 
       user_id IN ( select get_family_members(auth.uid()) )
     );
     ```

### 2.3 小程序 Tab Bar 状态同步
**问题**：自定义 Tab Bar 在页面切换时，`selected` 状态会重置或不同步，导致高亮错误。

**解决方案**：
1. **重构为 Class 组件**：确保 `CustomTabBar` 实例能被 `Taro.getTabBar()` 正确获取。
2. **暴露方法**：组件内定义 `setSelectedIndex`。
3. **页面主动更新**：在每个 Tab 页面的 `useDidShow` 钩子中，主动调用 `getTabBar().setSelectedIndex(index)`。
4. **资源加载**：使用 `<Image>` 组件配合 SVG Data URL，避免 `backgroundImage` 在小程序中加载本地/相对路径失败的问题。
5. **防抖保护**：在 Tab 点击处理中增加 `isSwitching` 锁，防止快速点击导致 `switchTab:fail timeout`。

## 3. 常用命令与配置

### 3.1 部署 Edge Function
```bash
npx supabase functions deploy wechat-auth --no-verify-jwt --project-ref <PROJECT_REF>
```

### 3.2 环境变量
需要在 Supabase Dashboard 设置：
- `WECHAT_APP_ID`: 小程序 AppID
- `WECHAT_APP_SECRET`: 小程序 Secret
- `SUPABASE_URL`: 项目 URL
- `SUPABASE_SERVICE_ROLE_KEY`: 用于后端操作 auth 表的 Key

## 4. 待优化项
- [ ] 完善家庭成员邀请机制（目前仅有基础模态框）。
- [ ] 优化 `getUserProfile` 获取头像昵称的流程（适配微信最新隐私规范）。
