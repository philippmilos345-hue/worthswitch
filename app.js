const $=id=>document.getElementById(id), N=id=>Number($(id)?.value)||0;
let last={}, deferredInstallPrompt=null;

// WorthSwitch v5.2 — informativni godišnji porezni model za Hrvatsku (2026.)
const TAX_CONFIG_2026={
  personalAllowanceMonthly:600,
  annualHigherRateThreshold:60000,
  pensionRate:0.20
};

// Preseti su pomoćni. Korisnik uvijek može ručno promijeniti stope.
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

function startFlow(){
  $('landing').classList.add('hidden');
  $('savedPanel').classList.add('hidden');
  $('wizard').classList.remove('hidden');
  goTo(1); updateAllowance();
}
function loadDraftAndStart(){restoreDraft();startFlow()}
function showLanding(){
  $('landing').classList.remove('hidden');
  $('wizard').classList.add('hidden');
  $('savedPanel').classList.add('hidden');
}
function goTo(x){
  [1,2,3,4].forEach(i=>$('step'+i).classList.toggle('hidden',i!==x));
  $('stepLabel').textContent=x+' / 4 — '+['Porezni profil','Trenutni posao','Nova ponuda','Rezultat'][x-1];
  $('progressBar').style.width=x*25+'%';
  window.scrollTo({top:0,behavior:'smooth'});
  if(x===1)updateAllowance();
}
function applyCity(){
  const v=$('city').value;
  if(rates[v]){
    $('taxLow').value=rates[v][0];
    $('taxHigh').value=rates[v][1];
    saveDraft();
  }
}

function childAllowance(k){
  k=Math.max(0,Math.floor(Number(k)||0));
  const firstNine=[300,420,600,840,1140,1500,1920,2400,2940];
  let total=0;
  for(let child=1;child<=k;child++){
    if(child<=9){
      total+=firstNine[child-1];
    }else{
      // Nakon 9. djeteta koeficijent se progresivno povećava:
      // 10. dijete +1,1 koeficijent (=660 €), 11. +1,2 (=720 €), itd.
      const extraCoefficient=1.1+(child-10)*0.1;
      total += firstNine[8] + 0; // placeholder removed below
    }
  }
  if(k<=9) return total;

  // Rebuild exact cumulative allowance for children >=10.
  total=firstNine.reduce((a,b)=>a+b,0);
  let prevCoeff=4.9;
  for(let child=10;child<=k;child++){
    const increment=1.1+(child-10)*0.1;
    prevCoeff+=increment;
    total+=prevCoeff*TAX_CONFIG_2026.personalAllowanceMonthly;
  }
  return total;
}

function allowance(){
  return TAX_CONFIG_2026.personalAllowanceMonthly
    +Math.max(0,N('dependents'))*300
    +childAllowance(N('children'))
    +Math.max(0,N('disability'));
}

function updateAllowance(){
  $('allowanceInfo').innerHTML=
    'Procijenjeni osobni odbitak: <b>'+fmt(allowance())+' mjesečno</b>. '+
    'Osnova 600 € + uzdržavani članovi + djeca + eventualna invalidnost.';
}

function fmt(x){
  return new Intl.NumberFormat('hr-HR',{
    style:'currency',currency:'EUR',maximumFractionDigits:0
  }).format(Number.isFinite(Number(x))?Number(x):0);
}

function normalizeYouthRelief(v){
  v=Number(v)||0;
  if(v>1)v/=100;
  return Math.max(0,Math.min(1,v));
}

function annualEmploymentTax(grossAnnual){
  grossAnnual=Math.max(0,Number(grossAnnual)||0);

  const pension=grossAnnual*TAX_CONFIG_2026.pensionRate;
  const annualAllowance=Math.max(0,allowance()*12);
  const incomeAfterPension=Math.max(0,grossAnnual-pension);
  const taxable=Math.max(0,incomeAfterPension-annualAllowance);

  const lowerBase=Math.min(taxable,TAX_CONFIG_2026.annualHigherRateThreshold);
  const higherBase=Math.max(0,taxable-TAX_CONFIG_2026.annualHigherRateThreshold);

  const lowRate=Math.max(0,N('taxLow'))/100;
  const highRate=Math.max(0,N('taxHigh'))/100;

  const lowerTax=lowerBase*lowRate;
  const higherTax=higherBase*highRate;

  // Umanjenje za mlade odnosi se na razmjerni dio godišnje porezne obveze
  // koji se odnosi na dohodak od nesamostalnog rada, do godišnje osnovice 60.000 €.
  // Budući da ovaj MVP modelira samo plaću/bonus od nesamostalnog rada,
  // umanjenje se primjenjuje na lowerTax.
  const youth=normalizeYouthRelief(N('youthRelief'));
  const youthReliefAmount=lowerTax*youth;

  const tax=Math.max(0,lowerTax+higherTax-youthReliefAmount);
  const net=Math.max(0,grossAnnual-pension-tax);

  return {
    pension,annualAllowance,incomeAfterPension,taxable,
    lowerBase,higherBase,lowerTax,higherTax,
    youthReliefAmount,tax,net
  };
}

