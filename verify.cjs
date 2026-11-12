const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = __dirname;
class Element {
  constructor() { this.children=[]; this.listeners={}; this.attributes={}; this.textContent=''; this.value='all'; this.hidden=false; this.dataset={}; this.disabled=false; this.classes=new Set(); this.classList={add:x=>this.classes.add(x),remove:x=>this.classes.delete(x),contains:x=>this.classes.has(x),toggle:(x,v)=>v?this.classes.add(x):this.classes.delete(x)}; }
  set className(v) { this._className=v; this.classes=new Set(v.split(' ')); } get className(){return this._className;}
  setAttribute(k,v){this.attributes[k]=v;} appendChild(e){this.children.push(e);return e;} append(...e){this.children.push(...e);} after(){}
  replaceChildren(...e){this.children=e;} addEventListener(k,f){(this.listeners[k]??=[]).push(f);} click(){this.fire('click',{target:this});} fire(k,event={}){for(const f of this.listeners[k]||[]) f(event);}
  querySelector(s){return this.children.find(e=>e.classes.has(s.slice(1)))||null;} animate(){}
}
async function boot({stored='[2]', fail=false, blocked=false, pending=false, now=null}={}) {
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
 sandbox.Date=TestDate;
 vm.createContext(sandbox); for(const file of ['shops.js','app.js','questions.js','diagnosis.js']) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),sandbox,{filename:file});
 const run=code=>vm.runInContext(code,sandbox); await new Promise(r=>setImmediate(r));
 return {get,run,storage,sandbox,setNow:value=>{clockTime=new Date(value).getTime();},finish:async()=>{resolveFetch(response);await new Promise(r=>setImmediate(r));}};
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
 check(resultTexts(known).includes(normalResultText), 'unspecified future date keeps existing guidance');
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
 console.log('PASS '+checks+' checks (Node VM + DOM stub; not a browser)');
})().catch(e=>{console.error(e);process.exitCode=1;});
