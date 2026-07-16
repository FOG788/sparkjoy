(function initSparkJoyCore(root){
  'use strict';

  const toNonNegativeInt=(value)=>Math.max(0,Math.floor(Number(value)||0));

  function createSessionResetState(currentTextLength){
    return {elapsedCarrySec:0,baseChars:toNonNegativeInt(currentTextLength)};
  }

  function resolveIdleHighScore(baselineHighSec,elapsedSec,autoResetSec){
    const baseline=toNonNegativeInt(baselineHighSec);
    const eligible=toNonNegativeInt(Math.max(0,Number(elapsedSec||0)-Number(autoResetSec||0)));
    return Math.max(baseline,eligible);
  }

  function getSessionBaseLength(previousLength,currentLength,isPaste){
    return toNonNegativeInt(isPaste?currentLength:previousLength);
  }

  function createActivityTracker({windowSeconds=60,activeMs=2000}={}){
    const size=Math.max(1,toNonNegativeInt(windowSeconds));
    const activeWindowMs=Math.max(0,Number(activeMs)||0);
    const samples=[];

    function reset(){samples.length=0;}

    function record(nowMs,lastInputAtMs){
      const now=Math.max(0,Number(nowMs)||0);
      const lastInput=Math.max(0,Number(lastInputAtMs)||0);
      const second=Math.floor(now/1000);
      const activeNow=lastInput>0&&(now-lastInput)<activeWindowMs;
      const last=samples[samples.length-1];

      if(last&&last.second===second){
        last.active=last.active||activeNow;
      }else{
        const firstSecond=last?Math.max(last.second+1,second-size+1):second;
        for(let sampleSecond=firstSecond;sampleSecond<=second;sampleSecond++){
          const sampleAt=sampleSecond*1000;
          const active=sampleSecond===second
            ? activeNow
            : lastInput>0&&sampleAt>=lastInput&&(sampleAt-lastInput)<activeWindowMs;
          samples.push({second:sampleSecond,active});
        }
      }

      const cutoff=second-size+1;
      while(samples.length&&samples[0].second<cutoff)samples.shift();
      let activeCount=0;
      for(const sample of samples)if(sample.active)activeCount++;
      return samples.length?Math.round((1-activeCount/samples.length)*100):0;
    }

    const snapshot=()=>samples.map((sample)=>({...sample}));
    return {record,reset,snapshot};
  }

  root.SparkJoyCore=Object.freeze({
    createActivityTracker,
    createSessionResetState,
    getSessionBaseLength,
    resolveIdleHighScore
  });
})(typeof window!=='undefined'?window:globalThis);
