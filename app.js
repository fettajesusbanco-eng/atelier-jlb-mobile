/* Atelier JLB Mobile — v1.1.0, simulation et brouillons locaux, sans accès distant en écriture. */
'use strict';
const STORAGE_KEY = 'atelier-jlb-mobile-data-v1'; // Clé conservée : garde les 130 vidéos et les réglages déjà enregistrés.
const UNDO_KEY = 'atelier-jlb-mobile-undo-import-v1';
const GITHUB_MOBILE = 'https://github.com/fettajesusbanco-eng/atelier-jlb-mobile';
const GITHUB_GESTIONNAIRE = 'https://github.com/fettajesusbanco-eng/gestionnaire-playlists-youtube';
const defaultState = () => ({
  atelierJlbMobile: true, version:1, videos:[], importedAt:null,
  links:{github:'https://github.com/',atelier:'',nettoyage:'',youtube:'https://studio.youtube.com/',suno:'https://suno.com/',extras:[]},
  settings:{large:false,contrast:false,light:false,hand:'right'}
});
let state = load();
let activePage = ['home','playlists','descriptions','tools','data','settings'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home';
let activeFilter = 'tous';
let searchText = '';
let importMode = 'catalogue';
let toastTimer;
const main = document.getElementById('main');
const inputFile = document.getElementById('importInput');
const $ = (id)=>document.getElementById(id);
function load(){try{const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return defaultState();return validateState(JSON.parse(raw));}catch{return defaultState();}}
function validateState(s){const d=defaultState();if(!s||typeof s!=='object')return d;
  const links={...d.links,...(s.links&&typeof s.links==='object'?s.links:{})};
  if(!Array.isArray(links.extras))links.extras=[];
  return {...d,videos:Array.isArray(s.videos)?s.videos.map(normalizeVideo).filter(v=>v.title).slice(0,10000):[],importedAt:s.importedAt||null,links,settings:{...d.settings,...s.settings}};
}
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));return true;}catch(e){toast('Stockage local indisponible ou saturé. Exporte une sauvegarde.');return false;}}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function value(v){return typeof v==='string'?v:Array.isArray(v)?v.join(' | '):v==null?'':String(v);}
function findProp(obj,...keys){if(!obj||typeof obj!=='object')return '';
  const entries=Object.entries(obj);for(const key of keys){const wanted=key.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
    const found=entries.find(([k])=>k.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')===wanted);
    if(found&&found[1]!=null&&found[1]!=='')return value(found[1]);}
  return '';
}
function normalizeCategory(s){const c=String(s||'').toLowerCase();if(/original|composition/.test(c))return 'originale';if(/intelligence|dialogue|\bia\b|\bai\b/.test(c))return 'ia';if(/litt[eé]raire|literatur|po[eè]me|texte/.test(c))return 'litteraire';return 'autre';}
function normalizeVideo(o,index=0){o=o&&typeof o==='object'?o:{title:String(o||'')};const sn=o.snippet&&typeof o.snippet==='object'?o.snippet:{};
  const id=findProp(o,'videoId','video_id','idVideo','youtubeId')||sn.resourceId?.videoId|| (typeof o.id==='string'?o.id:'');
  const title=findProp(o,'title','titre','videoTitle','nom','name','video')||sn.title||'';
  const current=findProp(o,'currentPlaylist','playlistActuelle','playlist','playlists','listeActuelle','playlistTitle');
  const target=findProp(o,'targetPlaylist','playlistCible','nouvellePlaylist','destination')||current;
  const category=normalizeCategory(findProp(o,'category','categorie','type','origine','famille'));
  return {uid:`v-${index}-${String(id||title).replace(/[^a-zA-Z0-9]/g,'').slice(0,16)}`,videoId:String(id||''),title:String(title).trim(),currentPlaylist:String(current),targetPlaylist:category==='originale'?String(current):String(target),category,
    description:findProp(o,'description','descriptionActuelle','texte','description_originale')||sn.description||'',
    updatedDescription:findProp(o,'updatedDescription','nouvelleDescription','descriptionNouvelle')||findProp(o,'description','descriptionActuelle','texte','description_originale')||sn.description||''};
}
function categoryLabel(c){return {originale:'Composition originale',litteraire:'Texte littéraire',ia:'Dialogue avec IA',autre:'Non classée'}[c]||'Non classée';}
function validUrl(raw){try{const u=new URL(String(raw||'').trim());return ['http:','https:'].includes(u.protocol)?u.href:'';}catch{return '';}}
function nav(page){activePage=page;location.hash=page;render();window.scrollTo({top:0,behavior:'instant'});}
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3800);}
function applySettings(){document.documentElement.classList.toggle('large-font',!!state.settings.large);document.documentElement.classList.toggle('contrast',!!state.settings.contrast);document.documentElement.classList.toggle('light',!!state.settings.light);document.querySelector('.tabbar').style.direction=state.settings.hand==='left'?'rtl':'ltr';}
function btnLink(title,url,mode='external'){const ok=validUrl(url);return ok?`<a class="button" href="${esc(ok)}" target="_blank" rel="noopener noreferrer">${esc(title)} ↗</a>`:`<button class="button" data-action="settings">Configurer ${esc(title)}</button>`;}
function layoutIntro(tag,title,description){return `<section class="hero"><div class="eyebrow">${esc(tag)}</div><h1>${esc(title)}</h1><p>${esc(description)}</p></section>`;}
function renderHome(){const count=state.videos.length;const planned=state.videos.filter(v=>v.category!=='originale' && v.currentPlaylist!==v.targetPlaylist).length;
return `${layoutIntro('TABLEAU DE BORD','Tes outils, au même endroit','Une interface mobile pour avancer sur tes projets, sans perdre le contrôle de tes données.')}
<div class="summary"><div class="metric"><strong>${count}</strong><small>vidéos importées</small></div><div class="metric"><strong>${new Set(state.videos.flatMap(v=>[v.currentPlaylist,v.targetPlaylist]).filter(Boolean)).size}</strong><small>noms de playlists du fichier</small></div><div class="metric"><strong>${planned}</strong><small>affectations proposées</small></div></div>
<div class="notice">Ces chiffres proviennent <strong>uniquement des fichiers importés dans cette application</strong>. Aucune connexion automatique à YouTube ou à GitHub n'est active.</div>
<div class="section-head"><h2>Espaces de travail</h2><span>Navigation rapide</span></div><div class="tile-grid">
${tile('☷','Playlists','Répartir et simuler les classements.','playlists')}
${tile('✎','Descriptions','Réviser les descriptions à la 3e personne.','descriptions')}
${tile('⌘','GitHub & liens','Retrouver les outils et dépôts.','tools')}
${tile('⇩','Données','Importer, sauvegarder, exporter.','data')}
${tile('🎙','Voix','Commandes vocales de navigation.','voice')}
${tile('⚙','Confort','Taille, contraste et disposition.','settings')}
</div>
<div class="section-head"><h2>Mes accès</h2></div><div class="button-row">${btnLink('Atelier YouTube',state.links.atelier)}${btnLink('GitHub',state.links.github)}${btnLink('YouTube Studio',state.links.youtube)}</div>
<div class="footer">Version 1.1 · stockage conservé sur cet appareil · aucune publication automatique sur YouTube.</div>`;}
function tile(icon,title,subtitle,page){return `<button class="tile" data-action="go" data-page="${page}"><span class="em" aria-hidden="true">${icon}</span><strong>${esc(title)}</strong><small>${esc(subtitle)}</small></button>`;}
function renderPlaylists(){const videos=state.videos;const pending=videos.filter(v=>v.category!=='originale' && v.currentPlaylist!==v.targetPlaylist);
return `${layoutIntro('ORGANISATION','Playlists & simulations','Classement préparatoire local. Les compositions originales sont protégées des changements de playlist.')}
<div class="panel"><h2>Préparer la répartition</h2><p>Les affectations affichées sont des <strong>propositions</strong> : les playlists actuelles n’ont pas toutes été vérifiées sur YouTube. Le classement est conservé uniquement sur ce téléphone.</p><div class="button-row"><button class="button primary" data-action="import" data-mode="catalogue">Importer un catalogue</button><button class="button" data-action="simulate">Voir la simulation (${pending.length})</button></div></div>
${filterBar('playlists')}
<div id="results">${renderVideoItems(videos,'playlists')}</div>`;}
function filterBar(mode){return `<label class="field"><span>Rechercher une chanson</span><input id="searchInput" data-mode="${mode}" type="search" placeholder="Titre, playlist, identifiant…" value="${esc(searchText)}" autocomplete="off"></label><div class="chips" role="group" aria-label="Filtrer par catégorie">${[['tous','Toutes'],['litteraire','Littéraires'],['ia','Dialogues IA'],['originale','Originales'],['autre','Autres']].map(([k,v])=>`<button class="chip ${activeFilter===k?'active':''}" data-action="filter" data-category="${k}">${v}</button>`).join('')}</div>`;}
function filteredVideos(videos){return videos.filter(v=>(activeFilter==='tous'||v.category===activeFilter)&&[v.title,v.videoId,v.currentPlaylist,v.targetPlaylist,v.updatedDescription].join(' ').toLocaleLowerCase('fr').includes(searchText.toLocaleLowerCase('fr')));}
function renderVideoItems(videos,mode){const arr=filteredVideos(videos);if(!videos.length)return `<div class="empty">Aucune vidéo importée.<p>Commence par importer ton fichier CSV ou JSON dans l'onglet Données.</p></div>`;
if(!arr.length)return '<div class="empty">Aucun résultat pour ce filtre.</div>';
return `<p class="mini">${arr.length} résultat(s) sur ${videos.length}</p>${arr.slice(0,500).map(v=>mode==='playlists'?videoPlaylistCard(v):videoDescriptionCard(v)).join('')}${arr.length>500?'<p class="mini">Seuls les 500 premiers éléments sont affichés. Affine la recherche.</p>':''}`;}
function videoPlaylistCard(v){const protectedVideo=v.category==='originale';const changed=v.currentPlaylist!==v.targetPlaylist;
return `<article class="item"><div class="item-header"><strong>${esc(v.title)}</strong><span class="pill ${protectedVideo?'alert':changed?'safe':''}">${protectedVideo?'Protégée':changed?'À simuler':'Inchangée'}</span></div>
<div class="sub">${esc(categoryLabel(v.category))}${v.videoId?' · '+esc(v.videoId):''}</div>
<label class="field"><span>Famille</span><select data-edit="category" data-uid="${esc(v.uid)}">${[['autre','Non classée'],['litteraire','Texte littéraire'],['ia','Dialogue avec IA'],['originale','Composition originale']].map(([key,label])=>`<option value="${key}" ${v.category===key?'selected':''}>${label}</option>`).join('')}</select></label>
<div class="mini">Playlist actuelle : <strong>${esc(v.currentPlaylist||'Non renseignée')}</strong></div>
<label class="field"><span>Playlist cible ${protectedVideo?'(verrouillée)':''}</span><input data-edit="targetPlaylist" data-uid="${esc(v.uid)}" value="${esc(v.targetPlaylist)}" ${protectedVideo?'disabled':''} placeholder="Nom de la playlist cible" autocomplete="off"></label>
</article>`;}
function renderDescriptions(){const count=state.videos.filter(v=>v.description!==v.updatedDescription).length;
return `${layoutIntro('ÉDITORIAL','Descriptions des chansons','Rédiger des descriptions parlant de l’auteur à la troisième personne, et non à la première personne.')}
<div class="notice">${count} description(s) préparée(s). Les textes restent à relire. Aucune réécriture par IA ni publication sur YouTube n'est activée.</div>
<div class="button-row"><button class="button primary" data-action="import" data-mode="merge">Fusionner des descriptions</button><button class="button" data-action="export-descriptions">CSV ancien atelier (${count})</button></div>
<p class="mini">La fusion par identifiant YouTube conserve toutes les chansons et les playlists. Le CSV exporté n'inclut aucun commentaire.</p>
${filterBar('descriptions')}<div id="results">${renderVideoItems(state.videos,'descriptions')}</div>`;}
function hasFirstPerson(t){return /\b(je|j['’]|mon|ma|mes|moi|nous|notre|nos|yo|mi|mis|nosotros|nuestro|i |my |we |our )/i.test(String(t||''));}
function videoDescriptionCard(v){const n=hasFirstPerson(v.updatedDescription);return `<article class="item"><div class="item-header"><strong>${esc(v.title)}</strong><span class="pill ${n?'alert':'safe'}">${n?'1re pers. à vérifier':'À relire'}</span></div><div class="sub">${esc(categoryLabel(v.category))}</div>
<label class="field"><span>Description préparée</span><textarea data-edit="updatedDescription" data-uid="${esc(v.uid)}" rows="5" placeholder="Cette chanson explore… L’auteur y évoque…">${esc(v.updatedDescription)}</textarea></label>
<div class="mini">${v.updatedDescription!==v.description?'Texte modifié localement · ':'Aucune modification · '}<span>${v.updatedDescription.length} caractères</span></div></article>`;}
function renderTools(){const l=state.links;
return `${layoutIntro('BOÎTE À OUTILS','GitHub et projets','Tous tes projets accessibles depuis un seul écran, même s’ils sont hébergés sur des services différents.')}
<div class="panel"><h2>Projets GitHub retrouvés</h2><div class="button-row">${btnLink('Atelier JLB Mobile',GITHUB_MOBILE)}${btnLink('Ancien gestionnaire de playlists',GITHUB_GESTIONNAIRE)}</div><p class="mini">Ces boutons ouvrent les dépôts GitHub (le code source), pas une connexion automatique aux comptes.</p></div>
<div class="panel"><h2>Accès rapides à mes outils</h2><div class="button-row">${btnLink('GitHub',l.github)}${btnLink('Atelier playlists',l.atelier)}${btnLink('Nettoyage YouTube',l.nettoyage)}${btnLink('YouTube Studio',l.youtube)}${btnLink('Suno',l.suno)}</div></div>
<div class="panel"><h2>Mes autres outils</h2>${l.extras.length?l.extras.map((x,i)=>`<div class="link-row item"><div><strong>${esc(x.name)}</strong><div class="sub">${esc(x.url)}</div></div><div class="button-row">${btnLink('Ouvrir',x.url)}<button class="small-button" data-action="remove-link" data-index="${i}" aria-label="Supprimer le raccourci ${esc(x.name)}">✕</button></div></div>`).join(''):'<p>Aucun raccourci personnalisé enregistré.</p>'}
<label class="field"><span>Nom du raccourci</span><input id="newLinkName" placeholder="Par exemple : bibliothèque musicale"></label>
<label class="field"><span>Adresse HTTPS</span><input id="newLinkUrl" type="url" placeholder="https://…"></label>
<button class="button primary wide" data-action="add-link">Ajouter un outil</button></div>
<div class="panel"><h2>Configurer les liens principaux</h2><p>Pour lancer directement l'ancien atelier, renseigne ici les URL <strong>publiées</strong> de ses pages. Leur code source a été retrouvé dans ton autre dépôt GitHub.</p>
${[['github','Page GitHub'],['atelier','Atelier YouTube actuel'],['nettoyage','Outil de nettoyage'],['youtube','YouTube Studio'],['suno','Suno']].map(([key,label])=>`<label class="field"><span>${label}</span><input type="url" data-link="${key}" value="${esc(l[key])}" placeholder="https://…"></label>`).join('')}
<button class="button primary wide" data-action="save-links">Enregistrer les adresses</button></div>`;}
function renderData(){const changed=state.videos.filter(v=>v.description!==v.updatedDescription).length;
return `${layoutIntro('FICHIERS','Importer & sauvegarder','Sauvegardes en JSON et tableaux CSV, sans stockage de mot de passe ou de jeton d’accès.')}
<div class="panel"><h2>Catalogue et sauvegardes</h2><p>${state.videos.length} chansons en mémoire. ${changed} description(s) modifiée(s). ${state.importedAt?'Dernier import : '+esc(new Date(state.importedAt).toLocaleString('fr-FR')):'Aucun import effectué.'}</p>
<div class="button-row"><button class="button primary" data-action="import" data-mode="merge">Fusionner descriptions</button><button class="button" data-action="import" data-mode="catalogue">Remplacer catalogue complet</button><button class="button" data-action="import" data-mode="restore">Restaurer sauvegarde JSON</button></div><p class="mini">La fusion conserve les 130 vidéos et les playlists. Elle ne remplace que les descriptions trouvées par identifiant vidéo. L'importation complète remplace les données locales après confirmation.</p><button class="button wide" data-action="undo-import">Annuler la dernière importation (si disponible)</button></div>
<div class="panel"><h2>Exporter mon travail</h2><div class="button-row"><button class="button primary" data-action="backup">Sauvegarde complète JSON</button><button class="button" data-action="exportcsv">Catalogue CSV</button><button class="button" data-action="export-descriptions">CSV descriptions pour l'ancien atelier</button><button class="button" data-action="export-playlists">CSV affectations proposées</button></div><div class="notice">Les exports sont seulement des <strong>fichiers de préparation</strong>. Pour l'ancien atelier, choisir « Modifier les descriptions uniquement » et contrôler son aperçu avant tout envoi. Ne pas choisir « Descriptions + commentaires ».</div></div>
<div class="panel"><h2>Protection des données</h2><p>Les fichiers importés et tes brouillons restent dans le stockage local du navigateur. Ils ne sont pas synchronisés automatiquement avec un autre appareil.</p><button class="button danger wide" data-action="clear">Effacer toutes les données locales</button></div>`;}
function renderSettings(){return `${layoutIntro('ACCESSIBILITÉ','Réglages','Une interface adaptable aux yeux, à la main et à la manière de travailler.')}
<div class="panel"><h2>Confort d’utilisation</h2>
<label class="check-label"><input type="checkbox" data-setting="large" ${state.settings.large?'checked':''}> Texte agrandi et zones tactiles plus grandes</label>
<label class="check-label"><input type="checkbox" data-setting="contrast" ${state.settings.contrast?'checked':''}> Contraste renforcé</label>
<label class="check-label"><input type="checkbox" data-setting="light" ${state.settings.light?'checked':''}> Mode clair</label>
<label class="field"><span>Main principale</span><select data-setting="hand"><option value="right" ${state.settings.hand==='right'?'selected':''}>Droite</option><option value="left" ${state.settings.hand==='left'?'selected':''}>Gauche (ordre de navigation inversé)</option></select></label></div>
<div class="panel"><h2>Commandes vocales</h2><p>Depuis le bouton 🎙️, dis : « accueil », « playlists », « descriptions », « GitHub », « outils », « sauvegarde » ou « réglages ».</p><button class="button primary wide" data-action="voice">Essayer la commande vocale</button><div class="notice">La reconnaissance dépend du navigateur et peut nécessiter Internet et une autorisation microphone. Aucune commande vocale ne publie ni ne supprime de vidéo.</div></div>
<div class="panel"><h2>Installer l’application</h2><p>Après mise en ligne en HTTPS sur GitHub Pages, ouvre son URL dans Chrome sur Android, puis utilise le menu ⋮ → « Installer l'application » ou « Ajouter à l'écran d'accueil ».</p><button id="installButton" class="button wide" data-action="install">Installer si disponible</button></div>`;}
function render(){applySettings();const pages={home:renderHome,playlists:renderPlaylists,descriptions:renderDescriptions,tools:renderTools,data:renderData,settings:renderSettings};main.innerHTML=(pages[activePage]||renderHome)();document.querySelectorAll('[data-page]').forEach(b=>{if(b.closest('.tabbar')){b.classList.toggle('active',b.dataset.page===activePage);b.setAttribute('aria-current',b.dataset.page===activePage?'page':'false');}});}
function parseCsv(text){text=String(text||'').replace(/^\uFEFF/,'');const headerLine=text.split(/\r?\n/,1)[0];const semi=(headerLine.match(/;/g)||[]).length, tabs=(headerLine.match(/\t/g)||[]).length, commas=(headerLine.match(/,/g)||[]).length;const sep=tabs>semi&&tabs>commas?'\t':semi>commas?';':',';
const rows=[];let cell='',row=[],inQuotes=false;
for(let i=0;i<text.length;i++){const c=text[i];if(inQuotes){if(c==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(c==='"'){inQuotes=false;}else cell+=c;}else if(c==='"'){inQuotes=true;}else if(c===sep){row.push(cell);cell='';}else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);cell='';if(row.some(x=>x.trim()))rows.push(row);row=[];}else cell+=c;}
row.push(cell);if(row.some(x=>x.trim()))rows.push(row);if(rows.length<2)throw Error('CSV vide ou sans lignes');const head=rows[0].map(v=>v.trim());return rows.slice(1).map(cells=>Object.fromEntries(head.map((h,i)=>[h,cells[i]||''])));}
function parseImportedText(text,fileName){if(fileName.toLowerCase().endsWith('.csv')||!text.trim().startsWith('{')&&!text.trim().startsWith('['))return {kind:'catalogue',data:parseCsv(text)};
const j=JSON.parse(text);if(j?.atelierJlbMobile&&Array.isArray(j.videos))return {kind:'backup',data:validateState(j)};
if(Array.isArray(j))return {kind:'catalogue',data:j};
for(const ar of [j.videos,j.items,j.entries,j.catalogue,j.data?.videos,j.data?.items,j.descriptions])if(Array.isArray(ar))return {kind:'catalogue',data:ar};
if(j.descriptions&&typeof j.descriptions==='object'){return {kind:'catalogue',data:Object.entries(j.descriptions).map(([title,description])=>({title,description:typeof description==='string'?description:description?.description||''}))};}
throw Error('Structure JSON non reconnue : exporter plutôt un CSV avec la colonne titre/title.');}

// Descriptions partielles : fusion uniquement par identifiant YouTube, jamais par titre.
function changesFromFile(rows){
  const byId=new Map(state.videos.filter(v=>v.videoId).map(v=>[v.videoId,v]));
  const seen=new Set(),changes=[];let missing=0,skipped=0,unmatched=0,duplicate=0;
  for(const row of rows){
    if(!row||typeof row!=='object'){skipped++;continue;}
    const id=String(findProp(row,'videoId','video_id','Video ID','idVideo','youtubeId','id')||'').trim();
    const next=String(findProp(row,'descriptionNouvelle','updatedDescription','nouvelleDescription','nouvelle description','Description YouTube','description')||'').trim();
    if(!id){missing++;continue;}
    if(seen.has(id)){duplicate++;continue;}
    seen.add(id);
    const existing=byId.get(id);
    if(!existing){unmatched++;continue;}
    if(!next||next===existing.updatedDescription){skipped++;continue;}
    changes.push({id,title:existing.title,uid:existing.uid,next});
  }
  if(duplicate)throw Error(`${duplicate} identifiant(s) YouTube dupliqué(s) dans le fichier. Aucune fusion : corrige le fichier.`);
  return {changes,missing,skipped,unmatched};
}
function saveUndo(){try{localStorage.setItem(UNDO_KEY,JSON.stringify(state));return true;}catch(e){alert('Impossible de préserver une copie locale avant import. Exporte une sauvegarde JSON et libère de l’espace.');return false;}}
function undoImport(){try{
  const raw=localStorage.getItem(UNDO_KEY);if(!raw){toast('Aucune importation récente à annuler.');return;}
  if(!confirm('Restaurer les données locales d’avant la dernière importation ? Tes corrections récentes seront remplacées.'))return;
  state=validateState(JSON.parse(raw));if(!save())return;localStorage.removeItem(UNDO_KEY);render();toast('Ancien catalogue local restauré.');
}catch(e){alert('Impossible de restaurer la dernière importation : '+(e?.message||e));}}
function mergeDescriptions(rows,filename){
  if(!state.videos.length)throw Error('Importe d’abord ton catalogue complet avant de fusionner des descriptions.');
  const {changes,missing,skipped,unmatched}=changesFromFile(rows);
  const preview=changes.slice(0,6).map(c=>'• '+c.title+' ('+c.id+')').join('\n');
  if(!changes.length){alert('Aucune nouvelle description reconnue.\nSans ID : '+missing+' · IDs absents du catalogue : '+unmatched+' · Vides/identiques : '+skipped);return;}
  const message='FUSION LOCALE : '+filename+'\n\n'+changes.length+' description(s) seront mises à jour.\n'
    +'Conservées : '+state.videos.length+' chansons, playlists, catégories et descriptions des autres vidéos.\n'
    +'IDs absents : '+unmatched+' · Sans ID : '+missing+' · Vides/identiques : '+skipped+'\n\n'
    +'Exemples :\n'+preview+'\n\nRien ne sera publié sur YouTube. Continuer ?';
  if(!confirm(message))return;
  if(!saveUndo())return;
  const byUid=new Map(state.videos.map(v=>[v.uid,v]));
  for(const c of changes)byUid.get(c.uid).updatedDescription=c.next;
  if(!save())return;
  searchText='';activeFilter='tous';nav('descriptions');toast(changes.length+' description(s) fusionnée(s) localement.');
}

function importFile(file){if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const parsed=parseImportedText(String(reader.result||''),file.name);
if(importMode==='restore'&&parsed.kind!=='backup')throw Error('Pour une restauration, sélectionne une sauvegarde JSON générée par Atelier JLB Mobile.');
if(importMode==='merge'){if(parsed.kind==='backup')throw Error('Choisis un CSV de descriptions ou une sauvegarde de descriptions, pas une sauvegarde générale.');mergeDescriptions(parsed.data,file.name);return;}
if(parsed.kind==='backup'){
 if(!confirm(`Restaurer la sauvegarde et remplacer les ${state.videos.length} vidéo(s) actuellement en mémoire ?`))return;
 if(!saveUndo())return;
 state=parsed.data;save();toast('Sauvegarde restaurée.');render();return;}
 const data=parsed.data.map((v,i)=>normalizeVideo(v,i)).filter(v=>v.title);
 if(!data.length)throw Error('Aucune ligne avec un titre (title/titre) détectée.');
 if(!confirm(`Importer ${data.length} chanson(s) depuis ${file.name} ? Cela remplacera le catalogue local. Fais une sauvegarde si nécessaire.`))return;
 if(!saveUndo())return;
 state.videos=data;state.importedAt=new Date().toISOString();searchText='';activeFilter='tous';save();toast(`${data.length} chansons importées localement.`);nav('playlists');
}catch(e){alert('Import non effectué : '+(e?.message||String(e)));}};reader.onerror=()=>alert('Lecture du fichier impossible.');reader.readAsText(file,'utf-8');}
function csvCell(x){return `"${String(x??'').replace(/"/g,'""')}"`;}
function saveFile(name,content,mime){const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),12000);}
function backup(){saveFile('atelier_jlb_mobile_sauvegarde_'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(state,null,2),'application/json;charset=utf-8');toast('Sauvegarde JSON créée.');}
function exportCsv(){if(!state.videos.length){toast('Aucune vidéo à exporter.');return;}const heads=['videoId','titre','categorie','playlistActuelle','playlistCible','descriptionActuelle','descriptionNouvelle'];const rows=state.videos.map(v=>[v.videoId,v.title,categoryLabel(v.category),v.currentPlaylist,v.targetPlaylist,v.description,v.updatedDescription].map(csvCell).join(';'));
saveFile('atelier_jlb_brouillons_'+new Date().toISOString().slice(0,10)+'.csv','\uFEFF'+heads.join(';')+'\r\n'+rows.join('\r\n'),'text/csv;charset=utf-8');toast('CSV préparé (aucune publication).');}

