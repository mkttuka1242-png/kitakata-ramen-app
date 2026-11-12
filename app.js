const storageNotice = document.createElement("p");
storageNotice.setAttribute("role", "status");
document.querySelector(".summary").after(storageNotice);
function readStoredArray(key) {
  try {
    const raw = localStorage.getItem(key);
    const value = raw === null ? [] : JSON.parse(raw);
    if (!Array.isArray(value)) throw new Error("Invalid storage");
    return value;
  } catch (error) {
    storageNotice.textContent = "保存データを読み込めませんでした。元の保存内容は変更せず、今回は空の記録で表示します。チェック操作後は新しい記録を保存します。";
    return [];
  }
}
function writeStoredArray(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (error) { storageNotice.textContent = "記録を保存できません。この画面での変更は再読み込みすると失われる場合があります。"; }
}
    const STORAGE_KEY = "kitakata-ramen-visited-v1";
    let visited = readStoredArray(STORAGE_KEY);

    if (!Array.isArray(visited)) {
      visited = [];
    }

    const shopsElement = document.getElementById("shops");
    const countElement = document.getElementById("count");
    const percentElement = document.getElementById("percent");
    const resetButton = document.getElementById("reset");
const filterAllButton = document.getElementById("filter-all");
const filterVisitedButton = document.getElementById("filter-visited");
const filterUnvisitedButton = document.getElementById("filter-unvisited");
const filterOpenButton = document.getElementById("filter-open");
    function saveVisited() {
      writeStoredArray(STORAGE_KEY, visited);
    }

    function updateCount() {
      const total = shopData.length;
      const done = visited.length;
      const percent = Math.round((done / total) * 100);

      countElement.textContent = `訪問済み ${done} / ${total} 店`;
      percentElement.textContent = `制覇率 ${percent}%`;
    }

    function toggleVisited(id, button) {
      if (visited.includes(id)) {
        visited = visited.filter((visitedId) => visitedId !== id);
        button.classList.remove("visited");
        button.setAttribute("aria-pressed", "false");
      } else {
        visited.push(id);
        visited.sort((a, b) => a - b);
        button.classList.add("visited");
        button.setAttribute("aria-pressed", "true");
      }

      saveVisited();
      updateCount();
      applyFilters();
    }