function raw(p){
  return{
    salary:N(p+'Salary'),months:N(p+'Months'),bonus:N(p+'Bonus'),
    other:N(p+'Other'),regres:N(p+'Regres'),boz:N(p+'Boz'),usk:N(p+'Usk'),
    meal:N(p+'Meal'),travelPay:N(p+'TravelPay'),vacation:N(p+'Vacation'),
    remote:N(p+'Remote'),commute:N(p+'Commute'),travelCost:N(p+'TravelCost'),
    benefits:N(p+'Benefits')
  };
}

function calc(j){
  const salary=Math.max(0,j.salary);
  const months=Math.max(0,j.months);
  const bonus=Math.max(0,j.bonus);
  const grossAnnual=salary*months+bonus;
  const tax=annualEmploymentTax(grossAnnual);

  // Razdvajanje redovne plaće i bonusa služi samo za prikaz.
  const regularGross=salary*months;
  const regularShare=grossAnnual?regularGross/grossAnnual:0;
  const ns=tax.net*regularShare;
  const nb=tax.net-ns;

  // Korisnik treba unositi samo iznose koje stvarno očekuje kao neoporezivu isplatu.
  // Zakonski neoporezivi limiti nisu automatski validirani u v5.2.
  const direct=
    Math.max(0,j.other)+Math.max(0,j.regres)+Math.max(0,j.boz)+Math.max(0,j.usk)+
    Math.max(0,j.meal)*12+Math.max(0,j.travelPay)*12;

  const vacation=Math.max(0,Math.min(60,j.vacation));
  const remote=Math.max(0,Math.min(5,j.remote));
  const commute=Math.max(0,j.commute);
  const travelCost=Math.max(0,j.travelCost);
  const holidays=Math.max(0,Math.min(20,N('weekdayHolidays')));

  const workableDays=Math.max(0,260-vacation-holidays);
  const officeShare=(5-remote)/5;
  const office=workableDays*officeShare;
  const hours=office*commute*2/60;
  const cost=office*travelCost;

  const cash=tax.net+direct;
  const financial=cash+Math.max(0,j.benefits)-cost;
  const total=financial-hours*Math.max(0,N('hourValue'));

  // Job Score je heuristički indikator, a ne objektivna tržišna ocjena.
  const sm=Math.min(100,Math.max(0,cash/520));
  const sf=Math.min(100,remote/5*100);
  const st=Math.max(0,100-hours/3);
  const sv=Math.min(100,vacation/30*100);
  const score=Math.round(sm*.45+sf*.20+st*.20+sv*.15);

  return {...j,grossAnnual,tax,ns,nb,direct,office,hours,cost,cash,financial,total,sm,sf,st,sv,score};
}

function breakEven(c,r){
  let lo=500,hi=10000;

  if(calc({...r,salary:lo}).total>=c.total)
    return {value:lo,status:'below'};
  if(calc({...r,salary:hi}).total<c.total)
    return {value:hi,status:'above'};

  for(let i=0;i<45;i++){
    const m=(lo+hi)/2;
    if(calc({...r,salary:m}).total>=c.total)hi=m;
    else lo=m;
  }
  return {value:hi,status:'within'};
}

function breakEvenText(be){
  if(be.status==='above')return '>'+fmt(be.value);
  if(be.status==='below')return '<'+fmt(be.value);
  return fmt(be.value);
}

