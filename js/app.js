// Minimal JS for player CRUD using localStorage
(function(){
  const STORAGE_KEY = 'pokerPlayers_v1';

  function getPlayers(){
    try{const raw = localStorage.getItem(STORAGE_KEY); return raw?JSON.parse(raw):[];}catch(e){return []}
  }
  function savePlayers(list){localStorage.setItem(STORAGE_KEY, JSON.stringify(list))}
  function generateId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}

  function qs(sel, root=document){return root.querySelector(sel)}

  function onPlayersPage(){return location.pathname.endsWith('players.html')}
  function onEditPage(){return location.pathname.endsWith('edit.html')}

  // Render players
  function renderPlayers(){
    const container = qs('#players-list');
    const players = getPlayers();
    if(!players.length){container.innerHTML = '<p class="small-muted">No players yet. <a href="edit.html">Add one</a>.</p>'; return}
    const list = document.createElement('div');
    players.forEach(p=>{
      const card = document.createElement('div'); card.className='player-card';
      const meta = document.createElement('div'); meta.className='player-meta';
      meta.innerHTML = `<strong>${escapeHtml(p.name||'Untitled')}</strong><div class="small-muted">${escapeHtml(p.bio||'')}</div>`;
      const actions = document.createElement('div'); actions.className='player-actions';
      const edit = document.createElement('button'); edit.textContent='Edit'; edit.className='btn'; edit.onclick=()=>{location.href='edit.html?id='+p.id}
      const del = document.createElement('button'); del.textContent='Delete'; del.className='btn btn-muted'; del.onclick=()=>{if(confirm('Delete this player?')){deletePlayer(p.id)}}
      actions.appendChild(edit); actions.appendChild(del);
      card.appendChild(meta); card.appendChild(actions);
      list.appendChild(card);
    })
    container.innerHTML=''; container.appendChild(list);
  }

  function deletePlayer(id){
    const players = getPlayers().filter(p=>p.id!==id); savePlayers(players); renderPlayers();
  }

  // Edit / Add page logic
  function initEditPage(){
    const form = qs('#player-form');
    const title = qs('#form-title');
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if(id){
      const players = getPlayers(); const player = players.find(p=>p.id===id);
      if(player){ qs('#name').value = player.name||''; qs('#age').value = player.age||''; qs('#bio').value = player.bio||''; title.textContent = 'Edit Player' }
    }
    qs('#cancel').addEventListener('click',()=>{location.href='players.html'})
    form.addEventListener('submit',e=>{
      e.preventDefault();
      const players = getPlayers();
      const data = {name: qs('#name').value.trim(), age: qs('#age').value?Number(qs('#age').value):'', bio: qs('#bio').value.trim() };
      if(id){
        const idx = players.findIndex(p=>p.id===id); if(idx>-1){ players[idx] = Object.assign({}, players[idx], data); savePlayers(players) }
      } else {
        players.push(Object.assign({id:generateId()}, data)); savePlayers(players);
      }
      location.href='players.html'
    })
  }

  // Utility to prevent XSS when inserting text
  function escapeHtml(str){if(!str) return ''; return String(str).replace(/[&<>"']/g, function(s){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[s]})}

  document.addEventListener('DOMContentLoaded',()=>{
    if(onPlayersPage()){ renderPlayers() }
    if(onEditPage()){ initEditPage() }
  })

})();
