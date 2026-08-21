const $ = id => document.getElementById(id);
const N = id => Number($(id)?.value) || 0;

let last = {};
let deferredInstallPrompt = null;

// ============================================================
// WorthSwitch v5.3
// Hrvatska — informativni godišnji porezni model 2026.
// ============================================================

const APP_VERSION = '5.3';

const TAX_CONFIG_2026 = {
  personalAllowanceMonthly: 600,
  annualHigherRateThreshold: 60000,
  pensionRate: 0.20
};

// Preseti su samo pomoćni.
// Korisnik uvijek može ručno promijeniti lokalne porezne stope.
const rates = {
  zagreb: [23, 33],
  split: [21.5, 32],
  rijeka: [20, 25],
  osijek: [20, 30],
  bjelovar: [18, 25]
};

// Neutralna zona:
// ako je razlika Total Job Value manja od 1%, ponude prikazujemo
// kao približno izjednačene.
const NEUTRAL_PERCENT = 1;


// ============================================================
// JOB FIELDS
// ============================================================

const jobFields = [
  ['Salary', 'Bruto mjesečna plaća (€)', 'number', 2777],
  ['Months', 'Broj plaća godišnje', 'number', 12],
  ['Bonus', 'Godišnji bruto bonus (€)', 'number', 0],
  ['Other', 'Ostali neoporezivi primici godišnje (€)', 'number', 0],
  ['Regres', 'Regres (€)', 'number', 0],
  ['Boz', 'Božićnica (€)', 'number', 0],
  ['Usk', 'Uskrsnica (€)', 'number', 0],
  ['Meal', 'Prehrana mjesečno (€)', 'number', 100],
  ['TravelPay', 'Prijevoz koji firma isplaćuje mjesečno (€)', 'number', 80],
  ['Vacation', 'Dani godišnjeg', 'number', 25],
  ['Remote', 'Remote dana tjedno', 'number', 2],
  ['Commute', 'Putovanje u jednom smjeru (min)', 'number', 30],
  ['TravelCost', 'Vlastiti trošak puta po danu u uredu (€)', 'number', 5],
  ['Benefits', 'Vrijednost ostalih benefita godišnje (€)', 'number', 400]
];


function fieldLimits(s) {
  const limits = {
    Salary: 'min="0" max="50000" step="1"',
    Months: 'min="1" max="24" step="1"',
    Bonus: 'min="0" max="500000" step="1"',
    Other: 'min="0" max="100000" step="1"',
    Regres: 'min="0" max="100000" step="1"',
    Boz: 'min="0" max="100000" step="1"',
    Usk: 'min="0" max="100000" step="1"',
    Meal: 'min="0" max="5000" step="1"',
    TravelPay: 'min="0" max="5000" step="1"',
    Vacation: 'min="0" max="60" step="1"',
    Remote: 'min="0" max="5" step="1"',
    Commute: 'min="0" max="300" step="1"',
    TravelCost: 'min="0" max="500" step="0.1"',
    Benefits: 'min="0" max="100000" step="1"'
  };

  return limits[s] || 'min="0"';
}


function buildJobForms() {
  document.querySelectorAll('.job-grid').forEach(grid => {
    const p = grid.dataset.prefix;

    grid.innerHTML = jobFields.map(([s, l, t, d]) => {
      let value = d;

      if (p === 'n') {
        const overrides = {
          Salary: 3400,
          Bonus: 1500,
          Regres: 300,
          Boz: 700,
          Usk: 150,
          Vacation: 26,
          Remote: 3,
          Commute: 20,
          TravelCost: 4,
          Benefits: 500
        };

        if (overrides[s] !== undefined) {
          value = overrides[s];
        }
      }

      let helper = '';

      if (s === 'Bonus') {
        helper =
          '<div class="field-help">Upiši godišnji bruto iznos bonusa. ' +
          'Primjer: 10% bonusa na 3.500 € × 12 = 4.200 €.</div>';
      }

      if (s === 'Commute') {
        helper =
          `<div class="field-help" id="${p}CommuteHelp">` +
          'Vrijeme samo u jednom smjeru.</div>';
      }

      if (s === 'Remote') {
        helper =
          '<div class="field-help">Broj uobičajenih remote dana u radnom tjednu.</div>';
      }

      if (s === 'Benefits') {
        helper =
          '<div class="field-help">Procijeni godišnju vrijednost benefita koji nisu izravna novčana isplata.</div>';
      }

      return `
        <div>
          <label>${l}</label>
          <input
            id="${p + s}"
            data-save
            type="${t}"
            ${fieldLimits(s)}
            value="${value}"
          >
          ${helper}
        </div>
      `;
    }).join('');
  });

  updateCommuteHelpers();
}

buildJobForms();


// ============================================================
// WORK-LIFE LABELS
// ============================================================

