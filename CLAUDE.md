# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

A local MCP server + `tv` CLI that reads and controls a live TradingView Desktop chart by evaluating JavaScript inside the running Electron app over Chrome DevTools Protocol (CDP) on `localhost:9222`. No TradingView servers are contacted.

## Commands

```bash
npm install
npm start                 # run the MCP server over stdio (src/server.js)
npm run tv -- <command>   # run the CLI without linking (e.g. npm run tv -- status)
node src/cli/index.js status   # equivalent direct invocation

# Tests (run offline — no TradingView needed unless noted)
npm test                  # e2e + pine_analyze suites
npm run test:unit         # pine_analyze + cli
npm run test:all          # e2e + pine_analyze + cli
npm run test:cli          # CLI routing only

# Run one test file
node --test tests/sanitization.test.js
# Run one test by name
node --test --test-name-pattern "safeString" tests/sanitization.test.js
```

Notes:
- ESM project (`"type": "module"`) targeting Node 18+. Only two runtime deps: `@modelcontextprotocol/sdk` and `chrome-remote-interface`.
- `package.json` test scripts do **not** include every test file. `tests/sanitization.test.js` and `tests/replay.test.js` exist but are only run when invoked directly — run them too when touching sanitization, chart, drawing, or replay core.
- Most tests are fully offline (mocked CDP). The e2e suite expects TradingView running with `--remote-debugging-port=9222`; launch via `scripts/launch_tv_debug*.{bat,sh}` or the `tv_launch` tool.

## Architecture

Three layers per feature area, plus a parallel CLI surface. To add or change a capability you almost always touch the same-named file in each layer.

```
MCP tool (src/tools/X.js)  ──┐
                             ├──> core logic (src/core/X.js) ──> connection.js ──> CDP ──> TradingView
CLI command (src/cli/commands/X.js) ──┘
```

- **`src/connection.js`** — singleton CDP client (lazy `getClient()` with liveness check + exponential-backoff reconnect). `evaluate(expr)` / `evaluateAsync(expr)` run a JS expression in the page and return its value. `KNOWN_PATHS` holds the discovered internal TradingView API paths (e.g. `window.TradingViewApi._activeChartWidgetWV.value()`). Exports the two sanitizers `safeString()` and `requireFinite()`.
- **`src/core/*.js`** — the real work. Each function builds a string of JavaScript, calls `evaluate`/`evaluateAsync`, and returns a plain `{ success, ... }` object. **No MCP types here** — core is the reusable layer (re-exported as the `./core` package entry via `src/core/index.js`). This is the layer to edit for behavior changes.
- **`src/tools/*.js`** — thin MCP adapters. Each `registerXTools(server)` defines tools with a Zod input schema, calls the matching `core.fn(args)`, and wraps the result with `jsonResult()` (from `src/tools/_format.js`). Errors are caught and returned as `jsonResult({ success:false, error }, true)`. `src/server.js` calls every `registerXTools` and holds the tool-selection guide that ships to the model.
- **`src/cli/*`** — a second adapter over the same core. `src/cli/index.js` imports every `commands/*.js` (each self-registers via `router.register(name, {handler})`) then `run(argv)`. `router.js` is a zero-dependency `parseArgs` dispatcher with subcommand support; handlers receive `(values, positionals)` and return the object that gets JSON-printed. Exit codes: `0` success, `1` error, `2` connection failure.
- **`src/wait.js`** — `waitForChartReady()` polls the DOM/bar state so mutations settle before returning.

### Key conventions

