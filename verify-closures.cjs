const assert = require('node:assert/strict');
const { boot } = require('./verify.cjs');

const visitedKey = 'kitakata-ramen-visited-v1';
const saved = '[77,92]';
const source = 'https://www.instagram.com/p/DgH6c0wyuUi/';
let checks = 0;

function equal(actual, expected, message) {
  assert.equal(actual, expected, message);
  checks++;
}

function panelText(node) {
  return [node.textContent, ...node.children.map(panelText)].join('\n');
}

(async () => {
  const app = await boot({ stored: saved, now: '2026-11-29T12:00:00+09:00', timers: true });
  const { run } = app;
  const card = app.get('shops').children[76];
  const status = card.querySelector('.open-status');
  run('const en = shopData.find(shop => shop.id === 77);');
  const closure = "(getShopClosure(77)?.label ?? '')";
  const recommendationHasEn = 'getDiagnosisCandidates().some(shop => shop.id === 77)';
  const rouletteHasEn = 'getRouletteCandidates().some(shop => shop.id === 77)';
  equal(run('shopData.length'), 95, 'registration count');
  equal(run('new Set(shopData.map(shop => shop.id)).size'), 95, 'unique shop IDs');
  equal(run('visited.includes(77)'), true, 'existing visit loaded');
  equal(run('shopClosures[77][0].type'), 'temporary', 'temporary closure category');
  equal(run('shopClosures[77][1].type'), 'winter', 'winter closure category');
  equal(run('shopClosures[77].every(period => period.sourceUrl === ' + JSON.stringify(source) + ')'), true, 'source metadata');
  equal(run('shopClosures[77].every(period => period.checkedOn === "2026-11-25")'), true, 'date checked metadata');
  equal(run('shopClosures[77][1].endDate'), null, 'reopening is unknown');
  equal(run('shopHoursStatus(en, new Date()).status'),
    run('shopHoursStatus({ ...en, id: 0 }, new Date()).status'), 'November 29 uses the ordinary schedule');
  equal(run(recommendationHasEn), true, 'diagnosis can consider ID 77 before closure');
  equal(run(rouletteHasEn), true, 'roulette can consider ID 77 before closure');

  const search = app.get('shop-search');
  search.value = 'めん処 縁';
  search.fire('input');
  equal(app.get('result-count').textContent, '表示中 1店', 'shop searchable before closure');

  const periods = [
    ['2026-11-29T14:59:59.999Z', ''],
    ['2026-11-29T15:00:00.000Z', '休業'],
    ['2026-11-30T14:59:59.999Z', '休業'],
    ['2026-11-30T15:00:00.000Z', '冬期休業'],
    ['2026-12-31T15:00:00.000Z', '冬期休業'],
    ['2027-05-15T03:00:00.000Z', '冬期休業'],
  ];
  for (const [instant, label] of periods) {
    app.setNow(instant);
    run('refreshHours()');
    equal(run(closure), label, 'closure at ' + instant);
    equal(card.hidden, false, 'card remains in search at ' + instant);
    if (!label) continue;
    equal(status.textContent, label, 'card label at ' + instant);
    equal(run('isOpenNow(en)'), false, 'open now at ' + instant);
    equal(run('shopHoursStatus(en, new Date(), false).label'), label, 'date-only decision at ' + instant);
    equal(run(rouletteHasEn), false, 'roulette exclusion at ' + instant);
    app.get('filter-open').click();
    equal(card.hidden, true, 'open filter hides card at ' + instant);
    app.get('filter-open').click();
  }

  app.setNow('2026-11-29T12:00:00+09:00');
  run('visitTiming = "tomorrow-lunch"');
  equal(run(recommendationHasEn), false, 'tomorrow diagnosis excludes the coming closure');
  run('visitTiming = "later"');
  equal(run(recommendationHasEn), true, 'undated diagnosis before closure');
  app.setNow('2026-12-01T12:00:00+09:00');
  equal(run(recommendationHasEn), false, 'undated diagnosis during closure');
  equal(run('Array.from({ length: 92 }, (_, i) => { Math.random = () => (i + 0.5) / 92; return pickRecommendedRamenShop().id; }).includes(77)'),
    false, 'all undated recommendation slots exclude ID 77');

  run('diagnosisNearbyNames.push(en.name); diagnosisRelatedNames.push(en.name);');
  for (const kind of ['nearby', 'related']) {
    run('showDiagnosisAlternatives(' + JSON.stringify(kind) + ')');
    equal(panelText(app.get('diagnosis-panel')).includes('めん処 縁'), false, kind + ' alternatives exclude closures');
  }
  run('const bannai = shopData.find(shop => shop.name === "坂内食堂");');
  run('shopClosures[bannai.id] = shopClosures[77]; diagnosisAnswers.push("はい、バレました😂");');
  equal(run('pickRecommendedRamenShop()?.id === bannai.id'), false, 'special recommendation excludes a closed shop');
  run('showDiagnosisResult(bannai)');
  equal(panelText(app.get('diagnosis-panel')).includes('坂内食堂'), false, 'a stale result cannot reopen a closed recommendation');
  run('delete shopClosures[bannai.id]; diagnosisAnswers.length = 0;');

  const rouletteButton = app.get('start-roulette');
  const panel = app.get('diagnosis-panel');
  run('Math.random = () => 76.5 / 95;');
  rouletteButton.click();
  let spin;
  while ((spin = app.takeNextTimer())) {
    spin();
    equal(panelText(panel).includes('めん処 縁'), false, 'closed shop excluded from roulette frame and result');
  }
  equal(panelText(panel).includes('本日の運命のお店'), true, 'roulette completes');

  app.setNow('2026-11-29T14:59:59.999Z');
  equal(run('pickRandomRamenShop().id'), 77, 'original draw would select ID 77');
  rouletteButton.click();
  app.setNow('2026-11-29T15:00:00.000Z');
  while ((spin = app.takeNextTimer())) {
    spin();
    equal(panelText(panel).includes('めん処 縁'), false, 'a closure starting during the spin invalidates the original draw');
  }
  equal(panelText(panel).includes('本日の運命のお店'), true, 'roulette completes after the boundary');
  equal(rouletteButton.disabled, false, 'roulette can run again');

  const outage = await boot({ fail: true, now: '2026-12-01T03:00:00Z' });
  equal(outage.get('shops').children[76].querySelector('.open-status').textContent, '冬期休業', 'closure takes precedence when holiday data fails');
  run('shopClosures[77][1].endDate = "2027-03-31"');
  app.setNow('2027-03-31T14:59:59.999Z');
  equal(run(closure), '冬期休業', 'known end date is inclusive');
  app.setNow('2027-03-31T15:00:00.000Z');
  run('refreshHours()');
  equal(run(closure), '', 'normal decision resumes the day after the end date');
  equal(run(rouletteHasEn), true, 'reopened shop returns to roulette');
  equal(app.get('count').textContent, '訪問済み 2 / 95 店', 'visit count and denominator unchanged');
  equal(app.get('shops').children.length, 95, 'all cards retained');
  equal(card.classes.has('visited'), true, 'visit state remains visible');
  equal(app.storage.get(visitedKey), saved, 'storage value is unchanged');
  console.log('PASS ' + checks + ' closure checks (Node VM + DOM stubs)');
})().catch(error => { console.error(error); process.exitCode = 1; });