let holidayDates = [];
let holidayState = "loading";
const holidayNotice = document.createElement("p");
holidayNotice.id = "holiday-status";
holidayNotice.setAttribute("role", "status");
document.querySelector(".hours-notice").append(holidayNotice);
function dateKey(date) {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}
function holidaysKnownFor(date) {
  return holidayDates.some(key => key.startsWith(date.getFullYear() + "-"));
}
function scheduleForDate(shop, date) {
  const day = date.getDay(), month = date.getMonth() + 1;
  const previous = new Date(date); previous.setDate(date.getDate() - 1);
  if (!holidaysKnownFor(date) || (shop.closedAfterHoliday && !holidaysKnownFor(previous)))
    return { status: "unknown", label: "判定できません" };
  const holiday = holidayDates.includes(dateKey(date));
  if (shop.closedAfterHoliday && holidayDates.includes(dateKey(previous)) && shop.closedDays?.includes(previous.getDay()))
    return { status: "closed", label: "定休日" };
  if (shop.closedDays?.includes(day) && !holiday) return { status: "closed", label: "定休日" };
  if (shop.winterClosedDays?.includes(day) && [12,1,2,3].includes(month) && !holiday) return { status: "closed", label: "定休日" };
  if (shop.firstWeekdayClosed === day && date.getDate() <= 7 && !holiday) return { status: "closed", label: "定休日" };
  const weekend = day === 0 || day === 6 || holiday;
  const hours = ([12,1,2].includes(month) && (weekend ? shop.winterHoursWeekend : shop.winterHoursWeekday)) ||
    ([12,1,2].includes(month) && shop.winterHours) ||
    ([4,5,6,7,8,9,10,11].includes(month) && weekend && shop.springToAutumnWeekendHours) ||
    shop.hoursByDay?.[day] || (weekend ? shop.hoursWeekend || shop.hours : shop.hoursWeekday || shop.hours);
  return typeof hours === "string" ? { status: "possible", hours } : { status: "unknown", label: "営業時間不明" };
}
function hoursMatch(hours, minutes, previousDay = false) {
  if (typeof hours !== "string") return false;
  return hours.split(",").some(range => {
    const m = range.trim().match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
    if (!m) return false;
    const start = Number(m[1])*60 + Number(m[2]), end = Number(m[3])*60 + Number(m[4]);
    if (Number(m[1]) > 23 || Number(m[2]) > 59 || Number(m[3]) > 24 || Number(m[4]) > 59 || (Number(m[3]) === 24 && Number(m[4]) !== 0)) return false;
    if (previousDay) return end <= start && minutes < end;
    return end <= start ? minutes >= start : minutes >= start && minutes < end;
  });
}
function shopHoursStatus(shop, date, checkTime = true, requireClosedDays = false) {
  if (!date || Number.isNaN(date.getTime())) return { status: "unknown", label: "訪問日を決めてから営業情報をご確認ください" };
  const today = scheduleForDate(shop, date);
  const hasClosedDays = Array.isArray(shop.closedDays) || shop.firstWeekdayClosed !== undefined || Array.isArray(shop.winterClosedDays);
  const possible = hours => requireClosedDays && !hasClosedDays
    ? { status: "unknown", label: "判定できません" }
    : { status: "possible", label: "営業時間内" };
  if (!checkTime) return today.status === "possible" ? (requireClosedDays && !hasClosedDays ? possible(today.hours) : { status: "possible", label: "営業時間：" + today.hours + "" }) : today;
  const minutes = date.getHours()*60 + date.getMinutes();
  if (hoursMatch(today.hours, minutes)) return possible(today.hours);
  const previous = new Date(date); previous.setDate(date.getDate() - 1);
  const yesterday = scheduleForDate(shop, previous);
  if (hoursMatch(yesterday.hours, minutes, true)) return possible(yesterday.hours);
  if (today.status === "unknown" || yesterday.status === "unknown") return { status: "unknown", label: today.label === "営業時間不明" ? "営業時間不明" : "判定できません" };
  return { status: "closed", label: today.status === "closed" ? today.label : "営業時間外" };
}
function isOpenNow(shop, now = new Date()) {
  return shopHoursStatus(shop, now).status === "possible";
}
function refreshHours() {
  holidayNotice.textContent = holidayState === "loading" ? "祝日情報を確認しています。" :
    holidayState === "failed" ? "祝日情報を取得できませんでした。祝日の営業や振替休業を正しく表示できない場合があります。" :
    holidaysKnownFor(new Date()) ? "営業時間の判定には祝日も考慮しています。" : "今年の祝日情報を確認できないため、判定できません。";
  document.querySelectorAll(".shop").forEach((button, index) => {
    button.querySelector(".open-status").textContent = shopHoursStatus(shopData[index], new Date()).label;
  });
  applyFilters();
}
async function loadHolidays() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch("https://holidays-jp.github.io/api/v1/date.json", { signal: controller.signal });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();
    if (!data || Array.isArray(data) || typeof data !== "object") throw new Error("Invalid holidays");
    const keys = Object.keys(data);
    if (!keys.length || !keys.every(key => /^\d{4}-\d{2}-\d{2}$/.test(key))) throw new Error("Invalid dates");
    holidayDates = keys;
    holidayState = "ready";
  } catch (error) { holidayDates = []; holidayState = "failed"; }
  finally { clearTimeout(timer); refreshHours(); }
}

shopData.forEach((shop) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "shop";
  button.setAttribute("aria-label", `${shop.name}、${shop.area}`);
  button.setAttribute(
    "aria-pressed",
    visited.includes(shop.id) ? "true" : "false"
  );

  if (visited.includes(shop.id)) {
    button.classList.add("visited");
  }

  const nameSpan = document.createElement("span");
nameSpan.className = `name ${shop.color}`;
nameSpan.textContent = shop.name;

const areaSpan = document.createElement("span");
areaSpan.className = "area";
areaSpan.textContent = shop.area;

button.appendChild(nameSpan);
button.appendChild(areaSpan);
const status = document.createElement("span");
status.className = "open-status";
status.textContent = shopHoursStatus(shop, new Date()).label;
button.appendChild(status);

 const mapQuery = encodeURIComponent(`${shop.name} 福島県喜多方市`);
 const mapButton = document.createElement("button");
 mapButton.textContent = "🗺️ 地図";
 mapButton.className = "map-button";
 mapButton.addEventListener("click", (event) => {
  event.stopPropagation();
  window.open(`https://www.google.com/maps/search/?api=1&query=${mapQuery}`, "_blank");
});
button.appendChild(mapButton); 
  button.addEventListener("click", () => toggleVisited(shop.id, button));
  shopsElement.appendChild(button);
});

