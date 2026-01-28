# Yoyo 温馨育儿主题实现计划

## Context

### Original Request

用户希望在 web 端进行 UI 样式改造，增加一个名为 "yoyo" 的主题，要求有宝宝网站的风格，界面简单紧凑，布局合理，样式搭配舒服。目标用户包括年轻父母和爷爷奶奶。

### Interview Summary

**Key Discussions**:

- **风格**: 温馨简约的育儿风格
- **目标用户**: 年轻父母 + 爷爷奶奶（需考虑老年人可读性）
- **主题类型**: 可切换的第三主题 (light / dark / yoyo)，保留现有主题
- **配色方案**: 温馨珊瑚配色 (Coral + Sky Blue + Cream White)
- **字体**: Nunito，仅在 yoyo 主题下使用
- **装饰元素**: 添加微妙装饰（波浪背景、小点缀）
- **主题选择器**: 分段按钮样式，与字体大小选择器一致
- **页面范围**: 全部页面 (Dashboard, Login, Settings)
- **验证方式**: 手动验证（无自动化测试）

**Research Findings**:

- ParentLove (2025最佳宝宝追踪应用) 使用简洁界面、柔和配色、大触摸目标
- 当前项目使用 Tailwind CSS 4 + next-themes + OKLCH 色彩空间
- shadcn/ui 组件通过 CSS 变量自动适配主题
- 无 tailwind.config.js，使用 globals.css 内联 @theme

### Metis Review

**Identified Gaps** (addressed):

- Nunito 字体范围：用户确认仅 yoyo 主题使用
- 主题选择器 UI：用户确认使用分段按钮
- ElderlyExportView 硬编码颜色：保持原样（导出功能独立）
- 触摸目标大小：使用 44px 符合 WCAG 标准

---

## Work Objectives

### Core Objective

为 BabyTracker Pro 添加第三个可切换的 "yoyo" 主题，采用温馨珊瑚配色和圆润 Nunito 字体，适合年轻父母和老年人使用。

### Concrete Deliverables

- `.yoyo` CSS 变量定义在 `globals.css`
- 三选项主题切换器在 Settings 页面
- Nunito 字体加载（仅 yoyo 主题应用）
- 微妙的背景装饰元素
- 更新后的 ThemeProvider 配置

### Definition of Done

- [x] Settings 页面显示三个主题选项 (Light / Dark / Yoyo)
- [x] 选择 "Yoyo" 后 `<html>` 元素具有 `.yoyo` class
- [x] 所有页面 (Dashboard, Login, Settings) 正确显示 yoyo 主题色
- [x] yoyo 主题下字体变为 Nunito
- [x] 主题选择在刷新后保持
- [x] 现有 light/dark 主题功能不受影响
- [x] 文字对比度符合 WCAG AA (4.5:1)

### Must Have

- 完整的 yoyo 主题 CSS 变量（所有颜色 token，见附录完整清单）
- 三选项主题切换器
- Nunito 字体条件加载
- 44px 最小触摸目标（新增的主题选择器按钮）
- 高对比度文字

### Must NOT Have (Guardrails)

- ❌ 不修改 `:root` 或 `.dark` 的 CSS 变量值
- ❌ 不添加新的 npm 依赖
- ❌ 不改变全局布局结构（Sidebar/TopBar/MobileNav 保持不变）
- ❌ 不添加复杂动画或大型插图
- ❌ 不重构无关代码
- ❌ 不修改 BackgroundOverlay 组件代码
- ❌ 不修改 ElderlyExportView 的硬编码颜色

**Guardrails 澄清**: "不改变组件结构" 指不重构全局布局组件；在 Settings 页面局部新增主题选择器 UI 是允许的。

---

## Verification Strategy (MANDATORY)

### Test Decision

- **Infrastructure exists**: NO
- **User wants tests**: Manual-only
- **Framework**: none
- **QA approach**: 纯手动验证，通过浏览器 DevTools 检查

### Manual Verification Procedures

每个 TODO 完成后需要执行以下验证：

1. **启动开发服务器**: `pnpm --filter=@yoyo/web dev`
2. **打开浏览器**: `http://localhost:8888`
3. **验证主题切换**: 在 Settings 页面切换主题
4. **验证各页面**: 访问 Dashboard、Login、Settings
5. **验证持久化**: 刷新页面确认主题保持
6. **验证对比度**: 使用浏览器 DevTools 检查颜色对比度
7. **验证移动端**: 使用 DevTools 切换到 375px 宽度

