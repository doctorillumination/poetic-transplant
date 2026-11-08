'use strict';
const $=s=>document.querySelector(s);
const folio=$('#folio'),shadow=$('.turn-shadow'),picker=$('#sheet-picker');
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const cache=new Map();
let current=0,busy=false,view='impression',turn=null,gesture=null,frame=0,pendingJump=null,warmVersion=0;
const face=()=>view==='source'?'source':'front';
const key=(index,kind)=>index+':'+kind;
const valid=index=>index>=0&&index<BOOK.length;
BOOK.forEach((p,i)=>picker.add(new Option(String(i+1).padStart(2,'0')+' · '+p.title,String(i))));

function decoded(index,kind='front'){
 const id=key(index,kind);
 if(cache.has(id))return cache.get(id).promise;
 const img=new Image();img.decoding='async';img.draggable=false;
 const entry={id,index,kind,img,ready:false,promise:null};cache.set(id,entry);
 entry.promise=new Promise((resolve,reject)=>{
  img.onload=async()=>{try{if(img.decode)await img.decode();}catch{}entry.ready=true;resolve(entry);};
  img.onerror=()=>{cache.delete(id);reject(Error('The sheet could not load.'));};
  img.src=BOOK[index][kind];
 });
 return entry.promise;
}
const ready=(index,kind)=>cache.get(key(index,kind))?.ready;
const idle=callback=>new Promise(resolve=>{
 const run=()=>resolve(callback());
 if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:180});else setTimeout(run,0);
});
function controls(){
 $('#previous').disabled=busy||current===0;$('#next').disabled=busy||current===BOOK.length-1;
 picker.disabled=busy;$('.closer').disabled=busy;
 document.querySelectorAll('[data-mode]').forEach(b=>b.disabled=busy);
}
function mount(entry,side){
 const holder=$(side==='right'?'#right-leaf':'#left-leaf');
 const img=entry.img;img.id=side==='right'?'sheet-image':'back-image';
 img.alt=side==='right'?(view==='source'?'Original source, ':'Ink impression, ')+'sheet '+String(entry.index+1).padStart(2,'0')+'. '+BOOK[entry.index].description:'Stained reverse of sheet '+String(entry.index+1).padStart(2,'0')+', with faint ink showing through the paper.';
 if(holder.firstElementChild!==img)holder.replaceChildren(img);
 holder.hidden=false;
}
function spread(right,left){
 mount(cache.get(key(right,face())),'right');
 if(left>=0)mount(cache.get(key(left,'back')),'left');else $('#left-leaf').hidden=true;
 folio.dataset.emptyLeft=String(left<0);
 folio.dataset.leftSheet=left<0?'0':String(left+1);folio.dataset.rightSheet=String(right+1);
}
function update(){
 spread(current,current-1);
 $('#folio-number').textContent=String(current+1).padStart(2,'0');$('#sheet-title').textContent=BOOK[current].title;picker.value=String(current);
 Array.from(picker.options).forEach((option,i)=>{option.textContent=String(i+1).padStart(2,'0')+(i===current?' / 15':' · '+BOOK[i].title);});
 $('#reading-description').textContent=BOOK[current].transcript||BOOK[current].description;
 folio.dataset.sheet=String(current+1);document.documentElement.dataset.sheet=String(current+1);
 document.title='Transplant · '+String(current+1).padStart(2,'0')+' / 15';controls();
 try{history.replaceState(null,'','#sheet-'+String(current+1).padStart(2,'0'));}catch{}
 $('#status').textContent='Sheet '+(current+1)+' of 15. '+BOOK[current].title+'.';
 warmAround();
}

