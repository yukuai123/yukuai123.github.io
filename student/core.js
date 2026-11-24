(function(root){
'use strict';
const subjects=['语文','数学','英语','物理','政治','历史','生物','地理'];
const canonical={语文:100,数学:100,英语:100,物理:100,政治:50,历史:50,生物:30,地理:30};
const foldWeights={生物:0.3,地理:0.3,历史:0.5,政治:0.5};
function foldSetting(e,s){
 const factor=foldWeights[s];if(!factor)return {mode:'raw',factor:1,locked:true};
 const label=e.subjectLabels?.[s]??'';
 const already=/折算|折后|折分|换算|折$/.test(label)||(e.maxima[s]===canonical[s]&&!/原始|原分/.test(label));
 if(already)return {mode:'already',factor:1,locked:true};
 const mode=e.folding?.[s]??'convert';return {mode,factor:mode==='convert'?factor:1,locked:false};
}
const num=v=>v===null||v===undefined||String(v).trim()===''||['—','-','缺考','未考','免考'].includes(String(v).trim())?null:Number.isFinite(Number(v))?Number(v):null;
const clean=v=>String(v??'').replace(/\s+/g,'').trim();
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
const rank=(v,a)=>v===null?null:1+a.filter(x=>x!==null&&x>v).length;
const sd=a=>a.length?Math.sqrt(mean(a.map(v=>(v-mean(a))**2))):null;
const fmt=(v,n=1)=>v===null||v===undefined?'—':Number(v).toFixed(n);
const delta=(a,b)=>a===null||b===null?null:a-b;
function pair(v){const m=String(v??'').match(/^\s*(\d+)\s*[/／]\s*(\d+)\s*$/);return m?{classRank:+m[1],schoolRank:+m[2]}:{classRank:null,schoolRank:null};}
function subjectOf(h){return subjects.find(s=>s==='政治'?/政治|道德与法治|道法/.test(h):h.includes(s));}
function inspect(raw){
 const rows=raw.rows;const header=rows.findIndex(r=>r.some(v=>clean(v)==='姓名'||clean(v)==='考生姓名'));
 if(header<0)throw Error(`${raw.file} / ${raw.sheet}：前表未找到“姓名”列，请使用成绩明细表。`);
 const h=rows[header].map(clean),nameCol=h.findIndex(v=>['姓名','考生姓名'].includes(v));
 const idCols=h.flatMap((v,i)=>/^(学号|考号|考生号)$/.test(v)?[i]:[]);
 const totalCol=h.findIndex(v=>/总分/.test(v)&&!/排名|进退|校排/.test(v)&&!/原始/.test(v));
 const schoolCol=h.findIndex(v=>/期中排名|排名（折算后）|排名\(折算后\)/.test(v));
 const pairTotal=h.findIndex(v=>/班次\/校次/.test(v));
 const subjectCols={};
 h.forEach((label,i)=>{const s=subjectOf(label);if(!s||/排名|班次|校次|进退|校排/.test(label))return;
  if(!(s in subjectCols)||/折算/.test(label))subjectCols[s]=i;
 });
 if(Object.keys(subjectCols).length<2)throw Error(`${raw.file}：仅识别到${Object.keys(subjectCols).length}个学科，请检查列标题。`);
 const valid=rows.slice(header+1).map((row,i)=>({row,index:i+header+2})).filter(({row})=>clean(row[nameCol])&&!/平均|合计|进退步上次|校级进退/.test(clean(row[nameCol]))&&num(row[totalCol])!==null);
 const maxima={};let inferred=false;
 for(const [s,c]of Object.entries(subjectCols)){
  const max=Math.max(...valid.map(x=>num(x.row[c])??0)); const label=h[c];
  const explicit=label.match(/共(\d+)分|满分[：:]?(\d+)/);let m=explicit?+(explicit[1]||explicit[2]):null;
  if(!m){m= /折算/.test(label)?canonical[s] : max>canonical[s]+.001?100:canonical[s];inferred=true;}
  maxima[s]=m;
 }
 const parsed=valid.map(({row,index})=>{
  const name=clean(row[nameCol]);const ids=idCols.map(c=>row[c]).filter(v=>num(v)!==null);const long=ids.find(v=>String(v).length>=8);const id=long?String(long):null;const short=ids.find(v=>String(v).length<8);
  const scores={},schoolRanks={},sourceClassRanks={};
  for(const [s,c]of Object.entries(subjectCols)){
   scores[s]=num(row[c]);let rc=null,cc=null;
   for(let j=c+1;j<Math.min(h.length,c+4);j++){
    if(subjectOf(h[j])&&subjectOf(h[j])!==s)break;
    if(/班次\/校次|班次／校次/.test(h[j])){const p=pair(row[j]);rc=p.schoolRank;cc=p.classRank;break;}
    if(/年级排名|校级排名/.test(h[j]))rc=num(row[j]);if(/班级排名/.test(h[j]))cc=num(row[j]);
   }
   schoolRanks[s]=rc;sourceClassRanks[s]=cc;
  }
  let schoolRank=schoolCol>=0?num(row[schoolCol]):pairTotal>=0?pair(row[pairTotal]).schoolRank:null;
  const totalClassCol=h.findIndex(v=>v==='班级排名');
  const totalClassRank=pairTotal>=0?pair(row[pairTotal]).classRank:totalClassCol>=0?num(row[totalClassCol]):null;
  return {name,id,shortId:short??null,sourceTotal:num(row[totalCol]),schoolRank,totalClassRank,scores,schoolRanks,sourceClassRanks,sourceRow:index};
 });
 const duplicate=[...new Set(parsed.map(x=>x.name).filter((v,i,a)=>a.indexOf(v)!==i))];
 if(duplicate.length)throw Error(`${raw.file}：存在同名学生（${duplicate.join('、')}）。请按班级拆表或为同名学生填写唯一考号后再导入；当前不会自动合并。`);
 const totalMax=Object.values(maxima).reduce((a,b)=>a+b,0);
 const mismatch=parsed.filter(x=>Object.values(x.scores).every(v=>v!==null)&&Math.abs(Object.values(x.scores).reduce((a,b)=>a+b,0)-x.sourceTotal)>.11);
 return {name:raw.name,file:raw.file,sheet:raw.sheet,rows:parsed,maxima,totalMax,inferred,subjectLabels:Object.fromEntries(Object.entries(subjectCols).map(([s,c])=>[s,h[c]])),folding:{},original:raw,mismatch:mismatch.map(x=>x.name),warnings:[]};
}
function prepare(exams){
 const round2=v=>Math.round((v+Number.EPSILON)*100)/100;
 const completeTotal=(scores,keys)=>keys.every(s=>typeof scores[s]==='number'&&Number.isFinite(scores[s]))?round2(keys.reduce((t,s)=>t+scores[s],0)):null;
 const known=new Map();
 const shortIds=new Map();for(const e of exams)for(const x of e.rows)if(x.shortId!==null&&x.shortId!==undefined)shortIds.set(x.name,x.shortId);
 // Resolve by persistent exam number first; name fallback is allowed only for one-to-one matches.
 for(const e of exams)for(const x of e.rows){if(x.id){if(known.has(x.name)&&known.get(x.name)!==x.id)throw Error(`${x.name}在不同考试中考号不一致，请先核对身份，避免误合并。`);known.set(x.name,x.id);}}
 const nameById=new Map();for(const [name,id]of known){if(nameById.has(id)&&nameById.get(id)!==name)throw Error(`考号${id}对应多个姓名，请核对。`);nameById.set(id,name);}
 for(const e of exams){
  e.configuredMaxima=Object.fromEntries(Object.keys(e.maxima).map(s=>[s,e.maxima[s]*foldSetting(e,s).factor]));
  e.configuredTotalMax=round2(Object.values(e.configuredMaxima).reduce((a,b)=>a+b,0));
  e.equivalentTotalMax=Object.keys(e.maxima).reduce((a,s)=>a+canonical[s],0);
  for(const x of e.rows){x.key=x.id??known.get(x.name)??'姓名:'+x.name;x.shortId=x.shortId??shortIds.get(x.name)??null;x.rates={};x.equivalent={};x.classRanks={};
   x.configuredScores=Object.fromEntries(subjects.map(s=>[s,x.scores[s]===null||x.scores[s]===undefined?null:round2(x.scores[s]*foldSetting(e,s).factor)]));
   for(const s of subjects){const v=x.scores[s]??null,m=e.maxima[s];x.rates[s]=v===null||!m?null:v/m;x.equivalent[s]=x.rates[s]===null?null:x.rates[s]*canonical[s];}
   x.totalRate=x.sourceTotal===null||!e.totalMax?null:x.sourceTotal/e.totalMax;
   const seven=subjects.filter(s=>s!=='物理');x.commonTotal=seven.every(s=>x.equivalent[s]!==null)?seven.reduce((t,s)=>t+x.equivalent[s],0):null;x.commonRate=x.commonTotal===null?null:x.commonTotal/460;
   x.displayEquivalent=Object.fromEntries(subjects.map(s=>[s,x.equivalent[s]===null?null:round2(x.equivalent[s])]));
   x.configuredTotal=completeTotal(x.configuredScores,Object.keys(e.maxima));
   x.equivalentTotal=completeTotal(x.displayEquivalent,Object.keys(e.maxima));
  }
  for(const x of e.rows){for(const s of subjects)x.classRanks[s]=rank(x.rates[s],e.rows.map(y=>y.rates[s]));x.commonRank=rank(x.commonTotal,e.rows.map(y=>y.commonTotal));x.totalClassRank=x.totalClassRank??rank(x.sourceTotal,e.rows.map(y=>y.sourceTotal));x.configuredClassRank=rank(x.configuredTotal,e.rows.map(y=>y.configuredTotal));x.equivalentClassRank=rank(x.equivalentTotal,e.rows.map(y=>y.equivalentTotal));}
 }
 return exams;
}
function scoreView(e,x,mode='configured'){
 if(mode==='raw')return {scores:x?.scores,maxima:e.maxima,total:x?.sourceTotal??null,totalMax:e.totalMax,classRank:x?.totalClassRank??null};
 if(mode==='folded')return {scores:x?.displayEquivalent,maxima:canonical,total:x?.equivalentTotal??null,totalMax:e.equivalentTotalMax,classRank:x?.equivalentClassRank??null};
 return {scores:x?.configuredScores,maxima:e.configuredMaxima,total:x?.configuredTotal??null,totalMax:e.configuredTotalMax,classRank:x?.configuredClassRank??null};
}
function students(exams){const map=new Map();exams.forEach(e=>e.rows.forEach(x=>map.set(x.key,{name:x.name,key:x.key,shortId:x.shortId,id:x.id})));return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'zh'));}
function series(exams,key,subject,metric){return exams.map(e=>{const x=e.rows.find(x=>x.key===key);if(!x)return null;return subject==='总分'?metric==='school'?x.schoolRank:metric==='class'?x.commonRank:metric==='common'?x.commonRate:x.totalRate:metric==='school'?x.schoolRanks[subject]??null:metric==='class'?x.classRanks[subject]:x.rates[subject];});}
function trend(a,mode='rank'){
 const idx=a.map((v,i)=>v===null?null:i).filter(v=>v!==null),v=idx.map(i=>a[i]);if(v.length<2)return {label:'不足两次',change:null,sd:sd(v),n:v.length};
 const change=mode==='rank'?v[0]-v.at(-1):v.at(-1)-v[0];const ds=v.slice(1).map((x,i)=>mode==='rank'?v[i]-x:x-v[i]);
 const threshold=mode==='rank'?0:.000001;
 let label=ds.every(x=>x>threshold)?'连续上升':ds.every(x=>x<-threshold)?'连续下降':ds.every(x=>Math.abs(x)<=threshold)?'持平':'有升有降';
 return {label,change,sd:sd(v),n:v.length};
}
function diagnose(exams,key){
 const school=series(exams,key,'总分','school'),common=series(exams,key,'总分','common'),last=exams.at(-1)?.rows.find(x=>x.key===key), prev=exams.at(-2)?.rows.find(x=>x.key===key);if(!last)return {summary:'最近一次无记录，需核对是否缺考或转出。',weak:[],strong:[],focus:[]};
 const ranked=subjects.filter(s=>last.classRanks[s]!==null).map(s=>({s,gap:last.classRanks[s]-last.commonRank,rank:last.classRanks[s],rate:last.rates[s]})).sort((a,b)=>b.gap-a.gap);
 const weak=ranked.filter(x=>x.gap>=5),strong=[...ranked].reverse().filter(x=>x.gap<=-5);
 const focus=subjects.map(s=>{const a=series(exams,key,s,'class');const v=a.filter(x=>x!==null);return {s,trend:trend(a),recent:a.at(-2)!==null&&a.at(-1)!==null?a.at(-2)-a.at(-1):null,latest:last.rates[s]};});
 const t=trend(school),ct=trend(common,'rate');
 const text=`总分校次：${school.map(v=>v??'—').join(' → ')}。首末${t.change===null?'不可比':t.change>0?'前移'+t.change+'名':t.change<0?'后移'+(-t.change)+'名':'持平'}；共同七科得分率${common[0]===null?'—':fmt(common[0]*100)}% → ${common.at(-1)===null?'—':fmt(common.at(-1)*100)}%。${weak.length?'本次相对短板（单科班次较共同七科班次落后≥5名）：'+weak.map(x=>x.s).join('、')+'。':'本次未出现落后共同七科班次≥5名的学科。'}${focus.some(x=>x.recent!==null&&x.recent<=-5)?'最近一次班内名次下降≥5名：'+focus.filter(x=>x.recent!==null&&x.recent<=-5).map(x=>x.s).join('、')+'。':''}`;
 return {summary:text,weak,strong,focus,totalTrend:t,commonTrend:ct,recent:prev?delta(prev.schoolRank,last.schoolRank):null};
}
function validate(exams){let issues=[];for(const e of exams){if(e.mismatch.length)issues.push(`${e.name}：${e.mismatch.length}人分科合计与源总分不同，需核对。`);for(const s of Object.keys(e.maxima)){const bad=e.rows.filter(x=>x.scores[s]!==null&&(x.scores[s]<0||x.scores[s]>e.maxima[s]));if(bad.length)issues.push(`${e.name} ${s}：${bad.length}人分数超出所设满分。`);}}
 return issues;
}
root.Trends={subjects,canonical,foldWeights,foldSetting,scoreView,num,mean,sd,fmt,inspect,prepare,students,series,trend,diagnose,validate};
})(typeof window!=='undefined'?window:globalThis);
