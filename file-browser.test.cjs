const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { createFileBrowser } = require('./file-browser');
const core = require('./channel-core');

test('file browser HTTP: round trip, confinement, no overwrites, validation', async t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ana-files-'));
  const root = path.join(temp, 'root'); fs.mkdirSync(root); fs.mkdirSync(path.join(root, '하위 폴더'));
  fs.writeFileSync(path.join(temp, 'outside.txt'), 'private');
  fs.symlinkSync(temp, path.join(root, 'escape')); fs.symlinkSync(path.join(temp, 'outside.txt'), path.join(root, 'link.txt'));
  const route = createFileBrowser(root, core);
  const server = http.createServer((req, res) => route(req,res,new URL(req.url, 'http://localhost')).then(handled => { if (!handled) { res.writeHead(404); res.end(); } }));
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  t.after(async () => { await new Promise(r => server.close(r)); fs.rmSync(temp, { recursive:true, force:true }); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const request = (endpoint, relative, options) => fetch(origin + endpoint + '?path=' + encodeURIComponent(relative), options);
  const upload = (relative, name, data = 'aGVsbG8=', headers = {}) => request('/api/files/upload', relative, { method:'POST', headers:{ 'content-type':'application/json', ...headers }, body:JSON.stringify({ name, data }) });
  await t.test('list excludes symbolic links', async () => {
    const r = await request('/api/files', ''); assert.equal(r.status,200);
    assert.deepEqual((await r.json()).entries.map(e => e.name), ['하위 폴더']);
  });
  await t.test('unicode nested upload and binary exact download, HEAD', async () => {
    const bytes = Buffer.from([0, 255, 3, 10]);
    assert.equal((await upload('하위 폴더', '한글 #?.bin', bytes.toString('base64'))).status,201);
    const r = await request('/api/files/download', '하위 폴더/한글 #?.bin');
    assert.equal(r.status,200); assert.match(r.headers.get('content-disposition'),/^attachment;/);
    assert.deepEqual(Buffer.from(await r.arrayBuffer()), bytes);
    const head = await request('/api/files/download', '하위 폴더/한글 #?.bin', {method:'HEAD'}); assert.equal(head.headers.get('content-length'),'4'); assert.equal(await head.text(),'');
  });
  await t.test('empty files supported, duplicate preserved', async () => {
    assert.equal((await upload('', 'empty', '')).status,201);
    assert.equal((await upload('', 'empty')).status,409);
    assert.equal(fs.readFileSync(path.join(root, 'empty')).length,0);
  });
  await t.test('traversal, absolute paths, nested links blocked for all operations', async () => {
    for (const p of ['../outside.txt', '/etc/passwd', 'escape/outside.txt', 'link.txt', '하위 폴더/../../outside.txt', '..\\outside.txt']) {
      assert.equal((await request('/api/files', p)).status,403,p);
      assert.equal((await request('/api/files/download', p)).status,403,p);
      assert.equal((await upload(p, 'new')).status,403,p);
    }
    assert.equal((await upload('', 'link.txt')).status,409);
    assert.equal(fs.readFileSync(path.join(temp,'outside.txt'),'utf8'),'private');
  });
  await t.test('bad filename, data, cross origin, directory downloads, missing paths', async () => {
    for (const name of ['../x','/tmp/x','a/b','a\\b','.','..','']) assert.equal((await upload('',name)).status,400);
    assert.equal((await upload('','bad','???')).status,400);
    assert.equal((await upload('','bad','aGVsbG8=', {origin:'https://other.example'})).status,403);
    assert.equal((await request('/api/files/download','하위 폴더')).status,400);
    assert.equal((await request('/api/files','missing')).status,404);
  });
  await t.test('size limit rejects decoded files over 25 MB', async () => {
    assert.equal((await upload('', 'large', Buffer.alloc(25 * 1024 * 1024 + 1).toString('base64'))).status,413);
    assert.equal(fs.existsSync(path.join(root,'large')),false);
  });
});
