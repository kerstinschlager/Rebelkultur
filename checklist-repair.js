(()=>{
  const KEY_PREFIX='rebel_checklist_';
  const items=[
    'Shop-Profil und Kontaktangaben prüfen',
    'Produkte, Preise, Bilder und Beschreibungen prüfen',
    'Zahlungsanbieter und Auszahlung prüfen',
    'Impressum und Datenschutz hinterlegen',
    'AGB und Widerruf hinterlegen',
    'Versandinformationen für Bestellungen vorbereiten',
    'Shop veröffentlichen und Shop-Link für Marketing verwenden'
  ];
  const getKey=()=>window.merchant?.id?KEY_PREFIX+window.merchant.id:KEY_PREFIX+'default';
  const getPanel=()=>document.querySelector('#dashboardChecklist');
  const getBox=()=>document.querySelectorAll('#dashboardChecklist .checklist input[type="checkbox"]');
  const ensureUI=()=>{
    const panel=getPanel();
    if(!panel)return;
    const list=panel.querySelector('.checklist');
    if(!list)return;
    if(list.dataset.rkReady)return;
    list.dataset.rkReady='1';
    list.innerHTML=items.map((text,i)=>`<label><input type="checkbox" data-rk-index="${i}"> <span>${text}</span></label>`).join('');
    let progress=panel.querySelector('.rk-checklist-progress');
    if(!progress){progress=document.createElement('p');progress.className='muted rk-checklist-progress';panel.insertBefore(progress,list)}
  };
  const load=()=>{
    ensureUI();
    const boxes=[...getBox()];
    if(!boxes.length)return;
    let saved={};
    try{saved=JSON.parse(localStorage.getItem(getKey())||'{}')||{}}catch(e){saved={}}
    boxes.forEach((box,i)=>{box.checked=Boolean(saved[items[i]])});
    updateProgress();
  };
  const save=()=>{
    const boxes=[...getBox()];
    if(!boxes.length)return;
    const saved={};
    boxes.forEach((box,i)=>{saved[items[i]]=box.checked});
    localStorage.setItem(getKey(),JSON.stringify(saved));
    updateProgress();
  };
  const updateProgress=()=>{
    const boxes=[...getBox()];
    const el=document.querySelector('#dashboardChecklist .rk-checklist-progress');
    if(!el||!boxes.length)return;
    const done=boxes.filter(b=>b.checked).length;
    el.textContent=`Fortschritt: ${done} von ${boxes.length} Punkten erledigt`;
  };
  const init=()=>{
    ensureUI();
    const boxes=getBox();
    if(!boxes.length)return;
    boxes.forEach(box=>{if(!box.dataset.rkChecklistBound){box.dataset.rkChecklistBound='1';box.addEventListener('change',save)}});
    load();
  };
  document.querySelectorAll('.dash-tab[data-tab="checklist"]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(init,50)));
  init();
  window.addEventListener('hashchange',()=>setTimeout(init,50));
})();
