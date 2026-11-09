"""Add the exact 33-page Transplant edition to isolated gallery worktrees."""
from datetime import datetime, timezone
from html import escape
from pathlib import Path
import hashlib
import json
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
HERE = ROOT / 'publication'
STUDIO = Path('/Users/bradley/Desktop/1 Art/8 Creative Coding/cyberdelic-studio')
PRESS = Path('/tmp/cyberdelic-transplant-20261108')
FIELDWORKS = Path('/tmp/fieldworks-transplant-20261108/public')
SLUG = 'transplant'
REVISION = 'f896fc41ba05a7789d9c8dff75948aaf3e8e68bb'
PREVIOUS = ['lumen', 'aeria', 'everything-is-thinking', 'vellum', 'primitives',
            'opalia', 'undra', 'soft-signal', 'of-three-musicians', 'btc-swarm']
sys.path.insert(0, str(STUDIO / 'reader'))
import publish_fieldworks as publisher
publisher.SOURCE = HERE

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def dump(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')

meta = json.loads((HERE / 'fieldwork.json').read_text())
core = ['src', 'assets', 'text', 'index.html', 'build.py', 'prepare.py', 'build-manifest.json', 'sources.json']
assert not subprocess.check_output(['git', 'diff', REVISION, '--', *core], cwd=ROOT)
assert not subprocess.check_output(['git', 'status', '--porcelain', '--', *core], cwd=ROOT)
runtime = {'index.html': ROOT / 'index.html'}
for folder in ['assets/prints', 'assets/pdf-plates']:
    runtime.update({p.relative_to(ROOT).as_posix(): p for p in sorted((ROOT / folder).iterdir()) if p.is_file()})
runtime['assets/SpecialElite-LICENSE.txt'] = ROOT / 'assets/SpecialElite-LICENSE.txt'
assert len(runtime) == 101
packaged = [{'path': name, 'sha256': sha(path)} for name, path in runtime.items()]
tracked = subprocess.check_output(['git', 'ls-files', *core], cwd=ROOT, text=True).splitlines()
records = [{'path': name, 'sha256': sha(ROOT / name)} for name in tracked]
source = {'slug': SLUG, 'project': SLUG, 'repository': meta['repository'], 'revision': REVISION,
          'edition': meta['edition'], 'source_version': '1.2', 'source_subdirectory': '.',
          'source_files': records, 'packaged_files': packaged,
          'adaptations': 'Exact 33-page web edition, including all fronts, facing backs, and original PDF comparison plates. The host supplies gallery controls and bookmark synchronization separately. No artwork program or image bytes are changed.'}
now = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
release = {'schema': 'cyberdelic.space/fieldwork-release-v1', 'slug': SLUG,
           'edition': meta['edition'], 'published_at': now, 'source_record': source,
           'files': [{'path': 'runtime/' + name, 'sha256': sha(path), 'length': path.stat().st_size}
                     for name, path in runtime.items()]}
for name, ext in [('poster.jpg', 'jpg'), ('preview.mp4', 'mp4')]:
    path = HERE / (SLUG + '.' + ext)
    release['files'].append({'path': name, 'sha256': sha(path), 'length': path.stat().st_size})
rid = release['release_id'] = hashlib.sha256(json.dumps(release['files'], sort_keys=True).encode()).hexdigest()
probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(HERE / 'transplant.mp4')]))
video = probe['streams'][0]
assert len(probe['streams']) == 1 and video['codec_name'] == 'h264'
assert (video['width'], video['height'], video['r_frame_rate'], video['nb_frames']) == (960, 720, '60/1', '480')
assert (HERE / 'transplant.mp4').stat().st_size < 3 * 1024 * 1024
release['capture'] = {'kind': 'actual browser compositor, DOM and WebGL, fixed 60 fps, silent',
                      'raw_sha256': sha(HERE / 'capture-frames.json'),
                      'source_snapshot_sha256': hashlib.sha256(json.dumps(packaged, sort_keys=True).encode()).hexdigest(),
                      'loop_method': 'Four fully sampled page turns separated by verified identical resting spreads. First and final spreads match.',
                      'camera_recorded': False, 'method': json.loads((HERE / 'capture-method.json').read_text()),
                      'encoded_video': {'codec': 'h264', 'width': 960, 'height': 720, 'streams': 1, 'duration': float(probe['format']['duration'])}}
