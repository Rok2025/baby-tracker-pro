import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const WX_APP_ID = Deno.env.get("WX_APP_ID")
const WX_APP_SECRET = Deno.env.get("WX_APP_SECRET")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }

    try {
        const { action, code, nickName } = await req.json()
        const authHeader = req.headers.get("Authorization")

        // 1. 调用微信接口获取 OpenID
        const wxRes = await fetch(
            `https://api.weixin.qq.com/sns/jscode2session?appid=${WX_APP_ID}&secret=${WX_APP_SECRET}&js_code=${code}&grant_type=authorization_code`
        )
        const wxData = await wxRes.json()
        const { openid, errcode, errmsg } = wxData

        if (errcode) {
            return new Response(JSON.stringify({ error: errmsg || 'WeChat API error', code: errcode }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            })
        }

        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        })

        // --- 策略 A: 登录流程 (含自动注册) ---
        if (action === "login") {
            let { data: identity, error: findError } = await supabase
                .from("wechat_identities")
                .select("user_id")
                .eq("openid", openid)
                .maybeSingle()

            let targetUserId = identity?.user_id

            // 如果未发现 identity，则自动注册或查找已存在用户
            if (!targetUserId) {
                const virtualEmail = `${openid}@wechat.com`
                console.log(`[Auth] Looking for existing user or creating new one for openid: ${openid}`)

                // 先尝试创建用户
                const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                    email: virtualEmail,
                    password: Math.random().toString(36).slice(-12),
                    email_confirm: true,
                    user_metadata: { provider: 'wechat', openid }
                })

                if (createError) {
                    // 如果用户已存在，使用 generateLink 获取用户信息
                    if (createError.message?.includes('already been registered')) {
                        console.log(`[Auth] User exists, getting via generateLink: ${virtualEmail}`)

                        // generateLink 会返回包含用户信息的响应
                        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
                            type: 'magiclink',
                            email: virtualEmail,
                        })

                        if (linkError) throw linkError
                        if (!linkData.user) throw new Error('Failed to get existing user')

                        targetUserId = linkData.user.id
                    } else {
                        throw createError
                    }
                } else {
                    targetUserId = newUser.user.id
                }

                // 确保 wechat_identities 记录存在
                const { error: upsertError } = await supabase
                    .from("wechat_identities")
                    .upsert({ openid, user_id: targetUserId, nick_name: nickName || '微信用户' }, { onConflict: 'openid' })

                if (upsertError) throw upsertError
            }

            // 获取用户 Email 准备生成登录链接
            const { data: userData, error: userError } = await supabase.auth.admin.getUserById(targetUserId)
            if (userError || !userData.user) throw new Error("User associated with openid not found")

            // 生成登录 Token (Magic Link)
            const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
                type: 'magiclink',
                email: userData.user.email!,
            })

            if (linkError) throw linkError

            return new Response(JSON.stringify({
                hash: linkData.properties.hashed_token,
                email: userData.user.email,
                openid
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            })
        }

        // --- 策略 B: 绑定/关联流程 (将当前 OpenID 指向一个新的 UserID，如家人的邮箱账号) ---
        if (action === "bind") {
            if (!authHeader) throw new Error("Missing Authorization header")

            // 验证目标 User (通过前端传来的 Email 登录后的 Token)
            const { data: { user: targetUser }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""))
            if (authError || !targetUser) throw new Error("Invalid target account session")

            console.log(`[Auth] Binding openid ${openid} to target user ${targetUser.id}`)

            // 更新映射表：将该 OpenID 的 user_id 改为目标 Email 用户的 ID
            const { error: upsertError } = await supabase
                .from("wechat_identities")
                .upsert({
                    openid,
                    user_id: targetUser.id,
                    nick_name: nickName || '家人账号'
                })

            if (upsertError) throw upsertError

            return new Response(JSON.stringify({ message: "Successfully linked to shared account", openid }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            })
        }

        // --- 策略 C: 解绑流程 ---
        if (action === "unbind") {
            console.log(`[Auth] Unbinding openid ${openid}`)

            // 直接删除映射关系
            // 以后再次登录时，login logic 会由于找不到映射而自动重新为其创建一个新的隔离用户
            const { error: deleteError } = await supabase
                .from("wechat_identities")
                .delete()
                .eq("openid", openid)

            if (deleteError) throw deleteError

            return new Response(JSON.stringify({ message: "Successfully unlinked" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            })
        }

        throw new Error("Invalid action")
    } catch (error) {
        console.error(`[Auth Error]`, error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
    }
})
