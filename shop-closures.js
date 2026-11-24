// 休業区分は temporary（臨時）、winter（冬期）、long-term（長期）。
// 開始日と終了日を含む。終了日が null のときは再開確認まで継続する。
const shopClosures = {
  77: [
    {
      type: "temporary",
      label: "休業",
      startDate: "2026-11-30",
      endDate: "2026-11-30",
      checkedOn: "2026-11-25",
      sourceUrl: "https://www.instagram.com/p/DgH6c0wyuUi/",
    },
    {
      type: "winter",
      label: "冬期休業",
      startDate: "2026-12-01",
      endDate: null,
      checkedOn: "2026-11-25",
      sourceUrl: "https://www.instagram.com/p/DgH6c0wyuUi/",
    },
  ],
};

const closureDateFormat = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function closureDateKey(date) {
  const parts = closureDateFormat.formatToParts(date);
  const part = (type) => parts.find((entry) => entry.type === type).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function getShopClosure(shopId, date = new Date()) {
  const periods = shopClosures[shopId];
  if (!periods || !date || Number.isNaN(date.getTime())) return null;
  const day = closureDateKey(date);
  return periods.find(({ startDate, endDate }) =>
    startDate <= day && (endDate === null || day <= endDate)
  ) ?? null;
}
