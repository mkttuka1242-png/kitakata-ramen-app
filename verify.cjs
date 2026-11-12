const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = __dirname;
class Element {
  style = {};
  set innerHTML(value) { this._innerHTML=value; this.children=[]; }
  get innerHTML() { return this._innerHTML || ''; }
  constructor() { this.children=[]; this.listeners={}; this.attributes={}; this.textContent=''; this.value='all'; this.hidden=false; this.dataset={}; this.disabled=false; this.classes=new Set(); this.classList={add:x=>this.classes.add(x),remove:x=>this.classes.delete(x),contains:x=>this.classes.has(x),toggle:(x,v)=>v?this.classes.add(x):this.classes.delete(x)}; }
  set className(v) { this._className=v; this.classes=new Set(v.split(' ')); } get className(){return this._className;}
  setAttribute(k,v){this.attributes[k]=v;} appendChild(e){this.children.push(e);return e;} append(...e){this.children.push(...e);} after(){}
  replaceChildren(...e){this.children=e;} addEventListener(k,f){(this.listeners[k]??=[]).push(f);} click(){this.fire('click',{target:this});} fire(k,event={}){for(const f of this.listeners[k]||[]) f(event);}
  querySelector(s){return this.children.find(e=>e.classes.has(s.slice(1)))||null;} animate(){}
}
async function boot({stored='[2]', fail=false, blocked=false, pending=false, now=null, timers=false}={}) {
 let clockTime = now === null ? null : new Date(now).getTime();
 class TestDate extends Date {
   constructor(...args) { super(...(args.length ? args : [clockTime === null ? Date.now() : clockTime])); }
   static now() { return clockTime === null ? Date.now() : clockTime; }
 }
 const ids={}; const find=(nodes,id)=>{for(const n of nodes){if(n.id===id)return n;const found=find(n.children||[],id);if(found)return found;}}; const get=id=>ids[id]||find(Object.values(ids),id)||(ids[id]=new Element()); get('shop-search').value='';
 const storage=new Map([['kitakata-ramen-visited-v1',stored],['kitakata-ramen-previous-questions','broken']]);
 const doc={getElementById:get,createElement:()=>new Element(),querySelector:s=>get(s),querySelectorAll:s=>get('shops').children.filter(e=>s==='.shop'||s==='.shop.visited'&&e.classes.has('visited'))};
 let resolveFetch; const response={ok:true,json:async()=>({'2026-01-01':'fixture','2026-11-03':'fixture','2025-01-01':'fixture'})};
 const sandbox={document:doc,localStorage:{getItem:k=>{if(blocked)throw Error('blocked');return storage.get(k)??null;},setItem:(k,v)=>{if(blocked)throw Error('blocked');storage.set(k,v);}},fetch:()=>pending?new Promise(r=>resolveFetch=r):fail?Promise.reject(Error('offline')):Promise.resolve(response),AbortController,setTimeout:()=>1,clearTimeout(){},setInterval(){},window:{confirm:()=>true,open:(...a)=>sandbox.opened.push(a)},opened:[],console};
 const timerQueue=new Map(); let nextTimer=0;
 if (timers) {
   sandbox.setTimeout=callback=>{const id=++nextTimer;timerQueue.set(id,callback);return id;};
   sandbox.clearTimeout=id=>timerQueue.delete(id);
 }
 const runTimers=()=>{let count=0;while(timerQueue.size){assert.ok(count++<100,'timer queue terminates');const [id,callback]=timerQueue.entries().next().value;timerQueue.delete(id);callback();}};
 sandbox.Date=TestDate;
 vm.createContext(sandbox); for(const file of ['shops.js','app.js','questions.js','diagnosis.js']) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),sandbox,{filename:file});
 const run=code=>vm.runInContext(code,sandbox); await new Promise(r=>setImmediate(r));
 const takeNextTimer=()=>{const entry=timerQueue.entries().next().value;if(!entry)return null;const [id,callback]=entry;timerQueue.delete(id);return callback;};
 return {get,run,storage,sandbox,runTimers,takeNextTimer,pendingTimers:()=>timerQueue.size,setNow:value=>{clockTime=new Date(value).getTime();},finish:async()=>{resolveFetch(response);await new Promise(r=>setImmediate(r));}};
}
(async()=>{
 let checks=0; const check=(v,msg)=>{assert.ok(v,msg);checks++;};
 const b=await boot(); check(b.get('shops').children.length===95,'95 cards'); check(b.run('visited.includes(2)'),'existing record');
 b.get('filter-visited').click(); check(b.get('result-count').textContent==='表示中 1店','visited filter'); b.get('shops').children[1].click(); check(b.get('result-count').textContent==='表示中 0店','toggle refresh');
 b.get('filter-unvisited').click(); b.get('shops').children[0].click(); check(b.get('result-count').textContent==='表示中 94店','unvisited refresh'); b.get('filter-visited').click(); b.get('reset').click(); check(b.get('result-count').textContent==='表示中 0店','reset refresh');
 b.get('shop-search').value='坂内'; b.get('shop-search').fire('input'); b.get('filter-all').click(); check(b.get('result-count').textContent==='表示中 1店','combined search');
 for(const raw of ['broken','null','{}']) {const x=await boot({stored:raw});check(x.get('shops').children.length===95,'bad storage boots');check(x.storage.get('kitakata-ramen-visited-v1')===raw,'original bad data untouched');}
 const blocked=await boot({blocked:true}); blocked.get('shops').children[0].click();check(blocked.run('visited.length')===1,'blocked storage stays usable');
 check(b.run('pickDiagnosisQuestions().length')===3,'bad question history');
 b.run('showDiagnosisResult(null)'); b.get('diagnosis-panel').children.find(e => e.listeners.click?.length).click();check(b.run('diagnosisAnswers.length')===0,'retry works');
 const offline=await boot({fail:true});check(offline.run('holidayState')==='failed','failure state');check(offline.get('holiday-status').textContent.includes('取得できません'),'failure notice');check(offline.run('isOpenNow(shopData[1])')===false,'unknown excluded');
 const loading=await boot({pending:true});loading.get('filter-open').click();check(loading.get('result-count').textContent==='表示中 0店','pending excluded');await loading.finish();check(loading.run('holidayState')==='ready','fetch completed');check(loading.get('result-count').textContent=== '表示中 '+loading.run('shopData.filter(s=>isOpenNow(s)).length')+'店','fetch refilters');
 const status=(shop, date, strict=false)=>b.run('shopHoursStatus('+JSON.stringify(shop)+',new Date('+JSON.stringify(date)+'),true,'+strict+').status');
 const normal={hours:'11:00-14:00,17:00-20:00',closedDays:[]};
 check(status(normal,'2026-11-09T11:00:00')==='possible','opening inclusive');check(status(normal,'2026-11-09T14:00:00')==='closed','closing exclusive');check(status(normal,'2026-11-09T16:00:00')==='closed','lunch break');
 const night={hoursByDay:{0:'18:00-01:00',1:'18:00-03:00',2:'18:00-01:00'},closedDays:[]};
 check(status(night,'2026-11-10T02:00:00')==='possible','previous Monday 03 close');check(status(night,'2026-11-09T02:00:00')==='closed','previous Sunday 01 close');check(status({...night,closedDays:[2]},'2026-11-10T02:00:00')==='possible','previous service continues on closed day');
 check(status({hours:'11:00-15:00',closedDays:[2],closedAfterHoliday:true},'2026-11-04T12:00:00')==='closed','holiday substitute');check(status({hours:'11:00-15:00',closedDays:[2]},'2026-11-03T12:00:00')==='possible','holiday exception');
 check(status({hours:'11:00-15:00',winterHours:'11:00-13:00',closedDays:[]},'2026-01-09T14:00:00')==='closed','winter');check(status({hours:'11:00-15:00',closedDays:[],firstWeekdayClosed:3},'2026-11-04T12:00:00')==='closed','first weekday');
 check(status({},'2026-11-09T12:00:00')==='unknown','missing hours');check(status({hours:'11:00-15:00'},'2026-11-09T12:00:00',true)==='unknown','diagnosis missing closed days');check(status(normal,'2030-11-09T12:00:00')==='unknown','missing year');
 check(b.run('diagnosisShopStatus(shopData[55], new Date(2026,10,8,0,30),true).status === shopHoursStatus(shopData[55],new Date(2026,10,8,0,30),true,true).status'),'shared diagnosis');
 check(b.run('pickRandomRamenShop().id>=1'),'roulette selection');
 b.run('visitTiming = "now"; showDiagnosisAlternatives("nearby")');check(b.get('diagnosis-panel').children.length>2,'nearby alternatives');
 b.run('showDiagnosisAlternatives("related")');check(b.get('diagnosis-panel').children.length>2,'related alternatives'); for(const id of ['share-x','share-x-top','share-facebook-top','share-threads-top']) b.get(id).click();check(b.sandbox.opened.length===4,'all share buttons');
 // 坂内の希望があっても、営業状態不明を通常のおすすめにしない。
 const bannaiAnswer = 'diagnosisAnswers.length=0; diagnosisAnswers.push(diagnosisQuestions.find(q=>q.id==="honest-001").options[0]);';
 const normalResultText = '営業時間・定休日をもとにご紹介しています。実際の営業状況と異なる場合があります。';
 const laterResultText = '来店日時を決めずに、お好みに合うお店をご紹介しています。ご来店前に店舗の営業時間・定休日をご確認ください。';
 const resultTexts = x => x.get('diagnosis-panel').children.map(e=>e.textContent);
 for (const scenario of [
   {name:'failed holidays', options:{fail:true}, state:'failed', date:'2026-11-09T12:00:00'},
   {name:'pending holidays', options:{pending:true}, state:'loading', date:'2026-11-09T12:00:00'},
   {name:'missing holiday year', options:{}, state:'ready', date:'2030-11-09T12:00:00'},
 ]) {
   const x=await boot(scenario.options);
   x.run(bannaiAnswer + 'visitTiming="today-lunch"; getVisitDate=()=>new Date('+JSON.stringify(scenario.date)+');');
   check(x.run('holidayState')===scenario.state, scenario.name+' state');
   check(x.run('diagnosisShopStatus(shopData[13],getVisitDate(),true).status')==='unknown', scenario.name+' unknown fixture');
   x.run('showDiagnosisResult(pickRecommendedRamenShop())');
   const texts=resultTexts(x);
   check(texts.some(t=>t.includes('坂内食堂')), scenario.name+' retains requested shop');
   check(texts.some(t=>t.startsWith('判定できません。') && t.includes('営業状況を確認できない')), scenario.name+' explicit unknown notice');
   check(!texts.includes(normalResultText) && !texts.some(t=>t.includes('やっぱり坂内でしたね')), scenario.name+' no normal recommendation');
   x.get('diagnosis-panel').children.find(e=>e.listeners.click?.length).click();
   check(x.run('visitTiming===null && diagnosisAnswers.length===0') && x.get('diagnosis-panel').innerHTML.includes('data-visit-timing'), scenario.name+' retry');
   if (scenario.options.pending) await x.finish();
 }
 const known=await boot();
 known.run(bannaiAnswer + 'visitTiming="today-lunch";');
 for (const [date, closed] of [['2026-11-09T12:00:00',false], ['2026-11-09T19:00:00',true], ['2026-11-12T12:00:00',true]]) {
   known.run('getVisitDate=()=>new Date('+JSON.stringify(date)+');');
   check(known.run('pickRecommendedRamenShop().id===14 && !pickRecommendedRamenShop().diagnosisUnknown && pickRecommendedRamenShop().diagnosisClosed==='+closed), 'known Bannai state '+date);
   known.run('showDiagnosisResult(pickRecommendedRamenShop())');
   const texts=resultTexts(known);
   check(closed ? texts.includes('指定日時は定休日または営業時間外です。') && known.get('diagnosis-panel').children.filter(e=>e.dataset.diagnosisAlternative).length===3 : texts.includes(normalResultText), 'known Bannai result '+date);
 }
 known.run('visitTiming="later"; getVisitDate=()=>null; showDiagnosisResult(pickRecommendedRamenShop());');
 check(resultTexts(known).includes(laterResultText) && !resultTexts(known).includes(normalResultText), 'unspecified future date uses undated guidance');
 // 今日の時間帯は開始前なら予定時刻、途中なら現在時刻を使う。
 const timed=await boot({now:'2026-11-09T14:30:00'});
 const selectTiming = timing => timed.get('diagnosis-panel').fire('click', {target:{closest:selector=>selector==='button[data-visit-timing]' ? {dataset:{visitTiming:timing}} : null}});
 for (const [timing,start,end] of [['today-lunch',12,15],['today-evening',17,19],['today-night',19,20]]) {
   const startMs=new Date(2026,10,9,start).getTime();
   const endMs=new Date(2026,10,9,end).getTime();
   for (const ms of [startMs-1,startMs,startMs+1,endMs-1,endMs,endMs+1]) {
     timed.setNow(ms);
     timed.run('showVisitTimingQuestion()');
     check(timed.get('diagnosis-panel').innerHTML.includes('data-visit-timing="'+timing+'"')===(ms<endMs), timing+' visibility '+ms);
     if (ms<endMs) {
       selectTiming(timing);
       check(timed.run('getVisitDate().getTime()')===Math.max(ms,startMs), timing+' effective time '+ms);
     }
   }
 }
 for (const [timing,time] of [['today-lunch','14:30:00'],['today-night','19:00:00'],['today-night','19:30:00']]) {
   const now='2026-11-09T'+time;
   timed.setNow(now); selectTiming(timing);
   check(timed.run('getVisitDate().getTime()')===new Date(now).getTime(), timing+' uses current time '+time);
   const shop=timing==='today-lunch' ? {hours:'11:00-14:00',closedDays:[]} : {hours:'17:00-19:00',closedDays:[]};
   check(timed.run('diagnosisShopStatus('+JSON.stringify(shop)+',getVisitDate(),true).status')==='closed', timing+' excludes already closed shop '+time);
 }
 timed.setNow('2026-11-09T14:30:00'); selectTiming('today-lunch');
 timed.run('const lunchCandidates=getDiagnosisCandidates().filter(s=>diagnosisShopStatus(s,getVisitDate(),true).status==="possible"); const closedShopIndex=lunchCandidates.findIndex(s=>s.id===3); Math.random=()=>closedShopIndex<0 ? 0 : (closedShopIndex+0.5)/lunchCandidates.length;');
 check(timed.run('pickRecommendedRamenShop()?.id!==3'), '14:30 does not recommend shop closed at 14:00');
 // 選択画面の放置と、回答中の終了時刻越えを検証。
 timed.setNow('2026-11-09T20:00:00'); selectTiming('today-night');
 check(timed.run('visitTiming===null') && !timed.get('diagnosis-panel').innerHTML.includes('data-visit-timing="today-night"'), 'stale night option rejected');
 timed.setNow('2026-11-09T14:59:59'); selectTiming('today-lunch');
 timed.setNow('2026-11-09T15:00:00');
 timed.get('diagnosis-panel').fire('click',{target:{closest:selector=>selector==='button[data-answer]' ? {dataset:{answer:'0'}} : null}});
 check(timed.run('visitTiming===null && diagnosisAnswers.length===0') && !timed.get('diagnosis-panel').innerHTML.includes('data-visit-timing="today-lunch"'), 'expired period during questions restarts timing');
 check(resultTexts(timed).some(t=>t.includes('選択した時間帯が終了')), 'expiry explanation');
 timed.setNow('2026-11-09T23:59:59');
 for (const [timing,hour] of [['tomorrow-lunch',12],['tomorrow-evening',17],['tomorrow-night',19]]) {
   selectTiming(timing);
   check(timed.run('getVisitDate().getTime()')===new Date(2026,10,10,hour).getTime(), timing+' unchanged');
 }
 selectTiming('tomorrow');
 check(timed.get('diagnosis-panel').innerHTML.includes('tomorrow-lunch') && timed.get('diagnosis-panel').innerHTML.includes('tomorrow-evening') && timed.get('diagnosis-panel').innerHTML.includes('tomorrow-night'), 'tomorrow timing choices unchanged');
 selectTiming('later'); check(timed.run('getVisitDate()')===null, 'later remains unspecified date');
 selectTiming('now'); check(timed.run('getVisitDate().getTime()')===new Date('2026-11-09T23:59:59').getTime(), 'now unchanged');
 // 選択した日と開始・終了日時を固定し、日付またぎで時間帯を復活させない。
 for (const day of ['2026-11-09','2026-11-30','2026-12-31']) {
   for (const [timing,start,end] of [['today-lunch',12,15],['today-evening',17,19],['today-night',19,20]]) {
     const selectedAt=new Date(day+'T'+String(end-1).padStart(2,'0')+':59:00');
     const x=await boot({now:selectedAt.getTime()});
     const select=value=>x.get('diagnosis-panel').fire('click',{target:{closest:s=>s==='button[data-visit-timing]'?{dataset:{visitTiming:value}}:null}});
     const answer=()=>x.get('diagnosis-panel').fire('click',{target:{closest:s=>s==='button[data-answer]'?{dataset:{answer:'0'}}:null}});
     const expectedStart=new Date(selectedAt); expectedStart.setHours(start,0,0,0);
     const expectedEnd=new Date(selectedAt); expectedEnd.setHours(end,0,0,0);
     select(timing);
     check(x.run('selectedTodayPeriod.targetDate')===day && x.run('selectedTodayPeriod.start.getTime()')===expectedStart.getTime() && x.run('selectedTodayPeriod.end.getTime()')===expectedEnd.getTime(), timing+' selected period anchored '+day);
     x.setNow(expectedEnd.getTime()-1);
     check(x.run('ensureVisitTimingAvailable()') && x.run('getVisitDate().getTime()')===expectedEnd.getTime()-1, timing+' valid until last millisecond '+day);
     x.setNow(expectedEnd.getTime()); answer();
     check(x.run('visitTiming===null && selectedTodayPeriod===null && diagnosisAnswers.length===0'), timing+' expires at same-day end '+day);
     x.setNow(selectedAt.getTime()); select(timing);
     const nextMidnight=new Date(selectedAt); nextMidnight.setDate(nextMidnight.getDate()+1); nextMidnight.setHours(0,1,0,0);
     x.setNow(nextMidnight.getTime());
     check(x.run('Number.isNaN(getVisitDate().getTime())'), timing+' expired date cannot be rebased '+day);
     check(x.run('selectedTodayPeriod.targetDate')===day && x.run('selectedTodayPeriod.end.getTime()')===expectedEnd.getTime(), timing+' keeps original bounds after midnight '+day);
     answer();
     check(x.run('visitTiming===null && selectedTodayPeriod===null && currentQuestion===0 && diagnosisAnswers.length===0') && x.get('diagnosis-panel').innerHTML.includes('data-visit-timing'), timing+' midnight answer restarts timing '+day);
     check(resultTexts(x).some(t=>t.includes('選択した時間帯が終了')), timing+' midnight expiry notice '+day);
     select(timing);
     check(x.run('selectedTodayPeriod.targetDate')===nextMidnight.getFullYear()+'-'+String(nextMidnight.getMonth()+1).padStart(2,'0')+'-'+String(nextMidnight.getDate()).padStart(2,'0'), timing+' explicit reselection uses new day '+day);
     select('tomorrow-lunch');
     const tomorrow=new Date(nextMidnight); tomorrow.setDate(tomorrow.getDate()+1); tomorrow.setHours(12,0,0,0);
     check(x.run('selectedTodayPeriod===null') && x.run('getVisitDate().getTime()')===tomorrow.getTime(), 'tomorrow unchanged after rollover '+timing+' '+day);
     select('later'); check(x.run('selectedTodayPeriod===null && getVisitDate()===null'), 'later unchanged after rollover '+timing+' '+day);
   }
 }
 // 幸楽苑だけを診断から除外し、ルーレットの95個の等幅区間は維持。
 const saved69=JSON.stringify([...Array.from({length:67},(_,i)=>i+1),92,93]);
 const policy=await boot({stored:saved69,now:'2026-11-09T12:00:00',timers:true});
 const allIds=Array.from({length:95},(_,i)=>i+1);
 const expectedDiagnosisIds=allIds.filter(id=>id!==92 && id!==93);
 check(JSON.stringify(policy.run('getDiagnosisCandidates().map(s=>s.id)'))===JSON.stringify(expectedDiagnosisIds), 'diagnosis excludes exactly IDs 92 and 93');
 check(JSON.stringify(policy.run('getRouletteCandidates().map(s=>s.id)'))===JSON.stringify(allIds), 'roulette retains all IDs in original order');
 policy.run('visitTiming="later";');
 const selectedIds=expectedDiagnosisIds.map((id,index)=>{policy.run('Math.random=()=>'+((index+0.5)/93));return policy.run('pickRecommendedRamenShop().id');});
 check(JSON.stringify(selectedIds)===JSON.stringify(expectedDiagnosisIds), 'later can select every other shop and neither Korakuen');
 policy.run('visitTiming="now";');
 check(policy.run('getDiagnosisCandidates().filter(s=>diagnosisShopStatus(s,getVisitDate(),true).status==="possible").every(s=>s.id!==92 && s.id!==93)'), 'dated diagnosis excludes Korakuen');
 for (const shopId of [1,14,95]) {
   policy.run('visitTiming="later"; showDiagnosisResult(shopData.find(s=>s.id==='+shopId+'));');
   check(resultTexts(policy).includes(laterResultText) && !resultTexts(policy).includes(normalResultText), 'undated guidance for shop '+shopId);
 }
 policy.run('visitTiming="now"; showDiagnosisResult(shopData[1]);');
 check(resultTexts(policy).includes(normalResultText) && !resultTexts(policy).includes(laterResultText), 'dated guidance unchanged');
 const korakuenNote='喜多方で、あえての幸楽苑！いつもの味を楽しむのも、今日の運しだい。';
 for (let index=0;index<95;index++) {
   policy.run('Math.random=()=>'+((index+0.5)/95));
   check(policy.run('pickRandomRamenShop().id')===index+1, 'roulette equal interval selects ID '+(index+1));
   policy.get('start-roulette').click();
   check(!resultTexts(policy).includes(korakuenNote), 'roulette note waits for final result '+(index+1));
   policy.runTimers();
   const texts=resultTexts(policy);
   check(texts.some(t=>t==='🎉 本日の運命のお店は… '+policy.run('shopData['+index+'].name')+'！'), 'roulette completes with selected ID '+(index+1));
   check(texts.filter(t=>t===korakuenNote).length===([92,93].includes(index+1)?1:0), 'roulette note only for Korakuen '+(index+1));
   check(!policy.get('start-roulette').disabled, 'roulette can run again '+(index+1));
 }
 check(policy.get('shops').children.length===95 && policy.run('visited.length')===69 && policy.storage.get('kitakata-ramen-visited-v1')===saved69, '95 cards and saved 69 visits untouched');
 policy.get('shop-search').value='幸楽苑'; policy.get('shop-search').fire('input');
 check(policy.get('shops').children.filter(e=>!e.hidden).length===2, 'Korakuen remains searchable');
 for (const id of [92,93]) {
   const card=policy.get('shops').children[id-1];
   check(card.classes.has('visited'), 'Korakuen visited ID retained '+id);
   card.querySelector('.map-button').fire('click',{stopPropagation(){}});
 }
 check(policy.sandbox.opened.length===2 && policy.storage.get('kitakata-ramen-visited-v1')===saved69, 'both Korakuen maps open without changing saved visits');
 // 画面切替と再抽選で、取り消し済み・実行待ちの古い処理を無効化。
 const panelSnapshot=x=>JSON.stringify({html:x.get('diagnosis-panel').innerHTML,texts:resultTexts(x)});
 for (const id of [92,93,2]) {
   for (const phase of ['before-first-spin','mid-spin','before-final-spin']) {
     const x=await boot({now:'2026-11-09T12:00:00',timers:true});
     x.run('let soundCount=0; playPokoSound=()=>soundCount++; Math.random=()=>'+((id-1+0.5)/95));
     x.get('start-roulette').click();
     const spins=phase==='before-first-spin'?0:phase==='mid-spin'?7:14;
     for(let i=0;i<spins;i++) x.takeNextTimer()();
     const staleCallback=x.takeNextTimer();
     const oldResult=x.get('diagnosis-panel').children.at(-1);
     const oldText=oldResult.textContent;
     x.get('start-diagnosis').click();
     const snapshot=panelSnapshot(x);
     staleCallback(); x.runTimers();
     check(panelSnapshot(x)===snapshot && oldResult.textContent===oldText, 'cancelled roulette cannot write to diagnosis '+id+' '+phase);
     check(x.pendingTimers()===0 && x.run('soundCount')===0 && !x.get('start-roulette').disabled, 'cancelled roulette stops timers and sound and restores button '+id+' '+phase);
     // 新しい診断結果を表示しても古い処理が侵入しない。
     x.run('visitTiming="later"; showDiagnosisResult(shopData[1]);');
     const resultSnapshot=panelSnapshot(x); staleCallback();
     check(panelSnapshot(x)===resultSnapshot && !resultTexts(x).includes(korakuenNote), 'old roulette cannot append note to new result '+id+' '+phase);
   }
 }
 const repeated=await boot({now:'2026-11-09T12:00:00',timers:true});
 repeated.run('let soundCount=0; playPokoSound=()=>soundCount++;');
 const staleCallbacks=[];
 for (const id of [92,93,2,92]) {
   repeated.run('Math.random=()=>'+((id-1+0.5)/95));
   // DOMスタブではdisabled中のクリックも配送し、連続開始に対する防御も確認。
   repeated.get('start-roulette').click();
   staleCallbacks.push(repeated.takeNextTimer());
 }
 repeated.run('Math.random=()=>1.5/95;'); repeated.get('start-roulette').click();
 const repeatedSnapshot=panelSnapshot(repeated);
 for(const callback of staleCallbacks) callback();
 check(panelSnapshot(repeated)===repeatedSnapshot && repeated.pendingTimers()===1 && repeated.get('start-roulette').disabled, 'rapid starts leave only newest roulette active');
 repeated.runTimers();
 check(resultTexts(repeated).some(t=>t==='🎉 本日の運命のお店は… ラーメン一平！') && !resultTexts(repeated).includes(korakuenNote) && repeated.run('soundCount')===1, 'rapid starts complete only latest result and sound');
 for (const id of [92,93,2]) {
   repeated.run('Math.random=()=>'+((id-1+0.5)/95)); repeated.get('start-roulette').click(); repeated.runTimers();
   check(resultTexts(repeated).filter(t=>t===korakuenNote).length===([92,93].includes(id)?1:0) && repeated.pendingTimers()===0 && !repeated.get('start-roulette').disabled, 'redraw after completion has no stale note '+id);
 }
 // 実際にキュー内にあるタイマーもclearTimeoutで除去される。
 repeated.get('start-roulette').click(); repeated.get('start-diagnosis').click();
 check(repeated.pendingTimers()===0, 'screen switch clears queued timer');
 console.log('PASS '+checks+' checks (Node VM + DOM stub; not a browser)');
})().catch(e=>{console.error(e);process.exitCode=1;});
