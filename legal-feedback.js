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
      sources.push({ title: source.title, url });
    }
    const studyAid = record.reviewStatus === 'study_aid';
    const reviewed = complete && (record.reviewStatus === 'verified' || studyAid);
    return { record, sources, reviewed, studyAid: reviewed && studyAid };
  }

  function render(question, selected) {
    const info = lookup(question);
    // Grading uses the application's existing displayed-option mapping, never the JSON indices.
    const options = question.shownOptions;
    const answer = selected.length ? selected.map(index => escape(options[index])).join(' · ') : 'Not answered';
    const correct = question.shownCorrect.map(index => escape(options[index])).join(' · ');
    const label = info.reviewed ? 'Correct answer' : 'Recorded answer key (pending legal verification)';
    const answers = `<p><b>Your answer:</b> ${answer}</p><p><b>${label}:</b> ${correct}</p>`;
    const explanation = info.reviewed
      ? `${info.studyAid ? '<div class="legal-status">Study mnemonic · not statutory wording</div>' : ''}<p class="legal-explanation">${escape(info.record.explanation)}</p>`
      : '<div class="legal-status pending">Pending legal verification</div><p class="legal-pending-note">This question’s legal explanation has not been cleared for display. The recorded answer key is shown for study tracking; do not treat it as a verified statement of law.</p>';
    const title = info.reviewed ? 'Legal authority' : 'Related sources — legal support pending review';
    const links = info.sources.length
      ? `<div class="meta legal-authorities"><b>${title}</b><ul>${info.sources.map(source => `<li><span>${escape(source.title)}</span> · <a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">View legal source</a></li>`).join('')}</ul>${info.reviewed && info.record.pinpoint ? `<div>${escape(info.record.pinpoint)}</div>` : ''}</div>`
      : '<div class="meta legal-authorities">Legal source pending review</div>';
    return answers + explanation + links;
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
    isReviewed: question => lookup(question).reviewed,
    isStudyAid: question => lookup(question).studyAid
  };
})();
