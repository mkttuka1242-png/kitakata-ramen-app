    const STORAGE_KEY = "kitakata-ramen-visited-v1";
    let visited = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visited));
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
    }
let holidayDates = [];
fetch("https://holidays-jp.github.io/api/v1/date.json")
  .then((response) => response.json())
  .then((data) => {
      holidayDates = Object.keys(data);
      document.querySelectorAll(".shop").forEach((button, index) => {
  const status = button.querySelector(".open-status");
  if (status) {
    status.textContent = isOpenNow(shopData[index]) ? "営業時間内" : "営業時間外";
  }
});
});
function isOpenNow(shop) {
if (!shop.hours && !shop.hoursWeekday && !shop.hoursWeekend && !shop.hoursByDay && !shop.winterHours) return false; 
const today = new Date().getDay();

const now = new Date();
const currentMonth = now.getMonth() + 1;
const todayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
const isHoliday = holidayDates.includes(todayDate);
const yesterday = new Date(now);
yesterday.setDate(now.getDate() - 1);
const yesterdayDate = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
const wasYesterdayHoliday = holidayDates.includes(yesterdayDate);
if (shop.closedAfterHoliday && wasYesterdayHoliday && shop.closedDays?.includes(yesterday.getDay())) return false;
if (shop.closedDays && shop.closedDays.includes(today) && !isHoliday) return false;
if (shop.winterClosedDays && [12, 1, 2, 3].includes(currentMonth) && shop.winterClosedDays.includes(today) && !isHoliday) return false;
if (shop.firstWeekdayClosed === today && now.getDate() <= 7 && !isHoliday) return false;

 const currentMinutes = now.getHours() * 60 + now.getMinutes();

const isWeekend = today === 0 || today === 6;
const isSpringToAutumn = [4, 5, 6, 7, 8, 9, 10, 11].includes(currentMonth);
const hours =
  ([12, 1, 2].includes(currentMonth) &&
    (isWeekend || isHoliday
      ? shop.winterHoursWeekend
      : shop.winterHoursWeekday)) ||
  ([12, 1, 2].includes(currentMonth) && shop.winterHours) ||
  (isSpringToAutumn &&
    (isWeekend || isHoliday) &&
    shop.springToAutumnWeekendHours) ||
  shop.hoursByDay?.[today] ||
  (isWeekend || isHoliday
    ? shop.hoursWeekend || shop.hours
    : shop.hoursWeekday || shop.hours);
if (!hours) return false;
const timeRanges = hours.split(",");

  return timeRanges.some((timeRange) => {
    const [open, close] = timeRange.split("-");
    const [openHour, openMinute] = open.split(":").map(Number);
    const [closeHour, closeMinute] = close.split(":").map(Number);

    const openMinutes = openHour * 60 + openMinute;
    const closeMinutes = closeHour * 60 + closeMinute;

    if (closeMinutes <= openMinutes) {
  return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
}

return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  });
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
if (shop.hours || shop.hoursWeekday || shop.hoursWeekend || shop.hoursByDay) {
  const status = document.createElement("span");
  status.textContent = isOpenNow(shop) ? "営業時間内" : "営業時間外";
  status.className = "open-status";
  button.appendChild(status);
}

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
});

updateCount();
filterAllButton.addEventListener("click", () => {
  document.querySelectorAll(".shop").forEach((button) => button.hidden = false);
  setActiveFilter(filterAllButton);
});
filterVisitedButton.addEventListener("click", () => {
  document.querySelectorAll(".shop").forEach((button) => {
    button.hidden = !button.classList.contains("visited");
  });
setActiveFilter(filterVisitedButton);  
});
filterUnvisitedButton.addEventListener("click", () => {
  document.querySelectorAll(".shop").forEach((button) => {
    button.hidden = button.classList.contains("visited");
  });
  setActiveFilter(filterUnvisitedButton);
});
filterOpenButton.addEventListener("click", () => {
  document.querySelectorAll(".shop").forEach((button, index) => {
    button.hidden = !isOpenNow(shopData[index]);
  });
  setActiveFilter(filterOpenButton);
});
function setActiveFilter(activeButton) {
[filterAllButton, filterVisitedButton, filterUnvisitedButton, filterOpenButton].forEach((button) => {
  button.classList.remove("active");
});

  activeButton.classList.add("active");
}

const shareXButton = document.getElementById("share-x");
const shareXTopButton = document.getElementById("share-x-top");

shareXButton.addEventListener("click", () => {
 const text = `🍜 喜多方ラーメン巡り\n現在${visited.length}/${shopData.length}店を訪問しました！\n制覇率${Math.round((visited.length / shopData.length) * 100)}%\n#喜多方ラーメン\nhttps://mkttuka1242-png.github.io/kitakata-ramen-app/`;
 const xUrl = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(text);
 window.open(xUrl, "_blank");
 }); 
 shareXTopButton.addEventListener("click", () => shareXButton.click());

const shopSearch = document.getElementById("shop-search");

shopSearch.addEventListener("input", () => {
const keyword = shopSearch.value.trim().toLowerCase();
document.querySelectorAll(".shop").forEach((button) => {
const shopName = button.querySelector(".name").textContent.toLowerCase();
button.hidden = !shopName.includes(keyword);
});
});

const areaFilter = document.getElementById("area-filter");
let visitFilter = "all";
areaFilter.addEventListener("change", () => {
  const selectedArea = areaFilter.value;

  document.querySelectorAll(".shop").forEach((button) => {
    const shopArea = button.querySelector(".area").textContent.trim();

    button.hidden =
      selectedArea !== "all" && shopArea !== selectedArea;
  });
});

function applyFilters() {
const selectedArea = areaFilter.value;
const keyword = shopSearch.value.trim().toLowerCase();

document.querySelectorAll(".shop").forEach((button) => {
const shopName = button.querySelector(".name").textContent.toLowerCase();
const shopArea = button.querySelector(".area").textContent.trim();
const matchesKeyword = shopName.includes(keyword);
const matchesArea = selectedArea === "all" || shopArea === selectedArea;
const matchesVisit = visitFilter === "all" || (visitFilter === "visited" && button.classList.contains("visited")) || (visitFilter === "unvisited" && !button.classList.contains("visited"));
button.hidden = !(matchesKeyword && matchesArea && matchesVisit);
});
}  

shopSearch.addEventListener("input", applyFilters);
areaFilter.addEventListener("change", applyFilters);
filterAllButton.addEventListener("click", () => {
  visitFilter = "all";
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
const shareUrl = "https://mkttuka1242-png.github.io/kitakata-ramen-app/";
const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
window.open(facebookUrl, "_blank", "noopener,noreferrer");
});

const threadsShareTop = document.getElementById("share-threads-top");

threadsShareTop.addEventListener("click", () => {
  const shareUrl = "https://mkttuka1242-png.github.io/kitakata-ramen-app/";
  const done = visited.length;
  const percent = Math.round((done / shopData.length) * 100);
  const shareText = ` 喜多方ラーメン巡り\n訪問済み ${done} / ${shopData.length}店\n制覇率 ${percent}%`;

  const threadsUrl = `https://www.threads.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  window.open(threadsUrl, "_blank", "noopener,noreferrer");
});