(()=>{'use strict';
const study=window.PPIQ_STUDY;
const ALL=window.PPIQ_QUESTIONS||[],KEY='policePowersIQ_v1',CH={1:'Sources of Police Powers',2:'Arrest Powers',3:'Location of Arrest & Feeney',7:'Warrantless Search & Seizure',8:'Search With a Warrant'};const root=document.getElementById('root');let s={count:10,chapter:'all',mode:'practice',difficulty:'mixed',pool:[],at:0,answers:{},checked:{},started:0,final:false};let progress=load();let timer=null;let restoredSession=study.loadSession(ALL);let savedSession=restoredSession?study.packSession(restoredSession,ALL,restoredSession.phase):null;let savingFailed=false;let disposeLanding=null;function load(){try{const v=JSON.parse(localStorage.getItem(KEY)||'{}');return {seen:v.seen||[],wrong:v.wrong||[],correct:v.correct||[],attempts:v.attempts||0,scoreSum:v.scoreSum||0,...(Array.isArray(v.completedSessions)?{completedSessions:v.completedSessions}: {})}}catch{return {seen:[],wrong:[],correct:[],attempts:0,scoreSum:0}}}

function save(){return study.write(KEY,progress)}

function shuffle(a){return [...a].sort(()=>Math.random()-.5)}

function html(t){return String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function mark(q,ok){return window.PPIQ_LEGAL.isReviewed(q)?(window.PPIQ_LEGAL.isStudyAid(q)?(ok?'Matches study key':'Does not match study key'):(ok?'Correct answer':'Incorrect answer')):(ok?'Matches recorded key · legal review pending':'Does not match recorded key · legal review pending')}

function number(id){return Number(document.getElementById(id)?.value)}

function setRoot(v,view='training'){
  if(disposeLanding){disposeLanding();disposeLanding=null}
  root.innerHTML=v;root.dataset.view=view;root.classList.toggle('exam-active',!!activeExam());
  const workspace=view==='guide'||view==='training';
  document.getElementById('studyNav').hidden=!workspace;
  document.getElementById('chooseExamBtn').hidden=view==='landing';
  const home=document.getElementById('homeBtn');home.hidden=view!=='training'||!root.querySelector('.question-area,.result-list');
  for(const [id,section] of [['trainingTab','training'],['studyGuideTab','guide']]){
    const button=document.getElementById(id);
    if(section===view)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
  }
}
function focusHeading(){const heading=root.querySelector('h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true})}}
function showLanding(){
  if(activeExam()){
    if(!confirm('Return to exam selection? Your mock exam will be submitted now and cannot be resumed. Choose Cancel to keep working.'))return;
    finish({reason:'left'});
  }else if(root.querySelector('.question-area')&&!s.final){persistSession()}
  setRoot('', 'landing');
  disposeLanding=window.PPIQ_LANDING.mount(root,{
    midterm:()=>window.PPIQ_LEGAL.ready.then(openStudyGuide),
    final:showFinal
  });
}
function showFinal(){
  setRoot(window.PPIQ_LANDING.finalMarkup(),'final');
  document.getElementById('finalToMidterm').onclick=()=>window.PPIQ_LANDING.transition(()=>window.PPIQ_LEGAL.ready.then(openStudyGuide),document.getElementById('finalToMidterm'));
  document.getElementById('finalToLanding').onclick=showLanding;
  focusHeading();
}
function openStudyGuide(){
  if(activeExam()){
    if(!confirm('Open the study guide? This will submit your mock exam now. Unanswered questions count as incorrect, and this attempt cannot be resumed. Choose Cancel to keep working.'))return;
    finish({reason:'left'});
  }else if(root.querySelector('.question-area')&&!s.final){persistSession()}
  setRoot('', 'guide');
  window.PPIQ_GUIDE.mount(root,CH,{practice:topic=>{
    if(savedSession&&!confirm('Start topic practice and replace the unfinished practice session? Previously saved scores will remain.'))return;
    s.mode='practice';s.chapter=topic;s.count=10;start();
  }});
  root.querySelector('h1').tabIndex=-1;root.querySelector('h1').focus({preventScroll:true});
}


function returnToDashboard(){
  if(activeExam()){
    if(confirm('Leave this mock exam? Your current answers will be submitted now. Unanswered questions count as incorrect, and this attempt cannot be resumed. Choose Cancel to keep working.'))finish({reason:'left'});
    return;
  }
  if(root.querySelector('.question-area')&&!s.final){persistSession();}
  dashboard();
}

function btn(id,text,extra=''){return `<button type="button" id="${id}" class="${extra||'primary'}">${text}</button>`}

function topicRows(){
  const stats=study.topicStats(ALL,CH);
  return Object.entries(CH).map(([ch,name])=>{
    const x=ALL.filter(q=>String(q.chapter)===ch),n=x.filter(q=>progress.seen.includes(q.id)).length,t=stats.find(t=>t.id===ch);
    const trend=t.delta===null?'Trend available after 10 answers':t.delta>0?`Recent accuracy up ${t.delta} percentage points`:t.delta<0?`Recent accuracy down ${-t.delta} percentage points`:'Recent accuracy is steady';
    return `<div class="topic"><div class="topic-details"><strong>${html(name)}</strong><div class="small">${t.accuracy===null?'No scored answers yet':`${t.accuracy}% accuracy · ${t.attempts} answer${t.attempts===1?'':'s'}`}</div>${t.attempts?`<div class="small topic-trend">${trend}</div>`:''}</div><div class="topic-coverage"><small class="muted">${n}/${x.length} seen</small><div class="track"><div class="fill" style="width:${x.length?n/x.length*100:0}%"></div></div></div></div>`;
  }).join('');
}

function dashboard(){ensureTimer();let avg=progress.attempts?Math.round(progress.scoreSum/progress.attempts):0;setRoot(`<section class="hero dashboard-hero"><div class="hero-copy"><div class="eyebrow">Midterm · Canadian police law</div><h1>Know your powers.<br><span>Own your exam.</span></h1><p class="sub">Practice Canadian Police Powers with randomized questions, instant explanations, topic progress, and a timed midterm simulation. Study the legal principles behind each answer.</p></div><div class="depth-scene" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="law-tile"><span class="tile-number">P / IQ</span><svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M60 23v72M40 97h40M27 43h66M60 23l5 7-5 7-5-7zM27 43L14 70h26L27 43zM93 43L80 70h26L93 43zM14 70c3 16 23 16 26 0M80 70c3 16 23 16 26 0"/></svg><span class="tile-caption">KNOWLEDGE IS POWER</span></div><span class="scene-tag tag-one">PREPARE WITH PURPOSE</span><span class="scene-tag tag-two">230 PRACTICE ITEMS</span></div></section>${resumePanel()}${savingNotice()}<div class="stats"><div class="stat"><b>${ALL.length}</b><small>Practice questions</small></div><div class="stat"><b>${progress.seen.length}</b><small>Unique questions seen</small></div><div class="stat"><b>${progress.wrong.length}</b><small>Questions to revisit</small></div><div class="stat"><b>${avg}%</b><small>Average session score</small></div></div><section class="layout"><div><div class="panel"><h2>Start a study session</h2><p class="small">Choose your settings, then mark one answer for each question.</p><label>Training mode</label><div class="segments"><button class="segment ${s.mode==='practice'?'selected':''}" data-mode="practice">Guided practice</button><button class="segment ${s.mode==='exam'?'selected':''}" data-mode="exam">40-question mock exam</button><button class="segment ${s.mode==='mistakes'?'selected':''}" data-mode="mistakes">Review my mistakes</button></div><div id="settings"><label>Questions per round</label><div class="segments" id="countPicker">${[10,15,20,25,30].map(n=>`<button class="segment ${s.count===n?'selected':''}" data-count="${n}">${n}</button>`).join('')}</div><label for="chapterSelect">Topic focus</label><select id="chapterSelect"><option value="all">All topics</option>${Object.entries(CH).map(([c,n])=>`<option value="${c}" ${s.chapter===c?'selected':''}>${html(n)}</option>`).join('')}</select></div><div class="notice" id="modeInfo"></div><div class="actions">${btn('startBtn','Start session →')}</div></div>${studyPriorities()}</div><aside class="panel"><h3>Your topic progress</h3>${topicRows()}<div class="tip" style="margin-top:22px">Unseen questions appear first. Your incorrect answers stay available under <b>Review my mistakes</b>. Your progress is saved in this browser. Topic accuracy uses answers recorded since this update; earlier progress is retained. Pending legal questions do not influence accuracy or spaced review.</div><div class="actions"><button class="ghost full" id="reportsQueueBtn" type="button">Question reports on this device</button><button class="ghost full" id="clearBtn">Reset saved progress</button></div></aside></section>`);wireResume();wireStudyPriorities();root.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{s.mode=b.dataset.mode;dashboard()});root.querySelectorAll('[data-count]').forEach(b=>b.onclick=()=>{s.count=Number(b.dataset.count);dashboard()});document.getElementById('chapterSelect').onchange=e=>s.chapter=e.target.value;document.getElementById('startBtn').onclick=beginNewSession;document.getElementById('clearBtn').onclick=()=>{if(confirm('Delete all locally saved Police PowersIQ study progress?')){progress={seen:[],wrong:[],correct:[],attempts:0,scoreSum:0};savedSession=null;study.remove(study.SESSION_KEY);study.resetLearning();window.PPIQ_GUIDE.reset();save();dashboard()}};let info=document.getElementById('modeInfo');info.textContent=s.mode==='exam'?'Full simulation: 40 mixed questions · 30 minutes. Mark one choice per question. Each correct answer earns one mark; there is no negative marking. Unanswered questions count as incorrect. You can change answers before submitting. Feedback appears after submission. Answers save in this browser, but the timer keeps running if you leave. Time expiry automatically submits; if the browser is closed, submission happens on your next visit.':s.mode==='mistakes'?'Revisit questions you answered incorrectly in previous sessions.':'Choose 10 to 30 questions in increments of 5. Check each answer for an explanation. Unfinished sessions can be resumed in this browser.';if(s.mode==='exam'){info.innerHTML=examInstructions();document.getElementById('startBtn').textContent='Start 30-minute exam →'}document.getElementById('settings').style.display=s.mode==='practice'?'':'none'}

function sample(source,n){let available=source.filter(q=>!progress.seen.includes(q.id)),other=source.filter(q=>progress.seen.includes(q.id));return shuffle(available).slice(0,n).concat(shuffle(other).slice(0,Math.max(0,n-available.length)))}

function orderOptions(q){const indices=q.options.map((_,i)=>i);if(q.type==='tf')return indices.sort((a,b)=>Number(q.options[b]==='True')-Number(q.options[a]==='True'));if(q.pinLastOption){const last=indices.pop();return [...shuffle(indices),last]}return shuffle(indices)}

function start(){clearInterval(timer);timer=null;let source=s.mode==='review'?study.dueQuestions(ALL):s.mode==='weak'?study.weakQuestions(ALL,CH):s.mode==='mistakes'?ALL.filter(q=>progress.wrong.includes(q.id)):s.mode==='exam'?ALL:ALL.filter(q=>s.chapter==='all'||String(q.chapter)===s.chapter);if(!source.length){alert('No questions available for this selection yet.');ensureTimer();return}const n=s.mode==='exam'?40:s.count;s.pool=(['review','weak'].includes(s.mode)?source:s.mode==='mistakes'?shuffle(source):sample(source,n)).slice(0,n).map(q=>{let order=orderOptions(q);return {...q,optionOrder:order,shownOptions:order.map(i=>q.options[i]),shownCorrect:q.correct.map(i=>order.indexOf(i)).sort((a,b)=>a-b)}});s.at=0;s.answers={};s.checked={};s.started=Date.now();s.deadline=s.mode==='exam'?s.started+study.EXAM_MS:null;s.id=study.sessionId();s.final=false;s.autoSubmitted=false;s.submissionReason=null;persistSession();showQuestion();ensureTimer()}

function eq(a,b){return JSON.stringify([...a].sort((x,y)=>x-y))===JSON.stringify([...b].sort((x,y)=>x-y))}

function current(){return s.pool[s.at]}

function chosen(q){return s.answers[q.id]||[]}

function isChecked(q){return !!s.checked[q.id]}

function choose(index){if(s.final)return;const q=current();if(s.mode!=='exam'&&isChecked(q))return;let a=chosen(q);if(examExpired())return;s.answers[q.id]=[index];persistSession();showQuestion()}

function check(){if(s.final||s.mode==='exam')return;let q=current(),a=chosen(q);if(!a.length)return;s.checked[q.id]=true;study.recordAnswer(q,eq(a,q.shownCorrect),s.id);persistSession();showQuestion()}

function next(){if(s.final)return;if(s.at>=s.pool.length-1){finish();return}s.at++;persistSession();showQuestion()}

function resultMark(q,i){if(!isChecked(q)||s.mode==='exam')return '';return q.shownCorrect.includes(i)?'good':chosen(q).includes(i)?'bad':''}

function showQuestion(){if(examExpired())return;const q=current(),n=s.pool.length,checked=isChecked(q),a=chosen(q),practice=s.mode!=='exam',correct=eq(a,q.shownCorrect);setRoot(`<div class="question-area"><div class="q-header"><div><span class="eyebrow">${s.mode==='exam'?'Timed mock exam':s.mode==='mistakes'?'Mistake review':s.mode==='review'?'Spaced review':s.mode==='weak'?'Targeted practice':'Guided practice'}</span><div class="small">Question ${s.at+1} of ${n}${s.mode==='exam'?` · ${s.pool.filter(q=>chosen(q).length).length} answered`:''}</div></div>${s.mode==='exam'?'<span class="countdown" id="timer" role="timer" aria-live="off" aria-label="Time remaining">30:00</span>':`<span class="pill">${q.answerStyle==='most_complete'?'MOST COMPLETE':q.type==='tf'?'TRUE / FALSE':q.type==='cloze'?'COMPLETE':'BEST ANSWER'}</span>`}</div><div class="track" style="margin-bottom:22px"><div class="fill" style="width:${(s.at+1)/n*100}%"></div></div><article class="q-card"><span class="q-label">${html(CH[q.chapter].toUpperCase())}</span><h2 class="q-title">${html(q.question)}</h2>${q.answerStyle==='most_complete'?'<p class="small answer-instruction">Select the most complete correct answer. Mark one choice.</p>':''}${q.statements?`<ol class="question-statements">${q.statements.map(statement=>`<li>${html(statement)}</li>`).join('')}</ol>`:''}<div class="answer-list">${q.shownOptions.map((opt,i)=>`<button type="button" class="answer ${a.includes(i)?'selected':''} ${resultMark(q,i)}" data-answer="${i}" ${checked&&practice?'disabled':''}><span class="letter">${String.fromCharCode(65+i)}</span><span>${html(opt)}</span></button>`).join('')}</div>${savingNotice()}${checked&&practice?`<div class="feedback ${correct?'':'wrong'}"><strong>${correct?'✓':'✕'} ${mark(q,correct)}</strong>${window.PPIQ_LEGAL.render(q,a)}</div>`:''}<div class="actions">${practice?(checked?btn('nextBtn',s.at===n-1?'View results →':'Next question →'):btn('checkBtn','Check my answer')):`${btn('prevBtn','← Previous','ghost')}${btn('nextBtn',s.at===n-1?'Submit mock exam →':'Next →')}`}${s.mode==='exam'?btn('submitExamBtn','Submit exam now','ghost'):''}${practice?`<button class="ghost" data-report-question="${html(q.id)}" type="button">Report a question</button>`:''}<button class="ghost right" id="exitBtn">${practice?'Save &amp; return':'Submit &amp; leave'}</button></div>${s.mode==='exam'?'<div class="small">One mark per correct answer; unanswered questions count as incorrect. Stay on this exam tab. Switching tabs, minimizing, refreshing or leaving ends this attempt and submits your saved answers. The 30-minute timer never pauses. Report question issues after submission.</div>':''}</article></div>`);root.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>choose(Number(b.dataset.answer)));document.getElementById('exitBtn').onclick=returnToDashboard;const submit=document.getElementById('submitExamBtn');if(submit)submit.onclick=()=>{const unanswered=s.pool.filter(q=>!chosen(q).length).length;if(confirm(`Submit this exam now? ${unanswered} unanswered question${unanswered===1?'':'s'} will count as incorrect.`))finish()};let c=document.getElementById('checkBtn');if(c){c.disabled=!a.length;c.onclick=check}let nx=document.getElementById('nextBtn');if(nx)nx.onclick=()=>{if(s.mode==='exam'&&s.at===n-1){if(confirm('Submit your mock exam now?'))finish()}else next()};let prev=document.getElementById('prevBtn');if(prev){prev.disabled=s.at===0;prev.onclick=()=>{s.at--;persistSession();showQuestion()}}if(s.mode==='exam')updateTimer()}

function finish(options={}){clearInterval(timer);timer=null;if(s.final||!s.pool.length)return;
if(!s.id)s.id=study.sessionId();
s.submissionReason=options.reason||s.submissionReason||((options.auto||(s.mode==='exam'&&Number.isFinite(s.deadline)&&Date.now()>=s.deadline))?'timeout':'manual');
s.autoSubmitted=s.submissionReason!=='manual';
persistSession('submitting');s.final=true;
const recorded=Array.isArray(progress.completedSessions)&&progress.completedSessions.includes(s.id);
let previous=recorded?JSON.parse(JSON.stringify(progress)):null;
let correct=0;for(const q of s.pool){let ok=eq(chosen(q),q.shownCorrect);if(chosen(q).length)study.recordAnswer(q,ok,s.id);if(ok)correct++;if(!progress.seen.includes(q.id))progress.seen.push(q.id);if(ok){if(!progress.correct.includes(q.id))progress.correct.push(q.id);progress.wrong=progress.wrong.filter(id=>id!==q.id)}else{if(!progress.wrong.includes(q.id))progress.wrong.push(q.id)}}progress.attempts++;const pct=Math.round(100*correct/s.pool.length);progress.scoreSum+=pct;
if(recorded){progress=previous}else{progress.completedSessions=[...(progress.completedSessions||[]),s.id].slice(-200)}
const stored=save();savedSession=null;if(stored){if(!options.retain)study.remove(study.SESSION_KEY)}else{savingFailed=true}
let byChapter=Object.entries(CH).map(([c,name])=>{let x=s.pool.filter(q=>String(q.chapter)===c);return x.length?`<div class="topic"><span>${html(name)}</span><strong>${x.filter(q=>eq(chosen(q),q.shownCorrect)).length}/${x.length}</strong></div>`:''}).join('');setRoot(`<section class="hero"><div class="eyebrow">${s.submissionReason==='left'?'Exam ended when you left · automatically submitted':s.autoSubmitted?'Time is up · automatically submitted':'Session complete'}</div><h1>Your score: <span>${pct}%</span></h1><p class="sub">${correct} out of ${s.pool.length} match the answer key. ${s.pool.filter(q=>chosen(q).length).length} answered; ${s.pool.filter(q=>!chosen(q).length).length} unanswered. Unanswered questions count as incorrect. Review the answers, then start another pool of questions.</p>${s.pool.some(q=>!window.PPIQ_LEGAL.isReviewed(q))?'<p class="notice">Some questions in this session are pending legal verification. Their scores reflect the recorded answer keys.</p>':''}</section>${savingNotice()}<div class="stats"><div class="stat"><b>${correct}</b><small>Correct</small></div><div class="stat"><b>${s.pool.length-correct}</b><small>Incorrect</small></div><div class="stat"><b>${progress.seen.length}</b><small>Unique seen</small></div><div class="stat"><b>${progress.wrong.length}</b><small>Saved mistakes</small></div></div><section class="layout"><div class="panel"><h2>Answer review</h2><div class="result-list">${s.pool.map((q,i)=>{let ok=eq(chosen(q),q.shownCorrect);return `<div class="result-item"><span class="chip ${ok?'':'wrong'}">${mark(q,ok)}</span> <span class="small">#${i+1} · ${html(CH[q.chapter])}</span><h3 style="margin-top:10px">${html(q.question)}</h3>${window.PPIQ_LEGAL.render(q,chosen(q))}<button class="ghost report-link" data-report-question="${html(q.id)}" type="button">Report a question</button></div>`}).join('')}</div></div><aside class="panel"><h3>Topic breakdown</h3>${byChapter}<div class="actions">${btn('nextPool','Next question pool →','primary full')}${btn('mistakeMode','Review my mistakes','primary alt full')}${btn('dash','Dashboard','ghost full')}</div></aside></section>`);document.getElementById('nextPool').onclick=()=>{s.mode='practice';start()};document.getElementById('mistakeMode').onclick=()=>{s.mode='mistakes';start()};document.getElementById('dash').onclick=dashboard}
function savingNotice(){return savingFailed||study.storageError?'<p class="notice storage-warning" role="status">Browser storage is unavailable, full, or unreadable. Your work is available for this visit, but may not survive closing or reloading. Enable site storage to save progress.</p>':''}
function persistSession(phase='active'){
  if(s.final||!s.pool.length)return;
  const snapshot=study.packSession(s,ALL,phase);
  savedSession=snapshot;
  if(!study.write(study.SESSION_KEY,snapshot))savingFailed=true;
}
function resumePanel(){
  if(!savedSession)return '';
  const answered=Object.values(savedSession.answers||{}).filter(a=>a.length).length;
  return `<section class="panel resume-panel" aria-labelledby="resumeTitle"><div><div class="eyebrow">Pick up where you left off</div><h2 id="resumeTitle">Unfinished ${savedSession.mode==='exam'?'mock exam':'study session'}</h2><p class="small">${answered} of ${savedSession.pool.length} answered.${savedSession.mode==='exam'?' The exam clock is still running.':''}</p></div><div class="actions">${btn('resumeBtn','Resume session →')}${btn('discardSessionBtn','Discard session','ghost')}</div></section>`;
}
function wireResume(){
  const resume=document.getElementById('resumeBtn');if(resume)resume.onclick=resumeSession;
  const discard=document.getElementById('discardSessionBtn');if(discard)discard.onclick=()=>{if(confirm('Discard the unfinished session? Previously saved study progress will remain.')){savedSession=null;study.remove(study.SESSION_KEY);dashboard()}};
}
function beginNewSession(){
  if(examExpired())return;
  if(savedSession&&!confirm('Start a new session and discard the unfinished one? Your previously saved progress will remain.'))return;
  start();
}
function resumeSession(){
  const restored=study.loadSession(ALL,savedSession);
  if(!restored){savedSession=null;dashboard();return}
  Object.assign(s,restored);savedSession=study.packSession(s,ALL,restored.phase);
  if(restored.phase==='submitting'){finish();return}
  if(restored.mode==='exam'){finish({reason:Date.now()>=restored.deadline?'timeout':'left'});return}
  if(examExpired())return;
  showQuestion();ensureTimer();
}
function remaining(){return Math.max(0,Math.ceil(((s.deadline||s.started+study.EXAM_MS)-Date.now())/1000))}
function updateTimer(){const el=document.getElementById('timer');if(el){const left=remaining();const text=`${String(Math.floor(left/60)).padStart(2,'0')}:${String(left%60).padStart(2,'0')}`;if(el.textContent!==text)el.textContent=text;el.classList.toggle('time-low',left<=300)}}
function examExpired(){
  if(savedSession?.mode!=='exam'||Date.now()<savedSession.deadline)return false;
  const restored=study.loadSession(ALL,savedSession);
  if(restored){Object.assign(s,restored)}
  else if(s.mode!=='exam'||s.final)return false;
  finish({auto:true});return true;
}
function ensureTimer(){
  clearInterval(timer);timer=null;
  if(savedSession?.mode==='exam')timer=setInterval(()=>{if(!examExpired())updateTimer()},250);
}

function studyPriorities(){
  const due=study.dueQuestions(ALL),next=study.nextReview(ALL),weak=study.weakestTopic(ALL,CH);
  if(!weak&&!next)return '<p class="small learning-hint">Answer reviewed questions to unlock your spaced-review schedule and a recommendation for your weakest topic.</p>';
  return `<section class="study-priorities" aria-label="What to study next"><div class="panel"><div class="eyebrow">Spaced review</div><h3>${due.length?`${due.length} question${due.length===1?'':'s'} due`:'Stay ahead of forgetting'}</h3><p class="small">${due.length?'Revisit questions scheduled from your earlier answers.':next?`Next review: ${html(new Date(next).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}))}.`:'Answer reviewed questions to build your review schedule.'} Missed questions return after one day. Consecutive correct reviews spread out to 3, 7, 14 and 30 days.</p>${btn('spacedReviewBtn','Review due questions →','primary full')}${!due.length?'<p class="small">No questions are due yet.</p>':''}</div><div class="panel"><div class="eyebrow">Targeted practice</div><h3>${weak?html(weak.name):'Find your next focus'}</h3><p class="small">${weak?`${weak.accuracy}% accuracy across ${weak.attempts} recorded answer${weak.attempts===1?'':'s'}. Practice this topic with missed questions first.`:'Complete some answers to identify a topic to work on. Recommendations use topic accuracy and recent performance.'}</p>${btn('weakTopicsBtn','Practice my weakest topic →','primary alt full')}<p class="small">Small samples are a starting point, not a proficiency assessment.</p></div></section>`;
}
function wireStudyPriorities(){
  const review=document.getElementById('spacedReviewBtn');if(review){review.disabled=!study.dueQuestions(ALL).length;review.onclick=()=>{s.mode='review';beginNewSession()}}
  const weak=document.getElementById('weakTopicsBtn');if(weak){weak.disabled=!study.weakestTopic(ALL,CH);weak.onclick=()=>{s.mode='weak';beginNewSession()}}
}

function legalReviewQueue(){
  const questions=ALL.map(q=>({...window.PPIQ_LEGAL.reviewMetadata(q),question:q.question}));
  const sources=window.PPIQ_LEGAL.sourceCatalogue();
  return {schemaVersion:1,generatedAt:new Date().toISOString(),questions:questions.filter(q=>q.status==='needs_review'||q.dueReview),sources:sources.filter(source=>!source.verified||!source.url||!source.reviewedOn||Date.now()-Date.parse(source.reviewedOn)>90*86400000)};
}
function legalStatusPanel(){
  const queue=legalReviewQueue(),pending=queue.questions.filter(q=>q.status==='needs_review');
  const reviewed=ALL.map(q=>window.PPIQ_LEGAL.reviewMetadata(q).reviewedOn).filter(Boolean).sort();
  return `<section class="panel source-status"><details><summary>Legal source review · ${pending.length} question${pending.length===1?'':'s'} pending verification</summary><p class="small">${reviewed.length?`Earliest current review date: ${html(reviewed[0])}.`:'Legal review dates are unavailable.'} Each answer review shows its own date. A working link does not establish legal accuracy. Primary sources and question support must be checked separately.</p>${queue.questions.length?`<h3>Question review queue</h3><ul class="legal-queue-list">${queue.questions.map(q=>`<li><b>${html(q.questionId)} · ${html(q.status==='needs_review'?'Legal verification pending':'Scheduled re-review')}</b><p>${html(q.question)}</p><p class="small">${html(q.reason||'Review is older than 90 days. Check current primary sources before renewing its date.')}</p><button class="ghost" type="button" data-report-question="${html(q.questionId)}">Report information for review</button></li>`).join('')}</ul>`:'<p class="small">No question reviews are currently due.</p>'}<h3>Source directory</h3><ul>${window.PPIQ_LEGAL.sourceCatalogue().map(source=>`<li>${source.url?`<a href="${html(source.url)}" target="_blank" rel="noopener noreferrer">${html(source.title)}</a>`:html(source.title)}<div class="small">${source.verified?'Source identity checked':'Source verification pending'} · ${source.reviewedOn?`Last checked ${html(source.reviewedOn)}`:'Review date not recorded'}</div></li>`).join('')}</ul><p class="small">The maintenance checker can identify failed links or changed source text for manual review. It does not automatically approve legal explanations.</p><button id="exportLegalQueue" class="ghost" type="button">Download legal-review queue</button></details></section>`;
}
function wireLegalStatus(){const button=document.getElementById('exportLegalQueue');if(button)button.onclick=()=>window.PPIQ_REPORTS.download(legalReviewQueue(),'Police-PowersIQ-legal-review-queue.json')}

function examInstructions(){return `<div class="exam-rules"><h3>Before you start</h3><ul><li><b>40 mixed questions · 30 minutes.</b> Mark one choice for each question.</li><li><b>One mark per correct answer.</b> No negative marking; unanswered questions count as incorrect.</li><li><b>Change answers before submission.</b> Feedback is available after you submit. You can submit from any question.</li><li><b>Stay on the exam tab.</b> Switching tabs, minimizing the browser, refreshing, going back or closing the page ends this attempt and submits your saved answers. You cannot resume it. The timer never pauses; at 30 minutes your answers submit automatically.</li><li><b>Leaving is final.</b> Use Submit &amp; leave to see a confirmation. Your browser may also show a generic leave-page warning; choose Stay or Cancel to continue. Tab switches and mobile app switches may submit immediately without a warning. If the browser closes before it can submit, the saved attempt is finalized on your next visit.</li><li><b>Exam text cannot be selected or copied here.</b> Keyboard answer controls remain available. You can review explanations and report question issues after submission.</li></ul></div>`}

// A fixed deadline plus a submission journal survives reloads and missed exit events.
function activeExam(){return s.mode==='exam'&&!s.final&&s.pool.length&&root.querySelector('.question-area')}
function submitOnLeave(){if(activeExam())finish({reason:Date.now()>=s.deadline?'timeout':'left',retain:true})}
window.addEventListener('beforeunload',event=>{
  if(!activeExam())return;
  // Native browsers control the prompt wording. Cancelling must not end the attempt.
  persistSession();event.preventDefault();event.returnValue='';
});
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden'){submitOnLeave();return}
  if(!examExpired()&&root.querySelector('.dashboard-hero'))dashboard();
});
window.addEventListener('pagehide',()=>{
  if(activeExam())submitOnLeave();
  else if(root.querySelector('.question-area')&&!s.final)persistSession();
});
for(const type of ['copy','cut','contextmenu','selectstart','dragstart']){
  document.addEventListener(type,event=>{
    if(!activeExam())return;
    const selection=window.getSelection();
    if(root.contains(event.target)||root.contains(selection?.anchorNode)||root.contains(selection?.focusNode))event.preventDefault();
  });
}
document.getElementById('trainingTab').onclick=returnToDashboard;
document.getElementById('studyGuideTab').onclick=openStudyGuide;
document.getElementById('homeBtn').onclick=returnToDashboard;
document.getElementById('chooseExamBtn').onclick=showLanding;
showLanding();
window.PPIQ_LEGAL.ready.then(()=>{
  document.getElementById('trainingTab').disabled=false;
  document.getElementById('studyGuideTab').disabled=false;
  if(!ALL.length)setRoot('<p class="notice">Question bank did not load. Check questions.js.</p>');
  else{
    // Interrupted exams must be finalized before any study material is shown.
    if(savedSession?.phase==='submitting'||savedSession?.mode==='exam')resumeSession();
    ensureTimer();
  }
});})();
