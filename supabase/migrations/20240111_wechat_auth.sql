-- 在 Supabase SQL Editor 中运行以下 SQL 来配置数据库

-- 1. 创建微信身份映射表
CREATE TABLE IF NOT EXISTS public.wechat_identities (
  openid TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nick_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 启用行级安全
ALTER TABLE public.wechat_identities ENABLE ROW LEVEL SECURITY;

-- 3. 设置权限：用户只能看到自己的绑定信息
DROP POLICY IF EXISTS "Users can view their own identities" ON public.wechat_identities;
CREATE POLICY "Users can view their own identities" ON public.wechat_identities
  FOR SELECT USING (auth.uid() = user_id);

-- 4. 允许 Edge Function (Service Role) 进行写入（自动包含在 Service Role 权限中）

-- 5. 可选：允许通过 user_id 查询是否有关联的 openid
DROP POLICY IF EXISTS "Users can check their own bindings" ON public.wechat_identities;
CREATE POLICY "Users can check their own bindings" ON public.wechat_identities
  FOR ALL USING (auth.uid() = user_id);