function updateWorkLifeLabels() {

  document
    .querySelectorAll('.feature-card h3')
    .forEach(el => {
      if (el.textContent.trim() === 'Job Score') {
        el.textContent = 'Work-Life Score';
      }
    });

  document
    .querySelectorAll('.feature-card')
    .forEach(card => {
      const h3 = card.querySelector('h3');

      if (
        h3 &&
        h3.textContent.trim() === 'Work-Life Score'
      ) {
        const p = card.querySelector('p');

        if (p) {
          p.textContent =
            'Pokazatelj fleksibilnosti, putovanja, godišnjeg odmora i benefita.';
        }
      }
    });

  if ($('kScore')) {
    const card =
      $('kScore').closest('.kpi-card');

    if (card) {
      const label =
        card.querySelector('.kpi-label');

      const help =
        card.querySelector('.kpi-help');

      if (label) {
        label.textContent =
          'Work-Life Score';
      }

      if (help) {
        help.textContent =
          'Heuristički indikator kvalitete radnih uvjeta.';
      }
    }
  }

  if ($('scores')) {
    const panel =
      $('scores').closest('.panel');

    if (panel) {
      const h2 =
        panel.querySelector('h2');

      const p =
        panel.querySelector('p.muted');

      if (h2) {
        h2.textContent =
          'Work-Life Score';
      }

      if (p) {
        p.textContent =
          'Dodatni heuristički indikator koji uspoređuje benefite, fleksibilnost, vrijeme putovanja i godišnji odmor. Plaća se ne boduje jer je već uključena u Total Job Value.';
      }
    }
  }
}


// ============================================================
// NAVIGATION
// ============================================================

function startFlow() {
  $('landing').classList.add('hidden');
  $('savedPanel').classList.add('hidden');
  $('wizard').classList.remove('hidden');

  goTo(1);
  updateAllowance();
}


function loadDraftAndStart() {
  restoreDraft();
  startFlow();
}


function showLanding() {
  $('landing').classList.remove('hidden');
  $('wizard').classList.add('hidden');
  $('savedPanel').classList.add('hidden');

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}


function goTo(x) {
  [1, 2, 3, 4].forEach(i => {
    $('step' + i).classList.toggle('hidden', i !== x);
  });

  $('stepLabel').textContent =
    x + ' / 4 — ' +
    ['Porezni profil', 'Trenutni posao', 'Nova ponuda', 'Rezultat'][x - 1];

  $('progressBar').style.width =
    x * 25 + '%';

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });

  if (x === 1) {
    updateAllowance();
  }

  if (x === 4) {
    updateWorkLifeLabels();
  }
}


// ============================================================
// TAX PROFILE
// ============================================================

function applyCity() {
  const v = $('city').value;

  if (rates[v]) {
    $('taxLow').value =
      rates[v][0];

    $('taxHigh').value =
      rates[v][1];

    saveDraft();
  }
}


function childAllowance(k) {
  k =
    Math.max(
      0,
      Math.floor(
        Number(k) || 0
      )
    );

  const firstNine = [
    300,
    420,
    600,
    840,
    1140,
    1500,
    1920,
    2400,
    2940
  ];

  if (k <= 9) {
    let total = 0;

    for (
      let i = 0;
      i < k;
      i++
    ) {
      total +=
        firstNine[i];
    }

    return total;
  }

  let total =
    firstNine.reduce(
      (a, b) => a + b,
      0
    );

  let previousCoefficient =
    4.9;

  for (
    let child = 10;
    child <= k;
    child++
  ) {
    const increment =
      1.1 +
      (child - 10) * 0.1;

    previousCoefficient +=
      increment;

    total +=
      previousCoefficient *
      TAX_CONFIG_2026.personalAllowanceMonthly;
  }

  return total;
}


function allowance() {
  return (
    TAX_CONFIG_2026.personalAllowanceMonthly +
    Math.max(0, N('dependents')) * 300 +
    childAllowance(N('children')) +
    Math.max(0, N('disability'))
  );
}


function updateAllowance() {
  if (!$('allowanceInfo')) {
    return;
  }

  $('allowanceInfo').innerHTML =
    'Procijenjeni osobni odbitak: <b>' +
    fmt(allowance()) +
    ' mjesečno</b>. Osnova 600 € + uzdržavani članovi + djeca ' +
    '+ eventualna invalidnost.';
}


function normalizeYouthRelief(v) {
  v =
    Number(v) || 0;

  if (v > 1) {
    v /= 100;
  }

  return Math.max(
    0,
    Math.min(
      1,
      v
    )
  );
}


// ============================================================
// FORMAT
// ============================================================

function fmt(x) {
  return new Intl.NumberFormat(
    'hr-HR',
    {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }
  ).format(
    Number.isFinite(
      Number(x)
    )
      ? Number(x)
      : 0
  );
}


function signedMoney(x) {
  return (
    x >= 0
      ? '+'
      : ''
  ) + fmt(x);
}


function signedNumber(
  x,
  suffix = ''
) {
  const n =
    Math.round(
      Number(x) || 0
    );

  return (
    n >= 0
      ? '+'
      : ''
  ) +
  n +
  suffix;
}


