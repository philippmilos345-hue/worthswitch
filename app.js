const $=id=>document.getElementById(id), N=id=>Number($(id).value)||0;
let last={}, deferredInstallPrompt=null;

const rates={
  zagreb:[23,33],
  split:[21.5,32],
  rijeka:[20,25],
  osijek:[20,30],
  bjelovar:[18,25]
};

const jobFields=[
  ['Salary','Bruto mjesečna plaća (€)','number',2777],
  ['Months','Broj plaća godišnje','number',12],
  ['Bonus','Godišnji bruto bonus (€)','number',0],
  ['Other','Ostali neoporezivi primici godišnje (€)','number',0],
  ['Regres','Regres (€)','number',0],
  ['Boz','Božićnica (€)','number',0],
  ['Usk','Uskrsnica (€)','number',0],
  ['Meal','Prehrana mjesečno (€)','number',100],
  ['TravelPay','Prijevoz koji firma isplaćuje mjesečno (€)','number',80],
  ['Vacation','Dani godišnjeg','number',25],
  ['Remote','Remote dana tjedno','number',2],
  ['Commute','Putovanje u jednom smjeru (min)','number',30],
  ['TravelCost','Vlastiti trošak puta po danu u uredu (€)','number',5],
  ['Benefits','Vrijednost ostalih benefita godišnje (€)','number',400]
];

function buildJobForms(){
  document.querySelectorAll('.job-grid').forEach(grid=>{
    const p=grid.dataset.prefix;
    grid.innerHTML=jobFields.map(([s,l,t,d])=>{
      let value=d;
      if(p==='n'){
        const overrides={Salary:3400,Bonus:1500,Regres:300,Boz:700,Usk:150,Vacation:26,Remote:3,Commute:20,TravelCost:4,Benefits:500};
        if(overrides[s]!==undefined)value=overrides[s];
      }
      return `<div><label>${l}</label><input id="${p+s}" data-save type="${t}" value="${value}"></div>`;
    }).join('');
  });
}
buildJobForms();

