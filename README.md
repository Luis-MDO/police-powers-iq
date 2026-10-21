# Police PowersIQ

Interactive Canadian police powers study app. A static website with a small CSS/3D build step. Netlify builds the deployable files into `dist/`.

## Features
- Question bank with 230 practice items (including alternate-format testing of some of the same concepts)
- 10, 15, 20, 25 or 30 question rounds; unseen questions first
- Scantron-compatible single-choice, true/false and selectable completion-style questions
- True/false choices always display True first, then False; other answer options retain their shuffle rules
- Unfinished practice sessions save automatically, including question and answer order, checked answers and position; resume them from the dashboard
- Ten five-option questions using combinations or “All of the above”; select the most complete correct answer with one choice
- Immediate answer checking and short explanations
- Linked Canadian legislation and judgments, with explicit pending states for unresolved legal support
- 40-question, 30-minute mock exam with a fixed deadline, early submission and automatic submission at expiry or when leaving
- Spaced review after 1, 3, 7, 14 and 30 days, with missed questions scheduled for the next day
- Topic accuracy, recent trends and targeted practice for the weakest topic
- Selected-choice explanations derived from reviewed legal feedback; answer comparisons appear only for wrong or unanswered items, and unresolved items stay pending
- Question reports with a preview, optional Netlify Forms submission, local saving and readable text (.txt) downloads
- Legal review dates, an exportable maintenance queue and an optional weekly source-change monitor
- Topic filtering, review of mistakes, persistent progress using `localStorage`
- Copper-orange accents with charcoal dark mode and warm cream light mode
- Persistent theme switch with a responsive layered power button, tactile pressed buttons, CSS 3D scales and reduced-motion support
- Study Guide tab with five named topics, expandable notes, primary-source links, a separate reading checklist and topic practice
- Separate Midterm and Final exam entry cards; current material stays within Midterm, with Study guide first
- Saved per-section review checkboxes and percentage rings based on each topic’s actual section count
- Optional lazy-loaded Three.js scales with particles, a dimensional SVG fallback, pause control and reduced-motion support
- Modular native CSS sources bundled and minified into one stylesheet
- Mobile-friendly interface

## Deploy
1. Install dependencies with `npm ci` (Node 22 or newer).
2. Run `npm run build`. This creates one bundled/minified `styles.css`, the optional local 3D bundle in `assets/`, and a deployment-only `dist/` folder.
3. Netlify configuration is in `netlify.toml`: build command **`npm run build`**, publish directory **`dist`**, Node **22**. Update any old dashboard override that still publishes `.` or omits the build command.
4. For a manual static deploy, upload the **contents of `dist/`**, not the source or `node_modules/`. No API keys are needed for study features.
5. Preserve Netlify Forms detection for the `question-report` form in the generated `dist/index.html`. The static form declaration, honeypot and field names are unchanged. Check form detection and one acknowledged submission after a future approved deployment.

## CSS source organization

Edit `styles/`, not the generated root `styles.css`. `styles/styles.css` is the entry point: it imports tokens, shared base rules, component styles, dashboard/practice/guide/landing views, review indicators and accessibility overrides. Build-time imports are combined by esbuild; visitors request one CSS file rather than each source file.

Shared colors and light/dark theme values are in `styles/tokens.css`. Buttons, header, theme switch, reports, feedback and visual effects have individual files under `styles/components/`; view-specific rules are in `styles/views/`. Each source remains ordinary CSS with conventional selectors and media queries; the refactor introduces no cascade layers or native nesting requirement. Existing modern features still have their own browser requirements, and this is not a claim of Internet Explorer support. CSS compilation targets Chrome/Firefox 90 and Safari 14 syntax where esbuild supports a transformation; it cannot polyfill every CSS property or the app’s JavaScript APIs.

Use `npm run watch` while editing source files and serving the repository root. It updates root `styles.css` and `assets/` for local preview; run a full `npm run build` to refresh `dist/`. Run `npm run format:css` to format the source and `npm run check:css` to check formatting. Generated root bundles are included for direct HTTP previews; `dist/` and `node_modules/` are ignored.

