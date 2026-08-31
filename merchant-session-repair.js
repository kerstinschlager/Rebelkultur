(async()=>{
  try{
    const {data}=await db.auth.getSession();
    if(!data.session?.user) return;
    currentUser=data.session.user;
    const {data:merchantRow,error}=await db.from('merchants').select('*').eq('owner_id',currentUser.id).maybeSingle();
    if(error){console.error('merchant session repair',error);return;}
    merchant=merchantRow||null;
  }catch(e){console.error('merchant session repair',e)}
})();
