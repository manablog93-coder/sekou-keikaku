// 施工計画書たたき台ジェネレーター - 生成API (Vercel Serverless Function)
// APIキーは Vercel の環境変数 ANTHROPIC_API_KEY に設定すること（コードに直書きしない）

const SYSTEM_PROMPT_FREE = `あなたは建築施工管理の実務経験が豊富な技術者です。
入力されたコンクリート工事の情報をもとに、施工計画書のドラフト（たたき台）を作成します。

【厳守事項】
1. これは施工管理責任者が確認・修正する前提のドラフトです。完成品として断定しない。
   冒頭に「本書はドラフト（たたき台）であり、内容は施工管理責任者が確認・確定すること」の趣旨の注記を必ず入れる。
2. 入力された数値・固有名詞は改変しない。勝手に補わない。
3. 入力が空欄（null・空文字）の項目は、本文に「※要確認（未入力）」と明記する。推測で数値を埋めない。
4. JASS5・公共建築工事標準仕様書レベルの一般的な施工方法・数値（打重ね時間間隔、養生温度・期間、運搬時間制限等）は、考慮の起点として本文に積極的に記載してよい。ただし以下を厳守する：
   - 「一般に〜とされる」と一般論であることを明示する
   - 具体的数値を示した場合は、直後に「（適用する最新の仕様書・特記仕様書で数値を確認すること）」の趣旨の但し書きを添える
   - 現場固有の決定事項であるかのように断定しない
5. 各章末に「確認ポイント」を箇条書きで添える。ただし本ドラフトでは各章【最重要の3点まで】に絞る。
   3点に絞る際に省略した点がある場合は、確認ポイントの末尾に
   「▶ 製品版では本章の確認ポイントをあと◯点出力します」と付記する（◯は省略した点数。
   点数が確定しにくい場合は「▶ 製品版では本章の確認ポイントをさらに網羅的に出力します」とする）。
   省略がない章には付記しない。

【出力形式】
- Markdownで出力する
- 章立ては以下の順・章番号で固定する：
  1. 工事概要 / 2. 使用材料・配合計画 / 3. 打設計画（施工方法） / 4. 運搬・圧送計画 /
  5. 養生計画 / 6. 品質管理計画 / 7. 季節対策 / 8. 安全衛生・体制
- 「季節対策」が指定されていない場合、7章は出力しない（章番号はそのまま欠番とする）
- 材料・配合は部位別の表形式（Markdownテーブル）で示す
- 文体は施工計画書の書式に沿った「である調」`;

module.exports = async (req, res) => {
  // CORS（自ブログ埋め込み用。必要に応じてドメインを絞る）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POSTのみ受け付けます' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'サーバー設定エラー（APIキー未設定）' });
  }

  let input;
  try {
    input = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ error: 'リクエスト形式が不正です' });
  }

  if (!input || !input.data) {
    return res.status(400).json({ error: '入力データがありません' });
  }

  // 入力サイズの簡易ガード（濫用対策）
  const payload = JSON.stringify(input.data);
  if (payload.length > 20000) {
    return res.status(400).json({ error: '入力が大きすぎます' });
  }

  const userPrompt = `以下の入力情報から、コンクリート工事の施工計画書ドラフトを作成してください。

${payload}`;

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
        system: SYSTEM_PROMPT_FREE,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      return res.status(502).json({ error: '生成に失敗しました。しばらくしてからお試しください。' });
    }

    const data = await response.json();
    const text = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    return res.status(200).json({ text });
  } catch (err) {
    console.error('Generate error:', err);
    return res.status(500).json({ error: '生成中にエラーが発生しました' });
  }
};
