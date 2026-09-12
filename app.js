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

  button.innerHTML = `
    <span class="name ${shop.color}">${shop.name}</span>
    <span class="area">${shop.area}</span>
  `;

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
function setActiveFilter(activeButton) {
  [filterAllButton, filterVisitedButton, filterUnvisitedButton].forEach((button) => {
    button.classList.remove("active");
  });

  activeButton.classList.add("active");
}

const shareXButton = document.getElementById("share-x");

shareXButton.addEventListener("click", () => {
 const text = `🍜 喜多方ラーメン巡り\n現在${visited.length}/${shopData.length}店を訪問しました！\n制覇率${Math.round((visited.length / shopData.length) * 100)}%\n#喜多方ラーメン\nhttps://mkttuka1242-png.github.io/kitakata-ramen-app/`;
 const xUrl = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(text);
 window.open(xUrl, "_blank");
 }); 