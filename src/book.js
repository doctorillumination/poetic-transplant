'use strict';
const $=s=>document.querySelector(s);
const folio=$('#folio'),image=$('#sheet-image'),shadow=$('.turn-shadow'),picker=$('#sheet-picker');
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const cache=new Map();
let current=0,busy=false,view='impression',turn=null,gesture=null,frame=0,pendingJump=null;
BOOK.forEach((p,i)=>picker.add(new Option(String(i+1).padStart(2,'0')+' · '+p.title,String(i))));

function src(index,kind='front'){return BOOK[index][kind];}
function decoded(index,kind='front'){
 const key=index+':'+kind;
 if(cache.has(key))return cache.get(key);
 const img=new Image();img.decoding='async';img.src=src(index,kind);
 const promise=img.decode().then(()=>img).catch(e=>{cache.delete(key);throw e});cache.set(key,promise);
 if(cache.size>10){const first=cache.keys().next().value;if(first!==key)cache.delete(first);}
 return promise;
}
function kind(){return view==='source'?'source':'front';}
function controls(){
 $('#previous').disabled=busy||current===0;$('#next').disabled=busy||current===BOOK.length-1;picker.disabled=busy;
 $('.closer').disabled=busy;document.querySelectorAll('[data-mode]').forEach(b=>b.disabled=busy);
}
function update(){
 image.src=src(current,kind());image.alt=(view==='source'?'Original source, ':'Ink impression, ')+'sheet '+String(current+1).padStart(2,'0')+'. '+BOOK[current].description;
 $('#folio-number').textContent=String(current+1).padStart(2,'0');$('#sheet-title').textContent=BOOK[current].title;picker.value=String(current);
 Array.from(picker.options).forEach((option,i)=>{option.textContent=String(i+1).padStart(2,'0')+(i===current?' / 15':' · '+BOOK[i].title);});
 $('#reading-description').textContent=BOOK[current].transcript||BOOK[current].description;
 folio.dataset.sheet=String(current+1);document.documentElement.dataset.sheet=String(current+1);
 document.title='Transplant · '+String(current+1).padStart(2,'0')+' / 15';controls();
 try{history.replaceState(null,'','#sheet-'+String(current+1).padStart(2,'0'));}catch{}
 $('#status').textContent='Sheet '+(current+1)+' of 15. '+BOOK[current].title+'.';
 [current-1,current+1].filter(i=>i>=0&&i<BOOK.length).forEach(i=>decoded(i,kind()).catch(()=>{}));
}