- **Dependency injection for testability.** Core functions that mutate state take an optional `_deps` and resolve it through a local `_resolve(deps)` that falls back to the real `evaluate`/`evaluateAsync`/`waitForChartReady`. Tests pass mock `_deps` (see `tests/sanitization.test.js`) to assert on the exact JS string sent to CDP without a live chart. Preserve this pattern when adding mutating core functions.
- **CDP injection safety is mandatory.** Any value interpolated into an `evaluate` string must go through `safeString(str)` (JSON-stringifies to a quoted JS literal) or `requireFinite(n, name)` (rejects NaN/Infinity before it can persist to TradingView cloud state). Never template a raw user string into evaluated JS. `tests/sanitization.test.js` audits the core sources for this.
- **Return shape.** Everything returns `{ success: true/false, ... }`; tools wrap it, CLI prints it.
- **Internal APIs are undocumented and brittle.** Logic depends on `window.TradingViewApi._...` internals that can change between TradingView releases. Probe with `tv ui eval` / `ui_evaluate` and update `KNOWN_PATHS` rather than scattering paths.

### Adding a tool/command

1. Add the function to `src/core/X.js` (build the JS string, sanitize inputs, return `{success,...}`).
2. Register an MCP tool in `src/tools/X.js` (Zod schema → `core.fn` → `jsonResult`).
3. Register a CLI command in `src/cli/commands/X.js` (`register(name, {handler})`).
4. Add offline tests with mocked `_deps`; for new tool groups also wire `registerXTools` into `src/server.js` and import the command file in `src/cli/index.js`.

---

# Operating the tools (decision tree)

The sections below guide *using* the 68+ tools against a live chart. Pine graphics path: `study._graphics._primitivesCollection.dwglines.get('lines').get(false)._primitivesDataById`.

## Which tool when

### "What's on my chart right now?"
1. `chart_get_state` → symbol, timeframe, chart type, list of all indicators with entity IDs
2. `data_get_study_values` → current numeric values from all visible indicators (RSI, MACD, BBands, EMAs, etc.)
3. `quote_get` → real-time price, OHLC, volume for current symbol

### "What levels/lines/labels are showing?"
Custom Pine indicators draw with `line.new()`, `label.new()`, `table.new()`, `box.new()`. These are invisible to normal data tools. Use:

1. `data_get_pine_lines` → horizontal price levels drawn by indicators (deduplicated, sorted high→low)
2. `data_get_pine_labels` → text annotations with prices (e.g., "PDH 24550", "Bias Long ✓")
3. `data_get_pine_tables` → table data formatted as rows (e.g., session stats, analytics dashboards)
4. `data_get_pine_boxes` → price zones / ranges as {high, low} pairs

Use `study_filter` parameter to target a specific indicator by name substring (e.g., `study_filter: "Profiler"`).

### "Give me price data"
- `data_get_ohlcv` with `summary: true` → compact stats (high, low, range, change%, avg volume, last 5 bars)
- `data_get_ohlcv` without summary → all bars (use `count` to limit, default 100)
- `quote_get` → single latest price snapshot

### "Analyze my chart" (full report workflow)
1. `quote_get` → current price
2. `data_get_study_values` → all indicator readings
3. `data_get_pine_lines` → key price levels from custom indicators
4. `data_get_pine_labels` → labeled levels with context (e.g., "Settlement", "ASN O/U")
5. `data_get_pine_tables` → session stats, analytics tables
6. `data_get_ohlcv` with `summary: true` → price action summary
7. `capture_screenshot` → visual confirmation

### "Change the chart"
- `chart_set_symbol` → switch ticker (e.g., "AAPL", "ES1!", "NYMEX:CL1!")
- `chart_set_timeframe` → switch resolution (e.g., "1", "5", "15", "60", "D", "W")
- `chart_set_type` → switch chart style (Candles, HeikinAshi, Line, Area, Renko, etc.)
- `chart_manage_indicator` → add or remove studies (use full name: "Relative Strength Index", not "RSI")
- `chart_scroll_to_date` → jump to a date (ISO format: "2025-01-15")
- `chart_set_visible_range` → zoom to exact date range (unix timestamps)

### "Work on Pine Script"
1. `pine_set_source` → inject code into editor
2. `pine_smart_compile` → compile with auto-detection + error check
3. `pine_get_errors` → read compilation errors
4. `pine_get_console` → read log.info() output
5. `pine_get_source` → read current code back (WARNING: can be very large for complex scripts)
6. `pine_save` → save to TradingView cloud
7. `pine_new` → create blank indicator/strategy/library
8. `pine_open` → load a saved script by name

