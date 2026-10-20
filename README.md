# Police PowersIQ

Interactive Canadian police powers study app. Built as a static website so it can deploy directly from GitHub to Netlify without a build command.

## Features
- Question bank with 230 practice items (including alternate-format testing of some of the same concepts)
- 10, 15, 20, 25 or 30 question rounds; unseen questions first
- Scantron-compatible single-choice, true/false and selectable completion-style questions
- Ten five-option questions using combinations or “All of the above”; select the most complete correct answer with one choice
- Immediate answer checking and short explanations
- Linked Canadian legislation and judgments, with explicit pending states for unresolved legal support
- 40-question, 90-minute mock exam
- Topic filtering, review of mistakes, persistent progress using `localStorage`
- Copper-orange accents with charcoal dark mode and warm cream light mode
- Persistent theme switch, tactile pressed buttons, CSS 3D scales and reduced-motion support
- Mobile-friendly interface

## Deploy
1. Keep `index.html`, `styles.css`, `app.js`, `appearance.js`, `questions.js`, `legal-feedback.js`, `legal-authorities.json`, and `question-feedback.json` together in the repository root.
2. In Netlify, connect the GitHub repository if not connected already.
3. Build command: **leave blank**. Publish directory: **`.`** (repository root).
4. Trigger deploy. Since it is a static app, no API keys or environment variables are needed.

## Legal feedback
Feedback joins `question-feedback.json.feedback[question.id]` to the catalogue in `legal-authorities.json`. The same renderer supplies immediate practice feedback and final practice/mock-exam reviews. It does not fall back to historical slide references or unreviewed explanations in `questions.js`.

The current review includes 210 legally supported items, 13 explicitly labelled mnemonic items, and 7 pending items. A verified source record does not automatically verify a question. Pending items remain in the pool to preserve selection behavior, but show a neutral verification notice and a recorded answer key rather than an established legal explanation. Existing scores and saved progress are retained.

Reviewed statute text was consolidated to September 30, 2026; the source checks were performed October 20, 2026. See [LEGAL-REVIEW.md](LEGAL-REVIEW.md) for scope, outstanding checks and maintenance instructions. Alternate formats repeat concepts: 230 **question items** does not mean 230 independent concepts. The completion-labelled items use selectable answers, not typed input.

The ten former multi-select items keep their M001–M010 IDs and now accept one answer. Five use numbered statements and answer combinations; five use individually true choices, a partial combination, and “All of the above.” No “only” qualifier is added. “All of the above” stays last while the other choices shuffle; numbered statement references stay fixed while their answer combinations shuffle. Existing saved progress is retained.

The interface groups questions by legal topic rather than professor-specific chapter numbers. Existing internal group values and question IDs remain unchanged to preserve filtering and saved progress.

## Local development and validation
Serve the repository over HTTP, for example with `python3 -m http.server 8000`. Opening `index.html` directly as a file does not provide the supported JSON-loading workflow.

Run `python3 tests/test_legal_feedback.py` with Python, Playwright and Chromium installed. Set `CHROMIUM_PATH` if Chromium is not on `PATH`. The suite starts its own temporary local HTTP server and isolated browser contexts; it does not alter user browser progress. It covers all 230 feedback records, all question types, shuffled answer mapping, exact-set grading, practice and exam review, existing progress, unresolved or missing mappings, failed fetches, escaped text and safe links. Also run `node --check app.js`, `node --check questions.js`, and `node --check legal-feedback.js`, and `node --check appearance.js`. Theme checks also cover keyboard switching, persistence, unavailable storage, reduced motion, and responsive layouts.

## Privacy
Study progress is saved only to the browser's `localStorage`. It is not synchronized between devices. Clearing site data resets it.