// ============================================================
// ANNUAL EMPLOYMENT TAX
// ============================================================

function annualEmploymentTax(grossAnnual) {

  grossAnnual =
    Math.max(
      0,
      Number(grossAnnual) || 0
    );

  const pension =
    grossAnnual *
    TAX_CONFIG_2026.pensionRate;

  const annualAllowance =
    Math.max(
      0,
      allowance() * 12
    );

  const incomeAfterPension =
    Math.max(
      0,
      grossAnnual -
      pension
    );

  const taxable =
    Math.max(
      0,
      incomeAfterPension -
      annualAllowance
    );

  const lowerBase =
    Math.min(
      taxable,
      TAX_CONFIG_2026.annualHigherRateThreshold
    );

  const higherBase =
    Math.max(
      0,
      taxable -
      TAX_CONFIG_2026.annualHigherRateThreshold
    );

  const lowRate =
    Math.max(
      0,
      N('taxLow')
    ) / 100;

  const highRate =
    Math.max(
      0,
      N('taxHigh')
    ) / 100;

  const lowerTax =
    lowerBase *
    lowRate;

  const higherTax =
    higherBase *
    highRate;

  const youth =
    normalizeYouthRelief(
      N('youthRelief')
    );

  const youthReliefAmount =
    lowerTax *
    youth;

  const tax =
    Math.max(
      0,
      lowerTax +
      higherTax -
      youthReliefAmount
    );

  const net =
    Math.max(
      0,
      grossAnnual -
      pension -
      tax
    );

  return {
    pension,
    annualAllowance,
    incomeAfterPension,
    taxable,
    lowerBase,
    higherBase,
    lowerTax,
    higherTax,
    youthReliefAmount,
    tax,
    net
  };
}


// ============================================================
// INPUT NORMALIZATION
// ============================================================

function raw(p) {
  return {
    salary: N(p + 'Salary'),
    months: N(p + 'Months'),
    bonus: N(p + 'Bonus'),
    other: N(p + 'Other'),
    regres: N(p + 'Regres'),
    boz: N(p + 'Boz'),
    usk: N(p + 'Usk'),
    meal: N(p + 'Meal'),
    travelPay: N(p + 'TravelPay'),
    vacation: N(p + 'Vacation'),
    remote: N(p + 'Remote'),
    commute: N(p + 'Commute'),
    travelCost: N(p + 'TravelCost'),
    benefits: N(p + 'Benefits')
  };
}


function normalizedJob(j) {
  return {
    ...j,

    salary:
      Math.max(
        0,
        Number(j.salary) || 0
      ),

    months:
      Math.max(
        1,
        Math.min(
          24,
          Number(j.months) || 12
        )
      ),

    bonus:
      Math.max(
        0,
        Number(j.bonus) || 0
      ),

    other:
      Math.max(
        0,
        Number(j.other) || 0
      ),

    regres:
      Math.max(
        0,
        Number(j.regres) || 0
      ),

    boz:
      Math.max(
        0,
        Number(j.boz) || 0
      ),

    usk:
      Math.max(
        0,
        Number(j.usk) || 0
      ),

    meal:
      Math.max(
        0,
        Number(j.meal) || 0
      ),

    travelPay:
      Math.max(
        0,
        Number(j.travelPay) || 0
      ),

    vacation:
      Math.max(
        0,
        Math.min(
          60,
          Number(j.vacation) || 0
        )
      ),

    remote:
      Math.max(
        0,
        Math.min(
          5,
          Number(j.remote) || 0
        )
      ),

    commute:
      Math.max(
        0,
        Math.min(
          300,
          Number(j.commute) || 0
        )
      ),

    travelCost:
      Math.max(
        0,
        Number(j.travelCost) || 0
      ),

    benefits:
      Math.max(
        0,
        Number(j.benefits) || 0
      )
  };
}


// ============================================================
// CALCULATION ENGINE
// ============================================================

