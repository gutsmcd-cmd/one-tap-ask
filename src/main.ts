import './style.css'
import { askPersist, load, save } from './db'
import { dict, type Dict, type Lang } from './i18n'
import { AIS, type AiId } from './ai'
import { BUILTINS, type Field } from './templates'

const DB = 'one-tap-ask'
type Custom = { id: string; icon: string; title: string; body: string }
type Settings = { ai: AiId; theme: 'dark' | 'light'; order: string[]; favs: string[] }
type Tpl = { id: string; icon: string; title: string; sub: string; fields: Field[]; body: string; custom: boolean }

let ui: Lang = 'ja'
let t: Dict = dict.ja
let S: Settings = { ai: 'grok', theme: 'dark', order: [], favs: [] }
let C: Custom[] = []
let editing = false
const vals: Record<string, Record<string, string>> = {}

const app = document.querySelector<HTMLDivElement>('#app')!

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag)
  if (cls) n.className = cls
  if (text) n.textContent = text
  return n
}
function btn(cls: string, text: string, on: () => void): HTMLButtonElement {
  const b = el('button', cls, text)
  b.type = 'button'
  b.addEventListener('click', on)
  return b
}
const persist = () => { void save(DB, 'settings', S); void save(DB, 'custom', C) }

let toastTimer = 0
function toast(msg: string) {
  let n = document.querySelector<HTMLDivElement>('.toast')
  if (!n) { n = el('div', 'toast'); n.setAttribute('role', 'status'); document.body.append(n) }
  n.textContent = msg
  n.hidden = false
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { n!.hidden = true }, 3500)
}

// ---------- templates ----------
const SPECIAL = new Set(['now', 'today'])
export function placeholders(body: string): string[] {
  const out: string[] = []
  for (const m of body.matchAll(/\{([^{}\n]{1,40})\}/g)) {
    const k = m[1].trim()
    if (k && !SPECIAL.has(k) && !out.includes(k)) out.push(k)
  }
  return out
}
function allTemplates(): Tpl[] {
  const b: Tpl[] = BUILTINS.map((x) => ({ id: x.id, icon: x.icon, title: x.title[ui], sub: x.sub[ui], fields: x.fields, body: x.body[ui], custom: false }))
  const c: Tpl[] = C.map((x) => ({
    id: x.id, icon: x.icon || '💬', title: x.title, sub: '', body: x.body, custom: true,
    fields: placeholders(x.body).map((k) => ({ key: k, label: { ja: k, en: k }, type: 'text' as const, optional: true })),
  }))
  const all = [...b, ...c]
  const idx = (id: string) => { const i = S.order.indexOf(id); return i < 0 ? 1e6 + all.findIndex((x) => x.id === id) : i }
  return all.sort((x, y) => idx(x.id) - idx(y.id))
}

const pad = (n: number) => String(n).padStart(2, '0')
const localDT = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
function human(v: string, type: string): string {
  if (!v) return v
  const d = new Date(type === 'date' ? v + 'T00:00' : v)
  if (isNaN(d.getTime())) return v
  const wk = (ui === 'ja' ? '日月火水木金土' : '').charAt(d.getDay())
  const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: ui === 'ja' ? undefined : 'short' }
  let s = d.toLocaleDateString(ui === 'ja' ? 'ja-JP' : 'en-GB', opts) + (wk ? `（${wk}）` : '')
  if (type === 'datetime') s += ` ${pad(d.getHours())}:${pad(d.getMinutes())}`
  return s
}
function defaultVal(f: Field): string {
  if (f.def === 'now') return localDT()
  if (f.def === 'today') return localDT().slice(0, 10)
  if (f.key === 'people') return '2'
  if (f.key === 'mins') return '20'
  if (f.key === 'lang') return ui === 'ja' ? '英語' : 'Japanese'
  return ''
}
export function buildPrompt(tpl: Tpl, v: Record<string, string>): string {
  const now = new Date()
  return tpl.body.replace(/\{([^{}\n]{1,40})\}/g, (whole, raw: string) => {
    const k = raw.trim()
    if (k === 'now') return human(localDT(now), 'datetime')
    if (k === 'today') return human(localDT(now).slice(0, 10), 'date')
    const f = tpl.fields.find((x) => x.key === k)
    if (!f) return whole
    const val = (v[k] ?? '').trim()
    if (!val) return t.none
    return f.type === 'datetime' || f.type === 'date' ? human(val, f.type) : val
  })
}

