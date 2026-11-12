


const diagnosisButton = document.getElementById("start-diagnosis");
const diagnosisPanel = document.getElementById("diagnosis-panel");


let currentQuestion = 0;
const diagnosisAnswers = [];
let selectedQuestions = [];
const previousQuestionKey = "kitakata-ramen-previous-questions";

let visitTiming = null;
let selectedTodayPeriod = null;
const korakuenShopIds = new Set([92, 93]);
let rouletteTimer = null;
let rouletteGeneration = 0;

function cancelRoulette() {
  rouletteGeneration++;
  if (rouletteTimer !== null) clearTimeout(rouletteTimer);
  rouletteTimer = null;
  rouletteButton.disabled = false;
}
const HOURS_NOTICE_TEXT = "営業時間・定休日は、Googleマップの記載や現地確認など、独自調査で得た情報をもとにしています。情報に誤りがある場合や、調査後に変更されている場合があります。また、臨時休業や材料切れによる早仕舞いなど、実際の営業状況とは異なることがあります。ご来店前に店舗の最新情報をご確認ください。";
function appendHoursNotice() {
  const notice = document.createElement("p");
  notice.className = "hours-disclaimer";
  notice.textContent = HOURS_NOTICE_TEXT;
  diagnosisPanel.append(notice);
}



const todayVisitPeriods = {
  "today-lunch": { start: 12, end: 15 },
  "today-evening": { start: 17, end: 19 },
  "today-night": { start: 19, end: 20 },
};

function showVisitTimingQuestion() {
  cancelRoulette();
  selectedTodayPeriod = null;
  const hour = new Date().getHours();

  diagnosisPanel.hidden = false;
  diagnosisPanel.innerHTML = `
    <h2>🍜 いつラーメンを食べに行きますか？</h2>
    <button type="button" data-visit-timing="now">今から食べに行く</button>
    ${hour < todayVisitPeriods["today-lunch"].end ? '<button type="button" data-visit-timing="today-lunch">☀️ 今日の昼</button>' : ''}
    ${hour < todayVisitPeriods["today-evening"].end ? '<button type="button" data-visit-timing="today-evening">🌆 今日の夕方</button>' : ''}
    ${hour < todayVisitPeriods["today-night"].end ? '<button type="button" data-visit-timing="today-night">🌙 今日の夜</button>' : ''}
    <button type="button" data-visit-timing="tomorrow">明日</button>
    <button type="button" data-visit-timing="later">別の日</button>
  `;
}

function ensureVisitTimingAvailable() {
  const period = todayVisitPeriods[visitTiming];
  if (!period || (selectedTodayPeriod?.timing === visitTiming && new Date() < selectedTodayPeriod.end)) return true;
  visitTiming = null;
  currentQuestion = 0;
  diagnosisAnswers.length = 0;
  showVisitTimingQuestion();
  const notice = document.createElement("p");
  notice.setAttribute("role", "status");
  notice.textContent = "選択した時間帯が終了しました。訪問日時を選び直してください。";
  diagnosisPanel.append(notice);
  return false;
}



function pickDiagnosisQuestions() {
  const previousIds = readStoredArray(previousQuestionKey);
  const normal = diagnosisQuestions.filter(
  q => q.enabled &&
    q.category !== "honest" &&
    (!q.daytimeOnly || !["today-evening", "today-night", "tomorrow-evening", "tomorrow-night"].includes(visitTiming))
);
  const honest = diagnosisQuestions.filter(
  q => q.enabled &&
    q.category === "honest" &&
    (!q.daytimeOnly || !["today-evening", "today-night", "tomorrow-evening", "tomorrow-night"].includes(visitTiming))
);

  const shuffled = [...normal].sort((a, b) => {
  const aUsed = previousIds.includes(a.id) ? 1 : 0;
  const bUsed = previousIds.includes(b.id) ? 1 : 0;
  return aUsed - bUsed || Math.random() - 0.5;
});
  const selected = shuffled.slice(0, 3);

  if (honest.length > 0 && Math.random() < 0.3) {
    const special = honest[Math.floor(Math.random() * honest.length)];

    if (selected.length === 3) {
      selected[2] = special;
    } else {
      selected.push(special);
    }
  }

  
const result = selected.sort(() => Math.random() - 0.5);

writeStoredArray(previousQuestionKey, result.map(q => q.id));

return result;

}



