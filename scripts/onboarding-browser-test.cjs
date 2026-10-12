// Optional real-browser regression/latency test. Requires Playwright and Chrome.
// NODE_PATH=/path/to/playwright/node_modules node scripts/onboarding-browser-test.cjs
// All tmux sessions, state, and fake login codes are isolated in a temporary folder.
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const root = path.resolve(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ana-onboarding-browser-'));
const session = `base-ana-onboarding-${process.pid}`;
const tmux = (...args) => execFileSync('tmux', args, { stdio: 'pipe' });
const delay = ms => new Promise(r => setTimeout(r, ms));
const theme = 'Choose the text style that looks best with your terminal\n    Auto (match terminal)\n❯ ✔ Dark mode\n    Light mode\n    Dark mode (colorblind-friendly)\n    Light mode (colorblind-friendly)\n    Dark mode (ANSI colors only)\n    Light mode (ANSI colors only)';
const url = 'https://claude.com/cai/oauth/authorize?client_id=test&redirect_uri=https%3A%2F%2Fexample.com&code_challenge=test&code_challenge_method=S256&state=test';
const login = `Browser didn't open? Use the url below to sign in (c to copy)\n\n${url}\n\nPaste code here if prompted >`;
let server, browser;
(async () => {
 fs.writeFileSync(path.join(tmp,'screen'),theme);
 fs.writeFileSync(path.join(tmp,'agent.py'), `import sys,os,tty,select,time,json\nroot=sys.argv[1]\ntty.setraw(sys.stdin.fileno())\nlast=None\nwhile True:\n s=open(root+'/screen').read()\n if s!=last:\n  sys.stdout.write('\\x1b[2J\\x1b[H'+s.replace('\\n','\\r\\n'));sys.stdout.flush();last=s\n if select.select([sys.stdin],[],[],0.02)[0]:\n  b=os.read(sys.stdin.fileno(),4096)\n  with open(root+'/keys','ab') as f:f.write(b)\n`);
 tmux('new-session','-d','-s',session,'-x','200','-y','50','python3',path.join(tmp,'agent.py'),tmp);
 const env={...process.env,PORT:'0',BIND:'127.0.0.1',ANA_NAME:'base-ana',TMUX_SESSION:session,TMUX_SOCKET:'',ANA_DATA_DIR:path.join(tmp,'data'),ANA_SEED:'0',NOTIFY_AGENT:'0'};
 delete env.ANA_TEST;delete env.ANA_PANE_ID;
 // Ask the OS for a free port, then start the actual dashboard server.
 const net=require('node:net');const listener=net.createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));env.PORT=String(listener.address().port);await new Promise(r=>listener.close(r));
 server=spawn(process.execPath,[path.join(root,'server.js')],{env,stdio:['ignore','pipe','pipe']});
 const base=`http://127.0.0.1:${env.PORT}`;
 for(let n=0;n<100;n++){try{if((await fetch(base+'/api/health')).ok)break;}catch{}await delay(50);}
 browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const start=performance.now();await page.goto(base);await page.locator('#dlgcard.on .dq-opt').first().waitFor();
 const result={initialRenderMs:Math.round(performance.now()-start),transitionMs:[]};
 assert.equal(await page.locator('#dlgQ .dq-opt').count(),7);
 for(let n=0;n<10;n++){
  const next=n%2===0?login:theme;const t=performance.now();fs.writeFileSync(path.join(tmp,'screen'),next);
  await page.waitForFunction(stage=>dialogInfo?.stage===stage,next===login?'login':'theme');
  result.transitionMs.push(Math.round(performance.now()-t));
 }
 fs.writeFileSync(path.join(tmp,'screen'),login);await page.locator('.dq-login-link').waitFor();
 assert.equal(await page.locator('.dq-login-link').getAttribute('href'),url);
 const field=page.locator('.dq-code input');await field.fill('FAKE-CODE#STATE');await field.evaluate(e=>e.setSelectionRange(2,7));
 await page.waitForTimeout(6200);assert.equal(await field.inputValue(),'FAKE-CODE#STATE');
 assert.deepEqual(await field.evaluate(e=>[document.activeElement===e,e.selectionStart,e.selectionEnd]),[true,2,7]);
 assert.equal(await page.locator('#input').isDisabled(),true);
 for(const viewport of [{width:1280,height:900},{width:390,height:844},{width:320,height:568}]){
  await page.setViewportSize(viewport);const b=await page.locator('#dlgcard').boundingBox();assert.ok(b.x>=0&&b.x+b.width<=viewport.width&&b.height<=viewport.height*.56);
 }
 await page.getByRole('button',{name:'Complete login',exact:true}).click();
 await page.waitForFunction(()=>!dialogBusy);assert.equal(await field.inputValue(),'');
 assert.ok(fs.readFileSync(path.join(tmp,'keys'),'utf8').includes('FAKE-CODE#STATE\r'));
 const dataDir=path.join(tmp,'data');
 for(const file of fs.readdirSync(dataDir,{recursive:true})){const p=path.join(dataDir,file);if(fs.statSync(p).isFile())assert.ok(!fs.readFileSync(p,'utf8').includes('FAKE-CODE'),'code leaked into ANA storage');}
 fs.writeFileSync(path.join(tmp,'screen'),'Login successful.\nPress Enter to continue');
 await page.getByRole('button',{name:'Continue',exact:true}).waitFor();
 await page.getByRole('button',{name:'Continue',exact:true}).click();await page.waitForFunction(()=>!dialogBusy);
 fs.writeFileSync(path.join(tmp,'screen'),'Do you trust the files in this folder?\n❯ 1. Yes, I trust this folder\n  2. No, exit\nEnter to confirm · Esc to cancel');
 await page.getByRole('button',{name:/Yes, I trust/}).waitFor();
 await page.getByRole('button',{name:/Yes, I trust/}).click();await page.waitForFunction(()=>!dialogBusy);
 assert.ok(fs.readFileSync(path.join(tmp,'keys'),'utf8').endsWith('1'));
 await page.reload();await page.getByRole('button',{name:/Yes, I trust/}).waitFor();
 assert.deepEqual(errors,[]);result.errors=errors;result.passed=true;
 const sorted=[...result.transitionMs].sort((a,b)=>a-b);result.medianMs=sorted[Math.floor(sorted.length/2)];result.maxMs=sorted.at(-1);
 fs.writeFileSync(path.join(tmp,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({...result,artifacts:tmp},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{
 if(browser)await browser.close();if(server)server.kill();try{tmux('kill-session','-t','='+session);}catch{}
});
