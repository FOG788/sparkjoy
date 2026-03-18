async function saveWithPicker(text, fname){
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: fname,
      types: [{ description: 'Text', accept: { 'text/plain': ['.txt'] } }]
    });
    const w = await handle.createWritable();
    await w.write(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    await w.close();
    toast('保存しました（ダウンロードではなく指定場所に保存）');
    return true;
  } catch (e) {
    if (e && (e.name === 'AbortError' || e.code === 20)) {
      toast('保存をキャンセルしました');
      return false;
    }
    return false;
  }
}


// ---- a[download] で即時ダウンロード（同期タスク内で実行）----
function forceDownload(text, filename) {
  const blob = new Blob([text], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();              // ← ここが同期で走ることが重要（iOS）
  // 片付けは次のタスクで
  setTimeout(() => {
    try { URL.revokeObjectURL(url); } catch(_) {}
    try { a.remove(); } catch(_) {}
  }, 0);
}


/* すでに toast があれば何もしない。無ければグローバルに定義 */
// ---- トースト（グローバル） ----
window.toast ||= function (msg) {
  try {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = String(msg);
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1400);
  } catch (_) { console.log('[toast]', msg); }
};

function makeFilename(){
  return `sparkjoy_${new Date().toISOString().replace(/[:.]/g,'-')}.txt`;
}
window.makeFilename = makeFilename; // 念のため外にも公開


