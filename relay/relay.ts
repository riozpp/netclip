// 可选的小红书转发中继（Deno Deploy / Vercel / Cloudflare 以外的任意运行时）
//
// 【当前不需要】默认链已经靠 rednote.com（小红书国际站）打通，从 Cloudflare 边缘
// 1.5–4s 就能拿到 SSR 数据，本文件只在两种情况下才用得上：
//   a) rednote 国际站将来也加人机墙；
//   b) 你想把小红书请求完全收到自己的出口上。
//
// 背景：小红书对 Cloudflare 边缘的出口 IP 段做了封禁（国内站直连 302 到
// /website-login/captcha），而内置的公共中转（Google 翻译等）又会被限流（429）。
// 如果你有任何一个非 Cloudflare 的免费运行时，把这段代码部署上去，
// 再把它的地址填进本项目的 XHS_PROXY 即可：
//
//   XHS_PROXY = https://your-relay.deno.dev/?url=
//
// 部署方式（Deno Deploy，免费）：
//   1. 打开 https://dash.deno.com ，用 GitHub 账号登录
//   2. New Project → Deploy from Git repository → 选中本仓库 → 入口文件填 relay/relay.ts
//   3. 部署完成会得到一个 https://xxx.deno.dev 地址
//   4. 到 Cloudflare Dashboard → Workers → netclip → Settings → Variables，
//      新增 XHS_PROXY = https://xxx.deno.dev/?url=
//
// 它只做一件事：带上蜘蛛 UA 代抓目标页面，原样返回 HTML。

const SPIDER_UA =
  'Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)';

const ALLOWED = ['xiaohongshu.com', 'rednote.com', 'xhslink.com', 'xhslink.cn'];

Deno.serve(async (req: Request) => {
  const target = new URL(req.url).searchParams.get('url');
  if (!target) {
    return new Response('missing ?url=', { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new Response('bad url', { status: 400 });
  }
  if (!ALLOWED.some((h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`))) {
    return new Response('host not allowed', { status: 403 });
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: {
        'user-agent': SPIDER_UA,
        referer: 'https://www.xiaohongshu.com/',
        'accept-language': 'zh-CN,zh;q=0.9',
      },
      redirect: 'follow',
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') || 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  } catch (err) {
    return new Response(`relay error: ${String(err)}`, { status: 502 });
  }
});
