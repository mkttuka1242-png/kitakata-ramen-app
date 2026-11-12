
const diagnosisQuestions = [
  {
    id: "taste-001",
    category: "taste",
    question: "今日食べたいラーメンの味は？",
    options: ["あっさり", "こってり", "どちらも好き"],
    enabled: false
  },
  
  {
    id: "charm-001",
    category: "charm",
    question: "喜多方ラーメンのどんな魅力を楽しみたい？",
    options: [
      "🍜 中太縮れ多加水麺の食感",
      "🥣 お店ごとに違うスープ",
      "🏮 まだ知らないお店との出会い"
    ],
    enabled: true
  },

  {
    id: "mood-001",
    category: "mood",
    question: "今日はどんな気分？",
    options: ["定番の一杯", "新しいお店を発見", "冒険してみたい"],
    enabled: true
  },
  {
    id: "fun-001",
    category: "fun",
    question: "今日のラーメン旅にタイトルを付けるなら？",
    options: ["王道をゆく", "路地裏の大冒険", "運命の一杯を探して"],
    enabled: true
  },
  {
    id: "honest-001",
    category: "honest",
    question: "ほんとうは、坂内に行きたいんですよね？（笑）",
    options: [
      "はい、バレました😂",
      "いやいや、今日は違うお店へ！",
      "実はまだ迷ってます"
    ],
    enabled: true,
    daytimeOnly: true
  },
  
  {
    id: "fun-002",
    category: "fun",
    question: "ラーメン屋さんの暖簾をくぐる瞬間、どんな気持ち？",
    options: ["ワクワク！", "ちょっとドキドキ", "とにかくお腹ペコペコ！"],
    enabled: true
  },
  {
    id: "mood-002",
    category: "mood",
    question: "今日の一杯に期待することは？",
    options: ["安心する味", "新しい発見", "予想外の感動"],
    enabled: true
  },
  {
    id: "fun-003",
    category: "fun",
    question: "もしラーメンの神様が現れたら、何をお願いする？",
    options: ["最高の一杯を！", "知らない名店を教えて！", "すべておまかせ！"],
    enabled: true
  }

];
