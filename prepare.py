#!/usr/bin/env python3
"""Prepare faithful source plates and the local print-rendering workbench."""
import base64
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parent


def main():
    profiles=json.loads((ROOT/'src/profiles.json').read_text())
    sources=[]
    pdf=ROOT/'text/full-manual/pre-liver poetic manual.pdf'
    pdf_sha=hashlib.sha256(pdf.read_bytes()).hexdigest()
    (ROOT/'assets/pdf-plates').mkdir(exist_ok=True)
    for profile in profiles:
        number=profile['number']
        source=ROOT/profile.get('input',f'text/pre-liver poetic manual-2_Page_{number:02}.png')
        original=Image.open(source).convert('RGBA')
        rgb=Image.new('RGB',original.size,'white');rgb.paste(original,mask=original.getchannel('A'))
        scale=min(1700/rgb.width,2200/rgb.height)
        size=(round(rgb.width*scale),round(rgb.height*scale))
        plate=Image.new('RGB',(1700,2200),'white')
        resized=rgb.resize(size,Image.Resampling.LANCZOS)
        x=(1700-size[0])//2
        plate.paste(resized,(x,0))
        dest=ROOT/'assets/plates'/f'{number:02}.png';plate.save(dest,optimize=True)
        full_source=ROOT/'text/full-manual'/f'page-{number:02}.png'
        full=Image.open(full_source).convert('RGB')
        assert full.size==(2550,3300),f'Unexpected full-source geometry: {number}'
        full_dest=ROOT/'assets/pdf-plates'/f'{number:02}.png'
        full.resize((1700,2200),Image.Resampling.LANCZOS).save(full_dest,optimize=True)
        record={**profile,'original':str(source.relative_to(ROOT)),'originalSize':list(original.size),
                'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
                'plateSha256':hashlib.sha256(dest.read_bytes()).hexdigest(),
                'placement':[x,0,*size],
                'pdfPage':number,'pdfSha256':pdf_sha,
                'pdfRaster':str(full_source.relative_to(ROOT)),
                'pdfRasterSha256':hashlib.sha256(full_source.read_bytes()).hexdigest(),
                'comparisonPlate':str(full_dest.relative_to(ROOT)),
                'comparisonSha256':hashlib.sha256(full_dest.read_bytes()).hexdigest(),
                'plate':'data:image/png;base64,'+base64.b64encode(dest.read_bytes()).decode('ascii')}
        sources.append(record)
    (ROOT/'sources.json').write_text(json.dumps([{k:v for k,v in p.items() if k!='plate'} for p in sources],indent=2)+'\n')
    template=(ROOT/'src/render.html').read_text()
    template=template.replace('@@FONT@@',base64.b64encode((ROOT/'assets/SpecialElite-Regular.ttf').read_bytes()).decode('ascii'))
    template=template.replace('@@SOURCES@@',json.dumps(sources,ensure_ascii=False))
    template=template.replace('@@FIRST@@',(ROOT/'page-01.json').read_text())
    template=template.replace('@@RENDERER@@',(ROOT/'src/edition-renderer.js').read_text())
    (ROOT/'render.html').write_text(template)
    print(f'Prepared {len(sources)} print and full-PDF comparison plates without reflow, plus render.html.')


if __name__=='__main__':
    main()
