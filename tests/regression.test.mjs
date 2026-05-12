import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const appJs = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const indexHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function capture(regex, text, label){
  const m = text.match(regex);
  assert.ok(m, `${label} が見つかりません`);
  return m[1];
}

test('しきい値の既定値が UI と復元ロジックで一致する', () => {
  const warnUi = capture(/id="warnTh"[^>]*value="(\d+)"/, indexHtml, 'warnTh value');
  const badUi = capture(/id="badTh"[^>]*value="(\d+)"/, indexHtml, 'badTh value');
  const warmUi = capture(/id="warmupSec"[^>]*value="(\d+)"/, indexHtml, 'warmupSec value');

  const warnLogic = capture(/warn:(\d+)/, appJs, 'warn default');
  const badLogic = capture(/bad:(\d+)/, appJs, 'bad default');
  const warmLogic = capture(/warm:(\d+)/, appJs, 'warm default');

  assert.equal(warnLogic, warnUi);
  assert.equal(badLogic, badUi);
  assert.equal(warmLogic, warmUi);
});

test('永続化設定の既定値が UI と復元ロジックで一致する', () => {
  const autoResetUi = capture(/id="autoReset"[\s\S]*?<option value="(\d+)" selected>/, indexHtml, 'autoReset selected value');
  const hourglassUi = capture(/id="hourglassDuration"[\s\S]*?<option value="(\d+)" selected>/, indexHtml, 'hourglassDuration selected value');
  const hourglassOpacityUi = capture(/id="hourglassOpacity"[^>]*value="(\d+)"/, indexHtml, 'hourglassOpacity value');

  const autoResetLogic = capture(/auto:(\d+)/, appJs, 'auto default');
  const hourglassLogic = capture(/hourglass:(\d+)/, appJs, 'hourglass default');
  const hourglassOpacityLogic = capture(/hourglassOpacity:(\d+)/, appJs, 'hourglassOpacity default');

  assert.equal(autoResetLogic, autoResetUi);
  assert.equal(hourglassLogic, hourglassUi);
  assert.equal(hourglassOpacityLogic, hourglassOpacityUi);
});

test('ハイスコア更新が秒単位の比較を使う', () => {
  assert.match(appJs, /const elapsedWholeSec=Math\.max\(0, elapsedSec\|0\);/);
  assert.match(appJs, /if\(elapsedWholeSec>highSec\)/);
});

test('説明書は速度上昇で黄赤判定になる説明になっている', () => {
  assert.match(indexHtml, /入力速度が上がったときに注意（黄）へ切り替わる/);
  assert.match(indexHtml, /入力速度が上がりすぎたときに警告（赤）へ切り替わる/);
});