function calc(inputJob) {

  const j =
    normalizedJob(
      inputJob
    );

  const grossAnnual =
    j.salary *
    j.months +
    j.bonus;

  const tax =
    annualEmploymentTax(
      grossAnnual
    );

  const regularGross =
    j.salary *
    j.months;

  const regularShare =
    grossAnnual
      ? regularGross /
        grossAnnual
      : 0;

  const ns =
    tax.net *
    regularShare;

  const nb =
    tax.net -
    ns;

  const direct =
    j.other +
    j.regres +
    j.boz +
    j.usk +
    j.meal * 12 +
    j.travelPay * 12;

  const holidays =
    Math.max(
      0,
      Math.min(
        20,
        N('weekdayHolidays')
      )
    );

  const workableDays =
    Math.max(
      0,
      260 -
      j.vacation -
      holidays
    );

  const officeShare =
    (5 - j.remote) / 5;

  const office =
    workableDays *
    officeShare;

  const hours =
    office *
    j.commute *
    2 / 60;

  const cost =
    office *
    j.travelCost;

  const cash =
    tax.net +
    direct;

  const financial =
    cash +
    j.benefits -
    cost;

  const total =
    financial -
    hours *
    Math.max(
      0,
      N('hourValue')
    );


  // ========================================================
  // WORK-LIFE SCORE
  // ========================================================
  //
  // Work-Life Score namjerno NE boduje plaću.
  // Novac je već uključen u Financial Value i Total Job Value.
  //
  // Score uspoređuje:
  // 15% benefite
  // 30% fleksibilnost
  // 30% putovanje
  // 25% godišnji odmor
  //
  // Tako Total Job Value odgovara na pitanje:
  // "Isplati li se?"
  //
  // Work-Life Score odgovara na pitanje:
  // "Kakvi su radni uvjeti?"
  // ========================================================


  // Benefiti:
  // 0 € = 0 bodova
  // 3.000 € godišnje ili više = 100 bodova
  const sb =
    Math.min(
      100,
      Math.max(
        0,
        j.benefits / 30
      )
    );


  // Fleksibilnost:
  // 0 remote dana = 0
  // 5 remote dana = 100
  const sf =
    Math.min(
      100,
      Math.max(
        0,
        j.remote / 5 * 100
      )
    );


  // Putovanje:
  // 0 min u jednom smjeru = 100
  // 60 min = 50
  // 120 min ili više = 0
  //
  // Remote ovdje NE utječe na score,
  // kako se fleksibilnost ne bi bodovala dvaput.
  const st =
    Math.min(
      100,
      Math.max(
        0,
        100 -
        j.commute / 1.2
      )
    );


  // Godišnji odmor:
  // 30 dana = 100 bodova
  const sv =
    Math.min(
      100,
      Math.max(
        0,
        j.vacation / 30 * 100
      )
    );


  const score =
    Math.round(
      sb * .15 +
      sf * .30 +
      st * .30 +
      sv * .25
    );


  return {
    ...j,
    grossAnnual,
    tax,
    ns,
    nb,
    direct,
    office,
    hours,
    cost,
    cash,
    financial,
    total,

    sb,
    sf,
    st,
    sv,
    score
  };
}


// ============================================================
// BREAK EVEN
// ============================================================

function breakEven(c, r) {
  let lo = 500;
  let hi = 10000;

  if (
    calc({
      ...r,
      salary: lo
    }).total >=
    c.total
  ) {
    return {
      value: lo,
      status: 'below'
    };
  }

  if (
    calc({
      ...r,
      salary: hi
    }).total <
    c.total
  ) {
    return {
      value: hi,
      status: 'above'
    };
  }

  for (
    let i = 0;
    i < 45;
    i++
  ) {
    const m =
      (lo + hi) / 2;

    if (
      calc({
        ...r,
        salary: m
      }).total >=
      c.total
    ) {
      hi = m;
    }
    else {
      lo = m;
    }
  }

  return {
    value: hi,
    status: 'within'
  };
}


function breakEvenText(be) {

  if (
    be.status ===
    'above'
  ) {
    return '>' +
      fmt(be.value);
  }

  if (
    be.status ===
    'below'
  ) {
    return '<' +
      fmt(be.value);
  }

  return fmt(be.value);
}


// ============================================================
// VALIDATION
// ============================================================

function validateInputs() {

  const problems = [];

  ['c', 'n']
    .forEach(p => {

      const name =
        p === 'c'
          ? 'Trenutni posao'
          : 'Nova ponuda';

      if (
        N(p + 'Salary') < 0
      ) {
        problems.push(
          name +
          ': bruto plaća ne može biti negativna.'
        );
      }

      if (
        N(p + 'Months') < 1 ||
        N(p + 'Months') > 24
      ) {
        problems.push(
          name +
          ': broj plaća mora biti između 1 i 24.'
        );
      }

      if (
        N(p + 'Remote') < 0 ||
        N(p + 'Remote') > 5
      ) {
        problems.push(
          name +
          ': remote dani moraju biti između 0 i 5.'
        );
      }

      if (
        N(p + 'Vacation') < 0 ||
        N(p + 'Vacation') > 60
      ) {
        problems.push(
          name +
          ': provjeri broj dana godišnjeg odmora.'
        );
      }

      if (
        N(p + 'Commute') < 0 ||
        N(p + 'Commute') > 300
      ) {
        problems.push(
          name +
          ': provjeri vrijeme putovanja.'
        );
      }
    });

  if (
    N('taxLow') < 0 ||
    N('taxLow') > 40
  ) {
    problems.push(
      'Provjeri nižu poreznu stopu.'
    );
  }

  if (
    N('taxHigh') < 0 ||
    N('taxHigh') > 50
  ) {
    problems.push(
      'Provjeri višu poreznu stopu.'
    );
  }

  if (problems.length) {

    alert(
      'Provjeri unesene podatke:\n\n' +
      problems.join('\n')
    );

    return false;
  }

  return true;
}


// ============================================================
// RESULT VERDICT
// ============================================================

