(() => {
  const listBtn = document.getElementById('view-list');
  const mapBtn = document.getElementById('view-map');
  const list = document.getElementById('shops');
  const panel = document.getElementById('map-panel');
  const message = document.getElementById('map-message');
  const locations = window.shopLocations || {};
  let map = null, layer = null;
  const markers = new Map();
  let visibleMarkers = [];
  function clusterStylesLoaded() {
    // 読み込み失敗時も空のスタイルシートが作られることがある。
    try {
      return ['marker-cluster-css', 'marker-cluster-theme'].every((id) =>
        document.getElementById(id)?.sheet?.cssRules.length > 0);
    } catch {
      return false;
    }
  }
  function ensureMap() {
    if (map || typeof L === 'undefined') return;
    map = L.map('shop-map').setView([37.65, 139.875], 11); // 喜多方市周辺の表示中心（店舗位置ではない）
    const tileMessage = document.createElement('p');
    tileMessage.setAttribute('role', 'status');
    tileMessage.hidden = true;
    message.after(tileMessage);
    let tileFailed = false;
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19,
      // ページ全体の no-referrer は維持し、タイル画像にだけサイトのオリジンを送る。
      referrerPolicy: 'strict-origin-when-cross-origin'
    });
    tiles.on('loading', () => { tileFailed = false; });
    tiles.on('tileerror', () => {
      tileFailed = true;
      tileMessage.textContent = '背景地図の一部または全部を読み込めませんでした。通信状態や地図提供元の利用制限をご確認ください。店舗ピンと登録情報は保持されています。';
      tileMessage.hidden = false;
    });
    tiles.on('load', () => {
      if (!tileFailed) { tileMessage.textContent = ''; tileMessage.hidden = true; }
    });
    tiles.addTo(map);
    const clusteringAvailable = typeof L.markerClusterGroup === 'function' && clusterStylesLoaded();
    const markerLayer = clusteringAvailable ? L.markerClusterGroup({
      maxClusterRadius: (zoom) => zoom >= 19 ? 40 : 60,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: true,
      spiderfyDistanceMultiplier: 1.5,
    }) : L.layerGroup();
    layer = markerLayer.addTo(map);
    shopData.forEach(shop => {
      const pos = locations[shop.id];
      if (!pos || !Number.isFinite(pos.lat) || !Number.isFinite(pos.lng)) return;
      const marker = L.marker([pos.lat, pos.lng]);
      const content = document.createElement('div');
      const name = document.createElement('strong'); name.textContent = shop.name;
      const area = document.createElement('p'); area.textContent = shop.area;
      const closureStatus = document.createElement('p'); closureStatus.hidden = true;
      const link = document.createElement('a');
      link.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.name + ' 福島県喜多方市')}`;
      link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Googleマップで確認';
      content.append(name, area, closureStatus, link);
      marker.bindPopup(content); markers.set(shop.id, { marker, closureStatus });
    });
  }
  function refresh() {
    if (!map) return;
    const now = new Date();
    const nextMarkers = [];
    document.querySelectorAll('#shops .shop-card').forEach(card => {
      if (card.hidden) return;
      const shopId = Number(card.dataset.shopId);
      const entry = markers.get(shopId);
      if (!entry) return;
      const { marker, closureStatus } = entry;
      const closure = getShopClosure(shopId, now);
      closureStatus.textContent = closure?.label ?? '';
      closureStatus.hidden = !closure;
      const visited = card.classList.contains('visited');
      marker.setOpacity(visited ? 1 : 0.65);
      nextMarkers.push(marker);
    });
    // 店舗の表示対象が同じ間は、開いているポップアップや展開済みのピンを保つ。
    if (nextMarkers.length !== visibleMarkers.length ||
        nextMarkers.some((marker, index) => marker !== visibleMarkers[index])) {
      layer.clearLayers();
      if (typeof layer.addLayers === 'function') layer.addLayers(nextMarkers);
      else nextMarkers.forEach(marker => marker.addTo(layer));
      visibleMarkers = nextMarkers;
    }
    message.textContent = `絞り込み条件に合う店舗のうち、位置確認済み ${visibleMarkers.length} 店を表示しています。未登録の店舗は表示されません。`;
  }
  function showMap(enabled) {
    panel.hidden = !enabled; list.hidden = enabled;
    mapBtn.classList.toggle('active', enabled); listBtn.classList.toggle('active', !enabled);
    mapBtn.setAttribute('aria-pressed', String(enabled)); listBtn.setAttribute('aria-pressed', String(!enabled));
    if (!enabled) return;
    if (typeof L === 'undefined') { message.textContent = '地図ライブラリを読み込めませんでした。通信状態をご確認ください。'; return; }
    ensureMap(); setTimeout(() => { map.invalidateSize(); refresh(); }, 0);
  }
  listBtn.addEventListener('click', () => showMap(false));
  mapBtn.addEventListener('click', () => showMap(true));
  window.addEventListener('kitakata:filters-updated', refresh);
})();