function showDiagnosisQuestion() {
  cancelRoulette();
  const item = selectedQuestions[currentQuestion];

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
  visitTiming = null;
  diagnosisAnswers.length = 0;
  
showVisitTimingQuestion();

});


diagnosisPanel.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-visit-timing]");
  if (!button) return;

  visitTiming = button.dataset.visitTiming;
  selectedTodayPeriod = null;
  const period = todayVisitPeriods[visitTiming];
  if (period) {
    const selectedAt = new Date();
    const start = new Date(selectedAt);
    const end = new Date(selectedAt);
    start.setHours(period.start, 0, 0, 0);
    end.setHours(period.end, 0, 0, 0);
    selectedTodayPeriod = { timing: visitTiming, targetDate: dateKey(selectedAt), start, end };
  }
  if (!ensureVisitTimingAvailable()) return;

  if (visitTiming === "tomorrow") {
    cancelRoulette();
    diagnosisPanel.innerHTML = `
      <h2>🍜 明日はいつ食べに行きますか？</h2>
      <button type="button" data-visit-timing="tomorrow-lunch">☀️ 昼（12時）</button>
      <button type="button" data-visit-timing="tomorrow-evening">🌇 夕方（17時）</button>
      <button type="button" data-visit-timing="tomorrow-night">🌙 夜（19時）</button>
    `;
    return;
  }

  currentQuestion = 0;
  diagnosisAnswers.length = 0;
  selectedQuestions = pickDiagnosisQuestions();
  showDiagnosisQuestion();
});


diagnosisPanel.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-answer]");
  if (!button) return;
  if (!ensureVisitTimingAvailable()) return;

  const selectedIndex = Number(button.dataset.answer);
  diagnosisAnswers.push(selectedQuestions[currentQuestion].options[selectedIndex]);
  if (diagnosisAnswers.includes("はい、バレました😂")) {
  showDiagnosisResult(pickRecommendedRamenShop());
  return;
}
  currentQuestion++;

  if (currentQuestion < selectedQuestions.length) {
    showDiagnosisQuestion();
  } else {

const shop = pickRecommendedRamenShop();

showDiagnosisResult(shop);

  }
});

// 日時・季節・深夜の判定は本体と共通。診断は定休日未登録を要確認とする。
function diagnosisShopStatus(shop, date, checkTime = false) {
  return shopHoursStatus(shop, date, checkTime, true);
}

const diagnosisNearbyNames = ["食堂 松", "喜多方ラーメン専門店 喜鈴 喜多方店", "会津田舎家", "葵飯店", "喜多屋", "長谷川食堂", "ラーメン酒場 ばってん", "麺や玄", "ラーメンSHOPくるくる軒"];
const diagnosisRelatedNames = ["ラーメンうめ八", "香福"];

