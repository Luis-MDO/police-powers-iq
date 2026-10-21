"""Maintenance tests use simulated HTTP observations; they do not verify Canadian law."""
import copy
from datetime import date
import importlib.util
from pathlib import Path
import unittest

SPEC = importlib.util.spec_from_file_location('legal_maintenance', Path(__file__).resolve().parents[1] / 'tools/check_legal_sources.py')
maintenance = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(maintenance)


class MaintenanceTests(unittest.TestCase):
    def setUp(self):
        self.catalogue = {'authorities': {'SOURCE': {'title': 'Example', 'url': 'https://laws-lois.justice.gc.ca/eng/acts/C-46/section-495.html', 'verificationStatus': 'verified', 'reviewedOn': '2026-10-20'}}}
        self.feedback = {'feedback': {'Q001A': {'correctOptionIndices': [0], 'reviewStatus': 'needs_review', 'reviewedOn': '2026-10-20', 'authorityIds': ['SOURCE']}}}
        self.questions = [{'id': 'Q001A', 'correct': [0]}]

    def queue(self, **kwargs):
        return maintenance.build_queue(self.catalogue, self.feedback, self.questions, date(2026, 10, 20), **kwargs)

    def test_http_success_cannot_approve_pending_question(self):
        original = copy.deepcopy(self.feedback)
        report = self.queue(check_links=True, fetcher=lambda _: {'status': 'reachable', 'textSha256': 'first'})
        self.assertTrue(any('question_support_pending' in t['reasons'] for t in report['tasks']))
        self.assertEqual(self.feedback, original)
        self.assertEqual(report['sources']['SOURCE']['baseline'], 'first_observation_requires_manual_review')

    def test_changed_source_queues_affected_questions(self):
        previous = {'sources': {'SOURCE': {'textSha256': 'before'}}}
        report = self.queue(check_links=True, previous=previous, fetcher=lambda _: {'status': 'reachable', 'textSha256': 'after'})
        self.assertIn('source_text_changed', report['tasks'][0]['reasons'])
        self.assertIn('supporting_source_requires_review', report['tasks'][1]['reasons'])

    def test_failed_check_keeps_last_hash_for_next_comparison(self):
        previous = {'sources': {'SOURCE': {'textSha256': 'before'}}}
        report = self.queue(check_links=True, previous=previous, fetcher=lambda _: {'status': 'access_or_server_error', 'httpStatus': 403})
        self.assertEqual(report['sources']['SOURCE']['textSha256'], 'before')
        self.assertTrue(report['sources']['SOURCE']['hashFromPreviousObservation'])
        self.assertIn('access_or_server_error', report['tasks'][0]['reasons'])

    def test_default_does_not_fetch_and_expired_dates_are_queued(self):
        self.catalogue['authorities']['SOURCE']['reviewedOn'] = '2026-01-01'
        report = self.queue(fetcher=lambda _: self.fail('Offline audit made an external request'))
        self.assertFalse(report['linksChecked'])
        self.assertEqual(report['sources']['SOURCE']['status'], 'not_checked')
        self.assertIn('source_review_due_or_missing', report['tasks'][0]['reasons'])

    def test_unsafe_sources_are_not_fetched(self):
        self.catalogue['authorities']['SOURCE']['url'] = 'http://localhost/private'
        report = self.queue(check_links=True, fetcher=lambda _: self.fail('Unsafe URL was fetched'))
        self.assertIn('unsafe_or_missing_url', report['tasks'][0]['reasons'])
        for url in ['javascript:alert(1)', 'https://user:pass@laws-lois.justice.gc.ca/', 'https://laws-lois.justice.gc.ca.evil.test/', 'https://laws-lois.justice.gc.ca:444/']:
            self.assertFalse(maintenance.safe_url(url))


if __name__ == '__main__':
    unittest.main(verbosity=2)
