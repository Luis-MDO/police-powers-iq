/* The entry screen works immediately; 3D is an optional, lazy enhancement. */
(() => {
  'use strict';
  const scales = `<svg class="landing-scales-fallback" viewBox="0 0 420 400" fill="none" aria-hidden="true"><defs><linearGradient id="scaleCopper" x1="90" y1="40" x2="320" y2="350" gradientUnits="userSpaceOnUse"><stop stop-color="#ffd5a6"/><stop offset=".4" stop-color="#ba7041"/><stop offset=".6" stop-color="#ffd5a6"/><stop offset="1" stop-color="#864b2c"/></linearGradient><linearGradient id="scaleDark" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#4b5146"/><stop offset="1" stop-color="#1b201b"/></linearGradient></defs><ellipse cx="210" cy="338" rx="90" ry="13" fill="#000" opacity=".13"/><path d="M141 320h138l15 13H126z" fill="url(#scaleDark)" stroke="url(#scaleCopper)"/><path d="M174 307h72l29 13H145z" fill="url(#scaleCopper)"/><path d="M203 88h14l5 220h-24z" fill="url(#scaleCopper)"/><path d="m210 56 15 20-15 20-15-20z" fill="url(#scaleCopper)"/><path d="M85 111h250" stroke="url(#scaleCopper)" stroke-width="9" stroke-linecap="round"/><g stroke="url(#scaleCopper)" stroke-width="2"><path d="m89 111-49 125m49-125 49 125m-49-125v128m242-128-49 125m49-125 49 125m-49-125v128"/></g><path d="M38 237h102c-9 47-93 47-102 0m242 0h102c-9 47-93 47-102 0" fill="url(#scaleCopper)"/><path d="M38 237h102m140 0h102" stroke="#ffe0b7" stroke-width="3"/></svg>`;
  const arrow='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';
  function transition(action, origin) {
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){action();return}
    const overlay=document.createElement('div');
    overlay.className='exam-portal';overlay.setAttribute('aria-hidden','true');
    const box=origin?.getBoundingClientRect();
    overlay.style.setProperty('--portal-x',`${box?box.left+box.width/2:innerWidth/2}px`);
    overlay.style.setProperty('--portal-y',`${box?box.top+box.height/2:innerHeight/2}px`);
    overlay.innerHTML='<div class="exam-portal-ring"></div><span>POLICE POWERS<span>IQ</span></span>';
    document.body.append(overlay);
    // Change content behind the copper sweep, independent of animation support.
    setTimeout(()=>{action();window.scrollTo(0,0)},190);
    setTimeout(()=>overlay.remove(),620);
  }
  function mount(host,{midterm,final}) {
    host.innerHTML=`<section class="landing-page" aria-labelledby="landingTitle"><div class="landing-toolbar"><span>YOUR PATH TO EXAM DAY</span><button type="button" class="motion-control" id="landingMotion" aria-pressed="false">Pause motion</button></div><div class="landing-hero"><div class="landing-copy"><div class="eyebrow"><span class="landing-dot"></span> PREPARE WITH PURPOSE</div><h1 id="landingTitle">Find your<br><em>balance.</em><br>Own your powers.</h1><p class="landing-intro">Clearer thinking. Stronger foundations.<br>Your space to understand Canadian police law—and walk into your exam with confidence.</p><div class="landing-assurance"><span>Independent study</span><span>Canadian legal sources</span></div></div></div><div class="landing-section-label"><span>CHOOSE YOUR NEXT CHALLENGE</span><span class="small">One step closer to ready.</span></div><div class="exam-choices"><article class="exam-choice exam-choice-midterm"><div class="exam-card-top"><span class="exam-card-icon" aria-hidden="true">01 /</span><span class="exam-badge">AVAILABLE NOW</span></div><h2>Midterm</h2><p>Your foundations, all in one place. Explore the study guide, practise by topic, and put yourself to the test.</p><ul class="exam-card-facts"><li>5 legal topics</li><li>230 question items</li><li>30-minute mock exam</li></ul><button type="button" class="exam-enter" id="chooseMidterm">Explore Midterm ${arrow}</button></article><article class="exam-choice exam-choice-final"><div class="exam-card-top"><span class="exam-card-icon" aria-hidden="true">02 /</span><span class="exam-badge exam-badge-soon">COMING SOON</span></div><h2>Final exam</h2><p>The next chapter in your preparation. A dedicated space for your final study material is on its way.</p><div class="exam-coming-note">More knowledge. The same clear focus.</div><button type="button" class="exam-enter exam-enter-secondary" id="chooseFinal">View Final exam ${arrow}</button></article></div><p class="landing-footnote">Your progress stays on this device. Pick up your midterm preparation whenever you’re ready.</p></section>`;
    const background=document.createElement('div');
    background.className='landing-art';background.setAttribute('aria-hidden','true');
    background.innerHTML=`<div class="landing-atmosphere"></div><div class="landing-art-halo"></div><div class="landing-scene" id="landingScene">${scales}</div><div class="landing-backdrop-veil"></div>`;
    document.body.prepend(background);
    document.body.classList.add('landing-active');
    let alive=true,scene=null,paused=false,pending=false;
    const sceneHost=background.querySelector('#landingScene'),motion=matchMedia('(prefers-reduced-motion: reduce)');
    const pause=host.querySelector('#landingMotion');
    pause.hidden=motion.matches;
    function preference(){pause.hidden=motion.matches;scene?.setPaused(paused||motion.matches)}
    motion.addEventListener('change',preference);
    pause.onclick=()=>{
      paused=!paused;scene?.setPaused(paused);
      pause.setAttribute('aria-pressed',String(paused));pause.textContent=paused?'Resume motion':'Pause motion';
      sceneHost.closest('.landing-art').classList.toggle('motion-paused',paused);
    };
    function choose(action,button){
      if(pending)return;pending=true;
      host.querySelectorAll('.exam-enter').forEach(b=>b.disabled=true);
      transition(action,button);
    }
    const mid=host.querySelector('#chooseMidterm'),fin=host.querySelector('#chooseFinal');
    mid.onclick=()=>choose(midterm,mid);fin.onclick=()=>choose(final,fin);
    let idle;
    if(!motion.matches&&!navigator.connection?.saveData){
      idle=setTimeout(()=>{
        import('./assets/landing-scene.js').then(module=>{
          if(!alive||motion.matches)return;
          try{scene=module.createScene(sceneHost,{paused})}catch(_){sceneHost.querySelector('canvas')?.remove()}
        }).catch(()=>{/* The dimensional SVG stays visible if 3D cannot load. */});
      },180);
    }
    return ()=>{alive=false;clearTimeout(idle);scene?.dispose();background.remove();document.body.classList.remove('landing-active');motion.removeEventListener('change',preference)};
  }
  function finalMarkup(){
    return `<section class="final-placeholder"><div class="final-placeholder-symbol" aria-hidden="true">02 /</div><div class="eyebrow">FINAL EXAM · COMING SOON</div><h1>Your next chapter<br>is <span>on its way.</span></h1><p class="sub">Final exam material is not available yet.</p><p class="small">This space will bring your final study guide, practice questions and mock exams together when the material is ready.</p><div class="actions"><button id="finalToMidterm" type="button" class="primary">Explore Midterm →</button><button id="finalToLanding" type="button" class="ghost">← Choose exam</button></div></section>`;
  }
  window.PPIQ_LANDING={mount,transition,finalMarkup};
})();
