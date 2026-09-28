const SUPABASE_URL='https://tqtfooddimdqthrelseg.supabase.co';
const SUPABASE_KEY='sb_publishable_HM5L9nXRMbbNiNJCN12mGg_7Q7FqkaZ';
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const icons={Furniture:'⌂',Electronics:'◉',Fashion:'♢','Home & kitchen':'♨',Books:'▤',Other:'✦'};
const money=n=>'₦'+Number(n).toLocaleString('en-NG');
const getId=()=>new URLSearchParams(location.search).get('id');
const safe=t=>String(t||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const empty=t=>`<div class="empty">${t}</div>`;
let listings=[],vtuRequests=[],currentUser=null;
const picture=x=>x.image_url?`<img src="${x.image_url}" alt="${safe(x.title)}">`:(icons[x.category]||'✦');
const wa=x=>{const n=String(x.seller_phone||'').replace(/\D/g,'').replace(/^0/,'234');return `https://wa.me/${n}?text=${encodeURIComponent(`Hello ${x.seller_name}, I am interested in your ${x.title} listed on Sell It All.`)}`};
const badge=x=>`<span class="badge ${x.status}">${x.status==='approved'?'Live':x.status==='sold'?'Sold':x.status==='removed'?'Removed by admin':x.status==='rejected'?'Needs changes':'Awaiting review'}</span>`;
function sellerRow(x){const message=x.status==='removed'&&x.rejection_reason?`<p class="rejection">Admin removal note: ${safe(x.rejection_reason)}</p>`:'';const edit=x.status==='pending'||x.status==='rejected'?`<a class="small" href="edit.html?id=${x.id}">Edit</a>`:'';const sold=x.status==='approved'?`<button class="small sold-btn" onclick="markSold('${x.id}')">Mark sold</button>`:'';const remove=x.status!=='sold'&&x.status!=='removed'?`<button class="small del" onclick="removeListing('${x.id}')">Delete</button>`:'';return `<article class="row"><div class="${x.image_url?'row-photo':'ico'}">${picture(x)}</div><div><h3>${safe(x.title)}</h3><p>${safe(x.category)} · ${safe(x.condition)} · ${money(x.price)}</p>${message}</div><div class="actions">${badge(x)}${edit}${sold}${remove}</div></article>`}function adminRow(x){const sold=x.status==='approved'?`<button class="small sold-btn" onclick="markSold('${x.id}')">Mark sold</button>`:'';const remove=x.status!=='removed'&&x.status!=='sold'?`<button class="small del" onclick="removeWithNote('${x.id}')">Remove with note</button>`:'';return `<article class="row"><div class="${x.image_url?'row-photo':'ico'}">${picture(x)}</div><div><h3>${safe(x.title)}</h3><p>${safe(x.category)} · ${safe(x.condition)} · ${money(x.price)}</p><p>${safe(x.seller_name)} · ${safe(x.seller_phone)} · ${safe(x.location)}</p></div><div class="actions">${badge(x)}${sold}${remove}</div></article>`}function marketCard(x){return `<article class="card"><a class="card-link" href="item.html?id=${x.id}"><div class="${x.image_url?'photo':'visual'}">${picture(x)}</div><div><h3>${safe(x.title)}</h3><p class="price">${money(x.price)}</p><p>${safe(x.condition)} · ${safe(x.location)}</p></div></a><div class="card-actions"><a class="detail-link" href="item.html?id=${x.id}">View details →</a><a class="whatsapp" href="${wa(x)}" target="_blank" rel="noopener">WhatsApp seller ↗</a></div></article>`}
async function loadVtuRequests(){
  const target=document.querySelector('#vtuList');
  if(!target)return;
  const {data,error}=await db.from('vtu_requests').select('*').order('created_at',{ascending:false});
  if(error){target.innerHTML=empty(`Could not load VTU requests: ${safe(error.message)}`);return}
  vtuRequests=data||[];
  target.innerHTML=vtuRequests.length?vtuRequests.map(x=>`<article class="row vtu-row"><div class="vtu-icon">◈</div><div><h3>₦${money(x.amount).replace('₦','')} · ${safe(x.network)}</h3><p>VTU phone: ${safe(x.vtu_phone||'Not provided')} · Contact: ${safe(x.contact_phone||'Not provided')}</p><p>Account: ${safe(x.account_number)} · ${safe(x.account_name||'Not provided')}</p><p class="vtu-meta">Received ${new Date(x.created_at).toLocaleString()}</p></div><div class="actions"><button class="small del" onclick="deleteVtuRequest('${x.id}')">Delete message</button></div></article>`).join(''):empty('No VTU requests yet.');
}
async function deleteVtuRequest(id){
  if(!confirm('Delete this VTU request message?'))return;
  const {error}=await db.from('vtu_requests').delete().eq('id',id);
  if(error){alert(error.message);return}
  await loadVtuRequests();
}
async function loadListings(){const {data,error}=await db.from('listings').select('*').order('created_at',{ascending:false});if(error){document.querySelectorAll('#adminList,#sellerList,#marketList,#detailView').forEach(e=>e.innerHTML=empty(`Could not load listings: ${safe(error.message)}`));return}listings=data||[];render()}
function render(){const seller=document.querySelector('#sellerList'),admin=document.querySelector('#adminList'),market=document.querySelector('#marketList');if(seller)seller.innerHTML=currentUser?(listings.filter(x=>x.owner_id===currentUser.id).map(sellerRow).join('')||empty('You have not submitted any items yet.')):empty('Sign in to see your listings. <a href="account.html">Open account</a>');if(admin)admin.innerHTML=listings.map(adminRow).join('')||empty('No listings to review.');if(market){const q=document.querySelector('#marketSearch')?.value.trim().toLowerCase()||'',c=document.querySelector('#categoryFilter')?.value||'all';const results=listings.filter(x=>x.status==='approved'&&(c==='all'||x.category===c)&&[x.title,x.category,x.condition,x.location,x.description].join(' ').toLowerCase().includes(q));document.querySelector('#marketSummary').textContent=`${results.length} ${results.length===1?'item':'items'} found`;market.innerHTML=results.map(marketCard).join('')||empty('No approved items match your search.')}renderDetail()}
async function approve(id){const {error}=await db.from('listings').update({status:'approved',rejection_reason:null}).eq('id',id);if(error)alert(error.message);else loadListings()}
async function rejectListing(id){const reason=prompt('Why is this listing being rejected?');if(!reason?.trim())return;const {error}=await db.from('listings').update({status:'rejected',rejection_reason:reason.trim()}).eq('id',id);if(error)alert(error.message);else loadListings()}
async function markSold(id){if(!confirm('Mark this item as sold? It will disappear from the marketplace.'))return;const {error}=await db.from('listings').update({status:'sold'}).eq('id',id);if(error)alert(error.message);else loadListings()}
async function removeWithNote(id){const reason=prompt('Why are you removing this post? The seller will see this note.');if(!reason?.trim())return;const {error}=await db.from('listings').update({status:'removed',rejection_reason:reason.trim()}).eq('id',id);if(error)alert(error.message);else loadListings()}
async function removeListing(id){if(!confirm('Delete this listing permanently?'))return;const {error}=await db.from('listings').delete().eq('id',id);if(error)alert(error.message);else loadListings()}
async function uploadPhoto(file){if(!file)return null;if(file.size>5*1024*1024)throw new Error('Please use an image smaller than 5 MB.');const path=`items/${currentUser.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g,'-')}`;const {error}=await db.storage.from('listing-images').upload(path,file);if(error)throw error;return db.storage.from('listing-images').getPublicUrl(path).data.publicUrl}
function renderDetail(){const out=document.querySelector('#detailView');if(!out)return;const x=listings.find(a=>a.id===getId()&&a.status==='approved');if(!x){out.innerHTML=empty('This item is unavailable or has been removed.');return}out.innerHTML=`<article class="detail"><div class="detail-image ${x.image_url?'':'visual'}">${picture(x)}</div><div><p class="eyebrow">${safe(x.category)}</p><h1>${safe(x.title)}</h1><p class="price big-price">${money(x.price)}</p><p class="sub">${safe(x.description)}</p><div class="detail-meta"><p><b>Condition</b>${safe(x.condition)}</p><p><b>Location</b>${safe(x.location)}</p><p><b>Seller</b>${safe(x.seller_name)}</p></div><a class="whatsapp" href="${wa(x)}" target="_blank" rel="noopener">Contact seller on WhatsApp ↗</a></div></article>`}
function buildEdit(){const form=document.querySelector('#editForm');if(!form)return;const x=listings.find(a=>a.id===getId()&&a.owner_id===currentUser?.id);if(!x){form.innerHTML=empty('This listing cannot be edited.');return}form.innerHTML=`<label>Item title<input required name="title" value="${safe(x.title)}"></label><div class="grid"><label>Price (₦)<input required type="number" name="price" value="${x.price}"></label><label>Category<select name="category">${Object.keys(icons).map(c=>`<option ${x.category===c?'selected':''}>${c}</option>`).join('')}</select></label></div><div class="grid"><label>Condition<select name="condition">${['Like new','Good','Fair'].map(c=>`<option ${x.condition===c?'selected':''}>${c}</option>`).join('')}</select></label><label>Replace photo (optional)<input type="file" name="photo" accept="image/*"></label></div><label>Description<textarea required name="description" rows="4">${safe(x.description)}</textarea></label><label>Your phone / WhatsApp<input required name="phone" value="${safe(x.seller_phone)}"></label><label>Location<input required name="location" value="${safe(x.location)}"></label><button class="button">Save changes →</button>`;form.onsubmit=async e=>{e.preventDefault();const v=Object.fromEntries(new FormData(form));const image_url=v.photo?.name?await uploadPhoto(v.photo):x.image_url;const {error}=await db.from('listings').update({title:v.title,price:v.price,category:v.category,condition:v.condition,description:v.description,seller_phone:v.phone,location:v.location,image_url,status:'approved',rejection_reason:null}).eq('id',x.id);if(error)alert(error.message);else location.href='seller-dashboard.html'}}
const vtuForm=document.querySelector('#vtuForm');
if(vtuForm)vtuForm.onsubmit=async event=>{
  event.preventDefault();
  const message=document.querySelector('#vtuMessage');
  const button=vtuForm.querySelector('button');
  if(!currentUser){location.href='account.html';return}
  const values=Object.fromEntries(new FormData(vtuForm));
  button.disabled=true;message.textContent='Sending your VTU request…';message.className='form-status';
  try{
    const {error}=await db.from('vtu_requests').insert({amount:values.amount,network:values.network,vtu_phone:values.vtuPhone,contact_phone:values.contactPhone,account_number:values.accountNumber,account_name:values.accountName,owner_id:currentUser.id});
    if(error)throw error;
    vtuForm.reset();message.textContent='Your VTU request has been sent to the admin.';message.className='form-status success';
  }catch(error){message.textContent=`Could not send request: ${error.message}`;message.className='form-status error'}finally{button.disabled=false}
};
const sellForm=document.querySelector('#listingForm');if(sellForm)sellForm.onsubmit=async e=>{e.preventDefault();if(!currentUser){location.href='account.html';return}const b=sellForm.querySelector('button');b.disabled=true;b.textContent='Sending…';try{const v=Object.fromEntries(new FormData(sellForm));const image_url=await uploadPhoto(sellForm.photo.files[0]);const {error}=await db.from('listings').insert({title:v.title,price:v.price,category:v.category,condition:v.condition,description:v.description,seller_name:v.seller,seller_phone:v.phone,location:v.location,image_url,owner_id:currentUser.id,status:'approved'});if(error)throw error;location.href='seller-dashboard.html'}catch(e){alert(`Could not submit: ${e.message}`);b.disabled=false;b.textContent='Send for verification →'}};
const adminLogin=document.querySelector('#adminLogin');if(adminLogin)adminLogin.onsubmit=async e=>{e.preventDefault();const v=Object.fromEntries(new FormData(adminLogin));const {error}=await db.auth.signInWithPassword({email:v.email.trim(),password:v.password});document.querySelector('#loginError').textContent=error?error.message:'';if(!error)location.href='admin.html'};
const signIn=document.querySelector('#signInForm');if(signIn)signIn.onsubmit=async e=>{e.preventDefault();const v=Object.fromEntries(new FormData(signIn));const {error}=await db.auth.signInWithPassword({email:v.email.trim(),password:v.password});document.querySelector('#signInMessage').textContent=error?error.message:'';if(!error)location.href='seller-dashboard.html'};
const signUp=document.querySelector('#signUpForm');if(signUp)signUp.onsubmit=async e=>{e.preventDefault();const v=Object.fromEntries(new FormData(signUp));const {data,error}=await db.auth.signUp({email:v.email.trim(),password:v.password,options:{data:{full_name:v.name}}});if(error){document.querySelector('#signUpMessage').textContent=error.message;return}if(data.session)location.href='seller-dashboard.html';else{document.querySelector('[data-panel="signin"]').click();signIn.querySelector('[name="email"]').value=v.email;document.querySelector('#signInMessage').textContent='Account created. Confirm your email, then sign in here.'}};
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{document.querySelectorAll('.tab').forEach(a=>a.classList.toggle('active',a===t));document.querySelector('#signInForm').classList.toggle('hidden',t.dataset.panel!=='signin');document.querySelector('#signUpForm').classList.toggle('hidden',t.dataset.panel!=='signup')});
const adminLogout=document.querySelector('#adminLogout');
if(adminLogout)adminLogout.addEventListener('click',async()=>{await db.auth.signOut();location.href='admin-login.html'});
document.querySelector('#signOut')?.addEventListener('click',async()=>{await db.auth.signOut();location.href='index.html'});document.querySelector('#marketSearch')?.addEventListener('input',render);document.querySelector('#categoryFilter')?.addEventListener('change',render);
async function loadHero(){
  const hero=document.querySelector('#heroArt');
  if(!hero)return;
  const {data,error}=await db.from('site_settings').select('value').eq('key','homepage_hero_url').maybeSingle();
  if(error||!data?.value)return;
  hero.style.backgroundImage=`url(${data.value})`;
  hero.classList.add('has-image');
}
async function saveHeroImage(){
  const input=document.querySelector('#heroImage');
  const status=document.querySelector('#heroStatus');
  const button=document.querySelector('#saveHero');
  const file=input?.files?.[0];
  if(!file){status.textContent='Choose an image first.';status.className='form-status error';return}
  if(file.size>5*1024*1024){status.textContent='Use an image smaller than 5 MB.';status.className='form-status error';return}
  button.disabled=true;status.textContent='Uploading homepage image…';status.className='form-status';
  try{
    const extension=(file.name.split('.').pop()||'jpg').toLowerCase();
    const path=`homepage/${Date.now()}.${extension}`;
    const {error:uploadError}=await db.storage.from('listing-images').upload(path,file,{upsert:false,contentType:file.type});
    if(uploadError)throw uploadError;
    const url=db.storage.from('listing-images').getPublicUrl(path).data.publicUrl;
    const {error:settingsError}=await db.from('site_settings').upsert({key:'homepage_hero_url',value:url},{onConflict:'key'});
    if(settingsError)throw settingsError;
    status.textContent='Homepage image saved. It is now live for every visitor.';status.className='form-status success';input.value='';
  }catch(error){status.textContent=`Could not save image: ${error.message}`;status.className='form-status error'}finally{button.disabled=false}
}
let installEvent=null;
function setupInstallPrompt(){
  if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('/sw.js').catch(console.error);
  const prompt=document.querySelector('#installPrompt');
  const install=document.querySelector('#installApp');
  const dismiss=document.querySelector('#dismissInstall');
  if(!prompt)return;
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installEvent=event;if(!localStorage.getItem('sellItAllInstallDismissed'))prompt.classList.remove('hidden')});
  install?.addEventListener('click',async()=>{if(!installEvent)return;installEvent.prompt();await installEvent.userChoice;installEvent=null;prompt.classList.add('hidden')});
  dismiss?.addEventListener('click',()=>{localStorage.setItem('sellItAllInstallDismissed','true');prompt.classList.add('hidden')});
  window.addEventListener('appinstalled',()=>{prompt.classList.add('hidden');localStorage.removeItem('sellItAllInstallDismissed')});
}
async function start(){setupInstallPrompt();const {data:{user}}=await db.auth.getUser();currentUser=user;if(location.pathname.endsWith('admin.html')){if(!user){location.replace('admin-login.html');return}const {data,error}=await db.rpc('is_admin');if(error||!data){await db.auth.signOut();location.replace('admin-login.html');return}document.querySelector('#adminIdentity').textContent=user.email||'Admin';}const a=document.querySelector('#accountGuest'),m=document.querySelector('#accountMember');if(a&&m&&user){a.classList.add('hidden');m.classList.remove('hidden');document.querySelector('#memberTitle').textContent=`Welcome, ${user.user_metadata.full_name||user.email}`;}await loadListings();await loadVtuRequests();await loadHero();document.querySelector('#saveHero')?.addEventListener('click',saveHeroImage);buildEdit()}start();






