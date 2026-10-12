
const diagnosisQuestions = [
  {
    question: "今日食べたいラーメンの味は？",
    options: ["あっさり", "こってり", "どちらも好き"],
  },
  {
    question: "今日はどんな気分？",
    options: ["定番の一杯", "新しいお店を発見", "冒険してみたい"],
  },
  {
    question: "あなたの星座は？",
    options: [
      "おひつじ座", "おうし座", "ふたご座", "かに座",
      "しし座", "おとめ座", "てんびん座", "さそり座",
      "いて座", "やぎ座", "みずがめ座", "うお座",
    ],
  },
];

const diagnosisButton = document.getElementById("start-diagnosis");
const diagnosisPanel = document.getElementById("diagnosis-panel");


let currentQuestion = 0;
const diagnosisAnswers = [];

function showDiagnosisQuestion() {
  const item = diagnosisQuestions[currentQuestion];

  diagnosisPanel.hidden = false;
  diagnosisPanel.innerHTML = `
    <h2>🍜 あなたにおすすめの一杯を診断</h2>
    <p>第${currentQuestion + 1}問：${item.question}</p>
    ${item.options
      .map((option, index) => `<button type="button" data-answer="${index}">${option}</button>`)
      .join("")}
  `;
}

diagnosisButton.addEventListener("click", () => {
  currentQuestion = 0;
  diagnosisAnswers.length = 0;
  showDiagnosisQuestion();
});

diagnosisPanel.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-answer]");
  if (!button) return;

  const selectedIndex = Number(button.dataset.answer);
  diagnosisAnswers.push(diagnosisQuestions[currentQuestion].options[selectedIndex]);

  currentQuestion++;

  if (currentQuestion < diagnosisQuestions.length) {
    showDiagnosisQuestion();
  } else {
    diagnosisPanel.innerHTML = `
      <h2>🍜 診断回答がそろいました！</h2>
      <p>おすすめ店舗を選ぶ機能は、次のステップで作ります。</p>
    `;
  }
});

function getDiagnosisCandidates() {
  // 既存の95店舗データから候補を取得
  return shopData.filter((shop) => shop && shop.name);
}


function pickRandomRamenShop() {
  const candidates = getDiagnosisCandidates();

  if (candidates.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * candidates.length);
  return candidates[randomIndex];
}


function showRandomRamenResult() {
  
  rouletteButton.disabled = true;

  const shop = pickRandomRamenShop();

  if (!shop) {
    diagnosisPanel.textContent = "紹介できる店舗がありません。";
    return;
  }

  diagnosisPanel.hidden = false;
  diagnosisPanel.replaceChildren();

  const title = document.createElement("h2");
  title.textContent = "🎯 今日のラーメン運試し！";

  const result = document.createElement("p");
  result.textContent = `あなたに選ばれたお店は「${shop.name}」です！`;
  
  const candidates = getDiagnosisCandidates();
  let spinCount = 0;

  const spinTimer = setTimeout(function spin() {
    const randomIndex = Math.floor(Math.random() * candidates.length);
    result.textContent = `🍜 ${candidates[randomIndex].name}`;
    spinCount++;
    
    if (spinCount < 15) {
      const nextDelay = 100 + spinCount * 25;
      setTimeout(spin, nextDelay);
    }


    if (spinCount >= 15) {
  
      
      result.textContent = `🎉 本日の運命のお店は… ${shop.name}！`;
      result.style.fontSize = "1.6rem";
      result.style.fontWeight = "bold";
      result.style.textAlign = "center";
      
      result.animate(
        [
          { transform: "scale(0.5)", opacity: 0 },
          { transform: "scale(1.2)", opacity: 1 },
          { transform: "scale(1)", opacity: 1 }
        ],
        { duration: 650, easing: "ease-out" }
      );


      playPokoSound();
      rouletteButton.disabled = false;
    }
  }, 100);


  diagnosisPanel.append(title, result);

}

const rouletteButton = document.getElementById("start-roulette");

rouletteButton.addEventListener("click", () => {
  showRandomRamenResult();
});

function playPokoSound() {
  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) return;

  const audioContext = new AudioContextClass();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(620, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(
    310,
    audioContext.currentTime + 0.16
  );

  gain.gain.setValueAtTime(0.12, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    audioContext.currentTime + 0.18
  );

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.18);
  oscillator.onended = () => audioContext.close();
}