// ---------- sending ----------
async function copy(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true } catch { /* fall through */ }
  try {
    const ta = el('textarea'); ta.value = text; document.body.append(ta); ta.select()
    const ok = document.execCommand('copy'); ta.remove(); return ok
  } catch { return false }
}
function send(id: AiId, prompt: string) {
  const ai = AIS.find((a) => a.id === id)!
  const url = ai.url(prompt)
  ;(window as unknown as { __lastOpen?: string }).__lastOpen = url
  void copy(prompt)
  window.open(url, '_blank', 'noopener')
  toast(ai.prefill ? t.copied : t.pasteToast)
}
async function share(prompt: string) {
  if (navigator.share) {
    try { await navigator.share({ text: prompt }); return } catch (e) { if ((e as Error).name === 'AbortError') return }
  }
  await copy(prompt)
  toast(t.shareNo)
}

// ---------- views ----------
function header(title: string, lead: string, backTo?: () => void) {
  const top = el('header', 'top')
  const left = el('div')
  if (backTo) left.append(btn('pill back', t.back, backTo))
  left.append(el('h1', 'title', title))
  if (lead) left.append(el('p', 'lead', lead))
  const tools = el('div', 'tools')
  tools.append(
    btn('pill', t.toggle, () => { setLang(ui === 'ja' ? 'en' : 'ja'); route() }),
    btn('pill', S.theme === 'dark' ? t.light : t.dark, () => { S.theme = S.theme === 'dark' ? 'light' : 'dark'; applyTheme(); persist(); route() }),
  )
  top.append(left, tools)
  return top
}

function home() {
  app.replaceChildren(header(t.app, t.lead))
  const bar = el('div', 'bar')
  const aiSel = el('label', 'aisel')
  aiSel.append(el('span', '', t.defaultAi))
  const sel = el('select'); sel.id = 'default-ai'
  for (const a of AIS) { const o = el('option', '', a.name); o.value = a.id; o.selected = a.id === S.ai; sel.append(o) }
  sel.addEventListener('change', () => { S.ai = sel.value as AiId; persist() })
  aiSel.append(sel)
  bar.append(aiSel, btn('pill', editing ? t.doneEdit : t.edit, () => { editing = !editing; home() }))
  app.append(bar)

  const list = allTemplates()
  const favs = list.filter((x) => S.favs.includes(x.id))
  const rest = list.filter((x) => !S.favs.includes(x.id))
  if (favs.length) { app.append(el('h2', 'sec', '★ ' + t.favs)); app.append(grid(favs, list)) }
  if (favs.length) app.append(el('h2', 'sec', t.all))
  app.append(grid(rest, list))

  if (editing) {
    const tools = el('div', 'edit-tools')
    tools.append(btn('big primary', t.newT, () => editor()), btn('big', t.exportB, doExport), btn('big', t.importB, doImport))
    app.append(tools)
  }
  app.append(el('p', 'foot', t.offline), el('p', 'foot', t.foot))
}

