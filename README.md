# Police PowersIQ

Interactive PFP-207 police powers midterm study app. Built as a static website so it can deploy directly from GitHub to Netlify without a build command.

## Features
- Legally referenced question bank with 230 practice items (including alternate-format testing of some of the same concepts)
- 10, 15, 20, 25 or 30 question rounds; unseen questions first
- Mixed single-choice, true/false, select-all and completion-style questions
- Immediate answer checking and short explanations
- 40-question, 90-minute mock exam
- Chapter filtering, review of mistakes, persistent progress using `localStorage`
- Mobile-friendly interface

## Deploy
1. Upload `index.html`, `styles.css`, `app.js`, `questions.js` to your GitHub repository root.
2. In Netlify, connect the GitHub repository if not connected already.
3. Build command: **leave blank**. Publish directory: **`.`** (repository root).
4. Trigger deploy. Since it is a static app, no API keys or environment variables are needed.

## Academic note
The original practice bank was drafted using Police Powers course topics for Chapters 1, 2, 3, 7, and 8. Alternate formats test some of the same core concepts: 230 **question items** is not 230 independent concepts. The materials may simplify legal details. This app is a study resource, not operational legal advice. Do not upload or redistribute the copyrighted lecture files with the published website.

## Privacy
Study progress is saved only to the browser's `localStorage`. It is not synchronized between devices. Clearing site data resets it.

## Legal feedback integration
- `legal-data.js` is loaded between `questions.js` and `app.js`; it contains the question-ID mapping and legal authority directory so the static app works even when opened locally.
- `question-feedback.json` and `legal-authorities.json` are human-readable source data for auditing/editing, and must be kept in sync with `legal-data.js`.
- Feedback shows a clickable **View legal source** link for mapped authorities, in both guided practice and final answer review.
- Some educational concepts have no single applicable statute or controlling case. Those show **No verified direct source is available** rather than an invented citation.
- **Legal review remains necessary:** 115 originally flagged entries require checking, and case registry links are not always full-text judgments. The app does not certify legal advice or guarantee all explanations reflect the most recent case law.

For Netlify upload the entire repository root, including `legal-data.js`. The JSON files may also be included for maintainability.