(()=>{'use strict';

  const $ = (id)=>document.getElementById(id);
  const editor=$('editor'), editorWrap=$('editorWrap'), saveBtn=$('saveBtn'), clearBtn=$('clearBtn'), copyBtn=$('copyBtn');
  const fontEl=$('fontSize'), fsVal=$('fsVal');
  const measureEl=$('editorMeasure'), measureVal=$('measureVal');
  const intensityEl=$('intensity'), ival=$('ival'), toggleFx=$('toggleFx'), toggleSound=$('toggleSound');
  const soundVolEl=$('soundVol'), sval=$('sval'), realismEl=$('realism'), rval=$('rval'), reverbEl=$('reverb'), revval=$('revval');
  const jamEl=$('jam'), jamval=$('jamval');
  const charCountEl=$('charCount'), wordCountEl=$('wordCount'), elapsedEl=$('elapsed'), cpmEl=$('cpm'), cpmAvgEl=$('cpmAvg'), modeSel=$('mode');
  const idlePctEl=$('idlePct'), idleChip=$('idleChip'), bestTimeEl=$('bestTime'), resetSessionBtn=$('resetSessionBtn'), resetHighscoreBtn=$('resetHighscoreBtn');
  const editorVersionEl=$('editorVersion');
  const aura=$('aura'), canvas=$('fx'), ctx=canvas.getContext('2d');
  const tabs=document.querySelectorAll('#tabs .tab'), autoResetSel=$('autoReset');
  const hourglassSel=$('hourglassDuration'), hourglassWidget=$('hourglassWidget'), hourglassCanvas=$('hourglassCanvas');

  const hourglassOpacityEl=$('hourglassOpacity'), hourglassOpacityVal=$('hourglassOpacityVal');
  const warnEl=$('warnTh'), badEl=$('badTh'), warmupEl=$('warmupSec'), warnVal=$('warnVal'), badVal=$('badVal'), warmVal=$('warmVal');
  

  // Canvas DPR
  function resizeCanvas(){ const DPR=window.devicePixelRatio||1; canvas.width=innerWidth*DPR|0; canvas.height=innerHeight*DPR|0; canvas.style.width=innerWidth+'px'; canvas.style.height=innerHeight+'px'; ctx.setTransform(DPR,0,0,DPR,0,0); }
  addEventListener('resize', resizeCanvas); resizeCanvas();

  // Tabs
  tabs.forEach(btn=>btn.addEventListener('click',()=>{tabs.forEach(b=>b.classList.remove('active'));btn.classList.add('active');const tab=btn.dataset.tab;document.body.classList.toggle('tab-settings',tab==='settings');document.body.classList.toggle('tab-guide',tab==='guide');document.body.classList.toggle('tab-editor',tab==='editor');}));


  function detectEditorVersion(){
    try {
      const versionMeta=document.querySelector('meta[name="sparkjoy-version"]');
      const metaVersion=versionMeta?.getAttribute('content')?.trim();
      if(metaVersion) return metaVersion;

      const manifestLink=document.querySelector('link[rel="manifest"]');
      if(manifestLink){
        const url=new URL(manifestLink.getAttribute('href'), location.href);
        const v=url.searchParams.get('v');
        if(v) return v;
      }

      const titleVersion=document.title.match(/\((r\d+[^)]*)\)$/i)?.[1]?.trim();
      if(titleVersion) return titleVersion;
    } catch(_){ }
    return 'unknown';
  }
  if(editorVersionEl){
    editorVersionEl.textContent=detectEditorVersion();
  }

  // Persistence helpers
  const LS={high:'sj_highscore_sec',auto:'sj_auto_reset_sec',warn:'sj_warn_cpm',bad:'sj_bad_cpm',warm:'sj_warmup_sec',fs:'sj_font_px',measure:'sj_editor_measure',hourglass:'sj_hourglass_sec',hourglassOpacity:'sj_hourglass_opacity'};
  const CK={
    auto:'sj_auto_reset_sec',warn:'sj_warn_cpm',bad:'sj_bad_cpm',warm:'sj_warmup_sec',fs:'sj_font_px',measure:'sj_editor_measure',hourglass:'sj_hourglass_sec',hourglassOpacity:'sj_hourglass_opacity',
    mode:'sj_mode',intensity:'sj_intensity',fx:'sj_fx',sound:'sj_sound',soundVol:'sj_sound_vol',
    realism:'sj_realism',reverb:'sj_reverb',jam:'sj_jam'
  };
  const Persistence={
    setCookie(name,value,days=400){
      try{
        const d=new Date(Date.now()+days*24*60*60*1000);
        document.cookie=`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}; expires=${d.toUTCString()}; path=/; SameSite=Lax`;
      }catch(_){ }
    },
    getCookie(name){
      try{
        const target=`${encodeURIComponent(name)}=`;
        const hit=String(document.cookie||'').split(';').map(c=>c.trim()).find(c=>c.startsWith(target));
        return hit ? decodeURIComponent(hit.slice(target.length)) : null;
      }catch(_){ return null; }
    },
    loadNum(key,def){
      try{
        const v=parseInt(localStorage.getItem(key)||String(def),10);
        return isNaN(v)?def:v;
      }catch(_){ return def; }
    },
    saveNum(key,value){
      try{ localStorage.setItem(key,String(value)); }catch(_){ }
    },
    loadNumWithCookie(storageKey,cookieKey,def){
      const cv=parseInt(Persistence.getCookie(cookieKey)||'',10);
      if(!isNaN(cv)) return cv;
      return Persistence.loadNum(storageKey,def);
    },
    saveNumWithCookie(storageKey,cookieKey,value){
      Persistence.saveNum(storageKey,value);
      Persistence.setCookie(cookieKey,value);
    },
    loadChoice(cookieKey,def){
      return Persistence.getCookie(cookieKey) ?? def;
    }
  };
  const loadHigh=()=>Persistence.loadNum(LS.high,0);
  const saveHigh=(s)=>Persistence.saveNum(LS.high,Math.max(0,Math.floor(s)));
  const loadAuto=()=>Persistence.loadNumWithCookie(LS.auto,CK.auto,180);
  const saveAuto=(s)=>Persistence.saveNumWithCookie(LS.auto,CK.auto,s);
  const loadWarn=()=>Persistence.loadNumWithCookie(LS.warn,CK.warn,80);
  const saveWarn=(v)=>Persistence.saveNumWithCookie(LS.warn,CK.warn,v);
  const loadBad =()=>Persistence.loadNumWithCookie(LS.bad,CK.bad,100);
  const saveBad =(v)=>Persistence.saveNumWithCookie(LS.bad,CK.bad,v);
  const loadWarm=()=>Persistence.loadNumWithCookie(LS.warm,CK.warm,10);
  const saveWarm=(v)=>Persistence.saveNumWithCookie(LS.warm,CK.warm,v);
  const loadFs  =()=>Persistence.loadNumWithCookie(LS.fs,CK.fs,16);
  const saveFs  =(v)=>Persistence.saveNumWithCookie(LS.fs,CK.fs,v);
  const loadMeasure=()=>Persistence.loadNumWithCookie(LS.measure,CK.measure,120);
  const saveMeasure=(v)=>Persistence.saveNumWithCookie(LS.measure,CK.measure,v);
  const loadHourglassSec=()=>Persistence.loadNumWithCookie(LS.hourglass,CK.hourglass,600);
  const saveHourglassSec=(v)=>Persistence.saveNumWithCookie(LS.hourglass,CK.hourglass,v);
  const loadHourglassOpacity=()=>Persistence.loadNumWithCookie(LS.hourglassOpacity,CK.hourglassOpacity,20);
  const saveHourglassOpacity=(v)=>Persistence.saveNumWithCookie(LS.hourglassOpacity,CK.hourglassOpacity,v);

  const sliderSettings=[
    {el:intensityEl,key:CK.intensity,out:ival,format:(v)=>v},
    {el:soundVolEl,key:CK.soundVol,out:sval,format:(v)=>v},
    {el:realismEl,key:CK.realism,out:rval,format:(v)=>v},
    {el:reverbEl,key:CK.reverb,out:revval,format:(v)=>v},
    {el:jamEl,key:CK.jam,out:jamval,format:(v)=>v},
    {el:measureEl,key:CK.measure,out:measureVal,format:(v)=>v+'ch',persist:saveMeasure},
    {el:warnEl,key:CK.warn,out:warnVal,format:(v)=>v,persist:saveWarn},
    {el:badEl,key:CK.bad,out:badVal,format:(v)=>v,persist:saveBad},
    {el:warmupEl,key:CK.warm,out:warmVal,format:(v)=>v+'s',persist:saveWarm},
    {el:hourglassOpacityEl,key:CK.hourglassOpacity,out:hourglassOpacityVal,format:(v)=>v+'%',persist:saveHourglassOpacity}
  ];
  const toggleSettings=[
    {el:toggleFx,key:CK.fx},
    {el:toggleSound,key:CK.sound}
  ];

  function applyFont(px){
    const v = Math.max(10, Math.min(40, +px||16));
    if (editor) editor.style.fontSize = v + 'px';
    if (fsVal)  fsVal.textContent    = v + 'px';
  }
  function applyEditorMeasure(ch){
    const v = Math.max(100, Math.min(200, +ch||120));
    document.documentElement.style.setProperty('--editor-measure', v + 'ch');
    if (measureVal) measureVal.textContent = v + 'ch';
  }
  function refreshUI(){
    sliderSettings.forEach(({el,out,format})=>{ out.textContent=format(el.value); });
    if(fontEl&&fsVal) fsVal.textContent=fontEl.value+'px';
  }

  function drawHourglass(ratio, flowEnabled=true, animTimeSec=0){
    if(!hourglassCanvas) return;
    const dpr=window.devicePixelRatio||1;
    const rect=hourglassCanvas.getBoundingClientRect();
    const w=Math.max(120, Math.round(rect.width||260));
    const h=Math.max(200, Math.round(rect.height||420));
    hourglassCanvas.width=Math.round(w*dpr);
    hourglassCanvas.height=Math.round(h*dpr);

    const hg=hourglassCanvas.getContext('2d');
    hg.setTransform(dpr,0,0,dpr,0,0);
    hg.clearRect(0,0,w,h);

    const cx=w/2;
    const pad=Math.min(w,h)*0.09;
    const neckW=Math.max(3, w*0.014);
    const bowlW=w*0.34;
    const lipR=Math.max(7, w*0.06);
    const topY=pad;
    const neckY=h/2;
    const bottomY=h-pad;
    const bowlH=(h-pad*2)*0.38;
    const stemH=Math.max(20, bowlH*0.28);
    const topStemY=topY+lipR+stemH;
    const bottomStemY=bottomY-lipR-stemH;

    const sideStep=2;
    const smooth=(t)=>{
      const x=Math.max(0,Math.min(1,t));
      return x*x*(3-2*x);
    };
    const halfWidthAtY=(y)=>{
      if(y<=topStemY) return bowlW;
      if(y<neckY){
        const t=(y-topStemY)/Math.max(1, neckY-topStemY);
        return bowlW-(bowlW-neckW)*smooth(t);
      }
      if(y<bottomStemY){
        const t=(y-neckY)/Math.max(1, bottomStemY-neckY);
        return neckW+(bowlW-neckW)*smooth(t);
      }
      return bowlW;
    };

    const glassPath=new Path2D();
    glassPath.moveTo(cx-bowlW+lipR, topY);
    glassPath.lineTo(cx+bowlW-lipR, topY);
    glassPath.quadraticCurveTo(cx+bowlW, topY, cx+bowlW, topY+lipR);
    for(let y=topY+lipR; y<=bottomY-lipR; y+=sideStep){
      glassPath.lineTo(cx+halfWidthAtY(y), y);
    }
    glassPath.quadraticCurveTo(cx+bowlW, bottomY, cx+bowlW-lipR, bottomY);
    glassPath.lineTo(cx-bowlW+lipR, bottomY);
    glassPath.quadraticCurveTo(cx-bowlW, bottomY, cx-bowlW, bottomY-lipR);
    for(let y=bottomY-lipR; y>=topY+lipR; y-=sideStep){
      glassPath.lineTo(cx-halfWidthAtY(y), y);
    }
    glassPath.quadraticCurveTo(cx-bowlW, topY, cx-bowlW+lipR, topY);
    glassPath.closePath();
    const glassGrad=hg.createLinearGradient(0,topY,0,bottomY);
    glassGrad.addColorStop(0,'rgba(255,255,255,.14)');
    glassGrad.addColorStop(0.5,'rgba(255,255,255,.06)');
    glassGrad.addColorStop(1,'rgba(0,0,0,.2)');
    hg.fillStyle=glassGrad;
    hg.fill(glassPath);

    hg.save();
    hg.clip(glassPath);

    const sandGrad=hg.createLinearGradient(0, topY, 0, bottomY);
    sandGrad.addColorStop(0,'#f8d06b');
    sandGrad.addColorStop(.55,'#ebb24f');
    sandGrad.addColorStop(1,'#d98d2f');
    hg.fillStyle=sandGrad;

    const topChamberTopY=topY+lipR;
    const bottomChamberBottomY=bottomY-1;

    const sandProgress=Math.max(0, Math.min(1, ratio));

    // 2D 断面の「砂量」を数値積分して、上部減少量と下部増加量を一致させる。
    const integrateWidth=(y0,y1,step=1)=>{
      const a=Math.min(y0,y1), b=Math.max(y0,y1);
      if(b-a<=0) return 0;
      let area=0;
      for(let y=a; y<b; y+=step){
        const yNext=Math.min(b,y+step);
        area += ((halfWidthAtY(y)+halfWidthAtY(yNext))*0.5*2) * (yNext-y);
      }
      return area;
    };
    const solveFillTopY=(targetArea)=>{
      if(targetArea<=0) return neckY;
      const fullArea=integrateWidth(topChamberTopY, neckY);
      if(targetArea>=fullArea) return topChamberTopY;
      let lo=topChamberTopY, hi=neckY;
      for(let i=0;i<24;i++){
        const mid=(lo+hi)/2;
        const area=integrateWidth(mid, neckY);
        if(area>targetArea) lo=mid; else hi=mid;
      }
      return (lo+hi)/2;
    };
    const solveFillBottomY=(targetArea)=>{
      const fullArea=integrateWidth(neckY, bottomChamberBottomY);
      if(targetArea<=0) return bottomChamberBottomY;
      if(targetArea>=fullArea) return neckY;
      let lo=neckY, hi=bottomChamberBottomY;
      for(let i=0;i<24;i++){
        const mid=(lo+hi)/2;
        const area=integrateWidth(mid, bottomChamberBottomY);
        if(area>targetArea) lo=mid; else hi=mid;
      }
      return (lo+hi)/2;
    };

    const topCapacity=integrateWidth(topChamberTopY, neckY);
    const bottomCapacity=integrateWidth(neckY, bottomChamberBottomY);
    const transferable=Math.min(topCapacity, bottomCapacity);
    const totalSandArea=transferable*0.7;
    const movedArea=totalSandArea*sandProgress;
    const topArea=Math.max(0, totalSandArea-movedArea);
    const bottomArea=Math.max(0, movedArea);

    if(topArea>0.5){
      const topFillY=solveFillTopY(topArea);
      hg.beginPath();
      hg.moveTo(cx-halfWidthAtY(topFillY), topFillY);
      hg.lineTo(cx+halfWidthAtY(topFillY), topFillY);
      for(let y=topFillY; y<=neckY-1; y+=sideStep){
        hg.lineTo(cx+halfWidthAtY(y), y);
      }
      hg.lineTo(cx-halfWidthAtY(neckY-1), neckY-1);
      for(let y=neckY-1; y>=topFillY; y-=sideStep){
        hg.lineTo(cx-halfWidthAtY(y), y);
      }
      hg.closePath();
      hg.fill();
    }

    if(bottomArea>0.5){
      const bottomFillY=solveFillBottomY(bottomArea);
      const bottomSandBaseY=bottomChamberBottomY;
      hg.beginPath();
      hg.moveTo(cx+halfWidthAtY(bottomSandBaseY), bottomSandBaseY);
      for(let y=bottomSandBaseY; y>=bottomFillY; y-=sideStep){
        hg.lineTo(cx+halfWidthAtY(y), y);
      }
      hg.lineTo(cx-halfWidthAtY(bottomFillY), bottomFillY);
      for(let y=bottomFillY; y<=bottomSandBaseY; y+=sideStep){
        hg.lineTo(cx-halfWidthAtY(y), y);
      }
      hg.closePath();
      hg.fill();
    }

    if(flowEnabled && ratio>0 && ratio<1){
      const streamW=Math.max(1.8, w*0.0048);
      const streamH=bowlH*0.7;
      const streamTop=neckY-1;
      const streamTime=animTimeSec;
      const seed=ratio*173.0 + streamTime*6.0;

      const grains=13;
      for(let i=0;i<grains;i++){
        const rand=Math.sin((i+1)*12.9898+seed*0.7)*43758.5453;
        const frac=rand-Math.floor(rand);
        const t=((streamTime*(0.9+frac*1.3)) + frac)%1;
        const y=streamTop+streamH*t;
        const phase=seed+i*2.37;
        const wobble=(Math.sin(streamTime*4.4 + i*1.7)*0.5+0.5);
        const sway=(Math.sin(phase)*streamW*4.2 + Math.sin(phase*0.43+streamTime*3.2)*streamW*2.2) + (frac-0.5)*streamW*5.2*wobble;
        const r=Math.max(1.1, streamW*(0.74+0.4*Math.sin(seed+i*2.1)));
        hg.beginPath();
        hg.fillStyle=`rgba(248,208,107,${0.4+0.45*(1-t)})`;
        hg.arc(cx+sway, y, r, 0, Math.PI*2);
        hg.fill();
      }

    }
    hg.restore();

    hg.lineWidth=Math.max(3, w*0.02);
    hg.strokeStyle='rgba(224,235,247,.82)';
    hg.stroke(glassPath);

    hg.beginPath();
    hg.moveTo(cx-neckW*0.95, neckY);
    hg.lineTo(cx+neckW*0.95, neckY);
    hg.strokeStyle='rgba(224,235,247,.52)';
    hg.stroke();

  }


  function updateHourglass(elapsedSec=0, nowMs=performance.now()){
    if(!hourglassWidget || !hourglassSel) return;
    const opacityRatio=Math.max(0.05, Math.min(0.6, (parseInt(hourglassOpacityEl?.value||'20',10)||20)/100));
    const limitSec=Math.max(0, parseInt(hourglassSel.value,10) || 0);
    hourglassWidget.style.opacity=String(opacityRatio);
    if(limitSec<=0){
      drawHourglass(1, false, nowMs/1000);
      return;
    }
    const ratio=Math.max(0, Math.min(1, elapsedSec/limitSec));
    drawHourglass(ratio, true, nowMs/1000);
  }

  function restoreSettings(){
    sliderSettings.forEach(({el,key,persist})=>{
      if(persist){
        return;
      }
      el.value=Persistence.loadChoice(key,el.value);
    });
    warnEl.value=String(loadWarn());
    badEl.value=String(loadBad());
    warmupEl.value=String(loadWarm());
    if(fontEl) fontEl.value=String(loadFs());
    if(measureEl) measureEl.value=String(loadMeasure());
    if(modeSel) modeSel.value=Persistence.loadChoice(CK.mode, modeSel.value || 'write');
    if(hourglassSel) hourglassSel.value=String(loadHourglassSec());
    if(hourglassOpacityEl) hourglassOpacityEl.value=String(loadHourglassOpacity());
    toggleSettings.forEach(({el,key})=>{
      el.checked=Persistence.loadChoice(key,el.checked ? '1' : '0')==='1';
    });
    applyFont(loadFs());
    applyEditorMeasure(loadMeasure());
  }
  function bindSettingControls(){
    sliderSettings.forEach(({el,key,persist})=>{
      el.addEventListener('input',()=>{
        if(persist) persist(el.value);
        if(el===measureEl) applyEditorMeasure(el.value);
        refreshUI();
      });
      if(!persist){
        el.addEventListener('change',()=>Persistence.setCookie(key,el.value));
      }
    });
    toggleSettings.forEach(({el,key})=>{
      el.addEventListener('change',()=>Persistence.setCookie(key,el.checked?'1':'0'));
    });
    if(hourglassSel){
      hourglassSel.addEventListener('change', ()=>{
        saveHourglassSec(parseInt(hourglassSel.value,10)||0);
        updateHourglass(getEffectiveElapsedSec());
      });
    }
    if(hourglassOpacityEl){
      hourglassOpacityEl.addEventListener('input', ()=>{
        saveHourglassOpacity(parseInt(hourglassOpacityEl.value,10)||20);
        refreshUI();
        updateHourglass(getEffectiveElapsedSec());
      });
    }
    if(fontEl){
      fontEl.addEventListener('input', ()=>{
        applyFont(fontEl.value);
        saveFs(+fontEl.value||16);
        if (typeof scheduleTW==='function') scheduleTW();
      });
    }
  }
  restoreSettings();
  bindSettingControls();
  refreshUI();

  // Stats
  let typingStart=null, statsTimer=null, baseChars=0, lastCountLen=0, elapsedCarrySec=0;
  const ROLL_MS=60000; let cDeltaBuf=[];
  let lastInputAt=0; const ACTIVE_MS=2000, IDLE_WINDOW=60;
  let activityBuf=new Array(IDLE_WINDOW).fill(false), activityIdx=0;
  const MODE={write:{warn:80,bad:100},revise:{min:30,max:70}};
  function setChipClass(el,cls){if(!el)return;el.classList.remove('good','warn','bad'); if(cls) el.classList.add(cls);}
  function setAura(level){ if(!aura) return; aura.classList.remove('warn','bad'); if(level==='warn') aura.classList.add('warn'); else if(level==='bad') aura.classList.add('bad'); }
  function bumpShake(level){ try{ document.body.classList.remove('shake-warn','shake-bad'); void document.body.offsetWidth; document.body.classList.add(level==='bad'?'shake-bad':'shake-warn'); }catch(_){} }
  function getThresholds(){ let warn=parseInt(warnEl.value,10)||80, bad=parseInt(badEl.value,10)||100; if(warn>=bad){bad=warn+1; badEl.value=String(bad);} warnVal.textContent=warn; badVal.textContent=bad; return{warn,bad}; }

  function updateModeFeedback(cpm){
    const wrap=cpmEl&&cpmEl.parentElement; if(!wrap) return; setChipClass(wrap,null);
    const warm=parseInt(warmupEl.value,10)||0;
    if(typingStart){ const since=(performance.now()-typingStart)/1000; if(since<warm){ setAura(null); window.__lastSpeedLevel='none'; return; } }
    const mode=modeSel?modeSel.value:'write'; let level='none';
    if(mode==='revise'){ const th=MODE.revise; if(cpm>th.max) level='bad'; else if(cpm<th.min) level='warn'; else level='good'; }
    else { const th=getThresholds(); if(cpm>=th.bad) level='bad'; else if(cpm>=th.warn) level='warn'; }
    if(level==='good') setChipClass(wrap,'good'); else if(level==='warn') setChipClass(wrap,'warn'); else if(level==='bad') setChipClass(wrap,'bad');
    setAura(level==='warn'?'warn':(level==='bad'?'bad':null));
    const now=performance.now(), justTyped=(now-lastInputAt)<220;
    if((level==='bad'||level==='warn') && justTyped){
      const cooldown=(level==='bad')?1500:2500;
      if(level!==window.__lastSpeedLevel || !window.__lastShakeAt || (now-window.__lastShakeAt)>cooldown){ bumpShake(level); window.__lastShakeAt=now; }
    }
    window.__lastSpeedLevel=level;
  }
  const formatTime=(sec)=>{const s=(sec%60|0).toString().padStart(2,'0'), m=((sec/60|0)%60).toString().padStart(2,'0'), h=(sec/3600|0); return (h>0?h+':':'')+m+':'+s; };

  let highSec=loadHigh(); const showHigh=()=>{if(bestTimeEl) bestTimeEl.textContent=formatTime(highSec)}; showHigh();
  function updateHigh(elapsedSec, opts={}){
    const announce=opts.announce!==false;
    const elapsedWholeSec=Math.max(0, elapsedSec|0);
    if(elapsedWholeSec>highSec){ highSec=elapsedWholeSec; saveHigh(highSec); showHigh(); if(announce) toast('ハイスコア更新: '+formatTime(highSec)); }
  }
  function reduceHigh(sec){
    const next=Math.max(0, (highSec|0)-Math.max(0,sec|0));
    if(next!==highSec){ highSec=next; saveHigh(highSec); showHigh(); }
  }

  function getEffectiveElapsedSec(now=performance.now()){
    if(!typingStart) return elapsedCarrySec;
    return elapsedCarrySec + Math.max(0,(now-typingStart)/1000);
  }

  let hourglassAnimRaf=0;
  function startHourglassAnimation(){
    if(hourglassAnimRaf) return;
    const tick=(now)=>{
      updateHourglass(getEffectiveElapsedSec(now), now);
      hourglassAnimRaf=requestAnimationFrame(tick);
    };
    hourglassAnimRaf=requestAnimationFrame(tick);
  }
  function stopHourglassAnimation(){
    if(!hourglassAnimRaf) return;
    cancelAnimationFrame(hourglassAnimRaf);
    hourglassAnimRaf=0;
  }

  let autoResetSec=loadAuto(); autoResetSel.value=String(autoResetSec);
  autoResetSel.addEventListener('change',()=>{autoResetSec=parseInt(autoResetSel.value,10)||0; saveAuto(autoResetSec);});

  function endSession(reason){
    const now=performance.now();
    let idlePenaltySec=0;
    if(typingStart){
      const elapsedNow=Math.max(0,(now-typingStart)/1000);
      if(reason==='idle' && autoResetSec>0){
        // 無操作猶予ぶんだけ差し引いた実質経過時間を保持する
        elapsedCarrySec += Math.max(0, elapsedNow-autoResetSec);
        idlePenaltySec=autoResetSec;
      } else {
        elapsedCarrySec = 0;
      }
      if(reason!=='idle'){
        updateHigh(getEffectiveElapsedSec(now));
      }
    } else if(reason!=='idle'){
      elapsedCarrySec = 0;
    }
    if(reason==='idle' && idlePenaltySec>0){
      reduceHigh(idlePenaltySec);
    }
    typingStart=null;
    if(reason!=='idle') baseChars=0;
    cDeltaBuf.length=0; activityBuf.fill(false);
    lastCountLen=sanitizeText(editor.innerText||'').length; updateStats();
    window.__lastSpeedLevel='none'; window.__lastShakeAt=0; setAura(null);
    if(reason==='idle'&&autoResetSec>0) toast('無操作でセッションをリセット');
  }

  function updateStats(){
    const text=sanitizeText(editor.innerText||''); const totalLen=text.length; if(charCountEl) charCountEl.textContent=String(totalLen);
    const sessionLen=Math.max(0,totalLen-baseChars);
    const totalWords=text.trim()?text.trim().split(/\s+/).length:0; if(wordCountEl) wordCountEl.textContent=String(totalWords);
    const now=performance.now(); if(typingStart && autoResetSec>0 && (now-lastInputAt)>autoResetSec*1000){ endSession('idle'); }
    if(!typingStart){
      const avgCpm=Math.round(sessionLen*60/Math.max(1, elapsedCarrySec));
      elapsedEl&&(elapsedEl.textContent=formatTime(elapsedCarrySec));
      cpmEl&&(cpmEl.textContent='0');
      cpmAvgEl&&(cpmAvgEl.textContent=String(avgCpm));
      idlePctEl&&(idlePctEl.textContent='0%');
      setChipClass(idleChip,null); setChipClass(cpmEl&&cpmEl.parentElement,null);
      updateHourglass(elapsedCarrySec);
      return;
    }
    const elapsed=getEffectiveElapsedSec(now); elapsedEl&&(elapsedEl.textContent=formatTime(elapsed));
    updateHourglass(elapsed);
    updateHigh(elapsed,{announce:false});
    const cutoff=now-ROLL_MS; while(cDeltaBuf.length && cDeltaBuf[0].t<cutoff){ cDeltaBuf.shift(); }
    let sum=0; for(const s of cDeltaBuf){ sum+=s.c; }
    const spanSec=Math.max(1, Math.min(ROLL_MS/1000, elapsed)); const cpm=Math.round(sum*60/spanSec);
    const avgCpm=Math.round(sessionLen*60/Math.max(1, elapsed));
    cpmEl&&(cpmEl.textContent=String(cpm));
    cpmAvgEl&&(cpmAvgEl.textContent=String(avgCpm));
    const activeNow=(now-lastInputAt)<ACTIVE_MS; activityBuf[activityIdx]=activeNow; activityIdx=(activityIdx+1)%IDLE_WINDOW;
    let act=0; for(const b of activityBuf){ if(b) act++; } const idlePct=Math.round((1-act/activityBuf.length)*100);
    idlePctEl&&(idlePctEl.textContent=idlePct+'%');
    if(modeSel&&modeSel.value==='revise'){ if(idlePct<20) setChipClass(idleChip,'bad'); else if(idlePct<40) setChipClass(idleChip,'warn'); else setChipClass(idleChip,'good'); } else setChipClass(idleChip,null);
    updateModeFeedback(cpm);
  }
  function startStatsIfNeeded(){
    if(!typingStart){ typingStart=performance.now(); try{ lastCountLen=baseChars=sanitizeText(editor.innerText||'').length; }catch(_){ lastCountLen=baseChars=0; }
      if(statsTimer) clearInterval(statsTimer); statsTimer=setInterval(updateStats,1000);
    }
  }
  updateStats();
  updateHourglass(getEffectiveElapsedSec());
  addEventListener('resize', ()=>updateHourglass(getEffectiveElapsedSec()));
  if(hourglassWidget){
    startHourglassAnimation();
    document.addEventListener('visibilitychange', ()=>{
      if(document.hidden) stopHourglassAnimation();
      else startHourglassAnimation();
    });
  }

  // Crack effect
  const cracks=[], flashes=[], holes=[];
  function spawnCrack(x,y){
    if(!toggleFx.checked) return;
    const I=Math.max(0,Math.min(100,+intensityEl.value||0));
    const rays=Math.max(3, Math.round(5+I*0.12+(window.__lastSpeedLevel==='bad'?6:0)));
    const lenBase=40+I*2.4, widthBase=1+I*0.035+(window.__lastSpeedLevel==='bad'?0.6:0);
    const life=70+Math.round(I*1.4), branchProb=0.18+I*0.003+(window.__lastSpeedLevel==='bad'?0.02:0);
    const segs=[];
    for(let r=0;r<rays;r++){
      const baseAng=Math.random()*Math.PI*2, steps=6+Math.floor(Math.random()*5);
      let px=x, py=y;
      for(let i=0;i<steps;i++){
        const ang=baseAng+(Math.random()-0.5)*0.35, stepLen=(lenBase/steps)*(0.9+Math.random()*0.2);
        const nx=px+Math.cos(ang)*stepLen, ny=py+Math.sin(ang)*stepLen, w=Math.max(0.7, widthBase-i*0.35);
        segs.push({x1:px,y1:py,x2:nx,y2:ny,w,age:0,life:life*(0.85+Math.random()*0.3)});
        if(Math.random()<branchProb && i>1){
          const bang=ang+(Math.random()<0.5?1:-1)*(0.6+Math.random()*0.5), bl=stepLen*(0.5+Math.random()*0.9);
          segs.push({x1:nx,y1:ny,x2:nx+Math.cos(bang)*bl,y2:ny+Math.sin(bang)*bl,w:Math.max(0.6,w*0.75),age:0,life:life*0.8});
        }
        px=nx; py=ny;
      }
    }
    cracks.push({segments:segs});
  }
  function spawnSingleImpactAround(cx, cy, opts = {}) {
  if (!toggleFx.checked) return;

  const I = Math.max(0, Math.min(100, +intensityEl.value || 0));
  const level = window.__lastSpeedLevel || 'none';

  // 半径は強度とスピードで少しだけ変化
  const rBase  = opts.radius ?? (24 + I * 1.1 + (level === 'bad' ? 10 : 0));
  const jitter = opts.jitter ?? (rBase * 0.4);

  const ang = Math.random() * Math.PI * 2;
  const r   = Math.max(6, rBase + (Math.random() * 2 - 1) * jitter);

  const x = cx + Math.cos(ang) * r;
  const y = cy + Math.sin(ang) * r;

  // 既存のひび割れ 1つだけ
  spawnCrack(x, y);

  // 小さめフラッシュ（眩しいなら消してOK）
  flashes.push({
    x, y,
    age: 0,
    life: (level === 'bad' ? 18 : 14),
    size: 80 * Math.max(0.5, (+intensityEl.value) / 100)
  });

  // クレーター機能を入れている場合だけ追加（無ければ無視される）
  if (typeof addHole === 'function') addHole(x, y);
}

  function addHole(x, y) {
    holes.push({
      x, y,
      r: 5 + Math.random() * 9,         // クレーター半径
      age: 0,
      life: 60 + (Math.random() * 40|0) // だいたい1～1.6秒くらいで薄れる（60fps想定）
      });
  }
      
  function drawCracks(){
    ctx.clearRect(0,0,innerWidth,innerHeight);
    for(let c=cracks.length-1;c>=0;c--){
      const crack=cracks[c]; let allDead=true;
      for(const s of crack.segments){
        s.age=(s.age||0)+1; if(s.age<s.life) allDead=false;
        const t=Math.min(1,s.age/s.life), alpha=1-t;
        ctx.globalAlpha=alpha; ctx.lineWidth=Math.max(0.5, s.w*(1-t*0.6)); ctx.strokeStyle='#c9d6df';
        ctx.beginPath(); ctx.moveTo(s.x1,s.y1); ctx.lineTo(s.x2,s.y2); ctx.stroke();
        ctx.globalAlpha=alpha*0.35; ctx.lineWidth=Math.max(0.4,(s.w-0.6)); ctx.strokeStyle='#111821'; ctx.stroke();
        ctx.globalAlpha=1;
      }
      if(allDead) cracks.splice(c,1);
    }
    for (let i = holes.length - 1; i >= 0; i--) {
      const h = holes[i];
      h.age = (h.age || 0) + 1;
      const t = Math.min(1, h.age / h.life);
      const alpha = (1 - t) * 0.75;       // だんだん薄く
      const r = h.r * (0.9 + 0.25 * t);   // ほんの少し広がる
      
      const grd = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, r);
      grd.addColorStop(0.0, `rgba(0,0,0,${0.70 * alpha})`);
      grd.addColorStop(0.5, `rgba(20,20,20,${0.45 * alpha})`);
      grd.addColorStop(1.0, `rgba(0,0,0,0)`);
      
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(h.x, h.y, r, 0, Math.PI * 2); ctx.fill();
      
      if (h.age >= h.life) holes.splice(i, 1);
    }
    for(let i=flashes.length-1;i>=0;i--){
      const f=flashes[i]; f.age=(f.age||0)+1; const t=f.age/f.life, alpha=(1-t)*(1-t), r=f.size*(0.7+0.6*t);
      const grd=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,r);
      grd.addColorStop(0,`rgba(255,140,80,${0.25*alpha})`); grd.addColorStop(0.35,`rgba(255,60,60,${0.22*alpha})`); grd.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=grd; ctx.globalCompositeOperation='lighter'; ctx.beginPath(); ctx.arc(f.x,f.y,r,0,Math.PI*2); ctx.fill(); ctx.globalCompositeOperation='source-over';
      if(f.age>=f.life) flashes.splice(i,1);
    }
    requestAnimationFrame(drawCracks);
  }
  requestAnimationFrame(drawCracks);

  // Audio
  // ======== Audio Samples (MP3) =========