function startFlow(){document.getElementById('landing').classList.add('hidden');document.getElementById('savedPanel').classList.add('hidden');document.getElementById('wizard').classList.remove('hidden');goTo(1);updateAllowance()}
function loadDraftAndStart(){restoreDraft();startFlow()}
function showLanding(){document.getElementById('landing').classList.remove('hidden');document.getElementById('wizard').classList.add('hidden');document.getElementById('savedPanel').classList.add('hidden')}
function goTo(x){
  [1,2,3,4].forEach(i=>document.getElementById('step'+i).classList.toggle('hidden',i!==x));
  document.getElementById('stepLabel').textContent=x+' / 4 — '+['Porezni profil','Trenutni posao','Nova ponuda','Rezultat'][x-1];
  document.getElementById('progressBar').style.width=x*25+'%';
  window.scrollTo({top:0,behavior:'smooth'});
  if(x===1)updateAllowance();
}
function applyCity(){let v=$('city').value;if(rates[v]){ $('taxLow').value=rates[v][0];$('taxHigh').value=rates[v][1];saveDraft();}}
function childAllowance(k){const vals=[300,420,600,840,1140,1500,1920,2400,2940];let s=0;for(let i=0;i<k;i++)s+=i<vals.length?vals[i]:vals[vals.length-1]+660*(i-8);return s}
function allowance(){return 600+N('dependents')*300+childAllowance(N('children'))+N('disability')}
function updateAllowance(){$('allowanceInfo').innerHTML='Procijenjeni osobni odbitak: <b>'+fmt(allowance())+' mjesečno</b>. Osnova 600 € + uzdržavani članovi + djeca + invalidnost.'}
function fmt(x){return new Intl.NumberFormat('hr-HR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(x)}
function net(g){let mio=g*.20,base=Math.max(0,g-mio-allowance()),lo=Math.min(base,5000),hi=Math.max(0,base-5000),tax=lo*N('taxLow')/100+hi*N('taxHigh')/100;return Math.max(0,g-mio-tax)}
function bonusNet(b){if(!b)return 0;let m=b/12;return Math.max(0,(net(m+2500)-net(2500))*12)}
function raw(p){return{salary:N(p+'Salary'),months:N(p+'Months'),bonus:N(p+'Bonus'),other:N(p+'Other'),regres:N(p+'Regres'),boz:N(p+'Boz'),usk:N(p+'Usk'),meal:N(p+'Meal'),travelPay:N(p+'TravelPay'),vacation:N(p+'Vacation'),remote:N(p+'Remote'),commute:N(p+'Commute'),travelCost:N(p+'TravelCost'),benefits:N(p+'Benefits')}}
function calc(j){let ns=net(j.salary)*j.months,nb=bonusNet(j.bonus),direct=j.other+j.regres+j.boz+j.usk+j.meal*12+j.travelPay*12,office=Math.max(0,(5-j.remote)*52),hours=office*j.commute*2/60,cost=office*j.travelCost,cash=ns+nb+direct,financial=cash+j.benefits-cost,total=financial-hours*N('hourValue'),sm=Math.min(100,cash/520),sf=Math.min(100,j.remote/5*100),st=Math.max(0,100-hours/3),sv=Math.min(100,j.vacation/30*100),score=Math.round(sm*.45+sf*.2+st*.2+sv*.15);return{...j,ns,nb,direct,office,hours,cost,cash,financial,total,sm,sf,st,sv,score}}
function breakEven(c,r){let lo=500,hi=10000;for(let i=0;i<45;i++){let m=(lo+hi)/2;if(calc({...r,salary:m}).total>=c.total)hi=m;else lo=m}return hi}

function calculate(){
  let cr=raw('c'),nr=raw('n'),c=calc(cr),nn=calc(nr),d=nn.total-c.total,fd=nn.financial-c.financial,saved=c.hours-nn.hours,be=breakEven(c,nr),pct=c.total?d/c.total*100:0;
  last={cr,nr,c,nn,d,fd,saved,be,pct};
  $('resultHero').innerHTML=`<div class="eyebrow">WORTHSWITCH REZULTAT</div><div class="big ${d>=0?'good':'bad'}">${d>=0?'Nova ponuda se isplati':'Trenutni posao ima veću vrijednost'}</div><div style="font-size:20px;font-weight:850">${d>=0?'+':''}${fmt(d)} godišnje · ${pct>=0?'+':''}${pct.toFixed(1)}%</div><p style="color:#b9c2d0">Total Job Value uključuje financije, benefite, trošak putovanja i tvoju vrijednost vremena.</p>`;
  $('kFin').textContent=(fd>=0?'+':'')+fmt(fd);$('kTime').textContent=(saved>=0?'+':'')+Math.round(saved)+' h';$('kBreak').textContent=fmt(be);$('kScore').textContent=(nn.score-c.score>=0?'+':'')+(nn.score-c.score);
  $('comparison').innerHTML=`<table><tr><th></th><th>Trenutni</th><th>Nova ponuda</th></tr>
  <tr><td>Neto plaća</td><td>${fmt(c.ns)}</td><td>${fmt(nn.ns)}</td></tr>
  <tr><td>Neto bonus</td><td>${fmt(c.nb)}</td><td>${fmt(nn.nb)}</td></tr>
  <tr><td>Direktni primici</td><td>${fmt(c.direct)}</td><td>${fmt(nn.direct)}</td></tr>
  <tr><td>Benefiti</td><td>${fmt(c.benefits)}</td><td>${fmt(nn.benefits)}</td></tr>
  <tr><td>Trošak putovanja</td><td>-${fmt(c.cost)}</td><td>-${fmt(nn.cost)}</td></tr>
  <tr><th>Financijska vrijednost</th><th>${fmt(c.financial)}</th><th>${fmt(nn.financial)}</th></tr>
  <tr><td>Vrijednost vremena</td><td>-${fmt(c.hours*N('hourValue'))}</td><td>-${fmt(nn.hours*N('hourValue'))}</td></tr>
  <tr><th>Total Job Value</th><th>${fmt(c.total)}</th><th>${fmt(nn.total)}</th></tr></table>`;
  $('simSalary').value=Math.min(7000,Math.max(1000,nr.salary));simulate();
  let min=Math.ceil(be/50)*50,fair=Math.ceil(be*1.05/50)*50,exc=Math.ceil(be*1.10/50)*50;
  $('ask').innerHTML=`<span class="pill">Minimalno ${fmt(min)}</span><span class="pill">Fer ${fmt(fair)}</span><span class="pill">Odlično ${fmt(exc)}+</span><div class="callout">Procijenjeni break-even je <b>${fmt(min)} bruto mjesečno</b>.</div>`;
  $('time').innerHTML=`<div class="grid3"><div><div class="kpi">${Math.round(c.hours)}</div><div class="kpi-label">sati sada</div></div><div><div class="kpi">${Math.round(nn.hours)}</div><div class="kpi-label">sati novo</div></div><div><div class="kpi">${saved>=0?'+':''}${Math.round(saved)}</div><div class="kpi-label">razlika</div></div></div>`;
  const rows=[['Novac',c.sm,nn.sm],['Fleksibilnost',c.sf,nn.sf],['Vrijeme',c.st,nn.st],['Godišnji',c.sv,nn.sv]];
  $('scores').innerHTML=rows.map(r=>`<div class="metric"><div class="metric-head"><span>${r[0]}</span><span>${Math.round(r[1])} → ${Math.round(r[2])}</span></div><div class="bar"><div style="width:${r[2]}%"></div></div></div>`).join('')+`<div class="callout"><b>Ukupno:</b> ${c.score} → ${nn.score} / 100</div>`;
  saveDraft();goTo(4);
}
function simulate(){if(!last.c)return;let s=N('simSalary'),x=calc({...last.nr,salary:s}),d=x.total-last.c.total;$('simVal').textContent=fmt(s)+' bruto / mj.';$('simOut').innerHTML=d>=0?`<b>Isplati se.</b> Prednost ${fmt(d)}/god.`:`<b>Još se ne isplati.</b> Manjak ${fmt(Math.abs(d))}/god.`}

function saveDraft(){
  const data={};
  document.querySelectorAll('[data-save]').forEach(el=>data[el.id]=el.value);
  localStorage.setItem('worthswitchDraftV5',JSON.stringify(data));
}
function restoreDraft(){
  const data=JSON.parse(localStorage.getItem('worthswitchDraftV5')||'{}');
  Object.entries(data).forEach(([id,val])=>{if($(id))$(id).value=val});
  updateAllowance();
}
document.addEventListener('input',e=>{if(e.target.matches('[data-save]')){saveDraft();if(['dependents','children','disability'].includes(e.target.id))updateAllowance()}});

function saveComparison(){
  if(!last.c)return;
  let a=JSON.parse(localStorage.getItem('worthswitchSavedV5')||'[]');
  a.unshift({id:Date.now(),when:new Date().toLocaleString('hr-HR'),c:last.cr.salary,n:last.nr.salary,d:last.d,be:last.be,pct:last.pct});
  localStorage.setItem('worthswitchSavedV5',JSON.stringify(a.slice(0,20)));
  alert('Usporedba je spremljena.');
}
function showSaved(){document.getElementById('savedPanel').classList.remove('hidden');renderSaved();window.scrollTo({top:0,behavior:'smooth'})}
function closeSaved(){document.getElementById('savedPanel').classList.add('hidden')}
function renderSaved(){
  let a=JSON.parse(localStorage.getItem('worthswitchSavedV5')||'[]');
  $('savedList').innerHTML=a.length?a.map(x=>`<div class="saved-item"><div><b>${fmt(x.c)} → ${fmt(x.n)} bruto/mj.</b><div class="saved-meta">${x.when} · ${x.d>=0?'+':''}${fmt(x.d)}/god. · break-even ${fmt(x.be)}</div></div><button class="btn btn-ghost" onclick="deleteSaved(${x.id})">Obriši</button></div>`).join(''):'<p class="muted">Još nema spremljenih usporedbi.</p>';
}
function deleteSaved(id){let a=JSON.parse(localStorage.getItem('worthswitchSavedV5')||'[]').filter(x=>x.id!==id);localStorage.setItem('worthswitchSavedV5',JSON.stringify(a));renderSaved()}

async function shareResult(){
  if(!last.c)return;
  const text=`WorthSwitch rezultat: ${last.d>=0?'nova ponuda se isplati':'trenutni posao ima veću vrijednost'}. Razlika: ${last.d>=0?'+':''}${fmt(last.d)} godišnje (${last.pct>=0?'+':''}${last.pct.toFixed(1)}%). Break-even bruto: ${fmt(last.be)} mjesečno.`;
  if(navigator.share){try{await navigator.share({title:'WorthSwitch rezultat',text,url:location.href});return}catch(e){}}
  try{await navigator.clipboard.writeText(text+' '+location.href);alert('Rezultat je kopiran u međuspremnik.')}catch(e){alert(text)}
}

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;$('installBtn').hidden=false});
$('installBtn').addEventListener('click',async()=>{if(!deferredInstallPrompt)return;deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;$('installBtn').hidden=true});

if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}))}
restoreDraft();