---

## Task Flow

```
Task 0 (研究) → Task 1 (CSS变量) → Task 2 (ThemeProvider) → Task 3 (字体)
                                                               ↓
                              Task 6 (验证) ← Task 5 (装饰) ← Task 4 (选择器)
```

## Parallelization

| Group | Tasks | Reason                   |
| ----- | ----- | ------------------------ |
| A     | 1, 3  | CSS 变量和字体加载可并行 |

| Task | Depends On | Reason                                     |
| ---- | ---------- | ------------------------------------------ |
| 2    | 1          | ThemeProvider 需要 .yoyo class 存在        |
| 4    | 2          | 主题选择器需要 ThemeProvider 支持 3 themes |
| 5    | 1          | 装饰元素需要使用 yoyo 主题变量             |
| 6    | All        | 最终验证需要所有功能完成                   |

---

## TODOs

- [x] 0. 研究现有实现细节

  **What to do**:
  - 使用 `ast_grep_search` 查找所有 `useTheme` 的使用位置
  - 确认 ThemeProvider 当前配置
  - 确认 Settings 页面主题切换的实现方式

  **Must NOT do**:
  - 不修改任何文件，仅研究

  **Parallelizable**: NO (需首先完成)

  **References**:
  - `apps/web/src/components/ThemeProvider.tsx` - 当前 ThemeProvider 封装
  - `apps/web/src/components/ThemeToggle.tsx` - 当前主题切换按钮
  - `apps/web/src/app/settings/page.tsx:200-215` - 分段按钮样式参考

  **已知 useTheme 使用位置** (Metis 已验证):
  - `apps/web/src/components/ThemeToggle.tsx` - 用于切换主题，需确认 yoyo 支持
  - `apps/web/src/components/ui/sonner.tsx` - Toast 组件，需要兼容处理（见下方说明）
  - `apps/web/src/app/page.tsx` - Dashboard 页面
  - `apps/web/src/components/dashboard/ElderlyExportView.tsx` - 导出视图（硬编码颜色，不需改动）

  **sonner.tsx 兼容性说明**:
  - 当前代码: `theme={theme as ToasterProps["theme"]}` 直接传递主题值
  - Sonner 只支持 `light | dark | system`，传入 `yoyo` 会被忽略或降级
  - **处理策略**: 不修改 sonner.tsx，让 yoyo 主题下 Toast 使用默认样式
  - **原因**: Toast 样式通过 CSS 变量 (`--popover`, `--popover-foreground`) 控制，已在 `.yoyo` 中定义，视觉上会自动适配
  - **验证方法**: 在 yoyo 主题下触发 Toast，确认样式与主题色协调

  **ThemeToggle 与 yoyo 共存行为说明**:
  - `ThemeToggle.tsx` 仅在 `light` 和 `dark` 之间切换 (`theme === "dark" ? "light" : "dark"`)
  - 当当前主题为 `yoyo` 时，点击 ThemeToggle 会切换到 `dark`（因为 `theme !== "dark"`）
  - **这是允许且预期的行为**：ThemeToggle 在 Sidebar/TopBar 作为快捷切换使用，yoyo 用户主要通过 Settings 页面选择主题
  - **验证方法**: 见 Task 6 的跨主题验证步骤

  **Acceptance Criteria**:

- [x] 确认上述 4 个文件中的 useTheme 使用方式
- [x] 确认当前 ThemeProvider 的 props 配置（attribute="class", defaultTheme="light"）
- [x] 记录分段按钮的样式实现方式（className 模式）

  **Commit**: NO (研究任务)

---