function resultVerdict(
  d,
  pct
) {

  if (
    Math.abs(pct) <
    NEUTRAL_PERCENT
  ) {
    return {
      type: 'neutral',
      text: 'Ponude su gotovo izjednačene'
    };
  }

  if (d > 0) {
    return {
      type: 'good',
      text: 'Nova ponuda se isplati'
    };
  }

  return {
    type: 'bad',
    text: 'Trenutni posao ima veću vrijednost'
  };
}


// ============================================================
// CALCULATE + RENDER
// ============================================================

function calculate() {

  if (
    !validateInputs()
  ) {
    return;
  }

  const cr =
    raw('c');

  const nr =
    raw('n');

  const c =
    calc(cr);

  const nn =
    calc(nr);

  const d =
    nn.total -
    c.total;

  const fd =
    nn.financial -
    c.financial;

  const saved =
    c.hours -
    nn.hours;

  const beObj =
    breakEven(
      c,
      nr
    );

  const be =
    beObj.value;

  const pct =
    c.total
      ? d /
        Math.abs(c.total) *
        100
      : 0;

  const verdict =
    resultVerdict(
      d,
      pct
    );

  last = {
    cr,
    nr,
    c,
    nn,
    d,
    fd,
    saved,
    be,
    beStatus: beObj.status,
    pct,
    verdict
  };


  // ---------------- RESULT HERO ----------------

  const timeSentence =
    Math.abs(saved) < .5
      ? 'Vrijeme putovanja je približno jednako.'
      : saved > 0
        ? `Nova ponuda štedi približno <b>${Math.round(saved)} sati godišnje</b>.`
        : `Nova ponuda uzima približno <b>${Math.round(Math.abs(saved))} sati više godišnje</b>.`;

  const moneySentence =
    Math.abs(fd) < 1
      ? 'Financijska vrijednost ponuda je približno jednaka.'
      : fd > 0
        ? `Nova ponuda vrijedi približno <b>${fmt(fd)} više financijski godišnje</b>.`
        : `Nova ponuda vrijedi približno <b>${fmt(Math.abs(fd))} manje financijski godišnje</b>.`;

  $('resultHero').innerHTML = `
    <div class="eyebrow">
      WORTHSWITCH REZULTAT
    </div>

    <div class="big ${verdict.type}">
      ${verdict.text}
    </div>

    <div class="result-number">
      ${signedMoney(d)} godišnje
      ·
      ${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%
    </div>

    <div class="result-explanation">
      <div>${moneySentence}</div>
      <div>${timeSentence}</div>
    </div>

    <p class="result-note">
      Total Job Value uključuje financije, benefite,
      trošak putovanja i tvoju vrijednost vremena.
    </p>
  `;


  // ---------------- KPI ----------------

  $('kFin').textContent =
    signedMoney(fd);

  $('kTime').textContent =
    signedNumber(
      saved,
      ' h'
    );

  $('kBreak').textContent =
    breakEvenText(
      beObj
    );

  const scoreDiff =
    nn.score -
    c.score;

  $('kScore').innerHTML =
    `${c.score} → ${nn.score}` +
    `<span class="score-diff ${
      scoreDiff > 0
        ? 'score-positive'
        : scoreDiff < 0
          ? 'score-negative'
          : ''
    }">(${scoreDiff >= 0 ? '+' : ''}${scoreDiff})</span>`;


  // ---------------- COMPARISON ----------------

  $('comparison').innerHTML = `
    <div class="table-wrap">
      <table>

        <tr>
          <th></th>
          <th>Trenutni</th>
          <th>Nova ponuda</th>
        </tr>

        <tr>
          <td>Godišnji bruto</td>
          <td>${fmt(c.grossAnnual)}</td>
          <td>${fmt(nn.grossAnnual)}</td>
        </tr>

        <tr>
          <td>Procijenjeni godišnji neto redovne plaće*</td>
          <td>${fmt(c.ns)}</td>
          <td>${fmt(nn.ns)}</td>
        </tr>

        <tr>
          <td>Procijenjeni neto dio bonusa*</td>
          <td>${fmt(c.nb)}</td>
          <td>${fmt(nn.nb)}</td>
        </tr>

        <tr>
          <td>Godišnji porez nakon odabranog umanjenja</td>
          <td>${fmt(c.tax.tax)}</td>
          <td>${fmt(nn.tax.tax)}</td>
        </tr>

        <tr>
          <td>Direktni / neoporezivi primici</td>
          <td>${fmt(c.direct)}</td>
          <td>${fmt(nn.direct)}</td>
        </tr>

        <tr>
          <td>Benefiti</td>
          <td>${fmt(c.benefits)}</td>
          <td>${fmt(nn.benefits)}</td>
        </tr>

        <tr>
          <td>Procijenjeni dani u uredu / god.</td>
          <td>${Math.round(c.office)}</td>
          <td>${Math.round(nn.office)}</td>
        </tr>

        <tr>
          <td>Trošak putovanja</td>
          <td>-${fmt(c.cost)}</td>
          <td>-${fmt(nn.cost)}</td>
        </tr>

        <tr>
          <th>Financijska vrijednost</th>
          <th>${fmt(c.financial)}</th>
          <th>${fmt(nn.financial)}</th>
        </tr>

        <tr>
          <td>Vrijeme putovanja</td>
          <td>${Math.round(c.hours)} h</td>
          <td>${Math.round(nn.hours)} h</td>
        </tr>

        <tr>
          <td>Vrijednost vremena</td>
          <td>-${fmt(c.hours * N('hourValue'))}</td>
          <td>-${fmt(nn.hours * N('hourValue'))}</td>
        </tr>

        <tr class="total-row">
          <th>Total Job Value</th>
          <th>${fmt(c.total)}</th>
          <th>${fmt(nn.total)}</th>
        </tr>

      </table>
    </div>

    <p class="muted comparison-note">
      * Godišnji neto uključuje odabrano godišnje
      porezno umanjenje za mlade. To nije nužno
      iznos mjesečne isplate na platnoj listi.
    </p>
  `;


  // ---------------- SIMULATOR ----------------

  const simMin =
    Math.max(
      500,
      Math.floor(
        Math.min(
          nr.salary,
          be
        ) -
        1500
      )
    );

  const simMax =
    Math.max(
      simMin +
      2000,

      Math.ceil(
        Math.max(
          nr.salary,
          be
        ) +
        2000
      )
    );

  $('simSalary').min =
    Math.floor(
      simMin / 50
    ) * 50;

  $('simSalary').max =
    Math.ceil(
      simMax / 50
    ) * 50;

  $('simSalary').value =
    Math.min(
      Number(
        $('simSalary').max
      ),

      Math.max(
        Number(
          $('simSalary').min
        ),
        nr.salary
      )
    );

  simulate();


  // ---------------- HOW MUCH TO ASK ----------------

  if (
    beObj.status ===
    'within'
  ) {

    const min =
      Math.ceil(
        be / 50
      ) * 50;

    const fair =
      Math.ceil(
        be *
        1.05 /
        50
      ) * 50;

    const exc =
      Math.ceil(
        be *
        1.10 /
        50
      ) * 50;

    $('ask').innerHTML = `
      <div class="pill-row">

        <span class="pill">
          Minimalno ${fmt(min)}
        </span>

        <span class="pill">
          Fer ${fmt(fair)}
        </span>

        <span class="pill">
          Odlično ${fmt(exc)}+
        </span>

      </div>

      <div class="callout">
        Procijenjeni break-even je
        <b>${fmt(min)} bruto mjesečno</b>.
        To je približna plaća pri kojoj bi
        Total Job Value nove ponude dosegnuo
        vrijednost trenutnog posla.
      </div>
    `;
  }

  else if (
    beObj.status ===
    'above'
  ) {
    $('ask').innerHTML = `
      <div class="callout">
        Procijenjeni break-even je
        <b>iznad ${fmt(be)} bruto mjesečno</b>
        prema trenutačnim postavkama.
      </div>
    `;
  }

  else {
    $('ask').innerHTML = `
      <div class="callout">
        Nova ponuda je već konkurentna
        i pri bruto plaći
        <b>ispod ${fmt(be)} mjesečno</b>
        prema trenutačnim postavkama.
      </div>
    `;
  }


  // ---------------- TIME ----------------

  $('time').innerHTML = `
    <div class="grid3">

      <div class="mini-stat">

        <div class="kpi">
          ${Math.round(c.hours)}
        </div>

        <div class="kpi-label">
          sati sada
        </div>

      </div>

      <div class="mini-stat">

        <div class="kpi">
          ${Math.round(nn.hours)}
        </div>

        <div class="kpi-label">
          sati novo
        </div>

      </div>

      <div class="mini-stat">

        <div class="kpi">
          ${signedNumber(saved)}
        </div>

        <div class="kpi-label">
          razlika
        </div>

      </div>

    </div>

    <div class="callout time-callout">
      ${
        Math.abs(saved) < .5
          ? 'Procijenjeno godišnje vrijeme putovanja je približno jednako.'
          : saved > 0
            ? `Nova ponuda vraća ti približno <b>${Math.round(saved)} sati godišnje</b>.`
            : `Nova ponuda traži približno <b>${Math.round(Math.abs(saved))} dodatnih sati putovanja godišnje</b>.`
      }
    </div>
  `;


  // ---------------- WORK-LIFE SCORE ----------------

  const rows = [
    ['Benefiti', c.sb, nn.sb],
    ['Fleksibilnost', c.sf, nn.sf],
    ['Putovanje', c.st, nn.st],
    ['Godišnji', c.sv, nn.sv]
  ];

  $('scores').innerHTML =
    rows.map(
      r => `
        <div class="metric">

          <div class="metric-head">

            <span>
              ${r[0]}
            </span>

            <span>
              ${Math.round(r[1])}
              →
              ${Math.round(r[2])}
            </span>

          </div>

          <div class="score-bars">

            <div
              class="bar bar-old"
              title="Trenutni posao"
            >
              <div
                style="width:${Math.max(0, Math.min(100, r[1]))}%"
              ></div>
            </div>

            <div
              class="bar bar-new"
              title="Nova ponuda"
            >
              <div
                style="width:${Math.max(0, Math.min(100, r[2]))}%"
              ></div>
            </div>

          </div>

        </div>
      `
    ).join('') +

    `
      <div class="callout">

        <div class="score-total">

          <div>

            <span class="score-caption">
              Trenutni
            </span>

            <strong>
              ${c.score}/100
            </strong>

          </div>

          <div class="score-arrow">
            →
          </div>

          <div>

            <span class="score-caption">
              Nova ponuda
            </span>

            <strong>
              ${nn.score}/100
            </strong>

          </div>

        </div>

        <div class="score-disclaimer">
          Work-Life Score je heuristički indikator
          kvalitete radnih uvjeta.
          Plaća nije dio ovog pokazatelja jer je već
          uključena u Total Job Value.
        </div>

      </div>
    `;

  updateWorkLifeLabels();

  saveDraft();

  goTo(4);
}