function showDiagnosisAlternatives(kind) {
  cancelRoulette();
  const date = getVisitDate();
  const names = kind === "nearby" ? diagnosisNearbyNames : diagnosisRelatedNames;
  const matches = names.map((name) => shopData.find((shop) => shop.name === name)).filter(shop => shop && !korakuenShopIds.has(shop.id));
const checked = matches.map((shop) => ({ shop, info: diagnosisShopStatus(shop, date, visitTiming === "now" || visitTiming?.startsWith("today-") || visitTiming?.startsWith("tomorrow-")) }));  const unknown = checked.filter(({ info }) => info.status === "unknown");
  const available = checked.filter(({ info }) => info.status === "possible");
  const closed = checked.filter(({ info }) => info.status === "closed");
  const heading = kind === "nearby" ? "🍜 坂内の近くにあるお店" : "🤝 坂内ゆかりのお店";
  diagnosisPanel.replaceChildren();
  appendHoursNotice();
  const h2 = document.createElement("h2"); h2.textContent = heading; diagnosisPanel.append(h2);
  const intro = document.createElement("p");
  intro.textContent = "指定日時の営業時間・定休日による判定結果です。";
  diagnosisPanel.append(intro);
  const addGroup = (title, list) => {
    if (!list.length) return;
    const h3 = document.createElement("h3"); h3.textContent = title; diagnosisPanel.append(h3);
    const ul = document.createElement("ul");
    list.forEach(({ shop, info }) => {
      const li = document.createElement("li");
      li.textContent = `${shop.name} — ${info.label}`;
      ul.append(li);
    });
    diagnosisPanel.append(ul);
  };
  if (!matches.length) {
    const notice = document.createElement("p");
    notice.textContent = "該当する店舗が見つかりませんでした。";
    diagnosisPanel.append(notice);
  }
  addGroup("営業時間内", available);
  addGroup("判定できません", unknown);
  addGroup("定休日・営業時間外", closed);
  if (kind === "related") {
    const note = document.createElement("p");
    note.textContent = "番外編：会津若松市の『坂新』も坂内ゆかりのお店です（95店舗の対象外のため、営業状況は別途ご確認ください）。";
    diagnosisPanel.append(note);
  }
  const back = document.createElement("button");
  back.type = "button"; back.dataset.diagnosisBack = "1"; back.textContent = "← 坂内の案内に戻る";
  diagnosisPanel.append(back);
}

let lastDiagnosisShop = null;
function showDiagnosisResult(shop) {
  cancelRoulette();
  lastDiagnosisShop = shop;
  diagnosisPanel.replaceChildren();
  appendHoursNotice();
if (!shop) {
  const message = document.createElement("p");
  message.textContent = "指定日時に営業時間内と判定された候補はありません。営業時間不明・判定できない店舗もあります。";

  const retryButton = document.createElement("button");
  retryButton.type = "button";
  retryButton.textContent = "🔄 日時を選び直す";
  retryButton.addEventListener("click", () => {
    visitTiming = null;
    diagnosisAnswers.length = 0;
    showVisitTimingQuestion();
  });

  diagnosisPanel.append(message, retryButton);
  return;
}  
if (shop.diagnosisUnknown) {
  const heading = document.createElement("h2");
  heading.textContent = shop.name + "の営業状況";
  const message = document.createElement("p");
  message.setAttribute("role", "status");
  message.textContent = "判定できません。指定日時の営業状況を確認できないため、通常のおすすめとしてはご案内できません。ご来店前に店舗の最新情報をご確認ください。";
  const retryButton = document.createElement("button");
  retryButton.type = "button";
  retryButton.textContent = "🔄 日時を選び直す";
  retryButton.addEventListener("click", () => {
    visitTiming = null;
    diagnosisAnswers.length = 0;
    showVisitTimingQuestion();
  });
  diagnosisPanel.append(heading, message, retryButton);
  return;
}
const heading = document.createElement("h2"); heading.textContent = shop.name.includes("坂内") && diagnosisAnswers.includes("はい、バレました😂") ? "🍜 やっぱり坂内でしたね！（笑）" : 
visitTiming?.startsWith("tomorrow")
  ? "🍜 明日の一杯はこちらのお店で！"
  : visitTiming === "later"
    ? "🍜 次の一杯はこちらのお店で！"
    : "🍜 今日の一杯はこちらのお店で！"
;
const intro = document.createElement("p"); intro.textContent = shop.name.includes("坂内") || shop.name.includes("ばんない") ? "🍜 そんなあなたには、やっぱり坂内食堂ですね！" : "今回ご紹介するお店は…";  const name = document.createElement("h3"); name.textContent = shop.name;
diagnosisPanel.append(heading, ...(shop.name.includes("坂内") || shop.name.includes("ばんない") ? [] : [intro]), name);
  if (shop.diagnosisClosed) {
const p1 = document.createElement("p");
p1.textContent = "指定日時は定休日または営業時間外です。";
diagnosisPanel.append(p1);
    [["nearby", "🍜 近くのお店を探す"], ["related", "🤝 ゆかりのお店を探す"], ["later", "📅 別の日に坂内へ"]].forEach(([value, label]) => {
      const button = document.createElement("button"); button.type = "button";
      button.dataset.diagnosisAlternative = value; button.textContent = label;
      diagnosisPanel.append(button);
    });
  } else {
const p = document.createElement("p");
p.textContent = visitTiming === "later"
  ? "来店日時を決めずに、お好みに合うお店をご紹介しています。ご来店前に店舗の営業時間・定休日をご確認ください。"
  : "営業時間・定休日をもとにご紹介しています。実際の営業状況と異なる場合があります。";
diagnosisPanel.append(p);  }
}

