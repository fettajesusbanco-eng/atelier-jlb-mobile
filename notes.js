/* Atelier JLB Mobile — Notes v1.5.0, carnet libre. Compatible v1.3.x. */
'use strict';
(function () {
  const DRAFT_KEY = 'atelier-jlb-notes-brouillon-v1';
  const LABEL_STATUS = {a_faire:'À suivre',en_cours:'En cours',fait:'Terminée'};
  const LABEL_SERVICE = {general:'Général',youtube:'YouTube',gumroad:'Gumroad',suno:'Suno',montage:'Montage vidéo'};
  let noteEditId='';
  let noteFilter='actives';
  let recognition=null;
  let recognitionBase='';
  let recognitionFinal='';
  let micActive=false;
  const previousValidate=validateState;
  const previousRender=render;
  const previousHome=renderHome;
  const previousSettings=renderSettings;

  function sanitizeNotes(list) {
    if(!Array.isArray(list))return [];
    return list.filter(n=>n&&typeof n==='object'&&String(n.text||'').trim()).slice(0,3000).map((n,i)=>({
      id:String(n.id||'ancienne-'+i).slice(0,90),
      title:String(n.title||'').slice(0,160),
      text:String(n.text||'').slice(0,8000),
      platform:LABEL_SERVICE[n.platform]?n.platform:'general',
      status:LABEL_STATUS[n.status]?n.status:'a_faire',
      createdAt:String(n.createdAt||new Date().toISOString()).slice(0,36),
      updatedAt:String(n.updatedAt||n.createdAt||new Date().toISOString()).slice(0,36)
    }));
  }
  validateState=function(raw){const value=previousValidate(raw);value.notes=sanitizeNotes(raw?.notes);return value;};
  try{state.notes=sanitizeNotes(JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')?.notes);}catch{state.notes=[];}
  function ensure(){if(!Array.isArray(state.notes))state.notes=[];}
  function readDraft(){try{return localStorage.getItem(DRAFT_KEY)||'';}catch{return '';}}
  function writeDraft(value){try{localStorage.setItem(DRAFT_KEY,String(value||'').slice(0,12000));}catch{}}
  function clearDraft(){try{localStorage.removeItem(DRAFT_KEY);}catch{}}
  function displayDate(s){const d=new Date(s);return Number.isFinite(d.valueOf())?d.toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'}):'';}
  function addNote(text){
    ensure();const body=String(text||'').trim().slice(0,8000);
    if(!body){toast('Écris ou dicte quelque chose dans le carnet.');return false;}
    if(state.notes.length>=3000){toast('Maximum de 3 000 notes atteint. Sauvegarde tes notes.');return false;}
    const now=new Date().toISOString();
    state.notes.unshift({id:'n-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),title:'',text:body,platform:'general',status:'a_faire',createdAt:now,updatedAt:now});
    if(!save()){state.notes.shift();return false;}
    return true;
  }
  function titlePreview(n){
    if(n.title)return n.title;
    return String(n.text||'').split(/\r?\n/)[0].trim().slice(0,84)||'Note libre';
  }
  function noteTextForEdit(){
    if(!noteEditId)return readDraft();
    return (state.notes.find(n=>n.id===noteEditId)?.text)||'';
  }
  function renderNotes(){
    ensure();
    const notes=state.notes;
    const remaining=notes.filter(n=>n.status!=='fait').length;
    const filtered=notes.filter(n=>noteFilter==='toutes'||(noteFilter==='actives'&&n.status!=='fait')||(noteFilter==='fait'&&n.status==='fait'))
      .slice().sort((a,b)=>String(b.updatedAt||b.createdAt).localeCompare(String(a.updatedAt||a.createdAt)));
    const editing=noteEditId&&notes.find(n=>n.id===noteEditId);
    let out=layoutIntro('CARNET MUSICAL','Mon pense-bête','Note tout ce qui te passe par la tête, librement. Aucune chanson ni catégorie à sélectionner.');
    out+=`<section class="panel jlb-notebook note-editor"><div class="jlb-note-heading"><h2>${editing?'Modifier cette note':'Une idée ? Note-la ici.'}</h2><span class="jlb-note-count">${remaining} à suivre</span></div>
      <form id="noteForm"><label for="noteContent" class="sr-only">Mon carnet de notes libre</label>
      <textarea id="noteContent" rows="9" maxlength="8000" placeholder="Ex. : Penser à refaire telle vidéo…\nVérifier les prix sur Gumroad…\nCorriger les sous-titres YouTube…">${esc(noteTextForEdit())}</textarea>
      <div class="jlb-mic-status" id="noteMicStatus" role="status" aria-live="polite">${editing?'Tu modifies une note enregistrée.':'Ton brouillon est conservé automatiquement sur cet appareil.'}</div>
      <div class="jlb-note-actions"><button type="button" class="button note-mic" data-note-action="mic" aria-label="Dicter une note" aria-pressed="false">🎙️ Dicter</button>
      <button type="submit" class="button primary note-save">${editing?'Enregistrer les modifications':'✓ Enregistrer la note'}</button></div>
      <button type="button" class="jlb-keyboard-help" data-note-action="keyboard">🎤 Le micro ne marche pas ? Utiliser celui du clavier du téléphone</button>
      ${editing?'<button type="button" class="button wide note-cancel" data-note-action="cancel">Annuler la modification</button>':''}
      </form></section>`;
    out+=`<section class="panel jlb-saved-notes"><div class="jlb-note-heading"><h2>Mes notes enregistrées</h2><span class="jlb-note-count">${notes.length} note(s)</span></div>
      <div class="chips jlb-note-filters"><button type="button" class="chip ${noteFilter==='actives'?'active':''}" data-note-action="filter" data-filter="actives">À suivre (${remaining})</button>
      <button type="button" class="chip ${noteFilter==='toutes'?'active':''}" data-note-action="filter" data-filter="toutes">Toutes (${notes.length})</button>
      <button type="button" class="chip ${noteFilter==='fait'?'active':''}" data-note-action="filter" data-filter="fait">Terminées (${notes.length-remaining})</button></div>`;
    if(!filtered.length)out+=`<div class="empty">${notes.length?'Aucune note dans cette catégorie.':'Ton carnet est vide. Écris ou dicte ta première idée dans le grand cadre ci-dessus.'}</div>`;
    else out+=filtered.map(n=>`<article class="item jlb-note-item"><div class="item-header"><strong>${esc(titlePreview(n))}</strong><span class="pill ${n.status==='fait'?'safe':''}">${esc(LABEL_STATUS[n.status]||'À suivre')}</span></div>
      <div class="sub">${esc(displayDate(n.createdAt))}${n.title?' · '+esc(n.title):''}</div><div class="note-text">${esc(n.text)}</div>
      <div class="jlb-note-item-actions"><button type="button" class="small-button" data-note-action="edit" data-id="${esc(n.id)}">✎ Modifier</button>
      <button type="button" class="small-button" data-note-action="toggle" data-id="${esc(n.id)}">${n.status==='fait'?'↺ Réouvrir':'✓ Fait'}</button>
      <button type="button" class="small-button" data-note-action="delete" data-id="${esc(n.id)}">✕</button></div></article>`).join('');
    out+=`</section><section class="panel jlb-note-backup"><h2>Sauvegarder mon carnet</h2><p class="mini">Les notes sont sur cet appareil, sans synchronisation automatique. La sauvegarde complète JSON contient les notes enregistrées et le reste de l’atelier.</p>
      <div class="button-row"><button type="button" class="button" data-action="backup">Sauvegarde JSON</button><button type="button" class="button" data-note-action="export">Exporter les notes CSV</button></div></section>`;
    return out;
  }
  renderHome=function(){
    const base=previousHome();const remaining=(state.notes||[]).filter(n=>n.status!=='fait').length;
    const block=`<section class="panel note-home"><h2>📝 Mon pense-bête</h2><p>${remaining} note(s) à suivre. Une idée ? Écris ou dicte-la directement dans ton carnet.</p><button class="button primary wide" data-action="go" data-page="notes">Ouvrir mon carnet</button></section>`;
    return base.replace('<div class="section-head"><h2>Accès directs</h2>',block+'<div class="section-head"><h2>Accès directs</h2>');
  };
  renderSettings=function(){return previousSettings()+`<section class="panel"><h2>📝 Mon carnet libre</h2><p>Dis au micro général « Note : vérifier une vidéo », ou ouvre l’onglet Notes pour dicter avec le micro du carnet. Si le navigateur ne reconnaît pas la parole, utilise le micro du clavier Samsung ou Gboard.</p><button class="button primary wide" data-action="go" data-page="notes">Ouvrir mon carnet</button></section>`;};
  render=function(){ensure();if(activePage!=='notes'){previousRender();return;}applySettings();main.innerHTML=renderNotes();document.querySelectorAll('.tabbar [data-page]').forEach(b=>{b.classList.toggle('active',b.dataset.page==='notes');b.setAttribute('aria-current',b.dataset.page==='notes'?'page':'false');});};
  window.addEventListener('hashchange',()=>{if(location.hash.slice(1)==='notes'&&activePage!=='notes'){activePage='notes';render();}});
  if(location.hash==='#notes')activePage='notes';
  render();

  function status(message,warning=false){const el=document.getElementById('noteMicStatus');if(el){el.textContent=message;el.classList.toggle('note-warning',warning);}else toast(message);}
  function focusKeyboard(){if(activePage!=='notes')nav('notes');const el=document.getElementById('noteContent');if(el){el.focus();status('Le clavier va apparaître. Appuie sur son icône 🎙️ pour dicter, puis sur « Enregistrer la note ».');}}
  function storeDraftNow(){const area=document.getElementById('noteContent');if(area&&!noteEditId)writeDraft(area.value);}
  function saveEditor(){
    const area=document.getElementById('noteContent');const value=area?.value.trim()||'';
    if(!value){status('Écris ou dicte une note avant de l’enregistrer.',true);area?.focus();return;}
    if(noteEditId){const old=state.notes.find(n=>n.id===noteEditId);if(!old){noteEditId='';render();return;}const prior=old.text;old.text=value.slice(0,8000);old.updatedAt=new Date().toISOString();if(!save()){old.text=prior;return;}noteEditId='';render();toast('Note modifiée et enregistrée.');return;}
    if(addNote(value)){clearDraft();noteFilter='actives';render();toast('Note enregistrée !');}
  }
  function stopRecognition(){if(!recognition)return;try{recognition.abort();}catch{}recognition=null;micActive=false;const b=document.querySelector('[data-note-action="mic"]');if(b)b.setAttribute('aria-pressed','false');}
  function micErrorMessage(code){
    const messages={
      'not-allowed':'Le microphone est bloqué. Autorise-le dans les paramètres du site, ou utilise le micro du clavier.',
      'service-not-allowed':'Ce navigateur bloque la dictée intégrée. Essaie le micro de ton clavier.',
      'audio-capture':'Aucun microphone accessible. Vérifie l’autorisation micro ou utilise le clavier.',
      'network':'Le service vocal ne répond pas. Essaie le micro du clavier ou vérifie ta connexion.',
      'no-speech':'Je n’ai rien entendu. Réessaie ou utilise la dictée du clavier.',
      'language-not-supported':'La reconnaissance du français est indisponible ici. Utilise le micro du clavier.',
      'aborted':'Dictée arrêtée.'
    };
    return messages[code]||('Dictée indisponible ('+code+'). Utilise le micro du clavier.');
  }
  function recognizeSpeech(onRecognized,isNotebook){
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!Recognition){focusKeyboard();status('Dictée intégrée indisponible ici. Appuie sur le 🎙️ du clavier Samsung ou Gboard.',true);return;}
    if(recognition){stopRecognition();if(isNotebook)status('Dictée arrêtée.');return;}
    const rec=new Recognition();recognition=rec;
    rec.lang='fr-FR';rec.continuous=false;rec.interimResults=true;rec.maxAlternatives=1;
    recognitionBase=isNotebook?(document.getElementById('noteContent')?.value||''):'';
    recognitionFinal='';let error=false;
    rec.onstart=()=>{micActive=true;if(isNotebook){status('🎙️ J’écoute… Dicte ton idée.',false);document.querySelector('[data-note-action="mic"]')?.setAttribute('aria-pressed','true');}else toast('🎙️ J’écoute…');};
    rec.onresult=e=>{
      let heard='';let final='';
      for(let i=0;i<e.results.length;i++){const phrase=e.results[i][0]?.transcript||'';heard+=phrase+' ';if(e.results[i].isFinal)final+=phrase+' ';}
      const partial=heard.trim();recognitionFinal=final.trim();
      if(isNotebook){const area=document.getElementById('noteContent');if(area){area.value=(recognitionBase.trim()+' '+partial).trim();storeDraftNow();status('🎙️ '+(recognitionFinal?'Phrase reconnue. Vérifie le texte, puis enregistre.':'Écoute en cours…'),false);}}
    };
    rec.onerror=e=>{error=true;status(micErrorMessage(e.error),true);};
    rec.onend=()=>{
      if(recognition===rec)recognition=null;
      micActive=false;
      document.querySelector('[data-note-action="mic"]')?.setAttribute('aria-pressed','false');
      if(isNotebook){if(!error)status(recognitionFinal?'Dictée ajoutée au carnet. Appuie sur « Enregistrer la note ».':'Aucune phrase confirmée. Tu peux recommencer ou utiliser le micro du clavier.',!recognitionFinal);}
      else if(!error&&recognitionFinal)onRecognized(recognitionFinal);
      else if(!error){nav('notes');status('Aucune phrase reconnue. Essaie le micro du clavier.',true);}
    };
    try{rec.start();if(isNotebook)status('Activation du micro…');}catch(e){recognition=null;status('Impossible d’activer la dictée. Utilise le micro du clavier.',true);}
  }
  function voiceCommand(text){
    const spoken=String(text||'').trim();
    const lower=spoken.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const command=spoken.match(/^(?:(?:jlb\s*[,.: -]\s*)?(?:ajoute|ajouter|ecris|écris|enregistre|crée|cree|prends|note|dicte|mets)(?:-moi| moi)?(?: une?)?\s+note|note(?:\s+que)?)\s*[:,-]?\s*(.+)$/iu);
    if(command?.[1]?.trim()){if(addNote(command[1])){nav('notes');toast('Note enregistrée par la voix.');}return;}
    if(/(?:ouvre|affiche|montre|va dans|va sur)?\s*(?:mon|mes|le|les)?\s*(?:pense.?bete|bloc.?notes?|carnet|notes?)\b/.test(lower)){nav('notes');return;}
    if(/studio youtube/.test(lower)){openExternal(state.links.youtube);return;}
    if(/github|git hub/.test(lower)){openExternal(state.links.github);return;}
    const choices=[[/playlist|liste de lecture/,'playlists'],[/description|texte/,'descriptions'],[/sauvegarde|donnee|fichier|export/,'data'],[/reglage|parametre|confort/,'settings'],[/gumroad|boutique|vente de chanson/,'gumroad'],[/outil|projet|lien/,'tools'],[/accueil|menu|maison/,'home']];
    const found=choices.find(([rx])=>rx.test(lower));if(found){nav(found[1]);return;}
    nav('notes');status('Phrase entendue, mais commande inconnue. Dicte dans le carnet ou dis « Note : ... ».',true);
  }
  function exportNotes(){ensure();if(!state.notes.length){toast('Aucune note à exporter.');return;}const header=['Date','Projet','Statut','Note'];const rows=state.notes.map(n=>[n.createdAt,n.title,LABEL_STATUS[n.status]||'À suivre',n.text].map(csvCell).join(';'));saveFile('atelier_jlb_mes_notes_'+new Date().toISOString().slice(0,10)+'.csv','\uFEFF'+header.join(';')+'\r\n'+rows.join('\r\n'),'text/csv;charset=utf-8');toast('Notes exportées.');}
  document.addEventListener('input',e=>{if(e.target?.id==='noteContent')storeDraftNow();},true);
  document.addEventListener('submit',e=>{if(e.target?.id==='noteForm'){e.preventDefault();saveEditor();}},true);
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-note-action]');if(!b)return;
    const action=b.dataset.noteAction;
    if(action==='mic'){recognizeSpeech(null,true);return;}
    if(action==='keyboard'){focusKeyboard();return;}
    if(action==='export'){exportNotes();return;}
    if(action==='filter'){noteFilter=b.dataset.filter||'actives';render();return;}
    if(action==='cancel'){noteEditId='';render();return;}
    const note=state.notes.find(n=>n.id===b.dataset.id);if(!note)return;
    if(action==='edit'){stopRecognition();storeDraftNow();noteEditId=note.id;render();document.querySelector('.note-editor')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
    if(action==='toggle'){const before=note.status;note.status=note.status==='fait'?'a_faire':'fait';note.updatedAt=new Date().toISOString();if(!save())note.status=before;render();return;}
    if(action==='delete'&&confirm('Supprimer cette note ?')){const former=state.notes;state.notes=state.notes.filter(n=>n.id!==note.id);if(!save()){state.notes=former;return;}if(noteEditId===note.id)noteEditId='';render();toast('Note supprimée.');}
  },true);
  document.addEventListener('click',e=>{
    if(e.target.closest('#voiceButton')||e.target.closest('[data-action="voice"]')){
      e.preventDefault();e.stopImmediatePropagation();recognizeSpeech(voiceCommand,false);
    }
  },true);
})();
