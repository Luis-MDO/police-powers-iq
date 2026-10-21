(() => {
  'use strict';

  const allowedHosts = new Set([
    'laws-lois.justice.gc.ca',
    'decisions.scc-csc.ca',
    'scc-csc.lexum.com',
    'www.scc-csc.ca',
    'www.rcmp-grc.gc.ca'
  ]);
  const warned = new Set();
  let authorities = null;
  let feedback = null;

  function warn(message) {
    if (!warned.has(message)) {
      warned.add(message);
      console.warn('[Legal feedback] ' + message);
    }
  }

  function escape(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function safeUrl(value) {
    if (typeof value !== 'string') return null;
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname) ||
          url.username || url.password || (url.port && url.port !== '443')) return null;
      return url.href;
    } catch {
      return null;
    }
  }

  function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function matchingKey(record, question) {
    const key = record.correctOptionIndices;
    return Array.isArray(key) && key.length > 0 &&
      new Set(key).size === key.length &&
      key.every(index => Number.isInteger(index) && index >= 0 && index < question.options.length) &&
      JSON.stringify([...key].sort((a, b) => a - b)) ===
      JSON.stringify([...question.correct].sort((a, b) => a - b));
  }

  function lookup(question) {
    const pending = { reviewed: false, studyAid: false, sources: [], record: null };
    if (!feedback || !Object.hasOwn(feedback, question.id)) {
      warn('Missing mapping for ' + question.id);
      return pending;
    }
    const record = feedback[question.id];
    if (!isObject(record) || record.questionId !== question.id ||
        !matchingKey(record, question) || !Array.isArray(record.authorityIds) ||
        typeof record.explanation !== 'string' || !record.explanation.trim()) {
      warn('Invalid mapping or answer-key mismatch for ' + question.id);
      return pending;
    }
    let complete = record.authorityIds.length > 0;
    const sources = [];
    for (const id of new Set(record.authorityIds)) {
      const source = typeof id === 'string' && authorities && Object.hasOwn(authorities, id)
        ? authorities[id] : null;
      const url = source && safeUrl(source.url);
      if (!isObject(source) || typeof source.title !== 'string' || !source.title.trim() || !url) {
        complete = false;
        warn('Missing or unsafe authority for ' + question.id + ': ' + String(id));
        continue;
      }
      if (source.verificationStatus !== 'verified') complete = false;
      sources.push({ title: source.title, url, reviewedOn: source.reviewedOn });
    }
    const studyAid = record.reviewStatus === 'study_aid';
    const reviewed = complete && (record.reviewStatus === 'verified' || studyAid);
    return { record, sources, reviewed, studyAid: reviewed && studyAid };
  }

  function selectedChoiceFeedback(question, selected, info) {
    if (!info.reviewed || selected.length !== 1 || question.shownCorrect.includes(selected[0])) return '';
    const data = info.record.optionFeedback;
    if (!isObject(data) || data.question !== question.question ||
        JSON.stringify(data.options) !== JSON.stringify(question.options) ||
        JSON.stringify(data.key) !== JSON.stringify(question.correct) ||
        data.basisExplanation !== info.record.explanation || !isObject(data.notes)) return '';
    const shown = selected[0];
    const original = question.optionOrder?.[shown] ?? question.options.indexOf(question.shownOptions[shown]);
    if (question.options[original] !== question.shownOptions[shown]) return '';
    const note = data.notes[String(original)];
    return typeof note === 'string' && note.trim()
      ? `<div class="choice-feedback"><b>Why this choice does not earn the mark</b><p>${escape(note)}</p></div>` : '';
  }

  function validDate(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value ? value : null;
  }
  function reviewMetadata(question) {
    const info=lookup(question);
    const dates=[info.record?.reviewedOn,...info.sources.map(s=>s.reviewedOn)].map(validDate);
    const reviewedOn=info.reviewed && dates.length && dates.every(Boolean) ? dates.sort()[0] : null;
    return {
      questionId:question.id, status:info.reviewed?(info.studyAid?'study_aid':'verified'):'needs_review',
      reviewedOn, dueReview:!reviewedOn || Date.now()-Date.parse(reviewedOn)>90*86400000,
      reason:info.reviewed ? (!reviewedOn?'Review date missing':null) :
        (typeof info.record?.reviewNote==='string'?info.record.reviewNote:'Primary support, data validity or source verification needs review.')
    };
  }
  function sourceCatalogue() {
    return authorities ? Object.entries(authorities).map(([id,s])=>({
      id,title:typeof s?.title==='string'?s.title:id,url:safeUrl(s?.url),
      verified:s?.verificationStatus==='verified',reviewedOn:validDate(s?.reviewedOn)
    })) : [];
  }

  // Study notes reuse the same review gate as answer feedback; uploads cannot
  // supply an explanation or promote a pending mapping through this interface.
  function studyContent(question) {
    const info = lookup(question), metadata = reviewMetadata(question);
    return {
      reviewed: info.reviewed, studyAid: info.studyAid,
      explanation: info.reviewed ? info.record.explanation : null,
      pinpoint: info.reviewed ? info.record.pinpoint || '' : '',
      sources: info.sources, reviewedOn: metadata.reviewedOn
    };
  }

  function render(question, selected) {
    const info = lookup(question);
    // Grading uses the application's existing displayed-option mapping, never the JSON indices.
    const options = question.shownOptions;
    const answer = selected.length ? selected.map(index => escape(options[index])).join(' · ') : 'Not answered';
    const correct = question.shownCorrect.map(index => escape(options[index])).join(' · ');
    const label = info.reviewed ? 'Correct answer' : 'Recorded answer key (pending legal verification)';
    const matchesKey = JSON.stringify([...selected].sort((a, b) => a - b)) ===
      JSON.stringify([...question.shownCorrect].sort((a, b) => a - b));
    const answers = matchesKey ? '' : `<p><b>Your answer:</b> ${answer}</p><p><b>${label}:</b> ${correct}</p>`;
    const explanation = info.reviewed
      ? `${info.studyAid ? '<div class="legal-status">Study mnemonic · not statutory wording</div>' : ''}<p class="legal-explanation">${escape(info.record.explanation)}</p>`
      : '<div class="legal-status pending">Pending legal verification</div><p class="legal-pending-note">This question’s legal explanation has not been cleared for display. Scores use the recorded answer key for study tracking; do not treat a matching answer as a verified statement of law.</p>';
    const title = info.reviewed ? 'Legal authority' : 'Related sources — legal support pending review';
    const links = info.sources.length
      ? `<div class="meta legal-authorities"><b>${title}</b><ul>${info.sources.map(source => `<li><span>${escape(source.title)}</span> · <a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">View legal source</a></li>`).join('')}</ul>${info.reviewed && info.record.pinpoint ? `<div>${escape(info.record.pinpoint)}</div>` : ''}</div>`
      : '<div class="meta legal-authorities">Legal source pending review</div>';
    const metadata=reviewMetadata(question);
    const date=metadata.reviewedOn ? `<p class="legal-reviewed-date">Last legally reviewed: <time datetime="${metadata.reviewedOn}">${metadata.reviewedOn}</time>${metadata.dueReview?' · Scheduled for re-review':''}. Review dates do not guarantee that the law has remained unchanged.</p>` : '';
    return answers + selectedChoiceFeedback(question, selected, info) + explanation + links + date;
  }

  const ready = Promise.all([
    fetch('legal-authorities.json').then(response => {
      if (!response.ok) throw new Error('Authority catalogue unavailable');
      return response.json();
    }),
    fetch('question-feedback.json').then(response => {
      if (!response.ok) throw new Error('Question feedback unavailable');
      return response.json();
    })
  ]).then(([catalogue, records]) => {
    if (!isObject(catalogue) || !isObject(records) || catalogue.schemaVersion !== 1 ||
        records.schemaVersion !== 1 || !isObject(catalogue.authorities) || !isObject(records.feedback)) {
      throw new Error('Unsupported legal-feedback format');
    }
    authorities = catalogue.authorities;
    feedback = records.feedback;
    return true;
  }).catch(error => {
    warn(error.message);
    return false;
  });

  window.PPIQ_LEGAL = {
    ready,
    render,
    safeUrl,
    reviewMetadata,
    sourceCatalogue,
    studyContent,
    isReviewed: question => lookup(question).reviewed,
    isStudyAid: question => lookup(question).studyAid
  };
})();
