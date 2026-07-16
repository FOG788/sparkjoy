import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function createBrowserStub(){
  let now=0;
  let intervalCallback=null;
  let documentRef=null;
  let audioPlayCount=0;
  const audioVolumes=[];

  class AudioStub{
    constructor(src){this.src=src;this.preload='';this.playsInline=false;this.currentTime=0;this.volume=1;this.playbackRate=1;}
    load(){}
    pause(){}
    play(){audioPlayCount++;audioVolumes.push(this.volume);return Promise.resolve();}
  }

  class ClassList{
    constructor(){this.values=new Set();}
    add(...names){names.forEach((name)=>this.values.add(name));}
    remove(...names){names.forEach((name)=>this.values.delete(name));}
    toggle(name,force){const enabled=force===undefined?!this.values.has(name):!!force;enabled?this.values.add(name):this.values.delete(name);return enabled;}
    contains(name){return this.values.has(name);}
  }

  const defaults={fontSize:'16',editorMeasure:'120',intensity:'15',soundVol:'100',realism:'100',reverb:'85',jam:'0',warnTh:'80',badTh:'100',warmupSec:'10',hourglassOpacity:'20',autoReset:'180',hourglassDuration:'600',mode:'write'};
  const gradient={addColorStop(){}};
  const canvasContext=new Proxy({setTransform(){},clearRect(){},createLinearGradient(){return gradient;},createRadialGradient(){return gradient;}},{get:(target,property)=>property in target?target[property]:(()=>{})});

  class ElementStub{
    constructor(id=''){
      this.id=id; this.value=defaults[id]??''; this.checked=true; this.textContent=''; this.innerText=''; this.innerHTML=''; this.hidden=false;
      this.style={setProperty(){}}; this.dataset={}; this.classList=new ClassList(); this.parentElement={classList:new ClassList()}; this.children=[]; this.listeners={};
    }
    addEventListener(type,handler){(this.listeners[type]??=[]).push(handler);}
    dispatch(type,event={}){for(const handler of this.listeners[type]??[])handler({...event,target:this});}
    setAttribute(){}
    getAttribute(name){return name==='content'?'r10':null;}
    appendChild(child){this.children.push(child);return child;}
    removeChild(child){this.children=this.children.filter((item)=>item!==child);}
    remove(){}
    focus(){if(documentRef)documentRef.activeElement=this;}
    click(){}
    getContext(){return canvasContext;}
    getBoundingClientRect(){return {width:260,height:420,left:0,top:0};}
    querySelectorAll(){return [];}
  }

  const elements=new Map();
  const getElement=(id)=>{if(!elements.has(id))elements.set(id,new ElementStub(id));return elements.get(id);};
  const storage=new Map([['sj_highscore_sec','3600']]);
  const document={
    body:getElement('body'),documentElement:{style:{setProperty(){}}},activeElement:null,hidden:false,title:'SparkJoy Editor — Crack Shot (r10)',cookie:'',
    getElementById:getElement,querySelectorAll(){return [];},querySelector(selector){return selector.includes('sparkjoy-version')?{getAttribute:()=>'r10'}:null;},
    createElement(){return new ElementStub();},createRange(){return {setStart(){},collapse(){},setStartAfter(){}};},addEventListener(){},removeEventListener(){},execCommand(){return true;}
  };
  documentRef=document;
  class Path2DStub{moveTo(){}lineTo(){}quadraticCurveTo(){}closePath(){}}

  const sandbox={
    console,document,Path2D:Path2DStub,Intl,Audio:AudioStub,performance:{now:()=>now},
    localStorage:{getItem:(key)=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:(key)=>storage.delete(key)},
    navigator:{},location:{href:'http://example.test/index.html'},innerWidth:1200,innerHeight:800,devicePixelRatio:1,
    addEventListener(){},requestAnimationFrame(){return 1;},cancelAnimationFrame(){},setInterval(callback){intervalCallback=callback;return 1;},clearInterval(){intervalCallback=null;},setTimeout(){return 1;},getSelection(){return null;},Blob,URL
  };
  sandbox.window=sandbox;

  return {
    context:vm.createContext(sandbox),
    getElement,
    getInterval:()=>intervalCallback,
    getAudioPlayCount:()=>audioPlayCount,
    getAudioVolumes:()=>audioVolumes.slice(),
    setNow:(value)=>{now=value;},
    storage
  };
}

test('入力と無操作リセットの主要状態遷移が一貫する',()=>{
  const browser=createBrowserStub();
  vm.runInContext(fs.readFileSync(new URL('../session-core.js',import.meta.url),'utf8'),browser.context,{filename:'session-core.js'});
  vm.runInContext(fs.readFileSync(new URL('../app.js',import.meta.url),'utf8'),browser.context,{filename:'app.js'});

  const editor=browser.getElement('editor');
  browser.setNow(1000);
  editor.innerText='a';
  editor.dispatch('input',{inputType:'insertText',isComposing:false});
  assert.equal(browser.getElement('charCount').textContent,'1');
  assert.equal(browser.getElement('cpmAvg').textContent,'60');
  assert.ok(browser.getAudioPlayCount()>=1&&browser.getAudioPlayCount()<=2);
  assert.equal(Math.max(...browser.getAudioVolumes()),.25);
  assert.equal(Number(browser.getElement('hourglassWidget').dataset.ratio),0);

  browser.setNow(31000);
  browser.getInterval()();
  assert.equal(Number(browser.getElement('hourglassWidget').dataset.ratio),.05);
  browser.getElement('hourglassDuration').value='60';
  browser.getElement('hourglassDuration').dispatch('change');
  assert.equal(Number(browser.getElement('hourglassWidget').dataset.ratio),.5);

  browser.setNow(201001);
  browser.getInterval()();
  assert.equal(browser.storage.get('sj_highscore_sec'),'3600');
  assert.equal(browser.getElement('elapsed').textContent,'00:00');
  assert.equal(browser.getElement('cpmAvg').textContent,'0');

  editor.innerText='x'.repeat(100);
  browser.getElement('resetSessionBtn').dispatch('click');
  assert.equal(browser.getElement('charCount').textContent,'100');
  assert.equal(browser.getElement('cpmAvg').textContent,'0');
  assert.equal(Number(browser.getElement('hourglassWidget').dataset.ratio),0);

  const hourglass=browser.getElement('hourglassWidget');
  const hourglassSelect=browser.getElement('hourglassDuration');
  browser.getElement('toggleFx').checked=false;
  browser.getElement('toggleFx').dispatch('change');
  assert.equal(hourglass.hidden,false);
  assert.equal(hourglass.classList.contains('webgl-ready'),false);
  hourglassSelect.value='0';
  hourglassSelect.dispatch('change');
  assert.equal(hourglass.hidden,true);
});
