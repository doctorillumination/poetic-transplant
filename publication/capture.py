"""Prepare a browser compositor capture with a manually stepped animation clock."""
from pathlib import Path
import hashlib,json,shutil
ROOT=Path(__file__).resolve().parents[1]
DEST=Path('/tmp/transplant-capture-20261108')
DEST.mkdir(exist_ok=True);(DEST/'frames').mkdir(exist_ok=True)
html=(ROOT/'index.html').read_text()
clock='''<script>
let captureTime=0,captureCallbacks=new Map(),captureId=0;
performance.now=()=>captureTime;
window.requestAnimationFrame=callback=>{captureCallbacks.set(++captureId,callback);return captureId;};
window.cancelAnimationFrame=id=>captureCallbacks.delete(id);
addEventListener('message',event=>{
 if(event.source!==parent||event.data!=='capture-step')return;
 captureTime+=1000/60;const callbacks=Array.from(captureCallbacks.values());captureCallbacks.clear();
 callbacks.forEach(callback=>callback(captureTime));
 parent.postMessage({captureFrame:Math.round(captureTime*60/1000)},location.origin);
});
</script>'''
css='''<style>
html,body{margin:0;width:960px;height:720px;overflow:hidden;background:#d8d7cd}
.masthead,.reader-nav,.colophon{display:none!important}
.paper-well{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:0;overflow:visible}
.folio{width:900px!important;max-width:900px!important;flex:none;margin:0!important}
.corner{display:none!important}
</style>'''
html=html.replace('<head>','<head>'+clock).replace('</head>',css+'</head>')
(DEST/'artwork.html').write_text(html)
(DEST/'index.html').write_text('''<!doctype html><html><head><meta charset="utf-8"><title>Transplant capture</title><style>body{margin:0;background:#d8d7cd;font:13px monospace}aside{height:70px;display:flex;gap:20px;align-items:center;padding:0 20px}iframe{position:absolute;left:0;top:70px;width:960px;height:720px;border:0}button{padding:10px}</style></head><body><aside><button id="step">Next frame</button><button id="forward">Turn forward</button><button id="backward">Turn back</button><label>Frames<input id="count" type="number" value="60" style="width:65px"></label><button id="advance">Advance frames</button><output id="frame">0</output></aside><iframe title="Source book for capture" src="artwork.html#sheet-16"></iframe><script>
const frame=document.querySelector('iframe');let pending=0;
function step(){frame.contentWindow.postMessage('capture-step',location.origin);}
document.querySelector('#advance').onclick=()=>{pending=Number(document.querySelector('#count').value);step();};
document.querySelector('#forward').onclick=()=>frame.contentDocument.querySelector('#next').click();
document.querySelector('#backward').onclick=()=>frame.contentDocument.querySelector('#previous').click();
document.querySelector('#step').onclick=step;
addEventListener('message',event=>{if(event.source===frame.contentWindow&&event.data.captureFrame){document.querySelector('#frame').value=event.data.captureFrame;if(pending>0&&--pending>0)step();}});
</script></body></html>''')
assets=DEST/'assets'
if not assets.exists():assets.symlink_to(ROOT/'assets',target_is_directory=True)
(ROOT/'publication/capture-method.json').write_text(json.dumps({'source_sha256':hashlib.sha256((ROOT/'index.html').read_bytes()).hexdigest(),'harness_sha256':hashlib.sha256((DEST/'artwork.html').read_bytes()).hexdigest(),'method':'Actual browser compositor screenshots, with the unchanged book program and full-resolution image assets. A separate review harness steps requestAnimationFrame and performance.now at 1/60 second. Interface elements are outside the recorded book area. No interpolated animation frames. Resting spreads are verified and held as identical frames between the fully sampled turns.','capture_size':[960,720],'frames':480,'source_pages':[16,17,18,17,16],'loop':'First and final settled spreads match.','camera_recorded':False},indent=2)+'\n')
print(DEST)
