(()=>{
  const KEY_PREFIX='rebel_checklist_';
  const items=[
    'Produktnamen und Preise prüfen',
    'Bilder und Beschreibungen ergänzen',
    'Zahlungsanbieter verbinden',
    'Impressum und Datenschutz hinterlegen',
    'Testbestellung durchführen'
  ];
  const getKey=()=>window.merchant?.id?KEY_PREFIX+window.merchant.id:KEY_PREFIX+'default';
  const getBox=()=>document.querySelectorAll('#dashboardChecklist .checklist input[type="checkbox"]');
  const load=()=>{
    const boxes=[...getBox()];
    if(!boxes.length)return;
    let saved={};
    try{saved=JSON.parse(localStorage.getItem(getKey())||'{}')||{}}catch(e){saved={}}
    boxes.forEach((box,i)=>{box.checked=Boolean(saved[items[i]])});
  };
  const save=()=>{
    const boxes=[...getBox()];
    if(!boxes.length)return;
    const saved={};
    boxes.forEach((box,i)=>{saved[items[i]]=box.checked});
    localStorage.setItem(getKey(),JSON.stringify(saved));
  };
  const init=()=>{
    const boxes=getBox();
    if(!boxes.length)return;
    boxes.forEach(box=>{if(!box.dataset.rkChecklistBound){box.dataset.rkChecklistBound='1';box.addEventListener('change',save)}});
    load();
  };
  document.querySelectorAll('.dash-tab[data-tab="checklist"]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(init,50)));
  init();
  window.addEventListener('hashchange',()=>setTimeout(init,50));
})();