// ============================================================
// WHAT-IF
// ============================================================

function simulate() {

  if (
    !last.c
  ) {
    return;
  }

  const s =
    N('simSalary');

  const x =
    calc({
      ...last.nr,
      salary: s
    });

  const d =
    x.total -
    last.c.total;

  const pct =
    last.c.total
      ? d /
        Math.abs(last.c.total) *
        100
      : 0;

  const verdict =
    resultVerdict(
      d,
      pct
    );

  $('simVal').textContent =
    fmt(s) +
    ' bruto / mj.';

  if (
    verdict.type ===
    'neutral'
  ) {
    $('simOut').innerHTML =
      `<b>Približno izjednačeno.</b> ` +
      `Razlika je ${signedMoney(d)}/god.`;
  }

  else if (
    d > 0
  ) {
    $('simOut').innerHTML =
      `<b>Isplati se.</b> ` +
      `Prednost ${fmt(d)}/god.`;
  }

  else {
    $('simOut').innerHTML =
      `<b>Još se ne isplati.</b> ` +
      `Manjak ${fmt(Math.abs(d))}/god.`;
  }
}


// ============================================================
// COMMUTE HELPER
// ============================================================

function updateCommuteHelper(p) {

  const el =
    $(p + 'CommuteHelp');

  if (!el) {
    return;
  }

  const min =
    Math.max(
      0,
      N(p + 'Commute')
    );

  if (!min) {
    el.textContent =
      'Nema vremena putovanja.';

    return;
  }

  const daily =
    min * 2;

  el.textContent =
    `${min} min u jednom smjeru · ` +
    `oko ${daily} min povratno po uredskom danu.`;
}