- [x] 1. 添加 yoyo 主题 CSS 变量

  **What to do**:
  - 在 `globals.css` 中 `.dark` 选择器之后添加 `.yoyo` 选择器
  - 定义 CSS 变量（见附录"必须覆盖的变量清单"）
  - 使用 OKLCH 色彩空间
  - **不添加** `@custom-variant yoyo`（当前项目不需要 yoyo-specific Tailwind 变体）

  **关于 --base-font-size 和 --radius**:
  - 这两个变量在 `:root` 中定义，但**不需要在 `.yoyo` 中覆盖**
  - 原因：它们是基础布局设置，所有主题共用相同值
  - `.yoyo` 只需覆盖颜色相关的变量

  **Must NOT do**:
  - 不修改 `:root` 或 `.dark` 的任何值
  - 不遗漏任何必需的 CSS 变量（见附录完整清单）

  **Parallelizable**: YES (与 Task 3 并行)

  **References**:
  - `apps/web/src/app/globals.css:50-95` - `:root` 变量结构（必须复制完整结构）
  - `apps/web/src/app/globals.css:97-133` - `.dark` 变量结构（参考暗色处理方式）
  - `apps/web/src/app/globals.css:4` - `@custom-variant dark` 定义方式

  **Acceptance Criteria**:

  **手动验证步骤:**
  1. 启动开发服务器: `pnpm --filter=@yoyo/web dev`
  2. 打开浏览器: `http://localhost:8888`
  3. 打开 DevTools → Elements 面板
  4. 找到 `<html>` 元素，手动添加 class="yoyo"
  5. 验证: 页面背景变为温暖米白色 (#FFF9F5 / oklch(0.99 0.01 70))
  6. 验证: 主按钮（如 Dashboard 的记录按钮）变为珊瑚粉色
  7. 打开 DevTools → 选择任意文本 → 检查 Accessibility → Contrast Ratio ≥ 4.5:1

  **Commit**: YES
  - Message: `feat(web): add yoyo theme CSS variables with warm coral palette`
  - Files: `apps/web/src/app/globals.css`

---

- [x] 2. 扩展 ThemeProvider 支持三主题

  **What to do**:
  - 修改 `layout.tsx` 中 ThemeProvider 的 props
  - 添加 `themes={['light', 'dark', 'yoyo']}` prop
  - 确保 `attribute="class"` 保持不变

  **Must NOT do**:
  - 不修改 ThemeProvider 组件本身
  - 不添加新的 context 或 state

  **Parallelizable**: NO (依赖 Task 1)

  **References**:
  - `apps/web/src/app/layout.tsx:42-47` - 当前 ThemeProvider 配置

  **当前配置** (需修改):

  ```tsx
  <ThemeProvider
    attribute="class"
    defaultTheme="light"
    enableSystem={false}
    disableTransitionOnChange
  >
  ```

  **目标配置**:

  ```tsx
  <ThemeProvider
    attribute="class"
    defaultTheme="light"
    themes={['light', 'dark', 'yoyo']}
    enableSystem={false}
    disableTransitionOnChange
  >
  ```

  **next-themes 行为说明**:
  - 当 `attribute="class"` 时，next-themes 会将主题名作为 class 添加到 `<html>`
  - light 主题时 `<html class="light">`，dark 时 `<html class="dark">`，yoyo 时 `<html class="yoyo">`
  - 这是 next-themes 的默认行为，不需要额外配置

  **Acceptance Criteria**:

  **手动验证步骤:**
  1. 启动开发服务器: `pnpm --filter=@yoyo/web dev`
  2. 打开浏览器: `http://localhost:8888`
  3. 打开 DevTools Console
  4. 执行: `localStorage.setItem('theme', 'yoyo'); location.reload()`
  5. 验证: `<html>` 元素具有 `class="yoyo"`
  6. 验证: 页面显示 yoyo 主题颜色（珊瑚粉按钮、米白背景）
  7. 执行: `localStorage.setItem('theme', 'light'); location.reload()`
  8. 验证: `<html>` 元素 **没有** `.dark` 或 `.yoyo` class（是否有 `light` class 均可接受）
  9. 验证: 页面显示原有浅色主题颜色（Sage/Teal 风格）

  **Commit**: YES
  - Message: `feat(web): extend ThemeProvider to support yoyo theme`
  - Files: `apps/web/src/app/layout.tsx`

---

- [x] 3. 添加 Nunito 字体（yoyo 主题专用）

  **What to do**:

  **唯一实现方案** (不要偏离):
  1. 在 `layout.tsx` 中导入 Nunito:

     ```tsx
     import { Geist, Geist_Mono, Nunito } from "next/font/google";

     const nunito = Nunito({
       variable: "--font-nunito",
       subsets: ["latin"],
     });
     ```

  2. 在 `body` 的 className 中添加 `nunito.variable`:

     ```tsx
     className={`${geistSans.variable} ${geistMono.variable} ${nunito.variable} antialiased ...`}
     ```

     **注意**: 必须在 body 上挂载 nunito.variable，否则 CSS 变量 `--font-nunito` 不会生效。

  3. 在 `globals.css` 的 `.yoyo` 选择器内覆盖字体变量:
     ```css
     .yoyo {
       /* 其他变量... */
       --font-sans: var(--font-nunito);
     }
     ```

  **Must NOT do**:
  - 不修改 light/dark 主题的字体
  - 不使用其他实现方式（如条件 className、动态加载）

  **Parallelizable**: YES (与 Task 1 并行)

  **References**:
  - `apps/web/src/app/layout.tsx:8-16` - 现有 Geist 字体加载方式
  - `apps/web/src/app/globals.css:9` - `--font-sans` 变量定义

  **字体加载说明**:
  - Next.js Font 会在构建时预加载字体，因此 Nunito 字体文件可能在所有主题下都会被请求（缓存/预加载行为）
  - "仅 yoyo 主题使用"指的是**应用层面**：只有 yoyo 主题的 `--font-sans` 指向 Nunito
  - 验收以**实际渲染的 computed font-family** 为准，而非网络请求

  **验收字符范围说明**:
  - 由于 `subsets: ["latin"]`，Nunito 仅覆盖拉丁字母和数字
  - 中文汉字会 fallback 到系统字体（这是预期行为）
  - 验收以**英文/数字/按钮文本**为准（如 "Dashboard", "120ml", "Save" 等）

  **Acceptance Criteria**:

  **手动验证步骤:**
  1. 切换到 yoyo 主题（通过 Settings 或 localStorage）
  2. 打开 DevTools → Elements → 选择任意英文/数字文本（如页面标题 "Dashboard"）
  3. 在 Computed 面板查看 `font-family`
  4. 验证: computed font-family 包含 `Nunito`（或 `__Nunito_xxx` 格式）
  5. 验证: 英文文字视觉上更圆润（Nunito 特征：圆润字母、较高 x-height）
  6. 切换到 light 主题
  7. 打开 DevTools → Elements → 选择同一元素
  8. 验证: computed font-family 包含 `Geist`（或 `__Geist_xxx` 格式）
  9. 验证: 英文文字视觉上更几何/现代（Geist 特征）

  **Commit**: YES
  - Message: `feat(web): add Nunito font for yoyo theme`
  - Files: `apps/web/src/app/layout.tsx`, `apps/web/src/app/globals.css`

---

- [x] 4. 创建三选项主题选择器

  **What to do**:

  **最终 UI 形态** (明确定稿):
  - 在 Settings 页面"外观设置"卡片内，**替换**现有的 ThemeToggle 按钮
  - 使用分段按钮样式（与字体大小选择器完全一致）
  - 三个选项: **浅色 / 深色 / 温馨** (中文，与页面其他硬编码中文一致)
  - 使用 `useTheme` hook 的 `theme` 和 `setTheme` 方法
  - **移除** Settings 页面中 ThemeToggle 组件的引用（第 230 行附近）
  - **不删除** ThemeToggle 组件文件（Sidebar/TopBar 可能仍在使用）

  **按钮文案定稿**:
  - Light → 浅色
  - Dark → 深色
  - Yoyo → 温馨
  - **不需要新增 i18n key**（与现有"外观设置"/"主题模式"等硬编码中文保持一致）

  **Hydration 处理**:
  - 使用 `mounted` state 避免 hydration mismatch
  - 参考现有 ThemeToggle 或字体选择器的处理方式
  - 未 mounted 时：按钮全部显示但不高亮（或使用 skeleton/loading 状态）
  - 示例实现:

    ```tsx
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // 在渲染时：
    const currentTheme = mounted ? theme : undefined;
    // 按钮高亮：currentTheme === "light" / "dark" / "yoyo"
    ```

  **具体代码位置**:
  - 修改 `apps/web/src/app/settings/page.tsx`
  - 找到第 219-232 行的"外观设置"卡片
  - 移除 `<ThemeToggle />` 引用
  - 添加分段按钮，参考第 200-215 行的字体大小选择器

  **按钮尺寸规格** (满足 44px WCAG 要求):
  - 使用 `py-3` (12px \* 2 = 24px) + 文字高度 ≈ 44px
  - 或使用 `min-h-[44px]` 明确设置最小高度
  - 示例 className: `flex-1 py-3 px-4 min-h-[44px] rounded-lg text-sm font-medium transition-all`

  **Must NOT do**:
  - 不删除 ThemeToggle 组件文件
  - 不使用第三方 UI 库
  - 不修改 Sidebar 或 TopBar 中的 ThemeToggle

  **Parallelizable**: NO (依赖 Task 2)

  **References**:
  - `apps/web/src/app/settings/page.tsx:200-215` - 字体大小分段按钮实现（复制此模式）
  - `apps/web/src/app/settings/page.tsx:219-232` - 现有外观设置区域
  - `apps/web/src/components/ThemeToggle.tsx` - 现有主题切换逻辑（只参考 useTheme 用法）

  **Acceptance Criteria**:

  **手动验证步骤:**
  1. 访问 Settings 页面: `http://localhost:8888/settings`
  2. 验证: 在"外观设置"卡片内看到三个主题选项按钮 (浅色 / 深色 / 温馨)
  3. 验证: 不再显示原来的太阳/月亮切换按钮
  4. 点击 "浅色" → 验证页面变为浅色主题
  5. 点击 "深色" → 验证页面变为深色主题
  6. 点击 "温馨" → 验证页面变为温馨珊瑚主题
  7. 验证: 当前选中的主题按钮有高亮样式（bg-primary）
  8. 刷新页面 → 验证主题选择保持，且正确的按钮高亮
  9. 使用 DevTools 测量主题按钮尺寸 ≥ 44x44px

  **Commit**: YES
  - Message: `feat(web): add three-way theme selector in settings`
  - Files: `apps/web/src/app/settings/page.tsx`

---

- [x] 5. 添加微妙背景装饰元素

  **What to do**:

  **装饰挂载策略** (唯一方案，不要偏离):
  - 在 `globals.css` 中添加 `.yoyo body::before` 伪元素
  - 使用 CSS 渐变创建微妙的波浪/光斑效果
  - 设置 `position: fixed; inset: 0; z-index: 0;`
  - 设置 `pointer-events: none;` 避免阻挡交互
  - 使用低透明度 (≤15%) 确保不影响可读性

  **与 BackgroundOverlay 的层级关系** (确定性说明):
  - BackgroundOverlay: `position: fixed; inset: 0; z-index: 0;` (背景层)
  - 装饰元素: `position: fixed; inset: 0; z-index: 0;` (与背景同层，通过渐变叠加)
  - Sidebar: `sticky top-0` (无 z-index，但 sticky 默认在文档流之上)
  - 页面内容: `relative z-10` (在最上层)

  **为什么 z-index: 0 不会盖住 Sidebar**:
  - `position: fixed` 的 z-index: 0 元素会在 `position: sticky` 元素**之下**
  - 这是因为 sticky 元素参与正常文档流，并在滚动时提升到 stacking context 之上
  - 测试验证：在 yoyo 主题下 Sidebar 应完全可见且无渐变覆盖

  **CSS 实现**:

  ```css
  .yoyo body::before {
    content: "";
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background:
      radial-gradient(
        circle at 20% 80%,
        oklch(0.9 0.08 20 / 0.15) 0%,
        transparent 50%
      ),
      radial-gradient(
        circle at 80% 20%,
        oklch(0.9 0.06 220 / 0.1) 0%,
        transparent 50%
      );
  }
  ```

  **Must NOT do**:
  - 不添加 SVG 文件或图片资源
  - 不添加复杂动画
  - 不影响内容可读性
  - 不修改 BackgroundOverlay.tsx 组件代码

  **Parallelizable**: YES (与 Task 4 并行，依赖 Task 1)

  **References**:
  - `apps/web/src/app/globals.css` - 全局样式位置
  - `apps/web/src/components/layout/BackgroundOverlay.tsx` - 现有背景处理（使用 fixed inset-0 z-0）

  **Acceptance Criteria**:

  **手动验证步骤:**
  1. 切换到 yoyo 主题
  2. 验证: 页面背景有微妙的装饰效果（柔和的粉色/蓝色光斑渐变）
  3. 验证: 装饰不遮挡任何文字或按钮
  4. **验证 Sidebar 层级**: 桌面端 Sidebar 完全可见，无渐变覆盖在其上
  5. 点击页面各处 → 验证装饰不阻挡交互
  6. 切换到 light 主题
  7. 验证: 装饰效果消失（无渐变光斑）
  8. 使用 DevTools 切换到 375px 宽度
  9. 验证: 装饰在移动端不影响布局，无水平滚动

  **Commit**: YES
  - Message: `feat(web): add subtle decorative elements for yoyo theme`
  - Files: `apps/web/src/app/globals.css`

---

- [x] 6. 全面验证和收尾

  **What to do**:
  - 在所有页面 (Dashboard, Login, Settings) 验证 yoyo 主题
  - 验证移动端显示
  - 验证 light/dark 主题未被破坏
  - 检查新增组件的触摸目标和对比度
  - 修复发现的任何问题

  **Must NOT do**:
  - 不添加新功能
  - 不重构已完成的代码

  **Parallelizable**: NO (最后执行)

  **References**:
  - 所有已修改的文件

  **Acceptance Criteria**:

  **手动验证 Checklist:**

  **Dashboard 页面 (/):**

- [x] yoyo 主题颜色正确（珊瑚粉主色、米白背景）
- [x] 统计卡片显示正常
- [x] 记录表单按钮可用
- [x] 活动流列表清晰

  **Login 页面 (/login):**

- [x] 登录表单样式正确
- [x] 按钮颜色匹配主题
- [x] 输入框边框清晰

  **Settings 页面 (/settings):**

- [x] 主题选择器显示三个选项
- [x] 所有卡片样式一致
- [x] 保存按钮明显

  **Toast 验证 (Sonner):**

- [x] 在 yoyo 主题下点击保存按钮触发 Toast
- [x] 验证: Toast 背景色使用 `--popover` (柔和粉白)
- [x] 验证: Toast 文字色使用 `--popover-foreground` (深灰)
- [x] 验证: Toast 样式与 yoyo 主题协调

  **跨主题验证:**

- [x] Light → Dark → Yoyo → Light 切换流畅
- [x] 每次切换后刷新页面，主题保持

  **ThemeToggle 行为验证 (预期行为):**

- [x] 在 yoyo 主题下，找到 Sidebar 或 TopBar 中的 ThemeToggle 按钮
- [x] 点击 ThemeToggle → 验证: 主题切换到 dark（这是预期行为）
- [x] 再次点击 ThemeToggle → 验证: 主题切换到 light
- [x] 注意: ThemeToggle 不会直接切回 yoyo，需要通过 Settings 页面选择

  **可访问性验证 (具体检查对象):**

- [x] 主题选择器三个按钮尺寸 ≥ 44x44px
- [x] Settings 页面保存按钮尺寸 ≥ 44x44px
- [x] 使用 Tab 键可以遍历所有交互元素
- [x] 焦点状态清晰可见（有 ring 效果）
- [x] 检查以下元素的文字对比度 ≥ 4.5:1:
  - Dashboard 标题文字
  - 卡片内数字
  - 按钮文字
  - 导航菜单文字

  **移动端验证 (375px):**

- [x] 所有内容可见
- [x] 主题选择器按钮大小足够
- [x] 无水平滚动

  **Commit**: YES (如有修复)
  - Message: `fix(web): address yoyo theme verification issues`
  - Files: (视修复内容而定)

---

## Commit Strategy

| After Task | Message                                                           | Files                   | Verification        |
| ---------- | ----------------------------------------------------------------- | ----------------------- | ------------------- |
| 1          | `feat(web): add yoyo theme CSS variables with warm coral palette` | globals.css             | DevTools class test |
| 2          | `feat(web): extend ThemeProvider to support yoyo theme`           | layout.tsx              | localStorage test   |
| 3          | `feat(web): add Nunito font for yoyo theme`                       | layout.tsx, globals.css | Network + visual    |
| 4          | `feat(web): add three-way theme selector in settings`             | settings/page.tsx       | UI interaction      |
| 5          | `feat(web): add subtle decorative elements for yoyo theme`        | globals.css             | Visual check        |
| 6          | `fix(web): address yoyo theme verification issues` (if needed)    | various                 | Full checklist      |

---

## Success Criteria

### Verification Commands

```bash
# 启动开发服务器
pnpm --filter=@yoyo/web dev

# 预期: 服务器在 localhost:8888 启动成功
```

### Final Checklist

- [x] Settings 页面有三个主题选项按钮
- [x] 切换到 Yoyo 主题后所有页面显示温馨珊瑚配色
- [x] Yoyo 主题下字体为 Nunito
- [x] 有微妙的背景装饰效果
- [x] Light 和 Dark 主题功能不变
- [x] 主题选择在刷新后保持
- [x] 移动端显示正常
- [x] 文字对比度符合 WCAG AA 标准

---

## Appendix: 必须覆盖的 CSS 变量清单

以下是 `.yoyo` 选择器中**必须定义**的 CSS 变量。

**注意**: `:root` 中的 `--base-font-size: 16px` 不需要在 `.yoyo` 中覆盖，因为它是基础设置且不随主题变化。

**需要覆盖的变量** (共 33 个颜色/样式变量 + 1 个字体变量):

```css
.yoyo {
  /* 
   * 以下变量 `:root` 中存在但 .yoyo 不需要覆盖:
   * --base-font-size: 16px (基础设置，所有主题共用)
   * --radius: 1rem (圆角设置，所有主题共用)
   */

  /* 核心颜色 */
  --background: oklch(0.99 0.01 70); /* Cream White */
  --foreground: oklch(0.3 0 0); /* Charcoal */

  /* 卡片 */
  --card: oklch(0.99 0.008 30); /* Soft Blush */
  --card-foreground: oklch(0.3 0 0);

  /* 弹出层 (Sonner Toast 使用这些变量) */
  --popover: oklch(0.99 0.008 30);
  --popover-foreground: oklch(0.3 0 0);

  /* 主色 */
  --primary: oklch(0.78 0.08 20); /* Baby Coral */
  --primary-foreground: oklch(0.99 0 0);

  /* 次要色 */
  --secondary: oklch(0.9 0.04 30); /* Dusty Pink */
  --secondary-foreground: oklch(0.35 0 0);

  /* 静音色 */
  --muted: oklch(0.96 0.01 70);
  --muted-foreground: oklch(0.48 0 0); /* Warm Gray */

  /* 强调色 */
  --accent: oklch(0.88 0.06 220); /* Sky Blue */
  --accent-foreground: oklch(0.25 0.02 220);

  /* 危险色 */
  --destructive: oklch(0.6 0.18 25);

  /* 边框和输入 */
  --border: oklch(0.92 0.02 30);
  --input: oklch(0.97 0.01 70);
  --ring: oklch(0.78 0.08 20);

  /* 图表颜色 */
  --chart-1: oklch(0.78 0.08 20); /* Baby Coral */
  --chart-2: oklch(0.88 0.06 220); /* Sky Blue */
  --chart-3: oklch(0.82 0.08 140); /* Soft Mint */
  --chart-4: oklch(0.85 0.08 80); /* Warm Sand */
  --chart-5: oklch(0.9 0.04 30); /* Dusty Pink */

  /* 侧边栏 */
  --sidebar: oklch(0.98 0.01 70);
  --sidebar-foreground: oklch(0.3 0 0);
  --sidebar-primary: oklch(0.78 0.08 20);
  --sidebar-primary-foreground: oklch(0.99 0 0);
  --sidebar-accent: oklch(0.92 0.04 30);
  --sidebar-accent-foreground: oklch(0.3 0 0);
  --sidebar-border: oklch(0.94 0.02 30);
  --sidebar-ring: oklch(0.78 0.08 20);

  /* 字体 (仅 yoyo 主题覆盖) */
  --font-sans: var(--font-nunito);
}
```

**变量对照表** (与 `:root` 的对应关系):

| `:root` 中的变量          | `.yoyo` 中处理方式         |
| ------------------------- | -------------------------- |
| `--base-font-size`        | 沿用 `:root`，不覆盖       |
| `--radius`                | 沿用 `:root`，不覆盖       |
| `--background` ~ `--ring` | 必须覆盖                   |
| `--chart-1` ~ `--chart-5` | 必须覆盖                   |
| `--sidebar-*`             | 必须覆盖                   |
| `--font-sans`             | 在 `.yoyo` 中覆盖为 Nunito |

**注意**: 不要遗漏 `--popover` 和 `--popover-foreground`，Sonner Toast 组件依赖这些变量。