diagnosisPanel.addEventListener("click", (event) => {
  const alternative = event.target.closest("button[data-diagnosis-alternative]");
  if (alternative) {
   if (alternative.dataset.diagnosisAlternative === "later") {
  cancelRoulette();
  diagnosisPanel.innerHTML = `
    <h2>📅 坂内食堂への訪問日を選ぶ</h2>
    <p>訪問予定日を選択してください。</p>
    <input type="date" id="bannai-visit-date">
    <p>訪問予定時刻を選択してください。</p>
<input type="time" id="bannai-visit-time">
  `;
    } else {
      showDiagnosisAlternatives(alternative.dataset.diagnosisAlternative);
    }
    return;
  }
  if (event.target.closest("button[data-diagnosis-back]")) showDiagnosisResult(lastDiagnosisShop);
});
diagnosisPanel.addEventListener("change", (event) => {
if (!["bannai-visit-date", "bannai-visit-time"].includes(event.target.id)) return;
  const dateValue = diagnosisPanel.querySelector("#bannai-visit-date")?.value;
const timeValue = diagnosisPanel.querySelector("#bannai-visit-time")?.value;

if (!dateValue) return;

const [year, month, day] = dateValue.split("-").map(Number);
const visitDate = new Date(year, month - 1, day);
const weekday = visitDate.getDay();
if (timeValue) {
  const [hour, minute] = timeValue.split(":").map(Number);
  visitDate.setHours(hour, minute, 0, 0);
}
const bannaiShop = shopData.find((shop) => shop.name === "坂内食堂");
const bannaiStatus = bannaiShop ? diagnosisShopStatus(bannaiShop, visitDate, Boolean(timeValue)) : { status: "unknown", label: "店舗情報が見つかりません" };

  const result = document.createElement("p");
  result.id = "bannai-date-result";

if (bannaiStatus.status === "closed") {
  result.textContent =
    "指定日時は定休日または営業時間外です。";
} else if (bannaiStatus.status === "unknown") {
  result.textContent =
    "判定できません。";
} else {
  result.textContent =
    "指定日時は営業時間内です。";
}

  diagnosisPanel.querySelector("#bannai-date-result")?.remove();
  diagnosisPanel.append(result);
});
function getRouletteCandidates() {
  // 既存の95店舗データから候補を取得
  return shopData.filter((shop) => shop && shop.name);
}

function getDiagnosisCandidates() {
  return getRouletteCandidates().filter(shop => !korakuenShopIds.has(shop.id));
}

function pickRandomRamenShop() {
  const candidates = getRouletteCandidates();

  if (candidates.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * candidates.length);
  return candidates[randomIndex];
}


