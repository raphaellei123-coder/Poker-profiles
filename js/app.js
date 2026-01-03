// Players CRUD with optional Firebase Firestore sync (public editable)
(function(){
  const STORAGE_KEY = 'pokerPlayers_v1';
  let useFirestore = false;
  let db = null;

  // Utility to load a script and return a promise
  function loadScript(src){
    return new Promise((resolve, reject)=>{
      const s = document.createElement('script'); s.src = src; s.onload = ()=>resolve(); s.onerror = ()=>reject(new Error('Failed to load '+src)); document.head.appendChild(s);
    });
  }

  // Try to initialize Firebase if a config file defines window.FIREBASE_CONFIG
  async function tryInitFirebase(){
    if(typeof window === 'undefined') return;
    if(!window.FIREBASE_CONFIG) return;
    try{
      // Load compat SDKs for ease of migration
      await loadScript('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js');
      firebase.initializeApp(window.FIREBASE_CONFIG);
      db = firebase.firestore();
      useFirestore = true;
      console.info('Firestore enabled: public shared editing is active');
    }catch(e){
      console.warn('Firebase not available', e);
    }
  }

  function generateId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
  function qs(sel, root=document){return root.querySelector(sel)}

  // LocalStorage fallbacks
  function getPlayersLocal(){
    try{const raw = localStorage.getItem(STORAGE_KEY); return raw?JSON.parse(raw):[];}catch(e){return []}
  }
  function savePlayersLocal(list){localStorage.setItem(STORAGE_KEY, JSON.stringify(list))}

  // Firestore helpers
  async function listPlayersFirestore(){
    const snap = await db.collection('players').orderBy('name').get();
    return snap.docs.map(d=>({id:d.id, ...d.data()}));
  }
  async function addPlayerFirestore(player){
    // use provided id if present, otherwise let Firestore generate one
    const col = db.collection('players');
    if(player.id){
      const ref = col.doc(player.id);
      await ref.set(Object.assign({}, player, {createdAt: firebase.firestore.FieldValue.serverTimestamp()}));
      return player.id;
    } else {
      const ref = await col.add(Object.assign({}, player, {createdAt: firebase.firestore.FieldValue.serverTimestamp()}));
      return ref.id;
    }
  }
  async function updatePlayerFirestore(id, data){
    await db.collection('players').doc(id).set(Object.assign({}, data, {updatedAt: firebase.firestore.FieldValue.serverTimestamp()}), {merge:true});
  }
  async function deletePlayerFirestore(id){
    await db.collection('players').doc(id).delete();
  }

  // Public-views friendly API: prefer Firestore if available, else localStorage
  async function getPlayers(){
    if(useFirestore && db){
      try{return await listPlayersFirestore();}catch(e){console.warn('Failed to read from Firestore, falling back to local', e); return getPlayersLocal()}
    }
    return getPlayersLocal();
  }

  async function addPlayer(player){
    // add to local first
    const players = getPlayersLocal();
    if(!player.id) player.id = generateId();
    players.push(player);
    savePlayersLocal(players);
    // then try to add to Firestore (best-effort)
    if(useFirestore && db){
      try{
        // ensure firestore doc id matches our local id
        await addPlayerFirestore(player);
      }catch(e){console.warn('Failed to add to Firestore', e)}
    }
  }

  async function updatePlayer(id, data){
    const players = getPlayersLocal();
    const idx = players.findIndex(p=>p.id===id);
    if(idx>-1){ players[idx] = Object.assign({}, players[idx], data); savePlayersLocal(players) }
    if(useFirestore && db){
      try{ await updatePlayerFirestore(id, data); }catch(e){console.warn('Failed to update Firestore', e)}
    }
  }

  async function deletePlayer(id){
    const players = getPlayersLocal().filter(p=>p.id!==id); savePlayersLocal(players);
    if(useFirestore && db){
      try{ await deletePlayerFirestore(id); }catch(e){console.warn('Failed to delete from Firestore', e)}
    }
    // Re-render if on players page
    if(onPlayersPage()) renderPlayers();
  }

  function onPlayersPage(){return location.pathname.endsWith('players.html')}
  function onEditPage(){return location.pathname.endsWith('edit.html')}

  // Render players (async aware)
  async function renderPlayers(){
    const container = qs('#players-list');
    container.innerHTML = 'Loading...';
    const players = await getPlayers();
    if(!players.length){container.innerHTML = '<p class="small-muted">No players yet. <a href="edit.html">Add one</a>.</p>'; return}
    const list = document.createElement('div');
    players.forEach(p=>{
      const card = document.createElement('div'); card.className='player-card';
      const meta = document.createElement('div'); meta.className='player-meta';
      meta.innerHTML = `<strong>${escapeHtml(p.name||'Untitled')}</strong><div class="small-muted">${escapeHtml(p.bio||'')}</div>`;
      const actions = document.createElement('div'); actions.className='player-actions';
      const editBtn = document.createElement('button'); editBtn.textContent='Edit'; editBtn.className='btn'; editBtn.onclick=()=>{location.href='edit.html?id='+p.id}
      const del = document.createElement('button'); del.textContent='Delete'; del.className='btn btn-muted'; del.onclick=()=>{if(confirm('Delete this player?')){deletePlayer(p.id)}}
      actions.appendChild(editBtn); actions.appendChild(del);
      card.appendChild(meta); card.appendChild(actions);
      list.appendChild(card);
    })
    container.innerHTML=''; container.appendChild(list);
  }

  // Edit / Add page logic
  function initEditPage(){
    const form = qs('#player-form');
    const title = qs('#form-title');
    const params = new URLSearchParams(location.search);
    const id = params.get('id');

    (async ()=>{
      if(id){
        const players = await getPlayers(); const player = players.find(p=>p.id===id);
        if(player){ qs('#name').value = player.name||''; qs('#age').value = player.age||''; qs('#bio').value = player.bio||''; title.textContent = 'Edit Player' }
      }
    })();

    qs('#cancel').addEventListener('click',()=>{location.href='players.html'})
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const data = {name: qs('#name').value.trim(), age: qs('#age').value?Number(qs('#age').value):'', bio: qs('#bio').value.trim() };
      if(id){ await updatePlayer(id, data); } else { await addPlayer(Object.assign({id:generateId()}, data)); }
      location.href='players.html'
    })
  }

  // Utility to prevent XSS when inserting text
  function escapeHtml(str){if(!str) return ''; return String(str).replace(/[&<>\"']/g, function(s){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":"&#39;"}[s]})}

  document.addEventListener('DOMContentLoaded', async ()=>{
    await tryInitFirebase();
    if(onPlayersPage()){ renderPlayers() }
    if(onEditPage()){ initEditPage() }
  })

})();
