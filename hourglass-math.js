(function(root){
  'use strict';

  const PI=Math.PI;
  const DEFAULTS=Object.freeze({neckRadius:0.105,bulbRadius:0.92,sandFraction:0.72,samples:1536});

  function clampRatio(value){
    const number=Number(value);
    if(!Number.isFinite(number)) return 0;
    return Math.max(0,Math.min(1,number));
  }

  function smoothstep(value){
    const t=clampRatio(value);
    return t*t*(3-2*t);
  }

  function chamberRadius(position,options=DEFAULTS){
    const neck=Number(options.neckRadius??DEFAULTS.neckRadius);
    const bulb=Number(options.bulbRadius??DEFAULTS.bulbRadius);
    const shaped=Math.pow(smoothstep(position),0.82);
    return neck+(bulb-neck)*shaped;
  }

  function integrateVolume(from,to,options=DEFAULTS){
    const start=clampRatio(Math.min(from,to));
    const end=clampRatio(Math.max(from,to));
    if(end<=start) return 0;
    const requested=Math.max(32,Math.floor(options.samples??DEFAULTS.samples));
    const steps=Math.max(1,Math.ceil(requested*(end-start)));
    const step=(end-start)/steps;
    let sum=0;
    for(let index=0;index<=steps;index++){
      const position=start+step*index;
      const radius=chamberRadius(position,options);
      sum+=(index===0||index===steps?0.5:1)*PI*radius*radius;
    }
    return sum*step;
  }

  function solveBoundary(target,fromStart,options=DEFAULTS){
    const capacity=integrateVolume(0,1,options);
    if(target<=0) return fromStart?0:1;
    if(target>=capacity) return fromStart?1:0;
    let low=0;
    let high=1;
    for(let iteration=0;iteration<34;iteration++){
      const middle=(low+high)/2;
      const volume=fromStart?integrateVolume(0,middle,options):integrateVolume(middle,1,options);
      if(fromStart ? volume<target : volume>target) low=middle;
      else high=middle;
    }
    return (low+high)/2;
  }

  function computeSandState(ratio,options={}){
    const config={...DEFAULTS,...options};
    const clampedRatio=clampRatio(ratio);
    const capacity=integrateVolume(0,1,config);
    const initialVolume=capacity*clampRatio(config.sandFraction);
    const lowerVolume=initialVolume*clampedRatio;
    const upperVolume=initialVolume-lowerVolume;
    return Object.freeze({
      ratio:clampedRatio,
      capacity,
      initialVolume,
      upperVolume,
      lowerVolume,
      upperBoundary:solveBoundary(upperVolume,true,config),
      lowerBoundary:solveBoundary(lowerVolume,false,config)
    });
  }

  function createCompletionGate(){
    let previous=0;
    let armed=true;
    return {
      update(ratio){
        const next=clampRatio(ratio);
        if(next<1) armed=true;
        const fired=armed&&previous<1&&next>=1;
        if(fired) armed=false;
        previous=next;
        return fired;
      },
      reset(){previous=0;armed=true;}
    };
  }

  root.SparkJoyHourglassMath=Object.freeze({
    DEFAULTS,clampRatio,chamberRadius,integrateVolume,computeSandState,createCompletionGate
  });
})(typeof window!=='undefined'?window:globalThis);
