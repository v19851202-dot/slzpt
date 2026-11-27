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
# 全家像素小人：首頁頁首走道與文章標題旁，不外連、不收資料、尊重減少動態、z-index 低於頁首與跳到內容。
all_html=[p for p in root.rglob('*.html') if not {'node_modules','.git','.wrangler'}&set(p.parts)]
for path in all_html:
    page=Page(); page.feed(path.read_text())
    for tag,attrs in page.tags:
        if tag=='img': assert 'alt' in attrs,('<img> needs alt',path)
pf_js=sorted(root.glob('assets/scripts/pixel-family-*.js')); pf_css=root/'assets/pixel-family.css'
assert len(pf_js)==1 and pf_css.exists(),('pixel family needs exactly one JS and its CSS',pf_js)
notes=sorted((root/'notes').glob('*.html'))
assert notes,('expected article pages in notes/',)
pf_ref=re.compile(r'pixel-family[^"\'\s>]*\.(?:js|css)|family-pixel/')
want=sorted(['pixel-family.css',pf_js[0].name])
for path in all_html:
    refs=pf_ref.findall(path.read_text())
    if path==root/'index.html' or path in notes:
        assert sorted(refs)==want,('index and articles must load pixel family CSS and JS once',path,refs)
    else:
        assert not refs,('pixel family only on home and article pages',path,refs)
for path in [*root.glob('assets/**/*.js'),*root.glob('assets/**/*.css')]:
    if path not in (pf_js[0],pf_css):
        assert not pf_ref.search(path.read_text()),('pixel family loaded from shared asset',path)
src=pf_js[0].read_text()
for bad in (r'\bfetch\s*\(',r'XMLHttpRequest',r'sendBeacon',r'https?://',r'\beval\s*\(',r'new\s+Function',r'WebSocket',r'EventSource',r'\bimport\s*\(',r'document\.cookie',r'indexedDB',r'\.innerHTML',r'\blocation\b'):
    assert not re.search(bad,src),('pixel family JS must not use',bad)
ls_sets=re.findall(r'localStorage\.setItem\s*\([^)]*\)',src)
assert ls_sets and all(re.fullmatch(r"localStorage\.setItem\(KEY, '(?:on|off)'\)",s) or re.fullmatch(r"window\.localStorage\.setItem\('slzpt-pixel-family', '(?:on|off)'\)",s) for s in ls_sets) or all('slzpt-pixel-family' not in s or re.search(r"setItem\(KEY, '(?:on|off)'\)",s) for s in ls_sets)
# localStorage 只存 on/off；sessionStorage 只記本次造訪是否已自動跳過一次舞。
assert "localStorage.setItem(KEY, 'on')" in src and "localStorage.setItem(KEY, 'off')" in src
assert "localStorage.getItem(KEY)" in src and src.count('localStorage.getItem(')==1
assert "sessionStorage.getItem(AUTO_KEY)" in src and "sessionStorage.setItem(AUTO_KEY, '1')" in src
assert "AUTO_KEY = 'slzpt-pixel-family-auto'" in src
assert 'removeItem' not in src and '.clear(' not in src
assert "matchMedia('(prefers-reduced-motion: reduce)')" in src and 'motionMq.matches' in src
assert 'document.hidden' in src and "'visibilitychange'" in src
assert 'setInterval(' in src and int(re.search(r'TICK = (\d+)',src)[1])>=100
assert "param('pf')" in src and "=== 'dance'" in src
assert all(f"=== '{p}'" in src or f"persona === '{p}'" in src for p in ('shy','sudden','bold'))
css=pf_css.read_text()
assert re.search(r'@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*animation:\s*none',css)
assert 'image-rendering: pixelated' in css
assert 'pointer-events: none' in css and 'position: fixed' not in css,'pixel layer is never fixed over content'
home_layer=re.search(r'body\.home \.pixel-family\s*\{([^}]*)\}',css)[1]
assert 'position: absolute' in home_layer and 'top: 0' in home_layer
assert re.search(r'body\.home\.pf-ready\s*\{[^}]*position:\s*relative',css)
assert re.search(r'body\.home\.pf-ready\s*\{[^}]*padding-top:\s*\d+px',css)
assert int(re.search(r'SIZE = (\d+)',src)[1])==72 and 'background-size: 288px 72px' in css and 'width: 72px' in css,'sprites are 72px'
pad=lambda sel:int(re.search(re.escape(sel)+r'\s*\{[^}]*padding-top:\s*(\d+)px',css)[1])
assert pad('body.home.pf-ready.pf-on')>=72+44 and pad('body.home.pf-ready')>=44,'top padding must hold the walkers and controls above the header'
lines=re.findall(r"line: '([^']*)'",src)
assert len(lines)==4 and not any(re.search(r'這篇|文章|看|點|連結|http|痛|治療|復健|膝|肩|腰|醫',l) for l in lines),('pixel lines are greetings only',lines)
assert "HELLO = '嘿！你好啊！'" in src
def z_of(text,sel): return int(re.search(re.escape(sel)+r'\s*\{[^}]*?z-index:\s*(\d+)',text,re.S)[1])
clinic=(root/'assets/clinic.css').read_text()
assert z_of(css,'body.home .pixel-family')<min(z_of(clinic,'.site-header'),z_of(clinic,'.skip')),'pixel layer must sit under header and skip link'
dance=[root/'assets/img/family-pixel'/f'{n}-dance.png' for n in ('mom','sis','dad','mei')]
assert all(p.exists() and p.stat().st_size>0 for p in dance),('each character needs a dance sprite sheet',dance)
assert 'background-size: 576px 72px' in css and all(p.name in css for p in dance)
# 網站上不得出現團體或歌曲名稱，也不得附音樂或音效。
ban=re.compile(r'BTS|Blackpink|BLACKPINK|NewJeans|TWICE|Seventeen|Stray\s*Kids|\bEXO\b|BigBang|BIGBANG|\bPSY\b|Gangnam|Dynamite|Permission to Dance|\bButter\b|AudioContext|HTMLAudioElement|new\s+Audio\b|<audio\b|<video\b|\.mp3\b|\.wav\b|\.ogg\b|\.m4a\b|\.aac\b',re.I)
scan_files=[pf_js[0],pf_css,root/'scripts/test-pixel-family.js',root/'index.html',*notes,*dance]
for path in scan_files:
    text=path.name if path.suffix=='.png' else path.read_text()
    if path.suffix=='.png': text=path.name
    hit=ban.search(text)
    assert not hit,('banned group, song, or audio mark',path,hit.group(0) if hit else None)
assert not re.search(r'\bnew\s+Audio\b|AudioContext|<audio\b|<video\b',src)
assert 'startMove' in src and 'AUTO_KEY' in src and 'MOVE_MS' in src
phone=re.compile(r'(?<![\w.-])(?:09\d{2}-?\d{3}-?\d{3}|0\d{1,2}-\d{3,4}-?\d{4}|\+886[\d-]{8,})(?![\w-])')
new_files=[pf_js[0],pf_css,root/'scripts/test-pixel-family.js',*root.glob('.claude/**/*') ]
for path in new_files:
    if path.is_file():
        hits=[m for m in phone.findall(path.read_text()) if m!='0912-000-000']
        assert not hits,('phone number pattern in new file',path,hits)
print(f'PASS: {len(pages)} HTML pages, local resource links, metadata, JavaScript syntax, cache hashes, enforced CSP, booking switch ({states[0]}), pixel family (home and {len(notes)} articles)')
