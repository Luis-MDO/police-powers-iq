/* Browser-only study tools. No account, external requests, or automatic report submission. */
(() => {
  'use strict';
  const SESSION_KEY = 'ppiq_session_v1';
  const EXAM_MS = 30 * 60 * 1000;
  let storageError = false;
  function read(key, fallback = null) {
    try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
    catch (_) { storageError = true; return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (_) { storageError = true; return false; }
  }
  function remove(key) {
    try { localStorage.removeItem(key); return true; }
    catch (_) { storageError = true; return false; }
  }
  function fingerprint(questions) {
    const text = JSON.stringify(questions.map(q => [q.id, q.question, q.options, q.correct, q.statements || null]));
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    return (hash >>> 0).toString(16);
  }
  function sessionId() { return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
  function packSession(state, questions, phase = 'active') {
    return {
      schemaVersion: 1, bank: fingerprint(questions), phase, id: state.id,
      submissionReason: ['left','timeout','manual'].includes(state.submissionReason) ? state.submissionReason : null,
      mode: state.mode, count: state.count, chapter: state.chapter, at: state.at,
      started: state.started, deadline: state.mode === 'exam' ? state.deadline : null,
      savedAt: Date.now(), pool: state.pool.map(q => ({ id: q.id, order: q.optionOrder || q.shownOptions.map(option => q.options.indexOf(option)) })),
      answers: state.answers, checked: state.checked
    };
  }
  function loadSession(questions, data = read(SESSION_KEY)) {
    if (!data) return null;
    try {
      if (data.schemaVersion !== 1 || data.bank !== fingerprint(questions) ||
          !['active', 'submitting'].includes(data.phase) || typeof data.id !== 'string' ||
          !['practice', 'exam', 'mistakes', 'review', 'weak'].includes(data.mode) ||
          !Array.isArray(data.pool) || !data.pool.length || data.pool.length > questions.length ||
          !Number.isInteger(data.at) || data.at < 0 || data.at >= data.pool.length ||
          !Number.isFinite(data.started) || data.started <= 0 || data.started > Date.now() + 60000 ||
          (data.mode === 'exam' && (!Number.isFinite(data.deadline) || data.deadline !== data.started + EXAM_MS))) throw Error('Invalid session');
      const bank = new Map(questions.map(q => [q.id, q]));
      const ids = new Set();
      const answers = {}, checked = {};
      const pool = data.pool.map(item => {
        const q = bank.get(item.id), order = item.order;
        if (!q || ids.has(q.id) || !Array.isArray(order) || order.length !== q.options.length ||
            new Set(order).size !== order.length || !order.every(i => Number.isInteger(i) && i >= 0 && i < q.options.length)) throw Error('Invalid question order');
        ids.add(q.id);
        const selected = data.answers?.[q.id] || [];
        if (!Array.isArray(selected) || selected.length > 1 || !selected.every(i => Number.isInteger(i) && i >= 0 && i < order.length)) throw Error('Invalid answer');
        if (selected.length) answers[q.id] = selected;
        if (data.mode !== 'exam' && data.checked?.[q.id] === true && selected.length === 1) checked[q.id] = true;
        return { ...q, optionOrder: order, shownOptions: order.map(i => q.options[i]), shownCorrect: q.correct.map(i => order.indexOf(i)).sort((a,b) => a-b) };
      });
      return { ...data, pool, answers, checked, final: false,
        submissionReason: data.phase === 'submitting' && ['left','timeout','manual'].includes(data.submissionReason) ? data.submissionReason : null };
    } catch (_) {
      remove(SESSION_KEY);
      return null;
    }
  }
  const LEARNING_KEY = 'ppiq_learning_v1';
  const DAY_MS = 86400000;
  let learningMemory = null;
  function learning() {
    const stored = read(LEARNING_KEY);
    const value = learningMemory || stored;
    if (!value || value.schemaVersion !== 1 || !value.questions || typeof value.questions !== 'object' || Array.isArray(value.questions)) return {schemaVersion:1, questions:{}};
    return value;
  }
  function recordAnswer(question, correct, id, now = Date.now()) {
    if (!id || !window.PPIQ_LEGAL.isReviewed(question)) return;
    const data = learning();
    const old = data.questions[question.id];
    if (old?.lastSessionId === id) return;
    const previous = old && Number.isInteger(old.attempts) && old.attempts >= 0 && Number.isInteger(old.correct) && old.correct >= 0 && old.correct <= old.attempts ? old : {attempts:0,correct:0,streak:0,history:[]};
    const streak = correct ? Math.min(5, Math.max(0, previous.streak || 0) + 1) : 0;
    const days = correct ? [1,1,3,7,14,30][streak] : 1;
    const history = Array.isArray(previous.history) ? previous.history.filter(h => typeof h.ok === 'boolean' && Number.isFinite(h.at)) : [];
    data.questions[question.id] = {
      attempts:previous.attempts+1, correct:previous.correct+(correct?1:0), streak,
      dueAt:now+days*DAY_MS, lastAnswered:now, lastSessionId:id,
      history:[...history,{ok:!!correct,at:now}].slice(-20)
    };
    learningMemory=data;write(LEARNING_KEY,data);
  }
  function dueQuestions(questions, now = Date.now()) {
    const records=learning().questions;
    return questions.filter(q => window.PPIQ_LEGAL.isReviewed(q) && Number.isFinite(records[q.id]?.dueAt) && records[q.id].dueAt <= now)
      .sort((a,b)=>records[a.id].dueAt-records[b.id].dueAt);
  }
  function nextReview(questions) {
    const records=learning().questions;
    const dates=questions.filter(q=>window.PPIQ_LEGAL.isReviewed(q)).map(q=>records[q.id]?.dueAt).filter(Number.isFinite);
    return dates.length ? Math.min(...dates) : null;
  }
  function topicStats(questions, topics) {
    const records=learning().questions;
    return Object.entries(topics).map(([id,name])=>{
      const rows=questions.filter(q=>String(q.chapter)===id && window.PPIQ_LEGAL.isReviewed(q)).map(q=>records[q.id]).filter(r=>r && Number.isInteger(r.attempts) && Number.isInteger(r.correct) && r.attempts >= r.correct && r.correct >= 0);
      const attempts=rows.reduce((n,r)=>n+r.attempts,0),correct=rows.reduce((n,r)=>n+r.correct,0);
      const recent=rows.flatMap(r=>Array.isArray(r.history)?r.history:[]).filter(h=>typeof h.ok==='boolean'&&Number.isFinite(h.at)).sort((a,b)=>a.at-b.at).slice(-10);
      const recentAccuracy=recent.length?Math.round(recent.filter(h=>h.ok).length/recent.length*100):null;
      const delta=recent.length===10 ? (recent.slice(5).filter(h=>h.ok).length-recent.slice(0,5).filter(h=>h.ok).length)*20 : null;
      return {id,name,attempts,correct,accuracy:attempts?Math.round(correct/attempts*100):null,recentAccuracy,delta};
    });
  }
  function weakestTopic(questions, topics) {
    return topicStats(questions,topics).filter(t=>t.attempts>0).sort((a,b)=>((a.accuracy+(a.recentAccuracy??a.accuracy))/2)-((b.accuracy+(b.recentAccuracy??b.accuracy))/2)||a.attempts-b.attempts)[0] || null;
  }
  function weakQuestions(questions, topics) {
    const weak=weakestTopic(questions,topics);
    if(!weak)return [];
    const records=learning().questions;
    return questions.filter(q=>String(q.chapter)===weak.id && window.PPIQ_LEGAL.isReviewed(q)).sort((a,b)=>{
      const score=q=>{const r=records[q.id];return !r?1:(Array.isArray(r.history)?r.history.at(-1)?.ok:null)===false?0:2};
      return score(a)-score(b)||(records[a.id]?.lastAnswered||0)-(records[b.id]?.lastAnswered||0);
    });
  }
  function resetLearning(){learningMemory=null;remove(LEARNING_KEY)}

  window.PPIQ_STUDY = {
    EXAM_MS, SESSION_KEY, LEARNING_KEY, read, write, remove, sessionId, packSession, loadSession,
    recordAnswer, dueQuestions, nextReview, topicStats, weakestTopic, weakQuestions, resetLearning,
    get storageError() { return storageError; }
  };
})();
