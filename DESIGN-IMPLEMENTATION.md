# Landing page, Midterm workspace and section progress

Implementation report for the exam-choice landing page, Midterm workspace and section review progress.

- Exam-choice landing page with a full-viewport animated background: copper 3D scales, orbiting rings, drifting particles and light, plus a short portal transition. Content and controls stay above the scene; a pause control stops both 3D and CSS motion. Three.js is optional and locally bundled; a dimensional SVG is always available as fallback.
- Midterm opens Study guide first, with Practice & exams second. Existing study material and stored scores remain Midterm data.
- Final exam opens an explicit availability message and a route back. No final questions or progress are fabricated.
- Every expandable guide section has a review checkbox. Actual topic denominators are 8, 7, 4, 8 and 8 (Sources gained three Charter sections on October 21, 2026). Rings use exact ratios clockwise from 12 o’clock, rounded labels and a checkmark at 100%.
- Section completion persists independently of quiz scores; legacy completed topics migrate to their current sections. Unknown section IDs are ignored. Added sections start unreviewed.
- Guide actions have clearer copper borders and text in both themes; completed sections use theme-specific readable green.
- CSS is maintained in readable component/view files and built into one stylesheet. No runtime CSS imports, Sass, native nesting or cascade-layer migration is introduced.
- Netlify now builds with `npm run build` and publishes `dist/`. Manual uploads use the contents of `dist/`; existing Netlify dashboard overrides must match.
- The legal source review panel and its export control are omitted from the public dashboard. Maintenance data and per-question legal review safeguards remain available internally.
- Question IDs, question-bank content, grading keys, source catalogue and review statuses are unchanged.

The optional scene is tested separately with Chromium software WebGL; browser integration tests exercise the missing-asset fallback and reduced-motion paths. Production Netlify deployment and real older devices are not tested in this local change. See README.md for build commands, source ownership and behavior.

## Local validation

- All 52 existing Chromium integration tests passed after adapting navigation expectations to the landing page.
- Five new integration scenarios passed (with targeted reruns after small fixes): landing/Midterm/Final navigation and one CSS request, all topic denominators and completion/unchecking, legacy checklist migration/reset, exam-selection submission protection, and reduced-motion/keyboard/responsive fallback.
- Five offline legal-maintenance tests passed.
- CSS formatting, bundle build, JavaScript syntax and Git whitespace checks passed.
- Actual optional 3D rendered in Chromium with software WebGL without JavaScript errors. Desktop/mobile screenshots were inspected in both themes.

Validation covers the local build. Production deployment has not been verified.

## Full-page background update

Four focused browser checks passed for navigation, responsive/reduced-motion behavior, the hidden maintenance panel, and report layouts. A separate Chromium WebGL check confirmed visible movement, stable paused rendering after control transitions, resume, and scene cleanup on navigation. Desktop and mobile screenshots were inspected; build, syntax, CSS formatting and whitespace checks passed. Production deployment of this update has not been verified.

## Book and scales landing update

- Replaces the hall/tesseract scene. On tablet and desktop, the first visit of each page load plays an opening: a leather book opens, pages turn, golden light and sparks rise, and gold scales with chains appear. Page content then flies in from several directions. Afterwards the scales sway slightly, a page occasionally lifts, the light pulses, candles and bokeh stay in motion, and short legal facts rise out of the light and float towards the viewer. Any input or Skip intro jumps ahead. A pointer, scroll and theme-aware camera remains.
- Phones (under 768 px): a still SVG poster of the book, light and scales with CSS-only motion; no WebGL download.
- Floating facts: 16 two-line captions (source title plus plain-language summary) for Charter ss. 7, 8, 9, 10(b) and 24(2), Criminal Code ss. 494, 495, 487, 489 and 529.3, RICE (labelled study mnemonic) and five SCC decisions. Four lanes keep them apart and clear of the headline. The landing page has no separate facts section.
- Study guide: a "Key sources at a glance" quick reference (Charter, Criminal Code, RICE, key SCC decisions) below the topic notes, built from the existing guide card styles. It is outside the reading checklist: no checkboxes, unchanged 5/7/4/8/8 denominators, links resolved from catalogue IDs.
- Charter coverage: 40 new items (Q096–Q115, A and B) for ss. 10(a)–(c), 11(a)–(i) and memory cues for ss. 7–14, in topic practice, the mock-exam pool and three new Sources guide sections. Landing and dashboard counts are derived from the bank (now 270).
- Existing question IDs, answer keys, grading, randomization, storage keys, the Netlify form and legal-review safeguards are unchanged. No existing review status changed.
- Checked locally in Chromium at 1440×900 and 375×812 in both themes: opening sequence, fly-in, skip, floating facts, no horizontal overflow, navigation cleanup, no console errors. Full Playwright browser suite (61 tests, including the new intro, study-guide reference and Charter coverage tests) and the 5 maintenance tests passed on Windows with Playwright-bundled Chromium (run with PYTHONUTF8=1). Real tablets/phones and production Netlify are untested.
