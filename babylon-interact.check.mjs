// End-to-end Babylon building interaction check (DEV only: uses the dev-only
// __babylonCity handle to project tower positions, then drives REAL pointer
// picks). Seeds local idea rows shaped like the Supabase `ideas` contract so
// project towers render from data; no live account, no writes.
// Flow: enter planet -> wait ready -> click a project tower -> assert the real
// ProjectDetail panel opens with that record's name -> reload -> assert the
// same buildings are seated again (persistence/restore).
import { spawn, spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = dirname(fileURLToPath(import.meta.url)), screenshots = join(root, '../screenshots')
const args = process.argv.slice(2), flag = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const city = flag('--city') || 'Business'
const out = flag('--out-dir') ? join(screenshots, flag('--out-dir')) : join(screenshots, 'babylon-interact')
await mkdir(out, { recursive: true })
const port = 5181
const profile = await mkdtemp(join(tmpdir(), 'reboot-babylon-interact-'))
// Pre-bundle deps to completion BEFORE the dev server starts. The on-disk
// optimizer metadata hash drifts whenever the entry scan changes (new imports);
// a mismatched hash makes every dev-server startup re-optimize mid-load, and
// browser dep requests then hang on the optimization gate until Chrome's socket
// pool exhausts. Finishing `vite optimize` first writes matching metadata so the
// server starts clean and serves chunks straight from disk.
const opt = spawnSync(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), 'optimize', '--force'], { cwd: root, encoding: 'utf8', timeout: 480000 })
console.log(`PRE-OPTIMIZE exit=${opt.status} ${String(opt.stdout || '').slice(-200)}${String(opt.stderr || '').slice(-200)}`)
const server = spawn(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'pipe' })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms)), errors = [], logs = []
const netFails = [], sent = new Map(), done = new Set()
server.stdout.on('data', d => logs.push(String(d))); server.stderr.on('data', d => logs.push(String(d)))
// category keyword + idea status that resolve to the requested district.
const SEED = {
  AI: ['ai', 'published'], Gaming: ['gaming', 'published'], Education: ['education', 'published'],
  Health: ['health', 'published'], Creative: ['creator', 'published'], Business: ['commerce', 'in_progress'],
  Graveyard: ['commerce', 'abandoned'], Success: ['commerce', 'revived'], Future: ['space', 'published'],
  Nature: ['robotics', 'published'], Social: ['community', 'published'],
}
const [keyword, status] = SEED[city] || SEED.Business
const ideas = Array.from({ length: 6 }, (_, i) => ({
  id: `ui-proj-${i + 1}`, user_id: null, title: `${city} Record ${i + 1}`, short_desc: 'Seeded local record',
  description: 'Local UI test record', category: keyword, status, revival_score: 60,
  creator_name: 'Local Tester', is_anonymous: false, founded_year: 2021, abandoned_year: null,
  why_died: null, failure_story: null, last_words: null, skills_required: [], tech_stack: [],
  // views must clear ZERO_THRESHOLD (100) or the record belongs to Zero Hub and
  // is excluded from district scenes by design.
  views: 120, upvotes: 4, revival_count: 1, potential_score: 3, cover_url: null,
  almost_made_it: false, time_invested: null,
  created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-02T00:00:00Z',
}))
let chrome, ws
async function untilHttp(url) { const start = Date.now(); while (Date.now() - start < 30000) { try { const r = await fetch(url); if (r.ok) return await r.text() } catch {} await delay(150) } throw new Error(`Unavailable: ${url}\n${logs.join('')}`) }
try {
  await untilHttp(`http://127.0.0.1:${port}`)
  // Proof the pre-bundle removed the hash race: the served ?v= must equal the
  // on-disk optimizer hash, otherwise the server is re-optimizing mid-load.
  const meta = JSON.parse(await readFile(join(root, 'node_modules/.vite/deps/_metadata.json'), 'utf8'))
  const probeBody = await (await fetch(`http://127.0.0.1:${port}/src/main.tsx`)).text()
  const servedHash = (probeBody.match(/v=([a-f0-9]{8})/) || [])[1]
  console.log(`HASH meta=${meta.hash} served=${servedHash} ${meta.hash === servedHash ? 'MATCH' : 'MISMATCH'}`)
  // Warm the gate's module graph BEFORE the browser asks for it. On a busy
  // machine cold vite transforms take minutes; six hung transforms exhaust
  // Chrome's per-host socket pool and even static dep files then stall. Curl
  // warm-up populates vite's in-memory transform cache so the browser load is
  // all cache hits. Sequential on purpose: never saturate the transform queue.
  const WARM = [
    'src/main.tsx', 'src/index.css', 'src/planet/planet.css', 'src/planet/second-dawn.css',
    'src/pages/PlanetPage.tsx', 'src/planet/modules/cityworld/BabylonWorldGate.tsx', 'src/planet/modules/cityworld/BabylonCity.tsx',
    'src/planet/modules/cityworld/BabylonEnvironmentControls.tsx',
    'src/planet/worlds/babylon/cityScene.ts', 'src/planet/worlds/babylon/projectTowers.ts', 'src/planet/worlds/babylon/sky.ts', 'src/planet/worlds/babylon/weather.ts',
    'src/planet/worlds/babylon/environment.ts',
    'src/planet/worlds/profiles.ts', 'src/planet/worlds/types.ts',
    'src/planet/worlds/kit/ground.ts', 'src/planet/worlds/kit/blocks.ts', 'src/planet/worlds/kit/terrain.ts', 'src/planet/worlds/kit/heightfield.ts',
    'src/planet/worlds/kit/surface.tsx', 'src/planet/worlds/kit/procgen.ts', 'src/planet/worlds/kit/zoned.ts', 'src/planet/worlds/kit/math.ts',
    'src/planet/worlds/kit/noise.ts', 'src/planet/worlds/kit/towerDNA.ts', 'src/planet/worlds/kit/projectMapping.ts', 'src/planet/worlds/kit/dayCycle.ts', 'src/planet/worlds/kit/weatherField.ts',
    'src/planet/modules/cityworld/environment/ScenePrimitives.tsx', 'src/planet/modules/cityworld/environment/SurfaceMaterials.tsx', 'src/planet/modules/cityworld/environment/cityDesign.ts',
    'src/planet/modules/cityworld/cityRegistry.ts', 'src/planet/modules/cityworld/worldManifest.ts', 'src/planet/modules/cityworld/hooks/useMotionSettings.ts',
    'src/planet/modules/city/ProjectDetail.tsx', 'src/planet/components/CustomizationPanel.tsx', 'src/planet/lib/buildingAppearance.ts', 'src/planet/lib/projectDiscovery.ts',
    'src/planet/stores/auth.ts', 'src/planet/stores/ui.ts', 'src/planet/stores/journey.ts', 'src/planet/stores/economy.ts', 'src/planet/types/project.ts',
    'src/lib/auth.tsx', 'src/lib/supabase.ts',
  ]
  // Host disk-I/O waves stall single requests for ~2 minutes; a 60s abort +
  // one retry keeps the warm-up moving instead of hanging the whole run.
  const warmFetch = async url => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 60000)
      try { const r = await fetch(url, { signal: controller.signal }); const body = await r.text(); clearTimeout(timer); return { status: r.status, body } }
      catch (e) { clearTimeout(timer); if (attempt === 1) throw e; console.log(`WARM RETRY ${url} (${e.name})`) }
    }
  }
  const warmStart = Date.now()
  const depQueue = [], depSeen = new Set()
  const collectDeps = body => { for (const m of body.matchAll(/\/node_modules\/\.vite\/deps\/[A-Za-z0-9_@.-]+\.js(?:\?v=[a-f0-9]+)?/g)) if (!depSeen.has(m[0])) { depSeen.add(m[0]); depQueue.push(m[0]) } }
  for (const m of WARM) {
    const t0 = Date.now()
    try { const { status, body } = await warmFetch(`http://127.0.0.1:${port}/${m}`); collectDeps(body); if (Date.now() - t0 > 5000) console.log(`WARM SLOW ${m} ${Date.now() - t0}ms ${status}`) }
    catch (e) { console.log(`WARM FAIL ${m}: ${e.message}`) }
  }
  console.log(`WARMED ${WARM.length} modules in ${Date.now() - warmStart}ms`)
  // Prime the reachable pre-bundled dep graph (the 9MB babylon chunk above all)
  // into the OS file cache; BFS through chunk imports so nothing the browser
  // needs is a cold disk read. Static files, so no transform queue involved.
  const depStart = Date.now(); let depCount = 0
  while (depQueue.length && depCount < 400) {
    const url = depQueue.shift(); const t0 = Date.now()
    try { const { body } = await warmFetch(`http://127.0.0.1:${port}${url}`); collectDeps(body); depCount++; if (Date.now() - t0 > 5000) console.log(`DEP SLOW ${url} ${Date.now() - t0}ms`) }
    catch (e) { console.log(`DEP FAIL ${url}: ${e.message}`) }
  }
  console.log(`PRIMED ${depCount} dep chunks in ${Date.now() - depStart}ms`)
  chrome = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=9227', `--user-data-dir=${profile}`, '--window-size=1440,960', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', 'about:blank'], { stdio: 'ignore' })
  await untilHttp('http://127.0.0.1:9227/json/version')
  const targets = JSON.parse(await untilHttp('http://127.0.0.1:9227/json/list'))
  ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl)
  const pending = new Map(); let sequence = 0
  ws.addEventListener('message', e => { const msg = JSON.parse(e.data); if (msg.id) { const task = pending.get(msg.id); pending.delete(msg.id); if (msg.error) task?.reject(new Error(JSON.stringify(msg.error))); else task?.resolve(msg.result) } if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text); if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(msg.params.args.map(a => a.value ?? a.description ?? '').join(' ')); if (msg.method === 'Network.requestWillBeSent') sent.set(msg.params.requestId, msg.params.request.url); if (msg.method === 'Network.loadingFinished') done.add(msg.params.requestId); if (msg.method === 'Network.loadingFailed') { done.add(msg.params.requestId); netFails.push([sent.get(msg.params.requestId), msg.params.errorText]) } if (msg.method === 'Network.responseReceived' && msg.params.response.status >= 400) netFails.push([msg.params.response.url, msg.params.response.status]) })
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }) })
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })) })
  const evaluate = async expression => { const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text); return response.result.value }
  const wait = async (expression, ms = 90000) => { const start = Date.now(); while (Date.now() - start < ms) { if (await evaluate(expression)) return; await delay(150) } throw new Error(`Timed out: ${expression}\n${await evaluate('document.body.innerText.slice(-1500)')}`) }
  const clickAt = async (x, y) => { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, x, y }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, x, y }) }
  const textClick = text => (async () => { const expr = `[...document.querySelectorAll('button')].find(b=>!b.disabled&&b.getBoundingClientRect().width>0&&b.textContent.toLowerCase().includes(${JSON.stringify(text.toLowerCase())}))`; await wait(`(()=>{const el=${expr};if(!el)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0})()`); const p = await evaluate(`(()=>{const r=${expr}.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`); await clickAt(p.x, p.y) })()
  const screenshot = async name => { const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true }); await writeFile(join(out, `${name}.png`), Buffer.from(shot.data, 'base64')) }
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  const fixture = `
    const nativeFetch=window.fetch.bind(window);const testUser={id:'11111111-1111-4111-8111-111111111111',email:'ui-test@example.invalid',aud:'authenticated',role:'authenticated',created_at:'2020-01-01T00:00:00Z',app_metadata:{provider:'email'},user_metadata:{username:'LOCAL UI TEST'}};
    const IDEAS=${JSON.stringify(ideas)};
    window.__fetchLog=[];
    window.fetch=async(input,init)=>{const url=new URL(typeof input==='string'?input:input.url,location.href);if(!url.hostname.endsWith('.supabase.co'))return nativeFetch(input,init);let data=[],status=200;if(url.pathname.includes('/auth/v1/user'))data=testUser;else if(url.pathname.endsWith('/planet_access_status'))data={hasAccess:true,isAdmin:true,daysRemaining:0};else if(url.pathname.endsWith('/wallet_state'))data={balance:0,recentTransactions:[]};else if(url.pathname.includes('/ideas'))data=IDEAS;else if(url.pathname.includes('/rpc/')){data={message:'Local UI test: writes blocked'};status=403}window.__fetchLog.push(url.pathname+'->'+status);return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Content-Range':'0-5/6'}})};
    window.__seedTestSession=()=>{const payload=btoa(JSON.stringify({sub:testUser.id,exp:Math.floor(Date.now()/1000)+36000}));['local-placeholder','vsddqasvaesndomdfnrf','qctppiuemwuamhnlmcgm'].forEach(ref=>localStorage.setItem('sb-'+ref+'-auth-token',JSON.stringify({access_token:'eyJhbGciOiJIUzI1NiJ9.'+payload+'.LOCAL_TEST_ONLY',refresh_token:'LOCAL_TEST_ONLY',token_type:'bearer',expires_in:36000,expires_at:Math.floor(Date.now()/1000)+36000,user:testUser})))};
    localStorage.setItem('reboot-reduced-effects','false');localStorage.setItem('reboot-second-dawn-tutorial-v1','complete');localStorage.setItem('reboot-intro-v1','seen');
    window.__seedTestSession();
    window.addEventListener('DOMContentLoaded',()=>{const label=document.createElement('div');label.textContent='LOCAL UI TEST · SEEDED RECORDS · NO LIVE ACCOUNT';label.style.cssText='position:fixed;top:0;left:50%;transform:translateX(-50%);font:8px monospace;letter-spacing:1px;background:#513b17;color:#ffe4ae;padding:5px 10px;z-index:999999;pointer-events:none';document.body.append(label)});
  `
  await send('Page.addScriptToEvaluateOnNewDocument', { source: fixture })
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/?babylon=${city}` })
  await textClick('Reboot Planet')
  await wait(`document.querySelector('[data-babylon-ready="true"]')!==null`, 420000)
  await delay(3000)
  console.log('DIAG', JSON.stringify(await evaluate(`(()=>{const c=window.__babylonCity;return{handle:!!c,meshes:c?c.scene.meshes.length:0,proj:c?c.scene.meshes.filter(m=>m.name.startsWith('proj-body')).map(m=>m.name):[],fetch:window.__fetchLog}})()`)))
  // Let records load + towers seat, and construction settle.
  await wait(`window.__babylonCity && window.__babylonCity.scene.getMeshByName('proj-body-ui-proj-1')!==null`, 60000)
  await delay(1500)
  await screenshot('interact-seated')
  // Seats are the DNA root positions: body absolute positions drift with grow on
  // tilted (abandoned) towers, roots do not.
  const seatExpr = `(()=>{const s=window.__babylonCity.scene;return [1,2,3,4,5,6].map(i=>{const m=s.getMeshByName('proj-body-ui-proj-'+i);if(!m)return null;const w=m.parent.position;return{i,x:+w.x.toFixed(3),z:+w.z.toFixed(3)}})})()`
  const seatedPos = await evaluate(seatExpr)
  // Project each tower's centre with Babylon's own math, then pre-verify with a
  // real scene.pick so the click is guaranteed to land on THAT tower's body.
  // Project/pick speak canvas-local pixels; CDP mouse events speak window
  // pixels, so offset by the canvas rect (the app shell insets the canvas).
  const aimPoint = id => evaluate(`(()=>{const c=window.__babylonCity;if(!c)return null;const s=c.scene;const m=s.getMeshByName('proj-body-${id}');if(!m)return null;const cam=s.activeCamera;const eng=s.getEngine();const V3=cam.position.constructor;const M=cam.getViewMatrix().constructor;const w=eng.getRenderWidth(),h=eng.getRenderHeight();const vp=cam.viewport.toGlobal(w,h);const p=V3.Project(m.getBoundingInfo().boundingBox.centerWorld,M.Identity(),s.getTransformMatrix(),vp);const pick=s.pick(p.x,p.y);const r=eng.getRenderingCanvas().getBoundingClientRect();return{x:p.x+r.left,y:p.y+r.top,hit:pick&&pick.hit?pick.pickedMesh.name:null}})()`)
  let picked = null, panelTitle = null
  for (let i = 1; i <= 6 && !picked; i++) {
    const point = await aimPoint(`ui-proj-${i}`)
    if (!point || point.hit !== `proj-body-ui-proj-${i}` || point.x < 0 || point.y < 0 || point.x > 1440 || point.y > 1000) continue
    await clickAt(point.x, point.y)
    await delay(700)
    const open = await evaluate(`document.querySelector('[aria-label="Close project details"]')!==null`)
    if (open) {
      picked = `ui-proj-${i}`
      panelTitle = await evaluate(`document.querySelector('[aria-label="Close project details"]').closest('div.glass-strong').querySelector('h3').textContent`)
      if (panelTitle !== `${city} Record ${i}`) { console.error(`ASSOCIATION MISMATCH: clicked tower ${i}, panel shows "${panelTitle}"`); picked = null }
    }
  }
  await screenshot('interact-selected')
  // Reload: the same records must seat again at the same deterministic spots.
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/?babylon=${city}` })
  await textClick('Reboot Planet')
  await wait(`document.querySelector('[data-babylon-ready="true"]')!==null`, 420000)
  await wait(`window.__babylonCity && window.__babylonCity.scene.getMeshByName('proj-body-ui-proj-1')!==null`, 60000)
  const restoredPos = await evaluate(seatExpr)
  const restored = { present: restoredPos.every(Boolean), count: restoredPos.filter(Boolean).length, sameSeats: JSON.stringify(restoredPos) === JSON.stringify(seatedPos), seats: restoredPos }
  await delay(1200)
  await screenshot('interact-restored')
  // Add-flow: a newly published record must seat at a FREE spot (no overlap with
  // the existing six) and rise from the ground under construction. Driven through
  // the controller's public updateProjects — the same call the store effect makes.
  const closeRect = await evaluate(`(()=>{const b=document.querySelector('[aria-label="Close project details"]');if(!b)return null;const r=b.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`)
  if (closeRect) await clickAt(closeRect.x, closeRect.y)
  const added = await evaluate(`(()=>{const c=window.__babylonCity;const s=c.scene;const base={name:'x',tagline:'',description:'',category:'Business',status:'reviving',stage:3,momentum:60,founder:'Local Tester',foundedYear:2021,failureYear:null,failureReason:null,lessonsLearned:null,revivalRequirements:null,tags:[],connections:[],viewCount:120,followers:4,createdAt:'2024-01-01T00:00:00Z',updatedAt:'2024-01-02T00:00:00Z'};const list=[1,2,3,4,5,6,7].map(i=>({...base,id:'ui-proj-'+i,name:'Business Record '+i}));c.updateProjects(list,null);const m=s.getMeshByName('proj-body-ui-proj-7');if(!m)return null;const w=m.parent.position;const others=[1,2,3,4,5,6].map(i=>{const o=s.getMeshByName('proj-body-ui-proj-'+i).parent.position;return Math.hypot(o.x-w.x,o.z-w.z)});return{x:+w.x.toFixed(3),z:+w.z.toFixed(3),minDist:+Math.min(...others).toFixed(3),grow:m.parent.scaling.y}})()`)
  await delay(350)
  await screenshot('interact-constructing')
  await delay(1600)
  const grown = await evaluate(`window.__babylonCity.scene.getMeshByName('proj-body-ui-proj-7').parent.scaling.y`)
  await screenshot('interact-added')
  console.log(JSON.stringify({ city, picked, panelTitle, restored, added, grown: +grown.toFixed(3), errors, screenshots: out }, null, 2))
  if (!picked || restored.count !== 6 || !restored.sameSeats || !added || added.minDist < 2 || grown < 0.9) process.exitCode = 1
} catch (error) { console.error(error.stack); console.error('Browser errors:', JSON.stringify(errors)); console.error('NET FAILS:', JSON.stringify(netFails.slice(0, 20))); console.error('STALLED:', JSON.stringify([...sent.entries()].filter(([id]) => !done.has(id)).map(([, url]) => url).slice(0, 20))); console.error('VITE LOG TAIL:', logs.join('').slice(-2500)); process.exitCode = 1 } finally {
  ws?.close(); for (const handle of [chrome, server]) if (handle?.pid) { if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(handle.pid), '/T', '/F'], { stdio: 'ignore' }); else handle.kill('SIGTERM') }
  await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }).catch(() => {})
}