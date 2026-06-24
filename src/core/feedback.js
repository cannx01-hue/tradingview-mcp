/**
 * Core feedback-button logic.
 * Injects a fixed-position "Give Feedback" button into the live TradingView
 * Electron window via CDP. Clicking it opens a feedback URL (a prefilled
 * GitHub issue page by default) in the user's browser.
 */
import { evaluate as _evaluate, safeString } from '../connection.js';

const BTN_ID = 'tv-mcp-feedback-btn';
const DEFAULT_LABEL = 'Give Feedback';
const DEFAULT_URL = 'https://github.com/tradesdontlie/tradingview-mcp/issues/new';

function _resolve(deps) {
  return { evaluate: deps?.evaluate || _evaluate };
}

/**
 * Validate that a URL is http(s). Rejects javascript:/data: and other schemes
 * that could execute when handed to window.open / location.href.
 */
function requireHttpUrl(url, name) {
  const s = String(url);
  if (!/^https?:\/\//i.test(s)) {
    throw new Error(`${name} must be an http(s) URL, got: ${s}`);
  }
  return s;
}

export async function addFeedbackButton({ label = DEFAULT_LABEL, url = DEFAULT_URL, _deps } = {}) {
  const { evaluate } = _resolve(_deps);
  requireHttpUrl(url, 'url');

  const result = await evaluate(`
    (function() {
      var BTN_ID = ${safeString(BTN_ID)};
      var existing = document.getElementById(BTN_ID);
      if (existing) existing.remove();
      var btn = document.createElement('button');
      btn.id = BTN_ID;
      btn.type = 'button';
      btn.textContent = ${safeString(label)};
      btn.title = ${safeString(label)};
      btn.style.cssText = [
        'position:fixed', 'bottom:16px', 'right:16px', 'z-index:2147483647',
        'padding:8px 14px', 'border:none', 'border-radius:6px',
        'background:#2962ff', 'color:#fff', 'font:600 13px/1 sans-serif',
        'cursor:pointer', 'box-shadow:0 2px 8px rgba(0,0,0,0.3)'
      ].join(';');
      var FEEDBACK_URL = ${safeString(url)};
      btn.addEventListener('click', function() {
        try { window.open(FEEDBACK_URL, '_blank', 'noopener'); }
        catch (e) { window.location.href = FEEDBACK_URL; }
      });
      document.body.appendChild(btn);
      return { injected: !!document.getElementById(BTN_ID) };
    })()
  `);

  return { success: true, label, url, injected: !!result?.injected };
}

export async function removeFeedbackButton({ _deps } = {}) {
  const { evaluate } = _resolve(_deps);
  const result = await evaluate(`
    (function() {
      var btn = document.getElementById(${safeString(BTN_ID)});
      if (!btn) return { removed: false };
      btn.remove();
      return { removed: !document.getElementById(${safeString(BTN_ID)}) };
    })()
  `);
  return { success: true, removed: !!result?.removed };
}
