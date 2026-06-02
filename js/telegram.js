/* ============================================================
   VIDYA STEM – Telegram Module
   js/telegram.js  |  v3.0.0

   Sends compact audit summaries to Telegram.
   Payload is kept tiny: emoji table, no full item names.
   ============================================================ */

const telegramBot = (() => {

  function _cfg() { return APP_CONFIG.telegram; }

  /* ── Format a compact message ── */
  function buildMessage(meta, results) {
    const d = new Date(meta.ts);
    const dateStr = d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });

    const total   = results.length;
    const present = results.filter(r => r.status === 'Well Present').length;
    const broken  = results.filter(r => r.status === 'Broken').length;
    const missing = results.filter(r => r.status === 'Missing').length;

    // Compact lines only for non-present items
    const issues = results
      .filter(r => r.status !== 'Well Present')
      .map(r => `  ${r.status === 'Broken' ? '🟡' : '🔴'} ${r.code}`)
      .join('\n');

    const pct = Math.round((present / total) * 100);

    return [
      `📋 *AUDIT REPORT*`,
      `🏫 ${meta.school || meta.user} — ${meta.labName}`,
      `🕐 ${dateStr}`,
      ``,
      `✅ Present: ${present}/${total} (${pct}%)`,
      `🟡 Broken:  ${broken}`,
      `🔴 Missing: ${missing}`,
      ``,
      issues ? `*Issues:*\n${issues}` : `*No issues found* 🎉`
    ].join('\n');
  }

  /* ── Send via Telegram Bot API ── */
  async function send(text) {
    const cfg = _cfg();
    if (!cfg.enabled || !cfg.botToken || cfg.botToken === 'YOUR_BOT_TOKEN_HERE') {
      console.warn('[Telegram] Not configured – skipping push');
      return { ok: false, reason: 'not_configured' };
    }
    try {
      const r = await fetch(
        `https://api.telegram.org/bot${cfg.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: cfg.chatId,
            text,
            parse_mode: 'Markdown',
            disable_web_page_preview: true
          })
        }
      );
      return await r.json();
    } catch (e) {
      console.error('[Telegram] Send error:', e);
      return { ok: false, reason: e.message };
    }
  }

  return {
    pushAudit: async function (meta, results) {
      const msg = buildMessage(meta, results);
      return send(msg);
    }
  };
})();
