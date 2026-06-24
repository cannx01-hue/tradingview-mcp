/**
 * Tests for chart core functions that read state via evaluate().
 * Regression guard: getVisibleRange, scrollToDate, and symbolInfo previously
 * referenced the bare name `evaluate` (imported aliased as `_evaluate`) without
 * going through _resolve(), which threw "evaluate is not defined" at runtime.
 * These tests drive them through mocked _deps so the wiring is exercised offline.
 *
 * Run: node --test tests/chart.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getVisibleRange, scrollToDate, symbolInfo } from '../src/core/chart.js';

function mockDeps(evalImpl) {
  const calls = [];
  const evaluate = async (expr) => { calls.push(expr); return evalImpl ? evalImpl(expr) : undefined; };
  evaluate.calls = calls;
  return { _deps: { evaluate }, evaluate };
}

describe('getVisibleRange()', () => {
  it('resolves deps without ReferenceError and returns ranges', async () => {
    const { _deps, evaluate } = mockDeps(() => ({
      visible_range: { from: 100, to: 200 },
      bars_range: { from: 100, to: 195 },
    }));
    const r = await getVisibleRange({ _deps });
    assert.equal(r.success, true);
    assert.deepEqual(r.visible_range, { from: 100, to: 200 });
    assert.deepEqual(r.bars_range, { from: 100, to: 195 });
    assert.ok(evaluate.calls[0].includes('getVisibleRange'), 'queries the chart api');
  });
});

describe('symbolInfo()', () => {
  it('resolves deps and spreads the symbol fields', async () => {
    const { _deps, evaluate } = mockDeps(() => ({
      symbol: 'XAUUSD', full_name: 'FOREXCOM:XAUUSD', exchange: 'FOREXCOM',
      description: 'Gold / U.S. Dollar', type: 'commodity',
    }));
    const r = await symbolInfo({ _deps });
    assert.equal(r.success, true);
    assert.equal(r.symbol, 'XAUUSD');
    assert.equal(r.exchange, 'FOREXCOM');
    assert.ok(evaluate.calls[0].includes('symbolExt'), 'reads symbol metadata');
  });
});

describe('scrollToDate()', () => {
  // First evaluate call reads resolution; return a value for it, undefined otherwise.
  const withResolution = (res) => (expr) => expr.includes('resolution()') ? res : undefined;

  it('resolves deps and parses an ISO date', async () => {
    const { _deps, evaluate } = mockDeps(withResolution('60'));
    const r = await scrollToDate({ date: '2025-01-15', _deps });
    assert.equal(r.success, true);
    assert.equal(r.resolution, '60');
    assert.equal(r.centered_on, Math.floor(new Date('2025-01-15').getTime() / 1000));
    // window is +/- 25 bars of 60 minutes
    assert.equal(r.window.from, r.centered_on - 25 * 3600);
    assert.equal(r.window.to, r.centered_on + 25 * 3600);
    assert.ok(evaluate.calls.some(c => c.includes('zoomToBarsRange')), 'zooms the time scale');
  });

  it('accepts a unix timestamp string', async () => {
    const { _deps } = mockDeps(withResolution('D'));
    const r = await scrollToDate({ date: '1736899200', _deps });
    assert.equal(r.success, true);
    assert.equal(r.centered_on, 1736899200);
    assert.equal(r.window.from, 1736899200 - 25 * 86400, 'daily bar window uses 86400s');
  });

  it('throws on an unparseable date', async () => {
    const { _deps } = mockDeps(withResolution('60'));
    await assert.rejects(() => scrollToDate({ date: 'not-a-date', _deps }), /Could not parse date/);
  });
});