class CurlSurface{
 constructor(canvas){
  this.canvas=canvas;this.gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:false});
  if(!this.gl)throw Error('WebGL unavailable');const gl=this.gl;
  const vertex=`
   attribute vec2 aUV;uniform float uProgress;uniform float uTilt;uniform float uPull;
   varying vec2 vUV;varying vec3 vNormal;
   void main(){
    float p=uProgress;float wave=sin(p*3.14159265);
    float radius=max(.0001,(.14+uPull*.018)*wave);
    float base=max(0.,1.-p-radius*1.57079633);
    float bend=base+uTilt*(aUV.y-.5)*min(base,1.-base)*.8;
    float d=aUV.x-bend;float x=aUV.x;float z=0.;vec3 normal=vec3(0.,0.,1.);
    if(d>0.){
     float angle=min(d/radius,3.14159265);
     if(d<radius*3.14159265){x=bend+radius*sin(angle);z=radius*(1.-cos(angle));normal=vec3(-sin(angle),uTilt*.2*sin(angle),cos(angle));}
     else{x=bend-(d-radius*3.14159265);z=2.*radius;normal=vec3(0.,0.,-1.);}
    }
    z+=sin(aUV.x*3.14159265)*sin(aUV.y*3.14159265)*.004*wave;
    float y=(.5-aUV.y)*2./1.10;
    gl_Position=vec4(x/1.06,y,-z*.5,1.-z*.1);
    vUV=aUV;vNormal=normalize(normal);
   }`;
  const fragment=`
   precision highp float;uniform sampler2D uFront;uniform sampler2D uBack;uniform float uProgress;
   varying vec2 vUV;varying vec3 vNormal;
   void main(){
    vec3 n=normalize(vNormal);bool back=n.z<0.;
    vec3 ink=back?texture2D(uBack,vUV).rgb:texture2D(uFront,vUV).rgb;
    vec3 facing=back?-n:n;vec3 lightDirection=normalize(vec3(-.5,.3,1.));
    float light=clamp(.56+.44*dot(facing,lightDirection)/lightDirection.z,.48,1.035);
    light=mix(1.,light,sin(uProgress*3.14159265));
    ink*=light;ink+=vec3(.052,.045,.03)*pow(1.-abs(n.z),4.);
    float edge=min(min(vUV.x,1.-vUV.x),min(vUV.y,1.-vUV.y));
    if(edge<.0006)ink=mix(ink,vec3(.69,.65,.52),.15);
    gl_FragColor=vec4(ink,1.);
   }`;
  const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);
  this.program=gl.createProgram();gl.attachShader(this.program,vs);gl.attachShader(this.program,fs);gl.linkProgram(this.program);
  if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program));gl.deleteShader(vs);gl.deleteShader(fs);
  const nx=96,ny=40,uv=[],indices=[];
  for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++)uv.push(x/nx,y/ny);
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const a=y*(nx+1)+x,b=a+nx+1;indices.push(a,b,a+1,a+1,b,b+1);}
  this.count=indices.length;this.vertices=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.vertices);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(uv),gl.STATIC_DRAW);
  this.indices=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.indices);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
  this.aUV=gl.getAttribLocation(this.program,'aUV');this.locations={};['uProgress','uTilt','uPull','uFront','uBack'].forEach(k=>this.locations[k]=gl.getUniformLocation(this.program,k));
  this.textures=new Map();this.active=null;this.uploads=0;this.resize();
  new ResizeObserver(()=>{this.resize();if(turn)this.draw(turn.p,turn.tilt,turn.pull);}).observe(folio);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;finish(false);folio.dataset.renderer='flat';});
 }
 resize(){
  const r=this.canvas.getBoundingClientRect();
  const ratio=Math.min(devicePixelRatio||1,1.5,Math.sqrt(2800000/Math.max(1,r.width*r.height)));
  const w=Math.round(r.width*ratio),h=Math.round(r.height*ratio);
  if(w&&h&&(this.canvas.width!==w||this.canvas.height!==h)){this.canvas.width=w;this.canvas.height=h;}
 }
 prepare(entry){
  if(this.lost||this.textures.has(entry.id))return;
  const gl=this.gl,t=gl.createTexture();let source=entry.img;
  if(source.naturalWidth>1275){const c=document.createElement('canvas');c.width=1275;c.height=Math.round(source.naturalHeight*1275/source.naturalWidth);const cx=c.getContext('2d');cx.imageSmoothingQuality='high';cx.drawImage(source,0,0,c.width,c.height);source=c;}
  gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  this.textures.set(entry.id,t);this.uploads++;
 }
 has(index,kind){return this.textures.has(key(index,kind));}
 set(front,back){this.active=[this.textures.get(front.id),this.textures.get(back.id)];}
 draw(p,tilt=0,pull=0){
  if(this.lost||!this.active)return;const gl=this.gl;
  gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.useProgram(this.program);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.vertices);gl.enableVertexAttribArray(this.aUV);gl.vertexAttribPointer(this.aUV,2,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.indices);
  this.active.forEach((t,i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,t);});gl.uniform1i(this.locations.uFront,0);gl.uniform1i(this.locations.uBack,1);
  gl.uniform1f(this.locations.uProgress,p);gl.uniform1f(this.locations.uTilt,tilt);gl.uniform1f(this.locations.uPull,pull);gl.drawElements(gl.TRIANGLES,this.count,gl.UNSIGNED_SHORT,0);
 }
 prune(keep){for(const [id,t] of this.textures)if(!keep.has(id)){this.gl.deleteTexture(t);this.textures.delete(id);}}
 clear(){this.gl.clear(this.gl.COLOR_BUFFER_BIT|this.gl.DEPTH_BUFFER_BIT);this.active=null;}
}
let curl=null;
try{curl=new CurlSurface($('#curl'));folio.dataset.renderer='webgl';}catch(error){folio.dataset.renderer='flat';folio.dataset.rendererError=error.message;}

