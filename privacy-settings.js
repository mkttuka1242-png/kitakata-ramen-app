(() => {
  const key = 'kitakata-ramen-analytics-disabled';
  const status = document.getElementById('analytics-setting-status');
  function update() {
    try { status.textContent = localStorage.getItem(key) === 'true' ? 'このブラウザのアクセス解析は停止設定です。' : '停止設定はありません。管理側の安全設定確認後に計測対象となります。'; }
    catch (_) { status.textContent = '設定を読み取れません。この場合、アプリはアクセス解析を開始しません。'; }
  }
  for (const [id, value] of [['analytics-stop', 'true'], ['analytics-resume', 'false']]) {
    document.getElementById(id).addEventListener('click', () => {
      try { localStorage.setItem(key, value); update(); }
      catch (_) { status.textContent = '設定を保存できませんでした。ブラウザの設定またはGoogleのオプトアウト機能をご利用ください。'; }
    });
  }
  update();
})();
