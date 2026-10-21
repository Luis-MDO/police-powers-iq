# Landing page, Midterm workspace and section progress

Implementation report for the exam-choice landing page, Midterm workspace and section review progress.

- Exam-choice landing page with copper 3D scales, gentle particles and a short portal transition. Three.js is optional and locally bundled; a dimensional SVG is always available as fallback.
- Midterm opens Study guide first, with Practice & exams second. Existing study material and stored scores remain Midterm data.
- Final exam opens an explicit availability message and a route back. No final questions or progress are fabricated.
- Every expandable guide section has a review checkbox. Actual topic denominators are 5, 7, 4, 8 and 8. Rings use exact ratios clockwise from 12 o’clock, rounded labels and a checkmark at 100%.
- Section completion persists independently of quiz scores; legacy completed topics migrate to their current sections. Unknown section IDs are ignored. Added sections start unreviewed.
- Guide actions have clearer copper borders and text in both themes; completed sections use theme-specific readable green.
- CSS is maintained in readable component/view files and built into one stylesheet. No runtime CSS imports, Sass, native nesting or cascade-layer migration is introduced.
- Netlify now builds with `npm run build` and publishes `dist/`. Manual uploads use the contents of `dist/`; existing Netlify dashboard overrides must match.
- Question IDs, question-bank content, grading keys, source catalogue and review statuses are unchanged.

The optional scene is tested separately with Chromium software WebGL; browser integration tests exercise the missing-asset fallback and reduced-motion paths. Production Netlify deployment and real older devices are not tested in this local change. See README.md for build commands, source ownership and behavior.

## Local validation

- All 52 existing Chromium integration tests passed after adapting navigation expectations to the landing page.
- Five new integration scenarios passed (with targeted reruns after small fixes): landing/Midterm/Final navigation and one CSS request, all topic denominators and completion/unchecking, legacy checklist migration/reset, exam-selection submission protection, and reduced-motion/keyboard/responsive fallback.
- Five offline legal-maintenance tests passed.
- CSS formatting, bundle build, JavaScript syntax and Git whitespace checks passed.
- Actual optional 3D rendered in Chromium with software WebGL without JavaScript errors. Desktop/mobile screenshots were inspected in both themes.

Validation covers the local build. Production deployment has not been verified.
