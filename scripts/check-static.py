"""Static deployment checks: no runtime dependencies or network calls."""
import hashlib, json, re, subprocess
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote

root = Path(__file__).resolve().parents[1]
class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.tags=[]; self.scripts=[]; self.current=None
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs); self.tags.append((tag,attrs))
        assert not any(k.startswith('on') for k in attrs), 'inline event handler'
        if tag=='script': self.current=[attrs,'']; self.scripts.append(self.current)
    def handle_data(self,data):
        if self.current is not None: self.current[1]+=data
    def handle_endtag(self,tag):
        if tag=='script': self.current=None

pages=[root/'index.html',root/'about.html',root/'privacy.html',root/'book.html',root/'404.html',root/'ip-preview.html',*sorted((root/'notes').glob('*.html'))]
for path in pages:
    page=Page(); page.feed(path.read_text())
    assert sum(tag=='h1' for tag,_ in page.tags)==1, path
    for attrs,script in page.scripts:
        if attrs.get('type')=='application/ld+json': json.loads(script)
        else: assert attrs.get('src') and not script.strip(), ('inline executable script',path)
    for tag,attrs in page.tags:
        for key in ('src','href','poster','data-src'):
            value=attrs.get(key,''); url=urlsplit(value)
            assert url.scheme!='javascript',path
            if url.scheme or url.netloc or not url.path:continue
            target=(root/unquote(url.path).lstrip('/')) if value.startswith('/') else (path.parent/unquote(url.path))
            assert target.exists() or target.with_suffix('.html').exists(),(path,value)
    if path.name!='404.html':
        canonical=[attrs['href'] for tag,attrs in page.tags if tag=='link' and attrs.get('rel')=='canonical']
        expected='https://slzpt.com/'+('' if path.name=='index.html' else str(path.relative_to(root).with_suffix('')))
        assert canonical==[expected],(path,canonical)

for path in [*root.glob('assets/**/*.js'),*root.glob('functions/**/*.js')]:
    subprocess.run(['node','--check',str(path)],check=True,capture_output=True)
    if path.parent.name=='scripts':
        assert path.stem.rsplit('-',1)[1]==hashlib.sha256(path.read_bytes()).hexdigest()[:12],path
headers=(root/'_headers').read_text()
assert all(len(line)<=2000 for line in headers.splitlines())
csp=next(line.split(':',1)[1] for line in headers.splitlines() if line.strip().startswith('Content-Security-Policy:'))
script=re.search(r'(?:^|;)\s*script-src\s+([^;]+)',csp)[1]
assert "'self'" in script and 'unsafe-inline' not in script and 'unsafe-eval' not in script
assert 'script-src-attr \'none\'' in csp
assert '<source src=' not in (root/'index.html').read_text()
# 線上預約開關：所有入口只能連到 /book，開放與否只由 book.html 的 data-booking 決定。
BOOKING_HOST='book.slzpt.com'
for path in pages:
    if path.name!='book.html':
        assert BOOKING_HOST not in path.read_text(),('booking entry must link to /book, not the booking system directly',path)
book=(root/'book.html').read_text()
states=re.findall(r'data-booking="(open|closed)"',book)
assert len(states)==1,('book.html needs exactly one data-booking="open|closed" block',states)
noindex='<meta name="robots" content="noindex">' in book
in_sitemap='https://slzpt.com/book' in (root/'sitemap.xml').read_text()
if states[0]=='closed':
    assert BOOKING_HOST not in book,'booking is closed but book.html links to the booking system'
    assert noindex and not in_sitemap,'closed booking page must be noindex and left out of sitemap.xml'
else:
    assert 'https://'+BOOKING_HOST in book,'booking is open but book.html has no link to the booking system'
    assert not noindex,'open booking page should be indexable'
print(f'PASS: {len(pages)} HTML pages, local resource links, metadata, JavaScript syntax, cache hashes, enforced CSP, booking switch ({states[0]})')
