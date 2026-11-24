// Weekly 12-district regression census. Local labelled synthetic fixtures only;
// no live account or database writes. Visits all eleven category districts plus
// Zero Hub through the real entry flow, proves each paints, each holds a real
// project record whose dossier opens, exercises the walk-in interior once,
// checks mobile fit, and writes a dated evidence directory that is never
// overwritten. Intended to be run weekly; the accompanying automation compares
// reports and screenshots across weeks.
import { spawn, spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, rm, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
const root = dirname(fileURLToPath(import.meta.url)), screenshots = join(root, '../screenshots')
const args = process.argv.slice(2), flag = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const dev = args.includes('--dev')
const date = new Date().toISOString().slice(0, 10)
let out = join(screenshots, flag('--out-dir') || `weekly-${date}`)
for (let n = 2; ; n++) { try { await readdir(out); out = join(screenshots, `weekly-${date}-${n}`) } catch { break } }
await mkdir(out, { recursive: true })
const port = dev ? 5183 : 4183
const profile = await mkdtemp(join(tmpdir(), 'reboot-weekly-'))
const server = spawn(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), ...(dev ? [] : ['preview']), '--config', 'vite.harness.config.ts', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'pipe' })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms)), errors = [], logs = [], chromeLogs = []
const started = Date.now(), mark = label => console.error(`[${((Date.now() - started) / 1000).toFixed(1)}s] ${label}`)
server.stdout.on('data', d => logs.push(String(d))); server.stderr.on('data', d => logs.push(String(d)))
let chrome, ws
async function untilHttp(url) { const start = Date.now(); while (Date.now() - start < 60000) { try { const r = await fetch(url); if (r.ok) return await r.text() } catch {} await delay(150) } throw new Error(`Unavailable: ${url}\n${logs.join('')}`) }
try {
  await untilHttp(`http://127.0.0.1:${port}`)
  chrome = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=9229', `--user-data-dir=${profile}`, '--window-size=1440,1000', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--enable-logging=stderr', '--disable-dev-shm-usage', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] })
  chrome.stderr.on('data', d => chromeLogs.push(String(d)))
  await untilHttp('http://127.0.0.1:9229/json/version')
  const targets = JSON.parse(await untilHttp('http://127.0.0.1:9229/json/list'))
  ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl)
  const pending = new Map(); let sequence = 0
  ws.addEventListener('message', e => { const msg = JSON.parse(e.data); if (msg.id) { const task = pending.get(msg.id); pending.delete(msg.id); if (msg.error) task?.reject(new Error(JSON.stringify(msg.error))); else task?.resolve(msg.result) } if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text); if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(msg.params.args.map(a => a.value ?? a.description ?? '').join(' ')) })
  // A dead debugger socket must fail loudly, never orphan a promise into a zombie run.
  ws.addEventListener('close', () => { for (const task of pending.values()) task.reject(new Error('CDP socket closed')); pending.clear() })
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }) })
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout after 120s: ${method}`)) }, 120000); pending.set(id, { resolve: v => { clearTimeout(timer); resolve(v) }, reject: e => { clearTimeout(timer); reject(e) } }); ws.send(JSON.stringify({ id, method, params })) })
  const evaluate = async expression => { const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text); return response.result.value }
  const wait = async (expression, ms = 180000) => { const start = Date.now(); while (Date.now() - start < ms) { if (await evaluate(expression)) return; await delay(150) } throw new Error(`Timed out: ${expression}\n${await evaluate('document.body.innerText.slice(-1800)')}`) }
  const pointerClick = async expression => { await wait(`(() => { const el = ${expression}; if (!el || el.disabled) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest('[inert]') })()`); const point = await evaluate(`(() => { const el = ${expression}; const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`); await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point }); await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point }) }
  const textClick = text => pointerClick(`[...document.querySelectorAll('button')].find(b => !b.disabled && b.getBoundingClientRect().width > 0 && b.textContent.toLowerCase().includes(${JSON.stringify(text.toLowerCase())}))`)
  const screenshot = async name => { const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true }); await writeFile(join(out, `${name}.png`), Buffer.from(shot.data, 'base64')) }
  const key = async (type, keyName, code, vk) => send('Input.dispatchKeyEvent', { type, key: keyName, code, windowsVirtualKeyCode: vk })
  const settle = () => evaluate(`new Promise(resolve => { let n = 0; function frame() { if (++n === 16) resolve(true); else requestAnimationFrame(frame) } requestAnimationFrame(frame) })`)
  // Hub mode hides the surface destination nav: entry there is orbital selection
  // plus "Descend into city". Surface mode switches districts directly.
  const enterDistrict = async (city, label) => {
    const orbital = await evaluate(`document.querySelector('.dawn-world')?.classList.contains('is-orbital')`)
    if (orbital) {
      const short = label.replace(' City', '')
      await pointerClick(`[...document.querySelectorAll('.orbital-districts button')].find(b => b.querySelector('span')?.textContent === ${JSON.stringify(short)})`)
      await pointerClick(`document.querySelector('.descent-launch:not([disabled])')`)
    } else {
      await pointerClick(`[...document.querySelectorAll('.city-destinations button')].find(b => b.textContent.trim() === ${JSON.stringify(label)})`)
    }
    await wait(`(() => { const w = document.querySelector('.dawn-world'); return w && w.dataset.city === ${JSON.stringify(city)} && w.dataset.travelPhase === 'idle' && w.dataset.renderReady === 'true' })()`, 300000)
    // A slow first paint is not a failed journey: no error toast may survive arrival.
    const travelError = await evaluate(`document.querySelector('.world-error')?.textContent ?? null`)
    if (travelError) throw new Error(`Travel error toast after entering ${city}: ${travelError}`)
  }
  // City canvases keep their drawing buffer, so a coarse luminance census is possible.
  const census = selector => evaluate(`(() => { const c = document.querySelector(${JSON.stringify(selector)}); if (!c || !c.width) return null; const t = document.createElement('canvas'); t.width = 160; t.height = 110; const x = t.getContext('2d'); x.drawImage(c, 0, 0, 160, 110); const d = x.getImageData(0, 0, 160, 110).data; let bright = 0, sum = 0, hash = 0; for (let i = 0; i < d.length; i += 4) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; sum += l; if (l > 24) bright++; hash = (hash * 31 + l) | 0 } return { width: c.width, height: c.height, brightRatio: +(bright / (160 * 110)).toFixed(4), mean: +(sum / (160 * 110)).toFixed(2), hash } })()`)

  await send('Page.enable'); await send('Runtime.enable'); await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  // One labelled synthetic record per district (views >= 100 so it belongs to a
  // category city) plus one zero-hub record (views < 100). Guest session.
  const rows = [
    ['AI', 'ai', 'alive', 'Aurora Loom'], ['Gaming', 'gaming', 'alive', 'Pixel Tide'],
    ['Education', 'education', 'alive', 'Chalk Orbit'], ['Health', 'health', 'alive', 'Verdant Pulse'],
    ['Creator', 'creator', 'alive', 'Kiln & Coil'], ['IdeaHub', 'startup', 'seeking', 'Halfbuilt Bridge'],
    ['Graveyard', 'community', 'abandoned', 'Quiet Signal'], ['Legend', 'legacy', 'revived', 'Second Sunrise'],
    ['Space', 'space', 'alive', 'Perigee Garden'], ['Robotics', 'robotics', 'alive', 'Treadlight'],
    ['Community', 'social', 'alive', 'Porchlight'], ['Zero', 'ai', 'alive', 'Ember Notebook'],
  ].map(([district, category, status, title], i) => ({ id: `bbbbbbbb-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, title: `${title} [TEST]`, short_desc: `Synthetic weekly-census fixture for ${district}.`, description: 'Local UI test record. Not a real project.', category, status, creator_name: 'Fixture Founder', is_anonymous: false, founded_year: 2022, abandoned_year: status === 'abandoned' ? 2024 : null, why_died: status === 'abandoned' ? 'Synthetic fixture: funding ended.' : null, failure_story: null, last_words: 'Synthetic fixture lesson.', skills_required: ['TypeScript'], revival_score: 40, views: district === 'Zero' ? 12 : 150 + i, upvotes: 2, tech_stack: [], created_at: '2022-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', user_id: null, building_customization: null }))
  const fixture = `
    const nativeFetch=window.fetch.bind(window);const rows=${JSON.stringify(rows)};
    window.fetch=async(input,init)=>{const url=new URL(typeof input==='string'?input:input.url,location.href);if(!url.hostname.endsWith('.supabase.co'))return nativeFetch(input,init);const method=(init&&init.method||'GET').toUpperCase();if(method!=='GET'&&method!=='HEAD')return new Response(JSON.stringify({message:'Local UI test: writes blocked'}),{status:403,headers:{'Content-Type':'application/json'}});let data=[],range='0-0/0';if(url.pathname.endsWith('/ideas')){data=rows;range='0-'+(rows.length-1)+'/'+rows.length}else if(url.pathname.includes('/auth/v1/')){data=null}else if(url.pathname.endsWith('/planet_access_status')){data={hasAccess:false,isAdmin:false,daysRemaining:30}}return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json','Content-Range':range}})};
    localStorage.setItem('reboot-reduced-effects','false');localStorage.setItem('reboot-second-dawn-tutorial-v1','complete');localStorage.setItem('reboot-intro-v1','seen');
    window.addEventListener('DOMContentLoaded',()=>{const label=document.createElement('div');label.textContent='WEEKLY CENSUS · SYNTHETIC FIXTURES · GUEST · NO LIVE WRITES';label.style.cssText='position:fixed;top:0;left:50%;transform:translateX(-50%);font:8px monospace;letter-spacing:1px;background:#513b17;color:#ffe4ae;padding:5px 10px;z-index:999999;pointer-events:none';document.body.append(label)});
  `
  await send('Page.addScriptToEvaluateOnNewDocument', { source: fixture })
  mark('navigate direct planet (guest preview)')
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/?preview=1&page=planet` })
  await wait(`!!document.querySelector('.planet-toolbar')`, 480000)
  await wait(`(() => { const skip = document.querySelector('.dawn-skip'); if (skip) { skip.click(); return false } const t = document.querySelector('.planet-toolbar'); return t && !t.inert && (!!document.querySelector('.descent-launch:not([disabled])') || !!document.querySelector('.city-destinations button:not([disabled])')) })()`, 480000)
  mark('planet ready')

  const report = { date, mode: dev ? 'development' : 'production', startedAt: new Date().toISOString(), districts: {}, zeroHub: null, interior: null, mobile: null, errors }
  const cityLabels = { AI: 'AI City', Gaming: 'Gaming City', Education: 'Education City', Health: 'Health City', Creator: 'Creative City', IdeaHub: 'Revival City', Graveyard: 'Graveyard', Legend: 'Success City', Space: 'Space City', Robotics: 'Robotics City', Community: 'Community City' }
  const rowFor = { AI: 'Aurora Loom', Gaming: 'Pixel Tide', Education: 'Chalk Orbit', Health: 'Verdant Pulse', Creator: 'Kiln & Coil', IdeaHub: 'Halfbuilt Bridge', Graveyard: 'Quiet Signal', Legend: 'Second Sunrise', Space: 'Perigee Garden', Robotics: 'Treadlight', Community: 'Porchlight' }
  for (const [city, label] of Object.entries(cityLabels)) {
    mark(`enter ${city}`)
    const errorsBefore = errors.length
    await enterDistrict(city, label)
    await settle(); await delay(900)
    const shot = await census('.dawn-world canvas')
    assert.ok(shot && shot.brightRatio > 0.01, `${city} canvas appears blank: ${JSON.stringify(shot)}`)
    await screenshot(`district-${city.toLowerCase()}`)
    // The district must hold its fixture record and the dossier must open.
    await wait(`[...document.querySelectorAll('.world-projects button')].some(b => b.textContent.includes(${JSON.stringify(rowFor[city])}))`)
    await pointerClick(`[...document.querySelectorAll('.world-projects button')].find(b => b.textContent.includes(${JSON.stringify(rowFor[city])}))`)
    await wait(`[...document.querySelectorAll('button')].some(b => b.textContent.includes('ENTER BUILDING'))`)
    const dossier = await evaluate(`document.querySelector('.world-projects h2')?.textContent`)
    await key('keyDown', 'Escape', 'Escape', 27); await key('keyUp', 'Escape', 'Escape', 27)
    await wait(`![...document.querySelectorAll('button')].some(b => b.textContent.includes('ENTER BUILDING'))`)
    report.districts[city] = { renderReady: true, census: shot, projectList: dossier, dossierOpens: true, newErrors: errors.slice(errorsBefore) }
    mark(`${city} ok`)
  }

  // Zero Hub: twelfth district, Babylon renderer, authored GLB library.
  mark('enter Zero Hub')
  const zhErrorsBefore = errors.length
  await textClick('zero hub')
  await wait(`document.querySelector('.dawn-world')?.classList.contains('is-zero') && document.querySelector('.dawn-world')?.dataset.renderReady === 'true'`, 300000)
  await delay(1500)
  const zhLayer = await evaluate(`(() => { const c = document.querySelector('.zero-hub-canvas'); return { layer: c?.dataset.assetLayer, families: c?.dataset.glbFamilies, instances: c?.dataset.glbInstances } })()`)
  assert.equal(zhLayer.layer, 'glb', `Zero Hub GLB library inactive: ${JSON.stringify(zhLayer)}`)
  const zhShot = await census('.zero-hub-canvas')
  assert.ok(zhShot && zhShot.brightRatio > 0.02, `Zero Hub blank: ${JSON.stringify(zhShot)}`)
  await screenshot('district-zero-hub')
  report.zeroHub = { ...zhLayer, census: zhShot, newErrors: errors.slice(zhErrorsBefore) }
  await textClick('return to world hub')
  await wait(`(() => { const w = document.querySelector('.dawn-world'); return w && !w.classList.contains('is-zero') && w.dataset.travelPhase === 'idle' })()`)
  const returnError = await evaluate(`document.querySelector('.world-error')?.textContent ?? null`)
  if (returnError) throw new Error(`Travel error toast after leaving Zero Hub: ${returnError}`)
  mark('Zero Hub ok')

  // Walk-in interior probe in AI City: the end-goal loop stays completable.
  mark('interior probe')
  const intErrorsBefore = errors.length
  await enterDistrict('AI', 'AI City')
  await pointerClick(`[...document.querySelectorAll('.world-projects button')].find(b => b.textContent.includes('Aurora Loom'))`)
  await textClick('enter building')
  await wait(`!!document.querySelector('.interior-overlay') && !!document.querySelector('.interior-overlay canvas')?.dataset.interiorPosition`, 120000)
  await delay(1500)
  const beforeWalk = await evaluate(`document.querySelector('.interior-overlay canvas').dataset.interiorPosition`)
  await key('keyDown', 'w', 'KeyW', 87)
  await wait(`document.querySelector('.interior-overlay canvas')?.dataset.interiorPosition !== ${JSON.stringify(beforeWalk)}`, 30000)
  await key('keyUp', 'w', 'KeyW', 87)
  await screenshot('interior-walk')
  await pointerClick(`document.querySelector('.interior-exit')`)
  await wait(`!document.querySelector('.interior-overlay')`)
  await key('keyDown', 'Escape', 'Escape', 27); await key('keyUp', 'Escape', 'Escape', 27)
  report.interior = { mounts: true, walks: true, exits: true, newErrors: errors.slice(intErrorsBefore) }
  mark('interior ok')

  // Mobile spot-check: AI City fits a phone viewport without overflow.
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await evaluate(`window.dispatchEvent(new Event('resize'))`)
  await delay(1800)
  const mobile = await evaluate(`(() => ({ viewportW: innerWidth, viewportH: innerHeight, docOverflowX: document.documentElement.scrollWidth > innerWidth + 1, canvas: (() => { const c = document.querySelector('.dawn-world canvas'); return c ? { w: c.width, h: c.height } : null })() }))()`)
  assert.ok(!mobile.docOverflowX && mobile.canvas && mobile.canvas.w > 300, `Mobile layout broken: ${JSON.stringify(mobile)}`)
  await screenshot('mobile-ai')
  report.mobile = mobile

  report.finishedAt = new Date().toISOString()
  report.durationSeconds = Math.round((Date.now() - started) / 1000)
  assert.equal(await evaluate(`document.querySelector('.world-error')?.textContent ?? null`), null, 'Travel error toast visible at end of weekly census')
  assert.deepEqual(errors, [], `Browser errors: ${JSON.stringify(errors)}`)
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ ...report, screenshots: out }, null, 2))
} catch (error) { console.error(error.stack); console.error('Browser errors:', JSON.stringify(errors)); console.error('Chrome stderr tail:', chromeLogs.slice(-30).join('')); await writeFile(join(out, 'failure.json'), JSON.stringify({ error: String(error.stack || error), errors }, null, 2)).catch(() => {}); process.exitCode = 1 } finally {
  ws?.close(); for (const handle of [chrome, server]) if (handle?.pid) { if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(handle.pid), '/T', '/F'], { stdio: 'ignore' }); else handle.kill('SIGTERM') }
  await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }).catch(() => {})
}