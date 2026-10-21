/* Topic outlines adapted from the supplied study guide. Legal prose comes
   exclusively from the app's gated legal-feedback records, never the upload. */
(() => {
  'use strict';
  const KEY = 'ppiq_guide_v1', study = window.PPIQ_STUDY;
  const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const note = (label, number) => [label, `Q${String(number).padStart(3,'0')}A`];
  const topics = {
    1: {
      icon:'§', intro:'Start with where police authority comes from, then connect each power to its constitutional limits.',
      recall:'Without looking, name the sources of police authority, match Charter sections 7 to 14 to what they protect, and list the rights in sections 10(a)–(c) and 11(a)–(i).',
      cards:[
        ['Who makes the law?',[note('Federal criminal law',1),note('Provincial administration of justice',2),note('Division of powers',3)]],
        ['Sources of authority',[note('Statutes',7),note('Regulations',9),note('Common law',8)]],
        ['Constitutional foundations',[note('Canadian Bill of Rights · 1960',5),note('Canadian Charter · 1982',4),note('Constitutional supremacy',6)]],
        ['Charter rights · sections 7–10',[note('Section 7 · life, liberty and security',10),note('Section 8 · search and seizure',11),note('Section 9 · detention',12),note('Section 10 · arrest and detention rights',13)]],
        // Added after the original outline: legacy whole-topic completion must not mark these reviewed.
        ['Section 10 · paragraphs (a)–(c)',[note('10(a) · told the reasons promptly',96),note('10(b) · counsel without delay',97),note('10(c) · habeas corpus',98)],{added:true}],
        ['Charter rights · sections 11–14',[note('Section 11 · criminal proceedings',14),note('Section 12 · treatment and punishment',15),note('Section 13 · witness testimony',16),note('Section 14 · interpreters',17)]],
        ['Section 11 · paragraphs (a)–(i)',[note('11(a) · told the specific offence',99),note('11(b) · trial within a reasonable time',100),note('11(c) · not a compelled witness',101),note('11(d) · presumed innocent',102),note('11(e) · reasonable bail',103),note('11(f) · trial by jury',104),note('11(g) · no retroactive offences',105),note('11(h) · not tried or punished twice',106),note('11(i) · the lesser punishment',107)],{added:true}],
        ['Memory cues · sections 7–14',[note('Section 7 · personal freedom',108),note('Section 8 · privacy',109),note('Section 9 · no arbitrary detention',110),note('Section 10 · reasons and lawyer',111),note('Section 11 · fair criminal proceedings',112),note('Section 12 · humane treatment',113),note('Section 13 · testimony protection',114),note('Section 14 · understand proceedings',115)],{added:true}]
      ]
    },
    2: {
      icon:'⚖', intro:'Work through the authority, the required grounds, and the restrictions before deciding whether an arrest is lawful.',
      recall:'Explain reasonable grounds in your own words. Then compare arrest, investigative detention and voluntary accompaniment.',
      cards:[
        ['Police and citizen arrest powers',[note('Section 495 · peace officers',18),note('Section 494 · citizen arrest',41),note('Delivery to a peace officer',42)]],
        ['Grounds for arrest',[note('Subjective belief',20),note('Objective justification',21),note('Found committing',22)]],
        ['Arrest restrictions and RICE',[note('Section 495(2) · restrictions',19),note('R · repetition or continuation',23),note('I · identity',24),note('C · court attendance',25),note('E · evidence',26),note('Arrest is not always required',34)]],
        ['Arrest, detention and choice',[note('Investigative detention',36),note('Voluntary accompaniment',35),note('Right to counsel',33),note('Police duties and lawful justification',27)]],
        ['Offence classification',[note('Summary conviction',28),note('Hybrid offences · Crown election',29),note('Before the Crown elects',30),note('Classification and arrest restrictions',37)]],
        ['Elements of an offence',[note('Actus reus',31),note('Mens rea',32)]],
        ['Warrants and youth proceedings',[note('Bench warrants',38),note('Duration of arrest warrants',39),note('Youth Criminal Justice Act',40)]]
      ]
    },
    3: {
      icon:'⌂', intro:'Separate the power to arrest a person from the authority to enter a dwelling-house.',
      recall:'Explain why an arrest warrant and permission to enter a home are different. Compare the conditions for each entry exception.',
      cards:[
        ['Homes and privacy',[note('The location distinction',43),note('Dwelling-house',44),note('Privacy protection',46),note('Privacy and lawful arrest',54)]],
        ['Feeney and judicial entry authorization',[note('R. v. Feeney',45),note('Prior authorization',47),note('Presence of the person',48),note('An ordinary arrest warrant',55)]],
        ['Entry exceptions · separate legal tests',[note('Exigent entry to arrest',49),note('Hot pursuit',50),note('Emergency assistance',51)]],
        ['Approaching a home and using force',[note('An invitation to knock',52),note('Necessary and justified force',53)]]
      ]
    },
    7: {
      icon:'⌕', intro:'Identify the legal basis for a warrantless search, then ask whether its purpose, scope and manner stay within that power.',
      recall:'Compare a protective frisk with a search incident to arrest. Describe Fearon’s limits without using “arrest means search everything.”',
      cards:[
        ['Prior authorization and section 8',[note('Prior judicial authorization',56),note('Justifying a warrantless search',57)]],
        ['Search incident to arrest',[note('Valid connected purposes',58),note('Limits on scope',59),note('Vehicle searches',62)]],
        ['Protective searches during detention',[note('Safety purpose',60),note('Additional safety grounds',61)]],
        ['Cellphones · R. v. Fearon',[note('The cellphone-search decision',63),note('Purpose, scope and detailed notes',64)]],
        ['Consent and another person’s privacy',[note('Withdrawal of consent · review pending',65),note('Landlords and third-party permission',66)]],
        ['School searches',[note('School officials',67),note('Police involvement',68)]],
        ['Plain view and continuity',[note('Plain-view seizure',69),note('Continuity of evidence · review pending',70)]],
        ['Dog sniffs and urgency',[note('Reasonable suspicion',71),note('Exigent circumstances',72)]]
      ]
    },
    8: {
      icon:'▤', intro:'Follow the warrant from its supporting information to its execution. Pay attention to the facts, disclosure and specific authorization.',
      recall:'Explain ITO, affiant, nexus and the Three Fs. Then identify the limits that still matter when executing a warrant.',
      cards:[
        ['Building a warrant application',[note('Place and evidence',73),note('Nexus',74),note('Specific offence facts',78),note('Location, offence and items',79)]],
        ['ITO and affiant',[note('Information to Obtain',75),note('The affiant',76),note('Swearing or affirming',94)]],
        ['Full, fair and frank disclosure',[note('The Three Fs',77),note('Contrary material facts',80),note('Material earlier refusals',81),note('Constitutional problems in evidence collection',82)]],
        ['Informers, agents and sealing',[note('Informer privilege',83),note('State agency',84),note('Sealing orders',85)]],
        ['Telewarrants',[note('Telecommunication that does not produce a writing',86)]],
        ['Executing a warrant',[note('Knock and announce',87),note('Necessary force',88),note('No-knock exceptions',89)]],
        ['Time, people and re-entry',[note('Night · 9 p.m. to 6 a.m.',90),note('Execution periods',93),note('People inside the premises',91),note('Re-entry after completion · review pending',92)]],
        ['CPIC',[note('Canadian Police Information Centre',95)]]
      ]
    }
  };
  // Quick reference: plain-language summaries, separate from the reviewed topic notes and the reading checklist.
  // Each entry names catalogue IDs from legal-authorities.json so links come from the reviewed source list.
  const reference = [
    {title:'Canadian Charter of Rights and Freedoms',kicker:'Constitution Act, 1982 · Part I',sources:['CHARTER'],items:[
      ['s. 7','Life, liberty and security of the person, and the right not to be deprived of them except in accordance with the principles of fundamental justice.'],
      ['s. 8','The right to be secure against unreasonable search or seizure.'],
      ['s. 9','The right not to be arbitrarily detained or imprisoned.'],
      ['s. 10','On arrest or detention: to be told the reasons promptly, to retain and instruct counsel without delay and be informed of that right, and to challenge the detention by habeas corpus.'],
      ['s. 11','Rights of a person charged with an offence, including notice of the specific offence, trial within a reasonable time, the presumption of innocence and reasonable bail.'],
      ['s. 12','The right not to be subjected to any cruel and unusual treatment or punishment.'],
      ['s. 13','A witness’s incriminating evidence cannot be used to incriminate them in other proceedings, except for perjury or contradictory evidence.'],
      ['s. 14','A party or witness who does not understand or speak the language of the proceedings, or who is deaf, has the right to an interpreter.'],
      ['s. 24(2)','Evidence obtained in a way that infringed a Charter right is excluded if admitting it would bring the administration of justice into disrepute.']
    ]},
    {title:'Criminal Code',kicker:'R.S.C. 1985, c. C-46',sources:['CITIZEN','ARREST','WARRANT','SEIZURE','EXIGENT'],items:[
      ['s. 494','Arrest without warrant by any person, in limited circumstances such as finding someone committing an indictable offence.'],
      ['s. 495','Arrest without warrant by a peace officer.'],
      ['s. 487','A justice may issue a warrant to search a building, receptacle or place, on information on oath.'],
      ['s. 489','Seizure of things not named in a warrant, in limited circumstances.'],
      ['s. 529.3','Entry into a dwelling-house to arrest without a warrant in exigent circumstances.']
    ]},
    {title:'RICE',kicker:'Criminal Code s. 495(2)',mnemonic:true,sources:['ARREST'],intro:'Section 495(2) limits a peace officer’s warrantless arrest for less serious offences where the public interest can be satisfied without arrest. RICE recalls the concerns it lists.',items:[
      ['R · Repetition','Prevent the continuation or repetition of the offence, or another offence. s. 495(2)(d)(iii)'],
      ['I · Identity','Establish the identity of the person. s. 495(2)(d)(i)'],
      ['C · Court','Ensure the person will attend court. s. 495(2)(e)'],
      ['E · Evidence','Secure or preserve evidence of or relating to the offence. s. 495(2)(d)(ii)']
    ]},
    {title:'Key court decisions',kicker:'Supreme Court of Canada',sources:['HUNTER','STORREY','FEENEY','CASLAKE','GRANT'],items:[
      ['Hunter v. Southam Inc., [1984] 2 S.C.R. 145','Prior authorization is generally required; a warrantless search is presumptively unreasonable.'],
      ['R. v. Storrey, [1990] 1 S.C.R. 241','An arrest requires reasonable and probable grounds, held subjectively and justifiable objectively.'],
      ['R. v. Feeney, [1997] 2 S.C.R. 13','A warrantless entry into a dwelling to make an arrest is generally prohibited.'],
      ['R. v. Caslake, [1998] 1 S.C.R. 51','A search incident to arrest must be truly incidental to a lawful arrest.'],
      ['R. v. Grant, 2009 SCC 32','Defines detention and sets the test for excluding evidence under s. 24(2).']
    ]}
  ];
  const sectionKey = card => card[1].map(([,id])=>id).join('-');
  let memory = null;
  function state() {
    if(memory)return memory;
    const stored=study.read(KEY,{});
    memory={schemaVersion:2,selected:Object.hasOwn(topics,String(stored?.selected))?String(stored.selected):'1',sections:{}};
    for(const [id,topic] of Object.entries(topics)){
      const valid=topic.cards.map(sectionKey);
      // Legacy whole-topic completion means each existing section was reviewed.
      const legacy=topic.cards.filter(card=>!card[2]?.added).map(sectionKey);
      const previous=stored?.schemaVersion===2&&Array.isArray(stored.sections?.[id])?stored.sections[id]:stored?.reviewed?.[id]===true?legacy:[];
      memory.sections[id]=valid.filter(key=>previous.includes(key));
    }
    return memory;
  }
  function save(){study.write(KEY,state())}
  function reset(){memory=null;study.remove(KEY)}
  function progress(id){
    const total=topics[id].cards.length,done=state().sections[id].length;
    return {total,done,exact:done/total*100,percent:Math.round(done/total*100),complete:done===total};
  }
  function ring(id){
    const p=progress(id);
    return `<span class="review-ring ${p.complete?'is-complete':''}" aria-hidden="true"><svg viewBox="0 0 48 48" focusable="false"><circle class="review-ring-track" cx="24" cy="24" r="20"/><circle class="review-ring-fill" cx="24" cy="24" r="20" pathLength="100" stroke-dasharray="${p.exact} 100" transform="rotate(-90 24 24)"/></svg><span class="review-ring-value">${p.percent}%${p.complete?'<span class="review-ring-check">✓</span>':''}</span></span>`;
  }
  function cardHtml(card,index,bank,topicId){
    const sources=new Map(),dates=[];
    let pending=false;
    const notes=card[1].map(([label,id])=>{
      const q=bank.get(id),info=q&&window.PPIQ_LEGAL.studyContent(q);
      if(!info?.reviewed)pending=true;
      for(const source of info?.sources||[])sources.set(source.url,source);
      if(info?.reviewedOn)dates.push(info.reviewedOn);
      return `<section class="guide-note" data-guide-note="${id}"><h4>${escape(label)}</h4>${info?.reviewed?`${info.studyAid?'<span class="guide-mnemonic">Study mnemonic · not statutory wording</span>':''}<p>${escape(info.explanation)}</p>${info.pinpoint?`<p class="small guide-pinpoint">${escape(info.pinpoint)}</p>`:''}`:'<p class="guide-pending">Legal review pending. This point needs further verification before a substantive study explanation can be displayed.</p>'}</section>`;
    }).join('');
    const links=[...sources.values()].map(source=>`<li><a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.title)}</a></li>`).join('');
    const key=sectionKey(card),checked=state().sections[topicId].includes(key);
    return `<details class="guide-card" ${index===0?'open':''}><summary><span>${escape(card[0])}</span><span class="guide-card-count">${card[1].length} ${card[1].length===1?'note':'notes'}</span></summary><div class="guide-card-body">${notes}<details class="guide-citations"><summary>${pending?'Sources · some support pending review':'Legislation & court decisions'}</summary>${links?`<ul>${links}</ul>`:'<p class="small">Legal sources are unavailable.</p>'}${dates.length?`<p class="small">Earliest review date for the cleared notes above: ${escape(dates.sort()[0])}. Check the linked sources for current law.</p>`:''}</details><label class="section-review ${checked?'is-reviewed':''}"><input type="checkbox" data-guide-section="${topicId}:${key}" ${checked?'checked':''} aria-label="Mark ${escape(card[0])} reviewed"><span class="section-review-icon" aria-hidden="true">✓</span><span class="section-review-text">${checked?'Section reviewed':'Mark section reviewed'}</span></label></div></details>`;
  }
  function referenceHtml(){
    const catalogue=new Map(window.PPIQ_LEGAL.sourceCatalogue().map(source=>[source.id,source]));
    const cards=reference.map(group=>{
      const links=group.sources.map(id=>catalogue.get(id)).filter(source=>source?.url).map(source=>`<li><a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.title)}</a></li>`).join('');
      const notes=group.items.map(([label,text])=>`<section class="guide-note"><h4>${escape(label)}</h4><p>${escape(text)}</p></section>`).join('');
      return `<details class="guide-card guide-reference-card"><summary><span>${escape(group.title)}<span class="guide-reference-kicker">${escape(group.kicker)}</span></span><span class="guide-card-count">${group.items.length} points</span></summary><div class="guide-card-body">${group.mnemonic?'<span class="guide-mnemonic">Study mnemonic · not statutory wording</span>':''}${group.intro?`<p class="guide-reference-intro">${escape(group.intro)}</p>`:''}${notes}<details class="guide-citations"><summary>Legislation & court decisions</summary>${links?`<ul>${links}</ul>`:'<p class="small">Legal sources are unavailable.</p>'}</details></div></details>`;
    }).join('');
    return `<section class="guide-reference" aria-labelledby="guideReferenceTitle"><header class="guide-topic-heading"><div class="eyebrow">Quick reference · not part of your checklist</div><h2 id="guideReferenceTitle">Key sources at a glance</h2><p class="sub">Plain-language summaries of the legislation and decisions behind the questions. They are orientation, not legal advice; follow the links for the official text.</p></header>${cards}</section>`;
  }
  function mount(host,names,{practice}){
    const data=state(),ids=Object.keys(topics),bank=new Map((window.PPIQ_QUESTIONS||[]).map(q=>[q.id,q]));
    host.innerHTML=`<section class="guide-hero"><div><div class="eyebrow">Midterm · Read · recall · practise</div><h1>Your study <span>guide.</span></h1><p class="sub">Build your understanding one topic at a time. Open the notes, check the legal sources, then put what you know into practice.</p></div><div class="guide-progress"><span class="guide-progress-label">Your reading checklist</span><b id="guideReviewCount"></b><span class="small">Self-marked review · separate from your quiz scores</span></div></section><div class="guide-layout"><aside class="guide-sidebar"><div class="eyebrow">Choose a topic</div><div class="guide-topics" role="tablist" aria-label="Study guide topics" aria-orientation="vertical">${ids.map(id=>`<button class="guide-topic" id="guide-tab-${id}" type="button" role="tab" data-guide-topic="${id}" aria-controls="guide-panel-${id}" aria-selected="${id===data.selected}" tabindex="${id===data.selected?'0':'-1'}"><span class="guide-topic-icon" aria-hidden="true">${topics[id].icon}</span><span>${escape(names[id])}</span><span class="guide-topic-progress">${ring(id)}</span></button>`).join('')}</div><p class="small guide-source-note">Organized by legal topic, with statutes and court decisions linked in the notes. Review status matches the app’s answer feedback.</p></aside><div class="guide-reading">${ids.map(id=>`<section id="guide-panel-${id}" class="guide-topic-panel" role="tabpanel" tabindex="0" aria-labelledby="guide-tab-${id}" ${id!==data.selected?'hidden':''}><header class="guide-topic-heading"><h2>${escape(names[id])}</h2><p class="sub">${escape(topics[id].intro)}</p><div class="guide-toolbar"><button type="button" class="guide-action" data-guide-expand="${id}" aria-expanded="false">Expand all notes</button></div></header>${topics[id].cards.map((card,i)=>cardHtml(card,i,bank,id)).join('')}<div class="guide-recall"><div class="eyebrow">Pause & recall</div><h3>Put it in your own words.</h3><p>${escape(topics[id].recall)}</p><button type="button" class="primary" data-guide-practice="${id}">Practice this topic →</button></div></section>`).join('')}${referenceHtml()}<p id="guideSaveStatus" class="small" role="status"></p></div></div>`;
    const tabs=[...host.querySelectorAll('[data-guide-topic]')];
    function refresh(){
      const all=ids.map(progress),done=all.reduce((n,p)=>n+p.done,0),total=all.reduce((n,p)=>n+p.total,0);
      host.querySelector('#guideReviewCount').textContent=`${done} of ${total} sections reviewed`;
      for(const id of ids){
        const tab=host.querySelector(`#guide-tab-${id}`),selected=id===data.selected,p=progress(id);
        tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;
        const indicator=tab.querySelector('.review-ring');
        indicator.classList.toggle('is-complete',p.complete);
        indicator.querySelector('.review-ring-fill').setAttribute('stroke-dasharray',`${p.exact} 100`);
        indicator.querySelector('.review-ring-value').innerHTML=`${p.percent}%${p.complete?'<span class="review-ring-check">✓</span>':''}`;
        tab.setAttribute('aria-label',`${names[id]}, ${p.percent}% reviewed, ${p.done} of ${p.total} sections${p.complete?', complete':''}`);
        host.querySelector(`#guide-panel-${id}`).hidden=!selected;
      }
      host.querySelector('#guideSaveStatus').textContent=study.storageError?'Browser storage is unavailable. Your reading checklist may not survive closing or reloading.':'';
    }
    function activate(tab){data.selected=tab.dataset.guideTopic;save();refresh()}
    tabs.forEach((tab,i)=>{
      tab.onclick=()=>activate(tab);
      tab.onkeydown=event=>{
        let index;
        if(['ArrowDown','ArrowRight'].includes(event.key))index=(i+1)%tabs.length;
        else if(['ArrowUp','ArrowLeft'].includes(event.key))index=(i+tabs.length-1)%tabs.length;
        else if(event.key==='Home')index=0;
        else if(event.key==='End')index=tabs.length-1;
        if(index===undefined)return;
        event.preventDefault();tabs[index].focus();activate(tabs[index]);
      };
    });
    host.querySelectorAll('[data-guide-section]').forEach(input=>input.onchange=()=>{
      const [id,key]=input.dataset.guideSection.split(':');
      const reviewed=new Set(data.sections[id]);
      if(input.checked)reviewed.add(key);else reviewed.delete(key);
      data.sections[id]=[...reviewed];
      const label=input.closest('.section-review');
      label.classList.toggle('is-reviewed',input.checked);
      label.querySelector('.section-review-text').textContent=input.checked?'Section reviewed':'Mark section reviewed';
      save();refresh();
    });
    host.querySelectorAll('[data-guide-practice]').forEach(button=>button.onclick=()=>practice(button.dataset.guidePractice));
    host.querySelectorAll('[data-guide-expand]').forEach(button=>{
      const cards=[...host.querySelectorAll(`#guide-panel-${button.dataset.guideExpand} > .guide-card`)];
      const sync=()=>{const expanded=cards.every(card=>card.open);button.setAttribute('aria-expanded',String(expanded));button.textContent=expanded?'Collapse all notes':'Expand all notes'};
      cards.forEach(card=>card.addEventListener('toggle',sync));
      button.onclick=()=>{const expand=!cards.every(card=>card.open);cards.forEach(card=>card.open=expand);sync()};
    });
    refresh();
  }
  window.PPIQ_GUIDE={mount,reset};
})();