dump(HERE / 'release.json', release)

def install(site, standalone):
    base = site if standalone else site / 'fieldworks'
    if not standalone:
        shutil.copy2(HERE / 'mirror_archive.py', site / '.github/scripts/mirror_archive.py')
    catalog = json.loads((site / 'fieldworks.json').read_text())
    assert [i['slug'] for i in catalog['items']] == PREVIOUS
    folders = ['content', 'living-content', 'fieldwork-runtime', 'audio', 'audio-bundles', 'artwork-bundles',
               'images' if standalone else 'fieldworks/images', 'previews' if standalone else 'fieldworks/previews',
               'readings' if standalone else 'fieldworks/readings']
    frozen = {p.relative_to(site).as_posix(): sha(p) for folder in folders for p in (site / folder).rglob('*')
              if p.is_file() and p.name not in ['overview.md', 'captures.json']}
    name = 'standalone' if standalone else 'press'
    dump(HERE / (name + '-frozen.json'), frozen)
    dump(HERE / (name + '-narrations-before.json'), json.loads((site / 'narrations.json').read_text()))
    for name, path in runtime.items():
        dest = site / 'fieldwork-runtime' / SLUG / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, dest)
    reading = base / 'readings'
    prior = catalog['overview']
    archived = reading / 'overview-ten-works.md'
    shutil.copy2(site / prior['source_path'], archived)
    catalog.setdefault('archived_readings', []).append({**prior, 'slug': 'overview-ten-works',
        'title': 'Fieldworks, ten-work edition', 'source': archived.name,
        'source_path': archived.relative_to(site).as_posix(), 'href': archived.relative_to(site).as_posix()})
    old = (reading / 'overview.md').read_text()
    new = old.replace('Ten living artworks', 'Eleven living artworks').replace(
        'A history in formation.', 'A history in formation. A manual, held differently.')
    assert new != old
    (reading / 'overview.md').write_text(new)
    prior.update(source_sha256=sha(reading / 'overview.md'), source_length=(reading / 'overview.md').stat().st_size)
    shutil.copy2(HERE / 'transplant.md', reading / 'transplant.md')
    item = {**meta, 'offline_part': not standalone, 'release_id': rid, 'runtime_published_at': now,
            'source_path': (reading / 'transplant.md').relative_to(site).as_posix(),
            'source_sha256': sha(reading / 'transplant.md'), 'source_length': (reading / 'transplant.md').stat().st_size,
            'href': 'transplant/' if standalone else 'fieldworks/transplant/'}
    for key, folder, ext in [('poster', 'images', 'jpg'), ('preview', 'previews', 'mp4')]:
        dest = base / folder / ('transplant.' + ext)
        shutil.copy2(HERE / dest.name, dest)
        item[key] = {'path': dest.relative_to(site).as_posix(), 'sha256': sha(dest), 'length': dest.stat().st_size,
                     'kind': 'actual-browser-capture' if key == 'poster' else 'recorded-artwork-loop'}
    previous = catalog['items'][-1]
    catalog['items'].append(item)
    catalog.update(version='1.9', date='2026-11-08', published_at=now)
    dump(site / 'fieldworks.json', catalog)
    sources = json.loads((base / 'sources.json').read_text())
    sources['items'].append(source)
    dump(base / 'sources.json', sources)
    dump(base / 'releases' / ('transplant-' + rid + '.json'), release)
    captures = json.loads((base / 'previews/captures.json').read_text())
    captures['items'].append({'slug': SLUG, 'capture': release['capture']['kind'],
        'raw_sha256': release['capture']['raw_sha256'], 'raw_duration': 8.0,
        'loop_method': release['capture']['loop_method'], 'source_snapshot_sha256': release['capture']['source_snapshot_sha256'],
        'path': 'transplant.mp4', 'sha256': item['preview']['sha256'], 'length': item['preview']['length']})
    dump(base / 'previews/captures.json', captures)
    gallery = base / 'index.html'
    html = re.sub(r'<div class="fieldworks-intro">.*?</div>', '<div class="fieldworks-intro">' + publisher.prose_html(new) + '</div>', gallery.read_text(), flags=re.S)
    card = f'''<li class="fieldworks-card"><a class="fieldworks-link" href="transplant/" aria-label="Enter Transplant"><div class="fieldworks-image"><img src="images/transplant.jpg" alt="{escape(meta['alt'])}" width="960" height="720" decoding="async"><video data-preview-src="previews/transplant.mp4" muted loop playsinline preload="none" aria-hidden="true" tabindex="-1"></video></div><p class="fieldwork-number">11 / Living artwork</p><h2>Transplant</h2><p>{escape(meta['description'])}</p><div class="fieldworks-enter">Enter Transplant<span aria-hidden="true">↗</span></div></a></li>'''
    html = html.replace('</ol>', card + '</ol>', 1).replace('and BTC / SWARM:', 'BTC / SWARM, and Transplant:').replace('Ten living artworks', 'Eleven living artworks')
    gallery.write_text(html)
    page = publisher.artwork_page(meta, previous, catalog['items'][0])
    page = page.replace('<script src="../../fieldworks.js', '<script src="../../transplant-viewer.js" defer></script><script src="../../fieldworks.js')
    page = page.replace('</head>', '<link rel="stylesheet" href="../../read-aloud.css"><script src="../../read-aloud.js" defer></script></head>')
    page = re.sub(r'fieldworks\.js\?v=[^\"\s]+', 'fieldworks.js?v=20261108-transplant', page)
    page = page.replace('Transplant, interactive generative artwork', 'Transplant, interactive poetic book')
    if standalone:
        page = page.replace('../../project/cyberdelic-os/field-notes/', 'https://cyberdelic.space/project/cyberdelic-os/field-notes/').replace('../../', '../')
        page = page.replace('data-theme="psychedelic"', 'data-theme="paper"').replace(' · cyberdelic.space</title>', ' · Brad Necyk</title>')
        page = re.sub(r'<script src="[^\"]*theme\.js[^\"]*"></script>', '', page)
        page = page.replace('href="../favicon.ico"', 'href="../favicon.svg"').replace('https://cyberdelic.space/fieldworks/transplant/', 'https://fieldworks.space/transplant/').replace('https://cyberdelic.space/fieldworks/images/transplant.jpg', 'https://fieldworks.space/images/transplant.jpg')
        page = page.replace('</head>', '<link rel="stylesheet" href="../paper.css"></head>')
    dest = base / 'transplant/index.html'
    dest.parent.mkdir()
    dest.write_text(page)
    shutil.copy2(HERE / 'transplant-viewer.js', site / 'transplant-viewer.js')
    for slug, which in [('lumen', 0), ('btc-swarm', 1)]:
        p = base / slug / 'index.html'
        def update(match):
            links = re.findall(r'<a\b.*?</a>', match[0])
            links[which] = '<a href="../transplant/">' + ('← Transplant' if which == 0 else 'Transplant →') + '</a>'
            return '<nav class="fieldwork-switch" aria-label="Other Fieldworks">' + ''.join(links) + '</nav>'
        text, count = re.subn(r'<nav class="fieldwork-switch".*?</nav>', update, p.read_text(), flags=re.S)
        assert count == 1
        p.write_text(text)
    loader = site / 'fieldworks.js'
    script = loader.read_text()
    line = next(line for line in script.splitlines() if 'style.href = new URL' in line)
    script = script.replace(line, line.replace('style.href = new URL', 'style.href = player.dataset.fieldwork === \"transplant\" ? new URL(\"../../fieldworks-immersive.css?v=20261108-transplant\", frame.src).href : new URL'))
    loader.write_text(script)
    p = site / 'fieldworks-immersive.css'
    p.write_text(p.read_text() + '\n' + (HERE / 'transplant-immersive.css').read_text())
    p = site / '_headers'
    text = p.read_text()
    blocks = text.split('\n\n')
    template = '/of-three-musicians/*' if standalone else '/fieldworks/of-three-musicians/*'
    view = next(b for b in blocks if b.startswith(template + '\n')).replace(template, ('/' if standalone else '/fieldworks/') + 'transplant/*')
    headers = next(b for b in blocks if b.startswith('/fieldwork-runtime/of-three-musicians/*\n')).replace('/fieldwork-runtime/of-three-musicians/*', '/fieldwork-runtime/transplant/*').replace("font-src 'self';", "font-src 'self' data:;")
    p.write_text(text.rstrip() + '\n\n' + view.strip() + '\n\n' + headers.strip() + '\n')
    p = site / 'sitemap.xml'
    url = 'https://fieldworks.space/transplant/' if standalone else 'https://cyberdelic.space/fieldworks/transplant/'
    p.write_text(p.read_text().replace('</urlset>', '<url><loc>' + url + '</loc></url>\n</urlset>'))
    if not standalone:
        p = site / 'living-library.json'
        data = json.loads(p.read_text())
        data['items'].append({'id': 'fieldwork-transplant', 'release_id': 'FW-TRANSPLANT', 'label': 'FIELDWORK · LIVING',
            'title': meta['title'], 'href': item['href'], 'author': 'Brad Necyk', 'date': '2026-11-08',
            'publication_state': 'living', 'form': 'generative-art', 'world': 'cyberdelic-os', 'register': 'play',
            'themes': meta['themes'], 'excerpt': meta['description'],
            'rationale': 'An interactive poetic book in Fieldworks. Thematic placements are interpretive and remain distinct from inscription evidence.'})
        dump(p, data)
        p = site / 'living-relations/catalog.json'
        data = json.loads(p.read_text())
        data['items'].append({'id': 'catalog:fieldworks:transplant', 'record_kind': 'artifact', 'title': meta['title'],
            'href': item['href'], 'summary': meta['description'], 'subjects': meta['themes'] + ['poetry', 'interactive artwork', 'Fieldworks'],
            'search_terms': ['Transplant', 'liver', 'poetic manual', meta['caption'], meta['gesture']],
            'questions': ['What can poetry implicate within the instructions of a medical manual?'], 'related': [],
            'evidence': [{'source': item['source_path'], 'locator': '# Transplant'}], 'epistemic_status': 'strong',
            'review_state': 'model-proposed', 'introduced_by': 'human-authorized-fieldworks-publication', 'last_tended_at': now,
            'uncertainty': 'Thematic placements remain interpretive. This living artwork is not an inscription.'})
        data['count'] = len(data['items'])
        data['updated_at'] = max(data.get('updated_at', ''), now)
        dump(p, data)
        p = site / 'project/cyberdelic-os/index.html'
        p.write_text(p.read_text().replace('and BTC / SWARM:', 'BTC / SWARM, and Transplant:'))
        p = site / 'README.md'
        p.write_text(p.read_text().replace('larger self-contained BTC / SWARM artwork, cover, and preview', 'larger artworks, including BTC / SWARM and the complete Transplant book, with their covers and previews'))
    for name, digest in frozen.items():
        assert sha(site / name) == digest, name
    print('Prepared ' + str(site), flush=True)

if __name__ == '__main__':
    install(PRESS, False)
    install(FIELDWORKS, True)
