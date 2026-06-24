import { z } from 'zod';
import { jsonResult } from './_format.js';
import * as core from '../core/feedback.js';

export function registerFeedbackTools(server) {
  server.tool('feedback_button_add', 'Inject a "Give Feedback" button into the live TradingView window. Clicking it opens a feedback URL (a prefilled GitHub issue page by default).', {
    label: z.string().optional().describe('Button label text (default: "Give Feedback")'),
    url: z.string().optional().describe('http(s) URL the button opens (default: the project\'s GitHub new-issue page)'),
  }, async ({ label, url }) => {
    try { return jsonResult(await core.addFeedbackButton({ label, url })); }
    catch (err) { return jsonResult({ success: false, error: err.message }, true); }
  });

  server.tool('feedback_button_remove', 'Remove the feedback button previously injected into the TradingView window', {}, async () => {
    try { return jsonResult(await core.removeFeedbackButton()); }
    catch (err) { return jsonResult({ success: false, error: err.message }, true); }
  });
}
