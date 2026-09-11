(()=>{
  const faqs=[
    ['Wann ist mein Shop startbereit?','Prüfe zuerst dein Händlerprofil, Produkte, Zahlungs-/Auszahlungsanbindung, Rechtstexte und Versandinformationen. Danach kannst du deinen Shop veröffentlichen und den Shop-Link teilen.'],
    ['Wo finde ich meinen Shop-Link?','Im Bereich Marketing wird dein persönlicher öffentlicher Shop-Link angezeigt. Du kannst ihn kopieren oder direkt öffnen.'],
    ['Wie bearbeite ich eine Bestellung?','Öffne Bestellungen im Händlerbereich. Dort kannst du den Bearbeitungsstatus ändern und – sobald die Bestellung versendet wurde – Versanddienstleister, Trackingnummer und Tracking-Link hinterlegen.'],
    ['Wann wird eine Bestellung als Umsatz gezählt?','Noch nicht bezahlte bzw. neue Bestellungen und stornierte Bestellungen werden nicht als Umsatz in der Händlerübersicht berücksichtigt.'],
    ['Wie erhalte ich meine Auszahlung?','Auszahlungen laufen über den verbundenen Zahlungsanbieter. Bei Stripe werden Auszahlungen nach den Einstellungen und Vorgaben des verbundenen Stripe-Kontos verarbeitet.'],
    ['Wie funktionieren Kundenbenachrichtigungen?','Status- und Versandänderungen können im Kundenkonto als Benachrichtigungen angezeigt werden.'],
    ['Welche Rechtstexte muss ich hinterlegen?','Im Händlerbereich stehen Felder für Impressum, Datenschutz, AGB und Widerruf zur Verfügung. Welche Texte konkret erforderlich sind, hängt vom Geschäftsmodell und den rechtlichen Umständen ab. Für verbindliche Rechtstexte sollte fachkundige rechtliche Beratung genutzt werden.'],
    ['Was mache ich bei einem Problem?','Prüfe zuerst den jeweiligen Bereich im Händlerdashboard und lade die Seite bei Bedarf neu. Wenn ein konkreter Fehler angezeigt wird, notiere die genaue Fehlermeldung und den betroffenen Bereich.']
  ];
  const panel=()=>document.querySelector('#dashboardFaq');
  function render(){
    const p=panel(); if(!p||p.dataset.rkSupportReady)return;
    p.dataset.rkSupportReady='1';
    const old=[...p.querySelectorAll('details')];
    const first=p.querySelector('details');
    const anchor=first||p.querySelector('button');
    const frag=document.createDocumentFragment();
    faqs.forEach((f,i)=>{const d=document.createElement('details');if(i===0)d.open=true;const s=document.createElement('summary');s.textContent=f[0];const body=document.createElement('p');body.textContent=f[1];d.append(s,body);frag.appendChild(d)});
    old.forEach(x=>x.remove());
    if(anchor) p.insertBefore(frag,anchor); else p.appendChild(frag);
    const button=p.querySelector('button');
    if(button){button.textContent='Support-Hinweis';button.onclick=()=>{if(window.toast)window.toast('Bei einem konkreten Fehler bitte die genaue Fehlermeldung und den betroffenen Bereich notieren.')}}
  }
  document.addEventListener('click',e=>{if(e.target.closest('.dash-tab[data-tab="faq"]'))setTimeout(render,50)});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
})();
(()=>{const s=document.createElement('script');s.src='merchant-customization.js?v=20260911-1';document.head.appendChild(s)})();
