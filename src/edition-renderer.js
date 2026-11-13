    function random(seedValue) {
      return function() {
        let t=seedValue+=0x6D2B79F5;
        t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61);
        return ((t^t>>>14)>>>0)/4294967296;
      };
    }
    const fibreRand=random(seed+25);
    const lattice=Float32Array.from({length:65536},()=>fibreRand());
    const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
    const DRIPS=PROFILE.drips||[
      [852,903,103,'green',.23,2.2,5.8],
      [1090,630,135,'black',.25,2.8,7.5],
      [1123,630,100,'green',.28,1.8,5],
      [106,1191,223,'blue',.2,1.7,4.8],
      [437,1816,155,'red',.2,1.6,4.3],
      [1377,64,534,'black',.31,4,7.6],
      [1458,58,726,'black',.25,5,10],
      [1508,81,332,'black',.37,2.7,6.8],
      [1562,56,530,'black',.26,3,8.2]
    ];
    const dripTip=([x,y,length])=>[x+Math.sin(7)*1.8+2,y+length];
    let surface;
    function noise(x,y,sx,sy,salt=0) {
      const gx=x/sx+salt*17, gy=y/sy+salt*11;
      const ix=Math.floor(gx),iy=Math.floor(gy);
      const tx=gx-ix,ty=gy-iy;
      const xx=tx*tx*(3-2*tx),yy=ty*ty*(3-2*ty);
      const a=lattice[((iy&255)<<8)+(ix&255)]*(1-xx)+lattice[((iy&255)<<8)+((ix+1)&255)]*xx;
      const b=lattice[(((iy+1)&255)<<8)+(ix&255)]*(1-xx)+lattice[(((iy+1)&255)<<8)+((ix+1)&255)]*xx;
      return a*(1-yy)+b*yy;
    }
    function canvas() {
      const c=document.createElement('canvas'); c.width=W; c.height=H; return c;
    }
    function organic(ctx,x,y,rx,ry,phase,rough=.12) {
      ctx.beginPath();
      for(let i=0;i<=160;i++) {
        const a=i/160*Math.PI*2;
        const r=1+rough*(Math.sin(a*5+phase)*.5+Math.sin(a*13+phase*2)*.25+Math.cos(a*29-phase)*.16+Math.cos(a*53+phase)*.09);
        const xx=x+Math.cos(a)*rx*r, yy=y+Math.sin(a)*ry*r;
        if(i)ctx.lineTo(xx,yy);else ctx.moveTo(xx,yy);
      }
      ctx.closePath();
    }
    function makeWeather() {
      const step=8,cols=Math.ceil(W/step)+1,rows=Math.ceil(H/step)+1;
      const wear=new Float32Array(cols*rows),dirt=new Float32Array(cols*rows),crust=new Float32Array(cols*rows);
      const rubbed=PROFILE.rubbed||[
        [584,221,168,30,1.27],[482,397,49,23,.83],
        [1086,531,101,31,.85],[954,706,130,25,.72],
        [1246,839,154,30,1.26],[240,1059,87,32,.94],
        [528,1145,115,27,1.02],[588,1322,118,33,1.24],
        [672,1370,103,25,.76],[958,1453,146,28,1.23],
        [458,1631,125,29,1.02],[334,1676,110,28,.65],
        [604,1898,52,26,.98],[40,1180,90,380,.76],
        [1050,2175,470,67,.8],[1680,1550,92,370,.77]
      ];
      const grime=PROFILE.grime||[
        [64,470,84,205,.53],[77,1071,87,143,.75],
        [87,1763,83,180,.76],[369,2134,230,77,.57],
        [1574,2071,131,167,.66],[1669,1341,72,310,.74],
        [1527,145,168,182,.66],[1454,917,115,112,.44]
      ];
      const puddles=DRIPS.map(d=>[...dripTip(d),d[6]*3.6,d[6]*4.5,.7]);
      const brokenInk=PROFILE.number===1?[[1460,40,148,69,.7],[668,881,174,14,.55],[1143,661,107,18,.67],[308,1810,128,16,.6],...puddles]:[...PROFILE.spills.map(p=>[...p.slice(0,4),p[5]*.9]),...puddles];
      const ellipse=(x,y,px,py,rx,ry)=>Math.exp(-(((x-px)/rx)**2+((y-py)/ry)**2)*1.5);
      for(let gy=0;gy<rows;gy++)for(let gx=0;gx<cols;gx++) {
        const x=gx*step,y=gy*step,index=gy*cols+gx;
        const rag=.7+noise(x,y,27,39,28)*.65;
        let w=0,d=0,c=0;
        for(const [px,py,rx,ry,a] of rubbed)w+=a*ellipse(x,y,px,py,rx,ry)*rag;
        for(const [px,py,rx,ry,a] of grime)d+=a*ellipse(x,y,px,py,rx,ry);
        for(const [px,py,rx,ry,a] of brokenInk)c+=a*ellipse(x,y,px,py,rx,ry);
        const edge=Math.min(x,y,W-x,H-y);
        d+=Math.exp(-edge/29)*(.17+noise(x,y,33,53,36)*.32);
        w+=Math.exp(-Math.abs(x-1139)/3.5)*.2;
        wear[index]=clamp(w*(PROFILE.wear??1));dirt[index]=clamp(d*(PROFILE.soil??1));crust[index]=clamp(c);
      }
      function sample(map,x,y) {
        const gx=Math.floor(x/step),gy=Math.floor(y/step),tx=x/step-gx,ty=y/step-gy;
        const a=map[gy*cols+gx]*(1-tx)+map[gy*cols+gx+1]*tx;
        const b=map[(gy+1)*cols+gx]*(1-tx)+map[(gy+1)*cols+gx+1]*tx;
        return a*(1-ty)+b*ty;
      }
      const abrasion=new Uint8Array(W*H),chips=new Uint8Array(W*H);
      for(let y=0;y<H;y++)for(let x=0;x<W;x++) {
        const index=y*W+x,w=sample(wear,x,y),c=sample(crust,x,y);
        const scour=noise(x+y*.13,y-x*.025,15,3.4,32);
        abrasion[index]=clamp(w*(.66+scour*.67),0,.94)*255;
        const warpX=x+(noise(x,y,17,23,43)-.5)*8;
        const warpY=y+(noise(x,y,23,17,44)-.5)*8;
        const plate=noise(warpX,warpY,5.2,3.5,41);
        const fine=noise(x,y,1.4,2.7,42);
        const fragment=clamp((plate+fine*.1-.735)*5.5);
        chips[index]=clamp(fragment*(w*.84+c*.95))*255;
      }
      surface={abrasion,chips,dirt:(x,y)=>sample(dirt,x,y),crust:(x,y)=>sample(crust,x,y)};
    }
    function makePaper() {
      const ctx=$('.paper').getContext('2d',{alpha:false}), rand=random(seed);
      const pixels=ctx.createImageData(W,H);
      for(let y=0;y<H;y++)for(let x=0;x<W;x++) {
        const i=(y*W+x)*4;
        const tooth=(noise(x,y,1.3,5,17)-.5)*4;
        const grain=(rand()-.5)*13+tooth;
        const cloud=Math.sin(x/137+Math.sin(y/283))*1.2+Math.sin(y/173-x/309)*1.7;
        const edge=Math.min(x,y,W-x,H-y);
        const age=7*Math.exp(-edge/30)+4*Math.exp(-((x-1370)**2/240000+(y-180)**2/110000));
        pixels.data[i]=(PROFILE.paper?.[0]??235)+grain+cloud-age*.55;
        pixels.data[i+1]=(PROFILE.paper?.[1]??231)+grain+cloud-age*.8;
        pixels.data[i+2]=(PROFILE.paper?.[2]??214)+grain+cloud-age*1.3;
        pixels.data[i+3]=255;
      }
      ctx.putImageData(pixels,0,0);
      ctx.lineWidth=.65;
      for(let x=51;x<W;x+=40) {
        ctx.strokeStyle=`rgba(84,109,107,${.065+rand()*.045})`;
        ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+.7,H);ctx.stroke();
      }
      for(let y=19;y<H;y+=40) {
        ctx.strokeStyle=`rgba(84,109,107,${.055+rand()*.045})`;
        ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y-.8);ctx.stroke();
      }
      for(let i=0;i<32000;i++) {
        const x=rand()*W,y=rand()*H;
        ctx.strokeStyle=rand()<.55?'rgba(96,86,65,.075)':'rgba(255,255,244,.32)';
        ctx.lineWidth=.3+rand()*.65;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+rand()*5-2.5,y+rand()*6);ctx.stroke();
      }
      for(const [x,width] of (PROFILE.number===1?[[1139,10],[270,5]]:[[360+(PROFILE.seed%960),8],[200+(PROFILE.seed%200),4]])) {
        const fold=ctx.createLinearGradient(x-width,0,x+width,0);
        fold.addColorStop(0,'rgba(74,68,52,0)');fold.addColorStop(.45,'rgba(74,68,52,.035)');
        fold.addColorStop(.6,'rgba(255,255,241,.10)');fold.addColorStop(1,'rgba(255,255,241,0)');
        ctx.fillStyle=fold;ctx.fillRect(x-width,0,width*2,H);
      }
      // The same loss field lifts paper fibres, ruling, and the pigment above it.
      const worn=ctx.getImageData(0,0,W,H),data=worn.data;
      for(let y=0;y<H;y++)for(let x=0;x<W;x++) {
        const p=y*W+x,i=p*4,rub=surface.abrasion[p]/255,chip=surface.chips[p]/255;
        const dirt=surface.dirt(x,y)*(.35+noise(x,y,23,37,37)*.65);
        const reveal=clamp(rub*.27+chip*.8);
        const upper=surface.chips[Math.max(0,p-W-1)]/255;
        const lower=surface.chips[Math.min(W*H-1,p+W+1)]/255;
        const relief=(upper-lower)*7;
        const grit=rand()<dirt*.045?12+rand()*29:0;
        const shade=dirt*20+grit;
        data[i]=data[i]*(1-reveal)+244*reveal-shade*.86+relief;
        data[i+1]=data[i+1]*(1-reveal)+240*reveal-shade*.92+relief;
        data[i+2]=data[i+2]*(1-reveal)+225*reveal-shade+relief;
      }
      ctx.putImageData(worn,0,0);
      for(let i=0;i<7200;i++) {
        const x=rand()*W,y=rand()*H,d=surface.dirt(x,y);
        if(rand()>d*.8)continue;
        ctx.fillStyle=`rgba(75,67,49,${.035+rand()*.16})`;
        organic(ctx,x,y,.35+rand()**3*3.3,.4+rand()**3*2.3,rand()*7,.28);ctx.fill();
      }
      for(const d of DRIPS) {
        const [x,y]=dripTip(d),r=d[6];
        ctx.strokeStyle='rgba(105,91,66,.09)';ctx.lineWidth=.9;
        organic(ctx,x+1,y+2,r*2.6,r*3.15,2.1,.19);ctx.stroke();
      }
    }
    function makeType() {
      const poem=$('.poem');
      for(const line of PAGE.lines) {
        const group=document.createElementNS(NS,'g');group.dataset.line=line.id;
        const t=document.createElementNS(NS,'text');
        for(const [k,v] of Object.entries({x:line.x,y:line.y,'font-size':34,textLength:line.width*(line.expansion||1.08),lengthAdjust:'spacingAndGlyphs'}))t.setAttribute(k,v);
        t.textContent=line.text;group.append(t);poem.append(group);
      }
      const rows=new Map();
      PAGE.lines.forEach(line=>{if(!rows.has(line.y))rows.set(line.y,[]);rows.get(line.y).push(line);});
      let previousY=0;
      $('#transcript').textContent=Array.from(rows,([y,lines])=>{
        const gap=previousY&&y-previousY>60?'\n':'';previousY=y;
        return gap+' '.repeat(Math.round((lines[0].x-200)/25))+lines.map(line=>line.text).join(' ');
      }).join('\n');
    }
    function colourAt(line,i) {
      if(line.id==='carry'&&i>=31)return i>=50?'red':'blue';
      if(line.id==='teamwork'&&i>11)return 'green';
      if(line.id==='hospital'&&i>=39)return 'blue';
      if(line.id==='someone'&&i>=12)return 'red';
      if(line.id==='soul'&&i>=9&&i<20)return 'green';
      if(line.id==='dwelling'&&i>=21&&i<32)return 'blue';
      if(line.id==='awareness'&&i>=39)return 'red';
      return line.ink;
    }
    function plateDeposit() {
      const c=canvas(),ctx=c.getContext('2d');ctx.drawImage(PLATE,0,0,W,H);
      const image=ctx.getImageData(0,0,W,H),d=image.data;
      const colours=Object.fromEntries(Object.entries(PALETTE).map(([k,v])=>[k,v.match(/[a-f\d]{2}/gi).map(n=>parseInt(n,16))]));
      for(let y=0;y<H;y++)for(let x=0;x<W;x++){
        const i=(y*W+x)*4,r=d[i],g=d[i+1],b=d[i+2],low=Math.min(r,g,b),high=Math.max(r,g,b);
        if(low>251){d[i+3]=0;continue;}
        if(high-low>28){d[i+3]=255;continue;}
        let ink='black';
        for(const [x1,y1,x2,y2,c] of PROFILE.regions)if(x>=x1&&x<=x2&&y>=y1&&y<=y2)ink=c;
        const rgb=colours[ink];d[i]=rgb[0];d[i+1]=rgb[1];d[i+2]=rgb[2];d[i+3]=255-low;
      }
      ctx.putImageData(image,0,0);return c;
    }
    function typeDeposit() {
      if(PAGE.plate)return plateDeposit();
      const c=canvas(),ctx=c.getContext('2d'),rand=random(seed+349);
      ctx.globalCompositeOperation='multiply';
      for(const line of PAGE.lines) {
        ctx.font=`${line.italic?'italic ':''}34px Ribbon`;
        const widths=Array.from(line.text,char=>ctx.measureText(char).width);
        const scale=line.width*(line.expansion||1.08)/widths.reduce((a,b)=>a+b,0);
        let advance=0;
        Array.from(line.text).forEach((char,i)=>{
          ctx.save();ctx.translate(line.x+advance*scale,line.y+(rand()-.5)*.85);
          ctx.scale(scale,1);ctx.rotate((rand()-.5)*.012);
          ctx.fillStyle=PALETTE[colourAt(line,i)];ctx.strokeStyle=ctx.fillStyle;
          ctx.globalAlpha=.76+rand()*.24;
          ctx.lineWidth=.15+noise(line.x+advance,line.y,55,90,6)*.45;
          ctx.fillText(char,0,0);ctx.strokeText(char,0,0);ctx.restore();
          advance+=widths[i];
        });
      }
      return c;
    }
    function makeInk() {
      const ctx=$('.ink').getContext('2d'),rand=random(seed+91);
      ctx.globalCompositeOperation='multiply';
      function path(points) {
        ctx.beginPath();ctx.moveTo(...points[0]);
        for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);
      }
      function fine(points,ink,width=.8,alpha=.45) {
        ctx.save();ctx.strokeStyle=PALETTE[ink];ctx.globalAlpha=alpha;ctx.lineWidth=width;
        ctx.lineJoin='round';ctx.lineCap='round';path(points);ctx.stroke();ctx.restore();
      }
      function blot(x,y,rx,ry,ink,alpha=.7) {
        ctx.save();ctx.fillStyle=PALETTE[ink]||ink;
        for(let pass=3;pass>=0;pass--) {
          ctx.globalAlpha=pass?alpha*.12:alpha*.67;ctx.filter=pass?`blur(${pass*1.7}px)`:'none';
          organic(ctx,x,y,rx+pass*2,ry+pass*2,rand()*9,.22);ctx.fill();
        }
        ctx.filter='none';
        for(let i=0;i<42;i++) {
          const a=rand()*Math.PI*2,d=.7+rand()*.6;
          ctx.globalAlpha=alpha*rand()*.35;
          const r=.5+rand()**3*3;
          ctx.beginPath();ctx.ellipse(x+Math.cos(a)*rx*d,y+Math.sin(a)*ry*d,r,r*(.7+rand()),0,0,Math.PI*2);ctx.fill();
        }
        ctx.restore();
      }
      function felt(points,width,ink,load=.7) {
        const samples=[];
        for(let j=0;j<points.length-1;j++) {
          const a=points[j],b=points[j+1],distance=Math.hypot(b[0]-a[0],b[1]-a[1]);
          const count=Math.ceil(distance/3);
          for(let k=0;k<count;k++) {
            const t=k/count,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;
            samples.push([x,y+(noise(x,y,27,31,8)-.5)*1.8]);
          }
        }
        samples.push(points[points.length-1]);
        ctx.save();ctx.fillStyle=PALETTE[ink];ctx.strokeStyle=PALETTE[ink];
        ctx.lineJoin='round';ctx.lineCap='round';
        const pressure=samples.map(([x,y])=>width*(.72+noise(x,y,43,57,12)*.42));
        const normal=samples.map((p,i)=>{
          const a=samples[Math.max(0,i-1)],b=samples[Math.min(samples.length-1,i+1)];
          const d=Math.hypot(b[0]-a[0],b[1]-a[1])||1;return [-(b[1]-a[1])/d,(b[0]-a[0])/d];
        });
        const upper=samples.map((p,i)=>[p[0]+normal[i][0]*pressure[i]/2,p[1]+normal[i][1]*pressure[i]/2]);
        const lower=samples.map((p,i)=>[p[0]-normal[i][0]*pressure[i]/2,p[1]-normal[i][1]*pressure[i]/2]).reverse();
        ctx.globalAlpha=load*.51;path([...upper,...lower]);ctx.closePath();ctx.fill();
        for(let f=-.5;f<=.5;f+=.032) {
          ctx.globalAlpha=load*(.09+rand()*.2);ctx.lineWidth=.25+rand()*.65;
          path(samples.map((p,i)=>[p[0]+normal[i][0]*pressure[i]*f,p[1]+normal[i][1]*pressure[i]*f]));ctx.stroke();
        }
        ctx.restore();
        const first=samples[0],last=samples[samples.length-1];
        blot(first[0],first[1],width*.38,width*.32,ink,load*.35);
        blot(last[0],last[1],width*.47,width*.33,ink,load*.47);
      }
      function drip(x,y,length,ink,load=.4,width=3,pool=5) {
        const points=[];
        for(let p=0;p<1;p+=.02)points.push([x+Math.sin(p*7)*1.8+p*2,y+p*length]);
        points.push(dripTip([x,y,length]));
        for(let i=1;i<points.length;i++) {
          const p=i/(points.length-1),pulse=.72+noise(x,y+p*length,9,25,44)*.7;
          const thickness=(width*(1-p)+.65)*pulse;
          fine([points[i-1],points[i]],ink,thickness,load*(.65+p*.45));
          if(i%9===0)blot(points[i][0],points[i][1],thickness*1.2,3+width,ink,load*.12);
        }
        const end=points[points.length-1];
        blot(end[0]+.7,end[1]+1,pool*1.8,pool*2.1,ink,load*.15);
        const settled=load*(pool>7?1.7:1.25);
        blot(end[0],end[1],pool,pool*1.26,ink,settled);
        ctx.save();ctx.strokeStyle=PALETTE[ink];ctx.globalAlpha=load*.63;ctx.lineWidth=1.2;
        organic(ctx,end[0],end[1],pool*.94,pool*1.18,x*.017,.2);ctx.stroke();ctx.restore();
        blot(end[0]+pool*.18,end[1]+pool*.48,pool*.52,pool*.57,ink,settled*.67);
        if(length>300) {
          const tip=points[Math.floor(points.length*.72)];
          fine([[tip[0],tip[1]],[tip[0]-pool*.6,tip[1]+pool*1.4],[tip[0]-pool*.4,tip[1]+pool*2.8]],ink,.6,load*.42);
          blot(tip[0]-pool*.4,tip[1]+pool*2.8,1,1.5,ink,load*.3);
        }
      }

      if(PROFILE.number!==1){
        PROFILE.spills.forEach(p=>blot(...p));
        PROFILE.strokes.forEach(p=>felt(...p));
        DRIPS.forEach(d=>drip(...d));
        if(PROFILE.guides)PROFILE.guides.forEach(g=>fine(...g));
        else{
          const y=345+(PROFILE.seed%1300),x=100+(PROFILE.seed%130);
          fine([[x,y-160],[x,y+220],[1450,y+215]],PROFILE.number%2?'red':'blue',.7,.22);
        }
        return;
      }
      // Felt-tip cancellations retain the source locations and carry uneven pressure.
      felt([[1028,661],[1117,658],[1180,662],[1240,660]],12,'black',.94);
      felt([[1024,666],[1135,665],[1232,669]],6,'blue',.42);
      felt([[197,1015],[280,1012],[389,1016]],10,'black',.88);
      felt([[199,1588],[266,1585],[330,1588]],8.5,'black',.88);
      felt([[181,1809],[304,1811],[442,1807]],10,'red',.8);
      felt([[224,1810],[316,1813],[436,1812]],4,'blue',.5);

      // Ink crosses ink in several places, with a single reading of the words below.
      felt([[54,604],[320,608],[703,605],[1105,611],[1452,606]],5,'blue',.65);
      felt([[782,607],[933,610],[1137,608]],12,'green',.68);
      blot(1098,615,53,13,'black',.48);
      felt([[24,876],[269,880],[563,875],[910,880]],7,'green',.65);
      felt([[494,882],[657,885],[844,883]],9,'green',.46);
      felt([[614,885],[735,886],[861,889]],6,'blue',.42);
      felt([[479,925],[700,928],[1084,925]],3,'red',.5);
      felt([[26,1190],[315,1194],[764,1191],[1260,1197],[1517,1193]],4,'blue',.51);
      felt([[78,1410],[303,1414],[550,1409],[1099,1415]],7,'green',.58);
      felt([[306,1410],[472,1412],[731,1411]],5,'red',.52);
      felt([[197,1672],[518,1676],[965,1673],[1404,1678]],5,'red',.55);
      felt([[786,1676],[959,1678],[1171,1675]],4,'blue',.47);
      felt([[302,1866],[516,1865],[810,1869]],3,'green',.45);

      // Short pulls and pooled colour interrupt otherwise dry impressions.
      felt([[44,775],[89,790],[146,810],[286,854]],3,'red',.5);
      felt([[327,840],[478,843],[677,841]],4,'green',.44);
      felt([[1006,842],[1180,845],[1365,840]],3,'red',.5);
      blot(842,891,29,12,'blue',.42);blot(859,886,28,13,'green',.43);
      DRIPS.slice(0,5).forEach(d=>drip(...d));

      // The upper spill has a diffuse fringe and a few pale interruptions.
      blot(1460,23,136,61,'black',.73);blot(1537,61,71,30,'black',.56);
      blot(1406,74,44,51,'black',.26);
      DRIPS.slice(5).forEach(d=>drip(...d));
      ctx.save();ctx.globalCompositeOperation='destination-out';
      ctx.fillStyle='rgba(0,0,0,.8)';
      for(const [x,y,r] of [[1417,55,5],[1473,17,7],[1500,36,4]]){organic(ctx,x,y,r,r*.7,2,.3);ctx.fill();}
      ctx.restore();

      fine([[700,465],[1268,467],[1281,725]],'red',.8,.3);
      fine([[1267,467],[1266,702]],'blue',.7,.23);
      fine([[122,861],[425,862],[801,865],[1398,862]],'red',1,.48);
      fine([[340,811],[340,951]],'blue',.7,.26);
      fine([[153,1009],[154,1479],[1100,1481]],'red',.8,.3);
      fine([[444,1784],[443,1958],[707,1959]],'red',.8,.3);
      PAGE.rules.forEach(([x1,y1,x2,y2,ink])=>fine([[x1,y1],[x2,y2]],ink,1.2,.7));
      blot(78,1720,12,36,'black',.12);blot(86,1781,9,23,'black',.09);
      for(let i=0;i<2900;i++) {
        const x=rand()*W,y=rand()*H;
        ctx.fillStyle=PALETTE.black;ctx.globalAlpha=rand()*.17;
        ctx.fillRect(x,y,.3+rand()*.8,.3+rand()*.8);
      }
      ctx.globalAlpha=1;
    }
    function materialPrint() {
      const raw=typeDeposit(),ctx=raw.getContext('2d');
      ctx.globalCompositeOperation='multiply';ctx.drawImage($('.ink'),0,0);
      function softened(radius) {
        const c=canvas(),cx=c.getContext('2d');cx.filter=`blur(${radius}px)`;cx.drawImage(raw,0,0);return cx.getImageData(0,0,W,H).data;
      }
      const original=ctx.getImageData(0,0,W,H).data, close=softened(.9), spread=softened(3.1);
      const paper=$('.paper').getContext('2d').getImageData(0,0,W,H).data;
      const target=$('.transfer').getContext('2d'), output=target.createImageData(W,H);
      const step=8,cols=Math.ceil(W/step)+1,rows=Math.ceil(H/step)+1;
      const wet=new Float32Array(cols*rows);
      const patches=PROFILE.soak||[[1460,50,220,180,.85],[850,580,180,85,.75],[525,842,180,48,.9],[680,883,145,65,.95],[456,1064,95,46,.6],[519,1148,115,38,.75],[589,1321,100,42,.68],[735,1634,150,48,.7],[966,1678,140,42,.9]];
      for(let gy=0;gy<rows;gy++)for(let gx=0;gx<cols;gx++) {
        const x=gx*step,y=gy*step;
        let w=.07+Math.max(0,noise(x,y,64,108,23)-.36)*.6;
        for(const [px,py,rx,ry,a] of patches)w+=a*Math.exp(-(((x-px)/rx)**2+((y-py)/ry)**2));
        wet[gy*cols+gx]=clamp(w);
      }
      for(let y=0;y<H;y++)for(let x=0;x<W;x++) {
        const i=(y*W+x)*4;
        if(!original[i+3]&&!close[i+3]&&!spread[i+3])continue;
        const gx=Math.floor(x/step),gy=Math.floor(y/step),tx=x/step-gx,ty=y/step-gy;
        const top=wet[gy*cols+gx]*(1-tx)+wet[gy*cols+gx+1]*tx;
        const bottom=wet[(gy+1)*cols+gx]*(1-tx)+wet[(gy+1)*cols+gx+1]*tx;
        const moisture=top*(1-ty)+bottom*ty;
        const fibre=noise(x,y,1.3,5,17),grain=clamp((paper[i]-222)/25);
        const tooth=.66+fibre*.3+grain*.14;
        const core=original[i+3]/255*tooth;
        const swollen=close[i+3]/255*(.54+moisture*1.85);
        const wick=spread[i+3]/255*moisture*2.6*(.2+fibre*1.2);
        let a=clamp(Math.max(core,swollen,wick));
        if(fibre<.28)a*=1-(1-(.34+fibre*1.4))*(1-moisture*.85);
        a*=.86+grain*.14;
        const rub=surface.abrasion[y*W+x]/255,chip=surface.chips[y*W+x]/255;
        a*=Math.pow(1-rub,1.3)*(1-chip*.98);
        const colour=original[i+3]>100?original:close[i+3]>12?close:spread;
        output.data[i]=colour[i];output.data[i+1]=colour[i+1];output.data[i+2]=colour[i+2];output.data[i+3]=a*255;
      }
      const developed=canvas();developed.getContext('2d').putImageData(output,0,0);
      target.filter='blur(.32px)';target.drawImage(developed,0,0);target.filter='none';
    }
