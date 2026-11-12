/* YGO ART LAB — 100% client-side procedural placeholder artwork generator. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const THEMES = {
    ocean:   { name: '심해 · 바다',   dark: '#06162b', mid: '#0e4761', edge: '#08b5ba', shine: '#85f0e4', glyph: '◈' },
    cosmos:  { name: '우주 · 성운',   dark: '#11112c', mid: '#483280', edge: '#bd65e8', shine: '#eab9ff', glyph: '✦' },
    ember:   { name: '화염 · 용암',   dark: '#220b15', mid: '#8c2926', edge: '#ff7a36', shine: '#ffe0a0', glyph: '✧' },
    machine: { name: '기계 · 전자',   dark: '#0d1926', mid: '#22475c', edge: '#42d9e4', shine: '#b8fdff', glyph: '⬡' },
    relic:   { name: '고대 · 유적',   dark: '#19182b', mid: '#5c425a', edge: '#d5a873', shine: '#f7dfb0', glyph: '◆' },
    bloom:   { name: '꽃 · 자연',     dark: '#0e2220', mid: '#315753', edge: '#87d5ab', shine: '#f4eec7', glyph: '❀' },
    divine:  { name: '빛 · 성역',     dark: '#1b2542', mid: '#596c9a', edge: '#d5c28e', shine: '#fff8de', glyph: '✺' },
    shadow:  { name: '어둠 · 그림자', dark: '#100e1f', mid: '#392a57', edge: '#9476e5', shine: '#cbbdfd', glyph: '◇' },
    storm:   { name: '번개 · 폭풍',   dark: '#101a33', mid: '#20457d', edge: '#6fd2ff', shine: '#f4fbff', glyph: '⚡' },
    frost:   { name: '얼음 · 설원',   dark: '#102231', mid: '#426d8a', edge: '#9fe8ff', shine: '#f2fcff', glyph: '✶' },
    desert:  { name: '사막 · 황야',   dark: '#2b190c', mid: '#8a5a24', edge: '#f2bc65', shine: '#fff1c4', glyph: '◬' },
    venom:   { name: '독 · 저주',     dark: '#130f1f', mid: '#43305e', edge: '#77db6b', shine: '#d7ffc8', glyph: '☣' }
  };
  const STYLES = Object.keys(THEMES);
  const SUBJECTS = ['auto','warrior','dragon','mech','wings','spirit','crystal','beast','blade','eye','tentacle','none'];
  // 프리셋은 카드 데이터만 수정하며, 전역 설정이나 기존 CDB/Lua 파일은 건드리지 않는다.
  const PRESETS = {
    bathys: { name:'무성해 · 바티스',style:'ocean',subject:'auto',tone:'blue' },
    cosmocode: { name:'코스모코드',style:'cosmos',subject:'auto',tone:'violet' },
    varnek: { name:'바르네크',style:'shadow',subject:'spirit',tone:'violet' },
    achillish: { name:'아칠리쉬',style:'ember',subject:'warrior',tone:'red' },
    watchrealm: { name:'천망성역',style:'divine',subject:'eye',tone:'gold' },
    abyssgrave: { name:'심연묘역',style:'shadow',subject:'spirit',tone:'green' }
  };
  const TONES = { blue:'#40a9fa',violet:'#b479ff',red:'#ff656c',gold:'#ebbf66',green:'#66d8a9' };
  const MAX_CARDS = 400;
  const MAX_FILE_BYTES = 30 * 1024 * 1024;
  const sampleCards = [
    {id:'100000001',name:'샘플 — 심해',style:'ocean',attribute:2},
    {id:'100000002',name:'샘플 — 성운',style:'cosmos',attribute:16},
    {id:'100000003',name:'샘플 — 화염',style:'ember',attribute:4}
  ];
  const state = { cards:sampleCards.map(v=>({...v})),selected:'100000001',checked:new Set(sampleCards.map(c=>c.id)),demo:true,seed:0,busy:false,cancel:false,lastBatch:null };
  const STORAGE_KEY='ygo-art-lab-v1.1';
  const Asset=window.YGOAssetEngine||null;
  let previewTicket=0;
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
  function inferThemeFromName(name=''){
    const t=String(name).toLocaleLowerCase();
    const has=(...words)=>words.some(w=>t.includes(w));
    if(has('심해','바다','해룡','해양','ocean','sea','abyss','아비스','mer','marine','물','파도')) return 'ocean';
    if(has('우주','성운','별','코스모','성계','cosmo','space','nova','star','galaxy','astr')) return 'cosmos';
    if(has('화염','용암','불','염','인페르노','마그마','flame','fire','lava','burn','pyro')) return 'ember';
    if(has('기계','메카','코드','전자','사이버','로봇','코어','회로','기갑','machine','mech','cyber','bot','gear','core')) return 'machine';
    if(has('유적','고대','왕','성배','유물','사원','relic','ruin','ancient','temple','artifact')) return 'relic';
    if(has('꽃','자연','숲','수목','씨앗','덩굴','bloom','flora','forest','leaf','rose','plant')) return 'bloom';
    if(has('빛','성역','천','엔젤','angel','holy','sanct','divine','sacred')) return 'divine';
    if(has('어둠','그림자','흑','암','심연','shadow','dark','night','gloom','void')) return 'shadow';
    if(has('번개','폭풍','뇌','전격','storm','thunder','volt','lightning','bolt','tempest')) return 'storm';
    if(has('얼음','빙','설','한기','frost','ice','snow','blizzard','glacier')) return 'frost';
    if(has('사막','모래','태양','황야','desert','sand','dune','sun','wild')) return 'desert';
    if(has('독','저주','맹독','사독','venom','poison','curse','toxic','hex','plague')) return 'venom';
    return null;
  }
  function resolveTheme(card){const global=$('style-select').value;if(STYLES.includes(card.overrideStyle))return card.overrideStyle;if(global!=='auto')return global;
    return STYLES.includes(card.style)?card.style:(inferThemeFromName(card.name)||attributeTheme(Number(card.attribute)||0)||STYLES[Number(card.id.slice(-5))%STYLES.length]);}
  function resolveTone(card){return card.overrideTone==='original'||TONES[card.overrideTone]?card.overrideTone:$('tone-select').value;}
  function resolveSubject(card,theme){const value=SUBJECTS.includes(card.overrideSubject)?card.overrideSubject:$('subject-select').value;return value==='auto'?inferSubject(card,theme):value;}
  function palette(card){const theme=resolveTheme(card),base=THEMES[theme],tone=TONES[resolveTone(card)];
    if(!tone)return {...base,theme};
    return {...base,theme,dark:mix(base.dark,tone,.12),mid:mix(base.mid,tone,.55),edge:mix(base.edge,tone,.69),shine:mix(base.shine,tone,.28)};
  }
  function settings(){return {size:+$('size-select').value,format:$('format-select').value,labels:$('label-toggle').checked,seed:state.seed,subject:$('subject-select').value,artMode:$('art-mode').value};}
  function saveState(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({cards:state.demo?[]:state.cards,demo:state.demo,selected:state.selected,checked:[...state.checked],seed:state.seed,settings:{style:$('style-select').value,tone:$('tone-select').value,subject:$('subject-select').value,size:$('size-select').value,format:$('format-select').value,labels:$('label-toggle').checked,artMode:$('art-mode').value}}));}catch(e){/* 사생활 보호 설정 또는 저장 공간 부족: 현재 세션만 유지 */}}
  function restoreState(){try{const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(!raw||typeof raw!=='object')return;const prefs=raw.settings||{};for(const [key,id,values] of [['style','style-select',['auto',...STYLES]],['tone','tone-select',['original',...Object.keys(TONES)]],['subject','subject-select',SUBJECTS],['size','size-select',['512','768','1024']],['format','format-select',['jpg','png']]]){if(values.includes(prefs[key]))$(id).value=prefs[key];}$('label-toggle').checked=Boolean(prefs.labels);$('art-mode').value=prefs.artMode==='vector'?'vector':'asset';state.seed=Number.isSafeInteger(raw.seed)&&raw.seed>=0?Math.min(raw.seed,1000000):0;$('seed-number').textContent='#'+state.seed;
    if(Array.isArray(raw.cards)&&!raw.demo){const cards=raw.cards.slice(0,MAX_CARDS).map(normalizeCard).filter(Boolean);const ids=new Set();state.cards=cards.filter(c=>!ids.has(c.id)&&ids.add(c.id));state.demo=false;state.selected=state.cards.some(c=>c.id===raw.selected)?raw.selected:(state.cards[0]?.id||null);const allowed=new Set(state.cards.map(c=>c.id));state.checked=new Set(Array.isArray(raw.checked)?raw.checked.filter(id=>allowed.has(id)):state.cards.map(c=>c.id));}}catch(e){/* 설정 오류나 저장 차단 시 기본값 사용 */}}
  function visibleCards(){const query=$('card-search').value.trim().toLocaleLowerCase();return query?state.cards.filter(c=>c.id.includes(query)||c.name.toLocaleLowerCase().includes(query)):state.cards;}
  function selectedCards(){return state.cards.filter(c=>state.checked.has(c.id));}
  function updateSelectionUI(){const count=state.checked.size,total=state.cards.length;$('selection-summary').textContent=`선택 ${count} / 전체 ${total}장`;$('total-count').innerHTML=total+' <small>장</small>';$('download-zip').disabled=state.busy||count===0;$('download-zip').textContent=`↓ 선택 카드 ZIP 저장 (${count})`;$('delete-selected').disabled=state.busy||count===0;$('select-all').disabled=state.busy||!visibleCards().length;$('select-none').disabled=state.busy||count===0;
    for(const id of ['apply-preset','apply-batch'])$(id).disabled=state.busy||count===0;
    $('undo-batch').disabled=state.busy||!state.lastBatch;
    $('batch-count').textContent=`선택 ${count}장에만 적용 · 선택되지 않은 카드는 유지`;
    const label=document.querySelector('.library-note code');if(label)label.textContent='카드ID.'+$('format-select').value;}
  function removeCards(ids){if(state.busy)return;const set=new Set(ids),old=state.cards.length;state.cards=state.cards.filter(c=>!set.has(c.id));for(const id of set)state.checked.delete(id);if(!state.cards.some(c=>c.id===state.selected))state.selected=state.cards[0]?.id||null;state.demo=false;state.lastBatch=null;saveState();refresh();notify(`${old-state.cards.length}장을 목록에서 삭제했습니다.`,'success');}
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
  function storm(ctx,p,r){glow(ctx,512,480,420,p.edge,.78);for(let i=0;i<14;i++){let x=rnd(r,130,910),y=rnd(r,40,420),segments=[[x,y]],cx=x,cy=y;for(let j=0;j<4;j++){cx+=rnd(r,-90,90);cy+=rnd(r,60,150);segments.push([cx,cy]);}line(ctx,segments,p.shine,rnd(r,2,6),rnd(r,.18,.65));}
    for(let i=0;i<11;i++){let y=150+i*60;line(ctx,[[0,y+rnd(r,-10,10)],[1024,y+rnd(r,-35,35)]],p.edge,rnd(r,.6,2.4),rnd(r,.08,.24));}
    runeRing(ctx,p,r,512,535,210);polygon(ctx,512,515,145,8,Math.PI/8);ctx.strokeStyle=rgba(p.edge,.5);ctx.lineWidth=6;ctx.stroke();prism(ctx,512,520,135,315,p,r,.08);}
  function frost(ctx,p,r){glow(ctx,512,500,390,p.shine,.72);for(let i=0;i<7;i++){let rad=120+i*34;for(let a=0;a<6;a++){let ang=a*Math.PI/3+rnd(r,-.04,.04),x=512+Math.cos(ang)*rad,y=510+Math.sin(ang)*rad;line(ctx,[[512,510],[x,y]],p.shine,2.5,.32);line(ctx,[[x,y],[x+Math.cos(ang+.55)*25,y+Math.sin(ang+.55)*25]],p.edge,2,.22);line(ctx,[[x,y],[x+Math.cos(ang-.55)*25,y+Math.sin(ang-.55)*25]],p.edge,2,.22);}}
    for(let i=0;i<26;i++){polygon(ctx,rnd(r,70,950),rnd(r,80,930),rnd(r,7,20),6,Math.PI/6);ctx.strokeStyle=rgba(p.shine,rnd(r,.12,.4));ctx.lineWidth=1.5;ctx.stroke();}prism(ctx,512,510,145,350,p,r);}
  function desert(ctx,p,r){glow(ctx,540,460,360,p.edge,.58);for(let i=0;i<8;i++){ctx.beginPath();let y=690+i*34;ctx.moveTo(-20,y);for(let x=0;x<=1040;x+=80){ctx.quadraticCurveTo(x+35,y-rnd(r,0,35),x+80,y+rnd(r,-10,20));}ctx.strokeStyle=rgba(i%2?p.edge:p.shine,.12+i*.015);ctx.lineWidth=22-i*1.8;ctx.stroke();}
    for(let i=0;i<5;i++){let x=160+i*170;ctx.fillStyle=rgba(p.dark,.3);ctx.beginPath();ctx.moveTo(x,760);ctx.lineTo(x+120,340+rnd(r,-40,80));ctx.lineTo(x+240,760);ctx.fill();}
    strokeRing(ctx,512,420,115,p.shine,.4,5);prism(ctx,512,505,150,380,p,r);}
  function venom(ctx,p,r){glow(ctx,512,510,400,p.edge,.62);for(let i=0;i<15;i++){let x=rnd(r,120,900),y=rnd(r,120,820),rr=rnd(r,14,42);pathCircle(ctx,x,y,rr);ctx.fillStyle=rgba(i%3?p.edge:p.shine,rnd(r,.06,.17));ctx.fill();for(let j=0;j<3;j++)pathCircle(ctx,x+rnd(r,-50,50),y+rnd(r,-50,50),rr*rnd(r,.15,.4)),ctx.fill();}
    for(let i=0;i<6;i++){ctx.beginPath();let x=120+i*155;ctx.moveTo(x,120);ctx.bezierCurveTo(x+70,280,x-30,500,x+90,820);ctx.strokeStyle=rgba(p.edge,.25+i*.02);ctx.lineWidth=9-i;ctx.stroke();}
    runeRing(ctx,p,r,512,520,195);polygon(ctx,512,510,165,5,Math.PI/10);ctx.strokeStyle=rgba(p.shine,.4);ctx.lineWidth=5;ctx.stroke();prism(ctx,512,520,128,290,p,r,.12);}
  const MOTIFS={ocean,cosmos,ember,machine,relic,bloom,divine,shadow,storm,frost,desert,venom};
  // 단순 벡터 실루엣: 별도의 생성형 AI·외부 이미지 없이 종족을 구분한다.
  function inferSubject(card,theme){
    if(Number(card.type)&6){const variants=['crystal','eye','wings','blade','spirit','tentacle'];return variants[Number(String(card.id).slice(-5))%variants.length];}
    const race=Number(card.race)||0;
    const name=String(card.name||'').toLocaleLowerCase();
    const has=(...words)=>words.some(w=>name.includes(w));
    if(has('용','dragon','drake','룡'))return 'dragon';
    if(has('기사','검','sword','blade','나이트','knight'))return 'blade';
    if(has('기계','메카','코어','machine','mech','robot','gear','bot'))return 'mech';
    if(has('천사','성령','날개','angel','wing','holy'))return 'wings';
    if(has('정령','망령','유령','spirit','ghost','phantom','soul'))return 'spirit';
    if(has('수정','결정','crystal','gem','보석'))return 'crystal';
    if(has('수인','야수','beast','wolf','tiger','사자','fox'))return 'beast';
    if(has('눈','안','봉인','감시','eye','watch','seer'))return 'eye';
    if(has('촉수','심연','해파리','tentacle','kraken','octo'))return 'tentacle';
    if(race&0x2000)return 'dragon'; if(race&0x20||race&0x1000000)return 'mech'; if(race&0x1)return 'warrior'; if(race&0x4||race&0x200)return 'wings'; if(race&0x8||race&0x10)return 'spirit'; if(race&0x40||race&0x80)return 'beast';
    return ({ember:'dragon',machine:'mech',divine:'wings',shadow:'spirit',relic:'warrior',ocean:'tentacle',cosmos:'crystal',bloom:'beast',storm:'blade',frost:'crystal',desert:'eye',venom:'tentacle'})[theme]||'crystal';
  }
  function drawSubject(ctx,p,r,subject){if(subject==='none')return;
    ctx.save();ctx.translate(512+rnd(r,-35,35),540+rnd(r,-20,20));ctx.rotate(rnd(r,-.055,.055));ctx.scale(rnd(r,.91,1.08),rnd(r,.91,1.08));
    const metal=ctx.createLinearGradient(-180,-240,180,250);metal.addColorStop(0,mix(p.dark,p.edge,.45));metal.addColorStop(.46,mix(p.dark,p.mid,.35));metal.addColorStop(1,mix(p.dark,p.edge,.18));ctx.fillStyle=metal;ctx.strokeStyle=rgba(p.shine,.77);ctx.lineWidth=8;ctx.lineJoin='round';ctx.shadowBlur=24;ctx.shadowColor=rgba(p.edge,.65);
    const path=(points)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();ctx.stroke();};
    if(subject==='warrior'){
      path([[-215,260],[-190,60],[-290,35],[-233,-96],[-135,-122],[-75,-60],[75,-60],[135,-122],[233,-96],[290,35],[190,60],[215,260]]);
      path([[-96,-80],[-120,-195],[-62,-277],[0,-319],[62,-277],[120,-195],[96,-80],[0,35]]);
      ctx.lineWidth=5;line(ctx,[[-87,-156],[-25,-131],[0,-111],[25,-131],[87,-156]],p.shine,8,.85);line(ctx,[[0,35],[0,255]],p.edge,8,.55);
    }else if(subject==='dragon'){
      path([[-55,110],[-320,-155],[-267,-258],[-158,-199],[-111,-316],[-40,-142],[35,-55],[111,-316],[158,-199],[267,-258],[320,-155],[55,110]]);
      path([[-103,270],[-141,88],[-54,-145],[-74,-250],[-34,-222],[0,-326],[34,-222],[74,-250],[54,-145],[141,88],[103,270],[0,184]]);
      ctx.fillStyle=p.shine;ctx.fillRect(-69,-168,32,10);ctx.fillRect(37,-168,32,10);line(ctx,[[0,-14],[0,160]],p.edge,11,.7);
    }else if(subject==='mech'){
      path([[-245,264],[-260,5],[-183,-92],[-95,-74],[-118,-258],[0,-312],[118,-258],[95,-74],[183,-92],[260,5],[245,264]]);
      path([[-122,-142],[-154,-228],[-76,-290],[76,-290],[154,-228],[122,-142],[65,-75],[-65,-75]]);
      ctx.fillStyle=rgba(p.shine,.88);ctx.fillRect(-90,-224,180,14);pathCircle(ctx,0,72,43);ctx.fillStyle=p.edge;ctx.fill();strokeRing(ctx,0,72,65,p.shine,.8,6);
    }else if(subject==='wings'){
      for(let side of [-1,1]){ctx.save();ctx.scale(side,1);path([[12,72],[77,-155],[210,-300],[185,-148],[310,-200],[226,-75],[299,-54],[167,48],[89,132]]);ctx.restore();}
      path([[-74,245],[-94,48],[-68,-167],[-27,-244],[0,-266],[27,-244],[68,-167],[94,48],[74,245],[0,200]]);strokeRing(ctx,0,-285,58,p.shine,.8,9);
    }else if(subject==='spirit'){
      path([[-90,255],[-205,143],[-160,-70],[-100,-171],[-66,-236],[0,-268],[66,-236],[100,-171],[160,-70],[205,143],[90,255],[30,174],[-30,174]]);
      ctx.fillStyle=rgba(p.shine,.85);pathCircle(ctx,-34,-151,12);ctx.fill();pathCircle(ctx,34,-151,12);ctx.fill();
      line(ctx,[[-100,60],[-158,212],[-218,262]],p.edge,11,.55);line(ctx,[[100,60],[158,212],[218,262]],p.edge,11,.55);
    }else if(subject==='crystal'){
      path([[0,-315],[154,-180],[190,102],[0,290],[-190,102],[-154,-180]]);line(ctx,[[0,-315],[0,290]],p.shine,7,.7);line(ctx,[[-154,-180],[0,16],[154,-180]],p.shine,6,.42);
      for(let side of [-1,1]){ctx.save();ctx.translate(side*235,95);ctx.rotate(side*.35);path([[0,-152],[65,-65],[59,100],[0,149],[-58,100],[-65,-65]]);ctx.restore();}
    }else if(subject==='beast'){
      path([[-240,175],[-150,40],[-170,-115],[-88,-194],[-12,-170],[12,-170],[88,-194],[170,-115],[150,40],[240,175],[120,238],[0,210],[-120,238]]);
      path([[-74,-18],[-115,-226],[-38,-287],[0,-248],[38,-287],[115,-226],[74,-18],[0,33]]);
      ctx.fillStyle=rgba(p.shine,.9);pathCircle(ctx,-54,-120,11);ctx.fill();pathCircle(ctx,54,-120,11);ctx.fill();
    }else if(subject==='blade'){
      path([[-24,300],[-54,16],[-20,-305],[0,-336],[20,-305],[54,16],[24,300],[0,262]]);
      path([[-168,39],[-23,16],[0,-53],[23,16],[168,39],[112,82],[40,72],[-40,72],[-112,82]]);
      for(let side of [-1,1]){ctx.save();ctx.translate(side*180,10);ctx.rotate(side*.72);path([[-16,136],[-30,-12],[-12,-178],[0,-203],[12,-178],[30,-12],[16,136],[0,114]]);ctx.restore();}
      strokeRing(ctx,0,-214,40,p.shine,.6,6);
    }else if(subject==='eye'){
      ctx.beginPath();ctx.ellipse(0,0,280,160,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle=rgba(p.shine,.25);ctx.beginPath();ctx.ellipse(0,0,200,95,0,0,Math.PI*2);ctx.fill();
      pathCircle(ctx,0,0,86);ctx.fillStyle=rgba(p.edge,.88);ctx.fill();strokeRing(ctx,0,0,120,p.shine,.8,6);pathCircle(ctx,0,0,25);ctx.fillStyle=rgba(p.dark,.95);ctx.fill();
      for(let i=0;i<18;i++){let a=i*Math.PI/9;line(ctx,[[Math.cos(a)*130,Math.sin(a)*130],[Math.cos(a)*245,Math.sin(a)*245]],p.shine,3,.26);}
    }else if(subject==='tentacle'){
      for(let side of [-1,1]){for(let i=0;i<4;i++){ctx.save();ctx.scale(side,1);ctx.rotate((i-1.5)*.22);ctx.beginPath();ctx.moveTo(0,160);ctx.bezierCurveTo(40,40,140,-20,155,-180);ctx.bezierCurveTo(158,-230,134,-282,97,-315);ctx.strokeStyle=rgba(p.shine,.55-i*.06);ctx.lineWidth=18-i*2.4;ctx.stroke();for(let j=0;j<7;j++){pathCircle(ctx,95+rnd(r,-9,9),118-j*52,7-j*.7);ctx.fillStyle=rgba(p.edge,.4);ctx.fill();}ctx.restore();}}
      path([[-94,205],[-125,80],[-94,-55],[-42,-152],[0,-187],[42,-152],[94,-55],[125,80],[94,205],[0,148]]);strokeRing(ctx,0,-212,48,p.shine,.6,6);
    }
    ctx.restore();
  }
  function overlayNoise(ctx,r){const noise=document.createElement('canvas');noise.width=noise.height=128;const n=noise.getContext('2d'),im=n.createImageData(128,128);for(let i=0;i<im.data.length;i+=4){let v=r()<.49?255:0;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=Math.floor(rnd(r,0,12));}n.putImageData(im,0,0);ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(noise,0,0,1024,1024);ctx.restore();}
  function drawArtwork(canvas,card,size,opts={}){
    canvas.width=canvas.height=size;
    const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('브라우저 Canvas를 사용할 수 없습니다.');
    const p=palette(card),subject=resolveSubject(card,p.theme);
    const r=rngFrom(card.id+'|'+card.name+'|'+p.theme+'|'+opts.seed+'|'+(card.variant||0)+'|'+resolveTone(card)+'|'+subject);
    ctx.save();ctx.scale(size/1024,size/1024);
    gradientBackground(ctx,p,r);starsAndDust(ctx,p,r);
    ctx.save();ctx.shadowBlur=20;ctx.shadowColor=rgba(p.edge,.6);MOTIFS[p.theme](ctx,p,r);ctx.restore();
    const path=Asset&&opts.artMode!=='vector'?Asset.pick(card,subject,opts.seed??0):null;
    if(!path||!Asset.get(path)||!Asset.paint(ctx,Asset.get(path),p,card,opts.seed??0))drawSubject(ctx,p,r,subject);
    overlayNoise(ctx,r);
    const vignette=ctx.createRadialGradient(512,485,230,512,485,750);vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(.78,'rgba(0,0,0,.15)');vignette.addColorStop(1,'rgba(0,0,0,.67)');ctx.fillStyle=vignette;ctx.fillRect(0,0,1024,1024);
    if(opts.labels){const strip=ctx.createLinearGradient(0,700,0,1024);strip.addColorStop(0,'rgba(2,6,15,0)');strip.addColorStop(1,'rgba(2,6,15,.86)');ctx.fillStyle=strip;ctx.fillRect(0,700,1024,324);ctx.textAlign='center';ctx.fillStyle='#ffffff';ctx.font='700 44px "Noto Sans KR",system-ui,sans-serif';let name=card.name;while(ctx.measureText(name).width>870&&name.length>2)name=name.slice(0,-2)+'…';ctx.fillText(name,512,911);ctx.font='500 25px system-ui,sans-serif';ctx.fillStyle='#c6d5e9';ctx.fillText(card.id,512,963);}
    ctx.restore();
  }
  function renderPreview(){const ticket=++previewTicket;const card=getCard(),canvas=$('art-canvas');$('download-current').disabled=state.busy||!card;$('card-style').disabled=state.busy||!card;$('card-subject').disabled=state.busy||!card;$('card-tone').disabled=state.busy||!card;$('reroll-card').disabled=state.busy||!card;if(!card){let c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);$('preview-title').textContent='카드를 추가해 주세요';$('preview-meta').textContent='이미지 미리보기';return;}
    try{const opts=settings();drawArtwork(canvas,card,640,opts);const subject=resolveSubject(card,resolveTheme(card)),path=opts.artMode==='asset'&&Asset?Asset.pick(card,subject,opts.seed):null;
      $('asset-status').textContent=path?'오픈 SVG · Game-icons':'기존 절차 벡터';
      if(path)Asset.prepare(path).then(img=>{if(ticket===previewTicket&&img&&!state.busy)drawArtwork(canvas,card,640,opts);else if(ticket===previewTicket&&!img)$('asset-status').textContent='에셋 로드 실패 · 벡터 대체';});}catch(e){notify('미리보기 생성 실패: '+e.message,'error');}
    $('preview-title').textContent=card.name;$('preview-meta').textContent=card.id+' · '+THEMES[resolveTheme(card)].name;$('card-style').value=card.overrideStyle||'auto';$('card-subject').value=card.overrideSubject??'inherit';$('card-tone').value=card.overrideTone??'inherit';
    $('stage-resolution').textContent=$('size-select').value+' × '+$('size-select').value;
  }
  function listCards(){const list=$('card-list');list.textContent='';const frag=document.createDocumentFragment(),items=visibleCards();
    if(!items.length){const empty=document.createElement('div');empty.className='empty-list';empty.textContent=state.cards.length?'검색 결과가 없습니다.':'목록이 비어 있어요. 카드 ID를 추가하거나 CDB를 업로드하세요.';list.append(empty);}
    for(const card of items){const p=palette(card),row=document.createElement('div');row.className='card-item'+(card.id===state.selected?' selected':'');row.setAttribute('role','listitem');
      const check=document.createElement('input');check.type='checkbox';check.className='card-check';check.checked=state.checked.has(card.id);check.setAttribute('aria-label',card.name+' ZIP 생성 대상');check.disabled=state.busy;check.onchange=()=>{check.checked?state.checked.add(card.id):state.checked.delete(card.id);saveState();updateSelectionUI();};
      const btn=document.createElement('button');btn.type='button';btn.className='card-open';btn.setAttribute('aria-label',card.name+' 미리보기');btn.disabled=state.busy;
      const thumb=document.createElement('span');thumb.className='card-thumb';thumb.style.background=`linear-gradient(140deg,${p.mid},${p.dark})`;const glyph=document.createElement('span');glyph.textContent=p.glyph;thumb.append(glyph);
      const info=document.createElement('span');info.className='card-info';const name=document.createElement('strong');name.textContent=card.name;const id=document.createElement('small');id.textContent=card.id+' · '+THEMES[resolveTheme(card)].name;info.append(name,id);const arrow=document.createElement('span');arrow.className='card-chevron';arrow.textContent='›';btn.append(thumb,info,arrow);btn.onclick=()=>{state.selected=card.id;saveState();listCards();renderPreview();};
      const del=document.createElement('button');del.type='button';del.className='card-delete';del.textContent='×';del.setAttribute('aria-label',card.name+' 삭제');del.title='목록에서 삭제';del.disabled=state.busy;del.onclick=()=>removeCards([card.id]);row.append(check,btn,del);frag.append(row);}
    list.append(frag);$('card-count').textContent=state.cards.length+'장'+(state.demo?' · 예시 데이터':'');updateSelectionUI();
  }
  function refresh(){listCards();renderPreview();}
  function normalizeCard(raw){const id=String(raw.id??'').trim();if(!/^\d{1,18}$/.test(id)||id==='0')return null;const name=String(raw.name||'카드 '+id).trim().slice(0,100)||'카드 '+id;const style=STYLES.includes(raw.style)?raw.style:null;
    const overrideTone=raw.overrideTone==='original'||TONES[raw.overrideTone]?raw.overrideTone:null;
    return {id,name,style,attribute:Number(raw.attribute)||0,type:Number(raw.type)||0,race:Number(raw.race)||0,variant:Number.isSafeInteger(raw.variant)&&raw.variant>=0?Math.min(raw.variant,1000000):0,overrideStyle:STYLES.includes(raw.overrideStyle)?raw.overrideStyle:null,overrideSubject:SUBJECTS.includes(raw.overrideSubject)?raw.overrideSubject:null,overrideTone};}
  function applyToChecked(changes,label){
    if(state.busy)return;
    const cards=selectedCards();if(!cards.length){notify('먼저 오른쪽 목록에서 적용할 카드를 체크해 주세요.','error');return;}
    const updates={};
    if(Object.prototype.hasOwnProperty.call(changes,'style'))updates.overrideStyle=STYLES.includes(changes.style)?changes.style:null;
    if(Object.prototype.hasOwnProperty.call(changes,'subject'))updates.overrideSubject=SUBJECTS.includes(changes.subject)?changes.subject:null;
    if(Object.prototype.hasOwnProperty.call(changes,'tone'))updates.overrideTone=changes.tone==='original'||TONES[changes.tone]?changes.tone:null;
    if(!Object.keys(updates).length){notify('변경할 배경·모티브·색상을 하나 이상 선택해 주세요.');return;}
    const snapshot=[];
    for(const card of cards){const original={};let changed=false;for(const [key,value] of Object.entries(updates)){original[key]=card[key]??null;if((card[key]??null)!==value){card[key]=value;changed=true;}}if(changed)snapshot.push({id:card.id,original});}
    if(!snapshot.length){notify('선택 카드에 이미 같은 설정이 적용되어 있어요.');return;}
    state.lastBatch=snapshot;state.demo=false;saveState();refresh();notify(`${label}: ${snapshot.length}장의 설정을 변경했습니다.`,'success');
  }
  function applyPreset(){const selected=$('preset-select').value,preset=PRESETS[selected];if(!preset){notify('카드군 프리셋을 선택해 주세요.');return;}applyToChecked(preset,preset.name+' 프리셋');}
  function applyBatch(){const changes={};for(const [property,id] of [['style','batch-style'],['subject','batch-subject'],['tone','batch-tone']]){const value=$(id).value;if(value!=='keep')changes[property]=value;}applyToChecked(changes,'선택 카드 일괄 적용');}
  function undoBatch(){if(state.busy||!state.lastBatch)return;let restored=0;const byId=new Map(state.cards.map(c=>[c.id,c]));for(const row of state.lastBatch){const card=byId.get(row.id);if(card){Object.assign(card,row.original);restored++;}}state.lastBatch=null;saveState();refresh();notify(`${restored}장의 직전 일괄 설정을 되돌렸습니다.`,'success');}
  function importCards(incoming,replace=false){const valid=incoming.map(normalizeCard).filter(Boolean),invalid=incoming.length-valid.length;
    if(!valid.length){notify('유효한 카드 ID가 없습니다. 숫자로 된 ID를 입력해 주세요.','error');return;}
    const old=replace||state.demo?[]:state.cards;const seen=new Set(old.map(c=>c.id));let duplicates=0,added=0;const next=old.slice();for(const c of valid){if(seen.has(c.id)){duplicates++;continue;}if(next.length>=MAX_CARDS)break;next.push(c);seen.add(c.id);added++;}
    const capped=(old.length+valid.length-duplicates)>MAX_CARDS;
    state.cards=next;state.demo=false;state.lastBatch=null;$('card-search').value='';if(replace||!old.length){state.checked=new Set(next.map(c=>c.id));}else for(const c of next.slice(old.length))state.checked.add(c.id);if(added||!state.cards.find(c=>c.id===state.selected))state.selected=added?next[old.length].id:(next[0]?.id||null);saveState();refresh();notify(`${added}장 추가${duplicates?' · 중복 '+duplicates+'장 제외':''}${invalid?' · 잘못된 ID '+invalid+'개 제외':''}${capped?' · 최대 400장 제한':''}`,added?'success':'info');
  }
  function splitLine(line){const delim=line.includes('\t')?'\t':line.includes('|')?'|':',';let columns=[],cur='',quoted=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(quoted&&line[i+1]==='"'){cur+='"';i++;}else quoted=!quoted;}else if(ch===delim&&!quoted){columns.push(cur.trim());cur='';}else cur+=ch;}columns.push(cur.trim());return columns;}
  function parseList(text){const rows=text.replace(/^\uFEFF/,'').split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith('#'));if(!rows.length)return[];const items=[];for(let i=0;i<rows.length;i++){const [id,name,style]=splitLine(rows[i]);if(i===0&&/^(id|card.?id|카드.?id)$/i.test(id))continue;items.push({id,name,style:style?.toLowerCase()});}return items;}
  async function ensureSql(){if(typeof window.initSqlJs==='function')return window.initSqlJs({locateFile:()=> 'https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/sql-wasm.wasm'});
    if(!sqlPromise){sqlPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/sql-wasm.js';s.async=true;const timer=setTimeout(()=>reject(new Error('CDB 분석 라이브러리 로딩 시간이 초과되었습니다. 인터넷 연결을 확인해 주세요.')),18000);s.onload=()=>{clearTimeout(timer);if(typeof window.initSqlJs!=='function')reject(new Error('SQLite 로딩 실패'));else window.initSqlJs({locateFile:()=> 'https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/sql-wasm.wasm'}).then(resolve,reject);};s.onerror=()=>{clearTimeout(timer);reject(new Error('CDB 읽기 라이브러리를 불러오지 못했습니다. TXT/CSV 입력은 계속 사용할 수 있습니다.'));};document.head.append(s);});sqlPromise.catch(()=>{sqlPromise=null;});}
    return sqlPromise;
  }
  async function parseCdb(bytes){const sql=await ensureSql();const db=new sql.Database(new Uint8Array(bytes));try{
    const tables=db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('datas','texts')");const names=(tables[0]?.values||[]).map(x=>x[0]);if(!names.includes('datas'))throw new Error('datas 테이블이 없는 CDB입니다.');
    const query=names.includes('texts')?'SELECT CAST(d.id AS TEXT), t.name, d.attribute, d.type, d.race FROM datas d LEFT JOIN texts t ON d.id=t.id ORDER BY d.id':'SELECT CAST(d.id AS TEXT), NULL AS name, d.attribute, d.type, d.race FROM datas d ORDER BY d.id';
    const data=db.exec(query);return(data[0]?.values||[]).map(row=>({id:row[0],name:row[1]||undefined,attribute:row[2],type:row[3],race:row[4]}));
  }finally{db.close();}}
  async function openFile(file){if(!file)return;if(file.size>MAX_FILE_BYTES){notify('30MB 이하 파일만 가져올 수 있습니다.','error');return;}
    const lower=file.name.toLowerCase();notify('파일을 분석하고 있습니다…');try{let rows;if(lower.endsWith('.cdb'))rows=await parseCdb(await file.arrayBuffer());else if(lower.endsWith('.txt')||lower.endsWith('.csv'))rows=parseList(await file.text());else{const signature=new TextDecoder().decode((await file.slice(0,16).arrayBuffer()));if(signature.startsWith('SQLite format 3'))rows=await parseCdb(await file.arrayBuffer());else rows=parseList(await file.text());}
      importCards(rows,true);
    }catch(e){notify('파일을 읽지 못했습니다: '+(e?.message||e),'error');}finally{$('file-input').value='';}}
  const CRC_TABLE=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);t[n]=c>>>0;}return t;})();
  function crc32(bytes){let c=0xffffffff;for(let i=0;i<bytes.length;i++)c=(c>>>8)^CRC_TABLE[(c^bytes[i])&255];return (c^0xffffffff)>>>0;}
  function makeZip(entries){const local=[],central=[];let offset=0;for(const item of entries){const name=encoder.encode(item.name),data=item.data,crc=crc32(data);if(name.length>65535)throw new Error('파일명이 너무 깁니다.');const l=new Uint8Array(30+name.length);let v=new DataView(l.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x0800,true);v.setUint16(8,0,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);l.set(name,30);local.push(l,data);
    const c=new Uint8Array(46+name.length);v=new DataView(c.buffer);v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x0800,true);v.setUint16(10,0,true);v.setUint32(16,crc,true);v.setUint32(20,data.length,true);v.setUint32(24,data.length,true);v.setUint16(28,name.length,true);v.setUint32(42,offset,true);c.set(name,46);central.push(c);offset+=l.length+data.length;
  }const centralSize=central.reduce((s,a)=>s+a.length,0);const end=new Uint8Array(22);const view=new DataView(end.buffer);view.setUint32(0,0x06054b50,true);view.setUint16(8,entries.length,true);view.setUint16(10,entries.length,true);view.setUint32(12,centralSize,true);view.setUint32(16,offset,true);return new Blob([...local,...central,end],{type:'application/zip'});}
  function saveBlob(blob,name){const a=document.createElement('a');const url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
  async function renderBlob(card,opts){if(opts.artMode==='asset'&&Asset){const path=Asset.pick(card,resolveSubject(card,resolveTheme(card)),opts.seed);await Asset.prepare(path);}return new Promise((resolve,reject)=>{try{const canvas=document.createElement('canvas');drawArtwork(canvas,card,opts.size,opts);canvas.toBlob(b=>b?resolve(b):reject(new Error('이미지 인코딩 실패')),opts.format==='png'?'image/png':'image/jpeg',.91);}catch(e){reject(e);}});}
  async function exportCurrent(){if(state.busy)return;const card=getCard();if(!card){notify('카드를 먼저 추가해 주세요.','error');return;}try{state.busy=true;toggleBusy();const opts=settings();const blob=await renderBlob(card,opts);saveBlob(blob,card.id+'.'+opts.format);notify('이미지를 저장했습니다: '+card.id+'.'+opts.format,'success');}catch(e){notify('저장 실패: '+e.message,'error');}finally{state.busy=false;toggleBusy();}}
  function toggleBusy(){$('download-current').disabled=state.busy||!state.cards.length;updateSelectionUI();$('add-card').disabled=state.busy;$('import-text').disabled=state.busy;$('file-input').disabled=state.busy;$('clear-cards').disabled=state.busy;$('card-style').disabled=state.busy||!getCard();$('card-subject').disabled=state.busy||!getCard();$('card-tone').disabled=state.busy||!getCard();$('reroll-card').disabled=state.busy||!getCard();$('reroll').disabled=state.busy;for(const id of ['style-select','subject-select','tone-select','size-select','format-select','label-toggle','art-mode','preset-select','batch-style','batch-subject','batch-tone'])$(id).disabled=state.busy;document.querySelectorAll('#card-list input,#card-list button').forEach(el=>el.disabled=state.busy);$('progress').hidden=!state.busy;}
  async function exportAll(){if(state.busy)return;if(!state.checked.size){notify('ZIP으로 저장할 카드를 선택해 주세요.','error');return;}
    state.busy=true;state.cancel=false;toggleBusy();const opts=settings(),cards=selectedCards(),entries=[];let totalBytes=0;if(!cards.length){state.busy=false;toggleBusy();notify('ZIP으로 저장할 카드를 선택해 주세요.','error');return;}try{for(let i=0;i<cards.length;i++){if(state.cancel){notify('ZIP 생성을 취소했습니다.');return;}const blob=await renderBlob(cards[i],opts);const data=new Uint8Array(await blob.arrayBuffer());totalBytes+=data.byteLength;if(totalBytes>350*1024*1024)throw new Error('ZIP 이미지 총 크기가 350MB를 초과했습니다. 일부 카드만 선택하거나 512 해상도를 사용해 주세요.');entries.push({name:cards[i].id+'.'+opts.format,data});$('progress-fill').style.width=((i+1)/cards.length*100).toFixed(1)+'%';$('progress-label').textContent=`일러스트 생성 중 · ${i+1} / ${cards.length}`;if(i%3===0)await new Promise(resolve=>requestAnimationFrame(resolve));}
      if(state.cancel){notify('ZIP 생성을 취소했습니다.');return;}$('progress-label').textContent='ZIP 파일로 묶는 중…';await new Promise(resolve=>requestAnimationFrame(resolve));const zip=makeZip(entries);const date=new Date().toLocaleDateString('sv-SE');saveBlob(zip,`임시일러스트_${date}_${cards.length}장.zip`);notify(`${cards.length}장의 임시 일러스트 ZIP 저장 완료`,'success');
    }catch(e){notify('일괄 생성 실패: '+e.message,'error');}finally{state.busy=false;state.cancel=false;$('progress-fill').style.width='0%';toggleBusy();}}
  function onAdd(){const id=$('card-id').value.trim(),name=$('card-name').value.trim();if(!/^\d{1,18}$/.test(id)||id==='0'){notify('카드 ID는 1~18자리의 숫자로 입력해 주세요.','error');$('card-id').focus();return;}importCards([{id,name}],false);$('card-id').value='';$('card-name').value='';}
  function wire(){restoreState();for(const id of ['style-select','subject-select','tone-select','size-select','format-select','label-toggle','art-mode'])$(id).addEventListener('change',()=>{saveState();refresh();});$('reroll').addEventListener('click',()=>{state.seed++;$('seed-number').textContent='#'+state.seed;saveState();refresh();notify('모든 이미지에 새로운 변형을 적용했습니다.');});$('add-card').addEventListener('click',onAdd);for(const id of ['card-id','card-name'])$(id).addEventListener('keydown',e=>{if(e.key==='Enter')onAdd();});$('import-text').addEventListener('click',()=>{const txt=$('bulk-text').value;if(!txt.trim()){notify('가져올 카드 목록을 붙여넣어 주세요.','error');return;}importCards(parseList(txt),false);$('bulk-text').value='';});$('file-input').addEventListener('change',e=>openFile(e.target.files[0]));const dz=$('dropzone');for(const event of ['dragenter','dragover'])dz.addEventListener(event,e=>{e.preventDefault();dz.classList.add('dragging');});for(const event of ['dragleave','drop'])dz.addEventListener(event,e=>{e.preventDefault();dz.classList.remove('dragging');});dz.addEventListener('drop',e=>{if(!state.busy)openFile(e.dataTransfer.files[0]);});dz.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('file-input').click();}});$('download-current').addEventListener('click',exportCurrent);$('download-zip').addEventListener('click',exportAll);$('cancel-export').addEventListener('click',()=>{state.cancel=true;$('progress-label').textContent='중단 처리 중…';});$('clear-cards').addEventListener('click',()=>{if(state.busy)return;state.cards=[];state.checked.clear();state.selected=null;state.demo=false;state.lastBatch=null;$('card-search').value='';saveState();refresh();notify('목록을 비웠습니다.');});
    $('card-search').addEventListener('input',()=>listCards());
    $('select-all').addEventListener('click',()=>{if(state.busy)return;for(const card of visibleCards())state.checked.add(card.id);saveState();listCards();});
    $('select-none').addEventListener('click',()=>{if(state.busy)return;state.checked.clear();saveState();listCards();});
    $('delete-selected').addEventListener('click',()=>{if(!state.checked.size)return;removeCards([...state.checked]);});
    $('apply-preset').addEventListener('click',applyPreset);
    $('apply-batch').addEventListener('click',applyBatch);
    $('undo-batch').addEventListener('click',undoBatch);
    $('card-style').addEventListener('change',()=>{const card=getCard();if(!card||state.busy)return;card.overrideStyle=STYLES.includes($('card-style').value)?$('card-style').value:null;saveState();refresh();});
    $('card-subject').addEventListener('change',()=>{const card=getCard();if(!card||state.busy)return;card.overrideSubject=SUBJECTS.includes($('card-subject').value)?$('card-subject').value:null;saveState();refresh();});
    $('card-tone').addEventListener('change',()=>{const card=getCard();if(!card||state.busy)return;const val=$('card-tone').value;card.overrideTone=val==='original'||TONES[val]?val:null;saveState();refresh();});
    $('reroll-card').addEventListener('click',()=>{const card=getCard();if(!card||state.busy)return;card.variant=(card.variant||0)+1;saveState();renderPreview();notify(card.name+'의 이미지 변형을 변경했습니다.','success');});
    refresh();}
  wire();
  // Exposed only for deterministic automated tests, not part of app's public API.
  Object.defineProperty(window,'__YGO_TEST__',{configurable:true,value:{parseList,normalizeCard,makeZip,drawArtwork,importCards,Asset,inferSubject,crc32,selectedCards,resolveTheme,resolveTone,resolveSubject,applyToChecked,undoBatch,PRESETS,getCards:()=>state.cards.slice(),getChecked:()=>[...state.checked]}});
})();