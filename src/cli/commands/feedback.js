import { register } from '../router.js';
import * as core from '../../core/feedback.js';

register('feedback', {
  description: 'Feedback button (add, remove)',
  subcommands: new Map([
    ['add', {
      description: 'Inject a "Give Feedback" button into the TradingView window',
      options: {
        label: { type: 'string', short: 'l', description: 'Button label text' },
        url: { type: 'string', short: 'u', description: 'http(s) URL the button opens' },
      },
      handler: (opts) => core.addFeedbackButton({ label: opts.label, url: opts.url }),
    }],
    ['remove', {
      description: 'Remove the injected feedback button',
      handler: () => core.removeFeedbackButton(),
    }],
  ]),
});