function getVisitDate() {
  const date = new Date();
  const period = todayVisitPeriods[visitTiming];
  if (period) {
    // 終了後を「日付未指定」のnullにせず、営業判定でunknownになる無効日付にする。
    if (selectedTodayPeriod?.timing !== visitTiming || date >= selectedTodayPeriod.end) return new Date(NaN);
    return selectedTodayPeriod.start > date ? new Date(selectedTodayPeriod.start) : date;
  }

  const visitHours = {
    "tomorrow-lunch": 12,
    "tomorrow-evening": 17,
    "tomorrow-night": 19,
  };

  if (visitTiming in visitHours) {
    date.setHours(visitHours[visitTiming], 0, 0, 0);
  }

  if (visitTiming?.startsWith("tomorrow")) {
    date.setDate(date.getDate() + 1);
  }

  if (visitTiming === "later") {
    return null;
  }

  return date;
}
function isBanNaiClosedOnVisitDate() {
  const date = getVisitDate();

  if (!date) {
    return false;
  }

  const day = date.getDay();
return false;
}
function pickRecommendedRamenShop() {
  const visitDate = getVisitDate();
  const candidates = getDiagnosisCandidates().filter(
    (shop) =>
      !visitDate ||
      diagnosisShopStatus(shop, visitDate, true).status === "possible"
);
const banNaiClosed = isBanNaiClosedOnVisitDate();
  const banNaiAnswer = diagnosisAnswers.find(
    (answer) =>
      answer === "はい、バレました😂" ||
      answer === "いやいや、今日は違うお店へ！"
  );

  if (banNaiAnswer === "はい、バレました😂") {
    const banNai = shopData.find(
      (shop) => shop.name.includes("坂内") || shop.name.includes("ばんない")
    );
    if (banNai) {
const status = visitDate ? diagnosisShopStatus(banNai, visitDate, true).status : null;
return {
  ...banNai,
  diagnosisUnknown: status === "unknown",
  diagnosisClosed: banNaiClosed || status === "closed",
};}
  }

  if (banNaiAnswer === "いやいや、今日は違うお店へ！") {
    const otherShops = candidates.filter(
      (shop) =>
        !shop.name.includes("坂内") && !shop.name.includes("ばんない")
    );
    if (otherShops.length > 0) {
      return otherShops[Math.floor(Math.random() * otherShops.length)];
    }
  }

  return candidates.length > 0
  ? candidates[Math.floor(Math.random() * candidates.length)]
  : null;
}

function showRandomRamenResult() {
  cancelRoulette();
  const generation = rouletteGeneration;
  rouletteButton.disabled = true;

  const shop = pickRandomRamenShop();

  if (!shop) {
    rouletteButton.disabled = false;
    diagnosisPanel.hidden = false;
    diagnosisPanel.textContent = "紹介できる店舗がありません。";
    return;
  }

  diagnosisPanel.hidden = false;
  diagnosisPanel.replaceChildren();
  appendHoursNotice();

  const title = document.createElement("h2");
  title.textContent = "🎯 今日のラーメン運試し！";

  const result = document.createElement("p");
  result.textContent = `あなたに選ばれたお店は「${shop.name}」です！`;
  
  const candidates = getRouletteCandidates();
  let spinCount = 0;

  rouletteTimer = setTimeout(function spin() {
    if (generation !== rouletteGeneration) return;
    rouletteTimer = null;
    const randomIndex = Math.floor(Math.random() * candidates.length);
    result.textContent = `🍜 ${candidates[randomIndex].name}`;
    spinCount++;
    
    if (spinCount < 15) {
      const nextDelay = 100 + spinCount * 25;
      rouletteTimer = setTimeout(spin, nextDelay);
    }


    if (spinCount >= 15) {
  
      
      result.textContent = `🎉 本日の運命のお店は… ${shop.name}！`;
      if (korakuenShopIds.has(shop.id)) {
        const note = document.createElement("p");
        note.textContent = "喜多方で、あえての幸楽苑！いつもの味を楽しむのも、今日の運しだい。";
        diagnosisPanel.append(note);
      }
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
