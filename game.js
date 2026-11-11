(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const canvas = $('#world');
  const ctx = canvas.getContext('2d');
  const ui = {
    input: $('#chatInput'), feed: $('#chatFeed'), modal: $('#modalBackdrop'),
    quest: $('#questProgress'), questCount: $('#questCount'), coins: $('#coinCount'),
    toast: $('#toast')
  };
  const world = { width: 1800, height: 1200 };
  const player = { x: 900, y: 635, z: 0, vz: 0, facing: 1, emote: '', emoteUntil: 0, steps: 0 };
  const keys = new Set();
  const stick = { active: false, id: null, x: 0, y: 0 };
  let width = 0, height = 0, dpr = 1, last = 0, toastTimer;
  let collected = 0;

  const coins = [
    { x: 735, y: 480, got: false }, { x: 1055, y: 455, got: false },
    { x: 1175, y: 650, got: false }, { x: 775, y: 785, got: false },
    { x: 980, y: 850, got: false }
  ];
  const trees = [
    [155,165,1.05],[365,145,.8],[590,185,.95],[1250,155,.9],[1515,170,1.05],[1690,350,.82],
    [145,465,.9],[1650,650,1],[190,830,1],[420,1030,.9],[710,1020,.75],[1160,1040,.9],[1450,1005,1.05],[1680,920,.8]
  ];
  const benches = [[510,365,-.2],[1320,390,.15],[535,850,.15],[1340,820,-.2],[860,310,0],[1030,920,0]];
  const npcs = [
    { name:'POPPY', x:720,y:610,color:'#f27d9b',hair:'#7b4770',phase:0,dx:1 },
    { name:'MILO', x:1115,y:615,color:'#58b6d1',hair:'#483d65',phase:1.6,dx:-1 },
    { name:'SUNNY', x:915,y:420,color:'#f2ad4b',hair:'#8b5540',phase:3,dx:1 },
    { name:'JUNE', x:935,y:810,color:'#9b83e9',hair:'#423c74',phase:4.4,dx:-1 }
  ];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width; height = rect.height;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  function roundedRect(x,y,w,h,r,fill,stroke) {
    ctx.beginPath(); ctx.roundRect(x,y,w,h,r);
    if (fill) { ctx.fillStyle=fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle=stroke; ctx.stroke(); }
  }
  function ellipse(x,y,rx,ry,fill) {
    ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2); ctx.fillStyle=fill; ctx.fill();
  }
  function drawGround() {
    const sky=ctx.createLinearGradient(0,0,0,world.height);
    sky.addColorStop(0,'#a5dce0'); sky.addColorStop(1,'#72b7ae');
    ctx.fillStyle=sky; ctx.fillRect(0,0,world.width,world.height);
    // soft lawn panels
    for(let y=0;y<world.height;y+=120) for(let x=0;x<world.width;x+=150){
      ctx.fillStyle=((x/150+y/120)%2)?'rgba(255,255,255,.025)':'rgba(24,92,77,.035)';
      ctx.fillRect(x,y,150,120);
    }
    // central stone plaza and paths
    roundedRect(390,245,1020,720,82,'#d7cdb5');
    roundedRect(420,275,960,660,64,'#e7ddc8');
    roundedRect(0,540,1800,170,35,'#d7cdb5');
    roundedRect(815,0,170,1200,35,'#d7cdb5');
    roundedRect(0,565,1800,120,26,'#e8dfcc');
    roundedRect(840,0,120,1200,26,'#e8dfcc');
    // paving seams
    ctx.strokeStyle='rgba(129,113,88,.13)'; ctx.lineWidth=2;
    for(let x=435;x<1380;x+=80){ctx.beginPath();ctx.moveTo(x,285);ctx.lineTo(x,925);ctx.stroke();}
    for(let y=300;y<930;y+=72){ctx.beginPath();ctx.moveTo(430,y);ctx.lineTo(1370,y);ctx.stroke();}
    // fountain pool
    ellipse(900,600,154,124,'#73cbd0'); ellipse(900,600,138,108,'#55b6c3');
    ctx.strokeStyle='rgba(255,255,255,.52)';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(900,600,126,97,0,0,Math.PI*2);ctx.stroke();
    ellipse(900,600,48,38,'#f6ead1');
    const water=ctx.createLinearGradient(0,550,0,650);water.addColorStop(0,'#a5f0e2');water.addColorStop(1,'#48a8bf');
    ellipse(900,600,35,27,water);
    for(let i=0;i<5;i++){let a=i*Math.PI*2/5;ellipse(900+Math.cos(a)*68,600+Math.sin(a)*52,5,4,'rgba(255,255,255,.72)');}
    // little flower beds
    [[470,340],[1330,340],[470,880],[1330,880]].forEach(([x,y])=>{
      roundedRect(x-50,y-27,100,54,22,'#7ebd86');
      for(let i=0;i<6;i++){ellipse(x-34+i*14,y+Math.sin(i*2)*8,4,4,['#ffdb68','#f58cac','#fff1d2'][i%3]);}
    });
    // market kiosk awnings
    drawKiosk(620,365,'SUNNY SNACKS','#f7a256','#e57855');
    drawKiosk(1190,365,'BLOOM BAR','#e98cad','#a76cbb');
    drawKiosk(620,835,'JUICE BOX','#66c9ba','#48a7a5');
    drawKiosk(1190,835,'GIFT NOOK','#7da9ed','#797bd0');
  }
  function drawKiosk(x,y,label,c1,c2) {
    ctx.save();ctx.translate(x,y);
    roundedRect(-73,-3,146,78,10,'#fff8e9');
    roundedRect(-82,-22,164,34,8,c1);
    for(let i=0;i<5;i++){ctx.fillStyle=i%2?c2:'rgba(255,255,255,.23)';ctx.fillRect(-78+i*32,-20,16,29);}
    roundedRect(-43,23,86,40,5,'#c89b73');
    ctx.fillStyle='#fff';ctx.font='700 10px sans-serif';ctx.textAlign='center';ctx.fillText(label,0,-34);
    ctx.restore();
  }
  function drawTree(x,y,s) {
    ctx.save();ctx.translate(x,y);ctx.scale(s,s);
    ellipse(5,12,35,13,'rgba(29,73,57,.2)');
    roundedRect(-9,-25,18,40,6,'#946c4e');
    ellipse(0,-54,34,35,'#5d9c70');ellipse(-18,-45,22,24,'#72b580');ellipse(17,-48,23,25,'#4e8d69');
    ellipse(-10,-68,12,8,'rgba(255,255,255,.15)');
    ctx.restore();
  }
  function drawBench(x,y,rot) {
    ctx.save();ctx.translate(x,y);ctx.rotate(rot);
    ellipse(0,11,45,10,'rgba(40,61,57,.14)');
    roundedRect(-39,-11,78,17,5,'#a86d45');roundedRect(-39,-17,78,8,4,'#c38a59');
    ctx.fillStyle='#73503e';ctx.fillRect(-30,5,5,13);ctx.fillRect(25,5,5,13);
    ctx.restore();
  }
  function drawCoin(c,t) {
    if(c.got)return;
    const bob=Math.sin(t*3+c.x)*4, spin=.72+Math.abs(Math.sin(t*2.7+c.y))*.28;
    ctx.save();ctx.translate(c.x,c.y-20+bob);ellipse(0,19,17,6,'rgba(53,76,51,.18)');
    ctx.scale(spin,1);ellipse(0,0,12,15,'#f3a927');ellipse(0,-2,8,11,'#ffd85b');
    ctx.fillStyle='#fff3a4';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText('✦',0,2);ctx.restore();
  }
  function drawAvatar(a,t,isPlayer=false) {
    const moving=isPlayer?(Math.abs(moveX)+Math.abs(moveY)>.08):true;
    const bob=moving?Math.sin(t*11+(a.phase||0))*2:Math.sin(t*2+(a.phase||0))*1.2;
    const z=isPlayer?player.z:0;
    ctx.save();ctx.translate(a.x,a.y-z);
    ellipse(0,4+z,19,7,'rgba(36,67,66,.22)');
    ctx.translate(0,bob);
    // legs
    const stride=moving?Math.sin(t*12+(a.phase||0))*3:0;
    roundedRect(-10,-7+stride,8,16,3,'#f1f0eb');roundedRect(2,-7-stride,8,16,3,'#f1f0eb');
    roundedRect(-12,5+stride,12,6,3,'#43566f');roundedRect(1,5-stride,12,6,3,'#43566f');
    // torso, head, hair
    roundedRect(-15,-35,30,30,8,a.color);
    roundedRect(-12,-58,24,24,9,'#f4c59f');
    ellipse(0,-61,13,9,a.hair);
    ellipse(-10,-54,6,9,a.hair);ellipse(10,-54,6,9,a.hair);
    const faceDir=isPlayer?player.facing:(a.dx||1);
    ellipse(faceDir*4,-47,1.5,1.7,'#3f4655');ellipse(faceDir*9,-47,1.5,1.7,'#3f4655');
    ctx.strokeStyle='#b45e66';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(faceDir*6,-43,3,.1,Math.PI-.1);ctx.stroke();
    // name tag
    const label=isPlayer?($('.profile-name').textContent||'PLAYER'):a.name;
    ctx.font='700 10px sans-serif';const labelW=ctx.measureText(label).width+18;
    roundedRect(-labelW/2,-84,labelW,18,8,isPlayer?'#203653':'rgba(32,54,83,.86)');
    ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,0,-75);
    if(isPlayer&&player.emote&&performance.now()<player.emoteUntil){
      const symbols={wave:'👋',dance:'♪',sit:'✦'};ctx.font='22px sans-serif';ctx.fillText(symbols[player.emote]||'✦',22,-69);
      if(player.emote==='wave'){ctx.save();ctx.translate(14,-29);ctx.rotate(Math.sin(t*10)*.65);roundedRect(-2,-21,8,24,4,a.color);ctx.restore();}
    }
    ctx.restore();
  }

  let moveX=0,moveY=0;
  function draw(t) {
    ctx.clearRect(0,0,width,height);
    const scale=Math.min(width/1050,height/700,1.35);
    const camX=Math.max(width/(2*scale),Math.min(world.width-width/(2*scale),player.x));
    const camY=Math.max(height/(2*scale),Math.min(world.height-height/(2*scale),player.y));
    ctx.save();ctx.translate(width/2-camX*scale,height/2-camY*scale);ctx.scale(scale,scale);
    drawGround();trees.forEach(([x,y,s])=>drawTree(x,y,s));benches.forEach(([x,y,r])=>drawBench(x,y,r));
    coins.forEach(c=>drawCoin(c,t));
    npcs.forEach(n=>drawAvatar(n,t));drawAvatar(player,t,true);
    // sparkle accents around fountain
    for(let i=0;i<8;i++){const a=t*.3+i*Math.PI/4;ctx.fillStyle='rgba(255,255,255,.58)';ctx.beginPath();ctx.arc(900+Math.cos(a)*112,600+Math.sin(a)*84,1.6,0,Math.PI*2);ctx.fill();}
    ctx.restore();
    const shade=ctx.createLinearGradient(0,0,0,height);shade.addColorStop(0,'rgba(14,39,53,.13)');shade.addColorStop(.4,'transparent');shade.addColorStop(1,'rgba(23,54,54,.08)');ctx.fillStyle=shade;ctx.fillRect(0,0,width,height);
  }

  function safeText(value) {
    return value.replace(/https?:\/\/\S+/gi,'[link]').replace(/[<>]/g,'').trim();
  }
  function showToast(message) {
    ui.toast.textContent=message;ui.toast.classList.add('show');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),2100);
  }
  function say(name,text,system=false) {
    const line=document.createElement('div');line.className=`chat-line${system?' system':''}`;
    const who=document.createElement('b');who.textContent=name;
    const message=document.createElement('span');message.textContent=text;
    line.append(who,message);ui.feed.append(line);ui.feed.scrollTop=ui.feed.scrollHeight;
    while(ui.feed.children.length>35)ui.feed.firstElementChild.remove();
  }
  function emote(type) {
    player.emote=type;player.emoteUntil=performance.now()+2600;
    document.querySelectorAll('.hotkey[data-action]').forEach(button=>button.classList.toggle('active',button.dataset.action===type));
    const names={wave:'You waved hello!',dance:'You started dancing!',sit:'You took a little rest.'};showToast(names[type]||'Nice move!');
  }
  function jump() { if(player.z<=0){player.vz=300;showToast('Boing!');} }
  function update(dt,now) {
    let x=0,y=0;
    if(keys.has('KeyA')||keys.has('ArrowLeft'))x--;
    if(keys.has('KeyD')||keys.has('ArrowRight'))x++;
    if(keys.has('KeyW')||keys.has('ArrowUp'))y--;
    if(keys.has('KeyS')||keys.has('ArrowDown'))y++;
    x+=stick.x;y+=stick.y;
    const magnitude=Math.hypot(x,y);if(magnitude>1){x/=magnitude;y/=magnitude;}
    moveX=x;moveY=y;
    const speed=225;
    player.x=Math.max(65,Math.min(world.width-65,player.x+x*speed*dt));
    player.y=Math.max(85,Math.min(world.height-45,player.y+y*speed*dt));
    if(x)player.facing=x>0?1:-1;
    if(magnitude>.08)player.steps+=dt*8;
    player.z=Math.max(0,player.z+player.vz*dt);
    if(player.z>0||player.vz>0){player.vz-=760*dt;if(player.z<=0){player.z=0;player.vz=0;}}
    npcs.forEach(npc=>{
      npc.x+=Math.sin(now/1900+npc.phase)*dt*13;
      npc.y+=Math.cos(now/2200+npc.phase)*dt*8;
      npc.dx=Math.cos(now/1900+npc.phase)>=0?1:-1;
    });
    for(const coin of coins){
      if(!coin.got&&Math.hypot(player.x-coin.x,player.y-coin.y)<43){
        coin.got=true;collected++;ui.coins.textContent=String(collected);
        ui.questCount.textContent=`${collected} / 5`;ui.quest.style.width=`${collected*20}%`;
        say('BLOCKTOWN',collected===5?'Quest complete! You found all 5 plaza coins. +100 coins!':'You found a shiny plaza coin! ✨',true);
        showToast(collected===5?'QUEST COMPLETE  +100':'COIN COLLECTED  +1');
        if(collected===5){ui.coins.textContent='105';showToast('QUEST COMPLETE  +100 COINS');}
      }
    }
  }
  function frame(timestamp) {
    const dt=Math.min(.04,(timestamp-last)/1000||0);last=timestamp;
    update(dt,timestamp);draw(timestamp/1000);requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.addEventListener('keydown',event=>{
    const typing=document.activeElement===ui.input||document.activeElement===$('#nameInput');
    if(!typing&&['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code))event.preventDefault();
    if(typing)return;
    keys.add(event.code);if(event.repeat)return;
    if(event.code==='Space')jump();
    if(event.code==='Digit1')emote('wave');if(event.code==='Digit2')emote('dance');if(event.code==='Digit3')emote('sit');
    if(event.code==='Enter')ui.input.focus();
  });
  window.addEventListener('keyup',event=>keys.delete(event.code));
  window.addEventListener('blur',()=>keys.clear());
  document.querySelectorAll('.hotkey[data-action]').forEach(button=>button.addEventListener('click',()=>emote(button.dataset.action)));
  $('#chatForm').addEventListener('submit',event=>{
    event.preventDefault();const text=safeText(ui.input.value).slice(0,120);
    if(text){say($('.profile-name').textContent||'YOU',text);ui.input.value='';ui.input.blur();}
  });
  $('#chatToggle').addEventListener('click',()=>{
    const collapsed=$('#chatPanel').classList.toggle('collapsed');$('#chatToggle').textContent=collapsed?'+':'−';
  });
  $('#helpButton').addEventListener('click',()=>ui.modal.classList.add('open'));
  $('#modalClose').addEventListener('click',()=>ui.modal.classList.remove('open'));
  $('#playButton').addEventListener('click',()=>ui.modal.classList.remove('open'));
  ui.modal.addEventListener('click',event=>{if(event.target===ui.modal)ui.modal.classList.remove('open');});
  const editor=$('#nameEditor'),nameInput=$('#nameInput');
  $('#profileButton').addEventListener('click',()=>{
    editor.classList.toggle('open');nameInput.value=$('.profile-name').textContent;
    if(editor.classList.contains('open'))nameInput.focus();
  });
  $('#nameForm').addEventListener('submit',event=>{
    event.preventDefault();const name=safeText(nameInput.value).replace(/[^\p{L}\p{N} _-]/gu,'').slice(0,14).toUpperCase();
    if(name){$('.profile-name').textContent=name;say('BLOCKTOWN',`You're now known as ${name}!`,true);}
    editor.classList.remove('open');nameInput.blur();
  });
  $('#jumpButton').addEventListener('pointerdown',event=>{event.preventDefault();jump();});
  const stickEl=$('#joystick'),knob=$('#joyKnob');
  function joyStart(event){event.preventDefault();stickEl.setPointerCapture(event.pointerId);stick.active=true;stick.id=event.pointerId;joyMove(event);}
  function joyMove(event){
    if(!stick.active||event.pointerId!==stick.id)return;
    const rect=stickEl.getBoundingClientRect(),dx=event.clientX-rect.left-rect.width/2,dy=event.clientY-rect.top-rect.height/2;
    const limit=31,distance=Math.hypot(dx,dy),factor=distance>limit?limit/distance:1,x=dx*factor,y=dy*factor;
    knob.style.transform=`translate(${x}px,${y}px)`;stick.x=x/limit;stick.y=y/limit;
  }
  function joyEnd(event){if(event.pointerId!==stick.id)return;stick.active=false;stick.x=stick.y=0;knob.style.transform='';}
  stickEl.addEventListener('pointerdown',joyStart);stickEl.addEventListener('pointermove',joyMove);
  stickEl.addEventListener('pointerup',joyEnd);stickEl.addEventListener('pointercancel',joyEnd);

  say('BLOCKTOWN','Welcome to Sunshine Plaza! Collect coins and say hi ✨',true);
  say('POPPY','Aww, the fountain looks so pretty today 🌼');
  say('MILO','Hi! Use WASD to walk around 👋');
  if(!sessionStorage.getItem('blocktownWelcome')){
    setTimeout(()=>{ui.modal.classList.add('open');sessionStorage.setItem('blocktownWelcome','1');},450);
  }
})();