class CurlSurface{
 constructor(canvas){
  this.canvas=canvas;this.gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:true});
  if(!this.gl)throw Error('WebGL unavailable');const gl=this.gl;
  const vertex=`
   attribute vec2 aUV; uniform float uProgress; uniform float uTilt; uniform float uPull;
   varying vec2 vUV; varying vec3 vNormal; varying float vHeight;
   void main(){
    float p=uProgress;float wave=sin(p*3.14159265);
    float radius=max(.001,(.155+uPull*.025)*wave);
    float bend=1.-p+uTilt*(aUV.y-.5)*wave;
    float d=aUV.x-bend;float x=aUV.x;float z=0.;vec3 normal=vec3(0.,0.,1.);
    if(d>0.){
     float angle=min(d/radius,3.14159265);
     if(d<radius*3.14159265){x=bend+radius*sin(angle);z=radius*(1.-cos(angle));normal=vec3(-sin(angle),uTilt*.24*sin(angle),cos(angle));}
     else{x=bend-(d-radius*3.14159265);z=2.*radius;normal=vec3(0.,0.,-1.);}
    }
    z+=sin(aUV.x*3.14159265)*sin(aUV.y*3.14159265)*.006*wave;
    float y=(.5-aUV.y)*1.29411765;
    float w=1.-z*.34;
    gl_Position=vec4((x-.5)*(2./1.16),y*(2./(1.29411765*1.10)),-z*.6,w);
    vUV=aUV;vNormal=normalize(normal);vHeight=z;
   }`;
  const fragment=`
   precision highp float;uniform sampler2D uFront;uniform sampler2D uBack;uniform float uProgress;
   varying vec2 vUV;varying vec3 vNormal;varying float vHeight;
   void main(){
    vec3 n=normalize(vNormal);bool back=n.z<0.;
    vec3 ink=back?texture2D(uBack,vUV).rgb:texture2D(uFront,vUV).rgb;
    vec3 facing=back?-n:n;float light=.63+.37*max(0.,dot(facing,normalize(vec3(-.42,.36,1.))));
    float active=sin(min(1.,uProgress*4.)*1.5707963);
    light=mix(1.,light,active);
    float grainEdge=pow(1.-abs(n.z),3.);
    float edge=min(min(vUV.x,1.-vUV.x),min(vUV.y,1.-vUV.y));
    ink*=light;ink+=vec3(.10,.09,.06)*grainEdge;
    if(edge<.0012)ink=mix(ink,vec3(.69,.65,.52),.2);
    gl_FragColor=vec4(ink,1.);
   }`;
  function compile(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
  const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);
  this.program=gl.createProgram();gl.attachShader(this.program,vs);gl.attachShader(this.program,fs);gl.linkProgram(this.program);
  if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program));gl.deleteShader(vs);gl.deleteShader(fs);
  const nx=96,ny=56,uv=[],indices=[];
  for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++)uv.push(x/nx,y/ny);
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const a=y*(nx+1)+x,b=a+nx+1;indices.push(a,b,a+1,a+1,b,b+1);}
  this.count=indices.length;this.vertices=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.vertices);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(uv),gl.STATIC_DRAW);
  this.indices=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.indices);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
  this.aUV=gl.getAttribLocation(this.program,'aUV');this.locations={};['uProgress','uTilt','uPull','uFront','uBack'].forEach(k=>this.locations[k]=gl.getUniformLocation(this.program,k));
  this.textures=[];this.resize();this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(folio);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;finish(false);folio.dataset.renderer='flat';});
 }
 resize(){const r=this.canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,1.5);if(r.width&&r.height){this.canvas.width=Math.round(r.width*ratio);this.canvas.height=Math.round(r.height*ratio);}}
 texture(img){const gl=this.gl,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;}
 set(front,back){this.release();this.textures=[this.texture(front),this.texture(back)];this.resize();}
 draw(p,tilt=0,pull=0){
  if(this.lost||this.textures.length!==2)return;const gl=this.gl;
  gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.useProgram(this.program);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.vertices);gl.enableVertexAttribArray(this.aUV);gl.vertexAttribPointer(this.aUV,2,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.indices);
  this.textures.forEach((t,i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,t);});gl.uniform1i(this.locations.uFront,0);gl.uniform1i(this.locations.uBack,1);
  gl.uniform1f(this.locations.uProgress,p);gl.uniform1f(this.locations.uTilt,tilt);gl.uniform1f(this.locations.uPull,pull);gl.drawElements(gl.TRIANGLES,this.count,gl.UNSIGNED_SHORT,0);
 }
 release(){this.textures.forEach(t=>this.gl.deleteTexture(t));this.textures=[];}
 clear(){this.gl.clear(this.gl.COLOR_BUFFER_BIT|this.gl.DEPTH_BUFFER_BIT);this.release();}
}
let curl=null;
try{curl=new CurlSurface($('#curl'));folio.dataset.renderer='webgl';}catch(e){folio.dataset.renderer='flat';}

function showProgress(p){
 if(!turn)return;turn.p=clamp(p);
 const tilt=turn.tilt||0,pull=turn.pull||0;
 if(curl&&!curl.lost)curl.draw(turn.p,tilt,pull);
 const width=folio.clientWidth,r=.155*Math.sin(turn.p*Math.PI);
 shadow.style.left=((1-turn.p+r*.3)*100)+'%';shadow.style.width=((r+.07)*100)+'%';shadow.style.opacity=String(Math.sin(turn.p*Math.PI)*.38);shadow.style.transform='translateX(-50%) rotate('+tilt*12+'deg)';
 folio.dataset.turnPhase=turn.p>.22&&turn.p<.83?'curl':'edge';folio.dataset.turnProgress=turn.p.toFixed(3);
}
async function begin(direction,tilt=0){
 if(busy||(direction>0&&current===BOOK.length-1)||(direction<0&&current===0))return false;
 busy=true;controls();const target=current+direction,moving=direction>0?current:target;
 try{
  const [front,back]=await Promise.all([decoded(moving,kind()),decoded(moving,'back'),decoded(target,kind())]);
  turn={direction,target,p:direction>0?0:1,tilt,pull:0};
  if(curl&&!curl.lost){folio.classList.add('turning');curl.set(front,back);}
  image.src=src(direction>0?target:current,kind());$('.paper-well').classList.add('turning-well');folio.dataset.turning='true';folio.setAttribute('aria-busy','true');showProgress(turn.p);return true;
 }catch(e){busy=false;controls();$('#status').textContent='This sheet could not open. Try choosing it from the sheet list.';return false;}
}
function finish(commit){
 if(!turn){busy=false;controls();return;}
 if(frame)cancelAnimationFrame(frame);frame=0;
 folio.dataset.lastTurn=commit?(turn.direction>0?'forward':'backward'):'cancelled';
 if(commit)current=turn.target;turn=null;busy=false;gesture=null;
 folio.classList.remove('turning');$('.paper-well').classList.remove('turning-well');folio.dataset.turning='false';folio.dataset.turnPhase='idle';folio.dataset.turnProgress='0';folio.removeAttribute('aria-busy');shadow.style.opacity='0';
 if(curl&&!curl.lost)curl.clear();update();
 if(pendingJump!==null){const n=pendingJump;pendingJump=null;jump(n);}
}
function settle(target,commit){
 if(!turn)return;
 if(reduced.matches||!curl||curl.lost){finish(commit);return;}
 const from=turn.p,start=performance.now(),distance=Math.abs(target-from),duration=700+distance*800;
 const tick=now=>{if(!turn)return;const t=clamp((now-start)/duration);const e=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;showProgress(from+(target-from)*e);if(t<1)frame=requestAnimationFrame(tick);else finish(commit);};
 frame=requestAnimationFrame(tick);
}
async function next(direction){if(await begin(direction,direction>0?.22:-.16))settle(direction>0?1:0,true);}
async function jump(index){
 index=clamp(index,0,BOOK.length-1);if(busy){pendingJump=index;return;}busy=true;controls();
 try{await decoded(index,kind());current=index;}finally{busy=false;update();}
}

