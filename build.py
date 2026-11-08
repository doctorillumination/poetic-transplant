#!/usr/bin/env python3
"""Build the self-contained fifteen-sheet book from the local print edition."""
import base64
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parent


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def data(path,mime):
    return 'data:'+mime+';base64,'+base64.b64encode(path.read_bytes()).decode('ascii')


def main():
    metadata=json.loads((ROOT/'sources.json').read_text())
    first=json.loads((ROOT/'page-01.json').read_text())
    first_transcript='\n'.join(' '*round((line['x']-200)/25)+line['text'] for line in first['lines'])
    book=[];records=[]
    for p in metadata:
        n=p['number'];front=ROOT/'assets/prints'/f'{n:02}.jpg';back=ROOT/'assets/prints'/f'{n:02}-back.jpg'
        source=ROOT/'assets/plates'/f'{n:02}.png'
        assert front.exists() and back.exists(),f'Render sheet {n:02} before building.'
        assert sha(ROOT/p['original'])==p['sourceSha256'],f'Original changed: {n}'
        book.append({'number':n,'title':p['title'],'description':p['description'],
                     'front':data(front,'image/jpeg'),'back':data(back,'image/jpeg'),'source':data(source,'image/png')})
        if n==1:
            book[-1]['transcript']=first_transcript
        records.append({'number':n,'seed':p['seed'],'title':p['title'],
                        'source':p['original'],'source_sha256':p['sourceSha256'],
                        'normalized_placement':p['placement'],'original_size':p['originalSize'],
                        'plate_sha256':sha(source),'front_sha256':sha(front),'back_sha256':sha(back)})
    html=(ROOT/'src/book.html').read_text()
    for key,value in {'@@FONT@@':base64.b64encode((ROOT/'assets/SpecialElite-Regular.ttf').read_bytes()).decode('ascii'),
                      '@@FONT_LICENSE@@':(ROOT/'assets/SpecialElite-LICENSE.txt').read_text(),
                      '@@BOOK@@':json.dumps(book,ensure_ascii=False,separators=(',',':')),
                      '@@BOOK_CODE@@':(ROOT/'src/book.js').read_text()}.items():
        assert html.count(key)==1,key
        html=html.replace(key,value)
    assert '\u2014' not in html
    output=ROOT/'index.html';output.write_text(html)
    manifest={'edition':'Transplant, complete book study v1.0','pages':records,
              'page_count':len(records),'page_turn':'Developable cylindrical WebGL surface, two-sided material, pointer-driven curl.',
              'reader_sha256':sha(ROOT/'src/book.js'),'profiles_sha256':sha(ROOT/'src/profiles.json'),
              'renderer_sha256':sha(ROOT/'src/edition-renderer.js'),'output_sha256':sha(output),
              'output_bytes':output.stat().st_size,'runtime_dependencies':[]}
    (ROOT/'build-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(f'Built {output}: {len(records)} sheets, {output.stat().st_size:,} bytes, all assets embedded.')


if __name__=='__main__':
    main()