resetButton.addEventListener("click", () => {
  const confirmed = window.confirm("すべての訪問チェックを解除しますか？");

  if (!confirmed) return;

  visited = [];
  saveVisited();

  document.querySelectorAll(".shop.visited").forEach((button) => {
    button.classList.remove("visited");
    button.setAttribute("aria-pressed", "false");
  });

  updateCount();
  applyFilters();
});

updateCount();
filterOpenButton.addEventListener("click", () => {
  openFilter = !openFilter;
applyFilters();
  filterOpenButton.classList.toggle("active", openFilter);
});
function setActiveFilter(activeButton) {
[filterAllButton, filterVisitedButton, filterUnvisitedButton].forEach((button) => {
  button.classList.remove("active");
});

  activeButton.classList.add("active");
}

const shareXButton = document.getElementById("share-x");
const shareXTopButton = document.getElementById("share-x-top");

shareXButton.addEventListener("click", () => {
 const text = `🍜 喜多方ラーメン巡り\n現在${visited.length}/${shopData.length}店を訪問しました！\n制覇率${Math.round((visited.length / shopData.length) * 100)}%\n「喜多方ラーメン９５」\n#喜多方ラーメン\nhttps://kitakataramen.aizu.blog/`;
 const xUrl = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(text);
 window.open(xUrl, "_blank");
 }); 
 shareXTopButton.addEventListener("click", () => shareXButton.click());

const shopSearch = document.getElementById("shop-search");

const areaFilter = document.getElementById("area-filter");
let visitFilter = "all";
let openFilter = false;

function applyFilters() {
const selectedArea = areaFilter.value;
const keyword = shopSearch.value.trim().toLowerCase();
let visibleCount = 0;

document.querySelectorAll(".shop").forEach((button, index) => {
const shopName = button.querySelector(".name").textContent.toLowerCase();
const shopArea = button.querySelector(".area").textContent.trim();
const matchesKeyword = shopName.includes(keyword);
const matchesArea = selectedArea === "all" || shopArea === selectedArea;
const matchesVisit = visitFilter === "all" || (visitFilter === "visited" && button.classList.contains("visited")) || (visitFilter === "unvisited" && !button.classList.contains("visited"));
const matchesOpen = !openFilter || isOpenNow(shopData[index]);
button.hidden = !(matchesKeyword && matchesArea && matchesVisit && matchesOpen);
if (!button.hidden) visibleCount++;
});
document.getElementById("result-count").textContent = `表示中 ${visibleCount}店`;
}  

shopSearch.addEventListener("input", applyFilters);
areaFilter.addEventListener("change", applyFilters);
filterAllButton.addEventListener("click", () => {
  visitFilter = "all";
  openFilter = false;
  filterOpenButton.classList.remove("active");
setActiveFilter(filterAllButton);
applyFilters(); 
});
filterVisitedButton.addEventListener("click", () => {
visitFilter = "visited";
setActiveFilter(filterVisitedButton);
applyFilters();
});
filterUnvisitedButton.addEventListener("click", () => { 
  visitFilter = "unvisited";
    setActiveFilter(filterUnvisitedButton);
      applyFilters();
      });
      
const facebookShareTop = document.getElementById("share-facebook-top");

facebookShareTop.addEventListener("click", () => {
const shareUrl = "https://kitakataramen.aizu.blog/";
const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
window.open(facebookUrl, "_blank", "noopener,noreferrer");
});

const threadsShareTop = document.getElementById("share-threads-top");

threadsShareTop.addEventListener("click", () => {
  const shareUrl = "https://kitakataramen.aizu.blog/";
  const done = visited.length;
  const percent = Math.round((done / shopData.length) * 100);
  const shareText = ` 喜多方ラーメン巡り\n訪問済み ${done} / ${shopData.length}店\n制覇率 ${percent}%\n「喜多方ラーメン９５」`;

  const threadsUrl = `https://www.threads.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  window.open(threadsUrl, "_blank", "noopener,noreferrer");
});
refreshHours();
loadHolidays();
setInterval(refreshHours, 60000);
