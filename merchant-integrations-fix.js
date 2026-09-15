(()=>{
  const show=()=>{
    const nav=document.getElementById('dashboardNav');
    if(!nav)return false;
    let tab=nav.querySelector('[data-tab="integrations"]');
    if(!tab){
      tab=document.createElement('button');
      tab.type='button';
      tab.className='dash-tab';
      tab.dataset.tab='integrations';
      tab.textContent='Integrationen';
      nav.insertBefore(tab,nav.firstChild);
    }
    tab.style.display='inline-flex';
    tab.style.visibility='visible';
    tab.style.opacity='1';
    let panel=document.getElementById('dashboardIntegrations');
    if(!panel){
      panel=document.createElement('div');
      panel.id='dashboardIntegrations';
      panel.className='dash-panel hidden';
      nav.after(panel);
    }
    const open=()=>{
      document.querySelectorAll('.dash-panel').forEach(p=>p.classList.add('hidden'));
      panel.classList.remove('hidden');
      document.querySelectorAll('.dash-tab').forEach(b=>b.classList.remove('active'));
      tab.classList.add('active');
      if(typeof window.__zqRenderIntegrations==='function')window.__zqRenderIntegrations();
    };
    tab.onclick=open;
    if(!window.__zqIntegrationsSet){
      window.__zqIntegrationsSet=true;
      const old=window.setDashTab;
      window.setDashTab=(name)=>{
        if(name==='integrations'){open();return}
        if(old)old(name);
      };
    }
    return true;
  };
  const boot=()=>{if(show())return;setTimeout(boot,250)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  setInterval(show,1000);
})();