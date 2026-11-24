// Walk-in building interior real-entry runtime check. One explicitly labelled
// synthetic project fixture, guest session, no live account or database writes.
// Proves: city -> dossier -> ENTER BUILDING -> interior paints, story holograms
// carry the record's real fields, WASD moves the camera, E opens the revival
// console at the pedestal, guest submit is honestly disabled, room controls are
// live, leave/re-enter is stable, and mobile fits.
import { spawn, spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
const root = dirname(fileURLToPath(import.meta.url)), screenshots = join(root, '../screenshots')
const args = process.argv.slice(2), flag = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const dev = args.includes('--dev')
const out = join(screenshots, flag('--out-dir') || (dev ? 'interior-v1-dev' : 'interior-v1-prod'))
await mkdir(out, { recursive: true })
const port = dev ? 5182 : 4182
const profile = await mkdtemp(join(tmpdir(), 'reboot-interior-'))
const server = spawn(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), ...(dev ? [] : ['preview']), '--config', 'vite.harness.config.ts', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'pipe' })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms)), errors = [], logs = [], chromeLogs = []
const started = Date.now(), mark = label => console.error(`[${((Date.now() - started) / 1000).toFixed(1)}s] ${label}`)
server.stdout.on('data', d => logs.push(String(d))); server.stderr.on('data', d => logs.push(String(d)))
let chrome, ws
async function untilHttp(url) { const start = Date.now(); while (Date.now() - start < 60000) { try { const r = await fetch(url); if (r.ok) return await r.text() } catch {} await delay(150) } throw new Error(`Unavailable: ${url}\n${logs.join('')}`) }
try {
  await untilHttp(`http://127.0.0.1:${port}`)
  chrome = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=9228', `--user-data-dir=${profile}`, '--window-size=1440,1000', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--enable-logging=stderr', '--disable-dev-shm-usage', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] })
  chrome.stderr.on('data', d => chromeLogs.push(String(d)))
  await untilHttp('http://127.0.0.1:9228/json/version')
  const targets = JSON.parse(await untilHttp('http://127.0.0.1:9228/json/list'))
  ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl)
  const pending = new Map(); let sequence = 0
  ws.addEventListener('message', e => { const msg = JSON.parse(e.data); if (msg.id) { const task = pending.get(msg.id); pending.delete(msg.id); if (msg.error) task?.reject(new Error(JSON.stringify(msg.error))); else task?.resolve(msg.result) } if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text); if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(msg.params.args.map(a => a.value ?? a.description ?? '').join(' ')) })
  // A dead debugger socket must fail loudly, never orphan a promise into a zombie run.
  ws.addEventListener('close', () => { for (const task of pending.values()) task.reject(new Error('CDP socket closed')); pending.clear() })
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }) })
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout after 120s: ${method}`)) }, 120000); pending.set(id, { resolve: v => { clearTimeout(timer); resolve(v) }, reject: e => { clearTimeout(timer); reject(e) } }); ws.send(JSON.stringify({ id, method, params })) })
  const evaluate = async expression => { const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text); return response.result.value }
  const wait = async (expression, ms = 120000) => { const start = Date.now(); while (Date.now() - start < ms) { if (await evaluate(expression)) return; await delay(150) } throw new Error(`Timed out: ${expression}\n${await evaluate('document.body.innerText.slice(-1800)')}`) }
  const pointerClick = async expression => { await wait(`(() => { const el = ${expression}; if (!el || el.disabled) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest('[inert]') })()`); const point = await evaluate(`(() => { const el = ${expression}; const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`); await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point }); await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point }) }
  const textClick = text => pointerClick(`[...document.querySelectorAll('button')].find(b => !b.disabled && b.getBoundingClientRect().width > 0 && b.textContent.toLowerCase().includes(${JSON.stringify(text.toLowerCase())}))`)
  const screenshot = async name => { const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true }); await writeFile(join(out, `interior-${dev ? 'dev' : 'prod'}-${name}.png`), Buffer.from(shot.data, 'base64')) }
  const setRange = (index, value) => evaluate(`(() => { const el = document.querySelectorAll('.interior-controls input[type=range]')[${index}]; const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set; set.call(el, ${value}); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return el.value })()`)
  const key = async (type, keyName, code, vk) => send('Input.dispatchKeyEvent', { type, key: keyName, code, windowsVirtualKeyCode: vk })
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
    await wait(`(() => { const w = document.querySelector('.dawn-world'); return w && w.dataset.city === ${JSON.stringify(city)} && w.dataset.travelPhase === 'idle' && w.dataset.renderReady === 'true' })()`, dev ? 300000 : 150000)
    // A slow first paint is not a failed journey: no error toast may survive arrival.
    const travelError = await evaluate(`document.querySelector('.world-error')?.textContent ?? null`)
    if (travelError) throw new Error(`Travel error toast after entering ${city}: ${travelError}`)
  }

  await send('Page.enable'); await send('Runtime.enable'); await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  // Guest session: no seeded token. One labelled synthetic abandoned AI project.
  const fixture = `
    const nativeFetch=window.fetch.bind(window);
    const idea={id:'aaaaaaaa-0000-4000-8000-000000000001',title:'Lumen Atlas',short_desc:'Synthetic test fixture: a community light-pollution mapper.',description:'Local UI test record. Not a real project.',category:'ai',status:'abandoned',creator_name:'Fixture Founder',is_anonymous:false,founded_year:2021,abandoned_year:2023,why_died:'Synthetic fixture story: the team ran out of runway before the satellite pass.',failure_story:null,last_words:'Synthetic lesson: cache the tile pipeline before scaling.',skills_required:['TypeScript','GIS','WebGL'],revival_score:34,views:150,upvotes:3,tech_stack:['React','PostGIS'],created_at:'2021-04-12T09:00:00Z',updated_at:'2023-11-02T18:30:00Z',user_id:null,building_customization:null};
    window.fetch=async(input,init)=>{const url=new URL(typeof input==='string'?input:input.url,location.href);if(!url.hostname.endsWith('.supabase.co'))return nativeFetch(input,init);const method=(init&&init.method||'GET').toUpperCase();if(method!=='GET'&&method!=='HEAD')return new Response(JSON.stringify({message:'Local UI test: writes blocked'}),{status:403,headers:{'Content-Type':'application/json'}});let data=[],range='0-0/0';if(url.pathname.endsWith('/ideas')){data=[idea];range='0-0/1'}else if(url.pathname.includes('/auth/v1/')){data=null}else if(url.pathname.endsWith('/planet_access_status')){data={hasAccess:false,isAdmin:false,daysRemaining:30}}return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json','Content-Range':range}})};
    localStorage.setItem('reboot-reduced-effects','false');localStorage.setItem('reboot-second-dawn-tutorial-v1','complete');localStorage.setItem('reboot-intro-v1','seen');
    window.addEventListener('DOMContentLoaded',()=>{const label=document.createElement('div');label.textContent='LOCAL UI TEST · SYNTHETIC PROJECT FIXTURE · GUEST · NO LIVE WRITES';label.style.cssText='position:fixed;top:0;left:50%;transform:translateX(-50%);font:8px monospace;letter-spacing:1px;background:#513b17;color:#ffe4ae;padding:5px 10px;z-index:999999;pointer-events:none';document.body.append(label)});
  `
  await send('Page.addScriptToEvaluateOnNewDocument', { source: fixture })
  mark('navigate direct planet (guest preview)')
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/?preview=1&page=planet` })
  await wait(`!!document.querySelector('.planet-toolbar')`, dev ? 240000 : 90000)
  await wait(`(() => { const skip = document.querySelector('.dawn-skip'); if (skip) { skip.click(); return false } const t = document.querySelector('.planet-toolbar'); return t && !t.inert && (!!document.querySelector('.descent-launch:not([disabled])') || !!document.querySelector('.city-destinations button:not([disabled])')) })()`, dev ? 480000 : 90000)
  mark('planet ready')

  const report = { mode: dev ? 'development' : 'production', steps: {} }
  // Enter AI City through the real portal travel flow.
  mark('travel to AI City started')
  await enterDistrict('AI', 'AI City')
  mark('AI City painted')
  await delay(1500)
  await screenshot('01-ai-city')

  // The fixture record must appear as a real project entry.
  await wait(`[...document.querySelectorAll('.world-projects button')].some(b => b.textContent.includes('Lumen Atlas'))`)
  await pointerClick(`[...document.querySelectorAll('.world-projects button')].find(b => b.textContent.includes('Lumen Atlas'))`)
  await wait(`[...document.querySelectorAll('button')].some(b => b.textContent.includes('ENTER BUILDING'))`)
  report.steps.dossier = await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('ENTER BUILDING')); return { enterButton: !!b, selected: document.querySelector('.world-projects button[aria-pressed=true]')?.textContent.trim() } })()`)
  await screenshot('02-dossier')
  mark('dossier open, entering building')
  await textClick('enter building')

  // Interior must mount, paint frames, and carry the record identity.
  await wait(`!!document.querySelector('.interior-overlay[data-interior-project="aaaaaaaa-0000-4000-8000-000000000001"]')`)
  await wait(`!!document.querySelector('.interior-overlay canvas')?.dataset.interiorPosition`, dev ? 120000 : 60000)
  await delay(2000)
  const identity = await evaluate(`(() => { const o = document.querySelector('.interior-overlay'); return { project: o.dataset.interiorProject, status: o.dataset.interiorStatus, kicker: document.querySelector('.interior-kicker')?.textContent, title: document.querySelector('.interior-top h2')?.textContent, coreTag: document.querySelector('.interior-core-tag')?.textContent, holos: [...document.querySelectorAll('.interior-holo')].map(h => h.textContent) } })()`)
  assert.equal(identity.status, 'abandoned')
  assert.ok(identity.kicker.includes('DERELICT'), `Abandoned mood missing: ${identity.kicker}`)
  assert.equal(identity.holos.length, 4, `Expected 4 story stations: ${identity.holos.length}`)
  const holoText = identity.holos.join('\n')
  for (const needle of ['Fixture Founder', '2021', '2023', 'runway', 'cache the tile pipeline', 'TypeScript']) assert.ok(holoText.includes(needle), `Story station missing real field "${needle}": ${holoText}`)
  report.steps.interiorIdentity = identity
  await screenshot('03-interior-arrival')
  mark('interior painted with real record fields')

  // Spawn is beside the lit console: E must open the revival console in-world.
  await wait(`document.querySelector('.interior-prompt')?.textContent.includes('E ·')`)
  await key('keyDown', 'e', 'KeyE', 69); await key('keyUp', 'e', 'KeyE', 69)
  await wait(`!!document.querySelector('.interior-revive')`)
  const guest = await evaluate(`(() => ({ note: document.querySelector('.interior-revive-note')?.textContent, submitDisabled: document.querySelector('.interior-revive button[type=submit]')?.disabled }))()`)
  assert.ok(guest.note && guest.note.includes('guest'), `Guest honesty note missing: ${JSON.stringify(guest)}`)
  assert.equal(guest.submitDisabled, true, 'Guest revival submit must be disabled')
  report.steps.guestConsole = guest
  await screenshot('04-revival-console-guest')
  await pointerClick(`document.querySelector('.interior-revive header button')`)
  await wait(`!document.querySelector('.interior-revive')`)
  mark('E interact + guest console verified')

  // WASD must move the presented camera position.
  const beforeWalk = await evaluate(`document.querySelector('.interior-overlay canvas').dataset.interiorPosition`)
  await key('keyDown', 'w', 'KeyW', 87)
  await wait(`document.querySelector('.interior-overlay canvas')?.dataset.interiorPosition !== ${JSON.stringify(beforeWalk)}`, 30000)
  await key('keyUp', 'w', 'KeyW', 87)
  const afterWalk = await evaluate(`document.querySelector('.interior-overlay canvas').dataset.interiorPosition`)
  assert.notEqual(beforeWalk, afterWalk, 'WASD did not move the interior camera')
  report.steps.walk = { beforeWalk, afterWalk }
  // The prompt is a live region that switches with proximity: walking forward
  // approaches the lit console, so it legitimately reads "E · Open revival
  // console" rather than the WASD hint. Accept either authored state.
  await wait(`(() => { const t = document.querySelector('.interior-prompt')?.textContent ?? ''; return t.includes('WASD') || t.includes('revival console') })()`)
  await screenshot('05-walked')
  mark(`walked ${beforeWalk} -> ${afterWalk}`)

  // Room controls must be live: sliders apply, holograms toggle, reset restores.
  await setRange(0, 6); await setRange(2, 85); await setRange(3, 1.3); await setRange(5, .8)
  await delay(800)
  const applied = await evaluate(`[...document.querySelectorAll('.interior-controls input[type=range]')].map(i => i.value)`)
  assert.deepEqual(applied, ['6', '1', '85', '1.3', '0.6', '0.8'], `Slider values not applied: ${applied}`)
  await evaluate(`document.querySelectorAll('.interior-check input')[0].click()`)
  await wait(`document.querySelectorAll('.interior-holo').length === 0`)
  await evaluate(`document.querySelectorAll('.interior-check input')[0].click()`)
  await wait(`document.querySelectorAll('.interior-holo').length === 4`)
  await pointerClick(`[...document.querySelectorAll('.interior-control-actions button')].find(b => b.textContent === 'Reset')`)
  await wait(`document.querySelectorAll('.interior-controls input[type=range]')[0].value === '4'`)
  report.steps.roomControls = { applied, holoToggle: true, reset: true }
  await screenshot('06-controls')
  mark('room controls live')

  // Leave and re-enter: mount/dispose stable, position resets.
  await pointerClick(`document.querySelector('.interior-exit')`)
  await wait(`!document.querySelector('.interior-overlay')`)
  await wait(`[...document.querySelectorAll('button')].some(b => b.textContent.includes('ENTER BUILDING'))`)
  await textClick('enter building')
  await wait(`document.querySelector('.interior-overlay canvas')?.dataset.interiorPosition === '0.00,7.80'`, dev ? 120000 : 60000)
  await delay(1500)
  report.steps.reentry = { positionReset: true }
  await screenshot('07-reentry')
  mark('re-entry stable')

  // Mobile: overlay, exit and controls must fit without overflow.
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await evaluate(`window.dispatchEvent(new Event('resize'))`)
  await delay(1800)
  const mobile = await evaluate(`(() => { const o = document.querySelector('.interior-overlay').getBoundingClientRect(); const p = document.querySelector('.interior-controls').getBoundingClientRect(); const x = document.querySelector('.interior-exit').getBoundingClientRect(); const c = document.querySelector('.interior-overlay canvas'); return { overlayW: Math.round(o.width), overlayH: Math.round(o.height), panelRight: Math.round(p.right), panelBottom: Math.round(p.bottom), exitVisible: x.width > 0 && x.right <= innerWidth + 1, canvasW: c.width, canvasH: c.height, viewportW: innerWidth, viewportH: innerHeight, docOverflowX: document.documentElement.scrollWidth > innerWidth + 1 } })()`)
  assert.ok(mobile.panelRight <= mobile.viewportW + 1 && mobile.panelBottom <= mobile.viewportH + 1 && !mobile.docOverflowX && mobile.exitVisible, `Mobile interior overflow: ${JSON.stringify(mobile)}`)
  assert.ok(mobile.canvasW > 300 && mobile.canvasH > 300, `Mobile interior canvas mis-sized: ${JSON.stringify(mobile)}`)
  report.steps.mobile = mobile
  await screenshot('08-mobile-interior')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await delay(800)

  // Exit chain: leave building, Escape closes the dossier, city still alive.
  await pointerClick(`document.querySelector('.interior-exit')`)
  await wait(`!document.querySelector('.interior-overlay')`)
  await key('keyDown', 'Escape', 'Escape', 27); await key('keyUp', 'Escape', 'Escape', 27)
  await wait(`![...document.querySelectorAll('button')].some(b => b.textContent.includes('ENTER BUILDING'))`)
  const cityAlive = await evaluate(`(() => { const w = document.querySelector('.dawn-world'); return { city: w?.dataset.city, renderReady: w?.dataset.renderReady } })()`)
  assert.equal(cityAlive.city, 'AI')
  report.steps.exitChain = cityAlive
  mark('exit chain clean')

  assert.equal(await evaluate(`document.querySelector('.world-error')?.textContent ?? null`), null, 'Travel error toast visible at end of interior flow')
  assert.deepEqual(errors, [], `Browser errors: ${JSON.stringify(errors)}`)
  report.errors = errors
  report.screenshots = out
  console.log(JSON.stringify(report, null, 2))
} catch (error) { console.error(error.stack); console.error('Browser errors:', JSON.stringify(errors)); console.error('Chrome stderr tail:', chromeLogs.slice(-30).join('')); process.exitCode = 1 } finally {
  ws?.close(); for (const handle of [chrome, server]) if (handle?.pid) { if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(handle.pid), '/T', '/F'], { stdio: 'ignore' }); else handle.kill('SIGTERM') }
  await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }).catch(() => {})
}