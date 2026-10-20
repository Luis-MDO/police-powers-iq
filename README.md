# Police PowersIQ

Interactive PFP-207 police powers midterm study app. Built as a static website so it can deploy directly from GitHub to Netlify without a build command.

## Features
- Source-referenced question bank with 230 practice items (including alternate-format testing of some of the same concepts)
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
All correct answers are designed around the user's course presentations for Chapters 1, 2, 3, 7, 8 and the midterm review. Alternate formats test some of the same core concepts: 230 **question items** is not 230 independent concepts. The materials may simplify legal details. This app is a study resource, not operational legal advice. Do not upload or redistribute the copyrighted lecture files with the published website.

## Privacy
Study progress is saved only to the browser's `localStorage`. It is not synchronized between devices. Clearing site data resets it.
