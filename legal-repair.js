(function(){
  function legalModal(){
    let m=document.getElementById('legalModal');
    if(m)return m;
    m=document.createElement('div');
    m.id='legalModal';m.className='modal hidden';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');
    m.innerHTML=`<div class="modal-card"><button class="close" type="button" id="legalClose">×</button><h2 id="legalTitle">Rechtstext bearbeiten</h2><label id="legalLabel">Text<textarea id="legalText" rows="14" style="width:100%;margin-top:8px"></textarea></label><button class="primary full" type="button" id="legalSave">Speichern</button></div>`;
    document.body.appendChild(m);
    document.getElementById('legalClose').onclick=()=>m.classList.add('hidden');
    document.getElementById('legalSave').onclick=saveLegal;
    return m;
  }
  const fields={
    'Impressum':'impressum','Datenschutz':'datenschutz','AGB':'agb','Widerruf':'widerruf'
  };
  let activeField='impressum';
  async function loadLegal(){
    if(!window.merchant && typeof merchant==='undefined')return;
    const mm=window.merchant || merchant;
    if(!mm)return;
    const {data,error}=await db.from('merchant_legal_settings').select('impressum,datenschutz,agb,widerruf').eq('merchant_id',mm.id).maybeSingle();
    if(error){console.error(error);toast(error.message);return;}
    window.__rkLegal=data||{impressum:'',datenschutz:'',agb:'',widerruf:''};
  }
  async function openLegal(label){
    const key=fields[label];if(!key)return;
    await loadLegal();activeField=key;
    const m=legalModal();
    document.getElementById('legalTitle').textContent=label+' bearbeiten';
    document.getElementById('legalLabel').firstChild.textContent=label;
    document.getElementById('legalText').value=(window.__rkLegal&&window.__rkLegal[key])||'';
    m.classList.remove('hidden');
  }
  async function saveLegal(){
    const mm=window.merchant || (typeof merchant!=='undefined'?merchant:null);
    const user=window.currentUser || (typeof currentUser!=='undefined'?currentUser:null);
    if(!mm||!user)return toast('Bitte zuerst anmelden');
    const existing=window.__rkLegal||{};
    existing[activeField]=document.getElementById('legalText').value.trim();
    const payload={merchant_id:mm.id,impressum:existing.impressum||'',datenschutz:existing.datenschutz||'',agb:existing.agb||'',widerruf:existing.widerruf||''};
    const {error}=await db.from('merchant_legal_settings').upsert(payload,{onConflict:'merchant_id'});
    if(error){toast(error.message);return;}
    window.__rkLegal=existing;document.getElementById('legalModal').classList.add('hidden');toast('Rechtstext gespeichert');
  }
  function bind(){
    document.querySelectorAll('.legal-grid > div').forEach(card=>{
      if(card.dataset.legalBound)return;card.dataset.legalBound='1';card.style.cursor='pointer';
      card.addEventListener('click',()=>openLegal(card.childNodes[0].textContent.trim()));
    });
    const tab=document.querySelector('.dash-tab[data-tab="legal"]');
    if(tab&&!tab.dataset.legalTabBound){tab.dataset.legalTabBound='1';tab.addEventListener('click',()=>setTimeout(loadLegal,50));}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();