### "Practice trading with replay"
1. `replay_start` with `date: "2025-03-01"` → enter replay mode
2. `replay_step` → advance one bar
3. `replay_autoplay` → auto-advance (set speed with `speed` param in ms)
4. `replay_trade` with `action: "buy"/"sell"/"close"` → execute trades
5. `replay_status` → check position, P&L, current date
6. `replay_stop` → return to realtime

### "Screen multiple symbols"
- `batch_run` with `symbols: ["ES1!", "NQ1!", "YM1!"]` and `action: "screenshot"` or `"get_ohlcv"`

### "Draw on the chart"
- `draw_shape` → horizontal_line, trend_line, rectangle, text (pass point + optional point2)
- `draw_list` → see what's drawn
- `draw_remove_one` → remove by ID
- `draw_clear` → remove all

### "Manage alerts"
- `alert_create` → set price alert (condition: "crossing", "greater_than", "less_than")
- `alert_list` → view active alerts
- `alert_delete` → remove alerts

### "Navigate the UI"
- `ui_open_panel` → open/close pine-editor, strategy-tester, watchlist, alerts, trading
- `ui_click` → click buttons by aria-label, text, or data-name
- `layout_switch` → load a saved layout by name
- `ui_fullscreen` → toggle fullscreen
- `capture_screenshot` → take a screenshot (regions: "full", "chart", "strategy_tester")

### "TradingView isn't running"
- `tv_launch` → auto-detect and launch TradingView with CDP on Mac/Win/Linux
- `tv_health_check` → verify connection is working

## Context management rules

These tools can return large payloads. Follow these rules to avoid context bloat:

1. **Always use `summary: true` on `data_get_ohlcv`** unless you specifically need individual bars
2. **Always use `study_filter`** on pine tools when you know which indicator you want — don't scan all studies unnecessarily
3. **Never use `verbose: true`** on pine tools unless the user specifically asks for raw drawing data with IDs/colors
4. **Avoid calling `pine_get_source`** on complex scripts — it can return 200KB+. Only read if you need to edit the code.
5. **Avoid calling `data_get_indicator`** on protected/encrypted indicators — their inputs are encoded blobs. Use `data_get_study_values` instead for current values.
6. **Use `capture_screenshot`** for visual context instead of pulling large datasets — a screenshot is ~300KB but gives you the full visual picture
7. **Call `chart_get_state` once** at the start to get entity IDs, then reference them — don't re-call repeatedly
8. **Cap your OHLCV requests** — `count: 20` for quick analysis, `count: 100` for deeper work, `count: 500` only when specifically needed

### Output size estimates (compact mode)
| Tool | Typical Output |
|------|---------------|
| `quote_get` | ~200 bytes |
| `data_get_study_values` | ~500 bytes (all indicators) |
| `data_get_pine_lines` | ~1-3 KB per study (deduplicated levels) |
| `data_get_pine_labels` | ~2-5 KB per study (capped at 50) |
| `data_get_pine_tables` | ~1-4 KB per study (formatted rows) |
| `data_get_pine_boxes` | ~1-2 KB per study (deduplicated zones) |
| `data_get_ohlcv` (summary) | ~500 bytes |
| `data_get_ohlcv` (100 bars) | ~8 KB |
| `capture_screenshot` | ~300 bytes (returns file path, not image data) |

## Tool conventions

- All tools return `{ success: true/false, ... }`
- Entity IDs (from `chart_get_state`) are session-specific — don't cache across sessions
- Pine indicators must be **visible** on chart for pine graphics tools to read their data
- `chart_manage_indicator` requires **full indicator names**: "Relative Strength Index" not "RSI", "Moving Average Exponential" not "EMA", "Bollinger Bands" not "BB"
- Screenshots save to `screenshots/` directory with timestamps
- OHLCV capped at 500 bars, trades at 20 per request
- Pine labels capped at 50 per study by default (pass `max_labels` to override)
