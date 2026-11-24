// Sprawl lot click-through verification (production preview).
// Flies the orbit camera to a real mid-ring block, dispatches a genuine pointer
// tap through CDP, and asserts the lot dossier opens with generator metrics,
// the fly-to button moves the camera, and Escape closes the panel. Local-only.
import { spawn, spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
const root = dirname(fileURLToPath(import.meta.url)), screenshots = join(root, '../screenshots')
const args = process.argv.slice(2), flag = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const out = join(screenshots, flag('--out-dir') || 'lotclick-prod')
await mkdir(out, { recursive: true })
const port = 4182, cdp = 9228
const cities = (flag('--only') || 'AI,Gaming').split(',')
const profile = await mkdtemp(join(tmpdir(), 'reboot-lotclick-'))
const server = spawn(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), flag('--dev') ? 'dev' : 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'pipe' })
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
  const shot = async name => { const s = await send('Page.captureScreenshot', { format: 'png', fromSurface: true }); await writeFile(join(out, `${name}.png`), Buffer.from(s.data, 'base64')) }
  const tap = async (x, y) => { await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }) }

  await send('Page.enable'); await send('Runtime.enable'); await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  const report = { mode: 'production', districts: {} }
  for (const city of cities) {
    errors.length = 0
    mark(`navigate ${city}`)
    await send('Page.navigate', { url: `http://127.0.0.1:${port}/?preview=1&page=planet&babylon=${city}&babylonDebug=1` })
    await wait(`document.querySelector('[data-babylon-ready]')?.dataset.babylonReady === 'true'`, 300000)
    await wait(`document.querySelector('[data-babylon-ready] canvas')?.dataset.landmark === 'glb'`, 120000)
    await delay(1200)
    // Seat the camera on a real mid-ring block taken from the live instance buffer.
    const seat = await evaluate(`(() => {
      const c = window.__babylonCity; if (!c) return null
      const lotMeshes = c.scene.meshes.filter(m => m.metadata && m.metadata.lotIds && m.metadata.colors)
      if (!lotMeshes.length) return null
      const total = lotMeshes.reduce((n, m) => n + m.thinInstanceCount, 0)
      const mesh = lotMeshes.slice().sort((a, b) => b.thinInstanceCount - a.thinInstanceCount)[0]
      const data = mesh._thinInstanceDataStorage.matrixData
      const i = Math.floor(mesh.thinInstanceCount * 0.55)
      const x = data[i * 16 + 12], y = data[i * 16 + 13], z = data[i * 16 + 14]
      const t = c.camera.target.clone(); t.set(x, y, z); c.camera.setTarget(t); c.camera.radius = 2600
      return { x, y, z, instances: total }
    })()`)
    assert.ok(seat && seat.instances >= 9000, `${city}: no pickable lot batch with ~10k instances: ${JSON.stringify(seat)}`)
    await evaluate(`new Promise(resolve => { let n = 0; function frame() { if (++n === 20) resolve(true); else requestAnimationFrame(frame) } requestAnimationFrame(frame) })`)
    await delay(800)
    // Genuine pointer taps near frame centre until a block resolves to the dossier.
    let dossier = null
    for (const [x, y] of [[720, 540], [720, 600], [640, 520], [800, 560], [720, 480]]) {
      await tap(x, y)
      await delay(500)
      dossier = await evaluate(`(() => { const p = document.querySelector('.lot-dossier'); return p ? p.innerText : null })()`)
      if (dossier) break
    }
    assert.ok(dossier, `${city}: clicking sprawl blocks never opened the lot dossier`)
    assert.match(dossier, /Distance from core/, `${city}: dossier missing metrics`)
    assert.match(dossier, /km/, `${city}: dossier missing distance`)
    await shot(`lot-click-${city.toLowerCase()}`)
    mark(`${city} dossier open · ${dossier.split('\n')[0]}`)
    // Fly-to must actually move the camera target toward the selected block.
    const before = await evaluate(`(() => { const t = window.__babylonCity.camera.target; return { x: t.x, z: t.z, r: window.__babylonCity.camera.radius } })()`)
    await evaluate(`document.querySelector('.lot-fly').click()`)
    await delay(900)
    const after = await evaluate(`(() => { const t = window.__babylonCity.camera.target; return { x: t.x, z: t.z, r: window.__babylonCity.camera.radius } })()`)
    assert.ok(Math.hypot(after.x - before.x, after.z - before.z) > 1 || after.r !== before.r, `${city}: fly-to did not move the camera`)
    await evaluate(`new Promise(resolve => { let n = 0; function frame() { if (++n === 15) resolve(true); else requestAnimationFrame(frame) } requestAnimationFrame(frame) })`)
    await shot(`lot-fly-${city.toLowerCase()}`)
    // Escape closes the dossier.
    await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`)
    await delay(400)
    assert.equal(await evaluate(`!!document.querySelector('.lot-dossier')`), false, `${city}: Escape did not close the dossier`)
    assert.equal(errors.length, 0, `${city}: runtime errors: ${JSON.stringify(errors)}`)
    report.districts[city] = { instances: seat.instances, dossier: dossier.split('\n').slice(0, 8), fly: { before, after }, errors: [] }
    mark(`${city} OK · click → dossier → fly → escape`)
  }
  report.screenshots = out
  console.log(JSON.stringify(report, null, 2))
} catch (error) { console.error(error.stack); console.error('Browser errors:', JSON.stringify(errors)); process.exitCode = 1 } finally {
  ws?.close(); for (const handle of [chrome, server]) if (handle?.pid) { if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(handle.pid), '/T', '/F'], { stdio: 'ignore' }); else handle.kill('SIGTERM') }
  await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }).catch(() => {})
}