function directionReady(direction){
 const target=current+direction,moving=direction>0?current:target;
 if(!valid(target))return false;
 const left=direction>0?current-1:target-1;
 return !!(ready(moving,face())&&ready(moving,'back')&&ready(target,face())&&(left<0||ready(left,'back'))&&(!curl||curl.lost||(curl.has(moving,face())&&curl.has(moving,'back'))));
}
function readiness(){folio.dataset.forwardReady=String(directionReady(1));folio.dataset.backwardReady=String(directionReady(-1));}
async function warmAround(){
 const version=++warmVersion,k=face();
 const nearby=[current,current+1,current-1,current+2,current-2].filter(valid);
 const keep=new Set(nearby.flatMap(i=>[key(i,k),key(i,'back')]));
 for(const id of cache.keys())if(!keep.has(id))cache.delete(id);
 if(curl&&!curl.lost)curl.prune(keep);
 for(const i of nearby){
  for(const kind of [k,'back']){
   if(version!==warmVersion||busy)return;
   try{
    const entry=await decoded(i,kind);if(version!==warmVersion||busy)return;
    await idle(()=>{if(!busy&&version===warmVersion&&curl&&!curl.lost)curl.prepare(entry);});
    readiness();
   }catch{}
  }
 }
}
function showProgress(p){
 if(!turn)return;turn.p=clamp(p);curl?.draw(turn.p,turn.tilt,turn.pull);
 const wave=Math.sin(turn.p*Math.PI),radius=.14*wave,bend=1-turn.p-radius*Math.PI/2;
 shadow.style.left=((1+bend)*50)+'%';shadow.style.width=((radius+.09)*50)+'%';shadow.style.opacity=String(wave*.42);shadow.style.transform='translateX(-45%)';
 folio.dataset.turnPhase=turn.p>.12&&turn.p<.94?'curl':'edge';folio.dataset.turnProgress=turn.p.toFixed(3);
}
async function begin(direction,tilt=0){
 if(busy||!valid(current+direction))return false;
 const started=performance.now();busy=true;warmVersion++;controls();
 const target=current+direction,moving=direction>0?current:target,left=direction>0?current-1:target-1;
 try{
  const [front,back]=await Promise.all([decoded(moving,face()),decoded(moving,'back'),decoded(target,face()),...(left<0?[]:[decoded(left,'back')])]);
  if(curl&&!curl.lost){curl.prepare(front);curl.prepare(back);curl.set(front,back);}
  turn={direction,target,p:direction>0?0:1,tilt,pull:0,frames:[],lastFrame:0,uploads:curl?.uploads||0,started:performance.now()};
  folio.dataset.startWaitMs=(performance.now()-started).toFixed(1);
  spread(direction>0?target:current,left);
  if(curl&&!curl.lost)folio.classList.add('turning');
  $('.paper-well').classList.add('turning-well');folio.dataset.turning='true';folio.setAttribute('aria-busy','true');showProgress(turn.p);return true;
 }catch{
  busy=false;gesture=null;controls();$('#status').textContent='This sheet could not open. Choose it from the sheet list to try again.';warmAround();return false;
 }
}
function finish(commit){
 if(!turn){busy=false;controls();return;}
 if(frame)cancelAnimationFrame(frame);frame=0;
 const samples=turn.frames.slice(1).sort((a,b)=>a-b);
 folio.dataset.frameP95Ms=samples.length?samples[Math.floor((samples.length-1)*.95)].toFixed(1):'0';
 folio.dataset.longFrames=String(samples.filter(t=>t>34).length);folio.dataset.frameCount=String(samples.length);
 folio.dataset.turnDurationMs=(performance.now()-turn.started).toFixed(1);
 folio.dataset.uploadsDuringTurn=String((curl?.uploads||0)-turn.uploads);
 folio.dataset.lastTurn=commit?(turn.direction>0?'forward':'backward'):'cancelled';
 if(commit)current=turn.target;turn=null;busy=false;gesture=null;
 folio.classList.remove('turning');$('.paper-well').classList.remove('turning-well');folio.dataset.turning='false';folio.dataset.turnPhase='idle';folio.dataset.turnProgress='0';folio.removeAttribute('aria-busy');shadow.style.opacity='0';
 if(curl&&!curl.lost)curl.clear();update();
 if(pendingJump!==null){const n=pendingJump;pendingJump=null;jump(n);}
}
function recordFrame(now){if(turn.lastFrame)turn.frames.push(now-turn.lastFrame);turn.lastFrame=now;}
function settle(target,commit,automatic=false){
 if(!turn)return;
 if(reduced.matches||!curl||curl.lost||document.body.dataset.closer==='true'){finish(commit);return;}
 const from=turn.p,start=performance.now(),distance=Math.abs(target-from),duration=Math.max(170,960*Math.pow(distance,.6));
 const tick=now=>{
  if(!turn)return;recordFrame(now);const t=clamp((now-start)/duration);
  const ease=automatic?(t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2):1-Math.pow(1-t,3);
  showProgress(from+(target-from)*ease);
  if(t<1)frame=requestAnimationFrame(tick);else{frame=0;finish(commit);}
 };
 frame=requestAnimationFrame(tick);
}
async function next(direction){if(await begin(direction,direction>0?.2:-.15))settle(direction>0?1:0,true,true);}
async function jump(index){
 index=clamp(index,0,BOOK.length-1);if(busy){pendingJump=index;return;}busy=true;warmVersion++;controls();
 try{await Promise.all([decoded(index,face()),...(index>0?[decoded(index-1,'back')]:[])]);current=index;}
 catch{$('#status').textContent='This sheet could not open.';}
 finally{busy=false;update();}
}

