// GA4管理画面で拡張計測をオフにした確認が取れるまで、index.htmlのゲートはpendingにする。
(() => {
  'use strict';
  try {
    const w = window;
    if (w.__ramenAnalyticsInitialized) return;
    w.__ramenAnalyticsInitialized = true;
    const location = w.location;
    if (location.protocol !== 'https:' || location.hostname !== 'kitakataramen.aizu.blog' || location.port ||
        !['/', '/index.html'].includes(location.pathname) || w.self !== w.top ||
        document.currentScript?.dataset.enhancedMeasurement !== 'off-confirmed') return;
    // 設定を読めない場合も送信しない。訪問記録のキーにはアクセスしない。
    if (w.localStorage.getItem('kitakata-ramen-analytics-disabled') === 'true') return;
    const id = 'G-R6YYLGV5H3';
    const allowed = new Set([
      'diagnosis_start', 'diagnosis_result', 'roulette_start', 'roulette_result',
      'visit_add', 'visit_remove', 'map_click', 'share_x_click', 'share_facebook_click', 'share_threads_click',
    ]);
    const page = { page_location: 'https://kitakataramen.aizu.blog/', page_title: '喜多方ラーメン95', page_referrer: '' };
    let failed = false;
    let loaded = false;
    w.dataLayer = w.dataLayer || [];
    function gtag() { w.dataLayer.push(arguments); }
    function track(name) {
      try {
        if (failed || w['ga-disable-' + id] || !allowed.has(name) || (!loaded && w.dataLayer.length >= 200)) return;
        // 呼び出し側の追加引数・店舗情報・DOM・URL・記録を一切転送しない。
        gtag('event', name, { ...page, send_to: id });
      } catch (_) { /* 計測失敗で本体を止めない */ }
    }
    w.ramenAnalytics = Object.freeze({ track });
    gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    gtag('js', new Date());
    gtag('config', id, {
      ...page, send_page_view: false, ignore_referrer: true,
      allow_google_signals: false, allow_ad_personalization_signals: false,
      campaign_id: '', campaign_source: '', campaign_medium: '', campaign_name: '', campaign_term: '', campaign_content: '',
    });
    // configの自動PVは止め、固定URLのPVを初期化ごとに1回だけキューへ入れる。
    gtag('event', 'page_view', { ...page, send_to: id });
    const script = document.createElement('script');
    script.async = true;
    script.referrerPolicy = 'no-referrer';
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    script.onload = () => { loaded = true; };
    script.onerror = () => { failed = true; w['ga-disable-' + id] = true; };
    document.head.appendChild(script);
  } catch (_) { /* タグ遮断・保存領域拒否・読み込み失敗でも本体を止めない */ }
})();