function exportDescriptionsForAtelier(){
 const changed=state.videos.filter(v=>v.videoId&&v.updatedDescription.trim()&&v.updatedDescription!==v.description);
 if(!changed.length){toast('Aucun brouillon de description modifié à exporter.');return;}
 const headers=['Video ID','Titre de la chanson','Description YouTube'];
 const rows=changed.map(v=>[v.videoId,v.title,v.updatedDescription].map(csvCell).join(';'));
 saveFile('JLB_DESCRIPTIONS_POUR_ANCIEN_ATELIER_'+new Date().toISOString().slice(0,10)+'.csv',
  '\uFEFF'+headers.join(';')+'\r\n'+rows.join('\r\n'),'text/csv;charset=utf-8');
 toast(changed.length+' descriptions exportées. Aucune publication.');
}
function exportPlaylistsForAtelier(){
 const change=state.videos.filter(v=>v.category!=='originale'&&v.videoId&&v.targetPlaylist&&v.currentPlaylist!==v.targetPlaylist);
 if(!change.length){toast('Aucune affectation proposée à exporter.');return;}
 const headers=['Video ID','Titre de la chanson','Playlist de création correspondante'];
 const rows=change.map(v=>[v.videoId,v.title,v.targetPlaylist].map(csvCell).join(';'));
 saveFile('JLB_AFFECTATIONS_A_VERIFIER_'+new Date().toISOString().slice(0,10)+'.csv',
  '\uFEFF'+headers.join(';')+'\r\n'+rows.join('\r\n'),'text/csv;charset=utf-8');
 toast(change.length+' affectations préparées. Aucun changement YouTube.');
}

