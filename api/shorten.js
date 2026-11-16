function validUrl(value) {
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol) && parsed.hostname.includes('.');
  } catch { return false; }
}

// Compatibility endpoint: clients always receive the original target, with no shortening provider.
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const target = String(req.query.url || '').trim();
  if (!validUrl(target)) {
    return res.status(400).json({ok:false,error:'http:// 또는 https:// 로 시작하는 올바른 URL을 입력해 주세요.'});
  }
  return res.status(200).json({
    ok:true, shortUrl:target, displayUrl:target, qrUrl:target, targetUrl:target,
    label:String(req.query.slug || '').trim(), provider:'direct'
  });
}
