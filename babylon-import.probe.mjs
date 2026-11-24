// DEV diagnostic: which module request stalls the CityWorld lazy chunk?
// Tracks CDP network events, then attempts the dynamic import manually.
import { spawn, spawnSync } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = dirname(fileURLToPath(import.meta.url))
const port = 5181
const profile = await mkdtemp(join(tmpdir(), 'reboot-import-probe-'))
const server = spawn(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'pipe' })
const vlogs = []
server.stdout.on('data', d => vlogs.push(String(d))); server.stderr.on('data', d => vlogs.push(String(d)))
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
let chrome, ws
async function untilHttp(url) { const start = Date.now(); while (Date.now() - start < 30000) { try { const r = await fetch(url); if (r.ok) return await r.text() } catch {} await delay(150) } throw new Error('Unavailable: ' + url) }
try {
  await untilHttp(`http://127.0.0.1:${port}`)
  chrome = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=9227', `--user-data-dir=${profile}`, '--window-size=1440,960', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', 'about:blank'], { stdio: 'ignore' })
  await untilHttp('http://127.0.0.1:9227/json/version')
  const targets = JSON.parse(await untilHttp('http://127.0.0.1:9227/json/list'))
  ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl)
  const pending = new Map(); let sequence = 0
  const sent = new Map(), done = new Map(), failed = []
  ws.addEventListener('message', e => {
    const msg = JSON.parse(e.data)
    if (msg.id) { const task = pending.get(msg.id); pending.delete(msg.id); if (msg.error) task?.reject(new Error(JSON.stringify(msg.error))); else task?.resolve(msg.result) }
    if (msg.method === 'Network.requestWillBeSent') sent.set(msg.params.requestId, { url: msg.params.request.url, t: Date.now() })
    if (msg.method === 'Network.loadingFinished') done.set(msg.params.requestId, Date.now())
    if (msg.method === 'Network.loadingFailed') { done.set(msg.params.requestId, Date.now()); failed.push([sent.get(msg.params.requestId)?.url, msg.params.errorText]) }
    if (msg.method === 'Runtime.consoleAPICalled') console.log('CONSOLE', msg.params.type, msg.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 300))
    if (msg.method === 'Runtime.exceptionThrown') console.log('EXCEPTION', JSON.stringify(msg.params.exceptionDetails).slice(0, 500))
  })
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }) })
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })) })
  const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value }
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    const nativeFetch=window.fetch.bind(window);const testUser={id:'11111111-1111-4111-8111-111111111111',email:'ui-test@example.invalid',aud:'authenticated',role:'authenticated',created_at:'2020-01-01T00:00:00Z',app_metadata:{provider:'email'},user_metadata:{username:'LOCAL UI TEST'}};
    window.fetch=async(input,init)=>{const url=new URL(typeof input==='string'?input:input.url,location.href);if(!url.hostname.endsWith('.supabase.co'))return nativeFetch(input,init);let data=[],status=200;if(url.pathname.includes('/auth/v1/user'))data=testUser;else if(url.pathname.endsWith('/planet_access_status'))data={hasAccess:true,isAdmin:true,daysRemaining:0};else if(url.pathname.endsWith('/wallet_state'))data={balance:0,recentTransactions:[]};else if(url.pathname.includes('/ideas'))data=[];else if(url.pathname.includes('/rpc/')){data={message:'blocked'};status=403}return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Content-Range':'0-0/0'}})};
    const payload=btoa(JSON.stringify({sub:testUser.id,exp:Math.floor(Date.now()/1000)+36000}));['local-placeholder','vsddqasvaesndomdfnrf','qctppiuemwuamhnlmcgm'].forEach(ref=>localStorage.setItem('sb-'+ref+'-auth-token',JSON.stringify({access_token:'eyJhbGciOiJIUzI1NiJ9.'+payload+'.LOCAL_TEST_ONLY',refresh_token:'LOCAL_TEST_ONLY',token_type:'bearer',expires_in:36000,expires_at:Math.floor(Date.now()/1000)+36000,user:testUser})));
    localStorage.setItem('reboot-reduced-effects','false');localStorage.setItem('reboot-second-dawn-tutorial-v1','complete');localStorage.setItem('reboot-intro-v1','seen');
  ` })
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/?babylon=Business` })
  // Wait for the rail button exactly like the interaction harness does; a fixed
  // delay clicked nothing on cold starts and silently measured an idle server.
  let btn = null
  for (let i = 0; i < 90 && !btn; i++) {
    await delay(1000)
    btn = await evaluate(`(()=>{const el=[...document.querySelectorAll('button')].find(b=>!b.disabled&&b.getBoundingClientRect().width>0&&b.textContent.toLowerCase().includes('reboot planet'));if(!el)return null;const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`)
  }
  console.log('CLICK TARGET:', JSON.stringify(btn))
  if (btn) { await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, x: btn.x, y: btn.y }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, x: btn.x, y: btn.y }) }
  for (let i = 0; i < 9; i++) {
    await delay(10000)
    const stalled = [...sent.entries()].filter(([id]) => !done.has(id)).map(([, v]) => v.url)
    const t0 = Date.now()
    let nodeFetch = 'n/a'
    try { const r = await fetch(`http://127.0.0.1:${port}/src/planet/stores/ui.ts`); nodeFetch = `${r.status} ${Date.now() - t0}ms` } catch (e) { nodeFetch = 'ERR ' + e.message }
    console.log(`T+${(i + 1) * 10}s NODE-FETCH:`, nodeFetch, 'STALLED COUNT:', stalled.length)
    console.log(`T+${(i + 1) * 10}s FIRST STALLED:`, JSON.stringify(stalled.slice(0, 6), null, 1))
    console.log(`T+${(i + 1) * 10}s BODY:`, (await evaluate(`document.body.innerText.slice(0, 220)`)).replace(/\n/g, ' | '))
    console.log(`T+${(i + 1) * 10}s READY:`, await evaluate(`document.querySelector('[data-babylon-ready="true"]')!==null`))
  }
  const manual = await evaluate(`Promise.race([import('/src/planet/modules/cityworld/BabylonWorldGate.tsx').then(m=>'resolved:'+Object.keys(m).join(',')),new Promise(r=>setTimeout(()=>r('still-pending-after-30s'),30000))])`)
  console.log('MANUAL IMPORT:', manual)
  console.log('VITE LOG TAIL:', vlogs.join('').slice(-1500))
  const stalled2 = [...sent.entries()].filter(([id]) => !done.has(id)).map(([, v]) => v.url)
  console.log('STALLED AFTER MANUAL:', JSON.stringify(stalled2, null, 1))
  const durations = [...done.entries()].map(([id, t]) => ({ url: sent.get(id)?.url, ms: t - (sent.get(id)?.t ?? t) })).sort((a, b) => b.ms - a.ms)
  console.log('SLOWEST:', JSON.stringify(durations.slice(0, 12), null, 1))
  console.log('FAILED:', JSON.stringify(failed.slice(0, 8), null, 1))
} catch (error) { console.error(error.stack) } finally {
  ws?.close(); for (const handle of [chrome, server]) if (handle?.pid) { if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(handle.pid), '/T', '/F'], { stdio: 'ignore' }); else handle.kill('SIGTERM') }
  await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }).catch(() => {})
}