## Landing page and exam workspaces

Visitors first choose **Midterm** or **Final exam**. Midterm opens **Study guide**, followed by **Practice & exams** in its navigation; all existing questions, reports, legal feedback, history and exam behavior belong to Midterm. **Choose exam** returns to the entry screen. Final currently shows “Final exam material is not available yet.” It contains no questions, scores or study material. Future final-exam data must use separate progress namespaces; existing storage keys remain Midterm keys to preserve saved history.

`landing.js` renders the immediately usable cards and a dimensional SVG scales illustration. The optional `visuals/landing-scene.js` uses Three.js, bundled locally into `assets/landing-scene.js` with its license notices. It adds copper scales, restrained particles, perspective and slow movement. No graphics CDN or external model is needed. A failed load or missing WebGL2 keeps the SVG; reduced-motion and data-saving preferences skip the 3D download. The scene caps pixel ratio and frame rate, pauses when hidden/offscreen, and disposes GPU resources when leaving. A motion button pauses the artwork. Copper transition effects are omitted for reduced motion. Device/browser limitations can still affect graphics; the cards remain usable independently.

Leaving a mock exam for exam selection or the guide uses the existing submit-or-cancel confirmation. A saved interrupted exam is finalized on startup before students access study notes. Unfinished practice remains resumable through Midterm → Practice & exams.

## Legal feedback
Feedback joins `question-feedback.json.feedback[question.id]` to the catalogue in `legal-authorities.json`. The same renderer supplies immediate practice feedback and final practice/mock-exam reviews. It does not fall back to historical slide references or unreviewed explanations in `questions.js`.

The current review includes 210 legally supported items, 13 explicitly labelled mnemonic items, and 7 pending items. A verified source record does not automatically verify a question. Pending items remain in the pool to preserve selection behavior, but show a neutral verification notice and a recorded answer key rather than an established legal explanation. Existing scores and saved progress are retained.

Reviewed statute text was consolidated to September 30, 2026; the source checks were performed October 20, 2026. See [LEGAL-REVIEW.md](LEGAL-REVIEW.md) for scope, outstanding checks and maintenance instructions. Alternate formats repeat concepts: 230 **question items** does not mean 230 independent concepts. The completion-labelled items use selectable answers, not typed input.

The ten former multi-select items keep their M001–M010 IDs and now accept one answer. Five use numbered statements and answer combinations; five use individually true choices, a partial combination, and “All of the above.” No “only” qualifier is added. “All of the above” stays last while the other choices shuffle; numbered statement references stay fixed while their answer combinations shuffle. Existing saved progress is retained.

The interface groups questions by legal topic rather than professor-specific chapter numbers. Existing internal group values and question IDs remain unchanged to preserve filtering and saved progress.

## Study Guide

Use **Study guide** beside **Practice & exams**. The five topic selectors use the same names as the dashboard: Sources of Police Powers, Arrest Powers, Location of Arrest & Feeney, Warrantless Search & Seizure, and Search With a Warrant. Expand individual note groups or all groups in a topic; legal-source links are under each group’s “Legislation & court decisions” disclosure. Arrow keys, Home and End operate the topic selectors.

The supplied guide provides the organization and recall prompts. `study-guide.js` maps 95 concept notes to the existing Q001A–Q095A records. `PPIQ_LEGAL.studyContent` applies the same source, answer-key and review-status checks used in answer feedback. Legal prose is reused from cleared records; the uploaded professor references, institution/course branding, historical exam date and 90-minute exam instructions are not published. The app’s mock exam remains 30 minutes. No new primary-source audit or status promotion is implied. Consent withdrawal, evidence continuity and completed-search re-entry remain neutral pending notices. The upload’s unsupported additional claims (including the unspecified Mercer reference and procedural teaching models) are not presented as verified law. Its standalone quiz is served through the app’s existing topic-practice flow rather than creating another graded question bank.

