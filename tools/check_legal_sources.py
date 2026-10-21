"""Create a legal-maintenance queue. HTTP success/content hashes never verify law."""
import argparse
from datetime import date, datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

ROOT = Path(__file__).resolve().parents[1]
ALLOWED = {'laws-lois.justice.gc.ca', 'decisions.scc-csc.ca', 'scc-csc.lexum.com', 'www.scc-csc.ca', 'www.rcmp-grc.gc.ca'}


def safe_url(value):
    try:
        url = urlsplit(value)
        return url.scheme == 'https' and url.hostname in ALLOWED and not url.username and not url.password and url.port in (None, 443)
    except (ValueError, TypeError):
        return False


class SafeRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not safe_url(newurl):
            raise ValueError('Redirect requires manual review: destination is not in the legal-source allowlist')
        return super().redirect_request(req, fp, code, msg, headers, newurl)


class VisibleText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ignored = 0
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.ignored += 1

    def handle_endtag(self, tag):
        if tag in ('script', 'style') and self.ignored:
            self.ignored -= 1

    def handle_data(self, data):
        if not self.ignored:
            self.parts.append(data)


def fetch_source(url):
    if not safe_url(url):
        return {'status': 'unsafe_url'}
    try:
        opener = build_opener(SafeRedirect())
        request = Request(url, headers={'User-Agent': 'Police-PowersIQ legal-source maintenance (manual review required)'})
        with opener.open(request, timeout=15) as response:
            if not safe_url(response.url):
                return {'status': 'redirect_review'}
            body = response.read(4 * 1024 * 1024 + 1)
            if len(body) > 4 * 1024 * 1024:
                return {'status': 'source_too_large'}
            text = VisibleText()
            text.feed(body.decode(response.headers.get_content_charset() or 'utf-8', errors='replace'))
            normalized = re.sub(r'\s+', ' ', ' '.join(text.parts)).strip()
            return {'status': 'reachable', 'httpStatus': response.status, 'finalUrl': response.url,
                    'textSha256': hashlib.sha256(normalized.encode()).hexdigest()}
    except HTTPError as error:
        return {'status': 'broken_link' if error.code in (404, 410) else 'access_or_server_error', 'httpStatus': error.code}
    except (URLError, TimeoutError, ValueError, OSError) as error:
        return {'status': 'check_failed', 'detail': str(error)[:250]}


def overdue(value, today):
    try:
        reviewed = date.fromisoformat(value)
        return reviewed > today or (today - reviewed).days > 90
    except (ValueError, TypeError):
        return True


def build_queue(catalogue, feedback, questions, today, check_links=False, previous=None, fetcher=fetch_source):
    tasks, sources, question_rows = [], {}, []
    previous = previous if isinstance(previous, dict) else {}
    authorities = catalogue.get('authorities', {})
    records = feedback.get('feedback', {})
    for source_id, source in authorities.items():
        reasons = []
        url = source.get('url')
        if not safe_url(url): reasons.append('unsafe_or_missing_url')
        if source.get('verificationStatus') != 'verified': reasons.append('source_identity_pending')
        if overdue(source.get('reviewedOn'), today): reasons.append('source_review_due_or_missing')
        observation = fetcher(url) if check_links and safe_url(url) else {'status': 'not_checked'}
        old_hash = previous.get('sources', {}).get(source_id, {}).get('textSha256')
        if observation['status'] not in ('reachable', 'not_checked'): reasons.append(observation['status'])
        if observation.get('textSha256'):
            if old_hash and observation['textSha256'] != old_hash: reasons.append('source_text_changed')
            if not old_hash: observation['baseline'] = 'first_observation_requires_manual_review'
        if not observation.get('textSha256') and old_hash:
            observation['textSha256'] = old_hash
            observation['hashFromPreviousObservation'] = True
        sources[source_id] = {'title': source.get('title'), 'url': url, **observation}
        if reasons: tasks.append({'type': 'source', 'id': source_id, 'reasons': reasons})
    for question in questions:
        record = records.get(question['id'], {})
        reasons = []
        if record.get('reviewStatus') not in ('verified', 'study_aid'): reasons.append('question_support_pending')
        if record.get('correctOptionIndices') != question['correct']: reasons.append('answer_key_mismatch')
        if overdue(record.get('reviewedOn'), today): reasons.append('question_review_due_or_missing')
        ids = record.get('authorityIds', [])
        if not ids or any(i not in authorities or authorities[i].get('verificationStatus') != 'verified' for i in ids): reasons.append('supporting_source_missing_or_pending')
        affected = [i for i in ids if any(t['type'] == 'source' and t['id'] == i for t in tasks)]
        if affected: reasons.append('supporting_source_requires_review')
        if reasons:
            row = {'type': 'question', 'id': question['id'], 'reasons': reasons, 'authorityIds': ids, 'reviewNote': record.get('reviewNote')}
            question_rows.append(row)
    return {
        'schemaVersion': 1, 'generatedAt': datetime.now(timezone.utc).isoformat(), 'asOf': today.isoformat(),
        'notice': 'Maintenance flags require human legal review. Reachability and text hashes do not verify legal support. Review dates and legal statuses have not been changed.',
        'linksChecked': check_links, 'tasks': tasks + question_rows, 'sources': sources
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check-links', action='store_true', help='Fetch allowlisted primary sources; never approves their legal accuracy')
    parser.add_argument('--previous', type=Path, help='Previous report for source-text change detection')
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--as-of', type=date.fromisoformat, default=date.today())
    args = parser.parse_args()
    catalogue = json.loads((ROOT / 'legal-authorities.json').read_text())
    feedback = json.loads((ROOT / 'question-feedback.json').read_text())
    questions = json.loads((ROOT / 'questions.js').read_text().split('=', 1)[1].strip().rstrip(';'))
    previous = json.loads(args.previous.read_text()) if args.previous else None
    report = build_queue(catalogue, feedback, questions, args.as_of, args.check_links, previous)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(f"Wrote {len(report['tasks'])} manual-review tasks to {args.output}; external links {'checked' if args.check_links else 'not checked'}.")


if __name__ == '__main__':
    main()