$('#next').addEventListener('click',()=>next(1));$('#previous').addEventListener('click',()=>next(-1));
picker.addEventListener('change',()=>jump(Number(picker.value)));
document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',async()=>{
 if(busy)return;view=button.dataset.mode;document.body.dataset.view=view;document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));await decoded(current,kind());update();
}));
$('.closer').addEventListener('click',()=>{
 if(busy)return;const closer=document.body.dataset.closer!=='true',well=$('.paper-well');document.body.dataset.closer=String(closer);
 $('.closer').setAttribute('aria-pressed',String(closer));$('.closer').setAttribute('aria-label',closer?'Fit the whole sheet to the window':'Enlarge the sheet for closer reading');$('.zoom-label').textContent=closer?'Fit sheet':'Closer';well.scrollLeft=closer?Math.max(0,(folio.offsetWidth-well.clientWidth)*.25):0;
});
function moveGesture(e){
 const g=gesture;if(!g||e.pointerId!==g.id)return;
 g.x=e.clientX;g.y=e.clientY;g.time=performance.now();
 if(!g.active||!turn)return;
 const delta=(g.x-g.sx)/g.width*1.1;turn.tilt=clamp((g.startV-.5)*.4+(g.y-g.sy)/g.height*.3,-.4,.4);turn.pull=clamp((g.y-g.sy)/g.height,-1,1);showProgress(g.direction>0?-delta:1-delta);
}
function releaseGesture(e,cancel=false){
 const g=gesture;if(!g||e.pointerId!==g.id)return;g.released=true;g.cancel=cancel;
 if(!g.active)return;
 const click=Math.hypot(g.x-g.sx,g.y-g.sy)<6;const commit=!cancel&&(click||(g.direction>0?turn.p>.28:turn.p<.72));
 gesture=null;settle(commit?(g.direction>0?1:0):(g.direction>0?0:1),commit);
}
folio.addEventListener('pointerdown',async e=>{
 if(busy||document.body.dataset.closer==='true'||!e.isPrimary||e.button!==0)return;const rect=folio.getBoundingClientRect(),u=(e.clientX-rect.left)/rect.width;
 const direction=u>.55?1:u<.22?-1:0;if(!direction||(direction>0&&current===14)||(direction<0&&current===0))return;
 const g={id:e.pointerId,sx:e.clientX,sy:e.clientY,startV:(e.clientY-rect.top)/rect.height,x:e.clientX,y:e.clientY,width:rect.width,height:rect.height,direction,active:false,released:false};
 gesture=g;folio.setPointerCapture(e.pointerId);e.preventDefault();
 const ok=await begin(direction,(g.startV-.5)*.4);if(!ok){gesture=null;return;}
 g.active=true;moveGesture({pointerId:g.id,clientX:g.x,clientY:g.y});if(g.released)releaseGesture({pointerId:g.id},g.cancel);
});
folio.addEventListener('pointermove',moveGesture);folio.addEventListener('pointerup',e=>releaseGesture(e));folio.addEventListener('pointercancel',e=>releaseGesture(e,true));
folio.addEventListener('lostpointercapture',e=>{if(gesture&&!gesture.released)releaseGesture(e,true);});
document.addEventListener('keydown',e=>{
 if(['SELECT','INPUT','TEXTAREA'].includes(document.activeElement.tagName)||e.altKey||e.metaKey||e.ctrlKey)return;
 if(e.key==='ArrowRight'){e.preventDefault();next(1);}if(e.key==='ArrowLeft'){e.preventDefault();next(-1);}if(e.key==='Home'){e.preventDefault();jump(0);}if(e.key==='End'){e.preventDefault();jump(14);}
});
window.addEventListener('hashchange',()=>{const n=Number(location.hash.replace('#sheet-',''));if(n>=1&&n<=15)jump(n-1);});
const initial=Number(location.hash.replace('#sheet-',''));if(initial>=1&&initial<=15)current=initial-1;
decoded(current,kind()).then(()=>{update();document.documentElement.dataset.ready='true';}).catch(()=>{$('#status').textContent='The print could not load. Choose a sheet to try again.';});