Each expandable section has a “Mark section reviewed” checkbox at its bottom. Topic tabs show green rings with `reviewed sections / actual sections × 100`: Sources 5, Arrest 7, Location/Feeney 4, Warrantless 8 and Warrant 8. The SVG ring uses the exact ratio, fills clockwise from 12 o’clock, and the label rounds to a whole percentage; all sections produce exactly 100% plus a checkmark. Unchecking reverses the ratio. Section identities use their mapped question IDs, so inserted/changed sections are not silently marked reviewed.

The selected topic and section checklist use `ppiq_guide_v1` schema 2. Old completed-topic flags migrate to all of that topic’s existing sections, preserving previous completion. Invalid/unknown sections are ignored. This is self-assessed reading progress: it never marks questions seen or changes scores or learning schedules. Reset saved progress also resets this checklist. Storage failure shows a warning and retains the checklist for the current visit. “Practice this topic” starts ten questions in that topic and confirms replacement of an unfinished practice session. Opening the guide from practice saves the session so it can be resumed from the dashboard. Opening it during an exam requires confirmation to submit first; cancelling keeps the exam active. Guide text and legal links remain selectable for studying.

## Sessions, review and exam rules

Existing progress remains in `policePowersIQ_v1`. New keys are `ppiq_session_v1` (one unfinished session), `ppiq_learning_v1` (answer history and review schedule), and `ppiq_reports_v1` (reports saved on this device). Appearance uses `ppiq_theme` independently. A grading receipt prevents a recovered submission from increasing session totals twice. Question IDs and the underlying answer keys are retained.

The mock exam has a fixed 30-minute deadline and cannot be paused or resumed. Expiry submits all saved answers. Leaving for the dashboard prompts the student to submit or cancel. Hiding the exam tab (including tab switching or minimizing), reloading, navigating away or closing the page ends the attempt. A browser-controlled `beforeunload` warning is requested while the exam is active; cancelling it keeps the attempt running with the same deadline. Browsers control its generic wording and may omit it, especially on mobile; tab switches submit immediately without a prompt. These rules appear before starting and during the exam.

Exit handlers save a submission journal and grade locally. If the browser process dies before those handlers run, a saved active exam is finalized on the next visit, even if time remains. Returning students see the submitted results rather than a Resume button. Recovery uses grading receipts to avoid duplicate scores and learning history. Unanswered questions receive zero marks. A new attempt can be started after submission.

During an active exam, question text selection, copying/cutting, dragging and the context menu are discouraged. Keyboard navigation and answer activation still work. Practice and final answer reviews allow normal selection/copying. Question reporting is available after the exam so report previews/downloads do not export question text during the attempt.

These are browser-side study deterrents, not proctoring or a secure examination system. They do not prevent screenshots, another device, modified browser code/storage, or all application switches (the browser must report that the page is hidden). Device locking and interruptions can also end an attempt. Local storage must work to recover after closing; the app displays storage failures. Browser prompts and mobile lifecycle behavior should also be checked on the intended student devices.

Practice sessions preserve the exact question and answer order. A changed question bank or invalid snapshot invalidates the unfinished session without deleting historical progress. Browser storage failures are shown explicitly. The app supports one unfinished session per browser; progress is local rather than synchronized between devices. Starting another practice session requires confirming that the unfinished one will be discarded. Saved exams are finalized before a new attempt can begin.

Topic accuracy counts answered, legally reviewed items recorded since this update. It does not invent old accuracy from seen-question counts, count unanswered exam items as learning attempts, or use unresolved legal claims to schedule learning. Practice answers are recorded when checked; exam answers are recorded when submitted. Each question is counted once per session, including after a refresh. Trends compare the newest five of the last ten recorded answers with the previous five, showing the change in percentage points.

A missed question returns after one day. The first correct answer also returns after one day; consecutive correct answers advance the interval to 3, 7, 14 and 30 days. These are study prompts, not a certified assessment of competence. Weak-topic recommendations combine overall accuracy with the last ten answers and show the sample size.

## Legal maintenance

The feedback displays its existing legal-review date; adding a UI feature does not renew that date or verify pending law. Selected-choice comparisons are bound to the exact question, options, key and reviewed explanation. If that basis changes, the comparison is withheld until updated. The seven unresolved question items remain pending.

Generate an offline queue:

```sh
python3 tools/check_legal_sources.py --output /tmp/legal-review-queue.json
```

