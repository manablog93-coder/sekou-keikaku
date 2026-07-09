/* ============================================================
   工種スキーマ定義
   ------------------------------------------------------------
   フォームUI・入力収集・動的出し分けは、すべてこの定義から駆動される。
   新しい工種を足すときは、このファイルに 1 工種分のオブジェクトを
   追加するだけでよい（UI・収集ロジック・API は変更不要）。

   フィールド type 一覧：
     text     … 1行テキスト
     textarea … 複数行テキスト
     number   … 数値（unit で単位表示）
     date     … 日付
     select   … プルダウン（options: [{value,label}]）
     checks   … チェックボックス群（options: [{value,label}]、複数選択）

   繰り返しブロック（repeat）：
     部位ごとに増やせる入力群。fields を内包する。
     partsSource を指定すると、その checks フィールドの選択値が
     ブロック内 select の選択肢に流し込まれる（部位連動）。

   動的ルール（rules）：
     when 条件を満たしたとき target セクションを表示する汎用ルール。
       kind: 'dateRangeSeason' … 工期(dateStart,dateEnd)から季節を判定
       kind: 'checksInclude'    … 指定 checks/select に値が含まれるか
   ============================================================ */

const SCHEMA = {

  /* ========================================================
     コンクリート工事（v1 の挙動を完全維持）
     ======================================================== */
  concrete: {
    id: 'concrete',
    label: 'コンクリート工事',
    sections: [
      {
        id: 'basic', num: 1, title: '基本情報',
        fields: [
          { id: 'koujimei', type: 'text', label: '工事名', required: true, full: true,
            placeholder: '例：（仮称）○○共同住宅新築工事' },
          { id: 'basho', type: 'text', label: '工事場所', full: true,
            placeholder: '例：東京都立川市○○町1-2-3' },
          { id: 'kouki_start', type: 'date', label: '工期（開始）', required: true, role: 'dateStart' },
          { id: 'kouki_end', type: 'date', label: '工期（終了）', required: true, role: 'dateEnd' },
          { id: 'parts', type: 'checks', label: '対象部位（複数選択可）', required: true, full: true,
            role: 'parts',
            options: ['基礎','地中梁','柱','梁','スラブ','壁','その他'].map(v => ({ value: v, label: v })) },
          { id: 'kouzou', type: 'select', label: '構造種別',
            options: [{value:'RC',label:'RC'},{value:'SRC',label:'SRC'},{value:'PCa',label:'PCa'}] },
        ],
        seasonBadges: true,
      },
      {
        id: 'mix', num: 2, title: '使用材料・配合',
        lookat: '構造図の一般事項・特記仕様書。部位で強度が違う場合は「部位を追加」で分けて入力。',
        repeat: {
          addLabel: '＋ 部位を追加', partsSource: 'parts',
          fields: [
            { id: 'part', type: 'select', label: '部位', partsOptions: true },
            { id: 'fc', type: 'number', label: '呼び強度 Fc（N/mm²）', required: true, placeholder: '例：24' },
            { id: 'slump', type: 'number', label: 'スランプ（cm）', step: '0.5', placeholder: '例：18' },
            { id: 'agg', type: 'select', label: '粗骨材最大寸法（mm）',
              options: [{value:'',label:'─'},{value:'20',label:'20'},{value:'25',label:'25'},{value:'40',label:'40'}] },
            { id: 'cement', type: 'select', label: 'セメント種類',
              options: [
                {value:'',label:'─'},{value:'普通',label:'普通ポルトランド'},{value:'早強',label:'早強'},
                {value:'高炉B種',label:'高炉B種'},{value:'低熱',label:'低熱'},{value:'中庸熱',label:'中庸熱'}] },
            { id: 'air', type: 'number', label: '空気量（%）', step: '0.1', placeholder: '例：4.5' },
          ],
        },
      },
      {
        id: 'placing', num: 3, title: '打設計画',
        lookat: '伏図・軸組図で打継ぎ位置を確認。数量は自分で拾った値を入力。',
        fields: [
          { id: 'kukaku', type: 'textarea', label: '打設区画・順序', full: true,
            placeholder: '例：1階を東西2区画に分割。東区画→西区画の順で打設' },
          { id: 'uchitsugi', type: 'textarea', label: '打継ぎ位置', full: true,
            placeholder: '例：梁・スラブは中央付近、柱は床上で打止め' },
          { id: 'suuryou', type: 'number', label: '1回あたり打設数量（m³）', step: '0.1', placeholder: '例：45' },
          { id: 'rakka', type: 'number', label: '打設高さ・落下高さ（m）', step: '0.1', placeholder: '例：1.5' },
        ],
      },
      {
        id: 'transport', num: 4, title: '運搬・圧送',
        lookat: '練混ぜから打込み完了までの時間制限に直結。運搬時間は実測ベースで。',
        fields: [
          { id: 'koujou', type: 'text', label: '生コン工場名', placeholder: '例：○○生コン 立川工場' },
          { id: 'unpan', type: 'number', label: '運搬時間（分）', placeholder: '例：60' },
          { id: 'pump', type: 'select', label: 'ポンプ車',
            options: [{value:'',label:'選択してください'},{value:'ブーム車',label:'ブーム車'},{value:'配管圧送',label:'配管圧送'}] },
          { id: 'daisu', type: 'number', label: '台数', placeholder: '例：1' },
          { id: 'assou', type: 'text', label: '圧送高さ・距離', full: true, placeholder: '例：高さ12m・水平30m' },
        ],
      },
      {
        id: 'curing', num: 5, title: '養生',
        fields: [
          { id: 'yojo_methods', type: 'checks', label: '養生方法（複数選択可）', full: true,
            options: ['湿潤','被膜','加熱'].map(v => ({ value: v, label: v })) },
          { id: 'yojo_days', type: 'number', label: '養生期間（日）', placeholder: '例：5' },
          { id: 'sonchi', type: 'number', label: '型枠存置期間（日）', placeholder: '例：4' },
        ],
      },
      {
        id: 'quality', num: 6, title: '品質管理・試験',
        lookat: '特記仕様書の試験規定。迷ったら「150m³ごとに1回」が一般的な目安。',
        fields: [
          { id: 'shiken', type: 'text', label: '試験頻度の考え方', full: true, placeholder: '例：150m³ごとに1回' },
          { id: 'zairei', type: 'checks', label: '供試体 材齢（複数選択可）', full: true,
            options: ['7日','28日','その他'].map(v => ({ value: v, label: v })) },
          { id: 'ukeire', type: 'checks', label: '受入検査項目（複数選択可）', full: true,
            options: ['スランプ','空気量','塩化物','温度'].map(v => ({ value: v, label: v })) },
        ],
      },
      {
        id: 'season', num: 7, title: '季節対策', dynamic: true,
        note: '入力された工期から自動判定しています。該当する対策を確認・追記してください。',
        subs: [
          { id: 'cold', tone: 'cold', title: '❄ 寒中コンクリート',
            fields: [
              { id: 'cold_temp', type: 'number', label: '初期養生温度（℃）', placeholder: '例：2' },
              { id: 'cold_kanetsu', type: 'text', label: '加熱養生の方法', placeholder: '例：ジェットヒーター給熱' },
              { id: 'cold_hoon', type: 'text', label: '保温方法', full: true, placeholder: '例：養生シート＋断熱マット' },
            ] },
          { id: 'hot', tone: 'hot', title: '☀ 暑中コンクリート',
            fields: [
              { id: 'hot_temp', type: 'number', label: '練上がり温度の上限（℃）', placeholder: '例：35' },
              { id: 'hot_unpan', type: 'text', label: '運搬時間の短縮対策', placeholder: '例：近距離工場の選定・出荷調整' },
              { id: 'hot_cj', type: 'text', label: 'コールドジョイント対策', full: true, placeholder: '例：打重ね時間の管理・人員増強' },
            ] },
        ],
      },
      {
        id: 'safety', num: 8, title: '打設体制・安全',
        fields: [
          { id: 'jinin', type: 'text', label: '打設人員', full: true, placeholder: '例：圧送工2名・打設工3名・左官2名・誘導員1名' },
          { id: 'kikai', type: 'text', label: '使用機械', full: true, placeholder: '例：コンクリートポンプ車、内部振動機4台' },
          { id: 'tachiai', type: 'text', label: '立会者・検査者', full: true, placeholder: '例：監理者立会、自主検査：現場代理人' },
          { id: 'anzen', type: 'textarea', label: '安全対策', full: true, placeholder: '例：開口部養生、配管支持の確認、打設中の型枠監視員配置' },
          { id: 'kinkyuu', type: 'textarea', label: '緊急時連絡体制', full: true, placeholder: '例：現場代理人→所長→本社。救急連絡先を朝礼で周知' },
        ],
      },
    ],
    rules: [
      { kind: 'dateRangeSeason', startField: 'kouki_start', endField: 'kouki_end',
        show: { cold: 'season.cold', hot: 'season.hot' }, badgeSection: 'basic', targetSection: 'season' },
    ],
  },

  /* ========================================================
     鉄筋工事（継手工法で出し分け）
     ======================================================== */
  rebar: {
    id: 'rebar',
    label: '鉄筋工事',
    sections: [
      {
        id: 'basic', num: 1, title: '基本情報',
        fields: [
          { id: 'koujimei', type: 'text', label: '工事名', required: true, full: true,
            placeholder: '例：（仮称）○○共同住宅新築工事' },
          { id: 'basho', type: 'text', label: '工事場所', full: true,
            placeholder: '例：東京都立川市○○町1-2-3' },
          { id: 'kouki_start', type: 'date', label: '工期（開始）', required: true, role: 'dateStart' },
          { id: 'kouki_end', type: 'date', label: '工期（終了）', required: true, role: 'dateEnd' },
          { id: 'parts', type: 'checks', label: '対象部位（複数選択可）', required: true, full: true,
            role: 'parts',
            options: ['基礎','地中梁','柱','梁','スラブ','壁','階段','その他'].map(v => ({ value: v, label: v })) },
          { id: 'kouzou', type: 'select', label: '構造種別',
            options: [{value:'RC',label:'RC'},{value:'SRC',label:'SRC'}] },
        ],
      },
      {
        id: 'material', num: 2, title: '使用材料',
        lookat: '構造図の特記仕様書・鉄筋リスト。部位で材質・径が違う場合は「部位を追加」で分けて入力。',
        repeat: {
          addLabel: '＋ 部位を追加', partsSource: 'parts',
          fields: [
            { id: 'part', type: 'select', label: '部位', partsOptions: true },
            { id: 'kind', type: 'select', label: '鉄筋の種類',
              options: [
                {value:'',label:'─'},{value:'SD295A',label:'SD295A'},{value:'SD345',label:'SD345'},
                {value:'SD390',label:'SD390'},{value:'SD490',label:'SD490'}] },
            { id: 'kei', type: 'text', label: '呼び径', placeholder: '例：D19〜D25' },
          ],
        },
      },
      {
        id: 'fabrication', num: 3, title: '加工',
        lookat: '加工図・特記仕様書。加工場所（工場/現場）で以降の搬入・保管・管理が変わる。',
        fields: [
          { id: 'kakou_basho', type: 'select', label: '加工場所',
            options: [{value:'',label:'選択してください'},{value:'工場加工',label:'工場加工'},{value:'現場加工',label:'現場加工'}] },
          { id: 'hook', type: 'text', label: '末端フックの形状', full: true, placeholder: '例：135°（帯筋・あばら筋）' },
          { id: 'magari', type: 'text', label: '曲げ内法直径', placeholder: '例：3d（D16以下）' },
        ],
      },
      {
        id: 'joint', num: 4, title: '継手',
        lookat: '構造図の継手指定・特記仕様書。工法により管理・検査項目が変わる。',
        fields: [
          { id: 'kouhou', type: 'checks', label: '継手工法（複数選択可）', full: true, role: 'jointMethod',
            options: ['ガス圧接','機械式継手','重ね継手'].map(v => ({ value: v, label: v })) },
        ],
        subs: [
          { id: 'gasatsu', tone: 'neutral', title: 'ガス圧接', showWhen: { field: 'kouhou', includes: 'ガス圧接' },
            fields: [
              { id: 'gas_shikaku', type: 'text', label: '圧接工の技量資格', full: true, placeholder: '例：手動ガス圧接技量資格1種' },
              { id: 'gas_gyousha', type: 'text', label: '圧接業者名', placeholder: '例：○○圧接' },
              { id: 'gas_kensa', type: 'select', label: '検査方法',
                options: [
                  {value:'',label:'─'},
                  {value:'外観検査＋超音波探傷試験',label:'外観検査＋超音波探傷試験'},
                  {value:'外観検査＋抜取り引張試験',label:'外観検査＋抜取り引張試験'}] },
              { id: 'gas_hindo', type: 'text', label: '抜取り検査の頻度', placeholder: '例：1組30か所' },
            ] },
          { id: 'kikai', tone: 'neutral', title: '機械式継手', showWhen: { field: 'kouhou', includes: '機械式継手' },
            fields: [
              { id: 'kikai_shurui', type: 'text', label: '継手の種類・製品名', full: true, placeholder: '例：ねじ節継手 ○○ジョイント' },
              { id: 'kikai_maker', type: 'text', label: 'メーカー', placeholder: '例：○○鋼業' },
              { id: 'kikai_houhou', type: 'text', label: '施工方法', full: true, placeholder: '例：トルク管理／グラウト充填' },
              { id: 'kikai_kensa', type: 'text', label: '検査方法', full: true, placeholder: '例：トルク値確認・挿入マーク確認' },
            ] },
          { id: 'kasane', tone: 'neutral', title: '重ね継手', showWhen: { field: 'kouhou', includes: '重ね継手' },
            fields: [
              { id: 'kasane_nagasa', type: 'select', label: '継手長さ',
                options: [
                  {value:'',label:'─'},
                  {value:'L1（フックなし）',label:'L1（フックなし）'},
                  {value:'L1h（フックあり）',label:'L1h（フックあり）'}] },
              { id: 'kasane_ichi', type: 'text', label: '継手位置', full: true, placeholder: '例：相互にずらす／応力の小さい位置' },
            ] },
        ],
      },
      {
        id: 'cover', num: 5, title: '定着・かぶり',
        lookat: '特記仕様書＋公共建築工事標準仕様書（建築工事編）。空欄なら参考値を併記します。',
        repeat: {
          addLabel: '＋ 部位を追加', partsSource: 'parts',
          fields: [
            { id: 'part', type: 'select', label: '部位', partsOptions: true },
            { id: 'kaburi', type: 'number', label: '最小かぶり厚さ（mm）', placeholder: '例：40' },
            { id: 'teichaku', type: 'text', label: '定着長さ', placeholder: '例：L2＝35d' },
          ],
        },
      },
      {
        id: 'assembly', num: 6, title: '組立・配筋検査',
        fields: [
          { id: 'kessoku', type: 'text', label: '結束方法・結束線', full: true, placeholder: '例：なまし鉄線＃21' },
          { id: 'kensa_jiki', type: 'text', label: '配筋検査の実施時期', full: true, placeholder: '例：コンクリート打設前' },
          { id: 'kiroku', type: 'text', label: '検査記録の残し方', full: true, placeholder: '例：写真・チェックシート' },
        ],
      },
      {
        id: 'safety', num: 7, title: '運搬・揚重・安全',
        fields: [
          { id: 'youjuu', type: 'text', label: '揚重機', full: true, placeholder: '例：移動式クレーン' },
          { id: 'tamagake', type: 'text', label: '玉掛け有資格者', placeholder: '例：玉掛け技能講習修了者' },
          { id: 'hokan', type: 'text', label: '鉄筋の保管方法', full: true, placeholder: '例：枕木で地面から離し、シート養生' },
          { id: 'tanbu', type: 'text', label: '突き出し鉄筋の端部保護', full: true, placeholder: '例：キャップ養生・防護' },
        ],
      },
    ],
    rules: [
      { kind: 'checksInclude', field: 'joint.kouhou',
        subMap: { 'ガス圧接': 'joint.gasatsu', '機械式継手': 'joint.kikai', '重ね継手': 'joint.kasane' } },
    ],
  },

};

if (typeof module !== 'undefined' && module.exports) { module.exports = { SCHEMA }; }
