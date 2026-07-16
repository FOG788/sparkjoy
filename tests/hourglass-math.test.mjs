import test from 'node:test';
import assert from 'node:assert/strict';

await import('../hourglass-math.js');
const Hourglass=globalThis.SparkJoyHourglassMath;

test('砂量は全進捗で保存され、上下が単調に移動する',()=>{
  const ratios=[0,.25,.5,.75,1];
  const states=ratios.map((ratio)=>Hourglass.computeSandState(ratio));
  for(const state of states){
    const error=Math.abs(state.upperVolume+state.lowerVolume-state.initialVolume)/state.initialVolume;
    assert.ok(error<.005,`volume error ${error}`);
    const upperReconstructed=Hourglass.integrateVolume(0,state.upperBoundary);
    const lowerReconstructed=Hourglass.integrateVolume(state.lowerBoundary,1);
    const upperError=Math.abs(upperReconstructed-state.upperVolume)/state.initialVolume;
    const lowerError=Math.abs(lowerReconstructed-state.lowerVolume)/state.initialVolume;
    assert.ok(upperError<.005,`upper geometry error ${upperError}`);
    assert.ok(lowerError<.005,`lower geometry error ${lowerError}`);
  }
  for(let index=1;index<states.length;index++){
    assert.ok(states[index].upperVolume<=states[index-1].upperVolume);
    assert.ok(states[index].lowerVolume>=states[index-1].lowerVolume);
  }
  assert.equal(states[0].lowerVolume,0);
  assert.equal(states.at(-1).upperVolume,0);
  assert.ok(Math.abs(states[2].upperVolume-states[2].lowerVolume)<1e-10);
});

test('範囲外や非数の進捗率は0〜1へ安全に丸められる',()=>{
  assert.equal(Hourglass.computeSandState(-3).ratio,0);
  assert.equal(Hourglass.computeSandState(4).ratio,1);
  assert.equal(Hourglass.computeSandState(Number.NaN).ratio,0);
});

test('完了演出は到達時に一度だけ発火し、リセット後に再発火する',()=>{
  const gate=Hourglass.createCompletionGate();
  assert.equal(gate.update(.8),false);
  assert.equal(gate.update(1),true);
  assert.equal(gate.update(1),false);
  assert.equal(gate.update(.2),false);
  assert.equal(gate.update(1),true);
  gate.reset();
  assert.equal(gate.update(1),true);
});