$('#next').addEventListener('click',()=>next(1));$('#previous').addEventListener('click',()=>next(-1));
picker.addEventListener('change',()=>jump(Number(picker.value)));
document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',async()=>{
 if(busy)return;busy=true;warmVersion++;controls();const chosen=button.dataset.mode;
 try{
  await decoded(current,chosen==='source'?'source':'front');view=chosen;document.body.dataset.view=view;
  document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 }finally{busy=false;update();}
}));
$('.closer').addEventListener('click',()=>{
 if(busy)return;const closer=document.body.dataset.closer!=='true',well=$('.paper-well');document.body.dataset.closer=String(closer);
 $('.closer').setAttribute('aria-pressed',String(closer));$('.closer').setAttribute('aria-label',closer?'Fit the whole book to the window':'Enlarge the book for closer reading');$('.zoom-label').textContent=closer?'Fit book':'Closer';
 well.scrollLeft=closer?Math.max(0,folio.offsetWidth/2-well.clientWidth*.15):0;
});
function drawGesture(){
 if(frame||!gesture?.active)return;
 frame=requestAnimationFrame(now=>{frame=0;if(!gesture?.active||!turn)return;recordFrame(now);showProgress(gesture.progress);});
}
function moveGesture(e){
 const g=gesture;if(!g||e.pointerId!==g.id)return;
 const now=performance.now(),dt=now-g.time;
 if(dt>0)g.velocity=g.velocity*.6+(e.clientX-g.x)/dt*.4;
 g.x=e.clientX;g.y=e.clientY;g.time=now;
 const delta=(g.x-g.sx)/(2*g.width);
 g.progress=clamp(g.direction>0?-delta:1-delta);
 if(g.active&&turn){turn.tilt=clamp((g.startV-.5)*.45+(g.y-g.sy)/g.height*.4,-.45,.45);turn.pull=clamp((g.y-g.sy)/g.height,-1,1);drawGesture();}
}
function releaseGesture(e,cancel=false){
 const g=gesture;if(!g||e.pointerId!==g.id)return;
 if(e.clientX!==undefined)moveGesture(e);
 g.released=true;g.cancel=cancel;if(!g.active)return;
 if(frame)cancelAnimationFrame(frame);frame=0;showProgress(g.progress);
 const click=Math.hypot(g.x-g.sx,g.y-g.sy)<6,travel=g.direction>0?g.progress:1-g.progress;
 const flick=travel>.065&&g.velocity*g.direction<-.45;
 const commit=!cancel&&(click||travel>.36||flick);
 gesture=null;settle(commit?(g.direction>0?1:0):(g.direction>0?0:1),commit,click);
}
folio.addEventListener('pointerdown',async e=>{
 if(busy||document.body.dataset.closer==='true'||!e.isPrimary||e.button!==0)return;
 const rect=folio.getBoundingClientRect(),u=(e.clientX-rect.left)/rect.width,direction=u>.51?1:u<.49?-1:0;
 if(!direction||!valid(current+direction))return;
 const g={id:e.pointerId,sx:e.clientX,sy:e.clientY,startV:(e.clientY-rect.top)/rect.height,x:e.clientX,y:e.clientY,time:performance.now(),velocity:0,width:rect.width/2,height:rect.height,direction,progress:direction>0?0:1,active:false,released:false};
 gesture=g;folio.setPointerCapture(e.pointerId);e.preventDefault();
 const ok=await begin(direction,(g.startV-.5)*.45);if(!ok)return;
 g.active=true;moveGesture({pointerId:g.id,clientX:g.x,clientY:g.y});
 if(g.released)releaseGesture({pointerId:g.id},g.cancel);
});
folio.addEventListener('pointermove',moveGesture);
folio.addEventListener('pointerup',e=>releaseGesture(e));
folio.addEventListener('pointercancel',e=>releaseGesture(e,true));
folio.addEventListener('lostpointercapture',e=>{if(gesture&&!gesture.released)releaseGesture(e,true);});
document.addEventListener('keydown',e=>{
 if(['SELECT','INPUT','TEXTAREA'].includes(document.activeElement.tagName)||e.altKey||e.metaKey||e.ctrlKey)return;
 if(e.key==='ArrowRight'){e.preventDefault();next(1);}if(e.key==='ArrowLeft'){e.preventDefault();next(-1);}if(e.key==='Home'){e.preventDefault();jump(0);}if(e.key==='End'){e.preventDefault();jump(14);}
});
window.addEventListener('hashchange',()=>{const n=Number(location.hash.replace('#sheet-',''));if(n>=1&&n<=15)jump(n-1);});
const initial=Number(location.hash.replace('#sheet-',''));if(initial>=1&&initial<=15)current=initial-1;
controls();busy=true;controls();
Promise.all([decoded(current,face()),...(current>0?[decoded(current-1,'back')]:[])])
 .then(()=>{busy=false;update();document.documentElement.dataset.ready='true';})
 .catch(()=>{busy=false;controls();$('#status').textContent='The print could not load. Choose a sheet to try again.';});