// GitHub Pages のプロジェクトサイトなので相対パスでOK（./sounds/～）
let gunshotSampleUrls = [
  './sounds/9mm-pistol-shoot-short-reverb-7152.mp3',
  './sounds/9mm-pistol-shot-6349.mp3',
  './sounds/gunshot-352466.mp3',
  './sounds/pistol-shot-233473.mp3'
];

let gunshotBuffers = [];   // AudioBuffer[]
let gunshotReady = false;

async function loadGunshotSamples() {
  if (!audioCtx) return;         // AudioContextがまだなら後で再挑戦
  if (gunshotReady) return;      // 既にロード済みならスキップ
  try {
    const decodes = await Promise.all(
      gunshotSampleUrls.map(async (url) => {
        const res = await fetch(url, { cache: 'force-cache' });
        const arr = await res.arrayBuffer();
        return await audioCtx.decodeAudioData(arr);
      })
    );
    gunshotBuffers = decodes.filter(Boolean);
    gunshotReady = gunshotBuffers.length > 0;
    console.log('[gunshots] loaded', gunshotBuffers.length);
  } catch (e) {
    console.warn('[gunshots] load failed', e);
    gunshotReady = false;
  }
}
  let audioCtx=null, noiseBuf=null, irs=null;
  function buildAudioAssets(){
    const a=audioCtx; if(!a) return; const sr=a.sampleRate;
    noiseBuf=a.createBuffer(1, Math.floor(sr*1), sr);
    const ch=noiseBuf.getChannelData(0); for(let i=0;i<ch.length;i++){ ch[i]=Math.random()*2-1; }
    function makeIR(seconds,decay){
      const len=Math.max(1,Math.floor(sr*seconds)), buf=a.createBuffer(2,len,sr);
      for(let c=0;c<2;c++){ const d=buf.getChannelData(c); let lp=0;
        for(let i=0;i<len;i++){ const t=i/sr, amp=Math.exp(-t*decay); lp=0.98*lp+0.02*(Math.random()*2-1); d[i]=((Math.random()*2-1)*0.7+lp*0.3)*amp; } }
      return buf;
    }
    irs={room:makeIR(0.35,8), hall:makeIR(1.10,3.3), plate:makeIR(0.70,6)};
    // ★ 実サンプルをプリロード
    loadGunshotSamples();
  }
  function ensureAudio(){ if(!audioCtx){ const AC=window.AudioContext||window.webkitAudioContext; audioCtx=new AC(); buildAudioAssets(); } }
  function resumeAudio(){ try{ if(audioCtx && audioCtx.state==='suspended') audioCtx.resume(); }catch(_){} }
  window.__gunVariants=[
    {name:'pistol_close', crackHz:2600, crackQ:0.9, crackDur:0.06, thumpHz:90, thumpDur:0.22, pingHz:0,    tail:'room',  tailMix:0.25},
    {name:'pistol_room',  crackHz:1900, crackQ:0.8, crackDur:0.08, thumpHz:85, thumpDur:0.28, pingHz:1400, tail:'hall',  tailMix:0.38},
    {name:'revolver_snap',crackHz:3200, crackQ:1.2, crackDur:0.05, thumpHz:110,thumpDur:0.20, pingHz:2200, tail:'plate', tailMix:0.28},
    {name:'distant_crack',crackHz:2400, crackQ:0.7, crackDur:0.07, thumpHz:70, thumpDur:0.18, pingHz:0,    tail:'hall',  tailMix:0.45, postLP:3500}
  ];
  let __sparkjoyKeyTimes=[]; const WPM_WINDOW_MS=2000;
  function markKeystroke(){ const now=performance.now(); __sparkjoyKeyTimes.push(now); const cutoff=now-WPM_WINDOW_MS; while(__sparkjoyKeyTimes.length && __sparkjoyKeyTimes[0]<cutoff){__sparkjoyKeyTimes.shift();} }
  function getWPM(){ const now=performance.now(), cutoff=now-WPM_WINDOW_MS; let count=0; for(let i=__sparkjoyKeyTimes.length-1;i>=0;i--){ if(__sparkjoyKeyTimes[i]>=cutoff) count++; else break; } const cps=count/(WPM_WINDOW_MS/1000); return (cps/5)*60 || 0; }
  function mapWPM(wpm){ const low=20, high=100, t=Math.max(0,Math.min(1,(wpm-low)/(high-low))); return {t, durMul:1-0.4*t, wetMul:1-0.5*t, pingMul:1-0.6*t}; }
  window.__sparkjoyWPM=getWPM; window.__mapWPM=mapWPM;

  let lastCaret={x:innerWidth/2,y:innerHeight/2};
  function caretClientPoint(){
    const sel=getSelection(); if(!sel || sel.rangeCount===0) return lastCaret;
    const range=sel.getRangeAt(0).cloneRange(); range.collapse(true);
    let rect=range.getClientRects()[0]||range.getBoundingClientRect();
    if(!rect || !(rect.width||rect.height)){
      const span=document.createElement('span'); span.style.display='inline-block'; span.style.width='0'; span.style.height='1em'; span.textContent='\u200b';
      range.insertNode(span); rect=span.getBoundingClientRect(); const r=document.createRange(); r.setStartAfter(span); r.collapse(true); const s2=getSelection(); s2.removeAllRanges(); s2.addRange(r); span.remove();
    }
    const x=rect.left+rect.width/2, y=rect.top+rect.height/2; lastCaret={x,y}; return lastCaret;
  }
      // === タイプライターモード（中央付近キープ） =========================
      const TYPEWRITER = {
        enabled: true,    // 必要なら設定タブからON/OFFしてもOK
        center: 0.46,     // 少し上寄りに維持（下がって見える体感を補正）
        dead: 60          // 許容帯（px）。外れたときだけスクロール
          };
      
      let twRaf = 0;
  function keepCaretCentered(){
    if (!TYPEWRITER.enabled) return;

    const p = caretClientPoint(); // キャレット位置（viewport座標）

    // レイアウト変更後は editorWrap がスクロール主体。
    // ここを優先して中央キープし、無い場合のみ window スクロールへフォールバック。
    if (editorWrap) {
      const wrapRect = editorWrap.getBoundingClientRect();
      const target = wrapRect.top + wrapRect.height * TYPEWRITER.center;
      const bandMin = target - TYPEWRITER.dead;
      const bandMax = target + TYPEWRITER.dead;

      let dy = 0;
      if (p.y < bandMin) dy = p.y - bandMin;
      else if (p.y > bandMax) dy = p.y - bandMax;

      if (dy !== 0) {
        const maxTop = Math.max(0, editorWrap.scrollHeight - editorWrap.clientHeight);
        const newTop = Math.max(0, Math.min(maxTop, editorWrap.scrollTop + dy));
        editorWrap.scrollTop = newTop;
      }
      return;
    }

    // フォールバック（旧レイアウト）
    const vv = window.visualViewport;
    const vTop = vv ? vv.offsetTop : 0;
    const vH   = vv ? vv.height   : window.innerHeight;
    const target = vTop + vH * TYPEWRITER.center;
    const bandMin = target - TYPEWRITER.dead;
    const bandMax = target + TYPEWRITER.dead;

    let dy = 0;
    if (p.y < bandMin) dy = p.y - bandMin;
    else if (p.y > bandMax) dy = p.y - bandMax;

    if (dy !== 0) {
      const sc = document.scrollingElement || document.documentElement;
      const newTop = Math.max(0, Math.min(sc.scrollHeight - vH, window.scrollY + dy));
      window.scrollTo({ top: newTop, behavior: 'auto' });
    }
  }
      // スケジューラ（連打でも1フレームにまとめる）
  function scheduleTW(){
    if (!TYPEWRITER.enabled) return;
    cancelAnimationFrame(twRaf);
    twRaf = requestAnimationFrame(()=>{
      keepCaretCentered();
      // 入力直後のブラウザ自動スクロールを上書きするため、次フレームでも再補正
      requestAnimationFrame(keepCaretCentered);
    });
  }
  function playGunshot(){
    if(!toggleSound.checked) return; ensureAudio(); resumeAudio();
    const a=audioCtx, now=a.currentTime, UIvol=(+soundVolEl.value/100);
    const R=Math.max(0,Math.min(1,(+realismEl.value||0)/100)), RV=Math.max(0,Math.min(1,(+reverbEl.value||0)/100));
      // === ここから追加：実サンプルを優先再生 ===
  if (gunshotReady && gunshotBuffers.length) {
    const buf = gunshotBuffers[(Math.random()*gunshotBuffers.length)|0];
    const src = a.createBufferSource(); src.buffer = buf;
    src.playbackRate.setValueAtTime(0.96 + Math.random()*0.08, now); // 微ピッチ
    const pan = a.createStereoPanner ? a.createStereoPanner() : null;
    if (pan) {
      const p=(lastCaret.x/innerWidth-0.5)*1.6;
      pan.pan.setValueAtTime(Math.max(-1,Math.min(1,p)), now);
    }
    const conv = a.createConvolver(); conv.buffer = irs ? irs.hall : null;
    const dry = a.createGain(); const wet = a.createGain();
    const wetMix = Math.min(1, (0.15 + 0.85*RV) * (0.3 + 0.7*R));
    dry.gain.setValueAtTime(1, now); wet.gain.setValueAtTime(wetMix, now);

    const comp=a.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-28+(-8*R),now);
    comp.knee.setValueAtTime(18+8*R,now);
    comp.ratio.setValueAtTime(2.5+3*R,now);
    comp.attack.setValueAtTime(0.003-0.001*R,now);
    comp.release.setValueAtTime(0.18-0.05*R,now);

    const out=a.createGain(); out.gain.setValueAtTime(UIvol, now);

    if (pan){ src.connect(pan); pan.connect(dry); pan.connect(conv); }
    else { src.connect(dry); src.connect(conv); }
    conv.connect(wet);
    dry.connect(comp); wet.connect(comp); comp.connect(out).connect(a.destination);

    src.start(now);
    return; // ここで終了。以下の合成ロジックはフォールバック
  }
  // === ここまで追加 ===
    const v=window.__gunVariants[Math.floor(Math.random()*window.__gunVariants.length)];
    const m=mapWPM(getWPM());
    const crackDur=Math.max(0.03,Math.min(0.2, v.crackDur*(1.4-0.7*R))) * m.durMul;
    const crackQ=v.crackQ*(0.7+0.9*R);
    const thDur=v.thumpDur*(0.8+0.4*R) * m.durMul;
    const thAmp=0.8+0.4*R;
    const pingAmp=(v.pingHz?0.30*(1-0.85*R):0) * m.pingMul;
    const wetMix=(v.tailMix||0.3)*(0.25+0.75*R)*(0.2+1.8*RV) * m.wetMul;
    
    const panNode=a.createStereoPanner? a.createStereoPanner():null;
    if(panNode){ const pan=(lastCaret.x/innerWidth-0.5)*1.6; panNode.pan.setValueAtTime(Math.max(-1,Math.min(1,pan)), now); }

    const comp=a.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-20-8*R,now); comp.knee.setValueAtTime(18+8*R,now); comp.ratio.setValueAtTime(2.5+3*R,now); comp.attack.setValueAtTime(0.003-0.001*R,now); comp.release.setValueAtTime(0.18-0.05*R,now);
    const out=a.createGain(); out.gain.setValueAtTime(UIvol,now);

    const crackSrc=a.createBufferSource(); crackSrc.buffer=noiseBuf; crackSrc.playbackRate.setValueAtTime(1+(Math.random()*0.2-0.1),now);
    const crackBP=a.createBiquadFilter(); crackBP.type='bandpass'; crackBP.frequency.setValueAtTime(v.crackHz,now); crackBP.Q.setValueAtTime(crackQ,now);
    const crackGain=a.createGain(); crackGain.gain.setValueAtTime(0.0001,now); crackGain.gain.exponentialRampToValueAtTime(1.0+0.2*R,now+0.002); crackGain.gain.exponentialRampToValueAtTime(0.0001,now+crackDur);
    crackSrc.connect(crackBP).connect(crackGain);

    const thOsc=a.createOscillator(); thOsc.type='triangle'; thOsc.frequency.setValueAtTime(v.thumpHz,now);
    const thGain=a.createGain(); thGain.gain.setValueAtTime(thAmp,now); thGain.gain.exponentialRampToValueAtTime(0.0001,now+thDur); thOsc.connect(thGain);

    let pingOsc=null,pingGain=null; if(v.pingHz && pingAmp>0){ pingOsc=a.createOscillator(); pingOsc.type='square'; pingOsc.frequency.setValueAtTime(v.pingHz*(0.95+Math.random()*0.1),now); pingGain=a.createGain(); pingGain.gain.setValueAtTime(pingAmp,now); pingGain.gain.exponentialRampToValueAtTime(0.0001,now+0.12); pingOsc.connect(pingGain); }

    const dry=a.createGain(), wet=a.createGain(); dry.gain.setValueAtTime(1,now); wet.gain.setValueAtTime(Math.min(1.0,wetMix*UIvol),now);
    const conv=a.createConvolver(); conv.buffer=irs? irs[v.tail]:null;
    const sum=a.createGain(); crackGain.connect(sum); thGain.connect(sum); if(pingGain) pingGain.connect(sum);
    let post=null; if(v.postLP){ post=a.createBiquadFilter(); post.type='lowpass'; post.frequency.setValueAtTime(v.postLP,now); }
    sum.connect(dry); sum.connect(conv); conv.connect(wet);
    const head=a.createGain(); head.gain.setValueAtTime(1,now);
    dry.connect(comp); wet.connect(comp); comp.connect(head);
    const last=post? (head.connect(post), post):head;
    if(panNode){ last.connect(panNode).connect(out).connect(a.destination); } else { last.connect(out).connect(a.destination); }
    crackSrc.start(now); crackSrc.stop(now+crackDur+0.02);
    thOsc.start(now);   thOsc.stop(now+thDur+0.05);
    if(pingOsc){ pingOsc.start(now); pingOsc.stop(now+0.15); }
  }
  ['pointerdown','keydown'].forEach(ev=>addEventListener(ev,()=>{ensureAudio();resumeAudio();},{once:true}));

  // IME（composition）: 変換中はカウントしないがFX/SFXは出す（60msスロットル）
  let isComposing=false, compBaseLen=0, lastCompFxAt=0;
  editor.addEventListener('compositionstart',()=>{ isComposing=true; compBaseLen=sanitizeText(editor.innerText||'').length; });
  editor.addEventListener('compositionend',()=>{
    const now=performance.now();
    const lenNow=sanitizeText(editor.innerText||'').length;
    const delta=Math.max(0,lenNow-compBaseLen);
    lastCountLen=lenNow; 
    isComposing=false;
    
    if(delta>0){
      cDeltaBuf.push({t:now,c:delta});
      const cutoff=now-ROLL_MS;
      while(cDeltaBuf.length&&cDeltaBuf[0].t<cutoff){cDeltaBuf.shift();}
      lastInputAt=now;
      const p = caretClientPoint();
      spawnSingleImpactAround(p.x, p.y);
      if(window.__lastSpeedLevel==='bad'){
        flashes.push({x:p.x,y:p.y,age:0,life:36,size:240*(Math.max(0.6,(+intensityEl.value)/100))});
      } else if(window.__lastSpeedLevel==='warn'){
        flashes.push({x:p.x,y:p.y,age:0,life:22,size:160*(Math.max(0.6,(+intensityEl.value)/100))});
        } 
      playGunshot();
      startStatsIfNeeded();
      updateStats();
    } else { 
      updateStats();
    }
    scheduleTW();
  });

  function crackAtCaret(){
    const jamP=Math.max(0,Math.min(1,(+jamEl.value||0)/100)); if(Math.random()<jamP) return;
    const p = caretClientPoint();
    spawnSingleImpactAround(p.x, p.y);
    playGunshot();
  }

  function onInput(ev){
    const type=ev&&ev.inputType||'', isPaste=type==='insertFromPaste'||type==='insertFromDrop', isCompType=/insertCompositionText|deleteCompositionText/.test(type)||(ev&&ev.isComposing);
    const now=performance.now(); const lenNow=sanitizeText(editor.innerText||'').length;

    if(isComposing||isCompType){
      const lenBefore=lastCountLen; lastCountLen=lenNow; lastInputAt=now;
      const isInsertish=type.startsWith('insert')||lenNow>lenBefore;
      if(isInsertish && (now-lastCompFxAt)>60){ crackAtCaret(); lastCompFxAt=now; }
      startStatsIfNeeded(); updateStats(); return;
    }

    const added=Math.max(0, lenNow-lastCountLen); lastCountLen=lenNow;
    if(!isPaste && added>0){ cDeltaBuf.push({t:now,c:added}); const cutoff=now-ROLL_MS; while(cDeltaBuf.length&&cDeltaBuf[0].t<cutoff){ cDeltaBuf.shift(); } }
    lastInputAt=now;
    if(!isPaste && added>0){ markKeystroke(); crackAtCaret(); }
    startStatsIfNeeded(); 
    updateStats();
    scheduleTW();
  }
  editor.addEventListener('input', onInput);
  modeSel && modeSel.addEventListener('change', ()=>{ Persistence.setCookie(CK.mode,modeSel.value); updateStats(); });
  editor.addEventListener('focus',()=>{
    lastCaret=caretClientPoint();
    scheduleTW();
  });
  document.addEventListener('selectionchange', ()=>{
    if (document.activeElement===editor) scheduleTW();
  });
  editor.addEventListener('keydown', scheduleTW);
      editor.addEventListener('click', scheduleTW);
      editor.addEventListener('keyup', (e)=>{
        if (e.key && /Arrow|PageUp|PageDown|Home|End/.test(e.key)) scheduleTW();
      });
  window.addEventListener('resize', scheduleTW);
  editor.setAttribute('role','textbox'); 
  editor.setAttribute('aria-multiline','true');
  editor.focus();
      // クリップボード（Clipboard API → フォールバック）
  async function copyTextToClipboard(text){
    // 1) 近代ブラウザ（https or PWA）
    try{
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function'){
        await navigator.clipboard.writeText(text);
        toast('コピーしました');
        return true;
      }
    }catch(_){}
    
    // 2) フォールバック（hidden textarea）
    try{
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly','');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok){ toast('コピーしました'); return true; }
    }catch(_){}
    
    toast('コピーできませんでした');
    return false;
  }
      
      // ボタンに紐づけ
      if (copyBtn && !copyBtn.dataset.bound){
        copyBtn.dataset.bound = '1';
        copyBtn.addEventListener('click', async () => {
          const text = sanitizeText(editor?.innerText || '');
          await copyTextToClipboard(text);
        });
      }
      
      // お好みでショートカット（Ctrl/Cmd+Shift+C で全コピー）
      addEventListener('keydown', (e)=>{
        if ((e.ctrlKey||e.metaKey) && e.shiftKey && e.code==='KeyC'){
          const text = sanitizeText(editor?.innerText || '');
          copyTextToClipboard(text);
          e.preventDefault();
        }
      });
  
  // ---- Utils / Save / Clear ----

  function sanitizeText(t){ return String(t||'').replace(/[​﻿]/g,''); }

  function showSaveFallback(text,filename){
    const overlay=document.createElement('div'); overlay.className='overlay';
    const box=document.createElement('div'); box.className='modal';
    const msg=document.createElement('div'); msg.innerHTML='保存がブロックされました。下のリンクから保存してください。'; msg.style.marginBottom='12px';
    const area=document.createElement('div'); area.className='row';
    try{ const blob=new Blob([text],{type:'text/plain;charset=utf-8'}); const url=URL.createObjectURL(blob);
      const a=document.createElement('a'); a.className='btn'; a.textContent='保存(.txt)'; a.href=url; a.download=filename; a.target='_blank'; a.rel='noopener'; area.appendChild(a);
      overlay.addEventListener('click',(e)=>{ if(e.target===overlay){ try{URL.revokeObjectURL(url);}catch(_){ } document.body.removeChild(overlay);} });
    }catch(_){}
    const d=document.createElement('a'); d.className='btn'; d.textContent='新規タブ表示'; d.href='data:text/plain;charset=utf-8,'+encodeURIComponent(text); d.target='_blank'; d.rel='noopener'; area.appendChild(d);
    const close=document.createElement('button'); close.className='btn'; close.textContent='閉じる'; close.addEventListener('click',()=>{ document.body.removeChild(overlay); });
    box.appendChild(msg); box.appendChild(area); overlay.appendChild(box); document.body.appendChild(overlay); toast('保存リンクを表示しました');
  }
