/* YGO ART LAB — 화풍 연구실 V1.0. 기존 임시 이미지 생성기와 독립적으로 동작. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const PRESETS = [
    {id:'01',name:'고전 OCG',ink:'굵기 변화가 큰 먹색 윤곽선과 날카로운 형태',color:'보라·청록·금색의 강한 상보 대비',shade:'선명한 셀 음영과 회화적인 중간톤',texture:'금속·비늘·고대 석재를 물감처럼 표현',scene:'소용돌이치는 추상 에너지와 고대 유적',theme:'relic'},
    {id:'02',name:'원작 만화',ink:'붓펜과 펜촉의 굵고 거친 흑백 선, 해칭과 먹칠',color:'흑백 중심, 필요할 때만 제한적인 강조색',shade:'과감한 검정 면과 높은 흑백 대비',texture:'스크린톤·종이 질감·잉크 번짐',scene:'극적인 만화 컷 같은 화면 집중과 과장된 원근',theme:'shadow'},
    {id:'03',name:'히어로 애니',ink:'깨끗하고 힘 있는 히어로 만화 윤곽선',color:'명확한 원색 블록과 금속성 강조색',shade:'2~3단계의 단단한 셀 채색',texture:'매끈한 장갑, 구분되는 근육과 천',scene:'낮은 카메라, 역동적인 액션, 정확한 관절과 동작선',theme:'ember'},
    {id:'04',name:'신화적 판타지',ink:'웅장한 규모를 강조하는 정교한 선화',color:'금빛·석재색·짙은 청색의 고대 신성 팔레트',shade:'묵직한 입체 명암과 절제된 역광',texture:'금박·돌·고대 의식 문양의 세밀한 묘사',scene:'거대한 신전·운해·성역, 상징적인 수직 구도',theme:'divine'},
    {id:'05',name:'다크 판타지',ink:'날카롭고 세밀한 고딕 판타지 선화',color:'잿빛·군청·암적색의 절제된 팔레트',shade:'무거운 암부와 차가운 측면광',texture:'마모된 금속, 낡은 천, 부서진 석재',scene:'황폐한 전장과 음산한 폐허, 비장한 서사',theme:'shadow'},
    {id:'06',name:'고딕 호러',ink:'우아하면서도 불길한 비대칭 장식선',color:'검정·와인색·자주색과 은빛 포인트',shade:'달빛과 촛불의 대비, 깊은 실내 그림자',texture:'벨벳·레이스·스테인드글라스·각인된 은장식',scene:'높은 첨탑과 어두운 성당, 아름다움과 긴장감',theme:'shadow'},
    {id:'07',name:'기괴한 생체',ink:'유기적으로 불규칙한 윤곽과 기능적인 해부학 선',color:'어두운 녹색·골색·암자색의 생물 팔레트',shade:'습한 표면의 좁은 하이라이트와 깊은 굴곡',texture:'뼈·키틴질·막·인체와 다른 생체 기관',scene:'비대칭 실루엣과 이질적인 서식지, 소량의 생물발광',theme:'venom'},
    {id:'08',name:'장식적 판타지',ink:'꽃잎과 자수까지 구분되는 가늘고 정교한 선',color:'진주색·연녹·분홍과 차분한 금색',shade:'부드럽고 투명한 반사광, 섬세한 층별 명암',texture:'꽃잎·비단·유리·잎맥·자수',scene:'식물원·꽃무리와 질서 있는 장식, 단아한 구도',theme:'bloom'},
    {id:'09',name:'미소녀 판타지',ink:'얼굴과 머리카락이 정교한 현대 애니 선화',color:'캐릭터 팔레트가 선명한 균형 잡힌 색채',shade:'피부·머리·천·금속의 서로 다른 명암 단계',texture:'의상 재봉선·액세서리·마법 매질',scene:'성인 캐릭터의 자연스러운 신체 구조와 인물 중심 구도',theme:'divine'},
    {id:'10',name:'고딕 미소녀',ink:'표정과 의상 디테일을 동시에 살리는 가는 선',color:'검정·보라·장밋빛·은빛',shade:'실내의 따뜻한 작은 광원과 차가운 주변광',texture:'프릴·레이스·리본·광택 보석·가죽',scene:'저택과 달빛 정원, 우아하고 자신감 있는 포즈',theme:'shadow'},
    {id:'11',name:'동화 판타지',ink:'둥글고 간결한 형태와 부드러운 색연필 윤곽',color:'저채도 파스텔·연노랑·연두·하늘색',shade:'낮은 명암 대비와 은은한 자연광',texture:'수채화 종이·색연필·보송보송한 털',scene:'작은 숲과 꽃밭, 따뜻한 여백, 친근한 분위기',theme:'bloom'},
    {id:'12',name:'디저트·팝아트',ink:'장난감처럼 읽히는 선명한 곡선',color:'사탕 같은 선명한 원색과 크림색',shade:'가벼운 광택과 또렷한 셀 컬러',texture:'크림·유약·설탕 결정·리본·소품',scene:'동화식 제과 공간과 위트 있는 움직임',theme:'bloom'},
    {id:'13',name:'일러스트북',ink:'불규칙한 수채 붓선과 자연스러운 연필 자국',color:'종이에 스며든 듯한 부드러운 색면',shade:'부드러운 그림자와 절제된 반사광',texture:'한지·종이 섬유·수채화 얼룩',scene:'여백이 살아 있는 서정적 풍경과 회화적 구도',theme:'bloom'},
    {id:'14',name:'그래픽 스트리트',ink:'두껍고 대담한 스트리트 만화 윤곽선',color:'자홍·시안·검정·형광 포인트',shade:'뚜렷한 평면 색면과 하프톤 명암',texture:'스프레이·콜라주·포스터·도시 의류',scene:'기울어진 액션 구도와 도시의 그래피티',theme:'storm'},
    {id:'15',name:'네오 재패니즈',ink:'전통 붓선과 현대 그래픽 라인의 융합',color:'주홍·청록·자홍의 고대비 조합',shade:'대담한 셀 음영과 평면적 장식',texture:'와가라 패턴·가면·비단·목판화 질감',scene:'네온 축제와 전통 무대, 리드미컬한 형상',theme:'ember'},
    {id:'16',name:'격투 액션',ink:'격투 게임 일러스트 같은 날카롭고 빠른 라인',color:'중심 캐릭터를 돋보이게 하는 강한 액센트 컬러',shade:'근육·장갑·옷 주름의 단단한 명암',texture:'격투복·보호구·충격 파편·바닥 마찰',scene:'카메라 가까이 들어오는 공격 자세, 정확한 타격 동선',theme:'ember'},
    {id:'17',name:'하이테크 메카',ink:'기계 구조를 따라가는 정밀한 하드서피스 선',color:'냉회색·청색과 절제된 에너지 발광',shade:'금속 반사와 부품별 차별화된 명암',texture:'장갑판·볼트·회전축·서보 관절·마모 자국',scene:'격납고와 산업 조명, 하중을 견디는 연결 구조',theme:'machine'},
    {id:'18',name:'전술 SF',ink:'실용적인 장비 외곽과 정확한 투시 선',color:'해군청·카키·냉회색·신호색 포인트',shade:'차가운 산업 광원과 현실적인 음영',texture:'복합 장갑·방탄 섬유·군용 패널·장비 결속구',scene:'작전실·격납고·도심 전투, 기능 중심 디자인',theme:'machine'},
    {id:'19',name:'사이버펑크',ink:'날카롭고 깨끗한 전자 만화 선',color:'짙은 남색·검정과 시안·자홍 네온',shade:'반사광과 얇은 림라이트, 발광은 부분적으로만',texture:'유리·회로·홀로그램·디지털 노이즈',scene:'깊은 네온 도시와 디지털 인터페이스의 추상 패턴',theme:'machine'},
    {id:'20',name:'우주·초현실',ink:'생물의 유연한 곡면과 별무늬의 섬세한 선',color:'심해 남색·보라·청록과 먼 별빛',shade:'반투명 층과 서서히 사라지는 색채',texture:'성운 먼지·물결·반투명 지느러미·진주광',scene:'우주와 심해가 연결되는 낯선 공간, 느린 부유감',theme:'cosmos'},
    {id:'21',name:'동양 역사 판타지',ink:'먹선의 강약과 동양 갑주의 정확한 구조',color:'먹빛·황토·짙은 적색과 오래된 금빛',shade:'안개 원근과 붓질을 살린 명암',texture:'비단·갑주 편린·기와·바위·깃발',scene:'산수·고성·전장, 중후한 역사적 분위기',theme:'relic'},
    {id:'22',name:'세계관 서사',ink:'전경과 후경의 역할이 분명한 서사적 선화',color:'사건의 감정을 지휘하는 일관된 색온도',shade:'시간대에 맞는 영화적 자연광과 깊이',texture:'세계관을 설명하는 장비·환경·소품',scene:'인물 간 시선과 행동이 연결되는 순간, 환경이 이야기를 전달',theme:'relic'},
    {id:'23',name:'애니메이션 셀풍',ink:'균일하고 선명한 일본 TV 애니메이션 선',color:'일관된 캐릭터 컬러와 높은 가독성',shade:'2~3단계 셀 음영과 절제된 하이라이트',texture:'의도적으로 단순화한 의복과 표면',scene:'활기찬 애니메이션 키 프레임, 명료한 행동선',theme:'storm'},
    {id:'24',name:'러시 듀얼',ink:'강하고 활기찬 만화형 원근선',color:'선명한 다색 팔레트와 대담한 대비',shade:'화려하지만 형태를 가리지 않는 반짝임',texture:'만화적 장비·광선·선명한 소재 대비',scene:'과장된 액션과 독특한 몬스터 실루엣, 높은 에너지',theme:'storm'}
  ];
  const TYPES = {
    monster:'몬스터: 생물 종에 맞는 골격, 뿔·날개·꼬리 수, 발의 접지, 기능적 기관을 검증한다.',
    human:'인간형: 동일한 얼굴·헤어·의상을 보존하고 자연스러운 성인 인체 비율과 손·팔·다리 연결을 검증한다.',
    mecha:'기계형: 작동 가능한 관절, 무게를 지지하는 연결부, 장갑판과 내부 프레임의 일관성을 검증한다.',
    scene:'서사 장면: 인물 간 행동과 시선이 이어지고 배경에 사건의 이유가 드러나도록 구성한다.',
    magic:'마법·함정: 장면 또는 사건을 중심으로 연출하며 필요하지 않은 몬스터 전신을 억지로 추가하지 않는다.'
  };
  const STORAGE = 'ygo-art-lab-prompts-v1';
  const keys = ['prompt-primary','prompt-secondary','prompt-kind','prompt-layout','prompt-light','prompt-subject','prompt-background','prompt-lock','prompt-extra'];
  const primary = $('prompt-primary');
  if (!primary) return;
  const secondary = $('prompt-secondary');
  for (const p of PRESETS) {
    const option = document.createElement('option');
    option.value=p.id; option.textContent=p.id+' · '+p.name; primary.append(option);
    const second=option.cloneNode(true); secondary.append(second);
  }
  const saved = (()=>{try{return JSON.parse(localStorage.getItem(STORAGE)||'{}')}catch(_){return{}}})();
  for (const id of keys) if(typeof saved[id]==='string' && $(id)) $(id).value=saved[id];
  if (!primary.value) primary.value='05';
  if (!secondary.value) secondary.value='none';
  let currentCard=null;
  let userEditedSubject=Boolean($('prompt-subject').value.trim());
  const getPreset=id=>PRESETS.find(p=>p.id===id)||PRESETS[0];
  const clean=s=>String(s||'').trim();
  function selectedCardName(){return currentCard ? currentCard.name+' ('+currentCard.id+')' : '미선택';}
  function syncCard(card,force) {
    if (!card||!card.id) {currentCard=null;$('prompt-current-card').textContent='카드 없음';return;}
    currentCard=card;
    $('prompt-current-card').textContent=selectedCardName();
    if(force||!userEditedSubject){
      $('prompt-subject').value=card.name+' — 카드 ID '+card.id+'. 원본 설정과 핵심 디자인을 유지하는 독창적인 캐릭터/장면.';
      userEditedSubject=false;
    }
    update();
  }
  function buildPrompt(){
    const main=getPreset(primary.value), sub=secondary.value!=='none'&&secondary.value!==primary.value?getPreset(secondary.value):null;
    const aspect=$('prompt-layout').value;
    const framing={
      square:'1:1 정사각형 카드 원화. 작은 카드 썸네일에서도 핵심 실루엣이 읽히게 중앙 초점을 설계한다.',
      portrait:'3:4 세로 원화. 머리와 주요 장비를 자르지 않고 위아래 공간을 균형 있게 배치한다.',
      overframe:'오버프레임용 확장 원화. 외곽까지 완성된 공간과 캐릭터 장비를 배치하고 돌출 요소는 추후 카드 프레임 편집으로 합성한다. 프레임과 텍스트는 직접 그리지 않는다.'
    }[aspect]||'1:1 정사각형 카드 원화.';
    const lights={
      auto:'주화풍의 자연스러운 광원을 유지하고 배경과 피사체를 얇은 명도 대비로 분리한다.',
      dramatic:'강한 역광과 명확한 그림자를 사용하되 화면 전체를 빛으로 덮지 않는다.',
      soft:'확산광·부드러운 명암을 사용하고 과도한 반짝임을 배제한다.',
      dark:'암부를 깊게 유지하면서 얼굴 또는 핵심 구조에만 국소 조명을 준다.'
    };
    const blocks=[
      '목표: 독창적인 고품질 2D 판타지 트레이딩 카드 일러스트. OCG 카드 아트의 다양한 시각적 표현을 연구한 새로운 원화. 기존 카드의 특정 캐릭터나 구도를 그대로 복제하지 않는다.',
      '대상:\n'+(clean($('prompt-subject').value)||selectedCardName()),
      currentCard?'관리용 카드 정보: '+selectedCardName()+' (카드명이나 ID를 그림 안에 쓰지 말 것)':'',
      '주화풍 ['+main.id+' '+main.name+']:\n선화: '+main.ink+'\n색채: '+main.color+'\n명암과 광원: '+main.shade+'\n재료 표현: '+main.texture+'\n구도와 환경: '+main.scene,
      sub?'보조화풍 ['+sub.id+' '+sub.name+'] — 25% 이내 분위기 혼합:\n'+sub.ink+', '+sub.color+', '+sub.texture+'. 주화풍의 선화·명암이 우선이다.':'',
      '피사체 구조:\n'+(TYPES[$('prompt-kind').value]||TYPES.monster),
      '구도:\n'+framing,
      '조명:\n'+(lights[$('prompt-light').value]||lights.auto),
      clean($('prompt-background').value)?'배경 및 연출 조건:\n'+clean($('prompt-background').value):'배경 및 연출 조건:\n'+main.scene,
      clean($('prompt-lock').value)?'반드시 보존할 디자인:\n'+clean($('prompt-lock').value):'반드시 보존할 디자인:\n캐릭터의 핵심 식별 요소, 주요 색상, 신체와 장비의 수량 및 연결 구조를 일관되게 유지한다.',
      clean($('prompt-extra').value)?'추가 지시:\n'+clean($('prompt-extra').value):'',
      '품질 검사: 유기적인 해부학·기계 구조를 정확히 유지하고, 머리·손·다리·날개·무기를 중복 생성하지 않는다. 화면 초점과 여백을 조절한다. 무의미한 장식, 과도한 광채, 네온 그물무늬, 뭉개진 얼굴과 관절, 카드 프레임, 효과 텍스트, 로고, 워터마크, 무작위 한글/영문 텍스트는 포함하지 않는다.',
      '출력: 원화만. 2D 일러스트. 깨끗한 시각적 계층, 독자적인 디자인, 읽기 쉬운 실루엣.'
    ];
    return blocks.filter(Boolean).join('\n\n');
  }
  function update(){
    const main=getPreset(primary.value);
    $('prompt-style-summary').textContent=main.name+' — '+main.ink+' / '+main.color+' / '+main.shade;
    $('prompt-output').value=buildPrompt();
    try{
      const data={};for(const id of keys)data[id]=$(id).value;
      localStorage.setItem(STORAGE,JSON.stringify(data));
    }catch(_){}
  }
  function filename(s){return (clean(s)||'카드원화').replace(/[\\/:*?"<>|]+/g,'_').slice(0,55);}
  function download(text,name,type){
    const blob=new Blob([text],{type:type||'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function status(message){$('prompt-message').textContent=message;}
  for(const id of keys){
    $(id).addEventListener('input',()=>{
      if(id==='prompt-subject')userEditedSubject=Boolean(clean($('prompt-subject').value));
      update();
    });
    $(id).addEventListener('change',update);
  }
  $('prompt-use-card').addEventListener('click',()=>{
    const card=window.YGOArtLabBridge && window.YGOArtLabBridge.getCurrentCard();
    if(!card){status('먼저 카드 목록에서 카드를 선택해 주세요.');return;}
    syncCard(card,true);status('선택 카드의 정보를 가져왔습니다.');
  });
  $('prompt-copy').addEventListener('click',async()=>{
    const content=buildPrompt();
    try{await navigator.clipboard.writeText(content);status('프롬프트를 복사했습니다.');}
    catch(_){$('prompt-output').focus();$('prompt-output').select();status('자동 복사가 제한되었습니다. 선택된 텍스트를 Ctrl+C로 복사하세요.');}
  });
  $('prompt-download').addEventListener('click',()=>{
    download(buildPrompt(),filename(currentCard?.name||'유희왕_화풍프롬프트')+'_프롬프트.txt');
    status('TXT 프롬프트를 저장했습니다.');
  });
  $('prompt-export').addEventListener('click',()=>{
    const settings={version:1};for(const id of keys)settings[id]=$(id).value;
    download(JSON.stringify(settings,null,2),'유희왕_화풍프롬프트_설정.json','application/json;charset=utf-8');
    status('설정 JSON을 저장했습니다.');
  });
  $('prompt-import').addEventListener('change',async e=>{
    const file=e.target.files?.[0]; e.target.value='';
    if(!file)return;
    if(file.size>50000){status('설정 파일은 50KB 이하여야 합니다.');return;}
    try{
      const data=JSON.parse(await file.text());
      if(data.version!==1)throw Error('지원하지 않는 설정 파일입니다.');
      for(const id of keys)if(typeof data[id]==='string' && data[id].length<=6000){
        const el=$(id);
        if(el.tagName==='SELECT'&&!Array.from(el.options).some(o=>o.value===data[id]))continue;
        el.value=data[id];
      }
      userEditedSubject=Boolean(clean($('prompt-subject').value));update();status('설정을 가져왔습니다.');
    }catch(e){status('설정 가져오기 실패: '+e.message);}
  });
  $('prompt-apply-preview').addEventListener('click',()=>{
    const bridge=window.YGOArtLabBridge;
    if(!bridge||!bridge.applyPreviewSettings){status('미리보기 연동을 사용할 수 없습니다.');return;}
    const p=getPreset(primary.value);
    const subject={monster:'dragon',human:'warrior',mecha:'mech',scene:'none',magic:'none'}[$('prompt-kind').value]||'auto';
    if(bridge.applyPreviewSettings({theme:p.theme,subject})){
      status('현재 카드의 SVG/Canvas 임시 이미지에 '+p.name+'의 근사 배경·모티브를 적용했습니다. AI 원화 생성은 수행하지 않습니다.');
      document.querySelector('.art-stage')?.scrollIntoView({behavior:'smooth',block:'center'});
    }else status('먼저 카드 목록에서 카드를 선택해 주세요.');
  });
  window.addEventListener('ygo:card-change',e=>syncCard(e.detail,false));
  syncCard(window.YGOArtLabBridge?.getCurrentCard(),false);
  update();
  // 프롬프트 자체와 등록 프리셋만 외부 자동화 테스트용으로 공개.
  window.YGOPromptLab={presets:PRESETS.map(x=>({id:x.id,name:x.name,theme:x.theme})),buildPrompt};
})();