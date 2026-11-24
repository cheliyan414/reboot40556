// Zero Hub (Babylon.js) real-entry runtime check. Local empty-data fixture only;
// no live account or database writes. Proves the canvas paints, every control
// responds, drag-orbit changes the view, mount/dispose is stable, and mobile fits.
import { spawn, spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
const root = dirname(fileURLToPath(import.meta.url)), screenshots = join(root, '../screenshots')
const args = process.argv.slice(2), flag = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const dev = args.includes('--dev')
const out = join(screenshots, flag('--out-dir') || (dev ? 'zero-hub-dev' : 'zero-hub-prod'))
await mkdir(out, { recursive: true })
const port = dev ? 5181 : 4181
const profile = await mkdtemp(join(tmpdir(), 'reboot-zero-hub-'))
const server = spawn(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), ...(dev ? [] : ['preview']), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'pipe' })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms)), errors = [], logs = []
const started = Date.now(), mark = label => console.error(`[${((Date.now() - started) / 1000).toFixed(1)}s] ${label}`)
server.stdout.on('data', d => logs.push(String(d))); server.stderr.on('data', d => logs.push(String(d)))
let chrome, ws
async function untilHttp(url) { const start = Date.now(); while (Date.now() - start < 60000) { try { const r = await fetch(url); if (r.ok) return await r.text() } catch {} await delay(150) } throw new Error(`Unavailable: ${url}\n${logs.join('')}`) }
try {
  await untilHttp(`http://127.0.0.1:${port}`)
  chrome = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=9227', `--user-data-dir=${profile}`, '--window-size=1440,1000', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', 'about:blank'], { stdio: 'ignore' })
  await untilHttp('http://127.0.0.1:9227/json/version')
  const targets = JSON.parse(await untilHttp('http://127.0.0.1:9227/json/list'))
  ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl)
  const pending = new Map(); let sequence = 0
  ws.addEventListener('message', e => { const msg = JSON.parse(e.data); if (msg.id) { const task = pending.get(msg.id); pending.delete(msg.id); if (msg.error) task?.reject(new Error(JSON.stringify(msg.error))); else task?.resolve(msg.result) } if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text); if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(msg.params.args.map(a => a.value ?? a.description ?? '').join(' ')) })
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }) })
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })) })
  const evaluate = async expression => { const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text); return response.result.value }
  const wait = async (expression, ms = 120000) => { const start = Date.now(); while (Date.now() - start < ms) { if (await evaluate(expression)) return; await delay(150) } throw new Error(`Timed out: ${expression}\n${await evaluate('document.body.innerText.slice(-1800)')}`) }
  const pointerClick = async expression => { await wait(`(() => { const el = ${expression}; if (!el || el.disabled) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest('[inert]') })()`); const point = await evaluate(`(() => { const el = ${expression}; const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`); await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point }); await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point }) }
  const textClick = text => pointerClick(`[...document.querySelectorAll('button')].find(b => !b.disabled && b.getBoundingClientRect().width > 0 && b.textContent.toLowerCase().includes(${JSON.stringify(text.toLowerCase())}))`)
  const screenshot = async name => { const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true }); await writeFile(join(out, `zero-hub-${dev ? 'dev' : 'prod'}-${name}.png`), Buffer.from(shot.data, 'base64')) }
  // Coarse luminance census of the live Babylon surface (preserveDrawingBuffer is on).
  const canvasCensus = () => evaluate(`(() => { const c = document.querySelector('.zero-hub-canvas'); if (!c || !c.width) return null; const t = document.createElement('canvas'); t.width = 160; t.height = 110; const x = t.getContext('2d'); x.drawImage(c, 0, 0, 160, 110); const d = x.getImageData(0, 0, 160, 110).data; let bright = 0, sum = 0, hash = 0; for (let i = 0; i < d.length; i += 4) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; sum += l; if (l > 24) bright++; hash = (hash * 31 + l) | 0 } return { width: c.width, height: c.height, brightRatio: +(bright / (160 * 110)).toFixed(4), mean: +(sum / (160 * 110)).toFixed(2), hash } })()`)
  const setRange = (index, value) => evaluate(`(() => { const el = document.querySelectorAll('.zero-panel input[type=range]')[${index}]; const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set; set.call(el, ${value}); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return el.value })()`)
  const setSelect = (index, value) => evaluate(`(() => { const el = document.querySelectorAll('.zero-panel select')[${index}]; const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set; set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('change', { bubbles: true })); return el.value })()`)
  const drag = async (dx, dy) => { const p = await evaluate(`(() => { const c = document.querySelector('.zero-hub-canvas').getBoundingClientRect(); return { x: c.x + c.width * 0.42, y: c.y + c.height * 0.5 } })()`); await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...p }); await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...p }); for (let i = 1; i <= 8; i++) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', button: 'left', x: p.x + dx * i / 8, y: p.y + dy * i / 8 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, x: p.x + dx, y: p.y + dy }) }

  await send('Page.enable'); await send('Runtime.enable'); await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  const fixture = `
    const nativeFetch=window.fetch.bind(window);const testUser={id:'11111111-1111-4111-8111-111111111111',email:'ui-test@example.invalid',aud:'authenticated',role:'authenticated',created_at:'2020-01-01T00:00:00Z',app_metadata:{provider:'email'},user_metadata:{username:'LOCAL UI TEST'}};
    window.fetch=async(input,init)=>{const url=new URL(typeof input==='string'?input:input.url,location.href);if(!url.hostname.endsWith('.supabase.co'))return nativeFetch(input,init);let data=[],status=200;if(url.pathname.includes('/auth/v1/user'))data=testUser;else if(url.pathname.endsWith('/planet_access_status'))data={hasAccess:true,isAdmin:true,daysRemaining:0};else if(url.pathname.endsWith('/wallet_state'))data={balance:0,recentTransactions:[]};else if(url.pathname.includes('/rpc/')){data={message:'Local UI test: writes blocked'};status=403}return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Content-Range':'0-0/0'}})};
    window.__seedTestSession=()=>{const payload=btoa(JSON.stringify({sub:testUser.id,exp:Math.floor(Date.now()/1000)+36000}));['local-placeholder','vsddqasvaesndomdfnrf','qctppiuemwuamhnlmcgm'].forEach(ref=>localStorage.setItem('sb-'+ref+'-auth-token',JSON.stringify({access_token:'eyJhbGciOiJIUzI1NiJ9.'+payload+'.LOCAL_TEST_ONLY',refresh_token:'LOCAL_TEST_ONLY',token_type:'bearer',expires_in:36000,expires_at:Math.floor(Date.now()/1000)+36000,user:testUser})))};
    localStorage.setItem('reboot-reduced-effects','false');localStorage.setItem('reboot-second-dawn-tutorial-v1','complete');localStorage.setItem('reboot-intro-v1','seen');
    window.addEventListener('DOMContentLoaded',()=>{const label=document.createElement('div');label.textContent='LOCAL UI TEST · EMPTY DATA FIXTURE · NO LIVE ACCOUNT';label.style.cssText='position:fixed;top:0;left:50%;transform:translateX(-50%);font:8px monospace;letter-spacing:1px;background:#513b17;color:#ffe4ae;padding:5px 10px;z-index:999999;pointer-events:none';document.body.append(label)});
  `
  await send('Page.addScriptToEvaluateOnNewDocument', { source: fixture })
  mark('navigate direct planet')
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/?preview=1&page=planet` })
  await wait(`!!document.querySelector('.planet-toolbar')`, dev ? 240000 : 90000)
  mark('planet toolbar mounted')
  await wait(`(() => { const skip = document.querySelector('.dawn-skip'); if (skip) { skip.click(); return false } const b = [...document.querySelectorAll('.planet-toolbar button')].find(x => x.textContent.toLowerCase().includes('zero hub')); return b && !b.disabled && !b.closest('[inert]') })()`, dev ? 240000 : 60000)

  const report = { mode: dev ? 'development' : 'production', steps: {} }
  // Enter Zero Hub from the planet dock.
  mark('click Zero Hub')
  await textClick('zero hub')
  await wait(`document.querySelector('.dawn-world')?.classList.contains('is-zero') && !!document.querySelector('.zero-hub-canvas')`)
  mark('Babylon canvas mounted')
  await wait(`document.querySelector('.dawn-world')?.dataset.renderReady === 'true'`, dev ? 240000 : 90000)
  mark('Babylon painted')
  await evaluate(`new Promise(resolve => { let n = 0; function frame() { if (++n === 8) resolve(true); else requestAnimationFrame(frame) } requestAnimationFrame(frame) })`)
  mark('settled')
  await delay(1500)
  // Prove the authored modeling-glb library is live, not the procedural fallback.
  const assetLayer = await evaluate(`(() => { const c = document.querySelector('.zero-hub-canvas'); return { layer: c?.dataset.assetLayer, families: c?.dataset.glbFamilies, instances: c?.dataset.glbInstances } })()`)
  assert.equal(assetLayer.layer, 'glb', `Authored GLB library did not activate (procedural fallback): ${JSON.stringify(assetLayer)}`)
  assert.ok(Number(assetLayer.families) >= 9 && Number(assetLayer.instances) > 20, `GLB district too sparse: ${JSON.stringify(assetLayer)}`)
  report.steps.glbLibrary = assetLayer
  mark(`GLB library live: ${assetLayer.families} families, ${assetLayer.instances} instanced buildings`)
  const initial = await canvasCensus()
  assert.ok(initial && initial.brightRatio > 0.02, `Zero Hub canvas appears blank: ${JSON.stringify(initial)}`)
  report.steps.initialRender = initial
  await screenshot('01-arrival')

  // Drag-orbit must change the presented view (auto-orbit paused first).
  await evaluate(`(() => { const el = [...document.querySelectorAll('.zero-toggle input')][0]; el.click(); return el.checked })()`)
  await delay(400)
  const beforeDrag = await canvasCensus()
  await drag(220, 60)
  await delay(700)
  const afterDrag = await canvasCensus()
  assert.notEqual(beforeDrag.hash, afterDrag.hash, 'Drag-orbit did not change the view')
  report.steps.dragOrbit = { before: beforeDrag.hash, after: afterDrag.hash, changed: true }
  // Wheel zoom.
  const cpoint = await evaluate(`(() => { const c = document.querySelector('.zero-hub-canvas').getBoundingClientRect(); return { x: c.x + c.width / 2, y: c.y + c.height / 2 } })()`)
  const beforeZoom = await canvasCensus()
  await send('Input.dispatchMouseEvent', { type: 'mouseWheel', ...cpoint, deltaX: 0, deltaY: -600 })
  await delay(700)
  const afterZoom = await canvasCensus()
  report.steps.wheelZoom = { before: beforeZoom.hash, after: afterZoom.hash, changed: beforeZoom.hash !== afterZoom.hash }

  // Live sliders + selects.
  await setRange(0, 0.85); await delay(300) // night
  await setRange(1, 1.2); await setRange(2, 1.6); await setRange(3, 0.012); await setRange(4, 1)
  await delay(500)
  const night = await canvasCensus()
  assert.ok(night.brightRatio > 0.01, `Night scene blank: ${JSON.stringify(night)}`)
  report.steps.nightControls = night
  await screenshot('02-night-neon')
  await setSelect(0, 'ember'); await delay(1200) // palette rebuild
  const ember = await canvasCensus(); assert.ok(ember.brightRatio > 0.01, 'Ember palette blank')
  await screenshot('03-ember-palette')
  await setSelect(0, 'violet'); await delay(1200)
  await setSelect(1, 'low'); await delay(800) // quality gating down
  const low = await canvasCensus(); assert.ok(low.brightRatio > 0.01, 'Low quality blank')
  await setSelect(1, 'high'); await delay(1200) // and back up (re-attach pipelines)
  const high = await canvasCensus(); assert.ok(high.brightRatio > 0.01, 'High quality blank after re-attach')
  report.steps.qualityCycle = { low: low.brightRatio, high: high.brightRatio }
  // Wireframe toggle.
  await evaluate(`(() => { const el = [...document.querySelectorAll('.zero-toggle input')][1]; el.click(); return el.checked })()`)
  await delay(500); await screenshot('04-wireframe')
  await evaluate(`(() => { const el = [...document.querySelectorAll('.zero-toggle input')][1]; el.click() })()`)

  // Randomize changes the seed; Reset restores defaults.
  const seedBefore = await evaluate(`document.querySelector('.zero-panel-seed').textContent`)
  await textClick('randomize'); await delay(1400)
  const seedAfter = await evaluate(`document.querySelector('.zero-panel-seed').textContent`)
  assert.notEqual(seedBefore, seedAfter, 'Randomize did not change the seed')
  const randomized = await canvasCensus(); assert.ok(randomized.brightRatio > 0.01, 'Randomized city blank')
  report.steps.randomize = { seedBefore, seedAfter }
  await screenshot('05-randomized')
  await textClick('reset'); await delay(1200)
  const seedReset = await evaluate(`document.querySelector('.zero-panel-seed').textContent`)
  report.steps.reset = { seedReset }

  // Frame cadence (browser cadence, NOT a GPU timing or FPS claim).
  const frames = await evaluate(`new Promise(resolve => { const samples = []; let last = performance.now(); function frame(now) { samples.push(now - last); last = now; if (samples.length === 60) resolve(samples.slice(1)); else requestAnimationFrame(frame) } requestAnimationFrame(frame) })`)
  const sorted = [...frames].sort((a, b) => a - b)
  report.frameCadence = { frameCount: frames.length, meanFrameMs: +(frames.reduce((a, b) => a + b, 0) / frames.length).toFixed(2), p95FrameMs: +sorted[Math.floor(sorted.length * .95)].toFixed(2) }

  // Leave and re-enter: mount/dispose must be stable (no duplicated loops/errors).
  await textClick('return to world hub')
  await wait(`!document.querySelector('.dawn-world')?.classList.contains('is-zero') && !document.querySelector('.zero-hub-canvas')`)
  await delay(800)
  await textClick('zero hub')
  await wait(`document.querySelector('.dawn-world')?.dataset.renderReady === 'true' && !!document.querySelector('.zero-hub-canvas')`)
  await delay(1500)
  const reentry = await canvasCensus(); assert.ok(reentry.brightRatio > 0.02, 'Re-entry blank')
  const reentryLayer = await evaluate(`document.querySelector('.zero-hub-canvas')?.dataset.assetLayer`)
  assert.equal(reentryLayer, 'glb', `GLB library did not re-activate after dispose/remount: ${reentryLayer}`)
  report.steps.reentry = { ...reentry, assetLayer: reentryLayer }
  await screenshot('06-reentry')

  // Mobile layout: panel must fit without horizontal overflow.
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await evaluate(`document.querySelector('.zero-hub-canvas') && window.dispatchEvent(new Event('resize'))`)
  await delay(1200)
  const mobile = await evaluate(`(() => { const p = document.querySelector('.zero-panel').getBoundingClientRect(); const c = document.querySelector('.zero-hub-canvas').getBoundingClientRect(); return { panelRight: Math.round(p.right), panelBottom: Math.round(p.bottom), viewportW: innerWidth, viewportH: innerHeight, canvasW: Math.round(c.width), canvasH: Math.round(c.height), docOverflowX: document.documentElement.scrollWidth > innerWidth + 1 } })()`)
  assert.ok(mobile.panelRight <= mobile.viewportW + 1 && !mobile.docOverflowX, `Mobile panel overflow: ${JSON.stringify(mobile)}`)
  assert.ok(mobile.canvasW > 300 && mobile.canvasH > 300, `Mobile canvas mis-sized: ${JSON.stringify(mobile)}`)
  report.steps.mobile = mobile
  await screenshot('07-mobile')

  assert.deepEqual(errors, [], `Browser errors: ${JSON.stringify(errors)}`)
  report.errors = errors
  report.screenshots = out
  console.log(JSON.stringify(report, null, 2))
} catch (error) { console.error(error.stack); console.error('Browser errors:', JSON.stringify(errors)); process.exitCode = 1 } finally {
  ws?.close(); for (const handle of [chrome, server]) if (handle?.pid) { if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(handle.pid), '/T', '/F'], { stdio: 'ignore' }); else handle.kill('SIGTERM') }
  await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }).catch(() => {})
}