// === 全消去ダイアログ ===
function askClear(){
  const overlay = document.createElement('div'); overlay.className='overlay';
  const box = document.createElement('div'); box.className='modal';
  const msg = document.createElement('div'); msg.textContent='すべて削除しますか？'; msg.style.marginBottom='12px';
  const row = document.createElement('div'); row.className='row';
  const ok=document.createElement('button'); ok.className='btn'; ok.textContent='OK';
  const cancel=document.createElement('button'); cancel.className='btn'; cancel.textContent='キャンセル';
  row.appendChild(cancel); row.appendChild(ok); box.appendChild(msg); box.appendChild(row);
  overlay.appendChild(box); document.body.appendChild(overlay);
  const cleanup=()=>{ try{document.body.removeChild(overlay);}catch(_){ } };
  ok.addEventListener('click', ()=>{ cleanup(); doClear(); });
  cancel.addEventListener('click', cleanup);
  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) cleanup(); });
}

function doClear(){
  editor.innerHTML='';
  // 画面エフェクトも消去
  if (typeof cracks!=='undefined'){ cracks.length=0; }
  try { ctx.clearRect(0,0,window.innerWidth, window.innerHeight); } catch(_){}
  // キャレットを先頭に戻す
  const sel = window.getSelection();
  if(sel){ try{ sel.removeAllRanges(); const r=document.createRange(); r.setStart(editor,0); r.collapse(true); sel.addRange(r);}catch(_){ } }
  editor.focus();
  // セッション終了（統計もリセット）
  if (typeof endSession==='function'){ endSession('clear'); }
  toast('クリアしました');
}


