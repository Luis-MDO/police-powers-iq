/* The entry screen works immediately; 3D is an optional, lazy enhancement. */
(() => {
  'use strict';
  const arrow='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';
  // A still scene of the open book, light and gold scales: the phone artwork and the 3D fallback.
  function poster() {
    const cx=990,spine=700,r=n=>Math.round(n),parts=[],rand=(()=>{let s=7;return()=>(s=(s*16807)%2147483647)/2147483647})();
    for(let x=-1400;x<=3400;x+=220)parts.push(`<path class="poster-line" d="M${cx} 610L${x} 1000"/>`);
    for(let z=1.3;z<14;z*=1.32)parts.push(`<path class="poster-line" d="M0 ${r(610+390/z)}H1600" opacity="${(1.3/z).toFixed(2)}"/>`);
    for(let i=0;i<26;i++)parts.push(`<circle class="poster-bokeh" cx="${r(rand()*1600)}" cy="${r(rand()*620)}" r="${r(10+rand()*40)}" opacity="${(0.2+rand()*0.45).toFixed(2)}"/>`);
    for(const [x,w,top,bottom] of [[110,96,0,770],[300,66,60,705],[430,48,135,668],[525,36,195,646]])for(const mx of [x,1980-x]){
      parts.push(`<rect class="poster-column" x="${mx-w/2}" y="${top}" width="${w}" height="${bottom-top}"/>`);
      const flame=mx<cx?mx+w*0.9:mx-w*0.9,height=w*0.5;
      parts.push(`<rect class="poster-candle" x="${r(flame-w*0.08)}" y="${r(bottom-height)}" width="${r(w*0.16)}" height="${r(height)}"/><circle class="poster-flame" cx="${r(flame)}" cy="${r(bottom-height-w*0.14)}" r="${r(w*0.32)}"/>`);
    }
    parts.push(`<path class="poster-ray" d="M925 ${spine-10}h130l260 ${-spine+10}H665z"/><ellipse class="poster-glow" cx="${cx}" cy="${spine-30}" rx="360" ry="210"/>`);
    // Each half of the book: a leather board under a fan of curved pages.
    const half=`<path class="poster-leather" d="M${cx} 752C900 744 760 738 622 722L630 698C770 712 900 718 ${cx} 730z"/>${[5,4,3,2,1,0].map(k=>{const y=spine+k*7;return `<path class="poster-paper" d="M${cx} ${y}C940 ${y-50} 790 ${y-44} 642 ${y-8}L644 ${y+3}C790 ${y-32} 940 ${y-38} ${cx} ${y+10}z"/>`}).join('')}`;
    parts.push(`<g>${half}</g><g transform="translate(${2*cx} 0) scale(-1 1)">${half}<path class="poster-paper poster-turn" d="M${cx} ${spine}C940 ${spine-56} 790 ${spine-52} 642 ${spine-14}L644 ${spine-3}C790 ${spine-38} 940 ${spine-44} ${cx} ${spine+10}z"/></g>`);
    for(let i=0;i<16;i++)parts.push(`<circle class="poster-spark" style="animation-delay:-${(i*0.37).toFixed(2)}s" cx="${r(cx-220+rand()*440)}" cy="${r(spine-40-rand()*120)}" r="${(1.5+rand()*2.5).toFixed(1)}"/>`);
    // Gold scales standing in the gutter.
    const pan=x=>`<path class="poster-chain" d="M${x} 362L${x-62} 560M${x} 362L${x+62} 560M${x} 362L${x} 566"/><path class="poster-gold" d="M${x-72} 560h144c-12 42-132 42-144 0z"/>`;
    parts.push(`<g class="poster-scales"><path class="poster-gold" d="M950 704c6-16 74-16 80 0zM972 690h36l-4-12h-28z"/><rect class="poster-gold" x="984" y="340" width="12" height="340"/>${[[640,13],[540,10],[430,9]].map(([y,w])=>`<ellipse class="poster-gold" cx="${cx}" cy="${y}" rx="${w}" ry="6"/>`).join('')}<path class="poster-gold" d="M${cx} 286l12 22-12 22-12-22z"/><path class="poster-beam" d="M820 362H1160"/><circle class="poster-gold" cx="${cx}" cy="362" r="13"/><circle class="poster-gold" cx="820" cy="362" r="8"/><circle class="poster-gold" cx="1160" cy="362" r="8"/>${pan(820)}${pan(1160)}</g>`);
    for(const [x,y,size,text,o] of [[260,250,44,'§',.45],[1380,170,30,'s. 8 · search or seizure',.4],[150,560,26,'s. 495 · arrest without warrant',.32],[1300,520,28,'s. 487 · search warrant',.35],[620,120,24,'s. 10(b) · counsel',.32],[1500,700,38,'§',.28],[220,850,24,'R v Feeney',.28],[1240,860,24,'RICE',.3]])
      parts.push(`<text class="poster-glyph" x="${x}" y="${y}" font-size="${size}" opacity="${o}">${text}</text>`);
    const defs='<defs><radialGradient id="posterGlow"><stop stop-color="#ffd27a" stop-opacity=".6"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient><radialGradient id="posterBokeh"><stop stop-color="#ffc96b" stop-opacity=".9"/><stop offset=".6" stop-color="#ffb347" stop-opacity=".35"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient><linearGradient id="posterRay" x1="0" y1="1" x2="0" y2="0"><stop stop-color="#ffe2a0" stop-opacity=".7"/><stop offset="1" stop-color="#ffe2a0" stop-opacity="0"/></linearGradient><linearGradient id="posterGold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff0b8"/><stop offset=".45" stop-color="#d79b34"/><stop offset=".7" stop-color="#ffe39a"/><stop offset="1" stop-color="#8a5a16"/></linearGradient><linearGradient id="posterPaper" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fbf1da"/><stop offset="1" stop-color="#dcc69a"/></linearGradient></defs>';
    return `<svg class="landing-scales-fallback landing-poster" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">${defs}${parts.join('')}</svg>`;
  }
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
  // The full opening plays once per page load; returning to exam selection shows the page at once.
  let introPlayed=false;
  function mount(host,{midterm,final}) {
    const fly=(direction,delay)=>`data-fly="${direction}" style="--fly-delay:${delay}s"`;
    host.innerHTML=`<section class="landing-page" aria-labelledby="landingTitle"><div class="landing-toolbar" ${fly('down',0)}><span>YOUR PATH TO EXAM DAY</span><span class="landing-toolbar-actions"><button type="button" class="motion-control landing-skip" id="landingSkip" hidden>Skip intro</button><button type="button" class="motion-control" id="landingMotion" aria-pressed="false">Pause motion</button></span></div><div class="landing-hero"><div class="landing-copy"><div class="eyebrow" ${fly('left',.05)}><span class="landing-dot"></span> PREPARE WITH PURPOSE</div><h1 id="landingTitle"><span ${fly('left',.15)}>Find your</span> <em ${fly('right',.3)}>balance.</em> <span ${fly('up',.45)}>Own your powers.</span></h1><p class="landing-intro" ${fly('left',.6)}>Clearer thinking. Stronger foundations.<br>Your space to understand Canadian police law—and walk into your exam with confidence.</p><div class="landing-assurance" ${fly('up',.72)}><span>Independent study</span><span>Canadian legal sources</span></div></div></div><div class="landing-section-label" ${fly('up',.8)}><span>CHOOSE YOUR NEXT CHALLENGE</span><span class="small">One step closer to ready.</span></div><div class="exam-choices"><article class="exam-choice exam-choice-midterm" ${fly('left',.9)}><div class="exam-card-top"><span class="exam-card-icon" aria-hidden="true">01 /</span><span class="exam-badge">AVAILABLE NOW</span></div><h2>Midterm</h2><p>Your foundations, all in one place. Explore the study guide, practise by topic, and put yourself to the test.</p><ul class="exam-card-facts"><li>5 legal topics</li><li>${(window.PPIQ_QUESTIONS||[]).length} question items</li><li>30-minute mock exam</li></ul><button type="button" class="exam-enter" id="chooseMidterm">Explore Midterm ${arrow}</button></article><article class="exam-choice exam-choice-final" ${fly('right',1.05)}><div class="exam-card-top"><span class="exam-card-icon" aria-hidden="true">02 /</span><span class="exam-badge exam-badge-soon">COMING SOON</span></div><h2>Final exam</h2><p>The next chapter in your preparation. A dedicated space for your final study material is on its way.</p><div class="exam-coming-note">More knowledge. The same clear focus.</div><button type="button" class="exam-enter exam-enter-secondary" id="chooseFinal">View Final exam ${arrow}</button></article></div><p class="landing-footnote" ${fly('up',1.15)}>Your progress stays on this device. Pick up your midterm preparation whenever you’re ready.</p></section>`;
    const background=document.createElement('div');
    background.className='landing-art';background.setAttribute('aria-hidden','true');
    background.innerHTML=`<div class="landing-atmosphere"></div><div class="landing-scene" id="landingScene">${poster()}</div><div class="landing-backdrop-veil"></div>`;
    document.body.prepend(background);
    document.body.classList.add('landing-active');
    let alive=true,scene=null,paused=false,pending=false;
    const section=host.querySelector('.landing-page');
    const sceneHost=background.querySelector('#landingScene'),motion=matchMedia('(prefers-reduced-motion: reduce)');
    // Phones keep the still poster; the WebGL scene needs tablet width or wider.
    const roomy=matchMedia('(min-width: 768px)');
    const pause=host.querySelector('#landingMotion'),skipButton=host.querySelector('#landingSkip');
    // Content waits for the opening (book, light, then scales) and flies in afterwards; any input skips ahead.
    const staged=!motion.matches&&!introPlayed;
    const cinematic=staged&&roomy.matches&&!navigator.connection?.saveData;
    introPlayed=true;
    // The opening starts from a closed book, so the finished poster stays hidden unless 3D falls through.
    background.classList.toggle('landing-art-cinematic',cinematic);
    const fallBack=()=>background.classList.remove('landing-art-cinematic');
    let revealed=!staged,revealTimer;
    const skipEvents=['keydown','pointerdown','wheel','touchmove'];
    function reveal(){
      if(revealed)return;revealed=true;
      clearTimeout(revealTimer);skipButton.hidden=true;
      skipEvents.forEach(type=>removeEventListener(type,skip));
      section.classList.add('landing-revealed');
    }
    function skip(){scene?.skip();reveal()}
    if(staged){
      section.classList.add('landing-staged');
      skipButton.hidden=!cinematic;skipButton.onclick=skip;
      skipEvents.forEach(type=>addEventListener(type,skip,{passive:true}));
      revealTimer=setTimeout(reveal,cinematic?7000:1300);
    }
    pause.hidden=motion.matches;
    function preference(){pause.hidden=motion.matches;scene?.setPaused(paused||motion.matches);if(motion.matches)skip();load()}
    function fit(){
      if(roomy.matches)return load();
      scene?.dispose();scene=null;sceneHost.classList.remove('scene-ready');fallBack();
    }
    motion.addEventListener('change',preference);
    roomy.addEventListener('change',fit);
    pause.onclick=()=>{
      paused=!paused;
      if(paused)skip();
      scene?.setPaused(paused);
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
    let idle,loading=false;
    function load(){
      if(scene||loading||!roomy.matches||motion.matches||navigator.connection?.saveData)return;
      loading=true;clearTimeout(idle);
      idle=setTimeout(()=>{
        import('./assets/landing-scene.js').then(module=>{
          loading=false;
          if(!alive||scene||!roomy.matches||motion.matches)return;
          try{scene=module.createScene(sceneHost,{paused,intro:!revealed,onReveal:reveal})}catch(_){sceneHost.querySelector('canvas')?.remove()}
          if(!scene){fallBack();if(!revealed)revealTimer=setTimeout(reveal,600)}
        }).catch(()=>{
          loading=false;fallBack();/* The poster stays visible if 3D cannot load. */
          if(!revealed){clearTimeout(revealTimer);revealTimer=setTimeout(reveal,600)}
        });
      },cinematic?60:180);
    }
    load();
    return ()=>{
      alive=false;clearTimeout(idle);clearTimeout(revealTimer);
      skipEvents.forEach(type=>removeEventListener(type,skip));
      scene?.dispose();background.remove();document.body.classList.remove('landing-active');
      motion.removeEventListener('change',preference);roomy.removeEventListener('change',fit);
    };
  }
  function finalMarkup(){
    return `<section class="final-placeholder"><div class="final-placeholder-symbol" aria-hidden="true">02 /</div><div class="eyebrow">FINAL EXAM · COMING SOON</div><h1>Your next chapter<br>is <span>on its way.</span></h1><p class="sub">Final exam material is not available yet.</p><p class="small">This space will bring your final study guide, practice questions and mock exams together when the material is ready.</p><div class="actions"><button id="finalToMidterm" type="button" class="primary">Explore Midterm →</button><button id="finalToLanding" type="button" class="ghost">← Choose exam</button></div></section>`;
  }
  window.PPIQ_LANDING={mount,transition,finalMarkup};
})();
