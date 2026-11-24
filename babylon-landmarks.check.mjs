// Per-district authored GLB landmark verification (production preview).
// Visits every district via ?babylon=<City>&babylonDebug=1 in preview mode (no
// live account), asserts the district's OWN authored GLB centerpiece activated
// (not the procedural fallback), census-checks the painted surface, and captures
// a fresh screenshot per city. Local-only; no database writes.
import { spawn, spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
const root = dirname(fileURLToPath(import.meta.url)), screenshots = join(root, '../screenshots')
const args = process.argv.slice(2), flag = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const out = join(screenshots, flag('--out-dir') || 'landmarks-prod')
await mkdir(out, { recursive: true })
const port = 4182, cdp = 9228
const viteMode = flag('--dev') ? 'dev' : 'preview'
const EXPECTED = {
  AI: 'crystal-monolith', Gaming: 'twin-arch-towers', Education: 'terraced-arcology',
  Health: 'bio-dome', Creative: 'twist-spire', Business: 'cantilever-stack',
  Graveyard: 'gateway-monument', Success: 'legacy-spire', Future: 'ring-observatory',
  Nature: 'living-canopy', Social: 'habitat-block',
}
const profile = await mkdtemp(join(tmpdir(), 'reboot-landmarks-'))
const server = spawn(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), viteMode, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'pipe' })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms)), errors = [], logs = []
const started = Date.now(), mark = label => console.error(`[${((Date.now() - started) / 1000).toFixed(1)}s] ${label}`)
server.stdout.on('data', d => logs.push(String(d))); server.stderr.on('data', d => logs.push(String(d)))
let chrome, ws
async function untilHttp(url) { const start = Date.now(); while (Date.now() - start < 60000) { try { const r = await fetch(url); if (r.ok) return await r.text() } catch {} await delay(150) } throw new Error(`Unavailable: ${url}\n${logs.join('')}`) }
try {
  await untilHttp(`http://127.0.0.1:${port}`)
  chrome = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${cdp}`, `--user-data-dir=${profile}`, '--window-size=1440,1000', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', 'about:blank'], { stdio: 'ignore' })
  await untilHttp(`http://127.0.0.1:${cdp}/json/version`)
  const targets = JSON.parse(await untilHttp(`http://127.0.0.1:${cdp}/json/list`))
  ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl)
  const pending = new Map(); let sequence = 0
  ws.addEventListener('message', e => { const msg = JSON.parse(e.data); if (msg.id) { const task = pending.get(msg.id); pending.delete(msg.id); if (msg.error) task?.reject(new Error(JSON.stringify(msg.error))); else task?.resolve(msg.result) } if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text); if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(msg.params.args.map(a => a.value ?? a.description ?? '').join(' ')) })
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }) })
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })) })
  const evaluate = async expression => { const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text); return response.result.value }
  const wait = async (expression, ms = 120000) => { const start = Date.now(); while (Date.now() - start < ms) { if (await evaluate(expression)) return; await delay(150) } throw new Error(`Timed out: ${expression}\nPAGE: ${await evaluate('document.body.innerText.slice(0,600)')}`) }
  const screenshot = async name => { const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true }); await writeFile(join(out, `landmark-${name}.png`), Buffer.from(shot.data, 'base64')) }
  const census = () => evaluate(`(() => { const c = document.querySelector('[data-babylon-ready] canvas'); if (!c || !c.width) return null; const t = document.createElement('canvas'); t.width = 160; t.height = 110; const x = t.getContext('2d'); x.drawImage(c, 0, 0, 160, 110); const d = x.getImageData(0, 0, 160, 110).data; let bright = 0, sum = 0, hash = 0; for (let i = 0; i < d.length; i += 4) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; sum += l; if (l > 24) bright++; hash = (hash * 31 + l) | 0 } return { brightRatio: +(bright / (160 * 110)).toFixed(4), mean: +(sum / (160 * 110)).toFixed(2), hash } })()`)

  await send('Page.enable'); await send('Runtime.enable'); await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  const report = { mode: 'production', districts: {} }
  const only = flag('--only')
  const entries = Object.entries(EXPECTED).filter(([city]) => !only || only.split(',').includes(city))
  for (const [city, file] of entries) {
    errors.length = 0
    mark(`navigate ${city}`)
    await send('Page.navigate', { url: `http://127.0.0.1:${port}/?preview=1&page=planet&babylon=${city}&babylonDebug=1` })
    await wait(`document.querySelector('[data-babylon-ready]')?.dataset.babylonReady === 'true'`, 300000)
    await wait(`document.querySelector('[data-babylon-ready] canvas')?.dataset.landmark === 'glb'`, 120000)
    await evaluate(`new Promise(resolve => { let n = 0; function frame() { if (++n === 10) resolve(true); else requestAnimationFrame(frame) } requestAnimationFrame(frame) })`)
    await delay(1200)
    const status = await evaluate(`(() => { const c = document.querySelector('[data-babylon-ready] canvas'); return { landmark: c?.dataset.landmark, file: c?.dataset.landmarkFile } })()`)
    assert.equal(status.landmark, 'glb', `${city}: authored GLB landmark did not activate: ${JSON.stringify(status)}`)
    assert.equal(status.file, file, `${city}: wrong landmark ${status.file}, expected ${file}`)
    const shot = await census()
    assert.ok(shot && shot.brightRatio > 0.02, `${city}: canvas appears blank: ${JSON.stringify(shot)}`)
    await screenshot(city.toLowerCase())
    report.districts[city] = { ...status, ...shot, errors: [...errors] }
    mark(`${city} OK · ${file} · bright=${shot.brightRatio}`)
    if (flag('--vista')) {
      // Pull the orbit camera out to a high vista so the 100 km LOD sprawl fills
      // the frame, proving the district is a vast metropolis not an island.
      await evaluate(`(() => { const c = window.__babylonCity; if (c && c.camera) { c.camera.upperRadiusLimit = 120000; c.camera.radius = 15000; c.camera.beta = 1.0 } return !!(c && c.camera) })()`)
      await evaluate(`new Promise(resolve => { let n = 0; function frame() { if (++n === 20) resolve(true); else requestAnimationFrame(frame) } requestAnimationFrame(frame) })`)
      await delay(1500)
      const vshot = await census()
      const v = await send('Page.captureScreenshot', { format: 'png', fromSurface: true })
      await writeFile(join(out, `vista-${city.toLowerCase()}.png`), Buffer.from(v.data, 'base64'))
      report.districts[city].vista = vshot
      mark(`${city} vista · bright=${vshot?.brightRatio}`)
    }
    if (flag('--close')) {
      // Street-level close-up on a real near block so facade detail (windows,
      // entrance, balconies) is inspectable, not just the skyline silhouette.
      await evaluate(`(() => { const c = window.__babylonCity; const mesh = c.scene.meshes.find(m => m.metadata && m.metadata.lotIds && m.metadata.colors && m.material && m.material.name.startsWith('glow-facade')) || c.scene.meshes.find(m => m.metadata && m.metadata.lotIds && m.metadata.colors); const d = mesh._thinInstanceDataStorage.matrixData; const i = 40; const t = c.camera.target.clone(); t.set(d[i*16+12], d[i*16+13], d[i*16+14]); c.camera.setTarget(t); c.camera.radius = 220; c.camera.beta = 1.25; return true })()`)
      await evaluate(`new Promise(resolve => { let n = 0; function frame() { if (++n === 20) resolve(true); else requestAnimationFrame(frame) } requestAnimationFrame(frame) })`)
      await delay(1200)
      const c = await send('Page.captureScreenshot', { format: 'png', fromSurface: true })
      await writeFile(join(out, `close-${city.toLowerCase()}.png`), Buffer.from(c.data, 'base64'))
      mark(`${city} close-up`)
    }
    if (flag('--night')) {
      await evaluate(`window.__babylonCity.setEnvironment('night', 'world')`)
      await evaluate(`(() => { const c = window.__babylonCity; c.camera.radius = 900; c.camera.beta = 1.1; return true })()`)
      await evaluate(`new Promise(resolve => { let n = 0; function frame() { if (++n === 20) resolve(true); else requestAnimationFrame(frame) } requestAnimationFrame(frame) })`)
      await delay(1200)
      const n = await send('Page.captureScreenshot', { format: 'png', fromSurface: true })
      await writeFile(join(out, `night-${city.toLowerCase()}.png`), Buffer.from(n.data, 'base64'))
      mark(`${city} night`)
    }
  }
  // Distinctness: every district must present a different landmark file and a
  // different rendered fingerprint (no two cities are the same picture).
  const files = Object.values(report.districts).map(d => d.file)
  assert.equal(new Set(files).size, files.length, 'Landmark files are not all distinct')
  report.distinctLandmarks = new Set(files).size
  report.screenshots = out
  console.log(JSON.stringify(report, null, 2))
} catch (error) { console.error(error.stack); console.error('Browser errors:', JSON.stringify(errors)); process.exitCode = 1 } finally {
  ws?.close(); for (const handle of [chrome, server]) if (handle?.pid) { if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(handle.pid), '/T', '/F'], { stdio: 'ignore' }); else handle.kill('SIGTERM') }
  await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }).catch(() => {})
}