function updateCommuteHelpers() {
  updateCommuteHelper('c');
  updateCommuteHelper('n');
}


// ============================================================
// LOCAL STORAGE
// ============================================================

function saveDraft() {

  const data = {};

  document
    .querySelectorAll(
      '[data-save]'
    )
    .forEach(
      el => {
        data[el.id] =
          el.value;
      }
    );

  localStorage.setItem(
    'worthswitchDraftV53',
    JSON.stringify(data)
  );
}


function restoreDraft() {

  const rawData =
    localStorage.getItem(
      'worthswitchDraftV53'
    ) ||
    localStorage.getItem(
      'worthswitchDraftV52'
    ) ||
    localStorage.getItem(
      'worthswitchDraftV51'
    ) ||
    '{}';

  let data = {};

  try {
    data =
      JSON.parse(
        rawData
      ) || {};
  }

  catch (e) {
    data = {};
  }

  Object
    .entries(data)
    .forEach(
      ([id, val]) => {
        if ($(id)) {
          $(id).value =
            val;
        }
      }
    );

  updateAllowance();
  updateCommuteHelpers();
}


document.addEventListener(
  'input',
  e => {

    if (
      e.target.matches(
        '[data-save]'
      )
    ) {

      saveDraft();

      if (
        [
          'dependents',
          'children',
          'disability'
        ].includes(
          e.target.id
        )
      ) {
        updateAllowance();
      }

      if (
        e.target.id ===
        'cCommute'
      ) {
        updateCommuteHelper(
          'c'
        );
      }

      if (
        e.target.id ===
        'nCommute'
      ) {
        updateCommuteHelper(
          'n'
        );
      }
    }
  }
);


// ============================================================
// SAVED COMPARISONS
// ============================================================

function getSavedComparisons() {

  const rawData =
    localStorage.getItem(
      'worthswitchSavedV53'
    ) ||
    localStorage.getItem(
      'worthswitchSavedV52'
    ) ||
    localStorage.getItem(
      'worthswitchSavedV51'
    ) ||
    '[]';

  try {

    const parsed =
      JSON.parse(
        rawData
      );

    return Array.isArray(
      parsed
    )
      ? parsed
      : [];
  }

  catch (e) {
    return [];
  }
}


