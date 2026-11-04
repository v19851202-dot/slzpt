import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';

const source = await readFile(new URL('../functions/api/comments.js', import.meta.url), 'utf8');
const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
const { onRequestGet, onRequestPost } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const page = '/notes/neck-pain-red-flags';
const ip = '192.0.2.42';
const approved = { run: async () => ({ response: '{"verdict":"ok"}' }) };
const hash = date => createHash('sha256').update(ip + '|' + date.slice(0, 10) + '|slzpt-comments').digest('hex');
function fixture(t, AI = approved) {
  const db = new DatabaseSync(':memory:'); db.exec(schema); t.after(() => db.close());
  const env = { AI, ASSETS: { fetch: async () => new Response(`<link rel="canonical" href="https://slzpt.com${page}"><title>測試文章</title>`) }, DB: {
    prepare(sql) { return { bind(...args) { return {
      first: async () => db.prepare(sql).get(...args) || null,
      all: async () => ({ results: db.prepare(sql).all(...args) }),
      run: async () => { const result = db.prepare(sql).run(...args); return { meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } }; }
    }; } }; }
  } };
  return { db, env, rows: () => db.prepare('SELECT * FROM comments ORDER BY id').all() };
}
function input(n = 0) { return { page, name: '本機測試', body: '謝謝分享這份文章，這是心得編號' + n, t: Date.now() - 5000, website: '' }; }
function request(payload, options = {}) {
  return new Request('https://slzpt.com/api/comments', { method: 'POST', headers: { 'content-type': 'application/json', 'CF-Connecting-IP': ip, ...options.headers }, body: JSON.stringify(payload), ...options });
}
const send = (f, payload = input(), options) => onRequestPost({ env: f.env, request: request(payload, options) });
const get = (f, after) => onRequestGet({ env: f.env, request: new Request('https://slzpt.com/api/comments?page=' + page + (after === undefined ? '' : '&after=' + after)) });
function seed(f, { body = '先前留言', date = new Date().toISOString(), status = 'visible', ipHash = hash(date), target = page } = {}) {
  f.db.prepare('INSERT INTO comments(page,name,body,created_at,status,ip_hash) VALUES(?,?,?,?,?,?)').run(target, '讀者', body, date, status, ipHash);
}

