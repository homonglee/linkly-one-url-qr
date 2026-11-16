const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8'),nodes=new Map(),qrCalls=[],downloads=[];
function element(id=''){return {value:'',textContent:'',style:{},classList:{flags:new Set(),add(x){this.flags.add(x)},remove(x){this.flags.delete(x)},toggle(x){this.flags.has(x)?this.flags.delete(x):this.flags.add(x)},contains(x){return this.flags.has(x)}},addEventListener(type,fn){this[type]=fn},setAttribute(k,v){this[k]=v},removeAttribute(k){delete this[k]},focus(){},appendChild(){},remove(){},click(){downloads.push(this)},querySelector(){return {toDataURL(){return 'data:image/png;base64,AA'}}}}}
function node(id){if(!nodes.has(id))nodes.set(id,element(id));return nodes.get(id)}
const document={querySelector:node,querySelectorAll:()=>[],getElementById:id=>node('#'+id),createElement:()=>element(),body:element()};
function QRCode(holder,opts){qrCalls.push(opts.text)}QRCode.CorrectLevel={H:2};
const context=vm.createContext({document,navigator:{clipboard:{writeText:async v=>{context.copied=v}}},QRCode,URL,URLSearchParams,Blob,location:{},setTimeout:fn=>fn(),console});
for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g))vm.runInContext(m[1],context);
function submit(url){node('#longUrl').value=url;node('#linkForm').submit({preventDefault(){}})}
(async()=>{
 const original='https://youtu.be/Ye_fuLwhrYQ?si=1i-p6eZ88u2V_s-r';
 submit(original);
 assert.equal(node('#openBtn').href,original);assert.equal(node('#shortText').textContent,original);assert.equal(qrCalls.at(-1),original);
 await node('#copyBtn').onclick();assert.equal(context.copied,original);
 node('#qrSize').value='768';node('#downloadPng').onclick();assert.equal(qrCalls.at(-1),original);
 node('#downloadSvg').onclick();assert.equal(qrCalls.at(-1),original);
 node('#utmSwitch').classList.add('on');node('#utmSource').value='poster';node('#utmCampaign').value='test';submit(original);
 const utm=new URL(node('#openBtn').href);assert.equal(utm.searchParams.get('si'),'1i-p6eZ88u2V_s-r');assert.equal(utm.searchParams.get('utm_source'),'poster');assert.equal(qrCalls.at(-1),utm.href);
 node('#slug').value='이벤트';submit(original);assert.equal(node('#linkLabel').textContent,'이벤트');assert.equal(node('#openBtn').href,utm.href);
 submit('javascript:alert(1)');assert.ok(node('#errorBox').classList.contains('show'));
 assert.ok(!html.includes('tinyurl.com'));assert.ok(!/\bfetch\s*\(/.test(html));assert.ok(!html.includes('go.linkly.store'));
 const api=fs.readFileSync(require('node:path').join(__dirname,'../api/shorten.js'),'utf8').replace('export default function handler','function handler');
 vm.runInContext(api,context);let status,payload;context.req={query:{url:original,slug:'name'}};context.res={setHeader(){},status(x){status=x;return this},json(x){payload=x;return this}};vm.runInContext('handler(req,res)',context);
 assert.equal(status,200);assert.equal(payload.qrUrl,original);assert.equal(payload.shortUrl,original);assert.equal(payload.provider,'direct');
 context.req.query.url='javascript:alert(1)';vm.runInContext('handler(req,res)',context);assert.equal(status,400);
 console.log('PASS: exact original URL for open, copy, QR preview/PNG/SVG and API; UTM opt-in; no provider network requests');
})().catch(e=>{console.error(e);process.exitCode=1});