To check external links and compare visible source text with an earlier observation:

```sh
python3 tools/check_legal_sources.py --check-links --previous /path/to/previous-report.json --output /tmp/legal-review-queue.json
```

Omit `--previous` for the first observed baseline. Reachability, changed-page hashes and review dates older than 90 days create **manual-review tasks**. Redirects must stay on the primary-source allowlist. A failed check preserves the last known hash for the next comparison. Neither this tool nor the workflow changes legal verification states, answer keys or review dates.

The included `.github/workflows/legal-source-review.yml` runs weekly or manually after it is pushed to the default branch and GitHub Actions is enabled. It saves a review artifact and caches the previous source hashes; it does not post issues or messages. This workflow has not been run on GitHub as part of the local integration. Page chrome can change a text hash; a human must distinguish that from a material legal amendment.

## Question reports

Students can report wording, answer/explanation issues, legal sources or another concern from practice or answer reviews (including submitted exams). A preview precedes submission, local save and download. Netlify Forms submission sends only the reviewed report fields to the site owner’s configured form service. The UI accepts a successful HTTP response to the form POST, including Netlify’s direct HTTP 200 response. A redirect is not required. HTTP errors and network failures retain the save/download options. A live Netlify test is required after deployment to validate the provider configuration.

Individual reports and all saved reports download as readable UTF-8 `.txt` files for Notepad, TextEdit or Word. They include the question ID and wording, choices in question-bank order, issue category, student note, timestamps and delivery/local-review status. Downloading does not transmit the report. Internal browser storage remains compatible with existing saved reports. The owner’s legal-maintenance queue retains its JSON export. Local reports can also be marked resolved locally or removed from the dashboard. That local status does not mean the owner has resolved a legal issue. The owner must inspect reports and make reviewed repository changes; reports never alter grading or approve a legal claim automatically. Do not include personal information in a report.

## Local development and validation
After `npm ci` and `npm run build`, serve the repository over HTTP, for example with `python3 -m http.server 8000` (or serve `dist/` for a production preview). Opening `index.html` directly as a file does not provide the supported JSON-loading workflow.

Run `python3 tests/test_legal_feedback.py` with Python, Playwright and Chromium installed. Set `CHROMIUM_PATH` if Chromium is not on `PATH`. The suite starts its own temporary local HTTP server and isolated browser contexts; it does not alter user browser progress. It covers all 230 feedback records, all question types, shuffled answer mapping, exact-set grading, practice and exam review, existing progress, unresolved or missing mappings, failed fetches, escaped text and safe links. Also run `node --check app.js`, `node --check questions.js`, and `node --check legal-feedback.js`, and `node --check appearance.js`, `node --check study-tools.js`, and `node --check question-reports.js`, and `node --check study-guide.js`. Run `python3 tests/test_legal_maintenance.py` for the offline source-monitor tests. Theme checks also cover keyboard switching, persistence, unavailable storage, reduced motion, and responsive layouts.

## Privacy
Study progress, unfinished sessions and review history stay in the browser’s `localStorage` and are not synchronized between devices. Reports stay local unless the student chooses online submission or downloads and shares them. Online submission uses the site owner’s Netlify Forms service. Clearing site data removes local progress, unfinished sessions, review history and local reports; it does not remove reports already submitted to the owner.


## Enable online reports in Netlify

Open the `police-powers-iq` project → **Forms**, enable form detection if offered, then redeploy the production branch containing the static `question-report` form in `index.html`. Confirm **question-report** appears in Forms. Submit one clearly labelled test from the live site and verify it in Netlify’s submissions (including spam if necessary). Optionally configure a form notification to your own email.

If the form already exists, check submissions before resending: an unconfirmed-delivery message is not proof that nothing arrived. Inspect the live request/response if it appears in Netlify but the app still reports an error. The owner’s Netlify screenshots confirm form detection is enabled and a test report was received. The old client incorrectly required a redirect and therefore displayed a failure despite receipt. This update accepts Netlify’s direct successful HTTP response. Direct site inspection remains blocked by the development network policy; browser tests simulate provider responses.
