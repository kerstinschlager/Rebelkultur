(function(){
  async function repairProducts(){
    try{
      if(typeof db==='undefined') return;
      const {data,error}=await db.from('products').select('id,name,slug,description,price,stock,image_url,created_at,category_id').eq('active',true).order('created_at',{ascending:false});
      if(error) throw error;
      if(typeof products!=='undefined') products=(data||[]).map(p=>({...p,category:'Produkte',image:p.image_url||''}));
      if(typeof renderShop==='function') renderShop();
      const toastEl=document.querySelector('#toast');
      if(toastEl && /Produkte konnten nicht geladen werden/.test(toastEl.textContent||'')) toastEl.classList.remove('show');
    }catch(err){
      console.error('Produkt-Ladevorgang:',err);
    }
  }
  setTimeout(repairProducts,500);
  window.addEventListener('load',()=>setTimeout(repairProducts,250));
})();
