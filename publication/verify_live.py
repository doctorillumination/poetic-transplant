"""Compare both public galleries with every new runtime and release resource."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import subprocess
import time

HERE = Path(__file__).resolve().parent
SITES = [
    ('fieldworks.space', Path('/tmp/fieldworks-transplant-20261108/public'), ''),
    ('cyberdelic.space', Path('/tmp/cyberdelic-transplant-20261108'), 'fieldworks/'),
]

def fetch(host, name):
    route = name[:-10] if name.endswith('index.html') else name
    result = subprocess.run(['curl', '--fail', '--silent', '--show-error', '--location', '--compressed',
        '--retry', '2', '--retry-delay', '1', '--max-time', '45', 'https://' + host + '/' + route], capture_output=True)
    if result.returncode:
        raise ValueError(host + '/' + route + ': ' + result.stderr.decode().strip())
    return result.stdout

def ready(entry):
    host, root, base = entry
    try:
        return fetch(host, 'fieldworks.json') == (root / 'fieldworks.json').read_bytes()
    except ValueError:
        return False

for attempt in range(60):
    with ThreadPoolExecutor(max_workers=2) as pool:
        states = list(pool.map(ready, SITES))
    if all(states):
        break
    if attempt % 6 == 0:
        print('Waiting for public release catalogs: ' + str(dict(zip([e[0] for e in SITES], states))), flush=True)
    time.sleep(5)
else:
    raise ValueError('Public catalogs did not match the reviewed release')

results = []
for host, root, base in SITES:
    names = ['fieldworks.json', 'fieldworks-immersive.css', 'fieldworks.js', 'transplant-viewer.js',
        'narrations.json', base + 'index.html', base + 'transplant/index.html', base + 'sources.json',
        base + 'images/transplant.jpg', base + 'previews/transplant.mp4', base + 'readings/transplant.md',
        base + 'readings/overview.md', base + 'readings/overview-ten-works.md',
        base + 'lumen/index.html', base + 'btc-swarm/index.html']
    names += [p.relative_to(root).as_posix() for p in (root / 'fieldwork-runtime/transplant').rglob('*') if p.is_file()]
    names += [p.relative_to(root).as_posix() for p in (root / base / 'releases').glob('transplant-*.json')]
    catalog = json.loads((root / 'narrations.json').read_text())
    for item in catalog['items']:
        if item['id'] in ['fieldworks-overview', 'fieldworks-transplant']:
            names += [item['audio_path'], item['reading_path']]
    if base:
        names += [p.relative_to(root).as_posix() for p in (root / 'artwork-bundles').glob('transplant-*.zip')]
        names += ['audio-bundles/lewis-26.zip', 'artwork-bundles.json', 'cyberdelic-space.zip',
            'mirror/index.html', 'living-library.json', 'living-relations/catalog.json',
            'project/cyberdelic-os/index.html', 'README.md']
    else:
        names += ['provenance.json']

    def compare(name):
        expected = (root / name).read_bytes()
        for attempt in range(3):
            data = fetch(host, name)
            if data == expected:
                return {'path': name, 'length': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
            if attempt < 2:
                time.sleep(2)
        raise AssertionError(host + '/' + name + ' differs: ' + str(len(data)) + ' bytes')

    with ThreadPoolExecutor(max_workers=6) as pool:
        records = list(pool.map(compare, sorted(set(names))))
    results.append({'host': host, 'exact_resources': records})
    print('Verified ' + str(len(records)) + ' exact public resources on ' + host, flush=True)

(HERE / 'live-verification.json').write_text(json.dumps({
    'verified_at': datetime.now(timezone.utc).isoformat(), 'sites': results}, indent=2) + '\n')
