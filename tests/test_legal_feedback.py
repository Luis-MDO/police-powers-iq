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

    def assets(self, questions=None, feedback=None, authorities=None, instrument=False):
        if questions is not None:
            self.page.route('**/questions.js', lambda route: route.fulfill(body='window.PPIQ_QUESTIONS=' + json.dumps(questions) + ';', content_type='application/javascript'))
        if feedback is not None:
            self.page.route('**/question-feedback.json', lambda route: route.fulfill(json=feedback))
        if authorities is not None:
            self.page.route('**/legal-authorities.json', lambda route: route.fulfill(json=authorities))
        if instrument:
            source = (ROOT / 'app.js').read_text().replace('})();', ';window.__audit={eq,shuffle,sample,start,orderOptions,choose,check,finish,showQuestion,dashboard,s,get progress(){return progress}};})();')
            self.page.route('**/app.js', lambda route: route.fulfill(body=source, content_type='application/javascript'))
        self.page.goto(self.url)
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
            Object.assign(a.s,{pool:[mapped],at:0,answers:{[q.id]:q.correct},checked:{[q.id]:true},mode:'practice',final:false});
            a.showQuestion();
            const expected=window.PPIQ_LEGAL.isReviewed(q);
            const feedback=document.querySelector('.feedback');
            if(!!feedback.querySelector('.legal-explanation')!==expected)throw Error(q.id+': wrong verification state');
            if(!expected&&!feedback.querySelector('.legal-status.pending'))throw Error(q.id+': missing pending state');
            if(/professor|slides|Chapter \\d/i.test(feedback.textContent))throw Error(q.id+': professor source leaked');
            const practice=feedback.querySelector('.legal-authorities').innerHTML;
            a.finish();
            const review=document.querySelector('.result-item');
            if(review.querySelector('.legal-authorities').innerHTML!==practice)throw Error(q.id+': sources differ between surfaces');
            if(!!review.querySelector('.legal-explanation')!==expected)throw Error(q.id+': final review state differs');
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
            Object.assign(a.s,{pool:[{...q,shownOptions:q.options,shownCorrect:q.correct}],at:0,answers:{},checked:{},mode,final:false});
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

    def test_dashboard_navigation_and_unfinished_session_confirmation(self):
        self.assets(instrument=True)
        home = self.page.locator('#homeBtn')
        self.assertTrue(home.is_hidden())
        saved = self.page.evaluate('localStorage.getItem("policePowersIQ_v1")')
        for mode in ['practice', 'exam']:
            self.page.evaluate('(mode)=>{window.__audit.s.mode=mode;window.__audit.start()}', mode)
            self.assertTrue(home.is_visible())
            self.page.once('dialog', lambda dialog: dialog.dismiss())
            home.click()
            self.assertTrue(self.page.locator('.question-area').is_visible())
            self.page.once('dialog', lambda dialog: dialog.accept())
            home.click()
            self.assertTrue(self.page.locator('#startBtn').is_visible())
            self.assertTrue(home.is_hidden())
            self.assertEqual(self.page.evaluate('localStorage.getItem("policePowersIQ_v1")'), saved)
        self.page.evaluate('window.__audit.start();window.__audit.finish()')
        home.click()
        self.assertTrue(self.page.locator('#startBtn').is_visible())
        self.assertTrue(home.is_hidden())
        self.assertFalse(self.errors)

if __name__ == '__main__':
    unittest.main(verbosity=2)
