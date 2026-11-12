/* YGO ART LAB V1.4 — Game-icons SVG motif compositing.
 * Art: Game-icons.net (Lorc, Delapouite), CC BY 3.0.
 * License and attribution: assets/오픈에셋_출처와_라이선스.md
 */
(() => {
  'use strict';
  const ASSETS = Object.freeze({
    warrior: ['armor-vest','crossed-swords','broadsword'],
    dragon: ['dragon-head','dragon-breath','dragon-spiral'],
    mech: ['robot-golem','android-mask','circuitry'],
    wings: ['angel-wings','winged-emblem','feathered-wing'],
    spirit: ['ghost','ghost-ally','skull-mask'],
    crystal: ['crystal-ball','crystal-cluster','crystal-growth'],
    beast: ['wolf-head','lion','fox-head'],
    blade: ['blade-drag','saber-slash','sword-wound'],
    eye: ['eye-shield','eyeball','all-seeing-eye'],
    tentacle: ['angler-fish','tentacle-strike','octopus']
  });
  const loaded = new Map(), waiting = new Map();
  function hash(input){let h=2166136261;for(const c of String(input)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
  function pick(card,subject,seed=0){
    const files=ASSETS[subject];if(!files?.length)return null;
    const salt=`${card.id}|${card.name}|${card.variant||0}|${seed}|${subject}`;
    return `assets/motifs/${subject}/${files[hash(salt)%files.length]}.svg`;
  }
  function get(path){return path?loaded.get(path)||null:null;}
  function prepare(path){
    if(!path)return Promise.resolve(null);
    if(loaded.has(path))return Promise.resolve(loaded.get(path));
    if(waiting.has(path))return waiting.get(path);
    const promise=new Promise(resolve=>{
      const img=new Image();
      img.onload=()=>{loaded.set(path,img);resolve(img);};
      img.onerror=()=>{loaded.set(path,null);resolve(null);};
      img.src=path;
    });
    waiting.set(path,promise);promise.finally(()=>waiting.delete(path));
    return promise;
  }
  function paint(ctx,img,p,card,seed=0){
    if(!img)return false;
    const temp=document.createElement('canvas');temp.width=temp.height=512;
    const c=temp.getContext('2d');if(!c)return false;
    c.clearRect(0,0,512,512);c.drawImage(img,0,0,512,512);
    c.globalCompositeOperation='source-in';
    const g=c.createLinearGradient(80,0,460,512);
    g.addColorStop(0,p.shine);g.addColorStop(.35,p.edge);g.addColorStop(.75,p.mid);g.addColorStop(1,p.shine);
    c.fillStyle=g;c.fillRect(0,0,512,512);
    c.globalCompositeOperation='source-over';
    const idHash=hash(`${card.id}|${card.variant||0}|${seed}`);
    const shiftX=((idHash%1000)/1000-.5)*80;
    const angle=(((idHash>>>10)%1000)/1000-.5)*.22;
    const scale=.94+((idHash>>>20)%240)/1000;
    const length=635*scale;
    ctx.save();ctx.translate(512+shiftX,520);ctx.rotate(angle);
    ctx.fillStyle='rgba(2,5,13,.35)';ctx.beginPath();ctx.ellipse(0,0,265,300,0,0,Math.PI*2);ctx.fill();
    ctx.shadowColor=p.edge;ctx.shadowBlur=68;ctx.globalAlpha=.8;
    ctx.drawImage(temp,-length/2,-length/2,length,length);
    ctx.shadowBlur=19;ctx.shadowColor=p.shine;ctx.globalAlpha=1;
    ctx.drawImage(temp,-length/2,-length/2,length,length);
    ctx.shadowBlur=0;ctx.restore();return true;
  }
  window.YGOAssetEngine=Object.freeze({ASSETS,pick,get,prepare,paint});
})();
