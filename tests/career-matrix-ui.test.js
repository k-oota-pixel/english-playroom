import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('career-matrix/index.html');
const script=read('career-matrix/app.js');
const css=read('career-matrix/ui-polish.css');
const home=read('index.html');

test('preview stays separate from homepage and uses the existing login gate',()=>{
  assert.match(html,/access-gate\.js/);
  assert.match(html,/ui-polish\.css/);
  assert.match(html,/id="mobileEvaluation"/);
  assert.match(html,/id="matrixTable"/);
  assert.doesNotMatch(home,/career-matrix\/index\.html/);
  assert.doesNotMatch(home,/href=["'][^"']*career-matrix\//);
});
test('all four stages have clear in-page navigation',()=>{
  for(const stage of ['valuesStage','optionsStage','ratingStage','resultsStage']){
    assert.match(html,new RegExp('id="'+stage+'"'));
    assert.match(html,new RegExp('href="#'+stage+'"'));
  }
});
test('mobile rating cards and table share the same rating handler',()=>{
  assert.match(script,/function renderMobileEvaluator\(\)/);
  assert.match(script,/\$\('matrixTable'\)\.addEventListener\('click',onRatingClick\)/);
  assert.match(script,/\$\('mobileEvaluation'\)\.addEventListener\('click',onRatingClick\)/);
  assert.match(script,/renderMatrix\(\);renderMobileEvaluator\(\);renderResults\(\);renderCounters\(\)/);
});
test('custom inputs are revealed only when user chooses free text',()=>{
  assert.match(script,/customValueSlots\.add\(i\)/);
  assert.match(script,/customOptionSlots\.add\(i\)/);
  assert.match(css,/\.custom-field\[hidden\]\{display:none!important\}/);
});
test('card view is available on phone and portrait tablet, but the table remains printable',()=>{
  assert.match(css,/@media\(max-width:860px\)/);
  assert.match(css,/\.mobile-evaluator\{display:grid/);
  assert.match(css,/@media print/);
  assert.match(css,/\.desktop-matrix\{display:block!important\}/);
});
