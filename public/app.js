/* NetClip 前端逻辑：解析、渲染、下载、多语言 */
(function () {
  'use strict';

  var PAGE = document.documentElement.getAttribute('data-page') || 'home';
  var API_PARSE = '/api/parse';
  var API_PROXY = '/api/proxy';
  var MAX_BATCH = 6;

  var HOME_PLATFORMS = [
    { key: 'douyin', label: '抖音', color: '#111111' },
    { key: 'tiktok', label: 'TikTok', color: '#00c2cc' },
    { key: 'xiaohongshu', label: '小红书', color: '#ff2442' },
    { key: 'bilibili', label: '哔哩哔哩', color: '#fb7299' },
    { key: 'instagram', label: 'Instagram', color: '#e1306c' }
  ];

  var I18N = {
    zh: {},
    en: {
      'nav.parse': 'Downloader',
      'nav.features': 'Features',
      'nav.how': 'How it works',
      'nav.faq': 'FAQ',
      'nav.cta': 'Start parsing',
      'hero.pill': 'No login · 60 free parses per hour',
      'hero.title': 'Paste one link,<br /><span class="grad">keep the clean original</span>',
      'hero.lede':
        'Videos, photo posts and live photos from Douyin, TikTok, REDnote, Bilibili and more. Paste a share link and the file you get back is the platform’s own source copy.',
      'form.label': 'Paste a share link',
      'form.placeholder': 'e.g. https://v.douyin.com/xxxxxxx/  or  https://www.tiktok.com/@user/video/7300000000000000000',
      'form.submit': 'Parse now',
      'form.paste': 'Read clipboard',
      'form.clear': 'Clear',
      'form.hint': 'Batch supported — one link per line, up to 6',
      'features.eyebrow': 'WHY NETCLIP',
      'features.title': 'Why people use NetClip',
      'features.sub': 'Parsing, made blunt: no sign-up, no extension, no quality loss.',
      'f1.t': 'Free, unlimited feel',
      'f1.d': 'No paywall. The hourly quota is generous enough for everyday personal use.',
      'f2.t': 'No account needed',
      'f2.d': 'Open and use. We never ask for platform credentials or personal details.',
      'f3.t': 'Lossless by design',
      'f3.d': 'We return the platform source stream, so nothing is re-encoded or downscaled.',
      'f4.t': 'Edge-side parsing',
      'f4.d': 'Resolution runs on the nearest edge node — typical requests return in under a second.',
      'how.eyebrow': 'HOW IT WORKS',
      'how.title': 'Four steps to the original file',
      'how.sub': 'No software to install at any point.',
      's1.t': 'Copy the link',
      's1.d': 'Tap Share in the source app and choose Copy link.',
      's2.t': 'Paste and parse',
      's2.d': 'Drop it into the box above and hit Parse now.',
      's3.t': 'Check the result',
      's3.d': 'Confirm cover, author and title, then pick the quality you need.',
      's4.t': 'Save it',
      's4.d': 'One click streams the file straight to your device.',
      'types.eyebrow': 'CONTENT TYPES',
      'types.title': 'What we can extract',
      't1.t': 'Watermark-free video',
      't1.d': 'Short and long videos come back as MP4 at their original resolution, with audio available separately.',
      't2.t': 'Photo posts & live photos',
      't2.d': 'Carousel posts expose every original image; live photos keep their motion clip.',
      't3.t': 'Multi-link batches',
      't3.d': 'Paste several links at once and get one result card per item.',
      'faq.eyebrow': 'FAQ',
      'faq.title': 'Frequently asked questions',
      'q1.q': 'Is it free?',
      'q1.a': 'Yes. Each IP gets 60 parses per rolling hour, which covers normal use, and the quota refills automatically.',
      'q2.q': 'Which platforms work?',
      'q2.a': 'Public content on Douyin, TikTok, REDnote, Bilibili and Instagram. Private or paid content needs an authenticated session and is out of scope.',
      'q3.q': 'What if parsing fails?',
      'q3.a': 'Check that you pasted a complete share link rather than a fragment of text. The parser tries several strategies per platform, so transient upstream changes usually recover on retry.',
      'q4.q': 'Do downloads go through your servers?',
      'q4.a': 'Requests pass through an edge node that adds the referer header the CDN expects and forces a filename. Nothing is written to storage and no media is analysed.',
      'q5.q': 'What may I use it for?',
      'q5.a': 'Only content you own or are licensed to use — personal backups, mood boards, editing material. Get permission before republishing or commercial use.',
      'footer.desc': 'An open-source multi-platform media parser running on Cloudflare’s edge.',
      'footer.product': 'Product',
      'footer.legal': 'Info',
      'footer.terms': 'Terms',
      'footer.privacy': 'Privacy',
      'footer.source': 'Source code',
      'footer.copy': '© 2026 NetClip. Independent implementation.',
      'footer.tm': 'TikTok, Douyin, REDnote, Bilibili and Instagram are trademarks of their respective owners. This site is not affiliated with them.'
    }
  };

  var TEXT = {
    zh: {
      parsing: '解析中…',
      submit: '开始解析',
      empty: '请先粘贴一条分享链接',
      batchLimit: '单次最多解析 6 条链接',
      copied: '已复制',
      copyFail: '复制失败，请手动选择',
      noClipboard: '浏览器不支持读取剪贴板',
      emptyResult: '没有解析到内容',
      netErr: '网络异常，请稍后重试',
      items: '条链接',
      failed: '失败',
      quota: '本小时剩余次数',
      video: '视频',
      audio: '原声音频',
      cover: '封面图',
      image: '图片',
      openSource: '打开原帖',
      copySource: '复制原链接',
      download: '下载',
      duration: '时长',
      play: '播放',
      like: '点赞',
      comment: '评论',
      source: '来源',
      retry: '重试',
      unsupportedHint: '目前支持抖音 / TikTok / 小红书 / B站 / Instagram'
    },
    en: {
      parsing: 'Parsing…',
      submit: 'Parse now',
      empty: 'Paste a share link first',
      batchLimit: 'Up to 6 links per request',
      copied: 'Copied',
      copyFail: 'Copy failed, select manually',
      noClipboard: 'Clipboard API unavailable',
      emptyResult: 'Nothing parsed',
      netErr: 'Network error, please retry',
      items: 'links',
      failed: 'failed',
      quota: 'Remaining this hour',
      video: 'Video',
      audio: 'Original audio',
      cover: 'Cover',
      image: 'Image',
      openSource: 'Open post',
      copySource: 'Copy link',
      download: 'Download',
      duration: 'Duration',
      play: 'Views',
      like: 'Likes',
      comment: 'Comments',
      source: 'Source',
      retry: 'Retry',
      unsupportedHint: 'Supported: Douyin / TikTok / REDnote / Bilibili / Instagram'
    }
  };

  var lang = localStorage.getItem('netclip.lang') || (PAGE === 'pro' ? 'en' : 'zh');

  function t(key) {
    return (TEXT[lang] && TEXT[lang][key]) || TEXT.zh[key] || key;
  }

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function toast(message) {
    var host = $('#toast-host');
    if (!host) return;
    var item = el('div', 'toast', message);
    host.appendChild(item);
    setTimeout(function () {
      item.style.opacity = '0';
      item.style.transform = 'translateY(6px)';
      item.style.transition = '0.25s ease';
      setTimeout(function () {
        item.remove();
      }, 260);
    }, 2200);
  }

  function formatCount(n) {
    var num = Number(n) || 0;
    if (num >= 100000000) return (num / 100000000).toFixed(1).replace(/\.0$/, '') + '亿';
    if (num >= 10000) return (num / 10000).toFixed(1).replace(/\.0$/, '') + '万';
    return String(num);
  }

  function formatDuration(sec) {
    var s = Math.round(Number(sec) || 0);
    if (!s) return '';
    var m = Math.floor(s / 60);
    var rest = s % 60;
    return m + ':' + (rest < 10 ? '0' : '') + rest;
  }

  function proxyUrl(url, name, inline) {
    var params = new URLSearchParams();
    params.set('u', url);
    if (name) params.set('name', name);
    if (inline) params.set('inline', '1');
    return API_PROXY + '?' + params.toString();
  }

  function safeName(data, suffix) {
    var base = (data.title || data.platformName || 'netclip')
      .replace(/[#@]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 36);
    return base ? base + ' ' + suffix : 'netclip ' + suffix;
  }

  function icon(name) {
    var paths = {
      video: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h6A2.5 2.5 0 0 1 15 6.5v11A2.5 2.5 0 0 1 12.5 20h-6A2.5 2.5 0 0 1 4 17.5v-11Z" stroke="currentColor" stroke-width="1.7"/><path d="m16 10 3.2-2v8L16 14" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
      audio: '<path d="M9 18V6l9-2v12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="7" cy="18" r="2.2" stroke="currentColor" stroke-width="1.7"/><circle cx="16" cy="16" r="2.2" stroke="currentColor" stroke-width="1.7"/>',
      image: '<rect x="4" y="5" width="16" height="14" rx="2.5" stroke="currentColor" stroke-width="1.7"/><circle cx="9" cy="10" r="1.6" fill="currentColor"/><path d="m5 17 4.5-4.5 3 3L16 12l4 5" stroke="currentColor" stroke-width="1.7"/>',
      copy: '<rect x="9" y="9" width="11" height="11" rx="2.4" stroke="currentColor" stroke-width="1.7"/><path d="M15 6.5A2.5 2.5 0 0 0 12.5 4H6.5A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15" stroke="currentColor" stroke-width="1.7"/>',
      link: '<path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.3-2.3a4 4 0 0 0-5.7-5.7L11.5 6.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.3 2.3a4 4 0 0 0 5.7 5.7l1.3-1.3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>'
    };
    var span = document.createElement('span');
    span.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' + (paths[name] || '') + '</svg>';
    return span.firstChild;
  }

  /* ---------- 渲染 ---------- */

  function renderSkeleton(count) {
    var box = $('#results');
    box.innerHTML = '';
    for (var i = 0; i < Math.min(count || 1, 3); i += 1) {
      var sk = el('div', 'skeleton');
      sk.style.marginTop = i ? '14px' : '0';
      var cover = el('div', 'sk sk-cover');
      var lines = el('div');
      var widths = ['70%', '100%', '45%', '30%'];
      widths.forEach(function (w) {
        var line = el('div', 'sk sk-line');
        line.style.width = w;
        lines.appendChild(line);
      });
      sk.appendChild(cover);
      sk.appendChild(lines);
      box.appendChild(sk);
    }
  }

  function notice(kind, message) {
    var node = el('div', 'notice ' + kind, message);
    return node;
  }

  function buildCard(data, index) {
    var card = el('div', 'result-card');
    card.style.animationDelay = index * 60 + 'ms';

    var cover = el('div', 'cover');
    var badge = el('span', 'badge', data.platformName || data.platform?.name || '');
    cover.appendChild(badge);
    if (data.cover) {
      var img = document.createElement('img');
      img.loading = 'lazy';
      img.alt = '';
      img.src = proxyUrl(data.cover, '', true);
      cover.appendChild(img);
    }

    var body = el('div', 'result-body');
    var top = el('div', 'result-top');
    var tag = el('span', 'plat-tag', data.platformName || '');
    top.appendChild(tag);
    var dur = formatDuration(data.duration);
    if (dur) top.appendChild(el('span', '', t('duration') + ' ' + dur));
    body.appendChild(top);

    body.appendChild(el('p', 'result-title', data.title || 'Untitled'));

    var meta = el('div', 'result-meta');
    if (data.author && data.author.name) {
      var author = el('span', 'author');
      if (data.author.avatar) {
        var av = document.createElement('img');
        av.src = proxyUrl(data.author.avatar, '', true);
        av.alt = '';
        author.appendChild(av);
      }
      author.appendChild(document.createTextNode(data.author.name));
      meta.appendChild(author);
    }
    var stats = data.stats || {};
    if (stats.play) meta.appendChild(statNode(t('play'), formatCount(stats.play)));
    if (stats.like) meta.appendChild(statNode(t('like'), formatCount(stats.like)));
    if (stats.comment) meta.appendChild(statNode(t('comment'), formatCount(stats.comment)));
    body.appendChild(meta);

    var row = el('div', 'dl-row');
    (data.videos || []).forEach(function (video) {
      var a = el('a', 'dl');
      a.href = proxyUrl(video.url, safeName(data, video.label || 'video'));
      a.setAttribute('rel', 'noopener');
      a.appendChild(icon('video'));
      a.appendChild(document.createTextNode(video.label || t('video')));
      row.appendChild(a);
    });

    if (data.music && data.music.url) {
      var audio = el('a', 'dl alt');
      audio.href = proxyUrl(data.music.url, safeName(data, 'audio'));
      audio.appendChild(icon('audio'));
      audio.appendChild(document.createTextNode(data.music.title || t('audio')));
      row.appendChild(audio);
    }

    if (data.cover) {
      var coverBtn = el('a', 'dl alt');
      coverBtn.href = proxyUrl(data.cover, safeName(data, 'cover'));
      coverBtn.appendChild(icon('image'));
      coverBtn.appendChild(document.createTextNode(t('cover')));
      row.appendChild(coverBtn);
    }

    if (data.sourceUrl) {
      var open = el('a', 'dl alt');
      open.href = data.sourceUrl;
      open.target = '_blank';
      open.rel = 'noopener';
      open.appendChild(icon('link'));
      open.appendChild(document.createTextNode(t('openSource')));
      row.appendChild(open);
    }

    var copyBtn = el('button', 'dl alt');
    copyBtn.type = 'button';
    copyBtn.appendChild(icon('copy'));
    copyBtn.appendChild(document.createTextNode(t('copySource')));
    copyBtn.addEventListener('click', function () {
      copyText(data.sourceUrl || '');
    });
    row.appendChild(copyBtn);

    body.appendChild(row);

    if (data.images && data.images.length) {
      var strip = el('div', 'img-strip');
      data.images.forEach(function (src, i) {
        var a = document.createElement('a');
        a.href = proxyUrl(src, safeName(data, 'image-' + (i + 1)));
        a.title = t('image') + ' ' + (i + 1);
        var thumb = document.createElement('img');
        thumb.src = proxyUrl(src, '', true);
        thumb.loading = 'lazy';
        thumb.alt = '';
        a.appendChild(thumb);
        strip.appendChild(a);
      });
      body.appendChild(strip);
    }

    if (data.note) body.appendChild(notice('warn', data.note));

    card.appendChild(cover);
    card.appendChild(body);

    if (!(data.videos || []).length && !(data.images || []).length) {
      card.appendChild(notice('warn', lang === 'en' ? 'No direct media URL returned. Open the source post to view it.' : '未取到可直接下载的媒体地址，可点击「打开原帖」查看。'));
    }

    return card;
  }

  function statNode(label, value) {
    var span = el('span');
    span.appendChild(document.createTextNode(label + ' '));
    span.appendChild(el('b', '', value));
    return span;
  }

  function copyText(text) {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          toast(t('copied'));
        },
        function () {
          toast(t('copyFail'));
        }
      );
      return;
    }
    var area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand('copy');
      toast(t('copied'));
    } catch (err) {
      toast(t('copyFail'));
    }
    area.remove();
  }

  /* ---------- 请求 ---------- */

  function setLoading(on) {
    var btn = $('#submit-btn');
    if (!btn) return;
    if (on) {
      btn.dataset.original = btn.textContent;
      btn.textContent = t('parsing');
      btn.disabled = true;
    } else {
      btn.textContent = btn.dataset.original || t('submit');
      btn.disabled = false;
    }
  }

  function extractUrls(text) {
    var found = String(text || '').match(/https?:\/\/[^\s"'<>，。、）)】]+/g) || [];
    var seen = {};
    return found
      .map(function (u) {
        return u.replace(/[.,;:!?]+$/, '');
      })
      .filter(function (u) {
        if (seen[u]) return false;
        seen[u] = 1;
        return true;
      });
  }

  function handleSubmit(event) {
    if (event) event.preventDefault();
    var input = $('#url-input');
    var raw = input ? input.value : '';
    var urls = extractUrls(raw);

    if (!urls.length) {
      toast(t('empty'));
      if (input) input.focus();
      return;
    }
    if (urls.length > MAX_BATCH) {
      toast(t('batchLimit'));
      return;
    }

    var box = $('#results');
    box.innerHTML = '';
    renderSkeleton(urls.length);
    setLoading(true);

    fetch(API_PARSE, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ urls: urls })
    })
      .then(function (res) {
        return res.json().then(function (body) {
          return { status: res.status, body: body };
        });
      })
      .then(function (result) {
        var body = result.body || {};
        box.innerHTML = '';

        if (!body.ok) {
          var msg = (body.error && body.error.message) || t('emptyResult');
          if (body.error && body.error.code === 'unsupported_platform') msg += ' · ' + t('unsupportedHint');
          box.appendChild(notice('err', msg));
          return;
        }

        var items = body.items || (body.data ? [{ ok: true, data: body.data }] : []);
        var okCount = 0;

        items.forEach(function (item, i) {
          if (item.ok && item.data) {
            box.appendChild(buildCard(item.data, okCount));
            okCount += 1;
          } else {
            var errCard = el('div', 'result-card');
            var errBody = el('div', 'result-body');
            errBody.style.gridColumn = '1 / -1';
            errBody.appendChild(el('p', 'result-title', item.input || ''));
            errBody.appendChild(notice('err', (item.error && item.error.message) || t('emptyResult')));
            errCard.appendChild(errBody);
            box.appendChild(errCard);
          }
        });

        if (body.quota) {
          var info = el('div', 'notice warn', t('quota') + '：' + body.quota.remaining + ' / ' + body.quota.limit);
          if (items.length > 1) info.textContent = t('quota') + '：' + body.quota.remaining + ' / ' + body.quota.limit + '　·　' + okCount + '/' + items.length;
          box.appendChild(info);
        }
      })
      .catch(function () {
        box.innerHTML = '';
        box.appendChild(notice('err', t('netErr')));
      })
      .then(function () {
        setLoading(false);
      });
  }

  /* ---------- 语言 ---------- */

  function applyLang(next) {
    lang = next;
    localStorage.setItem('netclip.lang', next);
    document.documentElement.lang = next === 'en' ? 'en' : 'zh-CN';

    if (PAGE === 'pro') {
      if (next === 'zh') location.href = '/';
      return;
    }

    var dict = I18N[next] || {};
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), function (node) {
      var key = node.getAttribute('data-i18n');
      if (dict[key]) node.textContent = dict[key];
      else if (next === 'zh' && node.dataset.zh === undefined) {
        if (!node.dataset.default) node.dataset.default = node.textContent;
        node.textContent = node.dataset.default;
      }
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-html]'), function (node) {
      var key = node.getAttribute('data-i18n-html');
      if (!node.dataset.defaultHtml) node.dataset.defaultHtml = node.innerHTML;
      if (dict[key]) node.innerHTML = dict[key];
      else if (node.dataset.defaultHtml) node.innerHTML = node.dataset.defaultHtml;
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-placeholder]'), function (node) {
      var key = node.getAttribute('data-i18n-placeholder');
      if (!node.dataset.defaultPh) node.dataset.defaultPh = node.getAttribute('placeholder') || '';
      node.setAttribute('placeholder', dict[key] || node.dataset.defaultPh);
    });
    var submit = $('#submit-btn');
    if (submit && !submit.disabled) submit.textContent = t('submit');

    Array.prototype.forEach.call(document.querySelectorAll('.lang-switch button'), function (btn) {
      btn.setAttribute('aria-pressed', btn.getAttribute('data-lang') === next ? 'true' : 'false');
    });
  }

  /* ---------- 初始化 ---------- */

  function initChips() {
    var host = $('#platform-chips');
    if (!host) return;
    HOME_PLATFORMS.forEach(function (p) {
      var chip = el('span', 'chip');
      chip.style.color = p.color;
      var dot = el('span', 'd');
      chip.appendChild(dot);
      chip.appendChild(document.createTextNode(p.label));
      chip.style.color = '';
      chip.style.borderColor = '';
      dot.style.background = p.color;
      host.appendChild(chip);
    });
  }

  function initTabs() {
    var tabs = document.querySelectorAll('.tabs [role="tab"]');
    var input = $('#url-input');
    Array.prototype.forEach.call(tabs, function (tab) {
      tab.addEventListener('click', function () {
        Array.prototype.forEach.call(tabs, function (other) {
          other.setAttribute('aria-selected', other === tab ? 'true' : 'false');
        });
        var key = tab.getAttribute('data-platform');
        var map = {
          tiktok: 'Paste a TikTok link, e.g. https://www.tiktok.com/@user/video/7300000000000000000',
          xiaohongshu: 'Paste a REDnote link, e.g. https://www.xiaohongshu.com/explore/xxxxxxxxxxxxxxxx',
          douyin: 'Paste a Douyin link, e.g. https://v.douyin.com/xxxxxxx/',
          bilibili: 'Paste a Bilibili link, e.g. https://www.bilibili.com/video/BV1xx411c7mD',
          instagram: 'Paste an Instagram link, e.g. https://www.instagram.com/p/xxxxxxx/'
        };
        if (input) input.setAttribute('placeholder', map[key] || '');
        if (input) input.focus();
      });
    });
  }

  function init() {
    initChips();
    initTabs();

    var form = $('#parse-form');
    if (form) {
      form.addEventListener('submit', handleSubmit);
      var area = $('#url-input');
      if (area) {
        area.addEventListener('keydown', function (e) {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit(e);
        });
      }
    }

    var pasteBtn = $('#paste-btn');
    if (pasteBtn && navigator.clipboard && navigator.clipboard.readText) {
      pasteBtn.addEventListener('click', function () {
        navigator.clipboard.readText().then(
          function (text) {
            var input = $('#url-input');
            if (input && text) {
              input.value = text.trim();
              input.focus();
            }
          },
          function () {
            toast(t('noClipboard'));
          }
        );
      });
    } else if (pasteBtn) {
      pasteBtn.style.display = 'none';
    }

    var clearBtn = $('#clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        var input = $('#url-input');
        if (input) input.value = '';
        var box = $('#results');
        if (box) box.innerHTML = '';
      });
    }

    Array.prototype.forEach.call(document.querySelectorAll('.lang-switch button'), function (btn) {
      btn.addEventListener('click', function () {
        var next = btn.getAttribute('data-lang');
        if (PAGE === 'pro' && next === 'zh') {
          location.href = '/';
          return;
        }
        applyLang(next);
      });
    });

    if (lang !== 'zh' && PAGE !== 'pro') applyLang(lang);

    if (PAGE === 'pro') {
      Array.prototype.forEach.call(document.querySelectorAll('.lang-switch button'), function (btn) {
        btn.setAttribute('aria-pressed', btn.getAttribute('data-lang') === 'en' ? 'true' : 'false');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.NetClip = { applyLang: applyLang, parse: handleSubmit };
})();
