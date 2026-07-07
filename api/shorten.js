const CUSTOM_DOMAIN = 'https://go.linkly.store';

function validUrl(value) {
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol) && parsed.hostname.includes('.');
  } catch {
    return false;
  }
}

function slugify(text = '') {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 42);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const longUrl = String(req.query.url || '').trim();
  const slug = slugify(req.query.slug || '');
  const campaign = String(req.query.campaign || '').trim();

  if (!validUrl(longUrl)) {
    return res.status(400).json({
      ok: false,
      error: 'http:// 또는 https:// 로 시작하는 올바른 URL을 입력해 주세요.',
    });
  }

  try {
    const apiUrl = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`;
    const response = await fetch(apiUrl, {
      headers: { 'User-Agent': 'Hermes-Linkly-Preview/1.0' },
    });
    const shortUrl = (await response.text()).trim();

    if (!response.ok || !shortUrl.startsWith('http')) {
      throw new Error(shortUrl || `TinyURL responded with ${response.status}`);
    }

    return res.status(200).json({
      ok: true,
      shortUrl,
      displayUrl: slug ? `${CUSTOM_DOMAIN}/${slug}` : shortUrl.replace('https://', ''),
      qrUrl: shortUrl,
      slug,
      campaign,
      provider: 'TinyURL public API',
    });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      error: `단축 링크 생성 API 연결에 실패했습니다: ${error.message}`,
    });
  }
}