function simulate(){const change=state.videos.filter(v=>v.category!=='originale'&&v.currentPlaylist!==v.targetPlaylist);
if(!change.length){alert('Aucun changement de playlist préparé.');return;}
const text=change.slice(0,80).map(v=>`${v.title}\n  ${v.currentPlaylist||'Playlist actuelle non connue'}  →  ${v.targetPlaylist||'Destination à vérifier'}`).join('\n\n');alert(`SIMULATION LOCALE UNIQUEMENT\n\n${change.length} affectation(s) proposée(s), non vérifiée(s) avec les playlists de YouTube.\n0 modification effectuée sur YouTube.\n\n${text}${change.length>80?'\n\n… Liste tronquée. Exporte le CSV complet.':''}`);}
function setItem(uid,key,val){const video=state.videos.find(v=>v.uid===uid);if(!video)return;
if(key==='category'){video.category=val;if(val==='originale')video.targetPlaylist=video.currentPlaylist;}
else if(key==='targetPlaylist'){if(video.category==='originale'){toast('Composition originale protégée.');return;}video.targetPlaylist=val;}
else if(key==='updatedDescription'){video.updatedDescription=val;}
save();}
function openExternal(url){const ok=validUrl(url);if(!ok){toast('Lien non configuré.');return;}window.open(ok,'_blank','noopener,noreferrer');}
let deferredPrompt=null;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;});
async function install(){if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;}else{alert('Installation via le navigateur : ouvre le site publié en HTTPS, puis menu ⋮ → « Installer l’application » ou « Ajouter à l’écran d’accueil ».');}}
function voice(){const Rec=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Rec){alert('La reconnaissance vocale n’est pas disponible dans ce navigateur. Sur Android, essaie Chrome.');return;}
const rec=new Rec();rec.lang='fr-FR';rec.interimResults=false;rec.maxAlternatives=1;toast('Écoute… parle maintenant.');rec.onresult=e=>{const heard=e.results[0][0].transcript.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'');toast('Entendu : '+heard);if(/github|git hub/.test(heard)){openExternal(state.links.github);return;}if(/studio youtube/.test(heard)){openExternal(state.links.youtube);return;}const choices=[[/playlist|liste de lecture/,'playlists'],[/description|texte/,'descriptions'],[/sauvegarde|donnee|fichier|export/,'data'],[/reglage|parametre|confort/,'settings'],[/outil|projet|lien/,'tools'],[/accueil|menu|maison/,'home']];const found=choices.find(([rx])=>rx.test(heard));if(found)nav(found[1]);else toast('Commande inconnue. Dis « playlists » ou « accueil ».');};rec.onerror=e=>toast('Voix indisponible : '+e.error);try{rec.start();}catch{toast('Impossible de démarrer le microphone.');}}
document.querySelector('.tabbar').addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b)nav(b.dataset.page);});
$('settingsButton').addEventListener('click',()=>nav('settings'));
$('voiceButton').addEventListener('click',voice);
window.addEventListener('hashchange',()=>{const page=location.hash.slice(1);if(['home','playlists','descriptions','tools','data','settings'].includes(page)&&page!==activePage){activePage=page;render();}});
main.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const act=b.dataset.action;
if(act==='go'){if(b.dataset.page==='voice')voice();else nav(b.dataset.page);}
if(act==='settings')nav('tools');
if(act==='voice')voice();
if(act==='filter'){activeFilter=b.dataset.category;render();}
if(act==='import'){importMode=b.dataset.mode||'catalogue';inputFile.value='';inputFile.click();}
if(act==='simulate')simulate();
if(act==='backup')backup();
if(act==='exportcsv')exportCsv();
if(act==='export-descriptions')exportDescriptionsForAtelier();
if(act==='export-playlists')exportPlaylistsForAtelier();
if(act==='undo-import')undoImport();
if(act==='install')install();
if(act==='clear'){if(confirm('Effacer toutes les données locales, les brouillons, les liens et les réglages de cette application ? Cette opération ne touche pas YouTube.')){state=defaultState();save();render();toast('Données locales effacées.');}}
if(act==='save-links'){document.querySelectorAll('[data-link]').forEach(input=>{const s=input.value.trim();state.links[input.dataset.link]=s?(validUrl(s)||state.links[input.dataset.link]):'';});save();toast('Liens enregistrés.');render();}
if(act==='add-link'){const name=$('newLinkName')?.value.trim(),url=validUrl($('newLinkUrl')?.value);if(!name||!url){toast('Saisis un nom et une adresse http(s) valide.');return;}state.links.extras.push({name,url});save();render();toast('Raccourci ajouté.');}
if(act==='remove-link'){if(confirm('Supprimer ce raccourci local ?')){state.links.extras.splice(Number(b.dataset.index),1);save();render();}}
});
main.addEventListener('input',e=>{const el=e.target;
if(el.id==='searchInput'){searchText=el.value;const region=$('results');if(region)region.innerHTML=renderVideoItems(state.videos,activePage==='descriptions'?'descriptions':'playlists');return;}
if(el.dataset.edit==='updatedDescription'){setItem(el.dataset.uid,'updatedDescription',el.value);const wrap=el.closest('.item');const note=wrap?.querySelector('.mini');if(note)note.textContent=`Brouillon conservé localement · ${el.value.length} caractères`;}
});
main.addEventListener('change',e=>{const el=e.target;
if(el.dataset.setting){state.settings[el.dataset.setting]=el.type==='checkbox'?el.checked:el.value;save();render();return;}
if(el.dataset.edit){setItem(el.dataset.uid,el.dataset.edit,el.value);render();}
});
inputFile.addEventListener('change',e=>importFile(e.target.files?.[0]));
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
render();
