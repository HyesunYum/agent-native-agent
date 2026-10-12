const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseOnboarding, loginUrl } = require('./channel-core');
const { parseDialog, dialogOpen } = require('./channel-core');
const fs = require('node:fs');
const theme = `Welcome to Claude Code v2.1.296
 Let's get started.
 Choose the text style that looks best with your terminal
 To change this later, run /theme
     Auto (match terminal)
 ❯ ✔ Dark mode
     Light mode
     Dark mode (colorblind-friendly)
     Light mode (colorblind-friendly)
     Dark mode (ANSI colors only)
     Light mode (ANSI colors only)
 ────────────
  1 function greet() {
  2 - console.log("Hello, World!");
  2 + console.log("Hello, Claude!");
  3 }
 Syntax theme: Monokai Extended (ctrl+t to disable)`;
const url = 'https://claude.com/cai/oauth/authorize?code=true&client_id=test-client&response_type=code&redirect_uri=https%3A%2F%2Fplatform.claude.com%2Foauth%2Fcode%2Fcallback&scope=user%3Ainference+user%3Asessions%3Aclaude_code&code_challenge=test-challenge&code_challenge_method=S256&state=test-state';
const login = `Browser didn't open? Use the url below to sign in:\n${url}\n\nPaste code here if prompted >`;

test('first-run theme is a dialog with seven arrow-driven options, excluding code preview', () => {
 assert.equal(dialogOpen(theme), true);
 const d = parseDialog(theme); assert.equal(d.stage, 'theme'); assert.equal(d.options.length, 7);
 assert.equal(d.options.find(o => o.cur).n, 2); assert.equal(d.navigation, 'arrows');
});
test('login extracts the exact complete URL, including percent escapes and plus signs', () => {
 const d = parseDialog(login); assert.equal(dialogOpen(login), true); assert.equal(d.stage, 'login'); assert.equal(d.url, url);
 assert.equal(loginUrl(url+'\nPaste code here if prompted >'),url);
 for (const width of [60,80,120,200]) {
  const wrapped = url.match(new RegExp(`.{1,${width}}`, 'g')).join('\n  ');
  assert.equal(loginUrl(wrapped+'\n\nPaste code here if prompted >'), url);
 }
});
test('incomplete or untrusted URLs never become login buttons', () => {
 for (const value of [url.replace('claude.com','evil.test'), url.replace('S256','plain'), url.split('&state=')[0], 'javascript:alert(1)', url.replace('/cai/oauth/authorize','/other')]) assert.equal(loginUrl(value),null);
 assert.equal(parseDialog('Paste code here if prompted >').url,null);
});
test('login success exposes only an explicit Continue action', () => {
 const d = parseDialog('Login successful.\nPress Enter to continue');
 assert.equal(d.stage,'complete'); assert.equal(d.continue,true);
});
test('normal conversation does not trigger onboarding from quoted prose', () => {
 assert.equal(parseOnboarding('⏺ Choose the text style that looks best with your terminal\n❯ hello'),null);
 assert.equal(parseOnboarding('⏺ Paste code here if prompted > is the prompt to look for'),null);
});
const source=fs.readFileSync(require.resolve('./channel-core'),'utf8');
const start=source.indexOf('  async function dialogAction(');
const action=require('node:vm').runInNewContext(`(${source.slice(start,source.indexOf('  const server = http.createServer',start)).trim()})`,{parseDialog});
function runner(screen) { const keys=[];return {keys,target:'onboarding-test',ch:{rememberLoginCode:()=>{},captureScreen:async()=>screen,delay:async()=>{},tmux:async args=>keys.push(args)}}; }
test('code input is literal and transient; rejects input outside the live login prompt',async()=>{
 const r=runner(login);assert.equal((await action(r,{action:'code',code:'test-code#test-state'})).ok,true);
 assert.deepEqual(r.keys.map(k=>Array.from(k).slice(3)),[['C-u'],['-l','--','test-code#test-state'],['Enter']]);
 const stale=runner(theme);assert.equal((await action(stale,{action:'code',code:'test-code'})).status,409);assert.equal(stale.keys.length,0);
 for(const code of ['', 'abc\ndef','abc\x1bdef','a'.repeat(4097)]) {const r=runner(login);assert.equal((await action(r,{action:'code',code})).status,400);assert.equal(r.keys.length,0);}
});
test('Continue cannot send arbitrary Enter into an unrelated menu',async()=>{
 const r=runner(theme);assert.equal((await action(r,{action:'continue'})).status,409);assert.equal(r.keys.length,0);
 const done=runner('Login successful\nPress Enter to continue');assert.equal((await action(done,{action:'continue'})).ok,true);assert.equal(done.keys[0][3],'Enter');
});

test('first-run safety notice preserves text and requires explicit Continue', () => {
 const d=parseDialog('Security notes:\nClaude can make mistakes.\nReview commands before running them.\nPress Enter to continue');
 assert.equal(d.stage,'notice'); assert.equal(d.continue,true); assert.match(d.intro,/Review commands/);
});
test('every unnumbered theme row can be selected with arrows and Enter', async () => {
 for(let wanted=1;wanted<=7;wanted++){
  let selected=2;const keys=[];
  const r={target:'theme-test',ch:{delay:async()=>{},captureScreen:async()=>{
   let index=0;return theme.split('\n').map(line=>{
    if(!/^\s*[❯]?\s*[✔]?\s*(?:Auto \(match terminal\)|(?:Dark|Light) mode)/.test(line))return line;
    index++;return (index===selected?'❯ ':'  ')+line.replace(/^\s*[❯]?\s*[✔]?\s*/,'');
   }).join('\n');
  },tmux:async args=>{const key=args[3];keys.push(key);if(key==='Up')selected--;if(key==='Down')selected++;}}};
  assert.equal((await action(r,{action:'pick',n:wanted})).ok,true);assert.equal(selected,wanted);assert.equal(keys.at(-1),'Enter');
 }
});

test('login code redaction covers later scrollback echoes, including line wraps', () => {
 const os=require('node:os'),path=require('node:path');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ana-code-redaction-'));
 try {
  const ch=require('./channel-core').createChannel({ROOT:tmp,SESSION:'test',TARGET:'test',FEED_FILE:path.join(tmp,'feed.jsonl')});
  ch.rememberLoginCode('TEST-code#STATE');
  const a=ch.commit({role:'user',text:'echo TEST-code#STATE'});
  const b=ch.commit({role:'user',text:'echo TEST-co\nde#STATE'});
  assert.equal(a.text,'echo [login code redacted]');assert.equal(b.text,a.text);
  assert.ok(!fs.readFileSync(path.join(tmp,'feed.jsonl'),'utf8').includes('TEST-code'));
  assert.equal(ch.commit({role:'user',text:'Dark mode\nPaste code here if prompted > UNREMEMBERED-CODE\nLogin successful'}).text,'[Claude login screen]');
 } finally { fs.rmSync(tmp,{recursive:true,force:true}); }
});
