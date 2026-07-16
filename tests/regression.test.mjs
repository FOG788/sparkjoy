import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import '../session-core.js';

const appJs = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const indexHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const deployWorkflow = fs.readFileSync(new URL('../.github/workflows/deploy-pages.yml', import.meta.url), 'utf8');
const previewWorkflow = fs.readFileSync(new URL('../.github/workflows/validate-ref.yml', import.meta.url), 'utf8');
const Core=globalThis.SparkJoyCore;

function capture(regex, text, label){
  const m = text.match(regex);
  assert.ok(m, `${label} が見つかりません`);
  return m[1];
}

test('しきい値の既定値が UI と復元ロジックで一致する', () => {
  const warnUi = capture(/id="warnTh"[^>]*value="(\d+)"/, indexHtml, 'warnTh value');
  const badUi = capture(/id="badTh"[^>]*value="(\d+)"/, indexHtml, 'badTh value');
  const warmUi = capture(/id="warmupSec"[^>]*value="(\d+)"/, indexHtml, 'warmupSec value');

  const defaults = capture(/const SETTINGS_DEFAULTS=\{([\s\S]*?)\};/, appJs, 'SETTINGS_DEFAULTS');
  const warnLogic = capture(/\bwarn:(\d+)/, defaults, 'warn default');
  const badLogic = capture(/\bbad:(\d+)/, defaults, 'bad default');
  const warmLogic = capture(/\bwarm:(\d+)/, defaults, 'warm default');

  assert.equal(warnLogic, warnUi);
  assert.equal(badLogic, badUi);
  assert.equal(warmLogic, warmUi);
});

test('永続化設定の既定値が UI と復元ロジックで一致する', () => {
  const autoResetUi = capture(/id="autoReset"[\s\S]*?<option value="(\d+)" selected>/, indexHtml, 'autoReset selected value');
  const hourglassUi = capture(/id="hourglassDuration"[\s\S]*?<option value="(\d+)" selected>/, indexHtml, 'hourglassDuration selected value');
  const hourglassOpacityUi = capture(/id="hourglassOpacity"[^>]*value="(\d+)"/, indexHtml, 'hourglassOpacity value');

  const defaults = capture(/const SETTINGS_DEFAULTS=\{([\s\S]*?)\};/, appJs, 'SETTINGS_DEFAULTS');
  const autoResetLogic = capture(/\bauto:(\d+)/, defaults, 'auto default');
  const hourglassLogic = capture(/\bhourglass:(\d+)/, defaults, 'hourglass default');
  const hourglassOpacityLogic = capture(/\bhourglassOpacity:(\d+)/, defaults, 'hourglassOpacity default');

  assert.equal(autoResetLogic, autoResetUi);
  assert.equal(hourglassLogic, hourglassUi);
  assert.equal(hourglassOpacityLogic, hourglassOpacityUi);
});

test('ハイスコア更新が秒単位の比較を使う', () => {
  assert.match(appJs, /const elapsedWholeSec=Math\.max\(0, elapsedSec\|0\);/);
  assert.match(appJs, /if\(elapsedWholeSec>highSec\)/);
});

test('無操作リセットは以前のハイスコアを減らさない', () => {
  assert.equal(Core.resolveIdleHighScore(3600, 200, 180), 3600);
  assert.equal(Core.resolveIdleHighScore(100, 400, 180), 220);
});

test('セッションリセットは現在の本文長を新しい基準にする', () => {
  assert.deepEqual(Core.createSessionResetState(100), {elapsedCarrySec:0,baseChars:100});
});

test('最初の通常入力は入力前の本文長を基準にする', () => {
  assert.equal(Core.getSessionBaseLength(10,11,false),10);
  assert.equal(Core.getSessionBaseLength(10,40,true),40);
});

test('停止比は同一秒内の入力回数ではなく秒単位で集計する', () => {
  const tracker=Core.createActivityTracker({windowSeconds:60,activeMs:2000});
  for(let i=0;i<60;i++) assert.equal(tracker.record(1000,1000),0);
  assert.equal(tracker.snapshot().length,1);
  assert.equal(tracker.record(31000,1000),94);
  assert.equal(tracker.snapshot().length,31);
  tracker.record(3_601_000,1000);
  assert.equal(tracker.snapshot().length,60);
});

test('CIは回帰テストを実行し、ref検証はPagesへデプロイしない', () => {
  assert.match(deployWorkflow,/run: node --test/);
  assert.match(previewWorkflow,/run: node --test/);
  assert.doesNotMatch(previewWorkflow,/actions\/deploy-pages/);
  assert.doesNotMatch(previewWorkflow,/pages:\s*write/);
});

test('説明書は速度上昇で黄赤判定になる説明になっている', () => {
  assert.match(indexHtml, /入力速度が上がったときに注意（黄）へ切り替わる/);
  assert.match(indexHtml, /入力速度が上がりすぎたときに警告（赤）へ切り替わる/);
});