function grid(items: Tpl[], full: Tpl[]) {
  const g = el('div', 'grid')
  for (const tp of items) {
    const tile = el('div', 'tile' + (editing ? ' editing' : ''))
    tile.dataset.id = tp.id
    const main = btn('tile-b', '', () => (editing ? (tp.custom ? editor(tp.id) : undefined) : fill(tp.id)))
    main.append(el('span', 'ic', tp.icon), el('span', 'tt', tp.title))
    if (tp.sub) main.append(el('span', 'ts', tp.sub))
    tile.append(main)
    if (editing) {
      const row = el('div', 'tile-tools')
      const isFav = S.favs.includes(tp.id)
      const star = btn('mini' + (isFav ? ' on' : ''), isFav ? '★' : '☆', () => {
        S.favs = isFav ? S.favs.filter((x) => x !== tp.id) : [...S.favs, tp.id]; persist(); home()
      })
      star.setAttribute('aria-label', t.star); star.dataset.act = 'fav'
      const mv = (d: number) => {
        const ids = full.map((x) => x.id); const i = ids.indexOf(tp.id); const j = i + d
        if (j < 0 || j >= ids.length) return
        ;[ids[i], ids[j]] = [ids[j], ids[i]]; S.order = ids; persist(); home()
      }
      const up = btn('mini', '↑', () => mv(-1)); up.setAttribute('aria-label', t.up); up.dataset.act = 'up'
      const dn = btn('mini', '↓', () => mv(1)); dn.setAttribute('aria-label', t.down); dn.dataset.act = 'down'
      const ed = btn('mini', '✎', () => (tp.custom ? editor(tp.id) : editor(undefined, tp)))
      ed.setAttribute('aria-label', tp.custom ? t.editT : t.copyEdit); ed.dataset.act = 'edit'
      row.append(star, up, dn, ed)
      tile.append(row)
    }
    g.append(tile)
  }
  return g
}

function fill(id: string) {
  const tp = allTemplates().find((x) => x.id === id)
  if (!tp) return home()
  location.hash = '#t=' + encodeURIComponent(id)
  app.replaceChildren(header(tp.icon + ' ' + tp.title, tp.sub, () => { location.hash = ''; home() }))
  const v = (vals[id] ??= {})
  for (const f of tp.fields) if (v[f.key] === undefined || f.def === 'now') v[f.key] = defaultVal(f)

  const form = el('div', 'card form')
  const pre = el('textarea', 'preview'); pre.id = 'prompt'; pre.rows = 10
  let dirty = false
  const refresh = () => { if (!dirty) pre.value = buildPrompt(tp, v) }
  for (const f of tp.fields) {
    const lab = el('label', 'field')
    lab.append(el('span', '', f.label[ui]))
    const inp = f.type === 'long' ? el('textarea') : el('input')
    if (inp instanceof HTMLInputElement) {
      inp.type = { text: 'text', datetime: 'datetime-local', date: 'date', url: 'url', number: 'number', long: 'text' }[f.type]
      if (f.type === 'number') inp.inputMode = 'numeric'
    } else inp.rows = 3
    inp.name = f.key
    inp.value = v[f.key] ?? ''
    if (f.ph) inp.placeholder = f.ph[ui]
    inp.addEventListener('input', () => { v[f.key] = inp.value; dirty = false; refresh() })
    lab.append(inp)
    form.append(lab)
  }
  pre.addEventListener('input', () => { dirty = true })
  const pl = el('label', 'field'); pl.append(el('span', '', t.preview), pre)
  form.append(pl)
  app.append(form)
  refresh()

  const sends = el('div', 'sends')
  const ordered = [...AIS].sort((a, b) => (a.id === S.ai ? -1 : b.id === S.ai ? 1 : 0))
  for (const a of ordered) {
    const b = btn('big send' + (a.id === S.ai ? ' primary' : ''), `${a.name}${a.id === S.ai ? ' ★' : ''}`, () => send(a.id, pre.value))
    b.dataset.ai = a.id
    sends.append(b)
  }
  const cp = btn('big', t.copy, async () => { if (await copy(pre.value)) toast(t.copied) }); cp.dataset.ai = 'copy'
  const sh = btn('big', t.share, () => void share(pre.value)); sh.dataset.ai = 'share'
  sends.append(cp, sh)
  app.append(sends)
  window.scrollTo(0, 0)
}

