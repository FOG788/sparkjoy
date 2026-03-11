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

  const warnLogic = capture(/const loadWarn=\(\)=>Persistence\.loadNumWithCookie\(LS\.warn,CK\.warn,(\d+)\);/, appJs, 'loadWarn default');
  const badLogic = capture(/const loadBad\s*=\(\)=>Persistence\.loadNumWithCookie\(LS\.bad,CK\.bad,(\d+)\);/, appJs, 'loadBad default');
  const warmLogic = capture(/const loadWarm=\(\)=>Persistence\.loadNumWithCookie\(LS\.warm,CK\.warm,(\d+)\);/, appJs, 'loadWarm default');

  assert.equal(warnLogic, warnUi);
  assert.equal(badLogic, badUi);
  assert.equal(warmLogic, warmUi);
});

test('ハイスコア更新が秒単位の比較を使う', () => {
  assert.match(appJs, /const elapsedWholeSec=Math\.max\(0, elapsedSec\|0\);/);
  assert.match(appJs, /if\(elapsedWholeSec>highSec\)/);
});

test('説明書は速度上昇で黄赤判定になる説明になっている', () => {
  assert.match(indexHtml, /入力速度が上がったときに注意（黄）へ切り替わる/);
  assert.match(indexHtml, /入力速度が上がりすぎたときに警告（赤）へ切り替わる/);
});