function calculate(){
  const cr=raw('c'),nr=raw('n');
  const c=calc(cr),nn=calc(nr);
  const d=nn.total-c.total;
  const fd=nn.financial-c.financial;
  const saved=c.hours-nn.hours;
  const beObj=breakEven(c,nr);
  const be=beObj.value;
  const pct=c.total?d/c.total*100:0;

  last={cr,nr,c,nn,d,fd,saved,be,beStatus:beObj.status,pct};

  $('resultHero').innerHTML=
    `<div class="eyebrow">WORTHSWITCH REZULTAT</div>
     <div class="big ${d>=0?'good':'bad'}">${d>=0?'Nova ponuda se isplati':'Trenutni posao ima veću vrijednost'}</div>
     <div style="font-size:20px;font-weight:850">${d>=0?'+':''}${fmt(d)} godišnje · ${pct>=0?'+':''}${pct.toFixed(1)}%</div>
     <p style="color:#b9c2d0">Total Job Value uključuje financije, benefite, trošak putovanja i tvoju vrijednost vremena.</p>`;

  $('kFin').textContent=(fd>=0?'+':'')+fmt(fd);
  $('kTime').textContent=(saved>=0?'+':'')+Math.round(saved)+' h';
  $('kBreak').textContent=breakEvenText(beObj);
  $('kScore').textContent=(nn.score-c.score>=0?'+':'')+(nn.score-c.score);

  $('comparison').innerHTML=
    `<table>
      <tr><th></th><th>Trenutni</th><th>Nova ponuda</th></tr>
      <tr><td>Procijenjeni godišnji neto redovne plaće*</td><td>${fmt(c.ns)}</td><td>${fmt(nn.ns)}</td></tr>
      <tr><td>Procijenjeni neto dio bonusa*</td><td>${fmt(c.nb)}</td><td>${fmt(nn.nb)}</td></tr>
      <tr><td>Godišnji porez nakon odabranog umanjenja</td><td>${fmt(c.tax.tax)}</td><td>${fmt(nn.tax.tax)}</td></tr>
      <tr><td>Direktni / neoporezivi primici</td><td>${fmt(c.direct)}</td><td>${fmt(nn.direct)}</td></tr>
      <tr><td>Benefiti</td><td>${fmt(c.benefits)}</td><td>${fmt(nn.benefits)}</td></tr>
      <tr><td>Trošak putovanja</td><td>-${fmt(c.cost)}</td><td>-${fmt(nn.cost)}</td></tr>
      <tr><th>Financijska vrijednost</th><th>${fmt(c.financial)}</th><th>${fmt(nn.financial)}</th></tr>
      <tr><td>Vrijednost vremena</td><td>-${fmt(c.hours*N('hourValue'))}</td><td>-${fmt(nn.hours*N('hourValue'))}</td></tr>
      <tr><th>Total Job Value</th><th>${fmt(c.total)}</th><th>${fmt(nn.total)}</th></tr>
    </table>
    <p class="muted" style="font-size:12px;margin-top:10px">* Godišnji neto uključuje odabrano godišnje porezno umanjenje za mlade. To nije nužno iznos mjesečne isplate na platnoj listi.</p>`;

  $('simSalary').value=Math.min(7000,Math.max(1000,nr.salary));
  simulate();

  if(beObj.status==='within'){
    const min=Math.ceil(be/50)*50;
    const fair=Math.ceil(be*1.05/50)*50;
    const exc=Math.ceil(be*1.10/50)*50;
    $('ask').innerHTML=
      `<span class="pill">Minimalno ${fmt(min)}</span>
       <span class="pill">Fer ${fmt(fair)}</span>
       <span class="pill">Odlično ${fmt(exc)}+</span>
       <div class="callout">Procijenjeni break-even je <b>${fmt(min)} bruto mjesečno</b>.</div>`;
  }else if(beObj.status==='above'){
    $('ask').innerHTML=`<div class="callout">Procijenjeni break-even je <b>iznad ${fmt(be)} bruto mjesečno</b> prema trenutačnim postavkama.</div>`;
  }else{
    $('ask').innerHTML=`<div class="callout">Nova ponuda je već konkurentna i pri bruto plaći <b>ispod ${fmt(be)} mjesečno</b> prema trenutačnim postavkama.</div>`;
  }

  $('time').innerHTML=
    `<div class="grid3">
      <div><div class="kpi">${Math.round(c.hours)}</div><div class="kpi-label">sati sada</div></div>
      <div><div class="kpi">${Math.round(nn.hours)}</div><div class="kpi-label">sati novo</div></div>
      <div><div class="kpi">${saved>=0?'+':''}${Math.round(saved)}</div><div class="kpi-label">razlika</div></div>
    </div>`;

  const rows=[
    ['Novac',c.sm,nn.sm],['Fleksibilnost',c.sf,nn.sf],
    ['Vrijeme',c.st,nn.st],['Godišnji',c.sv,nn.sv]
  ];
  $('scores').innerHTML=
    rows.map(r=>
      `<div class="metric">
        <div class="metric-head"><span>${r[0]}</span><span>${Math.round(r[1])} → ${Math.round(r[2])}</span></div>
        <div class="bar"><div style="width:${r[2]}%"></div></div>
      </div>`).join('')+
    `<div class="callout"><b>Ukupno:</b> ${c.score} → ${nn.score} / 100 <span class="muted">(heuristički indikator)</span></div>`;

  saveDraft();
  goTo(4);
}

