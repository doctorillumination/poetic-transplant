"""Finish narration bundles, mirror preservation, and release provenance."""
from pathlib import Path
import hashlib, importlib.util, json, re, subprocess, sys, zipfile
HERE=Path(__file__).resolve().parent
STUDIO=Path('/Users/bradley/Desktop/1 Art/8 Creative Coding/cyberdelic-studio')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def dump(path,data):path.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
press=Path('/tmp/cyberdelic-transplant-20261108')
site=Path('/tmp/fieldworks-transplant-20261108/public')
old=json.loads((HERE/'press-narrations-before.json').read_text())
catalog=json.loads((press/'narrations.json').read_text())
parts=old['mirror_audio_bundles']
packaged=set()
for part in parts:
    with zipfile.ZipFile(press/part['path']) as archive:packaged.update(archive.namelist())
expected={item['audio_path'] for item in catalog['items']}
assert packaged.issubset(expected)
missing=sorted(expected-packaged)
assert len(missing)==2,missing
name=f'audio-bundles/lewis-{len(parts)+1:02d}.zip'
with zipfile.ZipFile(press/name,'w',zipfile.ZIP_STORED) as archive:
    for path in missing:
        info=zipfile.ZipInfo(path,date_time=(1980,1,1,0,0,0))
        info.external_attr=0o644<<16
        archive.writestr(info,(press/path).read_bytes())
parts.append({'path':name,'sha256':sha(press/name),'length':(press/name).stat().st_size})
catalog['mirror_audio_bundles']=parts
dump(press/'narrations.json',catalog)
sys.path.insert(0,str(STUDIO/'reader'))
from templates import recorded_mirror_section
p=press/'mirror/index.html'
text,count=re.subn(r'<section id="lewis-mirror">.*?</section>',recorded_mirror_section(parts),p.read_text(),flags=re.S)
assert count==1
p.write_text(text)
spec=importlib.util.spec_from_file_location('release_mirror',press/'.github/scripts/mirror_archive.py')
mirror=importlib.util.module_from_spec(spec);spec.loader.exec_module(mirror)
mirror.build_core_mirror(press)
mirror.validate_mirror(press)
for root,name in [(press,'press'),(site,'standalone')]:
    frozen=json.loads((HERE/(name+'-frozen.json')).read_text())
    changes=[]
    for path,digest in frozen.items():
        if sha(root/path)==digest:continue
        # The archived overview retains its original recording and receives its new source binding.
        assert path.startswith('audio/') and path.endswith('.json'),path
        before=subprocess.check_output(['git','show','HEAD:'+('public/' if name=='standalone' else '')+path],cwd=root.parent if name=='standalone' else root)
        before=json.loads(before)
        after=json.loads((root/path).read_text())
        for key in ['audio_sha256','audio_length','text_sha256','document_sha256','chunks','checks']:
            assert before[key]==after[key],(path,key)
        assert 'overview' in before['id'] and 'overview-ten-works' in after['id'],path
        changes.append(path)
    print(name+': earlier source texts, artwork runtimes, MP3 bytes, and audio parts preserved. Updated overview bindings: '+str(len(changes)),flush=True)
provenance=json.loads((site/'provenance.json').read_text())
for path in site.rglob('*'):
    if path.is_file() and path.name!='provenance.json':
        provenance['files'][path.relative_to(site).as_posix()]=sha(path)
release=json.loads((HERE/'release.json').read_text())
update={'slug':'transplant','release_id':release['release_id'],
    'repository':release['source_record']['repository'],'revision':release['source_record']['revision'],'published_at':release['published_at']}
if update not in provenance.setdefault('runtime_updates',[]):provenance['runtime_updates'].append(update)
dump(site/'provenance.json',provenance)
print('Finished matching Lewis readings, offline audio parts, and the core mirror.',flush=True)
