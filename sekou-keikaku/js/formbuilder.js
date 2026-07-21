/* ============================================================
   フォームビルダー
   SCHEMA[工種] を読んで、入力フォームのDOMを生成する。
   入力収集・バリデーション・動的出し分けも担う。
   工種固有のロジックは持たない（すべてスキーマ駆動）。
   ============================================================ */

const FormBuilder = (() => {
  let current = null;      // 現在の工種スキーマ
  let repeatCounters = {}; // repeatセクションごとの通し番号

  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };

  /* ---- 単一フィールドのDOM生成 ---- */
  function buildField(f, scope) {
    const wrap = el('div', f.full ? 'full' : '');
    const fid = scope + '__' + f.id;

    if (f.type === 'checks') {
      wrap.appendChild(el('span', 'fld' + (f.required ? ' req' : ''), f.label));
      const box = el('div', 'checks');
      box.id = fid;
      if (f.role) box.dataset.role = f.role;
      f.options.forEach(o => {
        const lab = el('label', 'chk');
        lab.innerHTML = `<input type="checkbox" value="${o.value}">${o.label}`;
        box.appendChild(lab);
      });
      wrap.appendChild(box);
      return wrap;
    }

    const label = el('label', 'fld' + (f.required ? ' req' : ''), f.label);
    label.setAttribute('for', fid);
    wrap.appendChild(label);

    let input;
    if (f.type === 'textarea') {
      input = el('textarea');
    } else if (f.type === 'select') {
      input = el('select');
      if (f.partsOptions) {
        input.classList.add('parts-linked');
        input.appendChild(new Option('全部位共通', '全部位共通'));
      } else {
        (f.options || []).forEach(o => input.appendChild(new Option(o.label, o.value)));
      }
    } else {
      input = el('input');
      input.type = f.type;
      if (f.step) input.step = f.step;
      if (f.type === 'number') input.min = '0';
    }
    input.id = fid;
    if (f.role) input.dataset.role = f.role;
    if (f.placeholder) input.placeholder = f.placeholder;
    wrap.appendChild(input);
    return wrap;
  }

  /* ---- 通常セクションのフィールド群 ---- */
  function buildFields(fields, scope) {
    const grid = el('div', 'grid');
    fields.forEach(f => grid.appendChild(buildField(f, scope)));
    return grid;
  }

  /* ---- repeatブロック ---- */
  function buildRepeat(sec) {
    const holder = el('div');
    const list = el('div');
    list.id = sec.id + '__list';
    holder.appendChild(list);
    const btn = el('button', 'add-btn', sec.repeat.addLabel);
    btn.type = 'button';
    btn.onclick = () => addRepeatBlock(sec);
    holder.appendChild(btn);
    return holder;
  }

  function addRepeatBlock(sec) {
    repeatCounters[sec.id] = (repeatCounters[sec.id] || 0) + 1;
    const n = repeatCounters[sec.id];
    const block = el('div', 'mix-block');
    block.dataset.block = sec.id;
    if (n > 1) {
      const rm = el('button', 'rm', '削除');
      rm.type = 'button';
      rm.onclick = () => block.remove();
      block.appendChild(rm);
    }
    const grid = el('div', 'grid');
    sec.repeat.fields.forEach(f => {
      const scoped = { ...f, id: f.id };
      const cell = buildField(scoped, sec.id + '_' + n);
      // repeat内はfield idにブロック番号が入る。収集時は class で拾う
      const control = cell.querySelector('input,select,textarea');
      if (control) control.classList.add('rp-' + f.id);
      grid.appendChild(cell);
    });
    block.appendChild(grid);
    document.getElementById(sec.id + '__list').appendChild(block);
    syncPartsOptions();
  }

  /* ---- 部位連動（parts の選択を repeat 内 select に流す）---- */
  function syncPartsOptions() {
    const parts = getChecks('basic__parts');
    document.querySelectorAll('select.parts-linked').forEach(sel => {
      const cur = sel.value;
      sel.innerHTML = '';
      sel.appendChild(new Option('全部位共通', '全部位共通'));
      parts.forEach(p => sel.appendChild(new Option(p, p)));
      if ([...sel.options].some(o => o.value === cur)) sel.value = cur;
    });
  }

  /* ---- dynamicセクション/サブブロックの表示制御 ---- */
  function applyRules() {
    if (!current.rules) return;
    current.rules.forEach(rule => {
      if (rule.kind === 'dateRangeSeason') {
        const s = detectSeasons(rule.startField, rule.endField);
        // バッジ
        const bc = document.getElementById('badge-cold');
        const bh = document.getElementById('badge-hot');
        if (bc) bc.classList.toggle('show', s.cold);
        if (bh) bh.classList.toggle('show', s.hot);
        // サブブロック
        toggleSub('season__cold', s.cold);
        toggleSub('season__hot', s.hot);
        // セクション本体
        const sec = document.getElementById('sec-season');
        if (sec) sec.classList.toggle('show', s.cold || s.hot);
      }
      if (rule.kind === 'checksInclude') {
        const [secId, fldId] = rule.field.split('.');
        const vals = getChecks(secId + '__' + fldId);
        Object.entries(rule.subMap).forEach(([val, target]) => {
          const [ts, tb] = target.split('.');
          toggleSub(ts + '__' + tb, vals.includes(val));
        });
      }
    });
  }

  function toggleSub(subDomId, show) {
    const e = document.getElementById(subDomId);
    if (e) e.classList.toggle('show', show);
  }

  function detectSeasons(startId, endId) {
    const res = { cold: false, hot: false };
    const s = document.getElementById('basic__' + startId)?.value;
    const e = document.getElementById('basic__' + endId)?.value;
    if (!s || !e) return res;
    let d = new Date(s + 'T00:00:00');
    const end = new Date(e + 'T00:00:00');
    if (isNaN(d) || isNaN(end) || d > end) return res;
    let guard = 0;
    while (d <= end && guard < 120) {
      const m = d.getMonth() + 1;
      if ([11,12,1,2,3].includes(m)) res.cold = true;
      if ([6,7,8,9].includes(m)) res.hot = true;
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      guard++;
    }
    return res;
  }

  /* ---- セクション描画 ---- */
  function buildSection(sec) {
    const card = el('div', 'sec');
    if (sec.dynamic) { card.id = 'sec-' + sec.id; card.classList.add('dyn'); }
    const head = el('div', 'sec-head');
    head.appendChild(el('div', 'sec-num', sec.num));
    head.appendChild(el('h2', null, sec.title));
    card.appendChild(head);

    if (sec.note) card.appendChild(el('div', 'season-note', sec.note));
    if (sec.lookat) card.appendChild(el('div', 'lookat', '📐 <b>どこを見る：</b>' + sec.lookat));

    if (sec.fields) card.appendChild(buildFields(sec.fields, sec.id));
    if (sec.repeat) card.appendChild(buildRepeat(sec));

    // 季節バッジ
    if (sec.seasonBadges) {
      const bwrap = el('div', 'season-badges');
      bwrap.innerHTML =
        '<span class="badge cold" id="badge-cold">❄ 工期に冬期を含むため「寒中コンクリート」対策の入力欄を表示しています</span>' +
        '<span class="badge hot" id="badge-hot">☀ 工期に夏期を含むため「暑中コンクリート」対策の入力欄を表示しています</span>';
      card.appendChild(bwrap);
    }

    // サブブロック（季節 or 継手）
    if (sec.subs) {
      sec.subs.forEach(sub => {
        const sd = el('div', 'season-sub ' + (sub.tone || 'neutral'));
        sd.id = sec.id + '__' + sub.id;
        sd.appendChild(el('h3', null, sub.title));
        sd.appendChild(buildFields(sub.fields, sec.id + '_' + sub.id));
        card.appendChild(sd);
      });
    }
    return card;
  }

  /* ---- 工種の描画 ---- */
  function render(kindId, mountEl) {
    current = SCHEMA[kindId];
    repeatCounters = {};
    mountEl.innerHTML = '';
    current.sections.forEach(sec => mountEl.appendChild(buildSection(sec)));

    // repeatは初期1ブロック
    current.sections.filter(s => s.repeat).forEach(s => addRepeatBlock(s));

    // イベント結線
    const partsBox = document.getElementById('basic__parts');
    if (partsBox) partsBox.addEventListener('change', () => { syncPartsOptions(); });

    // 日付（dateRangeSeason）は role で結線
    current.sections.forEach(sec => {
      (sec.fields || []).forEach(f => {
        if (f.role === 'dateStart' || f.role === 'dateEnd') {
          document.getElementById('basic__' + f.id)?.addEventListener('change', applyRules);
        }
      });
    });
    // checksInclude ルールの起点チェックを結線（工種を問わず全ルール対象）
    (current.rules || []).forEach(rule => {
      if (rule.kind === 'checksInclude') {
        const [secId, fldId] = rule.field.split('.');
        document.getElementById(secId + '__' + fldId)?.addEventListener('change', applyRules);
      }
    });
    applyRules();
  }

  /* ---- 収集ユーティリティ ---- */
  function val(domId) {
    const e = document.getElementById(domId);
    if (!e) return null;
    const v = (e.value || '').trim();
    if (v === '') return null;
    return e.type === 'number' ? Number(v) : v;
  }
  function getChecks(domId) {
    return Array.from(document.querySelectorAll('#' + domId + ' input:checked')).map(c => c.value);
  }

  /* ---- 入力収集（スキーマ順に構造化JSON化）---- */
  function collect() {
    const out = { '工種': current.label };
    current.sections.forEach(sec => {
      const secObj = {};
      (sec.fields || []).forEach(f => {
        const domId = sec.id + '__' + f.id;
        secObj[f.label] = f.type === 'checks' ? getChecks(domId) : val(domId);
      });
      // repeat
      if (sec.repeat) {
        const blocks = Array.from(document.querySelectorAll(`.mix-block[data-block="${sec.id}"]`));
        secObj['明細'] = blocks.map(b => {
          const row = {};
          sec.repeat.fields.forEach(f => {
            const c = b.querySelector('.rp-' + f.id);
            if (!c) { row[f.label] = null; return; }
            const v = (c.value || '').trim();
            row[f.label] = v === '' ? null : (c.type === 'number' ? Number(v) : v);
          });
          return row;
        });
      }
      // subs（季節・継手）
      if (sec.subs) {
        sec.subs.forEach(sub => {
          const subDom = document.getElementById(sec.id + '__' + sub.id);
          const visible = subDom && subDom.classList.contains('show');
          if (!visible) return;
          const subObj = {};
          sub.fields.forEach(f => {
            subObj[f.label] = val(sec.id + '_' + sub.id + '__' + f.id);
          });
          secObj[sub.title] = subObj;
        });
      }
      out[sec.title] = secObj;
    });
    return out;
  }

  /* ---- バリデーション（required + repeat内required）---- */
  function validate() {
    const errs = [];
    current.sections.forEach(sec => {
      (sec.fields || []).forEach(f => {
        if (!f.required) return;
        const domId = sec.id + '__' + f.id;
        const ok = f.type === 'checks' ? getChecks(domId).length > 0 : val(domId) != null;
        if (!ok) errs.push(f.label);
      });
      if (sec.repeat) {
        sec.repeat.fields.filter(f => f.required).forEach(f => {
          const any = Array.from(document.querySelectorAll(`.mix-block[data-block="${sec.id}"] .rp-${f.id}`))
            .some(c => (c.value || '').trim() !== '');
          if (!any) errs.push(f.label + '（最低1部位）');
        });
      }
    });
    return errs;
  }

  return { render, collect, validate, getKindId: () => current?.id };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = { FormBuilder }; }
