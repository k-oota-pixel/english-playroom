import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('visible badge, fallback observer and cached release entry use the same version',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8'),script=readFileSync(new URL('../version-badge-v176.js',import.meta.url),'utf8');
 const version=script.match(/const APP_VERSION='([^']+)'/)[1];
 assert.match(version,/^\d+\.\d+\.\d+$/);
 assert.ok(html.includes('ver'+version));assert.ok(html.includes("const version = '"+version+"'"));assert.ok(html.includes('version-badge-v176.js?v='+version));
});
