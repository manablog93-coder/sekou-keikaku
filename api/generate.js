// 施工計画書たたき台ジェネレーター - 生成API（スキーマ駆動版）
// 工種（kind）× プラン（free/premium）で systemプロンプトを出し分ける。
// APIキーは Vercel の環境変数 ANTHROPIC_API_KEY に設定すること。

/* ---- 共通の土台（全工種・全プラン共通の厳守事項）---- */
const BASE_RULES = `
【厳守事項】
1. これは施工管理責任者が確認・修正する前提のドラフトです。完成品として断定しない。
   冒頭に「本書はドラフト（たたき台）であり、内容は施工管理責任者が確認・確定すること」の趣旨の注記を必ず入れる。
2. 入力された数値・固有名詞は改変しない。勝手に補わない。
3. 入力が空欄（null・空文字）の項目は、本文に「※要確認（未入力）」と明記する。推測で数値を埋めない。
4. JASS5・公共建築工事標準仕様書レベルの一般的な施工方法・数値は、考慮の起点として本文に積極的に記載してよい。ただし：
   - 「一般に〜とされる」と一般論であることを明示する
   - 具体的数値を示した場合は、直後に「（適用する最新の仕様書・特記仕様書で数値を確認すること）」の但し書きを添える
   - 現場固有の決定事項であるかのように断定しない
`;

/* ---- プラン別：確認ポイントの締め方 ---- */
const CHECKPOINT_FREE = `
【確認ポイント】
- 各章末の確認ポイントは最重要の1〜2点に絞る。
- 省略した点は末尾に「▶ 製品版では本章の確認ポイントをあと◯点出力します」と付記する
  （点数が確定しにくい場合は「▶ 製品版では本章の確認ポイントをさらに網羅的に出力します」）。
`;
const CHECKPOINT_PREMIUM = `
【確認ポイント】
- 各章末に確認ポイントを箇条書きで添える。点数の上限は設けず、網羅的に出力する。漏れ防止を優先する。
`;

/* ---- 工種別の本文方針 ---- */
const KIND_BODY = {
  concrete: `
あなたは建築施工管理の実務経験が豊富な技術者です。
入力されたコンクリート工事の情報をもとに、施工計画書のドラフトを作成します。

【出力形式】
- Markdownで出力する
- 章立ては以下の順・章番号で固定する：
  1. 工事概要 / 2. 使用材料・配合計画 / 3. 打設計画（施工方法） / 4. 運搬・圧送計画 /
  5. 養生計画 / 6. 品質管理計画 / 7. 季節対策 / 8. 安全衛生・体制
- 「季節対策」に関する入力がない場合、7章は出力しない
- 材料・配合は部位別の表形式（Markdownテーブル）で示す
- 文体は施工計画書の書式に沿った「である調」
`,
  rebar: `
あなたは建築施工管理の実務経験が豊富な技術者です。
入力された鉄筋工事の情報をもとに、施工計画書のドラフトを作成します。

【定着・かぶりの記載方針】（5章・全プラン共通）
- 利用者が入力したかぶり厚さ・定着長さがある場合は、それを本文に記載する。
- 入力が空欄の場合は「※要確認（未入力）」としたうえで、補足として
  公共建築工事標準仕様書（建築工事編）の一般的な標準値を「参考値」として併記してよい。ただし：
  - 「公共建築工事標準仕様書（建築工事編）では一般に〜とされる」と出典と一般論であることを明示する
  - 「適用する版・特記仕様書で必ず確認すること」の但し書きを添える
  - 部位区分（土に接する/接しない、屋外/屋内、耐力壁/非耐力壁等）に応じた値であることを示し、単一の数値で断定しない
  - これは確定値ではなく、利用者が確認・確定するための参考である旨を明示する
  - 具体的な数値は、モデルの記憶に頼って断定せず、あくまで「参考として一般に示される範囲」に留める

【出力形式】
- Markdownで出力する
- 章立ては以下の順・章番号で固定する：
  1. 工事概要 / 2. 使用材料 / 3. 加工計画 / 4. 継手計画 / 5. 定着・かぶり計画 /
  6. 組立・配筋検査計画 / 7. 運搬・揚重・安全
- 材料・かぶりは部位別に整理し、必要に応じて表形式を用いる
- 文体は施工計画書の書式に沿った「である調」
`,
};

/* ---- 工種別・プラン別の追加方針（継手の出し分け等）---- */
const KIND_PLAN = {
  rebar: {
    free: `
【継手計画の記載方針】（4章・無料版）
- 継手は工法別の詳細出し分けを行わない。
- 入力された継手工法名を列挙し、「工法別の詳細な管理項目・検査計画は継手施工要領による」旨の概要記載にとどめる。
- 章末に「▶ 製品版では継手工法別（ガス圧接／機械式継手／重ね継手）の管理項目・検査計画を詳細に出力します」と付記する。
`,
    premium: `
【継手計画の記載方針】（4章・製品版）
- 入力された継手工法（ガス圧接／機械式継手／重ね継手）に該当する項目を、工法別に小節（4-1, 4-2…）として詳細に記載する。
- 指定のない工法については記載しない。
`,
  },
  concrete: { free: '', premium: '' },
};

function buildSystemPrompt(kind, plan) {
  const body = KIND_BODY[kind];
  if (!body) return null;
  const checkpoint = plan === 'premium' ? CHECKPOINT_PREMIUM : CHECKPOINT_FREE;
  const kindPlan = (KIND_PLAN[kind] && KIND_PLAN[kind][plan]) || '';
  return [body, BASE_RULES, checkpoint, kindPlan].join('\n');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POSTのみ受け付けます' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'サーバー設定エラー（APIキー未設定）' });

  let input;
  try { input = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch (e) { return res.status(400).json({ error: 'リクエスト形式が不正です' }); }

  if (!input || !input.data || !input.kind) {
    return res.status(400).json({ error: '入力データまたは工種が指定されていません' });
  }
  const plan = input.plan === 'premium' ? 'premium' : 'free'; // 無料版ツールからは常に free
  const system = buildSystemPrompt(input.kind, plan);
  if (!system) return res.status(400).json({ error: '未対応の工種です' });

  const payload = JSON.stringify(input.data);
  if (payload.length > 20000) return res.status(400).json({ error: '入力が大きすぎます' });

  const userPrompt = `以下の入力情報から、${input.data['工種'] || ''}の施工計画書ドラフトを作成してください。\n\n${payload}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        system,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      return res.status(502).json({ error: '生成に失敗しました。しばらくしてからお試しください。' });
    }
    const data = await response.json();
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    return res.status(200).json({ text });
  } catch (err) {
    console.error('Generate error:', err);
    return res.status(500).json({ error: '生成中にエラーが発生しました' });
  }
};
