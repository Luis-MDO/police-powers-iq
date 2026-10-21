"""Integration checks for the static site. Requires Playwright and Chromium."""
import collections
import copy
import functools
import http.server
import json
import os
from pathlib import Path
import shutil
import threading
import unittest
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
QUESTIONS = json.loads((ROOT / 'questions.js').read_text().split('=', 1)[1].strip().rstrip(';'))
BANK = {q['id']: q for q in QUESTIONS}
FEEDBACK = json.loads((ROOT / 'question-feedback.json').read_text())
AUTHORITIES = json.loads((ROOT / 'legal-authorities.json').read_text())
ALLOWED_HOSTS = {'laws-lois.justice.gc.ca', 'decisions.scc-csc.ca', 'scc-csc.lexum.com', 'www.scc-csc.ca', 'www.rcmp-grc.gc.ca'}


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


class LegalFeedbackTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        handler = functools.partial(QuietHandler, directory=str(ROOT))
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = f'http://127.0.0.1:{cls.server.server_port}/'
        cls.playwright = sync_playwright().start()
        executable = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('chromium-browser')
        cls.browser = cls.playwright.chromium.launch(executable_path=executable, headless=True, args=['--no-sandbox'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self.context = self.browser.new_context()
        self.addCleanup(self.context.close)
        self.page = self.context.new_page()
        self.page.set_default_timeout(8000)
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))

    def assets(self, questions=None, feedback=None, authorities=None, instrument=False, landing=False):
        if questions is not None:
            self.page.route('**/questions.js', lambda route: route.fulfill(body='window.PPIQ_QUESTIONS=' + json.dumps(questions) + ';', content_type='application/javascript'))
        if feedback is not None:
            self.page.route('**/question-feedback.json', lambda route: route.fulfill(json=feedback))
        if authorities is not None:
            self.page.route('**/legal-authorities.json', lambda route: route.fulfill(json=authorities))
        if instrument:
            source = (ROOT / 'app.js').read_text().replace('})();', ';window.__audit={legalReviewQueue,eq,shuffle,sample,start,orderOptions,choose,check,finish,showQuestion,dashboard,s,get progress(){return progress}};})();')
            self.page.route('**/app.js', lambda route: route.fulfill(body=source, content_type='application/javascript'))
        self.page.route('**/assets/landing-scene.js',lambda route:route.abort())
        self.page.goto(self.url)
        self.page.locator('#chooseMidterm').wait_for()
        if landing:return
        self.page.locator('#chooseMidterm').click()
        self.page.locator('.guide-hero').wait_for()
        self.page.locator('#trainingTab').click()
        self.page.locator('#startBtn').wait_for()

    def choose(self, question, correct=True):
        options = question['correct'] if correct else [next(i for i in range(len(question['options'])) if i not in question['correct'])]
        for index in options:
            text = question['options'][index]
            for button in self.page.locator('[data-answer]').all():
                if button.locator('span').nth(1).inner_text() == text:
                    button.click()
                    break
            else:
                self.fail('Displayed option missing: ' + text)

    def test_landing_midterm_final_navigation_and_single_css_bundle(self):
        css_requests=[]
        self.page.on('request',lambda request:css_requests.append(request.url) if request.resource_type=='stylesheet' else None)
        self.assets(instrument=True,landing=True)
        self.assertTrue(self.page.locator('.landing-page').is_visible())
        self.assertEqual(self.page.locator('.landing-art').evaluate('(el)=>getComputedStyle(el).position'),'fixed')
        self.assertEqual(self.page.locator('.landing-art').bounding_box()['width'],self.page.viewport_size['width'])
        self.page.locator('#landingMotion').click()
        self.assertEqual(self.page.locator('#landingMotion').get_attribute('aria-pressed'),'true')
        self.assertTrue(self.page.locator('.landing-art').evaluate('(el)=>el.classList.contains("motion-paused")'))
        self.assertTrue(self.page.locator('#studyNav').is_hidden())
        self.assertTrue(self.page.locator('#chooseExamBtn').is_hidden())
        self.assertEqual(len(css_requests),1)
        self.assertTrue(css_requests[0].endswith('/styles.css'))
        # Failed optional 3D loading leaves a useful visual and working controls.
        self.assertTrue(self.page.locator('.landing-scales-fallback').is_visible())
        self.page.locator('#chooseFinal').click()
        self.page.locator('.final-placeholder').wait_for()
        self.assertEqual(self.page.locator('.landing-art').count(),0)
        self.assertIn('Final exam material is not available yet.',self.page.locator('#root').inner_text())
        self.assertEqual(self.page.locator('.question-area,.guide-hero').count(),0)
        self.assertEqual(self.page.evaluate('__audit.progress.attempts'),0)
        self.page.locator('#finalToMidterm').click()
        self.page.locator('.guide-hero').wait_for()
        self.assertEqual(self.page.locator('#root').get_attribute('data-view'),'guide')
        self.assertEqual(self.page.locator('.study-nav-button').first.get_attribute('id'),'studyGuideTab')
        self.assertIn('midterm',self.page.locator('#studyNav').inner_text().lower())
        self.page.locator('#trainingTab').click()
        self.assertTrue(self.page.locator('#startBtn').is_visible())
        self.page.locator('#chooseExamBtn').click()
        self.assertTrue(self.page.locator('.landing-page').is_visible())
        self.assertFalse(self.errors)

    def test_section_progress_uses_each_topic_denominator_and_persists(self):
        self.assets(instrument=True)
        self.page.locator('#studyGuideTab').click()
        expected={'1':5,'2':7,'3':4,'7':8,'8':8}
        for id,total in expected.items():
            self.page.locator('#guide-tab-'+id).click()
            panel=self.page.locator('#guide-panel-'+id)
            panel.locator('[data-guide-expand]').click()
            checkboxes=panel.locator('[data-guide-section]')
            self.assertEqual(checkboxes.count(),total)
            for n in range(total):
                panel.locator('.section-review').nth(n).click()
                exact=(n+1)/total*100
                # Math.round rounds positive ties up, unlike Python's round.
                displayed=int(exact+0.5)
                ring=self.page.locator('#guide-tab-'+id+' .review-ring')
                self.assertEqual(ring.locator('.review-ring-value').evaluate('(el)=>el.childNodes[0].textContent'),str(displayed)+'%')
                dash=ring.locator('.review-ring-fill').get_attribute('stroke-dasharray')
                self.assertAlmostEqual(float(dash.split()[0]),exact)
                self.assertEqual(ring.locator('.review-ring-check').count(),int(n+1==total))
            # Unchecking reverses the exact ratio and removes completion state.
            panel.locator('.section-review').last.click()
            self.assertEqual(self.page.locator('#guide-tab-'+id+' .review-ring-check').count(),0)
            panel.locator('.section-review').last.click()
        self.assertIn('32 of 32',self.page.locator('#guideReviewCount').inner_text())
        self.assertEqual(self.page.locator('[data-guide-reviewed]').count(),0)
        self.assertEqual(self.page.evaluate('__audit.progress.attempts'),0)
        self.assertEqual(self.page.evaluate('__audit.progress.seen'),[])
        self.page.reload()
        self.page.locator('#chooseMidterm').click()
        self.page.locator('.guide-hero').wait_for()
        self.assertIn('32 of 32',self.page.locator('#guideReviewCount').inner_text())
        self.assertEqual(self.page.locator('.review-ring-check').count(),5)
        self.assertFalse(self.errors)

    def test_legacy_topic_completion_migrates_and_reset_clears_sections(self):
        self.page.add_init_script("localStorage.setItem('ppiq_guide_v1',JSON.stringify({selected:'2',reviewed:{'2':true,'8':true}}))")
        self.assets(instrument=True)
        self.page.locator('#studyGuideTab').click()
        self.assertIn('15 of 32',self.page.locator('#guideReviewCount').inner_text())
        self.assertTrue(self.page.locator('#guide-panel-2').is_visible())
        self.assertEqual(self.page.locator('#guide-tab-2 .review-ring-value').evaluate('(el)=>el.childNodes[0].textContent'),'100%')
        self.page.locator('#guide-panel-2 .section-review').first.click()
        stored=self.page.evaluate('JSON.parse(localStorage.getItem("ppiq_guide_v1"))')
        self.assertEqual(stored['schemaVersion'],2)
        self.assertEqual(len(stored['sections']['2']),6)
        self.assertEqual(len(stored['sections']['8']),8)
        self.page.locator('#trainingTab').click()
        self.page.once('dialog',lambda d:d.accept())
        self.page.locator('#clearBtn').click()
        self.page.locator('#studyGuideTab').click()
        self.assertIn('0 of 32',self.page.locator('#guideReviewCount').inner_text())
        self.assertFalse(self.errors)

    def test_exam_selection_exit_confirms_submission_and_cannot_resume_exam(self):
        self.assets(instrument=True)
        self.page.locator('[data-mode="exam"]').click()
        self.page.locator('#startBtn').click()
        self.page.evaluate('__audit.choose(__audit.s.pool[0].shownCorrect[0])')
        self.page.once('dialog',lambda d:d.dismiss())
        self.page.locator('#chooseExamBtn').click()
        self.assertTrue(self.page.locator('.question-area').is_visible())
        self.page.once('dialog',lambda d:d.accept())
        self.page.locator('#chooseExamBtn').click()
        self.assertTrue(self.page.locator('.landing-page').is_visible())
        self.assertEqual(self.page.evaluate('__audit.progress.attempts'),1)
        self.assertTrue(self.page.evaluate('__audit.s.final'))
        self.assertIsNone(self.page.evaluate('localStorage.getItem("ppiq_session_v1")'))
        self.page.locator('#chooseMidterm').click()
        self.page.locator('.guide-hero').wait_for()
        self.page.locator('#trainingTab').click()
        self.assertEqual(self.page.locator('#resumeBtn').count(),0)
        self.assertFalse(self.errors)

    def test_landing_reduced_motion_keyboard_and_responsive_layout(self):
        self.page.emulate_media(reduced_motion='reduce')
        scene_requests=[]
        self.page.on('request',lambda request:scene_requests.append(request.url) if '/assets/landing-scene.js' in request.url else None)
        self.assets(landing=True)
        for width in [320,375,768,1280]:
            self.page.set_viewport_size({'width':width,'height':850})
            for theme in ['light','dark']:
                self.page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme)
                self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'),width)
                self.assertGreaterEqual(self.page.locator('#chooseMidterm').bounding_box()['height'],44)
        self.assertTrue(self.page.locator('#landingMotion').is_hidden())
        self.assertEqual(scene_requests,[])
        self.page.locator('#chooseFinal').focus()
        self.page.keyboard.press('Enter')
        self.page.locator('.final-placeholder').wait_for()
        self.assertEqual(self.page.locator('.exam-portal').count(),0)
        self.page.locator('#finalToLanding').click()
        self.assertTrue(self.page.locator('.landing-page').is_visible())
        self.assertFalse(self.errors)

    def test_study_guide_topics_notes_and_primary_sources(self):
        self.assets(instrument=True)
        self.page.locator('#studyGuideTab').click()
        names={'1':'Sources of Police Powers','2':'Arrest Powers','3':'Location of Arrest & Feeney','7':'Warrantless Search & Seizure','8':'Search With a Warrant'}
        self.assertEqual(self.page.locator('#studyGuideTab').get_attribute('aria-current'),'page')
        self.assertEqual(self.page.get_by_role('tab').count(),5)
        for id,name in names.items():
            self.page.locator('#guide-tab-'+id).click()
            panel=self.page.locator('#guide-panel-'+id)
            self.assertTrue(panel.is_visible())
            self.assertEqual(panel.locator('h2').inner_text(),name)
            panel.locator('[data-guide-expand]').click()
            self.assertTrue(panel.locator('details.guide-card').evaluate_all('(nodes)=>nodes.every(n=>n.open)'))
            for note in panel.locator('[data-guide-note]').all():
                qid=note.get_attribute('data-guide-note')
                self.assertEqual(str(BANK[qid]['chapter']),id)
                record=FEEDBACK['feedback'][qid]
                if record['reviewStatus']=='needs_review':
                    self.assertIn('Legal review pending',note.inner_text())
                    self.assertNotIn(record['explanation'],note.inner_text())
                else:
                    self.assertIn(record['explanation'],note.inner_text())
            for link in panel.locator('.guide-citations a').all():
                self.assertEqual(urlsplit(link.get_attribute('href')).scheme,'https')
                self.assertIn(urlsplit(link.get_attribute('href')).hostname,ALLOWED_HOSTS)
        # The complete A-version concept set covers the supplied topic outline.
        self.assertEqual(self.page.locator('[data-guide-note]').count(),95)
        text=self.page.locator('#root').text_content()
        for absent in ["Professor",'Chapter 1','90 minutes','1:45 PM','Your answer:','Correct answer:']:
            self.assertNotIn(absent,text)
        self.assertFalse(self.errors)

    def test_study_guide_review_checklist_keyboard_and_topic_practice(self):
        self.assets(instrument=True)
        self.page.locator('#studyGuideTab').click()
        self.page.locator('#guide-tab-1').focus()
        self.page.keyboard.press('ArrowDown')
        self.assertEqual(self.page.locator('#guide-tab-2').get_attribute('aria-selected'),'true')
        self.page.locator('#guide-panel-2 .section-review').first.click()
        self.assertIn('1 of 32',self.page.locator('#guideReviewCount').inner_text())
        self.assertEqual(self.page.evaluate('__audit.progress.attempts'),0)
        self.assertEqual(self.page.evaluate('__audit.progress.seen'),[])
        self.page.reload()
        self.page.locator('#chooseMidterm').click()
        self.page.locator('.guide-hero').wait_for()
        self.assertTrue(self.page.locator('#guide-panel-2').is_visible())
        self.assertTrue(self.page.locator('[data-guide-section^="2:"]').first.is_checked())
        self.page.locator('[data-guide-practice="2"]').click()
        self.assertEqual(self.page.evaluate('__audit.s.mode'),'practice')
        self.assertTrue(self.page.evaluate('__audit.s.pool.every(q=>q.chapter===2)'))
        self.assertEqual(self.page.evaluate('__audit.s.pool.length'),10)
        self.assertEqual(self.page.locator('#trainingTab').get_attribute('aria-current'),'page')
        self.assertFalse(self.errors)

    def test_study_guide_preserves_practice_and_confirms_replacement(self):
        self.assets(instrument=True)
        self.page.locator('#startBtn').click()
        self.page.locator('[data-answer]').first.click()
        self.page.locator('#checkBtn').click()
        snapshot=self.page.evaluate('JSON.parse(localStorage.getItem("ppiq_session_v1"))')
        self.page.locator('#studyGuideTab').click()
        self.page.once('dialog',lambda d:d.dismiss())
        self.page.locator('[data-guide-practice="1"]').click()
        self.assertTrue(self.page.locator('.guide-hero').is_visible())
        self.page.locator('#trainingTab').click()
        self.page.locator('#resumeBtn').click()
        self.assertEqual(self.page.evaluate('__audit.s.id'),snapshot['id'])
        self.assertEqual(self.page.evaluate('__audit.s.answers'),snapshot['answers'])
        self.assertEqual(self.page.evaluate('__audit.s.checked'),snapshot['checked'])
        self.assertEqual(self.page.evaluate('__audit.s.pool.map(q=>({id:q.id,order:q.optionOrder}))'),snapshot['pool'])
        self.assertTrue(self.page.locator('[data-answer]').first.is_disabled())
        self.assertFalse(self.errors)

    def test_study_guide_cannot_bypass_exam_exit_rules(self):
        self.assets(instrument=True)
        self.page.locator('[data-mode="exam"]').click()
        self.page.locator('#startBtn').click()
        self.page.evaluate('__audit.choose(__audit.s.pool[0].shownCorrect[0])')
        self.page.once('dialog',lambda d:d.dismiss())
        self.page.locator('#studyGuideTab').click()
        self.assertTrue(self.page.locator('.question-area').is_visible())
        self.assertEqual(self.page.locator('.guide-hero').count(),0)
        self.assertFalse(self.page.evaluate('__audit.s.final'))
        self.page.once('dialog',lambda d:d.accept())
        self.page.locator('#studyGuideTab').click()
        self.assertTrue(self.page.locator('.guide-hero').is_visible())
        self.assertTrue(self.page.evaluate('__audit.s.final'))
        self.assertEqual(self.page.evaluate('__audit.progress.attempts'),1)
        self.assertEqual(self.page.evaluate('__audit.progress.scoreSum'),3)
        self.assertIsNone(self.page.evaluate('localStorage.getItem("ppiq_session_v1")'))
        self.page.locator('#trainingTab').click()
        self.assertEqual(self.page.locator('#resumeBtn').count(),0)
        self.assertFalse(self.errors)

    def test_study_guide_fails_closed_for_bad_legal_data_and_escapes_notes(self):
        feedback=copy.deepcopy(FEEDBACK)
        feedback['feedback']['Q001A']['explanation']='<img src=x onerror=alert(1)> Safe as text'
        feedback['feedback']['Q002A']['correctOptionIndices']=[99]
        feedback['feedback']['Q065A']['explanation']='DO NOT PUBLISH PENDING CONSENT CLAIM'
        self.assets(feedback=feedback,instrument=True)
        self.page.locator('#studyGuideTab').click()
        self.assertIn('<img src=x',self.page.locator('[data-guide-note="Q001A"]').inner_text())
        self.assertEqual(self.page.locator('.guide-note img').count(),0)
        self.assertIn('Legal review pending',self.page.locator('[data-guide-note="Q002A"]').inner_text())
        self.assertNotIn('DO NOT PUBLISH',self.page.locator('#root').text_content())
        self.assertFalse(self.errors)

    def test_study_guide_storage_failure_and_responsive_themes(self):
        self.page.add_init_script("Storage.prototype.setItem=function(){throw new Error('Storage unavailable')}")
        self.assets(instrument=True)
        self.page.locator('#studyGuideTab').click()
        self.page.locator('#guide-panel-1 .section-review').first.click()
        self.assertIn('storage is unavailable',self.page.locator('#guideSaveStatus').inner_text())
        self.assertIn('1 of 32',self.page.locator('#guideReviewCount').inner_text())
        for width in [320,375,768,1280]:
            self.page.set_viewport_size({'width':width,'height':900})
            for theme in ['dark','light']:
                self.page.evaluate('(theme)=>document.documentElement.dataset.theme=theme',theme)
                for id in ['1','2','3','7','8']:
                    self.page.locator('#guide-tab-'+id).click()
                    self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'),width)
                    self.assertTrue(self.page.locator('#guide-panel-'+id).is_visible())
                    self.assertGreaterEqual(self.page.locator('#guide-tab-'+id).bounding_box()['height'],44)
                if width in [375,1280]:
                    self.page.screenshot(path=f'/tmp/ppiq-guide-{theme}-{width}.png',full_page=True)
        self.assertFalse(self.errors)

    def test_catalogue_and_all_230_contracts(self):
        expected = {f'Q{n:03}{suffix}' for n in range(1, 96) for suffix in 'AB'} | {f'F{n:03}' for n in range(1, 31)} | {f'M{n:03}' for n in range(1, 11)}
        self.assertEqual(set(BANK), expected)
        self.assertEqual(set(FEEDBACK['feedback']), expected)
        self.assertEqual(len(QUESTIONS), 230)
        self.assertEqual(collections.Counter(q['type'] for q in QUESTIONS), {'single': 105, 'tf': 95, 'cloze': 30})
        for id, source in AUTHORITIES['authorities'].items():
            with self.subTest(authority=id):
                url = urlsplit(source['url'])
                self.assertEqual(url.scheme, 'https')
                self.assertIn(url.hostname, ALLOWED_HOSTS)
                self.assertFalse(url.username or url.password)
                self.assertNotIn('/cases-dossiers/', url.path)
        for q in QUESTIONS:
            with self.subTest(id=q['id']):
                r = FEEDBACK['feedback'][q['id']]
                self.assertEqual(r['questionId'], q['id'])
                self.assertEqual(r['correctOptionIndices'], q['correct'])
                self.assertEqual(len(set(q['correct'])), len(q['correct']))
                self.assertTrue(all(isinstance(i, int) and 0 <= i < len(q['options']) for i in q['correct']))
                self.assertTrue(set(r['authorityIds']) <= set(AUTHORITIES['authorities']))
                self.assertIn(r['reviewStatus'], {'verified', 'study_aid', 'needs_review'})
                if r['reviewStatus'] != 'needs_review':
                    self.assertTrue(r['authorityIds'])
                    self.assertTrue(all(AUTHORITIES['authorities'][a]['verificationStatus'] == 'verified' for a in r['authorityIds']))
                    self.assertNotRegex(r['explanation'].lower(), r'professor|slides|chapter')
        self.assertEqual(AUTHORITIES['authorities']['HYBRID']['url'], 'https://laws-lois.justice.gc.ca/eng/acts/I-21/section-34.html')
        self.assertIn('BENCH', FEEDBACK['feedback']['Q038A']['authorityIds'])
        self.assertIn('writing', BANK['Q086A']['options'][0])
        self.assertNotIn('personal appearance', BANK['Q086A']['options'][0])
        self.assertIn('public safety', BANK['Q061A']['options'][0])
        for q in QUESTIONS:
            if q['type'] == 'tf':
                self.assertNotIn('correct response to the question', q['question'])
                # Original 95 truth values are a saved bank contract.
                self.assertEqual(q['correct'], [int(q['id'][1:4]) % 2 == 0])

    def test_followup_support_and_unresolved_items(self):
        unresolved = {'Q065A', 'Q065B', 'Q070A', 'Q070B', 'Q092A', 'Q092B', 'M007'}
        self.assertEqual({id for id, r in FEEDBACK['feedback'].items() if r['reviewStatus'] == 'needs_review'}, unresolved)
        self.assertIn('SALITURO', FEEDBACK['feedback']['Q008A']['authorityIds'])
        self.assertIn('COTE', FEEDBACK['feedback']['Q082A']['authorityIds'])
        self.assertIn('FORM5', FEEDBACK['feedback']['Q093A']['authorityIds'])
        self.assertIn('YUMNU', FEEDBACK['feedback']['Q095A']['authorityIds'])
        self.assertIn('material', BANK['Q081A']['question'])
        self.assertNotIn('Four Ps', BANK['Q027A']['question'])
        self.assertNotIn('decision-making model', BANK['Q037A']['question'])
        self.assertIn('habeas corpus', BANK['M003']['statements'][2])
        self.assertEqual(FEEDBACK['feedback']['M003']['correctOptionIndices'], [2])
        # These distinctions prevent case facts or unrelated powers being overstated.
        self.assertIn('shared computer', FEEDBACK['feedback']['Q066A']['explanation'])
        self.assertIn('CDSA', FEEDBACK['feedback']['Q091A']['explanation'])
        self.assertIn('justice directs', FEEDBACK['feedback']['Q093A']['explanation'])

    def test_every_item_in_practice_and_final_review(self):
        self.assets(instrument=True)
        result = self.page.evaluate('''() => {
          const a=window.__audit; let count=0;
          for(const q of window.PPIQ_QUESTIONS){
            const mapped={...q,shownOptions:q.options,shownCorrect:q.correct};
            Object.assign(a.s,{id:window.PPIQ_STUDY.sessionId(),started:Date.now(),deadline:Date.now()+window.PPIQ_STUDY.EXAM_MS,pool:[mapped],at:0,answers:{[q.id]:q.correct},checked:{[q.id]:true},mode:'practice',final:false});
            a.showQuestion();
            const expected=window.PPIQ_LEGAL.isReviewed(q);
            const feedback=document.querySelector('.feedback');
            if(!!feedback.querySelector('.legal-explanation')!==expected)throw Error(q.id+': wrong verification state');
            if(!expected&&!feedback.querySelector('.legal-status.pending'))throw Error(q.id+': missing pending state');
            if(/professor|slides|Chapter \\d/i.test(feedback.textContent))throw Error(q.id+': professor source leaked');
            if([...feedback.querySelectorAll('p > b')].some(b=>/^(Your answer:|Correct answer:|Recorded answer key)/.test(b.textContent)))throw Error(q.id+': redundant comparison for a matching answer');
            const practice=feedback.querySelector('.legal-authorities').innerHTML;
            a.finish();
            const review=document.querySelector('.result-item');
            if(review.querySelector('.legal-authorities').innerHTML!==practice)throw Error(q.id+': sources differ between surfaces');
            if(!!review.querySelector('.legal-explanation')!==expected)throw Error(q.id+': final review state differs');
            if([...review.querySelectorAll('p > b')].some(b=>/^(Your answer:|Correct answer:|Recorded answer key)/.test(b.textContent)))throw Error(q.id+': redundant comparison in final review');
            for(const link of review.querySelectorAll('a')){
              if(new URL(link.href).protocol!=='https:'||link.target!=='_blank'||link.rel!=='noopener noreferrer')throw Error(q.id+': unsafe link');
            }
            count++;
          }
          return count;
        }''')
        self.assertEqual(result, 230)
        self.assertFalse(self.errors)

    def test_exhaustive_option_mapping_and_exact_set_grading(self):
        self.assets(instrument=True)
        result = self.page.evaluate('''() => {
          const eq=window.__audit.eq;let cases=0;
          function permutations(xs){return xs.length?xs.flatMap((v,i)=>permutations(xs.filter((_,j)=>j!==i)).map(p=>[v,...p])):[[]]}
          for(const q of window.PPIQ_QUESTIONS)for(const order of permutations(q.options.map((_,i)=>i))){
            const key=q.correct.map(i=>order.indexOf(i));
            for(let mask=0;mask<(1<<order.length);mask++){
              const selected=order.map((_,i)=>i).filter(i=>mask&(1<<i));
              const expected=selected.length===q.correct.length&&q.correct.every(i=>selected.some(j=>order[j]===i));
              if(eq(selected,key)!==expected)throw Error(q.id+': wrong shuffled grade');cases++;
            }
          }return cases;
        }''')
        self.assertEqual(result, 87160)

    def test_actual_practice_all_scantron_formats_correct_and_wrong(self):
        for id in ['Q001A', 'Q001B', 'M006', 'F001']:
            for correct in [True, False]:
                with self.subTest(id=id, correct=correct):
                    self.page.unroute_all()
                    q = BANK[id]
                    self.assets(questions=[q])
                    self.page.locator('#startBtn').click()
                    self.choose(q, correct)
                    self.page.locator('#checkBtn').click()
                    self.assertEqual(self.page.locator('.feedback .legal-explanation').count(), 1)
                    self.assertGreater(self.page.locator('.feedback a').count(), 0)
                    self.assertEqual(self.page.locator('#checkBtn').count(), 0)
                    self.assertTrue(all(button.is_disabled() for button in self.page.locator('[data-answer]').all()))
                    self.page.locator('#nextBtn').click()
                    self.assertIn('100%' if correct else '0%', self.page.locator('h1').inner_text())
                    self.assertGreater(self.page.locator('.result-item a').count(), 0)
        self.assertFalse(self.errors)

    def test_single_selection_and_repeated_submission_for_all_converted_items(self):
        self.assets(instrument=True)
        result = self.page.evaluate('''() => {
          const a=window.__audit,out=[];
          for(const q of window.PPIQ_QUESTIONS.filter(q=>q.answerStyle==='most_complete'))for(const mode of ['practice','exam']){
            const before=a.progress.attempts;
            Object.assign(a.s,{id:window.PPIQ_STUDY.sessionId(),started:Date.now(),deadline:Date.now()+window.PPIQ_STUDY.EXAM_MS,pool:[{...q,shownOptions:q.options,shownCorrect:q.correct}],at:0,answers:{},checked:{},mode,final:false});
            a.showQuestion();a.choose(0);a.choose(1);
            if(JSON.stringify(a.s.answers[q.id])!=='[1]'||document.querySelectorAll('.answer.selected').length!==1)throw Error(q.id+': more than one selection');
            a.choose(q.correct[0]);
            if(mode==='practice'){
              a.check();a.check();const locked=JSON.stringify(a.s.answers);a.choose(0);
              if(JSON.stringify(a.s.answers)!==locked)throw Error('Checked answer changed');
            }else if(document.querySelector('.feedback'))throw Error('Exam feedback appeared early');
            a.finish();a.finish();if(a.progress.attempts-before!==1)throw Error('Repeated submission inflated attempts');
            if(!document.querySelector('h1').textContent.includes('100%'))throw Error(q.id+': wrong score');
            out.push(q.id+':'+mode);
          }return out;
        }''')
        self.assertEqual(len(result), 20)

    def test_scantron_combinations_and_all_above_stay_valid_when_shuffled(self):
        converted = [q for q in QUESTIONS if q.get('answerStyle') == 'most_complete']
        self.assertEqual(len(converted), 10)
        self.assertEqual(sum(bool(q.get('pinLastOption')) for q in converted), 5)
        for q in converted:
            self.assertEqual(q['type'], 'single')
            self.assertEqual(len(q['options']), 5)
            self.assertEqual(len(q['correct']), 1)
            self.assertFalse(any('only' in answer.lower() for answer in q['options']))
        self.assets(instrument=True)
        result = self.page.evaluate('''() => {
          const a=window.__audit,original=window.PPIQ_QUESTIONS;
          for(let iteration=0;iteration<30;iteration++){
            Object.assign(a.s,{count:230,chapter:'all',mode:'practice'});a.start();
            for(const q of a.s.pool.filter(q=>q.answerStyle==='most_complete')){
              if(q.pinLastOption){
                if(q.shownOptions[4]!=='All of the above'||q.shownCorrect.join()!=='4')throw Error(q.id+': positional answer moved');
              }else{
                if(q.shownOptions[q.shownCorrect[0]]!=='1, 2 and 3')throw Error(q.id+': wrong combination');
                if(JSON.stringify(q.statements)!==JSON.stringify(original.find(o=>o.id===q.id).statements))throw Error('Statement references changed');
              }
            }
          }
          return true;
        }''')
        self.assertTrue(result)
        self.page.unroute_all()
        q = BANK['M006']
        self.assets(questions=[q])
        self.page.locator('#startBtn').click()
        self.assertEqual(self.page.locator('.question-statements li').count(), 4)
        self.assertIn('Select the most complete correct answer', self.page.locator('.answer-instruction').inner_text())
        self.assertEqual(self.page.locator('.letter').all_inner_texts(), ['A', 'B', 'C', 'D', 'E'])
        self.assertEqual(self.page.locator('.q-card input[type="checkbox"]').count(), 0)

    def test_pool_counts_filters_unseen_and_no_quarantine(self):
        self.assets(instrument=True)
        result = self.page.evaluate('''() => {
          const a=window.__audit,all=window.PPIQ_QUESTIONS;
          for(const chapter of ['all','1','2','3','7','8'])for(const n of [10,15,20,25,30]){
            Object.assign(a.s,{mode:'practice',chapter,count:n});a.start();
            const available=all.filter(q=>chapter==='all'||String(q.chapter)===chapter).length;
            if(a.s.pool.length!==Math.min(n,available))throw Error('Pool size changed');
            if(new Set(a.s.pool.map(q=>q.id)).size!==a.s.pool.length)throw Error('Duplicate ID');
            if(chapter!=='all'&&a.s.pool.some(q=>String(q.chapter)!==chapter))throw Error('Wrong chapter');
          }
          a.progress.seen=all.slice(0,225).map(q=>q.id);const sampled=a.sample(all,10);
          if(sampled.slice(0,5).some(q=>a.progress.seen.includes(q.id)))throw Error('Unseen priority changed');
          a.progress.seen=all.map(q=>q.id);if(a.sample(all,30).length!==30)throw Error('Exhausted bank failed');
          Object.assign(a.s,{mode:'practice',chapter:'all',count:230});a.start();
          return {length:a.s.pool.length,pending:a.s.pool.filter(q=>!window.PPIQ_LEGAL.isReviewed(q)).length};
        }''')
        self.assertEqual(result, {'length': 230, 'pending': sum(record['reviewStatus'] == 'needs_review' for record in FEEDBACK['feedback'].values())})

    def test_existing_progress_survives_and_correct_retry_removes_mistake(self):
        self.assets(questions=[BANK['M006']])
        progress = {'seen': ['M006', 'Q002A', 'Q003A'], 'wrong': ['M006', 'Q002A'], 'correct': ['Q003A'], 'attempts': 4, 'scoreSum': 250}
        self.page.evaluate("p=>localStorage.setItem('policePowersIQ_v1',JSON.stringify(p))", progress)
        self.page.reload()
        self.page.locator('#chooseMidterm').click()
        self.page.locator('.guide-hero').wait_for()
        self.page.locator('#trainingTab').click()
        self.page.locator('#startBtn').wait_for()
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('policePowersIQ_v1'))"), progress)
        self.page.locator('#startBtn').click()
        self.choose(BANK['M006'])
        self.page.locator('#checkBtn').click()
        self.page.locator('#nextBtn').click()
        saved = self.page.evaluate("JSON.parse(localStorage.getItem('policePowersIQ_v1'))")
        self.assertEqual(saved['seen'], progress['seen'])
        self.assertEqual(saved['wrong'], ['Q002A'])
        self.assertEqual(saved['correct'], ['Q003A', 'M006'])
        self.assertEqual((saved['attempts'], saved['scoreSum']), (5, 350))
        self.page.reload()
        self.page.locator('#chooseMidterm').click()
        self.page.locator('.guide-hero').wait_for()
        self.page.locator('#trainingTab').click()
        self.page.locator('#startBtn').wait_for()
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('policePowersIQ_v1'))"), saved)

    def test_true_partial_answer_loses_to_all_of_the_above(self):
        q = BANK['M001']
        self.assets(questions=[q])
        self.page.locator('#startBtn').click()
        self.assertEqual(self.page.locator('[data-answer]').last.locator('span').nth(1).inner_text(), 'All of the above')
        # Every non-E option is true, but a partial answer does not satisfy the instruction.
        self.page.locator('[data-answer]').first.click()
        self.page.locator('#checkBtn').click()
        self.assertIn('Incorrect answer', self.page.locator('.feedback strong').inner_text())
        self.assertIn('All of the above', self.page.locator('.feedback').inner_text())
        self.page.locator('#nextBtn').click()
        self.assertIn('0%', self.page.locator('h1').inner_text())

    def test_missing_invalid_and_unreviewed_feedback_never_leaks_legacy(self):
        for scenario in ['missing_id', 'missing_authority', 'key_mismatch', 'mapped_only', 'unknown_status', 'invalid_schema']:
            with self.subTest(scenario=scenario):
                self.page.unroute_all()
                data = copy.deepcopy(FEEDBACK)
                record = data['feedback']['Q001A']
                if scenario == 'missing_id': del data['feedback']['Q001A']
                if scenario == 'missing_authority': record['authorityIds'] = ['DOES_NOT_EXIST']
                if scenario == 'key_mismatch': record['correctOptionIndices'] = [1]
                if scenario == 'mapped_only': record['reviewStatus'] = 'mapped_authority'
                if scenario == 'unknown_status': record['reviewStatus'] = 'trust_me'
                if scenario == 'invalid_schema': data['schemaVersion'] = 99
                record['explanation'] = 'UNVERIFIED_CLAIM_MUST_NOT_APPEAR'
                q = copy.deepcopy(BANK['Q001A'])
                q['explanation'] = 'LEGACY_CLAIM_MUST_NOT_APPEAR'
                self.assets(questions=[q], feedback=data)
                self.page.locator('#startBtn').click()
                self.choose(q)
                self.page.locator('#checkBtn').click()
                text = self.page.locator('.feedback').inner_text()
                self.assertIn('Pending legal verification', text)
                self.assertNotIn('UNVERIFIED_CLAIM', text)
                self.assertNotIn('LEGACY_CLAIM', text)
                self.page.locator('#nextBtn').click()
                self.assertIn('100%', self.page.locator('h1').inner_text())
                self.assertEqual(self.page.locator('.result-item .legal-explanation').count(), 0)
        self.assertFalse(self.errors)

    def test_failed_asset_fetch_still_allows_neutral_feedback(self):
        self.page.route('**/legal-authorities.json', lambda route: route.fulfill(status=503, body='Unavailable'))
        self.assets(questions=[BANK['Q001A']])
        self.page.locator('#startBtn').click()
        self.choose(BANK['Q001A'])
        self.page.locator('#checkBtn').click()
        self.assertIn('Legal source pending review', self.page.locator('.feedback').inner_text())
        self.assertEqual(self.page.locator('.feedback a').count(), 0)
        self.page.locator('#nextBtn').click()
        self.assertIn('100%', self.page.locator('h1').inner_text())
        self.assertFalse(self.errors)

    def test_https_allowlist_and_html_escaping(self):
        data = copy.deepcopy(FEEDBACK)
        catalogue = copy.deepcopy(AUTHORITIES)
        payload = '<img src=x onerror="window.__injected=true">'
        data['feedback']['Q001A']['explanation'] = payload
        data['feedback']['Q001A']['pinpoint'] = payload
        catalogue['authorities']['CONST1867']['title'] = payload
        self.assets(questions=[BANK['Q001A']], feedback=data, authorities=catalogue)
        self.page.locator('#startBtn').click()
        self.choose(BANK['Q001A'])
        self.page.locator('#checkBtn').click()
        self.assertIn(payload, self.page.locator('.feedback').inner_text())
        self.assertEqual(self.page.locator('.feedback img').count(), 0)
        self.assertIsNone(self.page.evaluate('window.__injected'))
        self.page.locator('#nextBtn').click()
        self.assertEqual(self.page.locator('.result-item img').count(), 0)
        unsafe = ['javascript:alert(1)', 'http://laws-lois.justice.gc.ca/', '//laws-lois.justice.gc.ca/', 'https://evil.example/', 'https://laws-lois.justice.gc.ca@evil.example/', 'https://user:password@laws-lois.justice.gc.ca/', 'https://laws-lois.justice.gc.ca:444/']
        for url in unsafe:
            self.assertIsNone(self.page.evaluate('url=>window.PPIQ_LEGAL.safeUrl(url)', url))
        malicious = copy.deepcopy(AUTHORITIES)
        malicious['authorities']['CONST1867']['url'] = 'javascript:alert(1)'
        self.page.unroute_all()
        self.assets(questions=[BANK['Q001A']], authorities=malicious)
        self.page.locator('#startBtn').click()
        self.choose(BANK['Q001A'])
        self.page.locator('#checkBtn').click()
        self.assertEqual(self.page.locator('.feedback a').count(), 0)
        self.assertIn('Pending legal verification', self.page.locator('.feedback').inner_text())

    def test_mock_exam_no_feedback_until_submission_then_linked_review(self):
        self.assets()
        self.page.locator('[data-mode="exam"]').click()
        self.page.locator('#startBtn').click()
        first = next(q for q in QUESTIONS if q['question'] == self.page.locator('.q-title').inner_text())
        self.choose(first)
        selected = self.page.locator('.answer.selected').count()
        self.assertEqual(self.page.locator('.feedback').count(), 0)
        self.assertEqual(self.page.locator('.legal-authorities').count(), 0)
        self.page.locator('#nextBtn').click()
        self.page.locator('#prevBtn').click()
        self.assertEqual(self.page.locator('.answer.selected').count(), selected)
        self.page.on('dialog', lambda dialog: dialog.accept())
        for _ in range(40): self.page.locator('#nextBtn').click()
        self.assertEqual(self.page.locator('.result-item').count(), 40)
        self.assertIn('3%', self.page.locator('h1').inner_text())
        self.assertGreater(self.page.locator('.result-item .legal-authorities a').count(), 0)
        self.assertNotRegex(self.page.locator('.result-list').inner_text(), r'Professor|supplied slides')
        self.assertFalse(self.errors)

    def test_sources_fit_mobile_and_desktop(self):
        for id in ['Q062A', 'M001', 'M006']:
            self.page.unroute_all()
            self.assets(questions=[BANK[id]])
            self.page.locator('#startBtn').click()
            self.choose(BANK[id])
            self.page.locator('#checkBtn').click()
            for width in [320, 375, 1280]:
                self.page.set_viewport_size({'width': width, 'height': 850})
                self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'), width)
                self.assertTrue(self.page.locator('.feedback a').first.is_visible())


    def test_theme_keyboard_persistence_and_progress_isolation(self):
        self.page.emulate_media(color_scheme='dark')
        self.assets(instrument=True)
        self.assertEqual(self.page.locator('html').get_attribute('data-theme'), 'dark')
        before = self.page.evaluate('localStorage.getItem("policePowersIQ_v1")')
        self.page.locator('#themeToggle').focus()
        self.page.keyboard.press('Enter')
        self.assertEqual(self.page.locator('html').get_attribute('data-theme'), 'light')
        self.page.reload()
        self.page.locator('#chooseMidterm').click()
        self.page.locator('.guide-hero').wait_for()
        self.page.locator('#trainingTab').click()
        self.page.locator('#startBtn').wait_for()
        self.assertEqual(self.page.locator('html').get_attribute('data-theme'), 'light')
        self.page.locator('#startBtn').click()
        self.page.get_by_role('button', name='Switch to dark mode').click()
        self.assertEqual(self.page.locator('html').get_attribute('data-theme'), 'dark')
        self.assertEqual(self.page.evaluate('localStorage.getItem("policePowersIQ_v1")'), before)
        self.assertIn('Luis MdO', self.page.locator('footer').inner_text())
        self.assertFalse(self.errors)

    def test_themes_responsive_and_reduced_motion(self):
        self.page.emulate_media(color_scheme='light', reduced_motion='reduce')
        self.assets()
        self.assertEqual(self.page.locator('html').get_attribute('data-theme'), 'light')
        self.assertEqual(self.page.locator('.law-tile').evaluate('(e)=>getComputedStyle(e).animationName'), 'none')
        for theme in ['light', 'dark']:
            if self.page.locator('html').get_attribute('data-theme') != theme:
                self.page.locator('#themeToggle').click()
            for width in [320, 375, 768, 1280]:
                self.page.set_viewport_size({'width': width, 'height': 950})
                self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'), width)
                self.assertTrue(self.page.locator('#themeToggle').is_visible())
            self.page.screenshot(path=f'/tmp/ppiq-{theme}-desktop.png', full_page=True)
            self.page.set_viewport_size({'width':375,'height':850})
            self.page.screenshot(path=f'/tmp/ppiq-{theme}-mobile.png', full_page=True)
        self.page.locator('#startBtn').click()
        for theme in ['light', 'dark']:
            if self.page.locator('html').get_attribute('data-theme') != theme:
                self.page.locator('#themeToggle').click()
            self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'), 375)
            self.assertTrue(self.page.locator('[data-answer]').first.is_visible())
        self.assertFalse(self.errors)

    def test_theme_toggle_when_storage_unavailable(self):
        self.page.add_init_script("Storage.prototype.setItem = function(){throw new Error('Storage unavailable')}")
        self.assets()
        before = self.page.locator('html').get_attribute('data-theme')
        self.page.locator('#themeToggle').click()
        self.assertNotEqual(self.page.locator('html').get_attribute('data-theme'), before)
        self.assertFalse(self.errors)



    def test_topic_labels_and_filters_in_practice_and_exam(self):
        self.assets(instrument=True)
        titles = ['Sources of Police Powers', 'Arrest Powers', 'Location of Arrest & Feeney',
                  'Warrantless Search & Seizure', 'Search With a Warrant']
        self.assertEqual(self.page.locator('.topic strong').all_text_contents(), titles)
        self.assertEqual(self.page.locator('#chapterSelect option').all_text_contents(), ['All topics'] + titles)
        self.assertNotRegex(self.page.locator('body').inner_text(), r'(?i)chapter')
        self.page.get_by_label('Topic focus').select_option('7')
        self.page.locator('#startBtn').click()
        self.assertTrue(self.page.evaluate('window.__audit.s.pool.every(q => q.chapter === 7)'))
        self.assertEqual(self.page.locator('.q-label').inner_text(), 'WARRANTLESS SEARCH & SEIZURE')
        self.assertNotRegex(self.page.locator('body').inner_text(), r'(?i)chapter')
        self.page.evaluate('window.__audit.finish()')
        self.assertIn('Topic breakdown', self.page.locator('body').inner_text())
        self.assertNotRegex(self.page.locator('body').inner_text(), r'(?i)chapter')
        self.page.evaluate("window.__audit.s.mode='exam';window.__audit.start()")
        self.assertNotRegex(self.page.locator('body').inner_text(), r'(?i)chapter')
        self.page.evaluate('window.__audit.finish()')
        self.assertNotRegex(self.page.locator('body').inner_text(), r'(?i)chapter')
        self.page.set_viewport_size({'width': 320, 'height': 850})
        self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'), 320)
        self.assertFalse(self.errors)


    def test_power_switch_keyboard_touch_size_and_pressed_feedback(self):
        self.page.emulate_media(color_scheme='light', reduced_motion='reduce')
        self.assets()
        switch = self.page.locator('#themeToggle')
        self.assertEqual(switch.get_attribute('aria-pressed'), 'false')
        raised = switch.evaluate('(e)=>getComputedStyle(e, "::before").boxShadow')
        switch.focus()
        self.page.keyboard.press('Space')
        self.assertEqual(switch.get_attribute('aria-pressed'), 'true')
        self.assertEqual(self.page.locator('html').get_attribute('data-theme'), 'dark')
        pressed = switch.evaluate('(e)=>getComputedStyle(e, "::before").boxShadow')
        self.assertNotEqual(raised, pressed)
        self.assertEqual(switch.evaluate('(e)=>getComputedStyle(e).transitionDuration'), '0s')
        for width in [320, 375, 768, 1280]:
            self.page.set_viewport_size({'width': width, 'height': 900})
            box = switch.bounding_box()
            self.assertGreaterEqual(box['width'], 44)
            self.assertEqual(box['width'], box['height'])
            self.assertLessEqual(box['x'] + box['width'], width)
            self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'), width)
        self.page.locator('#startBtn').click()
        switch.click()
        self.assertEqual(switch.get_attribute('aria-pressed'), 'false')
        self.assertTrue(self.page.locator('[data-answer]').first.is_visible())
        self.assertFalse(self.errors)


    def test_true_false_order_and_grading_in_practice_and_exam(self):
        questions = [q for q in QUESTIONS if q['type'] == 'tf']
        self.assets(questions=questions, instrument=True)
        result = self.page.evaluate("""() => {
          const a=window.__audit;
          for(const mode of ['practice','exam']){
            Object.assign(a.s,{mode,count:95,chapter:'all'});a.start();
            for(let i=0;i<a.s.pool.length;i++){
              a.s.at=i;a.showQuestion();const q=a.s.pool[i];
              if(JSON.stringify(q.shownOptions)!==JSON.stringify(['True','False']))throw Error(q.id+': incorrect order');
              if(q.shownOptions[q.shownCorrect[0]]!==q.options[q.correct[0]])throw Error(q.id+': changed answer key');
              const labels=[...document.querySelectorAll('[data-answer]')].map(b=>b.lastElementChild.textContent);
              if(JSON.stringify(labels)!==JSON.stringify(['True','False']))throw Error(q.id+': incorrect displayed order');
              a.choose(q.shownCorrect[0]);if(mode==='practice')a.check();
            }
            a.finish();
            if(!document.querySelector('h1').textContent.includes('100%'))throw Error(mode+': grading changed');
          }
          return true;
        }""")
        self.assertTrue(result)
        self.assertFalse(self.errors)

    def test_dashboard_navigation_saves_and_resumes_unfinished_sessions(self):
        self.assets(instrument=True)
        home = self.page.locator('#homeBtn')
        self.assertTrue(home.is_hidden())
        saved = self.page.evaluate('localStorage.getItem("policePowersIQ_v1")')
        for mode in ['practice']:
            self.page.evaluate('(mode)=>{window.__audit.s.mode=mode;window.__audit.start()}', mode)
            self.assertTrue(home.is_visible())
            home.click()
            self.assertTrue(self.page.locator('#resumeBtn').is_visible())
            self.assertTrue(home.is_hidden())
            self.assertEqual(self.page.evaluate('localStorage.getItem("policePowersIQ_v1")'), saved)
            self.page.locator('#resumeBtn').click()
            self.assertTrue(self.page.locator('.question-area').is_visible())
        self.page.evaluate('window.__audit.finish()')
        home.click()
        self.assertTrue(self.page.locator('#startBtn').is_visible())
        self.assertEqual(self.page.locator('#resumeBtn').count(), 0)
        self.assertFalse(self.errors)

    def test_resume_preserves_shuffled_answers_position_and_checked_state(self):
        self.assets(instrument=True)
        self.page.locator('#startBtn').click()
        self.page.locator('[data-answer]').nth(1).click()
        self.page.locator('#checkBtn').click()
        snapshot = self.page.evaluate('({id:__audit.s.pool[0].id,options:__audit.s.pool[0].shownOptions,answers:__audit.s.answers,checked:__audit.s.checked})')
        self.page.reload()
        self.page.locator('#chooseMidterm').click()
        self.page.locator('.guide-hero').wait_for()
        self.page.locator('#trainingTab').click()
        self.page.locator('#resumeBtn').click()
        restored = self.page.evaluate('({id:__audit.s.pool[0].id,options:__audit.s.pool[0].shownOptions,answers:__audit.s.answers,checked:__audit.s.checked})')
        self.assertEqual(snapshot, restored)
        self.assertTrue(self.page.locator('[data-answer]').first.is_disabled())
        self.page.locator('#nextBtn').click()
        next_id = self.page.evaluate('__audit.s.pool[__audit.s.at].id')
        self.page.reload()
        self.page.locator('#chooseMidterm').click()
        self.page.locator('.guide-hero').wait_for()
        self.page.locator('#trainingTab').click()
        self.page.locator('#resumeBtn').click()
        self.assertEqual(self.page.evaluate('__audit.s.pool[__audit.s.at].id'), next_id)
        self.assertIn('Question 2 of 10', self.page.locator('.q-header').inner_text())
        self.assertFalse(self.errors)

    def test_exam_fixed_deadline_auto_submits_once(self):
        self.page.clock.install()
        self.assets(instrument=True)
        self.page.locator('[data-mode="exam"]').click()
        self.assertIn('30 minutes', self.page.locator('#modeInfo').inner_text())
        self.page.locator('#startBtn').click()
        self.assertEqual(self.page.locator('#timer').inner_text(), '30:00')
        self.page.evaluate('__audit.choose(__audit.s.pool[0].shownCorrect[0])')
        self.page.clock.fast_forward(5 * 60 * 1000)
        self.assertEqual(self.page.locator('#timer').inner_text(), '25:00')
        self.page.clock.fast_forward(25 * 60 * 1000 + 1000)
        self.assertIn('automatically submitted', self.page.locator('.hero').inner_text().lower())
        self.assertIn('1 answered; 39 unanswered', self.page.locator('.hero').inner_text())
        self.assertEqual(self.page.locator('.result-item').count(), 40)
        saved = self.page.evaluate('JSON.parse(localStorage.getItem("policePowersIQ_v1"))')
        self.assertEqual(saved['attempts'], 1)
        self.assertEqual(saved['scoreSum'], 3)
        self.assertIsNone(self.page.evaluate('localStorage.getItem("ppiq_session_v1")'))
        self.page.clock.fast_forward(10000)
        self.page.reload()
        self.page.locator('#chooseMidterm').click()
        self.page.locator('.guide-hero').wait_for()
        self.page.locator('#trainingTab').click()
        self.page.locator('#startBtn').wait_for()
        self.assertEqual(self.page.evaluate('JSON.parse(localStorage.getItem("policePowersIQ_v1")).attempts'), 1)
        self.assertFalse(self.errors)

    def test_interrupted_exam_is_finalized_on_next_visit_even_before_deadline(self):
        self.assets(instrument=True)
        for expired in [False, True]:
            self.page.evaluate("__audit.s.mode='exam';__audit.start();__audit.choose(__audit.s.pool[0].shownCorrect[0])")
            snapshot=self.page.evaluate('JSON.parse(localStorage.getItem("ppiq_session_v1"))')
            self.page.evaluate('__audit.finish()')
            # A new, ungraded ID models a browser process killed without any exit event.
            snapshot['id'] += '-interrupted'
            if expired:
                snapshot['started'] -= 31*60*1000
                snapshot['deadline'] = snapshot['started'] + 30*60*1000
            self.page.evaluate('d=>localStorage.setItem("ppiq_session_v1",JSON.stringify(d))',snapshot)
            self.page.reload()
            self.page.locator('.result-list').wait_for()
            self.assertIn('time is up' if expired else 'exam ended when you left',self.page.locator('.hero').inner_text().lower())
            self.assertIn('1 answered; 39 unanswered',self.page.locator('.hero').inner_text())
            self.assertEqual(self.page.locator('#resumeBtn').count(),0)
            self.assertIsNone(self.page.evaluate('localStorage.getItem("ppiq_session_v1")'))
        self.assertFalse(self.errors)

    def test_exam_dashboard_exit_warns_cancel_continues_and_confirm_submits(self):
        self.page.clock.install()
        self.assets(instrument=True)
        self.page.locator('[data-mode="exam"]').click()
        self.page.locator('#startBtn').click()
        self.page.evaluate('__audit.choose(__audit.s.pool[0].shownCorrect[0])')
        messages=[]
        self.page.once('dialog',lambda d:(messages.append(d.message),d.dismiss()))
        self.page.locator('#homeBtn').click()
        self.assertIn('cannot be resumed',messages[0])
        self.assertTrue(self.page.locator('.question-area').is_visible())
        self.page.clock.fast_forward(60000)
        self.assertEqual(self.page.locator('#timer').inner_text(),'29:00')
        self.page.once('dialog',lambda d:d.accept())
        self.page.locator('#exitBtn').click()
        self.assertIn('exam ended when you left',self.page.locator('.hero').inner_text().lower())
        self.assertIn('1 answered; 39 unanswered',self.page.locator('.hero').inner_text())
        self.assertEqual(self.page.evaluate('__audit.progress.attempts'),1)
        self.page.locator('#dash').click()
        self.assertEqual(self.page.locator('#resumeBtn').count(),0)
        self.assertFalse(self.errors)

    def test_exam_reload_native_warning_cancel_then_accept(self):
        self.assets(instrument=True)
        self.page.locator('[data-mode="exam"]').click()
        self.page.locator('#startBtn').click()
        self.page.evaluate('__audit.choose(__audit.s.pool[0].shownCorrect[0])')
        deadline=self.page.evaluate('__audit.s.deadline')
        dialogs=[]
        self.page.once('dialog',lambda d:(dialogs.append(d.type),d.dismiss()))
        self.page.evaluate('setTimeout(()=>location.reload(),0)')
        self.page.wait_for_timeout(200)
        self.assertEqual(dialogs,['beforeunload'])
        self.assertTrue(self.page.locator('.question-area').is_visible())
        self.assertEqual(self.page.evaluate('__audit.s.deadline'),deadline)
        self.page.once('dialog',lambda d:(dialogs.append(d.type),d.accept()))
        self.page.reload()
        self.page.locator('.result-list').wait_for()
        self.assertEqual(dialogs,['beforeunload','beforeunload'])
        self.assertIn('exam ended when you left',self.page.locator('.hero').inner_text().lower())
        self.assertIn('1 answered; 39 unanswered',self.page.locator('.hero').inner_text())
        self.assertEqual(self.page.evaluate('__audit.progress.attempts'),1)
        self.page.reload()
        self.page.locator('#chooseMidterm').click()
        self.page.locator('.guide-hero').wait_for()
        self.page.locator('#trainingTab').click()
        self.page.locator('#startBtn').wait_for()
        self.assertEqual(self.page.evaluate('__audit.progress.attempts'),1)
        self.assertFalse(self.errors)

    def test_hidden_exam_submits_once_and_restores_results(self):
        self.assets(instrument=True)
        self.page.locator('[data-mode="exam"]').click()
        self.page.locator('#startBtn').click()
        self.page.evaluate('__audit.choose(__audit.s.pool[0].shownCorrect[0])')
        # Exercise the browser visibility event explicitly; headless tabs stay visible.
        self.page.evaluate("""Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});
          document.dispatchEvent(new Event('visibilitychange'));
          window.dispatchEvent(new PageTransitionEvent('pagehide'));
          document.dispatchEvent(new Event('visibilitychange'));
          delete document.visibilityState;
          document.dispatchEvent(new Event('visibilitychange'));""")
        self.assertIn('exam ended when you left',self.page.locator('.hero').inner_text().lower())
        snapshot=self.page.evaluate('JSON.parse(localStorage.getItem("ppiq_session_v1"))')
        self.assertEqual(snapshot['phase'],'submitting')
        self.assertEqual(snapshot['submissionReason'],'left')
        self.assertEqual(self.page.evaluate('__audit.progress.attempts'),1)
        answers=self.page.evaluate('__audit.s.answers')
        self.page.evaluate('__audit.choose(0)')
        self.assertEqual(self.page.evaluate('__audit.s.answers'),answers)
        self.page.reload()
        self.page.locator('.result-list').wait_for()
        self.assertIn('1 answered; 39 unanswered',self.page.locator('.hero').inner_text())
        self.assertEqual(self.page.evaluate('__audit.progress.attempts'),1)
        self.assertIsNone(self.page.evaluate('localStorage.getItem("ppiq_session_v1")'))
        self.assertFalse(self.errors)

    def test_exam_navigation_away_and_back_restores_submitted_results(self):
        self.assets(instrument=True)
        self.page.locator('[data-mode="exam"]').click()
        self.page.locator('#startBtn').click()
        self.page.evaluate('__audit.choose(__audit.s.pool[0].shownCorrect[0])')
        self.page.once('dialog',lambda d:d.accept())
        self.page.goto(self.url+'report-confirmed.html')
        self.page.go_back()
        self.page.locator('.result-list').wait_for()
        self.assertIn('exam ended when you left',self.page.locator('.hero').inner_text().lower())
        self.assertIn('1 answered; 39 unanswered',self.page.locator('.hero').inner_text())
        self.assertEqual(self.page.evaluate('__audit.progress.attempts'),1)
        self.assertFalse(self.errors)

    def test_closing_exam_tab_restores_results_on_new_tab(self):
        self.assets(instrument=True)
        self.page.locator('[data-mode="exam"]').click()
        self.page.locator('#startBtn').click()
        self.page.evaluate('__audit.choose(__audit.s.pool[0].shownCorrect[0])')
        self.page.once('dialog',lambda d:d.accept())
        with self.page.expect_event('close'):
            self.page.close(run_before_unload=True)
        self.page=self.context.new_page()
        self.page.on('pageerror',lambda error:self.errors.append(str(error)))
        self.page.goto(self.url)
        self.page.locator('.result-list').wait_for()
        self.assertIn('exam ended when you left',self.page.locator('.hero').inner_text().lower())
        self.assertIn('1 answered; 39 unanswered',self.page.locator('.hero').inner_text())
        self.assertEqual(self.page.evaluate('JSON.parse(localStorage.getItem("policePowersIQ_v1")).attempts'),1)
        self.assertEqual(self.page.locator('#resumeBtn').count(),0)
        self.assertFalse(self.errors)

    def test_exam_copy_restrictions_keep_keyboard_answers_and_release_after_submit(self):
        self.assets(instrument=True)
        self.page.locator('[data-mode="exam"]').click()
        self.page.locator('#startBtn').click()
        self.assertEqual(self.page.locator('.q-title').evaluate('(el)=>getComputedStyle(el).userSelect'),'none')
        for event in ['copy','cut','contextmenu','selectstart','dragstart']:
            allowed=self.page.locator('.q-title').evaluate('(el,type)=>el.dispatchEvent(new Event(type,{bubbles:true,cancelable:true}))',event)
            self.assertFalse(allowed,event)
        self.page.locator('[data-answer]').first.focus()
        self.page.keyboard.press('Space')
        self.assertEqual(self.page.locator('.answer.selected').count(),1)
        self.page.locator('#nextBtn').focus()
        self.page.keyboard.press('Enter')
        self.assertIn('Question 2 of 40',self.page.locator('.q-header').inner_text())
        self.assertEqual(self.page.locator('[data-report-question]').count(),0)
        self.page.evaluate('__audit.finish()')
        self.assertEqual(self.page.locator('#root.exam-active').count(),0)
        self.assertTrue(self.page.locator('.result-item h3').first.evaluate("el=>el.dispatchEvent(new Event('copy',{bubbles:true,cancelable:true}))"))
        self.page.locator('#nextPool').click()
        self.assertNotEqual(self.page.locator('.q-title').evaluate('(el)=>getComputedStyle(el).userSelect'),'none')
        self.assertTrue(self.page.locator('.q-title').evaluate("el=>el.dispatchEvent(new Event('copy',{bubbles:true,cancelable:true}))"))
        self.assertFalse(self.errors)

    def test_corrupt_or_outdated_session_does_not_change_legacy_progress(self):
        self.assets()
        self.page.locator('#startBtn').click()
        self.page.locator('[data-answer]').first.click()
        self.page.locator('#homeBtn').click()
        self.page.evaluate("localStorage.setItem('ppiq_session_v1','{invalid')")
        self.page.reload()
        self.page.locator('#chooseMidterm').click()
        self.page.locator('.guide-hero').wait_for()
        self.page.locator('#trainingTab').click()
        self.page.locator('#startBtn').wait_for()
        self.assertEqual(self.page.locator('#resumeBtn').count(), 0)
        self.assertIsNone(self.page.evaluate('localStorage.getItem("policePowersIQ_v1")'))
        self.assertFalse(self.errors)

    def test_selected_wrong_choice_feedback_for_every_reviewed_option(self):
        self.assets(instrument=True)
        count=self.page.evaluate("""() => {
          let count=0;
          for(const q of window.PPIQ_QUESTIONS){
            const order=[...q.options.keys()].reverse();
            const mapped={...q,optionOrder:order,shownOptions:order.map(i=>q.options[i]),shownCorrect:q.correct.map(i=>order.indexOf(i))};
            for(let i=0;i<order.length;i++){
              const element=document.createElement('div');element.innerHTML=PPIQ_LEGAL.render(mapped,[i]);
              const expected=PPIQ_LEGAL.isReviewed(q)&&!mapped.shownCorrect.includes(i);
              if(!!element.querySelector('.choice-feedback')!==expected)throw Error(q.id+': wrong choice feedback missing or unverified');
              if(!mapped.shownCorrect.includes(i)){
                const text=element.textContent;
                if(!text.includes('Your answer:')||!text.includes(PPIQ_LEGAL.isReviewed(q)?'Correct answer:':'Recorded answer key (pending legal verification):'))throw Error(q.id+': missing incorrect-answer comparison');
              }
              if(expected)count++;
            }
          }return count;
        }""")
        self.assertGreater(count,400)
        self.assertFalse(self.errors)

    def test_stale_or_injected_choice_rationales_are_safely_handled(self):
        data=copy.deepcopy(FEEDBACK)
        data['feedback']['Q001A']['optionFeedback']['notes']['1']='<img src=x onerror="window.__injected=true">'
        self.assets(questions=[BANK['Q001A']],feedback=data)
        self.page.locator('#startBtn').click()
        self.choose(BANK['Q001A'],False)
        self.page.locator('#checkBtn').click()
        self.assertIn('<img',self.page.locator('.choice-feedback').inner_text())
        self.assertEqual(self.page.locator('.choice-feedback img').count(),0)
        self.assertIsNone(self.page.evaluate('window.__injected'))
        self.page.unroute_all()
        question=copy.deepcopy(BANK['Q001A']);question['question']='Updated wording requires a new comparison'
        self.assets(questions=[question],feedback=data)
        self.page.locator('#startBtn').click()
        self.choose(question,False)
        self.page.locator('#checkBtn').click()
        self.assertEqual(self.page.locator('.choice-feedback').count(),0)
        self.assertFalse(self.errors)

    def test_spaced_review_schedule_and_pending_exclusion(self):
        self.assets(questions=[BANK['Q001A'],BANK['Q065A']],instrument=True)
        result=self.page.evaluate("""() => {
          const q=PPIQ_QUESTIONS.find(q=>q.id==='Q001A'),pending=PPIQ_QUESTIONS.find(q=>q.id==='Q065A');
          const t=PPIQ_STUDY,day=86400000,now=Date.now(),days=[];
          for(let i=0;i<6;i++){
            const at=now+i*day;t.recordAnswer(q,i>0,'session-'+i,at);
            const record=JSON.parse(localStorage.getItem(t.LEARNING_KEY)).questions[q.id];
            days.push((record.dueAt-at)/day);
            t.recordAnswer(q,i>0,'session-'+i,at);
            if(JSON.parse(localStorage.getItem(t.LEARNING_KEY)).questions[q.id].attempts!==i+1)throw Error('Duplicate attempt');
          }
          t.recordAnswer(pending,false,'pending',now);
          const records=JSON.parse(localStorage.getItem(t.LEARNING_KEY)).questions;
          const due=t.dueQuestions(PPIQ_QUESTIONS,now+40*day).map(q=>q.id);
          return {days,due,pendingSaved:!!records.Q065A};
        }""")
        self.assertEqual(result,{'days':[1,1,3,7,14,30],'due':['Q001A'],'pendingSaved':False})
        self.assertFalse(self.errors)

    def test_review_due_button_starts_scheduled_questions(self):
        self.assets(questions=[BANK['Q001A']],instrument=True)
        self.page.evaluate("PPIQ_STUDY.recordAnswer(PPIQ_QUESTIONS[0],false,'old-session',Date.now()-2*86400000);__audit.dashboard()")
        self.assertTrue(self.page.locator('#spacedReviewBtn').is_enabled())
        self.page.locator('#spacedReviewBtn').click()
        self.assertEqual(self.page.evaluate('__audit.s.mode'),'review')
        self.choose(BANK['Q001A'])
        self.page.locator('#checkBtn').click()
        self.page.locator('#nextBtn').click()
        self.page.locator('#homeBtn').click()
        self.assertTrue(self.page.locator('#spacedReviewBtn').is_disabled())
        record=self.page.evaluate('JSON.parse(localStorage.getItem("ppiq_learning_v1")).questions.Q001A')
        self.assertEqual((record['attempts'],record['correct']),(2,1))
        self.assertFalse(self.errors)

    def test_weak_topic_accuracy_recent_trend_and_targeted_pool(self):
        self.assets(instrument=True)
        result=self.page.evaluate("""() => {
          const t=PPIQ_STUDY,q1=PPIQ_QUESTIONS.find(q=>q.id==='Q001A'),q2=PPIQ_QUESTIONS.find(q=>q.id==='Q043A');
          for(let i=0;i<10;i++)t.recordAnswer(q1,i>=5,'history-'+i,Date.now()-100000+i*1000);
          t.recordAnswer(q2,true,'strong-topic');
          const stats=t.topicStats(PPIQ_QUESTIONS,{1:'Sources',3:'Entry'});
          __audit.dashboard();
          return stats;
        }""")
        self.assertEqual((result[0]['accuracy'],result[0]['delta'],result[0]['attempts']),(50,100,10))
        self.assertEqual(result[1]['accuracy'],100)
        self.assertIn('Recent accuracy up 100 percentage points',self.page.locator('body').inner_text())
        self.page.locator('#weakTopicsBtn').click()
        self.assertEqual(self.page.evaluate('__audit.s.mode'),'weak')
        self.assertTrue(self.page.evaluate('__audit.s.pool.every(q=>q.chapter===1&&PPIQ_LEGAL.isReviewed(q))'))
        self.assertFalse(self.errors)

    def test_question_report_preview_local_save_and_reviewed_export(self):
        self.assets(questions=[BANK['Q001A']])
        self.page.locator('#startBtn').click()
        self.page.get_by_role('button',name='Report a question',exact=True).click()
        note='Please check this wording — café.\nSecond line. <img src=x onerror="window.__injected=true">'
        self.page.get_by_label('Issue type').select_option('wording')
        self.page.get_by_label('What should be checked?').fill(note)
        self.page.get_by_role('button',name='Preview report →').click()
        self.assertIn(note,self.page.locator('#studyDialog').inner_text())
        self.assertEqual(self.page.locator('#studyDialog img').count(),0)
        self.assertIsNone(self.page.evaluate('localStorage.getItem("ppiq_reports_v1")'))
        self.page.get_by_role('button',name='Save on this device',exact=True).click()
        self.assertIn('Nothing has been sent',self.page.locator('#reportStatus').inner_text())
        self.assertEqual(self.page.evaluate('JSON.parse(localStorage.getItem("ppiq_reports_v1"))[0].note'),note)
        with self.page.expect_download() as info:
            self.page.get_by_role('button',name='Download report (.txt)',exact=True).click()
        self.assertEqual(info.value.suggested_filename,'Police-PowersIQ-report-Q001A.txt')
        downloaded=Path(info.value.path()).read_text(encoding='utf-8-sig')
        self.assertTrue(downloaded.startswith('Police PowersIQ — Question report'))
        self.assertIn('Question ID: Q001A',downloaded)
        self.assertIn(BANK['Q001A']['question'],downloaded)
        self.assertIn('Answer choices (question-bank order):',downloaded)
        self.assertIn('A) '+BANK['Q001A']['options'][0],downloaded)
        self.assertIn('Issue: Unclear wording',downloaded)
        self.assertIn('Student note:\n'+note,downloaded)
        self.assertIn('No confirmed submission',downloaded)
        self.page.get_by_role('button',name='Close dialog').click()
        self.page.locator('#homeBtn').click()
        self.page.locator('#reportsQueueBtn').click()
        self.assertIn(note,self.page.locator('#studyDialog').inner_text())
        self.page.get_by_role('button',name='Mark resolved locally').click()
        self.assertIn('Marked resolved locally',self.page.locator('#studyDialog').inner_text())
        # Older saved reports without options or timestamps still export readably.
        self.page.evaluate("""const rows=JSON.parse(localStorage.getItem('ppiq_reports_v1'));
          rows.push({id:'old-report',questionId:'Q003B',question:'A saved question',category:'other',note:'An older note',status:'open'});
          localStorage.setItem('ppiq_reports_v1',JSON.stringify(rows));PPIQ_REPORTS.queue();""")
        with self.page.expect_download() as batch:
            self.page.locator('#exportReports').click()
        self.assertEqual(batch.value.suggested_filename,'Police-PowersIQ-question-reports.txt')
        all_text=Path(batch.value.path()).read_text(encoding='utf-8-sig')
        self.assertIn(note,all_text)
        self.assertIn('Local status: Marked resolved on this device',all_text)
        self.assertIn('Question ID: Q003B',all_text)
        self.assertIn('An older note',all_text)
        self.assertIn('Created: Not recorded',all_text)
        self.assertIsNone(self.page.evaluate('window.__injected'))
        self.assertFalse(self.errors)

    def test_review_dates_and_manual_queue_do_not_promote_pending_law(self):
        self.assets(questions=[BANK['Q001A'],BANK['Q065A']],instrument=True)
        self.assertEqual(self.page.locator('.source-status,#exportLegalQueue').count(),0)
        self.assertNotIn('Legal source review',self.page.locator('#root').inner_text())
        queue=self.page.evaluate('__audit.legalReviewQueue()')
        self.assertEqual([q['questionId'] for q in queue['questions']],['Q065A'])
        self.assertEqual(queue['questions'][0]['status'],'needs_review')
        self.page.evaluate("const q=PPIQ_QUESTIONS[0];Object.assign(__audit.s,{pool:[{...q,shownOptions:q.options,shownCorrect:q.correct}],at:0,answers:{[q.id]:q.correct},checked:{[q.id]:true},mode:'practice',final:false});__audit.showQuestion()")
        self.assertIn('2026-10-20',self.page.locator('.legal-reviewed-date').inner_text())
        self.assertFalse(self.errors)

    def test_exam_instructions_and_early_submission_score_unanswered_zero(self):
        self.assets(instrument=True)
        self.page.locator('[data-mode="exam"]').click()
        instructions=self.page.locator('#modeInfo').inner_text()
        for phrase in ['40 mixed questions','30 minutes','No negative marking','unanswered questions count as incorrect','timer','next visit']:
            self.assertIn(phrase,instructions)
        self.page.locator('#startBtn').click()
        self.page.evaluate('__audit.choose(__audit.s.pool[0].shownCorrect[0])')
        self.page.once('dialog',lambda dialog:dialog.accept())
        self.page.locator('#submitExamBtn').click()
        self.assertIn('3%',self.page.locator('h1').inner_text())
        self.assertIn('1 answered; 39 unanswered',self.page.locator('.hero').inner_text())
        learning=self.page.evaluate('JSON.parse(localStorage.getItem("ppiq_learning_v1"))')
        if learning:
            self.assertEqual(sum(r['attempts'] for r in learning['questions'].values()),1)
        self.assertFalse(self.errors)

    def test_online_report_accepts_redirect_and_preserves_readable_receipt(self):
        self.assets(questions=[BANK['Q001A']])
        posted=[]
        def form_route(route):
            if route.request.method=='POST':
                posted.append(route.request.post_data)
                route.fulfill(status=303,headers={'Location':'/report-confirmed.html?received=1'},body='')
            else:
                route.fulfill(status=200,body='Report received')
        self.page.route('**/report-confirmed*',form_route)
        self.page.locator('#startBtn').click()
        self.page.get_by_role('button',name='Report a question',exact=True).click()
        self.page.get_by_label('What should be checked?').fill('Please check this question against its cited source.')
        self.assertEqual(len(posted),0)
        self.page.get_by_role('button',name='Preview report →').click()
        self.assertEqual(len(posted),0)
        self.page.locator('#submitReport').click()
        self.page.wait_for_function("document.getElementById('reportStatus').textContent.startsWith('Report submitted to the site owner.')")
        self.assertEqual(len(posted),1)
        self.assertIn('question-id=Q001A',posted[0])
        self.assertIn('form-name=question-report',posted[0])
        self.assertTrue(self.page.locator('#submitReport').is_disabled())
        self.assertTrue(self.page.evaluate('!!JSON.parse(localStorage.getItem("ppiq_reports_v1"))[0].submittedAt'))
        with self.page.expect_download() as info:
            self.page.locator('#downloadReport').click()
        text=Path(info.value.path()).read_text(encoding='utf-8-sig')
        self.assertIn('Online delivery: Submission confirmed',text)
        self.page.locator('#saveReport').click()
        self.assertTrue(self.page.evaluate('!!JSON.parse(localStorage.getItem("ppiq_reports_v1"))[0].submittedAt'))
        # Editing a delivered report creates an unsent revision, not a false receipt.
        self.page.locator('#editReport').click()
        self.page.get_by_label('What should be checked?').fill('A revised note that has not been submitted yet.')
        self.page.get_by_role('button',name='Preview report →').click()
        with self.page.expect_download() as revision:
            self.page.locator('#downloadReport').click()
        revised=Path(revision.value.path()).read_text(encoding='utf-8-sig')
        self.assertIn('No confirmed submission',revised)
        self.assertIn('A revised note',revised)
        self.assertEqual(len(posted),1)
        self.assertFalse(self.errors)

    def test_online_report_accepts_netlify_http_200_without_redirect(self):
        self.assets(questions=[BANK['Q001A']])
        posted=[]
        def acknowledge(route):
            posted.append(route.request.post_data)
            route.fulfill(status=200,body='Thank you! Your form submission has been received.')
        self.page.route('**/report-confirmed*',acknowledge)
        self.page.locator('#startBtn').click()
        self.page.get_by_role('button',name='Report a question',exact=True).click()
        self.page.get_by_label('What should be checked?').fill('Please check this wording for clarity.')
        self.page.get_by_role('button',name='Preview report →').click()
        self.page.locator('#submitReport').click()
        self.page.wait_for_function("document.getElementById('reportStatus').textContent.startsWith('Report submitted to the site owner.')")
        self.assertTrue(self.page.locator('#submitReport').is_disabled())
        self.assertEqual(len(posted),1)
        self.assertIn('form-name=question-report',posted[0])
        self.assertTrue(self.page.evaluate('!!JSON.parse(localStorage.getItem("ppiq_reports_v1"))[0].submittedAt'))
        self.assertFalse(self.errors)

    def test_online_report_http_errors_and_network_failure_keep_unsent_copy(self):
        self.assets(questions=[BANK['Q001A']])
        self.page.locator('#startBtn').click()
        self.page.get_by_role('button',name='Report a question',exact=True).click()
        self.page.get_by_label('What should be checked?').fill('Please check this wording for clarity.')
        self.page.get_by_role('button',name='Preview report →').click()
        for status in [400,404,429,500,None]:
            self.page.unroute('**/report-confirmed*')
            if status is None:
                self.page.route('**/report-confirmed*',lambda route:route.abort('failed'))
            else:
                self.page.route('**/report-confirmed*',lambda route:route.fulfill(status=status,body='Submission failed'))
            self.page.locator('#submitReport').click()
            self.page.wait_for_function("document.getElementById('reportStatus').textContent.includes('not been confirmed')")
            self.assertTrue(self.page.locator('#submitReport').is_enabled())
            self.assertTrue(self.page.locator('#downloadReport').is_enabled())
            self.assertIsNone(self.page.evaluate('localStorage.getItem("ppiq_reports_v1")'))
        with self.page.expect_download() as info:
            self.page.locator('#downloadReport').click()
        self.assertIn('No confirmed submission',Path(info.value.path()).read_text(encoding='utf-8-sig'))
        self.assertFalse(self.errors)

    def test_submission_recovery_does_not_duplicate_grading_or_learning(self):
        self.assets(questions=[BANK['Q001A']],instrument=True)
        self.page.locator('#startBtn').click()
        self.choose(BANK['Q001A'])
        snapshot=self.page.evaluate('JSON.parse(localStorage.getItem("ppiq_session_v1"))')
        self.page.evaluate('__audit.finish()')
        snapshot['phase']='submitting'
        self.page.evaluate('d=>localStorage.setItem("ppiq_session_v1",JSON.stringify(d))',snapshot)
        self.page.reload()
        self.page.locator('.result-list').wait_for()
        self.assertEqual(self.page.evaluate('JSON.parse(localStorage.getItem("policePowersIQ_v1")).attempts'),1)
        self.assertEqual(self.page.evaluate('JSON.parse(localStorage.getItem("ppiq_learning_v1")).questions.Q001A.attempts'),1)
        self.assertIsNone(self.page.evaluate('localStorage.getItem("ppiq_session_v1")'))
        self.assertFalse(self.errors)

    def test_blocked_storage_warns_and_allows_in_visit_resume(self):
        self.page.add_init_script("Storage.prototype.setItem=function(){throw new Error('Storage unavailable')}")
        self.assets(questions=[BANK['Q001A']])
        self.page.locator('#startBtn').click()
        self.page.locator('[data-answer]').first.click()
        self.assertIn('may not survive',self.page.locator('.storage-warning').inner_text())
        selected=self.page.locator('.answer.selected').inner_text()
        self.page.locator('#homeBtn').click()
        self.page.locator('#resumeBtn').click()
        self.assertEqual(self.page.locator('.answer.selected').inner_text(),selected)
        self.page.locator('#checkBtn').click()
        self.page.locator('#nextBtn').click()
        self.page.locator('#homeBtn').click()
        self.assertEqual(self.page.locator('#resumeBtn').count(),0)
        self.assertFalse(self.errors)

    def test_reports_and_new_learning_panels_fit_both_themes_and_mobile(self):
        self.assets(questions=[BANK['Q001A'],BANK['Q065A']],instrument=True)
        for theme in ['light','dark']:
            self.page.evaluate('(theme)=>document.documentElement.dataset.theme=theme',theme)
            self.page.evaluate('__audit.dashboard()')
            self.assertEqual(self.page.locator('.source-status').count(),0)
            for width in [320,375,768,1280]:
                self.page.set_viewport_size({'width':width,'height':900})
                self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'),width)
            self.page.locator('#startBtn').click()
            self.page.get_by_role('button',name='Report a question',exact=True).click()
            self.page.get_by_label('What should be checked?').fill('Check this source: https://example.test/'+('longword'*30))
            self.page.get_by_role('button',name='Preview report →').click()
            for width in [320,375,768,1280]:
                self.page.set_viewport_size({'width':width,'height':900})
                self.assertTrue(self.page.locator('#studyDialog').is_visible())
                self.assertTrue(self.page.locator('#submitReport').is_visible())
                self.assertTrue(self.page.evaluate('document.getElementById("studyDialog").scrollWidth <= document.getElementById("studyDialog").clientWidth'))
                self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'),width)
            self.page.get_by_role('button',name='Close dialog').click()
            self.page.evaluate('__audit.finish()')
        self.assertFalse(self.errors)

if __name__ == '__main__':
    unittest.main(verbosity=2)