function editor(id?: string, from?: Tpl) {
  const existing = id ? C.find((x) => x.id === id) : undefined
  const draft: Custom = existing ? { ...existing } : {
    id: 'c' + Date.now().toString(36), icon: from?.icon ?? '💬', title: from ? from.title + (ui === 'ja' ? '（自分用）' : ' (mine)') : '', body: from?.body ?? '',
  }
  app.replaceChildren(header(t.editT, '', () => home()))
  const form = el('div', 'card form')
  const mk = (label: string, node: HTMLInputElement | HTMLTextAreaElement, help = '') => {
    const l = el('label', 'field'); l.append(el('span', '', label), node); if (help) l.append(el('small', 'help', help)); form.append(l)
  }
  const ic = el('input'); ic.name = 'icon'; ic.value = draft.icon; ic.maxLength = 4
  const ti = el('input'); ti.name = 'title'; ti.value = draft.title
  const bo = el('textarea'); bo.name = 'body'; bo.rows = 12; bo.value = draft.body
  mk(t.icon, ic); mk(t.titleL, ti); mk(t.bodyL, bo, t.bodyHelp)
  app.append(form)
  const row = el('div', 'sends')
  row.append(btn('big primary', t.save, () => {
    draft.icon = ic.value.trim() || '💬'; draft.title = ti.value.trim() || '…'; draft.body = bo.value
    const i = C.findIndex((x) => x.id === draft.id)
    if (i >= 0) C[i] = draft; else C.push(draft)
    persist(); home()
  }))
  if (existing) row.append(btn('big', t.del, () => {
    if (!confirm(t.delQ)) return
    C = C.filter((x) => x.id !== draft.id); S.favs = S.favs.filter((x) => x !== draft.id); S.order = S.order.filter((x) => x !== draft.id); persist(); home()
  }))
  row.append(btn('big', t.cancel, () => home()))
  app.append(row)
}

function doExport() {
  const data = JSON.stringify({ app: 'one-tap-ask', version: 1, templates: C, favs: S.favs, order: S.order }, null, 2)
  const a = el('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' })); a.download = 'one-tap-ask.json'
  document.body.append(a); a.click(); a.remove()
}
function doImport() {
  const inp = el('input'); inp.type = 'file'; inp.accept = 'application/json,.json'
  inp.addEventListener('change', async () => {
    try {
      const j = JSON.parse(await inp.files![0].text()) as { templates?: Custom[]; favs?: string[] }
      const list = (j.templates ?? []).filter((x) => x && typeof x.body === 'string' && typeof x.title === 'string')
      if (!list.length) throw new Error('empty')
      for (const x of list) {
        const c: Custom = { id: String(x.id || 'c' + Math.random().toString(36).slice(2)), icon: String(x.icon || '💬').slice(0, 4), title: x.title, body: x.body }
        const i = C.findIndex((y) => y.id === c.id); if (i >= 0) C[i] = c; else C.push(c)
      }
      for (const f of j.favs ?? []) if (!S.favs.includes(f)) S.favs.push(f)
      persist(); home(); toast(`${list.length} ${t.imported}`)
    } catch { toast(t.importBad) }
  })
  inp.click()
}

function applyTheme() {
  document.documentElement.dataset.theme = S.theme
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', S.theme === 'dark' ? '#1b1f3a' : '#f4f2fb')
}
function setLang(l: Lang) {
  ui = l; t = dict[l]; document.documentElement.lang = l; document.title = t.app; void save(DB, 'lang', l)
}
function route() {
  const m = /^#t=(.+)$/.exec(location.hash)
  if (m) fill(decodeURIComponent(m[1])); else home()
}

;(async () => {
  const [l, s, c] = await Promise.all([load<Lang>(DB, 'lang'), load<Settings>(DB, 'settings'), load<Custom[]>(DB, 'custom')])
  if (s) S = { ...S, ...s }
  if (Array.isArray(c)) C = c
  const q = new URLSearchParams(location.search).get('lang')
  setLang(q === 'en' || q === 'ja' ? q : l ?? 'ja')
  applyTheme()
  route()
  void askPersist()
})()
window.addEventListener('popstate', () => { if (!location.hash) home() })
