/* Atelier JLB Mobile — extension Notes vocales v1.4.0. Compatible v1.3.1. */
'use strict';
(function () {
  const NOTE_SERVICES = {general:'Général',youtube:'YouTube',gumroad:'Gumroad',suno:'Suno / création',montage:'Montage vidéo'};
  const NOTE_STATUSES = {a_faire:'À faire',en_cours:'En cours',fait:'Terminé'};
  let noteEditId = '';
  let noteFilter = 'actives';
  const legacyValidateState = validateState;
  const legacyRender = render;
  const legacyHome = renderHome;
  const legacySettings = renderSettings;

  function cleanNotes(list) {
    if (!Array.isArray(list)) return [];
    return list.filter(n => n && typeof n === 'object' && n.text).slice(0,3000).map((n,i)=>({
      id:String(n.id||'ancienne-'+i).slice(0,90),
      title:String(n.title||'').slice(0,160),
      text:String(n.text||'').slice(0,8000),
      platform:NOTE_SERVICES[n.platform]?n.platform:'general',
      status:NOTE_STATUSES[n.status]?n.status:'a_faire',
      createdAt:String(n.createdAt||new Date().toISOString()).slice(0,36),
      updatedAt:String(n.updatedAt||n.createdAt||new Date().toISOString()).slice(0,36)
    }));
  }
  validateState = function(s) {
    const validated=legacyValidateState(s);
    validated.notes=cleanNotes(s?.notes);
    return validated;
  };
  try {
    const stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    state.notes=cleanNotes(stored?.notes);
  } catch {state.notes=[];}
  function ensureNotes() {if(!Array.isArray(state.notes))state.notes=[];}
  function ndate(iso){const d=new Date(iso);return Number.isFinite(d.getTime())?d.toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'}):'';}
  function guessService(message) {
    const m=String(message||'').toLowerCase();
    return /gumroad|boutique|prix|fiche produit/.test(m)?'gumroad':/youtube|playlist|description|sous.titr|vid[eé]o publi/.test(m)?'youtube':/suno|r[eé]enregistrer|musique|chanson/.test(m)?'suno':/montage|capcut|clip/.test(m)?'montage':'general';
  }
  function guessTitle(message) {
    const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    const text=normalize(message);
    const matches=state.videos.filter(v=>v.title&&normalize(v.title).length>=5&&text.includes(normalize(v.title))).sort((a,b)=>b.title.length-a.title.length);
    return matches[0]?.title||'';
  }
  function saveNote(content,title='',platform='',status='a_faire') {
    ensureNotes();
    const body=String(content||'').trim().slice(0,8000);
    if(!body){toast('Dis ou écris le contenu de ta note.');return false;}
    if(state.notes.length>=3000){toast('Limite de notes atteinte. Exporte une sauvegarde.');return false;}
    const now=new Date().toISOString();
    const id='note-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
    state.notes.unshift({id,title:String(title||guessTitle(body)).slice(0,160),text:body,platform:NOTE_SERVICES[platform]?platform:guessService(body),status:NOTE_STATUSES[status]?status:'a_faire',createdAt:now,updatedAt:now});
    return save();
  }
  function takeNoteCommand(spoken) {
    const text=String(spoken||'').trim().replace(/^jlb\s*[,\-:]?\s*/i,'');
    const m=text.match(/^(?:(?:ajoute|ajouter|cr[eé]e|cr[eé]er|prends|prendre|enregistre|enregistrer|[eé]cris|[eé]crire|dicte|dicter|mets|mettre)\s+(?:moi\s+)?(?:une?\s+)?note|(?:nouvelle\s+)?note|note\s+que|n'oublie pas(?:\s+de)?)\s*(?::|,|-|\bque\b)?\s*(.+)$/iu);
    return m?m[1].trim():'';
  }
  function renderNotes() {
    ensureNotes();
    const notes=state.notes, open=notes.filter(n=>n.status!=='fait').length,done=notes.length-open;
    const editing=notes.find(n=>n.id===noteEditId)||null;
    const visible=[...notes].filter(n=>noteFilter==='toutes'||(noteFilter==='actives'&&n.status!=='fait')||(noteFilter==='fait'&&n.status==='fait')).sort((a,b)=>String(b.updatedAt||b.createdAt).localeCompare(String(a.updatedAt||a.createdAt)));
    let html=layoutIntro('PENSE-BÊTE MUSICAL','Mes notes & idées','Pour tes chansons, clips, descriptions YouTube, fiches Gumroad et idées au fil de la journée.');
    html+=`<div class="summary"><div class="metric"><strong>${notes.length}</strong><small>notes</small></div><div class="metric"><strong>${open}</strong><small>à suivre</small></div><div class="metric"><strong>${done}</strong><small>terminées</small></div></div>`;
    html+=`<section class="panel note-editor"><h2>${editing?'Modifier ma note':'Nouvelle note'}</h2><form id="noteForm">
      <label class="field"><span>Chanson ou projet (facultatif)</span><input id="noteTitle" maxlength="160" list="noteSongList" autocomplete="off" placeholder="Ex. : Pablo de Tarso" value="${esc(editing?.title||'')}"></label>
      <datalist id="noteSongList">${state.videos.slice(0,2000).map(v=>`<option value="${esc(v.title)}"></option>`).join('')}</datalist>
      <label class="field"><span>Ce que je dois faire ou retenir</span><textarea id="noteContent" rows="5" maxlength="8000" required placeholder="Ex. : Corriger la transition entre les trois parties, puis remplacer la vidéo sur YouTube.">${esc(editing?.text||'')}</textarea></label>
      <div class="note-fields"><label class="field"><span>Service concerné</span><select id="notePlatform">${Object.entries(NOTE_SERVICES).map(([key,name])=>`<option value="${key}" ${(editing?.platform||'general')===key?'selected':''}>${esc(name)}</option>`).join('')}</select></label>
      <label class="field"><span>Avancement</span><select id="noteStatus">${Object.entries(NOTE_STATUSES).map(([key,name])=>`<option value="${key}" ${(editing?.status||'a_faire')===key?'selected':''}>${esc(name)}</option>`).join('')}</select></label></div>
      <div class="button-row"><button class="button primary" type="submit">${editing?'Enregistrer les modifications':'＋ Enregistrer ma note'}</button><button class="button" type="button" data-note-act="dictate">🎙️ ${editing?'Ajouter une dictée':'Dicter et enregistrer'}</button></div>
      ${editing?'<button class="button wide" type="button" data-note-act="cancel">Annuler la modification</button>':''}
      </form><p class="mini">Avec le micro : parle normalement. Une nouvelle dictée est enregistrée dès sa reconnaissance. Tu peux aussi utiliser le micro principal : « Note : refaire le clip de Pablo de Tarso ».</p></section>`;
    html+=`<section class="panel"><div class="section-head"><h2>Mon pense-bête</h2><span>${visible.length} affichée(s)</span></div><div class="chips">
      <button class="chip ${noteFilter==='actives'?'active':''}" data-note-act="filter" data-note-filter="actives">À suivre (${open})</button>
      <button class="chip ${noteFilter==='toutes'?'active':''}" data-note-act="filter" data-note-filter="toutes">Toutes (${notes.length})</button>
      <button class="chip ${noteFilter==='fait'?'active':''}" data-note-act="filter" data-note-filter="fait">Terminées (${done})</button></div>`;
    if(!visible.length)html+=`<div class="empty">${notes.length?'Aucune note dans cette catégorie.':'Aucune note pour l’instant. Ton pense-bête est prêt !'}</div>`;
    else html+=visible.map(n=>`<article class="item note-item"><div class="item-header"><strong>${esc(n.title||'Note libre')}</strong><span class="pill ${n.status==='fait'?'safe':''}">${esc(NOTE_STATUSES[n.status]||'À faire')}</span></div><div class="sub">${esc(NOTE_SERVICES[n.platform]||'Général')} · ${esc(ndate(n.createdAt))}</div><div class="note-text">${esc(n.text)}</div><div class="button-row"><button class="button" data-note-act="edit" data-note-id="${esc(n.id)}">Modifier</button><button class="button" data-note-act="toggle" data-note-id="${esc(n.id)}">${n.status==='fait'?'↺ Réouvrir':'✓ Terminer'}</button><button class="button danger" data-note-act="delete" data-note-id="${esc(n.id)}">Supprimer</button></div></article>`).join('');
    html+=`</section><section class="panel"><h2>Garder mes idées</h2><p>Les notes sont conservées localement sur cet appareil et dans la sauvegarde complète JSON. Pour les retrouver sur un autre appareil, exporte puis restaure cette sauvegarde.</p><div class="button-row"><button class="button primary" data-action="backup">Sauvegarde JSON</button><button class="button" data-note-act="export">Exporter les notes CSV</button></div></section>`;
    return html;
  }
  renderSettings=function(){return legacySettings()+`<div class="panel"><h2>📝 Notes par commande vocale</h2><p>Exemples : « Ouvre mes notes », « Note : refaire la vidéo de Pablo de Tarso », « Ajoute une note : vérifier le produit sur Gumroad ».</p><button class="button primary wide" data-action="go" data-page="notes">Ouvrir mon pense-bête</button></div>`;};
  renderHome=function(){
    const base=legacyHome();
    const open=(state.notes||[]).filter(n=>n.status!=='fait').length;
    const block=`<div class="panel note-home"><h2>📝 Mon pense-bête</h2><p>${open} note(s) à suivre. Une idée pour une chanson, une vidéo YouTube ou Gumroad ? Enregistre-la maintenant, même à la voix.</p><button class="button primary wide" data-action="go" data-page="notes">📝 Ouvrir mes notes</button></div>`;
    return base.replace('<div class="section-head"><h2>Accès directs</h2>',block+'<div class="section-head"><h2>Accès directs</h2>');
  };
  render=function(){
    ensureNotes();
    if(activePage!=='notes'){legacyRender();return;}
    applySettings();
    main.innerHTML=renderNotes();
    document.querySelectorAll('.tabbar [data-page]').forEach(b=>{b.classList.toggle('active',b.dataset.page==='notes');b.setAttribute('aria-current',b.dataset.page==='notes'?'page':'false');});
  };
  window.addEventListener('hashchange',()=>{if(location.hash.slice(1)==='notes'&&activePage!=='notes'){activePage='notes';render();}else if(location.hash.slice(1)==='notes'){render();}});
  if(location.hash==='#notes'){activePage='notes';}
  render();

  function submitForm(){
    const title=document.getElementById('noteTitle')?.value.trim()||'';
    const content=document.getElementById('noteContent')?.value.trim()||'';
    const platform=document.getElementById('notePlatform')?.value||'general';
    const status=document.getElementById('noteStatus')?.value||'a_faire';
    if(!content){toast('Écris ou dicte le contenu de ta note.');return;}
    const editing=state.notes.find(n=>n.id===noteEditId);
    if(editing){editing.title=title.slice(0,160);editing.text=content.slice(0,8000);editing.platform=NOTE_SERVICES[platform]?platform:'general';editing.status=NOTE_STATUSES[status]?status:'a_faire';editing.updatedAt=new Date().toISOString();if(!save())return;noteEditId='';render();toast('Note mise à jour.');}
    else if(saveNote(content,title,platform,status)){render();toast('Note enregistrée sur cet appareil.');}
  }
  function startRecognition(onRecognized){
    const Rec=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!Rec){alert('La reconnaissance vocale n’est pas disponible dans ce navigateur. Sur Android, essaie Chrome en HTTPS, puis autorise le microphone. La saisie au clavier reste disponible.');return;}
    const recognition=new Rec();recognition.lang='fr-FR';recognition.interimResults=false;recognition.continuous=false;recognition.maxAlternatives=1;
    recognition.onresult=e=>{const text=Array.from(e.results).map(r=>r[0]?.transcript||'').join(' ').trim();if(text)onRecognized(text);else toast('Aucune phrase reconnue.');};
    recognition.onerror=e=>toast('Dictée non enregistrée : '+e.error);
    try{recognition.start();toast('🎙️ Écoute… parle maintenant.');}catch{toast('Impossible de démarrer le microphone.');}
  }
  function dictateDirectly(){
    startRecognition(spoken=>{
      const note=takeNoteCommand(spoken)||spoken;
      if(noteEditId){const area=document.getElementById('noteContent');if(area){area.value=(area.value.trim()+' '+note).trim();area.focus();toast('Dictée ajoutée : appuie sur « Enregistrer les modifications ».');}return;}
      const title=document.getElementById('noteTitle')?.value.trim()||guessTitle(note);
      const manualPlatform=document.getElementById('notePlatform')?.value||'general';
      const platform=manualPlatform==='general'?guessService(note):manualPlatform;
      const status=document.getElementById('noteStatus')?.value||'a_faire';
      if(saveNote(note,title,platform,status)){noteFilter='actives';render();toast('🎙️ Note dictée et enregistrée !');}
    });
  }
  function voiceGeneral(){
    startRecognition(spoken=>{
      const heard=spoken.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
      const text=takeNoteCommand(spoken);
      if(text){
        if(saveNote(text)){noteFilter='actives';nav('notes');toast('🎙️ Note enregistrée : '+text.slice(0,75));}
        return;
      }
      if(/^(?:ouvre|affiche|montre|va\s+(?:sur|dans)|consulte)?\s*(?:mon|le|les|mes)?\s*(?:bloc.?notes?|pense.?bete|carnet|notes?)\s*$/i.test(heard)||/ouvrir? (?:mes |les )?notes|mes notes|mon pense.?bete|bloc.?notes|carnet de notes/.test(heard)) {nav('notes');return;}
      if(/github|git hub/.test(heard)){openExternal(state.links.github);return;}
      if(/studio youtube/.test(heard)){openExternal(state.links.youtube);return;}
      const choices=[[/playlist|liste de lecture/,'playlists'],[/description|texte/,'descriptions'],[/sauvegarde|donnee|fichier|export/,'data'],[/reglage|parametre|confort/,'settings'],[/gumroad|boutique|mettre en vente|vente de chanson/,'gumroad'],[/outil|projet|lien/,'tools'],[/accueil|menu|maison/,'home']];
      const found=choices.find(([rx])=>rx.test(heard));
      if(found){nav(found[1]);return;}
      toast('Commande inconnue. Essaie « note : … » ou « ouvre mes notes ».');
    });
  }
  function exportNotes(){
    if(!state.notes.length){toast('Aucune note à exporter.');return;}
    const heads=['Date','Chanson ou projet','Service','Statut','Note'];
    const lines=state.notes.map(n=>[n.createdAt,n.title,NOTE_SERVICES[n.platform]||'Général',NOTE_STATUSES[n.status]||'À faire',n.text].map(csvCell).join(';'));
    saveFile('atelier_jlb_notes_'+new Date().toISOString().slice(0,10)+'.csv','\uFEFF'+heads.join(';')+'\r\n'+lines.join('\r\n'),'text/csv;charset=utf-8');toast('Notes exportées en CSV.');
  }
  document.addEventListener('submit',e=>{if(e.target.id==='noteForm'){e.preventDefault();submitForm();}},true);
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-note-act]');
    if(!b)return;
    const action=b.dataset.noteAct;
    if(action==='dictate'){dictateDirectly();return;}
    if(action==='export'){exportNotes();return;}
    if(action==='filter'){noteFilter=b.dataset.noteFilter||'actives';render();return;}
    if(action==='cancel'){noteEditId='';render();return;}
    const n=state.notes.find(x=>x.id===b.dataset.noteId);
    if(!n)return;
    if(action==='edit'){noteEditId=n.id;render();requestAnimationFrame(()=>{document.querySelector('.note-editor')?.scrollIntoView({behavior:'smooth'});document.getElementById('noteContent')?.focus({preventScroll:true});});return;}
    if(action==='toggle'){n.status=n.status==='fait'?'a_faire':'fait';n.updatedAt=new Date().toISOString();if(save())render();return;}
    if(action==='delete'&&confirm('Supprimer cette note du pense-bête ?')){state.notes=state.notes.filter(x=>x.id!==n.id);if(noteEditId===n.id)noteEditId='';if(save()){render();toast('Note supprimée.');}}
  },true);
  // Intercepter le micro existant AVANT ses gestionnaires historiques pour pouvoir dicter une note.
  document.addEventListener('click',e=>{
    if(e.target.closest('#voiceButton')||e.target.closest('[data-action="voice"]')){
      e.preventDefault();e.stopImmediatePropagation();voiceGeneral();
    }
  },true);
})();
