'use strict';
// evidence.js — 감정물 반환(워크스페이스 앱). 의뢰관서 · 접수번호 · 감정인을 잇고, 반환대기 → 반환완료를 기록한다.
// 데이터는 워크스페이스마다 state.json 옆 evidence.json 하나:
//   agencies [{id, name}] · examiners [{id, name, dept}] · cases [{no, ag, date, title}]
//   assigns  [{id, no, ex, role 주|부, items, loc, st ing|ready|hold|done, memo, doneAt, updatedAt, by}]  — 접수번호 × 감정인
//   returns  [{id, at, ag, who, by, ids}]
// 라우트: GET /api/evidence · POST /api/evidence {action: add|status|edit|remove|import|return|agency.add|examiner.add}

const STATUSES = ['ing', 'ready', 'hold'];
const MAX_ROWS = 2000;

function createEvidenceApi({ fileOf, writeJsonAtomic, readJsonStrict, sendJson }) {
  const empty = () => ({ version: 1, next: 1, agencies: [], examiners: [], cases: [], assigns: [], returns: [] });
  function load(ws) {
    const d = readJsonStrict(fileOf(ws), empty);
    if (!d || typeof d !== 'object' || Array.isArray(d)) return empty();
    for (const k of ['agencies', 'examiners', 'cases', 'assigns', 'returns']) if (!Array.isArray(d[k])) d[k] = [];
    if (!Number.isInteger(d.next) || d.next < 1) d.next = 1;
    if (typeof d.version !== 'number') d.version = 1;
    return d;
  }
  const cut = (v, n) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n);
  const normDate = (s) => { const m = String(s || '').match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/); return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : new Date().toISOString().slice(0, 10); };
  const stamp = () => { const d = new Date(), p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };

  // 이름이 조금 달라도(“서울강남경찰서” ↔ “서울강남경찰서 형사과”) 같은 관서로 본다
  const findAg = (d, name) => d.agencies.find((a) => a.name === name) || (name.length >= 4 ? d.agencies.find((a) => a.name.includes(name) || name.includes(a.name)) : undefined);
  const findEx = (d, name) => d.examiners.find((e) => e.name === name);
  function ensureAg(d, name, r) { let a = findAg(d, name); if (!a) { a = { id: 'a' + d.next++, name }; d.agencies.push(a); if (r) r.nA++; } return a; }
  function ensureEx(d, name, dept, r) { let e = findEx(d, name); if (!e) { e = { id: 'e' + d.next++, name, dept: cut(dept, 40) || '미지정' }; d.examiners.push(e); if (r) r.nE++; } return e; }
  function ensureCase(d, no, agName, title, date) {
    let c = d.cases.find((x) => x.no === no);
    if (!c) { c = { no, ag: ensureAg(d, agName).id, date: normDate(date), title: title || '사건명 미입력' }; d.cases.push(c); }
    return c;
  }
  const newAssign = (d, no, ex, f, st, by) => {
    // 역할을 안 정했으면 그 접수번호의 첫 감정인이 주, 나머지는 부
    const role = f.role === '주' || f.role === '부' ? f.role : d.assigns.some((x) => x.no === no) ? '부' : '주';
    const a = { id: d.next++, no, ex, role,
      items: cut(f.items, 300) || '품목 미입력', loc: cut(f.loc, 40) || '미지정', st, memo: cut(f.memo, 300), doneAt: '', updatedAt: new Date().toISOString(), by };
    d.assigns.push(a); return a;
  };

  return async function handle(req, res, url, { ws, csrfOk, jsonBody, broadcast, actor, audit }) {
    const p = url.pathname;
    if (p !== '/api/evidence') return false;
    if (req.method === 'GET') return sendJson(res, 200, load(ws)), true;
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'method not allowed' }), true;
    if (!csrfOk(req)) return sendJson(res, 403, { error: 'forbidden (origin/content-type)' }), true;
    const body = await jsonBody(req, res, 2 * 1024 * 1024); if (!body) return true;
    const d = load(ws), me = actor;
    const save = () => { d.version += 1; writeJsonAtomic(fileOf(ws), d); broadcast({ kind: 'evidence', version: d.version }); };
    const done = (extra) => { save(); return sendJson(res, 200, { ok: true, version: d.version, ...extra }), true; };
    const bad = (code, error) => (sendJson(res, code, { error }), true);
    const byId = () => d.assigns.find((a) => a.id === Number(body.id));

    switch (body.action) {
      case 'add': {
        const no = cut(body.no, 40), agency = cut(body.agency, 80), exName = cut(body.examiner, 40);
        if (!no || !exName) return bad(400, '접수번호와 감정인을 입력하세요');
        if (!d.cases.some((c) => c.no === no) && !agency) return bad(400, '새 접수번호는 의뢰관서가 필요합니다');
        const ex = findEx(d, exName);
        if (ex && d.assigns.some((a) => a.no === no && a.ex === ex.id)) return bad(409, `${exName} 감정인은 이미 ${no}을 담당하고 있습니다`);
        ensureCase(d, no, agency, cut(body.title, 80), body.date);
        const a = newAssign(d, no, ensureEx(d, exName, body.dept).id, body, 'ing', me);
        audit(me, 'evidence.add', `${no} ${exName}`);
        return done({ item: a });
      }
      case 'status': {
        const a = byId(); if (!a) return bad(404, '항목을 찾을 수 없습니다');
        if (!STATUSES.includes(body.st)) return bad(400, 'st must be ing|ready|hold');
        if (a.st === 'done') return bad(409, '이미 반환완료된 항목입니다');
        a.st = body.st; a.updatedAt = new Date().toISOString();
        return done({ item: a });
      }
      case 'edit': {
        const a = byId(); if (!a) return bad(404, '항목을 찾을 수 없습니다');
        if (body.items !== undefined) a.items = cut(body.items, 300) || a.items;
        if (body.loc !== undefined) a.loc = cut(body.loc, 40) || a.loc;
        if (body.role === '주' || body.role === '부') a.role = body.role;
        if (body.memo !== undefined) a.memo = cut(body.memo, 300);
        a.updatedAt = new Date().toISOString();
        return done({ item: a });
      }
      case 'remove': {
        const a = byId(); if (!a) return bad(404, '항목을 찾을 수 없습니다');
        if (a.st === 'done') return bad(409, '반환완료된 항목은 지울 수 없습니다(이력 보존)');
        d.assigns = d.assigns.filter((x) => x !== a);
        if (!d.assigns.some((x) => x.no === a.no)) d.cases = d.cases.filter((c) => c.no !== a.no);
        audit(me, 'evidence.remove', a.no);
        return done({});
      }
      // 엑셀 접수처리부에서 체크한 행 → 반환대기. 없는 관서·감정인·접수번호는 만든다. 반환완료는 건드리지 않는다.
      case 'import': {
        const rows = Array.isArray(body.rows) ? body.rows.slice(0, MAX_ROWS) : [];
        if (!rows.length) return bad(400, 'rows[] required');
        const r = { n: 0, nN: 0, nU: 0, nA: 0, nE: 0, skipped: 0, ag: '' };
        for (const x of rows) {
          const no = cut(x.no, 40), agency = cut(x.agency, 80), exName = cut(x.examiner, 40);
          if (!no || !exName || (!agency && !d.cases.some((c) => c.no === no))) { r.skipped++; continue; }
          if (agency && !findAg(d, agency)) ensureAg(d, agency, r);
          const c = ensureCase(d, no, agency, cut(x.title, 80), x.date);
          const ex = ensureEx(d, exName, '', r);
          const a = d.assigns.find((z) => z.no === no && z.ex === ex.id);
          if (a && a.st === 'done') { r.skipped++; continue; }
          if (a) { a.st = 'ready'; a.updatedAt = new Date().toISOString(); r.nU++; }
          else { newAssign(d, no, ex.id, x, 'ready', me); r.nN++; }
          r.n++; r.ag = r.ag || c.ag;
        }
        if (!r.n) return bad(400, '등록할 수 있는 행이 없습니다');
        audit(me, 'evidence.import', `${r.n} rows`);
        return done({ result: r });
      }
      case 'return': {
        const ids = (Array.isArray(body.ids) ? body.ids : []).map(Number);
        const list = d.assigns.filter((a) => ids.includes(a.id) && a.st === 'ready');
        if (!list.length) return bad(400, '반환대기인 항목을 고르세요');
        const who = cut(body.receiver, 80); if (!who) return bad(400, '수령자를 입력하세요');
        const at = stamp();
        for (const a of list) { a.st = 'done'; a.doneAt = at; a.updatedAt = new Date().toISOString(); }
        const ag = (d.cases.find((c) => c.no === list[0].no) || {}).ag || '';
        const rec = { id: d.next++, at, ag, who, by: cut(body.by, 40) || me, ids: list.map((a) => a.id) };
        d.returns.push(rec);
        audit(me, 'evidence.return', `${list.length} items → ${who}`);
        return done({ record: rec });
      }
      case 'agency.add': {
        const name = cut(body.name, 80); if (!name) return bad(400, '관서명을 입력하세요');
        if (d.agencies.some((a) => a.name === name)) return bad(409, '이미 있는 관서입니다');
        return done({ item: ensureAg(d, name) });
      }
      case 'examiner.add': {
        const name = cut(body.name, 40); if (!name) return bad(400, '이름을 입력하세요');
        if (findEx(d, name)) return bad(409, '이미 있는 감정인입니다');
        return done({ item: ensureEx(d, name, body.dept) });
      }
      default: return bad(400, 'action must be add|status|edit|remove|import|return|agency.add|examiner.add');
    }
  };
}

module.exports = { createEvidenceApi };
