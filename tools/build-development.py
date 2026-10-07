"""Package a separate Firefox development identity without changing source identity."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('output', type=Path)
parser.add_argument('--baseline', action='store_true', help='Use upstream/master versions of the three changed source files')
parser.add_argument('--observer', type=Path, help='Test-only observer module, excluded from normal builds')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
source = root / 'v3'
changed = {'data/inject/watch.js', 'data/inject/meta.js', 'worker/modes/number.mjs'}
entries = {}
for file in sorted(source.rglob('*')):
    if file.is_file():
        name = file.relative_to(source).as_posix()
        entries[name] = subprocess.check_output(['git', 'show', f'upstream/master:v3/{name}'], cwd=root) if args.baseline and name in changed else file.read_bytes()
manifest = json.loads(entries['manifest.json'])
manifest['name'] = 'Auto Tab Discard — Media Grace ' + ('Baseline' if args.baseline else 'Test')
manifest['browser_specific_settings']['gecko']['id'] = 'auto-tab-discard-media-grace@local.test'
manifest['version'] = '0.7.5.1'
entries['manifest.json'] = (json.dumps(manifest, indent=2) + '\n').encode()
if args.observer:
    entries['test/observer.mjs'] = args.observer.read_bytes()
    entries['firefox/background.html'] += b'\n<script type="module" src="/test/observer.mjs"></script>\n'
args.output.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(args.output, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
    for name, data in sorted(entries.items()):
        info = zipfile.ZipInfo(name, (2020, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        archive.writestr(info, data)
print(json.dumps({'file': str(args.output.resolve()), 'sha256': hashlib.sha256(args.output.read_bytes()).hexdigest(),
                  'test_instrumentation': bool(args.observer), 'baseline': args.baseline}, indent=2))