function saveComparison() {

  if (
    !last.c
  ) {
    return;
  }

  let a =
    getSavedComparisons();

  a.unshift({

    id:
      Date.now(),

    when:
      new Date()
        .toLocaleString(
          'hr-HR'
        ),

    version:
      APP_VERSION,

    c:
      last.cr.salary,

    n:
      last.nr.salary,

    d:
      last.d,

    fd:
      last.fd,

    saved:
      last.saved,

    be:
      last.be,

    beStatus:
      last.beStatus,

    pct:
      last.pct,

    cScore:
      last.c.score,

    nScore:
      last.nn.score
  });

  localStorage.setItem(
    'worthswitchSavedV53',
    JSON.stringify(
      a.slice(
        0,
        20
      )
    )
  );

  alert(
    'Usporedba je spremljena na ovom uređaju.'
  );
}


function showSaved() {

  $('savedPanel')
    .classList
    .remove(
      'hidden'
    );

  renderSaved();

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}


function closeSaved() {

  $('savedPanel')
    .classList
    .add(
      'hidden'
    );
}


function renderSaved() {

  const a =
    getSavedComparisons();

  $('savedList').innerHTML =

    a.length

      ? a.map(
          x => {

            const beText =
              x.beStatus ===
              'above'

                ? '> ' +
                  fmt(x.be)

                : x.beStatus ===
                  'below'

                  ? '< ' +
                    fmt(x.be)

                  : fmt(x.be);

            return `
              <div class="saved-item">

                <div>

                  <b>
                    ${fmt(x.c)}
                    →
                    ${fmt(x.n)}
                    bruto/mj.
                  </b>

                  <div class="saved-meta">

                    ${x.when}
                    ·
                    ${x.d >= 0 ? '+' : ''}${fmt(x.d)}/god.
                    ·
                    break-even ${beText}

                  </div>

                </div>

                <button
                  class="btn btn-ghost"
                  onclick="deleteSaved(${x.id})"
                >
                  Obriši
                </button>

              </div>
            `;
          }
        ).join('')

      : '<p class="muted">Još nema spremljenih usporedbi.</p>';
}


function deleteSaved(id) {

  const a =
    getSavedComparisons()
      .filter(
        x =>
          x.id !== id
      );

  localStorage.setItem(
    'worthswitchSavedV53',
    JSON.stringify(a)
  );

  renderSaved();
}


// ============================================================
// SHARE
// ============================================================

async function shareResult() {

  if (
    !last.c
  ) {
    return;
  }

  const beText =
    last.beStatus ===
    'above'

      ? `iznad ${fmt(last.be)}`

      : last.beStatus ===
        'below'

        ? `ispod ${fmt(last.be)}`

        : fmt(last.be);

  const scoreDiff =
    last.nn.score -
    last.c.score;

  const text =
    `WorthSwitch rezultat: ${last.verdict.text}. ` +
    `Total Job Value razlika: ${signedMoney(last.d)} godišnje ` +
    `(${last.pct >= 0 ? '+' : ''}${last.pct.toFixed(1)}%). ` +
    `Financijska razlika: ${signedMoney(last.fd)} godišnje. ` +
    `Vrijeme: ${signedNumber(last.saved, ' h/god.')}. ` +
    `Work-Life Score: ${last.c.score} → ${last.nn.score} ` +
    `(${scoreDiff >= 0 ? '+' : ''}${scoreDiff}). ` +
    `Break-even bruto: ${beText} mjesečno.`;

  if (
    navigator.share
  ) {

    try {

      await navigator.share({
        title:
          'WorthSwitch rezultat',

        text,

        url:
          location.href
      });

      return;
    }

    catch (e) {}
  }

  try {

    await navigator
      .clipboard
      .writeText(
        text +
        ' ' +
        location.href
      );

    alert(
      'Rezultat je kopiran u međuspremnik.'
    );
  }

  catch (e) {
    alert(text);
  }
}


// ============================================================
// PWA INSTALL
// ============================================================

window.addEventListener(
  'beforeinstallprompt',
  e => {

    e.preventDefault();

    deferredInstallPrompt =
      e;

    if (
      $('installBtn')
    ) {
      $('installBtn').hidden =
        false;
    }
  }
);


if (
  $('installBtn')
) {

  $('installBtn')
    .addEventListener(
      'click',
      async () => {

        if (
          !deferredInstallPrompt
        ) {
          return;
        }

        deferredInstallPrompt
          .prompt();

        await deferredInstallPrompt
          .userChoice;

        deferredInstallPrompt =
          null;

        $('installBtn').hidden =
          true;
      }
    );
}


// ============================================================
// SERVICE WORKER
// ============================================================

if (
  'serviceWorker' in
  navigator
) {

  window.addEventListener(
    'load',
    () => {

      navigator
        .serviceWorker
        .register(
          'sw.js'
        )
        .catch(
          () => {}
        );
    }
  );
}


// ============================================================
// INITIALIZE
// ============================================================

restoreDraft();
updateWorkLifeLabels();
   
