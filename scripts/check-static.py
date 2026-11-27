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

pages=[root/'index.html',root/'about.html',root/'privacy.html',root/'book.html',root/'404.html',*sorted((root/'notes').glob('*.html'))]
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
# 全家像素小人：只在首頁、不外連、不收資料、尊重減少動態、z-index 低於頁首與跳到內容。
all_html=[p for p in root.rglob('*.html') if not {'node_modules','.git','.wrangler'}&set(p.parts)]
for path in all_html:
    page=Page(); page.feed(path.read_text())
    for tag,attrs in page.tags:
        if tag=='img': assert 'alt' in attrs,('<img> needs alt',path)
pf_js=sorted(root.glob('assets/scripts/pixel-family-*.js')); pf_css=root/'assets/pixel-family.css'
assert len(pf_js)==1 and pf_css.exists(),('pixel family needs exactly one JS and its CSS',pf_js)
pf_ref=re.compile(r'pixel-family[^"\'\s>]*\.(?:js|css)|family-pixel/')
for path in all_html:
    refs=pf_ref.findall(path.read_text())
    if path==root/'index.html':
        assert sorted(refs)==sorted([f'pixel-family.css',pf_js[0].name]),('index.html must load pixel family CSS and JS once',refs)
    else:
        assert not refs,('pixel family is home page only',path,refs)
for path in [*root.glob('assets/**/*.js'),*root.glob('assets/**/*.css')]:
    if path not in (pf_js[0],pf_css):
        assert not pf_ref.search(path.read_text()),('pixel family loaded from shared asset',path)
src=pf_js[0].read_text()
for bad in (r'\bfetch\s*\(',r'XMLHttpRequest',r'sendBeacon',r'https?://',r'\beval\s*\(',r'new\s+Function',r'WebSocket',r'EventSource',r'\bimport\s*\(',r'sessionStorage',r'document\.cookie',r'indexedDB',r'\.innerHTML',r'\blocation\b'):
    assert not re.search(bad,src),('pixel family JS must not use',bad)
sets=re.findall(r'setItem\s*\([^)]*\)',src)
assert sets and all(re.fullmatch(r"setItem\('slzpt-pixel-family', '(?:on|off)'\)",s) for s in sets),('localStorage only stores on/off under one key',sets)
assert set(re.findall(r"getItem\('([^']*)'\)",src))=={'slzpt-pixel-family'} and src.count('getItem(')==1
assert 'removeItem' not in src and '.clear(' not in src
assert "matchMedia('(prefers-reduced-motion: reduce)')" in src and 'motionMq.matches' in src
assert 'document.hidden' in src and "'visibilitychange'" in src
assert re.search(r'setInterval\(tick, TICK\)',src) and int(re.search(r'TICK = (\d+)',src)[1])>=100
css=pf_css.read_text()
assert re.search(r'@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*animation:\s*none',css)
assert 'image-rendering: pixelated' in css
layer_css=re.search(r'\.pixel-family\s*\{([^}]*)\}',css)[1]
assert 'pointer-events: none' in layer_css and 'position: absolute' in layer_css and 'position: fixed' not in css,'pixel layer lives in the bottom padding, never fixed over content'
assert re.search(r'body\.pf-ready\s*\{[^}]*position:\s*relative',css),'pixel layer must anchor to the page bottom'
assert int(re.search(r'SIZE = (\d+)',src)[1])==72 and 'background-size: 288px 72px' in css and 'width: 72px' in css,'sprites are 72px'
pad=lambda sel:int(re.search(re.escape(sel)+r'\s*\{[^}]*padding-bottom:\s*(\d+)px',css)[1])
assert pad('body.pf-ready.pf-on')>=72+44 and pad('body.pf-ready')>=44,'bottom padding must hold the walkers and controls below the footer'
lines=re.findall(r"line: '([^']*)'",src)
assert len(lines)==4 and not any(re.search(r'這篇|文章|看|點|連結|http|痛|治療|復健|膝|肩|腰|醫',l) for l in lines),('pixel lines are greetings only',lines)
def z_of(text,sel): return int(re.search(re.escape(sel)+r'\s*\{[^}]*?z-index:\s*(\d+)',text)[1])
clinic=(root/'assets/clinic.css').read_text()
assert z_of(css,'.pixel-family')<min(z_of(clinic,'.site-header'),z_of(clinic,'.skip')),'pixel layer must sit under header and skip link'
assert int(re.search(r"max-width: (\d+)px",src)[1]) in {int(n) for n in re.findall(r'@media \(max-width: (\d+)px\)',clinic)},'narrow breakpoint must reuse clinic.css'
assert int(re.search(r"max-width: (\d+)px",src)[1])==900,'pixel family defaults off at 900px and below (tablets too)'
phone=re.compile(r'(?<![\w.-])(?:09\d{2}-?\d{3}-?\d{3}|0\d{1,2}-\d{3,4}-?\d{4}|\+886[\d-]{8,})(?![\w-])')
new_files=[pf_js[0],pf_css,root/'scripts/test-pixel-family.js',*root.glob('.claude/**/*') ]
for path in new_files:
    if path.is_file():
        hits=[m for m in phone.findall(path.read_text()) if m!='0912-000-000']
        assert not hits,('phone number pattern in new file',path,hits)
print(f'PASS: {len(pages)} HTML pages, local resource links, metadata, JavaScript syntax, cache hashes, enforced CSP, booking switch ({states[0]}), pixel family (index only)')
