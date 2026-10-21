# Learning tools integration review

Validation was performed locally. Deployment and live-service checks are listed below; browser tests do not establish that those services are configured.

| Improvement | Implemented behavior |
| --- | --- |
| 1. Save and resume | Practice question/answer order, selections, checked state and position survive reloads. The dashboard offers Resume for practice. Mock exams end on leaving. Starting over requires confirmation. Grading receipts prevent duplicate scoring during submission recovery. |
| 2. Explain wrong choices | 223 reviewed records have selected-choice comparisons in immediate practice feedback and final reviews. These are derived from the existing reviewed explanations and bound to their question, options and key. The seven unresolved records remain pending and have no substantive comparison. |
| 3. Spaced review | Review dates use 1-, 3-, 7-, 14- and 30-day intervals. Missed questions return after one day. Only legally reviewed answered items enter the schedule. |
| 4. Topic strengths and weaknesses | Per-topic accuracy, answer counts and recent trends; targeted practice prioritizes missed questions within the weakest recorded topic. Prior progress is preserved; historical accuracy is not invented. |
| 5. Question reports | A preview precedes online submission, local save or download. Local queue supports export and local resolution status. Netlify Forms is the optional receiving service. |
| 6. Legal maintenance | Existing review dates appear in feedback. Dashboard and command-line queues flag unresolved questions, aging reviews and source issues. An optional weekly GitHub workflow detects failed links or changed source text and saves a review artifact. It never approves law or changes review dates. |
| 7. Mock-exam instructions | Before starting: question count, duration, one-choice rule, marking, unanswered-item treatment, answer changes, storage and expiry behavior. Submission is available from any question. |

## Requested timer change

The mock exam is **40 questions in 30 minutes** with a fixed deadline. At expiry or when leaving, saved answers submit automatically and unanswered items receive zero marks. Dashboard exit asks for confirmation. Browser navigation requests the native leave-page warning; cancelling keeps the timer running. Hiding the tab submits immediately. If exit events are missed, a saved exam is finalized on the next visit, even before its deadline. Results restore without duplicate scoring. Practice remains resumable.

Active exam questions discourage selection, copy/cut, context menus and dragging. Keyboard controls remain available, and normal copying returns in practice and reviews. Reports are available after exam submission. This does not provide secure proctoring: screenshots, other devices, storage tampering and browser lifecycle limitations remain. See README.md for the precise browser behavior and device-testing limits.

## Validation

- 51 Chromium integration tests passed in the latest full run, including all 230 question records, shuffled answer mapping, legal feedback guards, wrong-choice comparisons, practice resume, deadline expiry, cancelled/confirmed native leave warnings, navigation back, actual tab close/reopen, simulated hidden-tab events, missed exit recovery, keyboard/copy behavior, submission recovery, storage failures, review scheduling, topic targeting, report preview/export and mocked online delivery.
- Five offline maintenance tests passed: successful HTTP responses cannot approve pending law, source text changes affect linked questions, failed checks preserve previous hashes, overdue dates are queued, and unsafe URLs are not fetched.
- JavaScript syntax and Git whitespace checks passed.
- Responsive layouts checked at 320, 375, 768 and 1280 pixels, with both themes and reduced-motion coverage. Mobile and desktop screenshots reviewed, including the new guide in light and dark themes. Hidden-tab transitions are simulated in headless tests; real mobile/browser interruption behavior remains a device-level check.
- Question IDs, answer keys and the source catalogue were not changed.

## Checks requiring deployment or external services

1. Enable Netlify Forms/form detection and redeploy the hidden `question-report` form. Confirm the form appears in the owner's Netlify dashboard. Submit a previewed test report and verify receipt there. Browser tests simulate the service contract; no real report was sent during local development. A plain static HTTP 200 is not treated as a confirmed receipt.
2. The weekly monitor starts only after its workflow is pushed to the default branch and GitHub Actions is enabled. Its local audit produced eight manual-review tasks with external link checks explicitly unrun. The five maintenance tests use simulated source responses; they are not a fresh legal currency audit.
3. Seven question items remain pending legal verification. No source or question was promoted merely because a feature or test was added. Existing review dates are unchanged.

See README.md for deployment files, local storage keys, review intervals and maintenance commands.


## Study Guide addition

A separate Study Guide view now offers the five dashboard topic names, 32 expandable groups with 95 mapped notes, linked primary sources, recall prompts and topic practice. The selected topic and five self-marked review flags persist under `ppiq_guide_v1`, independently of scored learning. The uploaded course-specific outline is adapted to the app’s existing legally reviewed feedback; three unresolved concepts stay visibly pending. No new legal audit or status promotion was performed.

Practice can be saved while reading. An active mock exam must be submitted before opening the guide; cancelling the confirmation preserves the exam and deadline. The main navigation, topic selectors and disclosures support keyboard access and both themes at mobile and desktop widths. The upload’s class date and 90-minute paper-exam schedule are excluded.
