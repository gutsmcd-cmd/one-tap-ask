// Built-in prompt templates. {key} placeholders are filled from the fields.
// Each body tells the AI to answer in the app's language.
export type FieldType = 'text' | 'long' | 'datetime' | 'date' | 'url' | 'number'
export type L = { ja: string; en: string }
export type Field = { key: string; label: L; type: FieldType; ph?: L; def?: 'now' | 'today'; optional?: boolean }
export type Builtin = { id: string; icon: string; title: L; sub: L; fields: Field[]; body: L }

const f = (key: string, ja: string, en: string, type: FieldType = 'text', extra: Partial<Field> = {}): Field =>
  ({ key, label: { ja, en }, type, ...extra })

export const BUILTINS: Builtin[] = [
  {
    id: 'train', icon: '🚃',
    title: { ja: '電車の乗りかえ', en: 'Train trip' },
    sub: { ja: '何両目・何番出口まで', en: 'Car, platform and exit' },
    fields: [
      f('from', '出発駅', 'From station', 'text', { ph: { ja: '例：新大阪', en: 'e.g. Shin-Osaka' } }),
      f('to', '到着駅', 'To station', 'text', { ph: { ja: '例：京都', en: 'e.g. Kyoto' } }),
      f('when', '出発時刻', 'Leaving at', 'datetime', { def: 'now' }),
      f('goal', '行き先（出口のめやす・任意）', 'Final destination near the station (optional)', 'text', { optional: true, ph: { ja: '例：京都タワー', en: 'e.g. Kyoto Tower' } }),
    ],
    body: {
      ja: `日本の電車での移動を手伝ってください。最新の時刻表と駅の構内図を確認してから答えてください。
出発駅：{from}
到着駅：{to}
出発時刻：{when}
駅を出たあとの行き先：{goal}

次の形式で、短く正確に答えてください。
1. おすすめのルート（路線名・種別・行き先表示・発車時刻・到着時刻・乗りかえ駅）
2. 各駅で乗る番線
3. 乗りかえや出口に一番近い号車とドア位置（何両目か）
4. 到着駅で使う出口の番号・名前と、そこからの一言案内
5. 運賃（IC カードときっぷの両方）と、IC カードについての注意（エリアまたぎ・特急券など）
6. 遅延や運休のときの代わりのルート1〜2本
わからない情報は推測せず「未確認」と書いてください。答えは日本語で。`,
      en: `Help me with a train trip in Japan. Check current timetables and station maps before answering.
From: {from}
To: {to}
Leaving at: {when}
Where I'm going after the station: {goal}

Answer briefly and precisely in this format:
1. Best route (line names, train type, destination shown on the train, departure and arrival times, transfer stations)
2. Platform/track number at each station
3. Which car number and door is closest to the transfer or the exit I need
4. The exit number/name to use at the destination, with a one-line direction from there
5. Fare (IC card and paper ticket) plus any IC card notes (crossing IC areas, limited-express tickets, etc.)
6. One or two backup routes if there are delays or suspensions
If you can't confirm something, write "unconfirmed" instead of guessing. Answer in English.`,
    },
  },
  {
    id: 'job', icon: '🕵️',
    title: { ja: 'この求人、大丈夫？', en: 'Is this job legit?' },
    sub: { ja: '口コミ・登録・危険サイン', en: 'Reviews, registration, red flags' },
    fields: [
      f('company', '会社名', 'Company name'),
      f('job', '職種またはリンク', 'Job title or link'),
      f('odd', '気になる点（任意）', 'What seems too good or odd (optional)', 'long', { optional: true, ph: { ja: '例：未経験で月収50万円、面接はLINEのみ', en: 'e.g. ¥500k/month with no experience, interview only on LINE' } }),
    ],
    body: {
      ja: `この求人が本物で安全かどうか、調べてください。
会社名：{company}
職種／リンク：{job}
気になる点：{odd}

次のことを確認してください。
- 口コミサイト（OpenWork、転職会議、Indeed、Glassdoor など）の評判
- 法人登録（国税庁の法人番号公表サイト）、所在地、設立年、ウェブサイトの実在性
- 人材紹介・派遣の許可番号が必要な場合はその有無
- 日本でよくある求人詐欺・闇バイトのパターン（先にお金を払わせる、LINE だけで連絡、身分証の写真を求める、「受け子」「運び」など）との一致
- ブラック企業の兆候（固定残業代の書き方、異常に高い給与、常に募集している など）

最後に「判定：安全そう／注意が必要／避けるべき」と、確信度（高・中・低）、その理由を3行以内で。
出典のリンクをつけてください。答えは日本語で。`,
      en: `Check whether this job offer is real and safe.
Company: {company}
Job title / link: {job}
What seems too good or odd: {odd}

Please check:
- Reviews on OpenWork, Glassdoor, Indeed and similar sites
- Company registration (Japan's National Tax Agency corporate number site), address, founding year, whether the website is real
- Required recruitment/dispatch licence numbers, if applicable
- Matches with common job-scam patterns in Japan (upfront payments, LINE-only contact, asking for ID photos, "yami baito" courier/money-pickup jobs)
- Signs of an exploitative employer (vague fixed-overtime pay, unusually high pay, always hiring)

End with "Verdict: looks safe / be careful / avoid", a confidence level (high/medium/low), and the reasons in 3 lines or fewer.
Include source links. Answer in English.`,
    },
  },
  {
    id: 'price', icon: '🏷️',
    title: { ja: 'お店とネット、どっちが安い？', en: 'Store vs online price' },
    sub: { ja: 'ポイント・送料こみで比較', en: 'With points and shipping' },
    fields: [
      f('product', '商品名・型番', 'Product name / model', 'text', { ph: { ja: '値札の型番が一番正確です', en: 'The model number on the tag is most precise' } }),
      f('price', 'お店の価格（円）', 'Store price (yen)', 'number'),
      f('area', 'いる場所（任意）', 'Where you are (optional)', 'text', { optional: true, ph: { ja: '例：梅田', en: 'e.g. Umeda' } }),
    ],
    body: {
      ja: `いまお店でこの商品を見ています。ここで買うべきか、ネットで買うべきか教えてください。
商品：{product}
お店の価格：{price}円
場所：{area}

次の場所の現在の価格を調べて、表にしてください：Amazon.co.jp、楽天市場、Yahoo!ショッピング、価格.com の最安値、近くのほかのお店（わかれば）。
各行に「価格・送料・ポイント還元・実質価格・届く日」を入れてください。
型番が少しでも違う商品（旧モデル・並行輸入・中古）は別に分けてください。
最後に「判定：今ここで買う／ネットで買う」と、差額、理由を1〜2行で。答えは日本語で。
（写真があれば、このあとに値札の写真を送ります。）`,
      en: `I'm in a shop looking at this product. Tell me whether to buy it here or online.
Product: {product}
Store price: ¥{price}
Location: {area}

Look up current prices and put them in a table: Amazon.co.jp, Rakuten, Yahoo! Shopping, the lowest Kakaku.com price, and other nearby shops if you can.
For each row give price, shipping, points back, effective price, and delivery date.
Keep anything with a slightly different model number (older model, parallel import, used) in a separate list.
End with "Verdict: buy here now / buy online", the difference in yen, and the reason in 1–2 lines. Answer in English.
(If I have a photo of the price tag, I'll send it next.)`,
    },
  },
  {
    id: 'fact', icon: '🔎',
    title: { ja: '本当？ファクトチェック', en: 'Fact-check a claim' },
    sub: { ja: '出典つき・立場のちがいも', en: 'Sources and different sides' },
    fields: [f('claim', '確かめたい話', 'The claim', 'long'), f('where', 'どこで見た？（任意）', 'Where you saw it (optional)', 'text', { optional: true })],
    body: {
      ja: `次の話が本当かどうか、ファクトチェックしてください。
内容：{claim}
見た場所：{where}

1. 結論：本当／ほぼ本当／一部だけ本当／誤解をまねく／うそ／判断できない
2. 根拠：信頼できる一次情報（公的機関・論文・原文）を優先し、リンクつきで
3. 報道の偏り：Ground News のように、左寄り・中道・右寄りのメディアがそれぞれどう伝えているか、伝えていないか
4. よくある誤解や、切り取られている文脈
5. 確信度（高・中・低）
日付の新しさにも注意してください。答えは日本語で。`,
      en: `Fact-check this claim.
Claim: {claim}
Where I saw it: {where}

1. Verdict: true / mostly true / partly true / misleading / false / can't tell
2. Evidence: prefer primary sources (government, studies, original documents), with links
3. Coverage bias, Ground News style: how left, centre and right outlets report it, or don't
4. Common misunderstandings or missing context
5. Confidence (high/medium/low)
Watch out for outdated information. Answer in English.`,
    },
  },
  {
    id: 'letter', icon: '📄',
    title: { ja: '書類をやさしく説明', en: 'Explain a letter' },
    sub: { ja: '何をすればいいかだけ', en: 'Just what to do' },
    fields: [f('text', '書類の文章（または写真を送る）', 'Text of the letter (or send a photo)', 'long', { optional: true, ph: { ja: '空のままなら、このあと写真を送ります', en: 'Leave empty and send a photo next' } })],
    body: {
      ja: `この書類（役所・会社・学校などからの手紙）を、やさしい言葉で説明してください。
{text}

次の形式で：
- ひとことで言うと何の書類か
- 私がやるべきこと（チェックリスト）
- 期限と、お金がかかるならその金額
- 無視するとどうなるか
- 問い合わせ先
むずかしい言葉は使わず、短く。本文がない場合は、このあと送る写真を読んでください。答えは日本語で。`,
      en: `Explain this document (a letter from a city office, company, school, etc.) in plain, simple words.
{text}

Format:
- What it is, in one sentence
- What I need to do (checklist)
- Deadlines, and any money involved
- What happens if I ignore it
- Who to contact
Keep it short with no jargon. If there's no text above, read the photo I send next. Answer in English.`,
    },
  },
  {
    id: 'translate', icon: '🌏',
    title: { ja: '訳して、ていねいに説明', en: 'Translate and explain' },
    sub: { ja: 'ニュアンスと返し方も', en: 'Nuance and how to reply' },
    fields: [f('text', '訳したい文', 'Text to translate', 'long'), f('lang', '訳す言語', 'Translate into', 'text', { ph: { ja: '例：英語', en: 'e.g. Japanese' } })],
    body: {
      ja: `次の文を{lang}に訳してください。
「{text}」

1. 自然な訳
2. 直訳に近い訳（ちがいがある場合のみ）
3. ニュアンス・ていねいさ・文化的な意味の説明（2〜3行）
4. 返事をするなら、ていねいな返し方の例を1つ
説明は日本語で。`,
      en: `Translate this into {lang}:
"{text}"

1. Natural translation
2. A more literal version (only if it differs)
3. Nuance, politeness level and cultural meaning (2–3 lines)
4. One polite example reply, if a reply makes sense
Write the explanations in English.`,
    },
  },
  {
    id: 'fridge', icon: '🍳',
    title: { ja: '冷蔵庫の中身でレシピ', en: 'Recipe from my fridge' },
    sub: { ja: '買い足しなしで', en: 'No shopping needed' },
    fields: [f('items', '今ある食材', 'What I have', 'long', { ph: { ja: '例：卵、キャベツ、豚こま、ごはん', en: 'e.g. eggs, cabbage, pork, rice' } }), f('people', '人数', 'People', 'number'), f('mins', '使える時間（分）', 'Time (minutes)', 'number')],
    body: {
      ja: `今ある食材だけで作れる料理を3つ提案してください。
食材：{items}
人数：{people}人
時間：{mins}分以内
調味料は一般的な日本の家庭にあるもの（しょうゆ・みそ・塩・砂糖・油など）は使ってOKです。
それぞれ「料理名・時間・材料の分量・手順（5ステップ以内）」で。子どもも食べやすいものを1つ入れてください。答えは日本語で。`,
      en: `Suggest 3 dishes I can make with only what I have.
Ingredients: {items}
People: {people}
Time: {mins} minutes max
Basic Japanese pantry seasonings (soy sauce, miso, salt, sugar, oil, etc.) are fine.
For each: name, time, amounts, and steps (5 steps max). Make one of them kid-friendly. Answer in English.`,
    },
  },
  {
    id: 'compare', icon: '⚖️',
    title: { ja: '2つの商品をくらべる', en: 'Compare two products' },
    sub: { ja: '表と結論で', en: 'A table and a verdict' },
    fields: [f('a', '商品A', 'Product A'), f('b', '商品B', 'Product B'), f('use', '使い方・重視すること（任意）', 'How I\'ll use it / what matters (optional)', 'text', { optional: true })],
    body: {
      ja: `{a} と {b} をくらべてください。
私の使い方・重視すること：{use}

1. 主な違いを表で（価格・性能・大きさ／重さ・電池やランニングコスト・保証・評判）
2. それぞれの弱点を正直に
3. 私に合うのはどちらか、理由を2〜3行で
最新の価格とモデルを確認してください。答えは日本語で。`,
      en: `Compare {a} and {b}.
How I'll use it / what matters to me: {use}

1. Key differences in a table (price, performance, size/weight, battery or running costs, warranty, reviews)
2. The honest weak points of each
3. Which one suits me, with the reason in 2–3 lines
Check the current prices and models. Answer in English.`,
    },
  },
  {
    id: 'link', icon: '🔗',
    title: { ja: 'リンクを要約', en: 'Summarize a link' },
    sub: { ja: '3行で', en: 'In three lines' },
    fields: [f('url', 'リンク', 'Link', 'url')],
    body: {
      ja: `このページを読んで要約してください：{url}
- 3行の要約
- 大事なポイント（箇条書き5つまで）
- 注意すべき点や、偏り・宣伝の可能性
ページが開けない場合はそう伝えてください。答えは日本語で。`,
      en: `Read this page and summarize it: {url}
- A 3-line summary
- Key points (up to 5 bullets)
- Anything to be careful about, including bias or advertising
If you can't open the page, say so. Answer in English.`,
    },
  },
  {
    id: 'weekend', icon: '🗺️',
    title: { ja: '週末のおでかけプラン', en: 'Weekend plan near me' },
    sub: { ja: '天気とイベントから', en: 'Using weather and events' },
    fields: [f('area', '場所', 'Where', 'text', { ph: { ja: '例：大阪市', en: 'e.g. Osaka' } }), f('date', '日にち', 'Date', 'date', { def: 'today' }), f('who', 'だれと・予算（任意）', 'Who and budget (optional)', 'text', { optional: true, ph: { ja: '例：子ども2人、5000円', en: 'e.g. 2 kids, ¥5,000' } })],
    body: {
      ja: `{area} の近くで、{date} のおでかけプランを考えてください。
だれと・予算：{who}
その日の天気予報と、開催中のイベント・季節のもの（花・祭りなど）を調べたうえで、
- プランを2つ（晴れ用・雨用）
- それぞれ時間割、移動手段と時間、費用のめやす
- 予約が必要なもの、混雑する時間
を短くまとめてください。答えは日本語で。`,
      en: `Plan an outing near {area} on {date}.
Who and budget: {who}
Check that day's weather forecast and what's on (events, seasonal things like flowers or festivals), then give:
- Two plans (one for good weather, one for rain)
- For each: a timetable, transport and travel time, rough cost
- Anything that needs booking, and the busy times
Keep it short. Answer in English.`,
    },
  },
  {
    id: 'email', icon: '✉️',
    title: { ja: 'ていねいな日本語メール', en: 'Polite Japanese email' },
    sub: { ja: '敬語でそのまま送れる', en: 'Ready to send, in keigo' },
    fields: [f('to', 'だれに', 'To whom', 'text', { ph: { ja: '例：大家さん、上司', en: 'e.g. my landlord, my boss' } }), f('point', '伝えたいこと', 'What I want to say', 'long')],
    body: {
      ja: `{to} に送る、ていねいな日本語のメールを書いてください。
伝えたいこと：{point}

- 件名と本文
- 相手との関係に合った敬語で、長すぎず
- そのままコピーして送れる形で
- 最後に、もう少しくだけた版も1つ
説明は日本語で。`,
      en: `Write a polite email in Japanese to {to}.
What I want to say: {point}

- Subject line and body
- Keigo that fits the relationship, not too long
- Ready to copy and send as is
- Then a short English translation so I know what it says, and one slightly more casual version
Write any explanations in English.`,
    },
  },
]