function simulate(){
  if(!last.c)return;
  const s=N('simSalary');
  const x=calc({...last.nr,salary:s});
  const d=x.total-last.c.total;
  $('simVal').textContent=fmt(s)+' bruto / mj.';
  $('simOut').innerHTML=d>=0
    ?`<b>Isplati se.</b> Prednost ${fmt(d)}/god.`
    :`<b>Još se ne isplati.</b> Manjak ${fmt(Math.abs(d))}/god.`;
}

function saveDraft(){
  const data={};
  document.querySelectorAll('[data-save]').forEach(el=>data[el.id]=el.value);
  localStorage.setItem('worthswitchDraftV52',JSON.stringify(data));
}
function restoreDraft(){
  const rawData=
    localStorage.getItem('worthswitchDraftV52') ||
    localStorage.getItem('worthswitchDraftV51') || '{}';
  const data=JSON.parse(rawData);
  Object.entries(data).forEach(([id,val])=>{if($(id))$(id).value=val});
  updateAllowance();
}
document.addEventListener('input',e=>{
  if(e.target.matches('[data-save]')){
    saveDraft();
    if(['dependents','children','disability'].includes(e.target.id))updateAllowance();
  }
});

function saveComparison(){
  if(!last.c)return;
  const old=
    localStorage.getItem('worthswitchSavedV52') ||
    localStorage.getItem('worthswitchSavedV51') || '[]';
  let a=JSON.parse(old);
  a.unshift({
    id:Date.now(),when:new Date().toLocaleString('hr-HR'),
    c:last.cr.salary,n:last.nr.salary,d:last.d,
    be:last.be,beStatus:last.beStatus,pct:last.pct
  });
  localStorage.setItem('worthswitchSavedV52',JSON.stringify(a.slice(0,20)));
  alert('Usporedba je spremljena.');
}
function showSaved(){
  $('savedPanel').classList.remove('hidden');
  renderSaved();
  window.scrollTo({top:0,behavior:'smooth'});
}
function closeSaved(){$('savedPanel').classList.add('hidden')}
function renderSaved(){
  const rawData=
    localStorage.getItem('worthswitchSavedV52') ||
    localStorage.getItem('worthswitchSavedV51') || '[]';
  const a=JSON.parse(rawData);
  $('savedList').innerHTML=a.length
    ?a.map(x=>
      `<div class="saved-item">
        <div>
          <b>${fmt(x.c)} → ${fmt(x.n)} bruto/mj.</b>
          <div class="saved-meta">${x.when} · ${x.d>=0?'+':''}${fmt(x.d)}/god. · break-even ${
            x.beStatus==='above'?'> '+fmt(x.be):
            x.beStatus==='below'?'< '+fmt(x.be):fmt(x.be)
          }</div>
        </div>
        <button class="btn btn-ghost" onclick="deleteSaved(${x.id})">Obriši</button>
      </div>`).join('')
    :'<p class="muted">Još nema spremljenih usporedbi.</p>';
}
function deleteSaved(id){
  const rawData=
    localStorage.getItem('worthswitchSavedV52') ||
    localStorage.getItem('worthswitchSavedV51') || '[]';
  const a=JSON.parse(rawData).filter(x=>x.id!==id);
  localStorage.setItem('worthswitchSavedV52',JSON.stringify(a));
  renderSaved();
}

async function shareResult(){
  if(!last.c)return;
  const beText=
    last.beStatus==='above'?`iznad ${fmt(last.be)}`:
    last.beStatus==='below'?`ispod ${fmt(last.be)}`:fmt(last.be);
  const text=
    `WorthSwitch rezultat: ${last.d>=0?'nova ponuda se isplati':'trenutni posao ima veću vrijednost'}. `+
    `Razlika: ${last.d>=0?'+':''}${fmt(last.d)} godišnje (${last.pct>=0?'+':''}${last.pct.toFixed(1)}%). `+
    `Break-even bruto: ${beText} mjesečno.`;
  if(navigator.share){
    try{await navigator.share({title:'WorthSwitch rezultat',text,url:location.href});return}catch(e){}
  }
  try{
    await navigator.clipboard.writeText(text+' '+location.href);
    alert('Rezultat je kopiran u međuspremnik.');
  }catch(e){alert(text)}
}

window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  deferredInstallPrompt=e;
  $('installBtn').hidden=false;
});
$('installBtn').addEventListener('click',async()=>{
  if(!deferredInstallPrompt)return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt=null;
  $('installBtn').hidden=true;
});

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
}
restoreDraft();
