// Street-level traffic close-up census. Local empty-data fixture only; no live writes.
// Reuses the district-visuals harness's proven headless-Chrome + CDP approach but frames
// the authored "Activity" street-level viewpoint so lane-following / separation / junction
// behaviour is actually visible, captures t0/t1 pairs to prove motion, and returns to the
// first district to prove switching does not duplicate the fleet.
import { spawn, spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
const root = dirname(fileURLToPath(import.meta.url)), screenshots = join(root, '../screenshots')
const args = process.argv.slice(2), flag = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined }
const out = join(screenshots, flag('--out-dir') || 'traffic-yuka-closeup-dev')
const port = Number(flag('--port') || 5181)
await mkdir(out, { recursive: true })
const profile = await mkdtemp(join(tmpdir(), 'reboot-traffic-closeup-'))
const delay = ms => new Promise(r => setTimeout(r, ms)), errors = [], logs = []
// Cold-start an isolated real local dev server bound to 127.0.0.1 (same as the census harness).
const server = spawn(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'pipe' })
server.stdout.on('data', d => logs.push(String(d))); server.stderr.on('data', d => logs.push(String(d)))
let chrome, ws
async function untilHttp(url) { const s = Date.now(); while (Date.now() - s < 30000) { try { const r = await fetch(url); if (r.ok) return await r.text() } catch {} await delay(150) } throw new Error(`Unavailable: ${url}\n${logs.join('')}`) }
try {
  await untilHttp(`http://127.0.0.1:${port}`)
  chrome = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=9227', `--user-data-dir=${profile}`, '--window-size=1440,960', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', 'about:blank'], { stdio: 'ignore' })
  await untilHttp('http://127.0.0.1:9227/json/version')
  const targets = JSON.parse(await untilHttp('http://127.0.0.1:9227/json/list'))
  ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl)
  const pending = new Map(); let sequence = 0
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id) { const t = pending.get(m.id); pending.delete(m.id); if (m.error) t?.reject(new Error(JSON.stringify(m.error))); else t?.resolve(m.result) } if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value ?? a.description ?? '').join(' ')) })
  await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }) })
  const send = (method, params = {}) => new Promise((res, rej) => { const id = ++sequence; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })) })
  const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value }
  const wait = async (expression, ms = 90000) => { const s = Date.now(); while (Date.now() - s < ms) { if (await evaluate(expression)) return; await delay(150) } throw new Error(`Timed out: ${expression}\n${await evaluate('document.body.innerText.slice(-1800)')}`) }
  const pointerClick = async expression => { await wait(`(()=>{const el=${expression};if(!el||el.disabled)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&!el.closest('[inert]')})()`); const p = await evaluate(`(()=>{const el=${expression};const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`); await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...p }); await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...p }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...p }) }
  const textClick = text => pointerClick(`[...document.querySelectorAll('button')].find(b=>!b.disabled&&b.getBoundingClientRect().width>0&&b.textContent.toLowerCase().includes(${JSON.stringify(text.toLowerCase())}))`)
  const screenshot = async name => { const s = await send('Page.captureScreenshot', { format: 'png', fromSurface: true }); await writeFile(join(out, `${name}.png`), Buffer.from(s.data, 'base64')) }
  await send('Page.enable'); await send('Runtime.enable'); await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  const fixture = `
    const nativeFetch=window.fetch.bind(window);const testUser={id:'11111111-1111-4111-8111-111111111111',email:'ui-test@example.invalid',aud:'authenticated',role:'authenticated',created_at:'2020-01-01T00:00:00Z',app_metadata:{provider:'email'},user_metadata:{username:'LOCAL UI TEST'}};
    window.fetch=async(input,init)=>{const url=new URL(typeof input==='string'?input:input.url,location.href);if(!url.hostname.endsWith('.supabase.co'))return nativeFetch(input,init);let data=[],status=200;if(url.pathname.includes('/auth/v1/user'))data=testUser;else if(url.pathname.endsWith('/planet_access_status'))data={hasAccess:true,isAdmin:true,daysRemaining:0};else if(url.pathname.endsWith('/wallet_state'))data={balance:0,recentTransactions:[]};else if(url.pathname.includes('/rpc/')){data={message:'Local UI test: writes blocked'};status=403}return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Content-Range':'0-0/0'}})};
    window.__seedTestSession=()=>{const payload=btoa(JSON.stringify({sub:testUser.id,exp:Math.floor(Date.now()/1000)+36000}));['local-placeholder','vsddqasvaesndomdfnrf','qctppiuemwuamhnlmcgm'].forEach(ref=>localStorage.setItem('sb-'+ref+'-auth-token',JSON.stringify({access_token:'eyJhbGciOiJIUzI1NiJ9.'+payload+'.LOCAL_TEST_ONLY',refresh_token:'LOCAL_TEST_ONLY',token_type:'bearer',expires_in:36000,expires_at:Math.floor(Date.now()/1000)+36000,user:testUser})))};
    localStorage.setItem('reboot-reduced-effects','false');localStorage.setItem('reboot-second-dawn-tutorial-v1','complete');localStorage.setItem('reboot-intro-v1','seen');
    window.addEventListener('DOMContentLoaded',()=>{const l=document.createElement('div');l.textContent='LOCAL UI TEST · EMPTY DATA FIXTURE · NO LIVE ACCOUNT';l.style.cssText='position:fixed;top:0;left:50%;transform:translateX(-50%);font:8px monospace;letter-spacing:1px;background:#513b17;color:#ffe4ae;padding:5px 10px;z-index:999999;pointer-events:none';document.body.append(l)});
  `
  await send('Page.addScriptToEvaluateOnNewDocument', { source: fixture })
  await send('Page.navigate', { url: `http://127.0.0.1:${port}` })
  await textClick('CONTINUE AS GHOST'); await textClick('Reboot Planet'); await evaluate('window.__seedTestSession()'); await send('Page.reload', { ignoreCache: true }); await textClick('Reboot Planet')
  await wait(`!!document.querySelector('.descent-launch:not(:disabled)')`); await pointerClick(`document.querySelector('.descent-launch')`)
  // Reach the live R3F scene (if exposed) to read the traffic InstancedMesh matrices.
  const sceneProbe = `(()=>{const c=document.querySelector('canvas');if(!c)return null;let store=null;
    if(c.__r3f&&c.__r3f.root&&c.__r3f.root.getState)store=c.__r3f.root;
    if(!store){let node=c,fk=null;while(node&&!fk){fk=Object.keys(node).find(k=>k.startsWith('__reactFiber$'));if(!fk)node=node.parentElement;}let f=fk?node[fk]:null,hops=0;
      while(f&&hops<80&&!store){hops++;const cand=[];if(f.stateNode)cand.push(f.stateNode);if(f.memoizedProps&&f.memoizedProps.value)cand.push(f.memoizedProps.value);
        let h=f.memoizedState,g=0;while(h&&g<50){g++;const v=h.memoizedState;if(v&&typeof v==='object'){cand.push(v);if(v.current)cand.push(v.current);}if(h.queue&&h.queue.lastRenderedState)cand.push(h.queue.lastRenderedState);h=h.next;}
        for(const o of cand){if(o&&typeof o.getState==='function'){try{const s=o.getState();if(s&&s.scene){store=o;break;}}catch(e){}}}
        f=f.return;}}
    if(!store)return null;const scene=store.getState().scene;const groups=[];scene.traverse(o=>{if(o.name&&o.name.endsWith('-dynamic-traffic'))groups.push(o)});
    return groups.map(g=>{const body=g.children[0];const m=body&&body.instanceMatrix?body.instanceMatrix.array:null;const pos=[];if(m)for(let i=0;i<body.count;i++){pos.push([m[i*16+12],m[i*16+13],m[i*16+14]]);}return{name:g.name,count:body?body.count:0,pos};});})()`
  const readTraffic = () => evaluate(sceneProbe)
  const cityLabel = id => id === 'IdeaHub' ? 'Revival City' : id === 'Legend' ? 'Success City' : id === 'Creator' ? 'Creative City' : id === 'Graveyard' ? 'Graveyard' : id + ' City'
  const enterCity = async (id, click = true) => {
    if (click) await pointerClick(`[...document.querySelectorAll('.city-destinations button')].find(b=>b.textContent===${JSON.stringify(cityLabel(id))})`)
    await wait(`document.querySelector('.dawn-world')?.dataset.city===${JSON.stringify(id)}&&document.querySelector('.dawn-world')?.dataset.travelPhase==='idle'`)
  }
  const activityView = async () => {
    // The controls drawer persists open across district switches (toggle reads
    // "Close controls" when open). Only open it if Activity isn't already visible.
    const sel = `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Activity')`
    const visible = await evaluate(`(()=>{const el=${sel};if(!el||el.disabled)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&!el.closest('[inert]')})()`)
    if (!visible) { await textClick('City controls'); await delay(400) }
    await pointerClick(sel)
    await delay(1800)
    // Close the drawer so the capture is an unobstructed street-level frame.
    await textClick('Close controls')
    await delay(500)
  }
  const cities = ['AI', 'Health', 'Community']
  const report = []
  let firstAiCount = null
  for (const id of cities) {
    // AI is the default landing city after descent-launch, so it needs no nav click.
    await enterCity(id, id !== 'AI')
    await evaluate(`new Promise(r=>{let n=0;function f(){if(++n===48)r(true);else requestAnimationFrame(f)}requestAnimationFrame(f)})`)
    await delay(750)
    await activityView()
    const t0 = await readTraffic()
    await screenshot(`closeup-${id.toLowerCase()}-activity-t0`)
    await delay(3000)
    const t1 = await readTraffic()
    await screenshot(`closeup-${id.toLowerCase()}-activity-t1`)
    let moved = null, minSep = null
    const g0 = t0 && t0.find(g => g.name === `${id}-dynamic-traffic`), g1 = t1 && t1.find(g => g.name === `${id}-dynamic-traffic`)
    if (g0 && g1 && g0.pos.length && g0.pos.length === g1.pos.length) {
      let sum = 0; for (let i = 0; i < g0.pos.length; i++) sum += Math.hypot(g1.pos[i][0] - g0.pos[i][0], g1.pos[i][2] - g0.pos[i][2]); moved = Number((sum / g0.pos.length).toFixed(2))
      let best = Infinity; for (let i = 0; i < g1.pos.length; i++) for (let j = i + 1; j < g1.pos.length; j++) { const d = Math.hypot(g1.pos[i][0] - g1.pos[j][0], g1.pos[i][2] - g1.pos[j][2]); if (d < best) best = d } minSep = Number(best.toFixed(2))
    }
    if (id === 'AI') firstAiCount = g1 ? g1.count : null
    report.push({ city: id, vehicles: g1 ? g1.count : null, meanMoveOver3s: moved, minPairSeparation: minSep, sceneReadable: !!g1 })
  }
  // Return to the first district: the fleet must not have duplicated.
  await enterCity('AI'); await delay(1200)
  const back = await readTraffic(); const backAi = back && back.find(g => g.name === 'AI-dynamic-traffic')
  await screenshot('closeup-ai-return-after-switch')
  report.push({ city: 'AI-return', vehicles: backAi ? backAi.count : null, firstVisitVehicles: firstAiCount, duplicated: firstAiCount != null && backAi ? backAi.count !== firstAiCount : null })
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ mode: 'development', origin: `http://127.0.0.1:${port}`, errors, report, screenshots: out }, null, 2))
} catch (e) { console.error(e.stack); console.error('Browser errors:', JSON.stringify(errors)); process.exitCode = 1 } finally {
  ws?.close(); for (const h of [chrome, server]) if (h?.pid) { if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(h.pid), '/T', '/F'], { stdio: 'ignore' }); else h.kill('SIGTERM') }
  await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }).catch(() => {})
}