test('normal approval is public, parameterized, and cannot impersonate owner', async t => {
  const f = fixture(t); const data = input(); data.name = "讀者'--"; data.is_owner = 1;
  const r = await send(f, data); assert.equal(r.status, 200);
  const result = await r.json(); assert.equal(result.comment.is_owner, 0);
  assert.equal(f.rows()[0].name, data.name); assert.equal(f.rows()[0].status, 'visible');
  assert.equal((await (await get(f)).json()).comments.length, 1);
});
for (const [name, ai] of [
  ['missing AI', undefined], ['AI outage', {run:async()=>{throw new Error('synthetic outage');}}],
  ['unparseable AI response', {run:async()=>({response:'unknown'})}]
]) test(name + ' remains private pending', async t => {
  const f = fixture(t); f.env.AI = ai;
  const r = await send(f); assert.equal(r.status, 202); const data = await r.json();
  assert.equal(data.pending, true); assert.equal(data.comment, undefined);
  assert.equal(f.rows()[0].status, 'pending');
  assert.deepEqual((await (await get(f)).json()).comments, []);
});
test('model fallback can approve, without failing open', async t => {
  let calls = 0; const f = fixture(t, {run:async()=>{if (++calls === 1) throw Error('primary'); return {response:'{"verdict":"ok"}'};}});
  assert.equal((await send(f)).status, 200); assert.equal(calls, 2); assert.equal(f.rows()[0].status, 'visible');
});
test('both AI timeouts keep comment pending', async t => {
  const f = fixture(t, {run:()=>new Promise(()=>{})});
  const r = await send(f); assert.equal(r.status, 202); assert.equal(f.rows()[0].status, 'pending');
});
test('rule block and AI rejection are never publicly listed', async t => {
  const f = fixture(t, {run:async()=>({response:'{"verdict":"abuse"}'})});
  await send(f, input(1)); await send(f, {...input(2), body:'歡迎來娛樂城試試手氣'});
  assert.deepEqual(f.rows().map(x=>x.status), ['blocked','blocked']);
  assert.equal((await (await get(f)).json()).comments.length, 0);
});
test('12 concurrent requests reserve at most 3 slots before AI runs', async t => {
  let calls = 0;
  const f = fixture(t, {run:async()=>{calls++; await new Promise(r=>setTimeout(r,50)); return {response:'{"verdict":"ok"}'};}});
  const responses = await Promise.all(Array.from({length:12},(_,i)=>send(f,input(i))));
  assert.equal(responses.filter(r=>r.status===200).length, 3);
  assert.equal(responses.filter(r=>r.status===429).length, 9);
  assert.equal(calls, 3); assert.equal(f.rows().length, 3);
});
test('concurrent duplicates reserve exactly one slot', async t => {
  const f = fixture(t, {run:async()=>{await new Promise(r=>setTimeout(r,20)); return {response:'{"verdict":"ok"}'};}});
  const responses = await Promise.all(Array.from({length:6},()=>send(f,input())));
  assert.equal(responses.filter(r=>r.status===200).length, 1);
  assert.equal(responses.filter(r=>r.status===409).length, 5); assert.equal(f.rows().length, 1);
});
test('pending requests count toward the quota', async t => {
  const f=fixture(t); delete f.env.AI;
  const codes=[]; for(let i=0;i<4;i++) codes.push((await send(f,input(i))).status);
  assert.deepEqual(codes,[202,202,202,429]);
});
test('limits and duplicates remain continuous across UTC midnight', async t => {
  const RealDate = Date; const instant = RealDate.parse('2026-11-05T00:02:00Z');
  globalThis.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : [instant])); } static now() { return instant; } };
  try {
    const f = fixture(t);
    for(let i=0;i<3;i++) seed(f,{body:'跨日留言'+i,date:'2026-11-04T23:58:00.000Z'});
    assert.equal((await send(f,input())).status,429);
    const duplicate = fixture(t); seed(duplicate,{body:input().body,date:'2026-11-04T23:58:00.000Z'});
    assert.equal((await send(duplicate)).status,409);
    const daily = fixture(t);
    for(let i=0;i<15;i++) seed(daily,{body:'24小時留言'+i,date:'2026-11-04T12:00:00.000Z'});
    assert.equal((await send(daily)).status,429);
    const expired=fixture(t); seed(expired,{body:input().body,date:'2026-11-03T23:00:00.000Z'});
    assert.equal((await send(expired)).status,200);
  } finally { globalThis.Date=RealDate; }
});
for(const payload of [null,[],42,'text',{}, {...input(),t:'123'}, {...input(),body:{}}, {...input(),website:[]}]) {
  test('invalid JSON shape: '+JSON.stringify(payload), async t=>{const f=fixture(t);assert.equal((await send(f,payload)).status,400);assert.equal(f.rows().length,0);});
}
test('malformed JSON and wrong content type are rejected', async t=>{
  const f=fixture(t);
  assert.equal((await send(f,input(),{body:'{'})).status,400);
  assert.equal((await send(f,input(),{headers:{'content-type':'text/plain'}})).status,415);
});
test('actual byte limit rejects oversized bodies even without Content-Length', async t=>{
  const f=fixture(t); const data={...input(),extra:'中'.repeat(3000)};
  assert.equal((await send(f,data)).status,413); assert.equal(f.rows().length,0);
});
test('declared large Content-Length is rejected before body read',async t=>{
  const f=fixture(t); assert.equal((await send(f,input(),{headers:{'content-type':'application/json','content-length':'999999'}})).status,413);
});
test('server rejects oversize fields, links, and absent articles', async t=>{
  const f=fixture(t);
  for(const p of [{...input(),body:'中'.repeat(501)},{...input(),name:'名'.repeat(21)},{...input(),body:'https://example.com'},{...input(),page:'/notes/missing'}]) assert.equal((await send(f,p)).status,400);
  assert.equal(f.rows().length,0);
});
test('pagination reads more than 300 visible comments exactly once', async t=>{
  const f=fixture(t);
  for(let i=0;i<355;i++) seed(f,{body:'留言'+i,status:i%71===0?'pending':'visible',ipHash:'seed'+i});
  seed(f,{target:'/notes/other',body:'另一篇'});
  const ids=[];let after;
  do {const data=await (await get(f,after)).json();assert.ok(data.comments.length<=50);ids.push(...data.comments.map(c=>c.id));after=data.nextCursor;} while(after);
  assert.equal(ids.length,350);assert.equal(new Set(ids).size,350);assert.deepEqual(ids,[...ids].sort((a,b)=>a-b));
  assert.equal((await get(f,'-1')).status,400);assert.equal((await get(f,'9007199254740993')).status,400);
});
test('database failure produces generic 503 without exception details',async t=>{
  const f=fixture(t);f.env.DB.prepare=()=>{throw Error('private backend details');};
  for(const r of [await send(f),await get(f)]) {assert.equal(r.status,503);assert.ok(!(await r.text()).includes('private backend'));}
});
test('finalization failure leaves the reservation private', async t=>{
  const f=fixture(t);const prepare=f.env.DB.prepare;
  f.env.DB.prepare=sql=>{if(sql.includes('UPDATE comments')) throw Error('synthetic update failure');return prepare(sql);};
  assert.equal((await send(f)).status,503);assert.equal(f.rows()[0].status,'pending');
});
test('a reservation changed during review is not falsely reported as public', async t=>{
  const f=fixture(t);const prepare=f.env.DB.prepare;
  f.env.DB.prepare=sql=>sql.includes('UPDATE comments')?{bind:()=>({run:async()=>({meta:{changes:0}})})}:prepare(sql);
  assert.equal((await send(f)).status,503);assert.equal(f.rows()[0].status,'pending');
});
