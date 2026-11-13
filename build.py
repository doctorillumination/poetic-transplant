#!/usr/bin/env python3
"""Build the self-contained complete book from the local print edition."""
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
    pdf_sha=sha(ROOT/'text/full-manual/pre-liver poetic manual.pdf')
    book=[];reader=[];records=[]
    for p in metadata:
        n=p['number'];front=ROOT/'assets/prints'/f'{n:02}.jpg';back=ROOT/'assets/prints'/f'{n:02}-back.jpg'
        source=ROOT/'assets/plates'/f'{n:02}.png'
        assert front.exists() and back.exists(),f'Render sheet {n:02} before building.'
        assert sha(ROOT/p['original'])==p['sourceSha256'],f'Original changed: {n}'
        assert sha(source)==p['plateSha256'],f'Print plate changed: {n}'
        assert pdf_sha==p['pdfSha256'],f'PDF changed after preparation: {n}'
        assert sha(ROOT/p['pdfRaster'])==p['pdfRasterSha256'],f'PDF raster changed: {n}'
        assert sha(ROOT/p['comparisonPlate'])==p['comparisonSha256'],f'Comparison changed: {n}'
        book.append({'number':n,'title':p['title'],'description':p['description'],
                     'front':data(front,'image/jpeg'),'back':data(back,'image/jpeg'),
                     'source':data(ROOT/p['comparisonPlate'],'image/png')})
        if n==1:
            book[-1]['transcript']=first_transcript
        reader.append({**book[-1],
                       'front':str(front.relative_to(ROOT)),
                       'back':str(back.relative_to(ROOT)),
                       'source':p['comparisonPlate']})
        records.append({'number':n,'seed':p['seed'],'title':p['title'],
                        'source':p['original'],'source_sha256':p['sourceSha256'],
                        'normalized_placement':p['placement'],'original_size':p['originalSize'],
                        'plate_sha256':sha(source),'front_sha256':sha(front),'back_sha256':sha(back),
                        'treatment':'weathered-ink-without-water-stains','source_treatment':p['treatment'],'pdf_page':p['pdfPage'],
                        'pdf_raster':p['pdfRaster'],'pdf_raster_sha256':p['pdfRasterSha256'],
                        'comparison_plate':p['comparisonPlate'],'comparison_sha256':p['comparisonSha256']})
    template=(ROOT/'src/book.html').read_text()
    def render(bundle):
        html=template
        for key,value in {'@@FONT@@':base64.b64encode((ROOT/'assets/SpecialElite-Regular.ttf').read_bytes()).decode('ascii'),
                      '@@FONT_LICENSE@@':(ROOT/'assets/SpecialElite-LICENSE.txt').read_text(),
                      '@@BOOK@@':json.dumps(bundle,ensure_ascii=False,separators=(',',':')),
                      '@@BOOK_CODE@@':(ROOT/'src/book.js').read_text(),
                      '@@PAGE_COUNT@@':str(len(book))}.items():
            assert html.count(key)==1,key
            html=html.replace(key,value)
        assert '\u2014' not in html
        return html
    output=ROOT/'index.html';output.write_text(render(reader))
    standalone=ROOT/'standalone.html';standalone.write_text(render(book))
    manifest={'edition':'Transplant, complete 33-page edition v1.3','pages':records,
              'source_pdf':'text/full-manual/pre-liver poetic manual.pdf',
              'source_pdf_sha256':pdf_sha,
              'page_count':len(records),'page_turn':'Two-page book, persistent mirrored verso on the left, cylindrical WebGL turn across the spine.',
              'reader_sha256':sha(ROOT/'src/book.js'),'profiles_sha256':sha(ROOT/'src/profiles.json'),
              'renderer_sha256':sha(ROOT/'src/edition-renderer.js'),'output_sha256':sha(output),
              'output_bytes':output.stat().st_size,'runtime_dependencies':[],
              'local_image_assets':len(records)*3,
              'standalone_sha256':sha(standalone),'standalone_bytes':standalone.stat().st_size}
    (ROOT/'build-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(f'Built {output}: {len(records)} sheets, {output.stat().st_size:,} bytes, local full-resolution images.')
    print(f'Built {standalone}: {standalone.stat().st_size:,} bytes, all assets embedded.')


if __name__=='__main__':
    main()