if (saveBtn && !saveBtn.dataset.bound) {
  saveBtn.dataset.bound = '1';
  saveBtn.addEventListener('click', async (ev) => {
    const text  = sanitizeText(editor?.innerText || '');
    const fname = makeFilename();

    // Shift+クリックなら「名前を付けて保存…」
    if (ev.shiftKey && window.showSaveFilePicker) {
      await saveWithPicker(text, fname);
      return;
    }

    // デフォルトは即ダウンロード
    try {
      forceDownload(text, fname);
      toast('ダウンロードを開始しました');
      return;
    } catch (_) {}

    // ブロック/失敗時のフォールバック
    if (window.showSaveFilePicker) {
      await saveWithPicker(text, fname);
    } else {
      showSaveFallback(text, fname);
    }
  });
}


  // クリア（既存の askClear/doClear をそのまま使用）
  if (clearBtn && !clearBtn.dataset.bound) {
    clearBtn.dataset.bound = '1';
    clearBtn.addEventListener('click', () => {
      if (typeof askClear === 'function') askClear();
      else if (typeof doClear === 'function') doClear();
    }, { passive:true });
  }

  if (resetSessionBtn && !resetSessionBtn.dataset.bound) {
    resetSessionBtn.dataset.bound = '1';
    resetSessionBtn.addEventListener('click', ()=> {
      if (typeof endSession === 'function') endSession('manual');
    }, { passive:true });
  }

  if (resetHighscoreBtn && !resetHighscoreBtn.dataset.bound) {
    resetHighscoreBtn.dataset.bound = '1';
    resetHighscoreBtn.addEventListener('click', ()=> {
      highSec = 0;
      try { localStorage.removeItem(LS.high); } catch(_) { }
      showHigh();
      toast('ハイスコアをリセットしました');
    }, { passive:true });
  }
})();
