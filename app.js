/* YGO ART LAB — 100% client-side procedural placeholder artwork generator. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const THEMES = {
    ocean: { name: '심해 · 바다', dark: '#06162b', mid: '#0e4761', edge: '#08b5ba', shine: '#85f0e4', glyph: '◈' },
    cosmos: { name: '우주 · 성운', dark: '#11112c', mid: '#483280', edge: '#bd65e8', shine: '#eab9ff', glyph: '✦' },
    ember: { name: '화염 · 용암', dark: '#220b15', mid: '#8c2926', edge: '#ff7a36', shine: '#ffe0a0', glyph: '✧' },
    machine: { name: '기계 · 전자', dark: '#0d1926', mid: '#22475c', edge: '#42d9e4', shine: '#b8fdff', glyph: '⬡' },
    relic: { name: '고대 · 유적', dark: '#19182b', mid: '#5c425a', edge: '#d5a873', shine: '#f7dfb0', glyph: '◆' },
    bloom: { name: '꽃 · 자연', dark: '#0e2220', mid: '#315753', edge: '#87d5ab', shine: '#f4eec7', glyph: '❀' },
    divine: { name: '빛 · 성역', dark: '#1b2542', mid: '#596c9a', edge: '#d5c28e', shine: '#fff8de', glyph: '✺' },
    shadow: { name: '어둠 · 그림자', dark: '#100e1f', mid: '#392a57', edge: '#9476e5', shine: '#cbbdfd', glyph: '◇' }
  };
  const STYLES = Object.keys(THEMES);
  const TONES = { blue:'#40a9fa',violet:'#b479ff',red:'#ff656c',gold:'#ebbf66',green:'#66d8a9' };
  const MAX_CARDS = 400;
  const MAX_FILE_BYTES = 30 * 1024 * 1024;
  const sampleCards = [
    {id:'100000001',name:'샘플 — 심해',style:'ocean',attribute:2},
    {id:'100000002',name:'샘플 — 성운',style:'cosmos',attribute:16},
    {id:'100000003',name:'샘플 — 화염',style:'ember',attribute:4}
  ];
  const state = { cards:sampleCards.map(v=>({...v})),selected:'100000001',demo:true,seed:0,busy:false,cancel:false };
  let toastTimer = null, sqlPromise = null;
  const encoder = new TextEncoder();

  function notify(message,kind='info') {
    const el=$('toast'); el.textContent=message; el.className='toast show '+kind;
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.className='toast',4000);
  }
  function rngFrom(value) {
    let h=2166136261;
    for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}
    return () => {h += 0x6D2B79F5;let t=h;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
  }
  function rnd(r,a,b) {return a+(b-a)*r();}
  function rgb(hex){const h=hex.replace('#','');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
  function rgba(hex,a){let c=rgb(hex);return `rgba(${c[0]},${c[1]},${c[2]},${a})`;}
  function mix(a,b,k){const A=rgb(a),B=rgb(b);return '#'+A.map((v,i)=>Math.round(v*(1-k)+B[i]*k).toString(16).padStart(2,'0')).join('');}
  function getCard(){return state.cards.find(c=>c.id===state.selected)||state.cards[0]||null;}
  function attributeTheme(a){if(a&2)return 'ocean';if(a&4)return 'ember';if(a&16)return 'divine';if(a&32)return 'shadow';if(a&8)return 'bloom';if(a&1)return 'relic';if(a&64)return 'cosmos';return null;}
  function resolveTheme(card){const global=$('style-select').value;if(global!=='auto')return global;
    return STYLES.includes(card.style)?card.style:(attributeTheme(Number(card.attribute)||0)||STYLES[Number(card.id.slice(-5))%STYLES.length]);}
  function palette(card){const theme=resolveTheme(card),base=THEMES[theme],tone=TONES[$('tone-select').value];
    if(!tone)return {...base,theme};
    return {...base,theme,dark:mix(base.dark,tone,.12),mid:mix(base.mid,tone,.55),edge:mix(base.edge,tone,.69),shine:mix(base.shine,tone,.28)};
  }
  function settings(){return {size:+$('size-select').value,format:$('format-select').value,labels:$('label-toggle').checked,seed:state.seed};}
  function pathCircle(ctx,x,y,r){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);}
  function glow(ctx,x,y,r,color,opacity=1){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,rgba(color,.65*opacity));g.addColorStop(.38,rgba(color,.22*opacity));g.addColorStop(1,rgba(color,0));ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
  function strokeRing(ctx,x,y,r,color,opacity,width=1){ctx.save();ctx.lineWidth=width;ctx.strokeStyle=rgba(color,opacity);pathCircle(ctx,x,y,r);ctx.stroke();ctx.restore();}
  function polygon(ctx,x,y,r,sides,rot=0){ctx.beginPath();for(let i=0;i<sides;i++){let a=rot+Math.PI*2*i/sides,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();}
  function line(ctx,pts,color,width=1,alpha=1){ctx.save();ctx.strokeStyle=rgba(color,alpha);ctx.lineWidth=width;ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();ctx.restore();}
  function gradientBackground(ctx,p,r){const grad=ctx.createLinearGradient(60,0,960,1024);grad.addColorStop(0,p.dark);grad.addColorStop(.5,p.mid);grad.addColorStop(1,mix(p.dark,p.mid,.25));ctx.fillStyle=grad;ctx.fillRect(0,0,1024,1024);
    glow(ctx,340+rnd(r,-80,80),390,490,p.edge,.7);glow(ctx,820,670,450,p.mid,.8);
    ctx.save();ctx.globalAlpha=.28;for(let i=0;i<15;i++){let y=rnd(r,0,1024),len=rnd(r,170,600);line(ctx,[[rnd(r,-70,400),y],[len+rnd(r,450,800),y-rnd(r,70,200)]],p.shine,rnd(r,.4,2),rnd(r,.08,.25));}ctx.restore();
  }
  function starsAndDust(ctx,p,r){for(let i=0;i<180;i++){let x=rnd(r,0,1024),y=rnd(r,0,1024),rr=rnd(r,.35,2.2),a=rnd(r,.08,.72);ctx.fillStyle=rgba(i%5===0?p.shine:'#fff',a);pathCircle(ctx,x,y,rr);ctx.fill();if(i%16===0){line(ctx,[[x-rr*5,y],[x+rr*5,y]],p.shine,.7,a/2);line(ctx,[[x,y-rr*5],[x,y+rr*5]],p.shine,.7,a/2);}}
  }
  function energyRings(ctx,p,r,x=512,y=500){ctx.save();ctx.translate(x,y);ctx.rotate(rnd(r,-.3,.3));for(let i=0;i<4;i++){ctx.beginPath();ctx.ellipse(0,0,270+i*40,120+i*10,-.1,0,Math.PI*2);ctx.strokeStyle=rgba(p.edge,.3-i*.065);ctx.lineWidth=2+i*.5;ctx.stroke();}ctx.restore();}
  function runeRing(ctx,p,r,x=512,y=505,rad=260){for(let i=0;i<3;i++)strokeRing(ctx,x,y,rad+i*22,p.shine,.4-i*.09,1.5);
    for(let i=0;i<24;i++){let a=(i/24)*Math.PI*2,rr=rad+12,l=7+(i%4)*4;line(ctx,[[x+Math.cos(a)*rr,y+Math.sin(a)*rr],[x+Math.cos(a)*(rr+l),y+Math.sin(a)*(rr+l)]],p.shine,1.5,.45);}
    for(let i=0;i<12;i++){let a=i*Math.PI/6+rnd(r,-.1,.1),rr=rad+36;polygon(ctx,x+Math.cos(a)*rr,y+Math.sin(a)*rr,3.5,4,a);ctx.fillStyle=rgba(p.edge,.5);ctx.fill();}
  }
  function prism(ctx,x,y,w,h,p,r,angle=0){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(0,-h*.6);ctx.lineTo(w*.55,-h*.16);ctx.lineTo(w*.42,h*.35);ctx.lineTo(0,h*.58);ctx.lineTo(-w*.42,h*.35);ctx.lineTo(-w*.55,-h*.16);ctx.closePath();let g=ctx.createLinearGradient(-w,-h,w,h);g.addColorStop(0,rgba(p.shine,.64));g.addColorStop(.28,rgba(p.edge,.4));g.addColorStop(.65,rgba(p.dark,.9));g.addColorStop(1,rgba(p.shine,.23));ctx.fillStyle=g;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=rgba(p.shine,.6);ctx.stroke();line(ctx,[[0,-h*.6],[0,h*.58]],p.shine,2,.5);line(ctx,[[-w*.55,-h*.16],[0,0],[w*.55,-h*.16]],p.shine,1,.3);ctx.restore();}
  function ocean(ctx,p,r){glow(ctx,512,530,350,p.edge,.65);for(let i=0;i<9;i++){let y=675+i*43;ctx.beginPath();ctx.moveTo(-30,y);for(let x=-30;x<=1070;x+=12){ctx.lineTo(x,y+Math.sin(x/105+i*.5)*rnd(r,5,20));}ctx.strokeStyle=rgba(p.shine,.05+i*.008);ctx.lineWidth=2;ctx.stroke();}
    runeRing(ctx,p,r,512,475,225);prism(ctx,512,520,235,440,p,r,.03);for(let side of [-1,1]){ctx.save();ctx.translate(512+side*340,655);ctx.rotate(side*.11);ctx.fillStyle=rgba(p.dark,.62);ctx.beginPath();ctx.moveTo(-45,350);ctx.lineTo(-40,-130);ctx.lineTo(-15,-240);ctx.lineTo(15,-240);ctx.lineTo(40,-130);ctx.lineTo(45,350);ctx.fill();line(ctx,[[0,-220],[0,200]],p.edge,3,.27);ctx.restore();}for(let i=0;i<22;i++){let x=rnd(r,90,930),y=rnd(r,120,880);strokeRing(ctx,x,y,rnd(r,2,11),p.shine,rnd(r,.12,.48),1.5);}}
  function cosmos(ctx,p,r){glow(ctx,525,460,480,p.edge,1);for(let i=0;i<5;i++){ctx.save();ctx.translate(512,475);ctx.rotate(.6+i*.32);ctx.beginPath();ctx.ellipse(0,0,260+i*12,90+i*24,0,0,2*Math.PI);ctx.strokeStyle=rgba(i%2?p.shine:p.edge,.55-i*.06);ctx.lineWidth=5-i*.6;ctx.shadowBlur=20;ctx.shadowColor=p.edge;ctx.stroke();ctx.restore();}
    let g=ctx.createRadialGradient(440,330,18,520,475,223);g.addColorStop(0,p.shine);g.addColorStop(.17,p.edge);g.addColorStop(.56,p.mid);g.addColorStop(.85,p.dark);g.addColorStop(1,rgba(p.dark,0));ctx.fillStyle=g;pathCircle(ctx,520,475,225);ctx.fill();strokeRing(ctx,520,475,229,p.shine,.4,3);for(let i=0;i<11;i++){let a=rnd(r,0,7),d=rnd(r,310,540);prism(ctx,512+Math.cos(a)*d,475+Math.sin(a)*d,rnd(r,15,40),rnd(r,35,80),p,r,a);}}
  function ember(ctx,p,r){glow(ctx,512,520,390,p.edge,1);for(let i=0;i<24;i++){let x=rnd(r,100,900),y=rnd(r,200,1000),w=rnd(r,20,80),h=rnd(r,90,340);ctx.save();ctx.translate(x,y);ctx.rotate(rnd(r,-.5,.5));ctx.beginPath();ctx.moveTo(-w/2,0);ctx.quadraticCurveTo(-w*1.7,-h*.42,0,-h);ctx.quadraticCurveTo(w*.45,-h*.45,w/2,0);ctx.closePath();ctx.fillStyle=rgba(i%4?p.edge:p.shine,rnd(r,.08,.28));ctx.fill();ctx.restore();}
    runeRing(ctx,p,r,512,520,228);prism(ctx,512,505,250,590,p,r,0);for(let i=0;i<90;i++){let x=rnd(r,30,1000),y=rnd(r,10,930);line(ctx,[[x,y],[x+rnd(r,-14,14),y-rnd(r,5,33)]],p.shine,rnd(r,.7,2),rnd(r,.08,.6));}}
  function machine(ctx,p,r){for(let i=0;i<16;i++){let y=95+i*55;line(ctx,[[0,y],[1024,y]],p.edge,.9,.14);line(ctx,[[y,0],[y,1024]],p.edge,.9,.12);}for(let i=0;i<18;i++){let left=r()<.5,x=left?0:1024,y=rnd(r,50,940),end=left?rnd(r,160,380):rnd(r,620,860);line(ctx,[[x,y],[end,y],[end,y+rnd(r,-120,120)]],p.edge,rnd(r,2,5),rnd(r,.12,.5));pathCircle(ctx,end,y,5);ctx.fillStyle=rgba(p.shine,.45);ctx.fill();}
    glow(ctx,512,520,370,p.edge,.9);for(let i=0;i<5;i++){polygon(ctx,512,510,170+i*45,6,Math.PI/6);ctx.strokeStyle=rgba(p.edge,.5-i*.08);ctx.lineWidth=4-i*.4;ctx.stroke();}polygon(ctx,512,510,143,6,Math.PI/6);ctx.fillStyle=p.dark;ctx.fill();polygon(ctx,512,510,110,6,Math.PI/6);ctx.fillStyle=rgba(p.edge,.42);ctx.fill();prism(ctx,512,510,100,220,p,r);for(let i=0;i<12;i++){let a=i*Math.PI/6;let x=512+Math.cos(a)*290,y=510+Math.sin(a)*290;polygon(ctx,x,y,13,6);ctx.fillStyle=rgba(p.shine,.55);ctx.fill();}}
  function relic(ctx,p,r){glow(ctx,512,470,370,p.edge,.65);for(let i=0;i<5;i++){let x=130+i*190;ctx.fillStyle=rgba(p.dark,.52);ctx.fillRect(x,230,40,700);ctx.beginPath();ctx.moveTo(x-20,260);ctx.lineTo(x+20,130+rnd(r,-40,40));ctx.lineTo(x+80,260);ctx.fill();line(ctx,[[x+20,270],[x+20,750]],p.shine,2,.18);}ctx.save();ctx.strokeStyle=rgba(p.shine,.45);ctx.lineWidth=7;ctx.beginPath();ctx.arc(512,520,245,Math.PI,2*Math.PI);ctx.lineTo(757,880);ctx.moveTo(267,520);ctx.lineTo(267,880);ctx.stroke();ctx.restore();runeRing(ctx,p,r,512,480,180);prism(ctx,512,518,175,375,p,r,.05);for(let i=0;i<18;i++)prism(ctx,rnd(r,100,920),rnd(r,160,820),rnd(r,7,28),rnd(r,10,80),p,r,rnd(r,-2,2));}
  function bloom(ctx,p,r){glow(ctx,512,510,375,p.edge,.75);for(let i=0;i<9;i++){let a=(i/9)*Math.PI*2;ctx.save();ctx.translate(512,515);ctx.rotate(a);for(let j=0;j<2;j++){ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(-120,-100-j*50,-105,-220-j*30,0,-290-j*30);ctx.bezierCurveTo(140,-180,85,-60,0,0);ctx.fillStyle=rgba(j?p.shine:p.edge,j?.19:.33);ctx.fill();ctx.strokeStyle=rgba(p.shine,.2);ctx.lineWidth=2;ctx.stroke();}ctx.restore();}
    for(let i=0;i<10;i++){let a=i*Math.PI/5;line(ctx,[[512,515],[512+Math.cos(a)*420,515+Math.sin(a)*420]],p.shine,2,.15);}strokeRing(ctx,512,515,108,p.shine,.38,3);prism(ctx,512,505,125,260,p,r);for(let i=0;i<24;i++){let a=rnd(r,0,7),d=rnd(r,250,520);ctx.save();ctx.translate(512+Math.cos(a)*d,515+Math.sin(a)*d);ctx.rotate(a);ctx.beginPath();ctx.ellipse(0,0,rnd(r,4,12),rnd(r,13,35),.3,0,2*Math.PI);ctx.fillStyle=rgba(p.shine,rnd(r,.15,.65));ctx.fill();ctx.restore();}}
  function divine(ctx,p,r){glow(ctx,512,360,500,p.shine,.95);for(let side of [-1,1]){ctx.save();ctx.translate(512,500);ctx.scale(side,1);for(let i=0;i<12;i++){let y=-190+i*30;ctx.beginPath();ctx.moveTo(40,y);ctx.quadraticCurveTo(160,-270+i*22,420,-310+i*42);ctx.quadraticCurveTo(200,-80+i*23,50,y+40);ctx.closePath();ctx.fillStyle=rgba(i%2?p.shine:p.edge,.10+i*.012);ctx.fill();}ctx.restore();}runeRing(ctx,p,r,512,465,190);for(let i=0;i<16;i++){let a=i*Math.PI/8;line(ctx,[[512+Math.cos(a)*240,465+Math.sin(a)*240],[512+Math.cos(a)*520,465+Math.sin(a)*520]],p.shine,rnd(r,1,5),.23);}prism(ctx,512,500,150,375,p,r);}
  function shadow(ctx,p,r){glow(ctx,520,430,450,p.edge,.7);ctx.fillStyle=rgba(p.shine,.35);pathCircle(ctx,550,365,220);ctx.fill();ctx.fillStyle=rgba(p.dark,1);pathCircle(ctx,630,300,219);ctx.fill();for(let i=0;i<8;i++){let a=i*Math.PI/4;ctx.save();ctx.translate(512,535);ctx.rotate(a);ctx.beginPath();ctx.moveTo(-35,20);ctx.quadraticCurveTo(-180,-120,0,-440);ctx.quadraticCurveTo(70,-145,50,0);ctx.fillStyle=rgba(i%2?p.edge:p.mid,rnd(r,.12,.35));ctx.fill();ctx.restore();}
    runeRing(ctx,p,r,512,510,225);prism(ctx,512,520,180,410,p,r,.1);for(let i=0;i<20;i++){let a=rnd(r,0,7),d=rnd(r,220,510);polygon(ctx,512+Math.cos(a)*d,520+Math.sin(a)*d,rnd(r,6,23),3,a);ctx.fillStyle=rgba(p.shine,rnd(r,.1,.5));ctx.fill();}}
  const MOTIFS={ocean,cosmos,ember,machine,relic,bloom,divine,shadow};
  function overlayNoise(ctx,r){const noise=document.createElement('canvas');noise.width=noise.height=128;const n=noise.getContext('2d'),im=n.createImageData(128,128);for(let i=0;i<im.data.length;i+=4){let v=r()<.49?255:0;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=Math.floor(rnd(r,0,12));}n.putImageData(im,0,0);ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(noise,0,0,1024,1024);ctx.restore();}
  function drawArtwork(canvas,card,size,opts={}){
    canvas.width=canvas.height=size;
    const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('브라우저 Canvas를 사용할 수 없습니다.');
    const p=palette(card),r=rngFrom(card.id+'|'+card.name+'|'+p.theme+'|'+opts.seed+'|'+$('tone-select').value);
    ctx.save();ctx.scale(size/1024,size/1024);
    gradientBackground(ctx,p,r);starsAndDust(ctx,p,r);
    ctx.save();ctx.shadowBlur=20;ctx.shadowColor=rgba(p.edge,.6);MOTIFS[p.theme](ctx,p,r);ctx.restore();
    overlayNoise(ctx,r);
    const vignette=ctx.createRadialGradient(512,485,230,512,485,750);vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(.78,'rgba(0,0,0,.15)');vignette.addColorStop(1,'rgba(0,0,0,.67)');ctx.fillStyle=vignette;ctx.fillRect(0,0,1024,1024);
    if(opts.labels){const strip=ctx.createLinearGradient(0,700,0,1024);strip.addColorStop(0,'rgba(2,6,15,0)');strip.addColorStop(1,'rgba(2,6,15,.86)');ctx.fillStyle=strip;ctx.fillRect(0,700,1024,324);ctx.textAlign='center';ctx.fillStyle='#ffffff';ctx.font='700 44px "Noto Sans KR",system-ui,sans-serif';let name=card.name;while(ctx.measureText(name).width>870&&name.length>2)name=name.slice(0,-2)+'…';ctx.fillText(name,512,911);ctx.font='500 25px system-ui,sans-serif';ctx.fillStyle='#c6d5e9';ctx.fillText(card.id,512,963);}
    ctx.restore();
  }
  function renderPreview(){const card=getCard(),canvas=$('art-canvas');$('download-current').disabled=!card;$('download-zip').disabled=!state.cards.length;if(!card){let c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);$('preview-title').textContent='카드를 추가해 주세요';$('preview-meta').textContent='이미지 미리보기';return;}
    try{drawArtwork(canvas,card,640,{seed:state.seed,labels:$('label-toggle').checked});}catch(e){notify('미리보기 생성 실패: '+e.message,'error');}
    $('preview-title').textContent=card.name;$('preview-meta').textContent=card.id+' · '+THEMES[resolveTheme(card)].name;
    $('stage-resolution').textContent=$('size-select').value+' × '+$('size-select').value;
  }
  function listCards(){const list=$('card-list');list.textContent='';const f=document.createDocumentFragment();
    if(!state.cards.length){const p=document.createElement('div');p.className='empty-list';p.textContent='목록이 비어 있어요. 카드 ID를 추가하거나 CDB를 업로드하세요.';list.append(p);}
    for(const card of state.cards){const p=palette(card);const btn=document.createElement('button');btn.type='button';btn.className='card-item'+(card.id===state.selected?' selected':'');btn.setAttribute('role','option');btn.setAttribute('aria-selected',String(card.id===state.selected));btn.dataset.id=card.id;const thumb=document.createElement('span');thumb.className='card-thumb';thumb.style.background=`linear-gradient(140deg,${p.mid},${p.dark})`;const glyph=document.createElement('span');glyph.textContent=p.glyph;thumb.append(glyph);const info=document.createElement('span');info.className='card-info';const name=document.createElement('strong');name.textContent=card.name;const id=document.createElement('small');id.textContent=card.id+' · '+THEMES[resolveTheme(card)].name;info.append(name,id);const arrow=document.createElement('span');arrow.className='card-chevron';arrow.textContent='›';btn.append(thumb,info,arrow);btn.onclick=()=>{state.selected=card.id;listCards();renderPreview();};f.append(btn);}list.append(f);
    const count=state.cards.length;$('card-count').textContent=count+'장'+(state.demo?' · 예시 데이터':'');$('total-count').innerHTML=count+' <small>장</small>';
  }
  function refresh(){listCards();renderPreview();}
  function normalizeCard(raw){const id=String(raw.id??'').trim();if(!/^\d{1,18}$/.test(id)||id==='0')return null;const name=String(raw.name||'카드 '+id).trim().slice(0,100)||'카드 '+id;const style=STYLES.includes(raw.style)?raw.style:null;return {id,name,style,attribute:Number(raw.attribute)||0};}
  function importCards(incoming,replace=false){const valid=incoming.map(normalizeCard).filter(Boolean),invalid=incoming.length-valid.length;
    if(!valid.length){notify('유효한 카드 ID가 없습니다. 숫자로 된 ID를 입력해 주세요.','error');return;}
    const old=replace||state.demo?[]:state.cards;const seen=new Set(old.map(c=>c.id));let duplicates=0,added=0;const next=old.slice();for(const c of valid){if(seen.has(c.id)){duplicates++;continue;}if(next.length>=MAX_CARDS)break;next.push(c);seen.add(c.id);added++;}
    const capped=(old.length+valid.length-duplicates)>MAX_CARDS;
    state.cards=next;state.demo=false;if(added||!state.cards.find(c=>c.id===state.selected))state.selected=added?next[old.length].id:(next[0]?.id||null);refresh();notify(`${added}장 추가${duplicates?' · 중복 '+duplicates+'장 제외':''}${invalid?' · 잘못된 ID '+invalid+'개 제외':''}${capped?' · 최대 400장 제한':''}`,added?'success':'info');
  }
  function splitLine(line){const delim=line.includes('\t')?'\t':line.includes('|')?'|':',';let columns=[],cur='',quoted=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(quoted&&line[i+1]==='"'){cur+='"';i++;}else quoted=!quoted;}else if(ch===delim&&!quoted){columns.push(cur.trim());cur='';}else cur+=ch;}columns.push(cur.trim());return columns;}
  function parseList(text){const rows=text.replace(/^\uFEFF/,'').split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith('#'));if(!rows.length)return[];const items=[];for(let i=0;i<rows.length;i++){const [id,name,style]=splitLine(rows[i]);if(i===0&&/^(id|card.?id|카드.?id)$/i.test(id))continue;items.push({id,name,style:style?.toLowerCase()});}return items;}
  async function ensureSql(){if(typeof window.initSqlJs==='function')return window.initSqlJs({locateFile:()=> 'https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/sql-wasm.wasm'});
    if(!sqlPromise){sqlPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/sql-wasm.js';s.async=true;const timer=setTimeout(()=>reject(new Error('CDB 분석 라이브러리 로딩 시간이 초과되었습니다. 인터넷 연결을 확인해 주세요.')),18000);s.onload=()=>{clearTimeout(timer);if(typeof window.initSqlJs!=='function')reject(new Error('SQLite 로딩 실패'));else window.initSqlJs({locateFile:()=> 'https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/sql-wasm.wasm'}).then(resolve,reject);};s.onerror=()=>{clearTimeout(timer);reject(new Error('CDB 읽기 라이브러리를 불러오지 못했습니다. TXT/CSV 입력은 계속 사용할 수 있습니다.'));};document.head.append(s);});sqlPromise.catch(()=>{sqlPromise=null;});}
    return sqlPromise;
  }
  async function parseCdb(bytes){const sql=await ensureSql();const db=new sql.Database(new Uint8Array(bytes));try{
    const tables=db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('datas','texts')");const names=(tables[0]?.values||[]).map(x=>x[0]);if(!names.includes('datas'))throw new Error('datas 테이블이 없는 CDB입니다.');
    const query=names.includes('texts')?'SELECT d.id, t.name, d.attribute FROM datas d LEFT JOIN texts t ON d.id=t.id ORDER BY d.id':'SELECT d.id, NULL AS name, d.attribute FROM datas d ORDER BY d.id';
    const data=db.exec(query);return(data[0]?.values||[]).map(row=>({id:row[0],name:row[1]||undefined,attribute:row[2]}));
  }finally{db.close();}}
  async function openFile(file){if(!file)return;if(file.size>MAX_FILE_BYTES){notify('30MB 이하 파일만 가져올 수 있습니다.','error');return;}
    const lower=file.name.toLowerCase();notify('파일을 분석하고 있습니다…');try{let rows;if(lower.endsWith('.cdb'))rows=await parseCdb(await file.arrayBuffer());else if(lower.endsWith('.txt')||lower.endsWith('.csv'))rows=parseList(await file.text());else{const signature=new TextDecoder().decode((await file.slice(0,16).arrayBuffer()));if(signature.startsWith('SQLite format 3'))rows=await parseCdb(await file.arrayBuffer());else rows=parseList(await file.text());}
      importCards(rows,true);
    }catch(e){notify('파일을 읽지 못했습니다: '+(e?.message||e),'error');}finally{$('file-input').value='';}}
  function crc32(bytes){let c=-1;for(let i=0;i<bytes.length;i++){c^=bytes[i];for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^-1)>>>0;}
  function makeZip(entries){const local=[],central=[];let offset=0;for(const item of entries){const name=encoder.encode(item.name),data=item.data,crc=crc32(data);if(name.length>65535)throw new Error('파일명이 너무 깁니다.');const l=new Uint8Array(30+name.length);let v=new DataView(l.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x0800,true);v.setUint16(8,0,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);l.set(name,30);local.push(l,data);
    const c=new Uint8Array(46+name.length);v=new DataView(c.buffer);v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x0800,true);v.setUint16(10,0,true);v.setUint32(16,crc,true);v.setUint32(20,data.length,true);v.setUint32(24,data.length,true);v.setUint16(28,name.length,true);v.setUint32(42,offset,true);c.set(name,46);central.push(c);offset+=l.length+data.length;
  }const centralSize=central.reduce((s,a)=>s+a.length,0);const end=new Uint8Array(22);const view=new DataView(end.buffer);view.setUint32(0,0x06054b50,true);view.setUint16(8,entries.length,true);view.setUint16(10,entries.length,true);view.setUint32(12,centralSize,true);view.setUint32(16,offset,true);return new Blob([...local,...central,end],{type:'application/zip'});}
  function saveBlob(blob,name){const a=document.createElement('a');const url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
  function renderBlob(card,opts){return new Promise((resolve,reject)=>{try{const canvas=document.createElement('canvas');drawArtwork(canvas,card,opts.size,opts);canvas.toBlob(b=>b?resolve(b):reject(new Error('이미지 인코딩 실패')),opts.format==='png'?'image/png':'image/jpeg',.91);}catch(e){reject(e);}});}
  async function exportCurrent(){if(state.busy)return;const card=getCard();if(!card){notify('카드를 먼저 추가해 주세요.','error');return;}try{state.busy=true;toggleBusy();const opts=settings();const blob=await renderBlob(card,opts);saveBlob(blob,card.id+'.'+opts.format);notify('이미지를 저장했습니다: '+card.id+'.'+opts.format,'success');}catch(e){notify('저장 실패: '+e.message,'error');}finally{state.busy=false;toggleBusy();}}
  function toggleBusy(){$('download-current').disabled=state.busy||!state.cards.length;$('download-zip').disabled=state.busy||!state.cards.length;$('add-card').disabled=state.busy;$('import-text').disabled=state.busy;$('file-input').disabled=state.busy;$('progress').hidden=!state.busy;}
  async function exportAll(){if(state.busy)return;if(!state.cards.length){notify('카드를 먼저 추가해 주세요.','error');return;}
    state.busy=true;state.cancel=false;toggleBusy();const opts=settings(),cards=state.cards.slice(),entries=[];try{for(let i=0;i<cards.length;i++){if(state.cancel){notify('ZIP 생성을 취소했습니다.');return;}const blob=await renderBlob(cards[i],opts);entries.push({name:cards[i].id+'.'+opts.format,data:new Uint8Array(await blob.arrayBuffer())});$('progress-fill').style.width=((i+1)/cards.length*100).toFixed(1)+'%';$('progress-label').textContent=`일러스트 생성 중 · ${i+1} / ${cards.length}`;if(i%3===0)await new Promise(resolve=>requestAnimationFrame(resolve));}
      if(state.cancel){notify('ZIP 생성을 취소했습니다.');return;}$('progress-label').textContent='ZIP 파일로 묶는 중…';await new Promise(resolve=>requestAnimationFrame(resolve));const zip=makeZip(entries);const date=new Date().toLocaleDateString('sv-SE');saveBlob(zip,`임시일러스트_${date}_${cards.length}장.zip`);notify(`${cards.length}장의 임시 일러스트 ZIP 저장 완료`,'success');
    }catch(e){notify('일괄 생성 실패: '+e.message,'error');}finally{state.busy=false;state.cancel=false;$('progress-fill').style.width='0%';toggleBusy();}}
  function onAdd(){const id=$('card-id').value.trim(),name=$('card-name').value.trim();if(!/^\d{1,18}$/.test(id)||id==='0'){notify('카드 ID는 1~18자리의 숫자로 입력해 주세요.','error');$('card-id').focus();return;}importCards([{id,name}],false);$('card-id').value='';$('card-name').value='';}
  function wire(){for(const id of ['style-select','tone-select','size-select','format-select','label-toggle'])$(id).addEventListener('change',()=>refresh());$('reroll').addEventListener('click',()=>{state.seed++;$('seed-number').textContent='#'+state.seed;refresh();notify('모든 이미지에 새로운 변형을 적용했습니다.');});$('add-card').addEventListener('click',onAdd);for(const id of ['card-id','card-name'])$(id).addEventListener('keydown',e=>{if(e.key==='Enter')onAdd();});$('import-text').addEventListener('click',()=>{const txt=$('bulk-text').value;if(!txt.trim()){notify('가져올 카드 목록을 붙여넣어 주세요.','error');return;}importCards(parseList(txt),false);$('bulk-text').value='';});$('file-input').addEventListener('change',e=>openFile(e.target.files[0]));const dz=$('dropzone');for(const event of ['dragenter','dragover'])dz.addEventListener(event,e=>{e.preventDefault();dz.classList.add('dragging');});for(const event of ['dragleave','drop'])dz.addEventListener(event,e=>{e.preventDefault();dz.classList.remove('dragging');});dz.addEventListener('drop',e=>{if(!state.busy)openFile(e.dataTransfer.files[0]);});dz.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('file-input').click();}});$('download-current').addEventListener('click',exportCurrent);$('download-zip').addEventListener('click',exportAll);$('cancel-export').addEventListener('click',()=>{state.cancel=true;$('progress-label').textContent='중단 처리 중…';});$('clear-cards').addEventListener('click',()=>{if(state.busy)return;state.cards=[];state.selected=null;state.demo=false;refresh();notify('목록을 비웠습니다.');});
    refresh();}
  wire();
  // Exposed only for deterministic automated tests, not part of app's public API.
  Object.defineProperty(window,'__YGO_TEST__',{value:{parseList,normalizeCard,makeZip,drawArtwork,importCards,getCards:()=>state.cards.slice()}});
})();