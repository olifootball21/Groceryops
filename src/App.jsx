import { useState, useRef, useEffect, useCallback } from "react";
// ─── CONSTANTS ────────────────────────────────────────────────────
const DEPARTMENTS = ["Vestibule","Épicerie","Fruits & Légumes","PAM","Boulangerie","Viande","
const PRIORITY_LABELS = ["Critique","Élevée","Normale","Faible"];
const PRIORITY_IDS = ["urgent","high","normal","low"];
const getPriorities = (c="#C9A84C") => PRIORITY_IDS.map((id,i)=>({
id, label:PRIORITY_LABELS[i], color:c, bg:`${c}18`, border:`${c}35`
}));
const PRIORITIES = getPriorities();
// STATUS_META is now dynamic — generated via getStatusMeta(themeColor)
const getStatusMeta = (c="#C9A84C") => ({
todo: { label:"À faire", color:c, bg:`${c}18`, border:`${c}40` },
inprogress: { label:"En cours", color:c, bg:`${c}18`, border:`${c}40` },
done: { label:"Complété", color:c, bg:`${c}18`, border:`${c}40` },
});
const STATUS_META = getStatusMeta();
const RECURRENCE = [
{id:"none",label:"Aucune"},{id:"daily",label:"Chaque jour"},
{id:"weekly",label:"Chaque semaine"},{id:"monthly",label:"Chaque mois"},{id:"custom",label:
];
const DAYS_SHORT = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
const COLORS = ["#C9A84C","#3b82f6","#2a9d8f","#e63946","#8b5cf6","#ec4899","#f4a261","#84cc1
const SHIFTS = ["Matin","Midi","Soir"];
// Default tour checklist per dept
const DEFAULT_TOUR_ITEMS = {
base: ["Propreté générale","Allées / comptoir dégagé","Poubelles vidées","Affichage des pri
"Vestibule": ["Entrée propre et dégagée","Paniers disponibles et propres","Affichage
"Épicerie": ["Étalages bien garnis","Dates d'expiration vérifiées","Spéciaux bien i
"Fruits & Légumes": ["Produits frais et bien présentés","Retrait des produits abîmés","Brum
"PAM": ["Comptoir propre","Stock suffisant","Ordonnances bien rangées"],
"Boulangerie": ["Produits frais du jour en place","Vitrine propre","Affichage des prix
"Viande": ["Comptoir réfrigéré à bonne temp.","Produits bien étiquetés et datés",
"Poisson": ["Glace fraîche","Comptoir propre","Produits bien étiquetés"],
"Service": ["File d'attente gérée","Caisses propres","Sacs disponibles"],
"Charcuterie": ["Comptoir propre","Produits bien étiquetés","Stock suffisant en vitrin
};
const INIT_USERS = [
{ id:1, name:"Olivier", role:"Propriétaire", color:"#C9A84C", isOwner:true },
{ id:2, name:"Sophie Gagnon", role:"Dir. Adjointe", color:"#3b82f6" },
{ id:3, name:"Kevin Lavoie", role:"Dir. Opérations", color:"#2a9d8f" },
];
const INIT_TASKS = [
{ id:1, title:"Prix circulaire à vérifier", description:"Confirmer que tous les prix { id:2, title:"Nettoyage réfrigérateurs viande", description:"Nettoyage complet et désinfec
{ id:3, title:"Commander emballages boulangerie", description:"Stock bas — commander du cir
boîtes
];
const INIT_STORE = { name:"Mon IGA", number:"IGA-001", address:"123 rue Principale, Montréal"
const INIT_TOUR_CONFIG = {
baseItems: [...DEFAULT_TOUR_ITEMS.base],
deptItems: Object.fromEntries(DEPARTMENTS.map(d=>[d, DEFAULT_TOUR_ITEMS[d]||[]])),
order: [...DEPARTMENTS],
};
// ─── HELPERS ──────────────────────────────────────────────────────
const ago = ts => {
if(!ts) return "";
const d = Date.now()-ts;
if(d<60000) return "À l'instant";
if(d<3600000) return `Il y a ${Math.floor(d/60000)} min`;
if(d<86400000) return `Il y a ${Math.floor(d/3600000)}h`;
if(d<172800000) return "Hier";
const date = new Date(ts);
return date.toLocaleDateString("fr-CA",{day:"numeric",month:"short",hour:"2-digit",minute:"
};
const initials = name => name.trim().split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(
const todayStr = () => new Date().toISOString().split("T")[0];
const nextDue = (rec, customDays) => { const n=new Date(); if(rec==="daily"){n.setDate(n.getD
// ─── CSS ──────────────────────────────────────────────────────────
const makeCSS = (dark, themeColor="#C9A84C") => `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&fam
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
html,body{height:100%;background:${dark?"#0a0a0d":"#f7f5f0"};}
body{font-family:'DM Sans',sans-serif;color:${dark?"#ede8df":"#1c1c1e"};}
.serif{font-family:'Cormorant Garamond',serif;}
::-webkit-scrollbar{width:3px;height:3px;}
::-webkit-scrollbar-thumb{background:${dark?"rgba(201,168,76,0.2)":"rgba(0,0,0,0.1)"};}
:root{
--gold:${themeColor}; --gold-l:${themeColor}cc; --gold-dim:${themeColor}1a; --gold-b:${them
--bg:${dark?"#0a0a0d":"#f7f5f0"};
--s1:${dark?"#141418":"#ffffff"};
--s2:${dark?"#1c1c22":"#eeebe4"};
--border:${dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.09)"};
--text:${dark?"#ede8df":"#1c1c1e"};
--t2:${dark?"rgba(237,232,223,0.5)":"rgba(28,28,30,0.5)"};
--t3:${dark?"rgba(237,232,223,0.22)":"rgba(28,28,30,0.22)"};
--danger:#e63946; --ok:#2a9d8f; --warn:#f4a261;
}
.card{background:var(--s1);border:1px solid var(--border);border-radius:16px;}
.card-tap{cursor:pointer;transition:transform .15s,opacity .15s;} .card-tap:active{transform:
.btn{display:flex;align-items:center;justify-content:center;gap:7px;border:none;cursor:pointe
.btn:active{transform:scale(0.95);}
.btn-gold{background:linear-gradient(135deg,#C9A84C,#a8853b);color:#0a0a0d;border-radius:14px
.btn-outline{background:transparent;border:1px solid var(--border);color:var(--t2);border-rad
.btn-ghost{background:var(--s2);border:1px solid var(--border);color:var(--t2);border-radius:
.btn-danger{background:rgba(230,57,70,0.09);border:1px solid rgba(230,57,70,0.22);color:#e639
.btn-ok{background:rgba(42,157,143,0.09);border:1px solid rgba(42,157,143,0.22);color:#2a9d8f
.btn-warn{background:rgba(244,162,97,0.09);border:1px solid rgba(244,162,97,0.22);color:#f4a2
.field{width:100%;background:var(--s2);border:1.5px solid var(--border);border-radius:12px;pa
.field:focus{border-color:var(--gold-b);background:var(--gold-dim);}
.field::placeholder{color:var(--t3);}
option{background:${dark?"#141418":"#fff"};}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(5px);z-index:
.sheet{background:var(--s1);border-radius:22px 22px 0 0;display:flex;flex-direction:column;ma
.handle{width:40px;height:4px;border-radius:2px;background:var(--border);margin:12px auto 2px
.slide-up{animation:slideUp .28s cubic-bezier(.4,0,.2,1) both;}
@keyframes slideUp{from{opacity:0;transform:translateY(100%);}to{opacity:1;transform:translat
.fade-in{animation:fadeIn .3s ease both;}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY
.scale-in{animation:scaleIn .2s cubic-bezier(.4,0,.2,1) both;}
@keyframes scaleIn{from{opacity:0;transform:scale(.94);}to{opacity:1;transform:scale(1);}}
.pill{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:11
.tag{font-size:10px;font-weight:700;letter-spacing:1.8px;color:var(--t3);}
.gold-t{color:var(--gold);}
.nav-tab{display:flex;flex-direction:column;align-items:center;gap:3px;background:transparent
.unread-dot{width:7px;height:7px;border-radius:50%;background:var(--gold);flex-shrink:0;box-s
.recur-tag{font-size:9px;font-weight:700;letter-spacing:.5px;color:var(--gold);background:var
.pin-tag{font-size:9px;font-weight:700;letter-spacing:.5px;color:#C9A84C;padding:2px 6px;bord
.check-row{display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border-radius:12px;
.check-row:active{background:var(--gold-dim);}
input[type=date]::-webkit-calendar-picker-indicator,input[type=time]::-webkit-calendar-picker
`;
// ─── APP ──────────────────────────────────────────────────────────
export default function App() {
const [dark, setDark] = useState(true);
const [lang, setLang] = useState("fr");
const [themeColor, setThemeColor] = useState("#C9A84C");
const [gallery, setGallery] = useState([
{ id:1, name:"Montage été", photos:[], createdBy:1, ts:Date.now()-86400000 },
{ id:2, name:"Inspection MAPAQ", photos:[], createdBy:1, ts:Date.now()-172800000 },
]);
const [users, setUsers] = useState(INIT_USERS);
const [tasks, setTasks] = useState(INIT_TASKS);
const [store, setStore] = useState(INIT_STORE);
const [tourConfig, setTourConfig] = useState(INIT_TOUR_CONFIG);
const [tourHistory, setTourHistory] = useState([]);
const [events, setEvents] = useState([
{ id:1, title:"Réunion direction", description:"Bilan de la semaine et objectifs", date:"
{ id:2, title:"Visite représentant Loblaws", description:"Présentation nouvelles promotio
{ id:3, title:"Inventaire mensuel", description:"Inventaire complet tous départements", d
]);
const [announcements, setAnnouncements] = useState([
{ id:1, text:"Réunion lundi 8h — présence obligatoire pour tous les directeurs.", dept:"a
{ id:2, text:"Promotion spéciale cette semaine en épicerie — bien vérifier les affichages
]);
const [showUrgency, setShowUrgency] = useState(false);
const [shiftReports, setShiftReports] = useState([]);
const [showGlobalSearch, setGlobalSearch] = useState(false);
const [globalQuery, setGlobalQuery] = useState("");
const TASK_TEMPLATES = [
{ name:"Ouverture magasin", tasks:[
{title:"Vérifier les caisses", department:"Service", priority:"urgent"},
{title:"Allumer les lumières et systèmes", department:"Général", priority:"urgent"},
{title:"Vérifier températures réfrigérateurs", department:"Viande", priority:"urgent"},
{title:"Mettre les spéciaux en place", department:"Épicerie", priority:"high"},
{title:"Vérifier l'entrée et le stationnement", department:"Vestibule", priority:"norma
]},
{ name:"Fermeture magasin", tasks:[
{title:"Compter les caisses", department:"Service", priority:"urgent"},
{title:"Vérifier les réfrigérateurs fermés", department:"Viande", priority:"urgent"},
{title:"Nettoyer les allées principales", department:"Épicerie", priority:"high"},
{title:"Sortir les poubelles", department:"Général", priority:"normal"},
{title:"Vérifier les portes et alarmes", department:"Général", priority:"urgent"},
]},
{ name:"Inspection complète", tasks:[
{title:"Vérifier les dates d'expiration", department:"Épicerie", priority:"urgent"},
{title:"Inspection boucherie/viande", department:"Viande", priority:"urgent"},
{title:"Inspection poissonnerie", department:"Poisson", priority:"urgent"},
{title:"Vérifier affichages des prix", department:"Épicerie", priority:"high"},
{title:"Inspection propreté générale", department:"Général", priority:"high"},
]},
];
const [schedules, setSchedules] = useState({
"Viande": [{id:1, label:"Semaine du 21 avril", photo:null, ts:Date.now()-86400000}
"Boulangerie": "Épicerie": [],
"Fruits & Légumes":[],
[{id:2, label:"Semaine du 21 avril", photo:null, ts:Date.now()-86400000}
"PAM": [],
"Poisson": [],
"Service": [],
"Charcuterie": [],
});
const [scheduleDepts, setScheduleDepts] = useState(["Viande","Boulangerie","Épicerie","Frui
const [notes, setNotes] = useState({}); // keyed by userId
const [archivedTasks, setArchivedTasks] = useState([]);
const [taskSort, setTaskSort] = useState("date");
const [me, setMe] = useState(INIT_USERS[0]);
const [tab, setTab] = useState("home");
const [taskFilter, setTaskFilter] = useState("all");
const [seenTasks, setSeenTasks] = useState(new Set([1,2,3]));
const [notifs, setNotifs] = useState([
{id:1,text:"Nouvelle tâche assignée",sub:"Prix circulaire à vérifier",type:"task",ts:Date
{id:2,text:"Tâche complétée",sub:"Commander emballages boulangerie",type:"done",ts:Date.n
{id:3,text:"Rappel — tâche non complétée",sub:"Rotation produits laitiers · Échéance dépa
]);
const [modal, setModal] = useState(null);
const [activeTask, setActive] = useState(null);
const [editUser, setEditUser] = useState(null);
const [editTaskData, setEditTaskData] = useState(null);
const [activeTour, setActiveTour] = useState(null);
const [toast, setToast] = useState(null);
const isOwner = me.isOwner;
const unread = notifs.filter(n=>!n.read).length;
const unseenCount = tasks.filter(t=>!seenTasks.has(t.id)).length;
const pushToast = (msg,type="ok") => { setToast({msg,type,k:Date.now()}); setTimeout(()=>se
const pushNotif = (text,sub,type="task") => setNotifs(p=>[{id:Date.now(),text,sub,type,ts:D
const clearAllNotifs = () => setNotifs([]);
const markAllRead = () => setNotifs(p=>p.map(n=>({...n,read:true})));
const openTask = t => { setSeenTasks(p=>new Set([...p,t.id])); setActive(t); setModal("task
const createTask = data => {
const t={...data,id:Date.now(),createdBy:me.id,status:"todo",comments:[],createdAt:Date.n
setTasks(p=>[t,...p]);
pushNotif(`Nouvelle tâche par ${me.name}`,data.title,"task");
pushToast("Tâche créée !"); setModal(null);
};
const editTask = data => {
setTasks(p=>p.map(t=>t.id===data.id?{...data}:t));
pushToast("Tâche modifiée !"); setModal(null); setActive(null);
};
const updateStatus = (taskId,status,note,photo) => {
const now=Date.now();
const update = t=>({...t,status,completedAt:status==="done"?now:null,
...(status==="done"&&note?{comments:[...t.comments,{id:now,userId:me.id,text:"✓ "+note,
...(status==="done"&&photo?{photo}:{}),
});
setTasks(p=>p.map(t=>{
if(t.id!==taskId) return t;
const updated=update(t);
if(status==="done"&&t.recurrence&&t.recurrence!=="none"){
const next={...t,id:now+1,status:"todo",comments:[],createdAt:now,completedAt:null,du
setTimeout(()=>{setTasks(p2=>[...p2,next]);pushNotif("Tâche récurrente créée",t.title
}
return updated;
}));
if(status==="done"){const t=tasks.find(x=>x.id===taskId);pushNotif("Tâche complétée",t?.t
setActive(p=>p?.id===taskId?update(p):p);
};
const togglePin = taskId => {
setTasks(p=>p.map(t=>t.id===taskId?{...t,pinned:!t.pinned}:t));
setActive(p=>p?.id===taskId?{...p,pinned:!p.pinned}:p);
pushToast("Épinglée !");
};
const addComment = (taskId,text) => {
if(!text.trim()) return;
const c={id:Date.now(),userId:me.id,text,ts:Date.now()};
setTasks(p=>p.map(t=>t.id===taskId?{...t,comments:[...t.comments,c]}:t));
setActive(p=>p?{...p,comments:[...p.comments,c]}:p);
const mentioned=users.filter(u=>text.toLowerCase().includes("@"+u.name.toLowerCase().spli
mentioned.forEach(u=>{if(u.id!==me.id)pushNotif(`${me.name} vous a mentionné`,text.slice(
};
const createGalleryFolder = name => {
if(!name.trim()) return;
setGallery(p=>[{id:Date.now(),name:name.trim(),photos:[],createdBy:me.id,ts:Date.now()},.
pushToast(T(lang,"folderCreated"));
};
const deleteGalleryFolder = id => {
setGallery(p=>p.filter(f=>f.id!==id));
pushToast(T(lang,"deleted"),"warn");
};
const addPhotoToFolder = (folderId, photo, caption) => {
setGallery(p=>p.map(f=>f.id===folderId?{...f,photos:[{id:Date.now(),photo,caption,addedBy
pushToast(T(lang,"photoAdded"));
};
const deletePhotoFromFolder = (folderId, photoId) => {
setGallery(p=>p.map(f=>f.id===folderId?{...f,photos:f.photos.filter(p=>p.id!==photoId)}:f
pushToast(T(lang,"deleted"),"warn");
};
const renameGalleryFolder = (id, name) => {
setGallery(p=>p.map(f=>f.id===id?{...f,name}:f));
pushToast(T(lang,"saved"));
};
// Auto-collect all photos from tasks into a virtual "all" list
const allAppPhotos = [
...tasks.filter(t=>t.photo).map(t=>({photo:t.photo,caption:t.title,source:"Tâche",ts:t.cr
...archivedTasks.filter(t=>t.photo).map(t=>({photo:t.photo,caption:t.title,source:"Archiv
...tourHistory.filter(t=>t.issues?.some(i=>i.photo)).flatMap(t=>t.issues.filter(i=>i.phot
...Object.values(schedules).flat().filter(s=>s.photo).map(s=>({photo:s.photo,caption:s.la
];
const addScheduleDept = name => {
if(!name.trim()||scheduleDepts.includes(name.trim())) return;
setScheduleDepts(p=>[...p, name.trim()]);
setSchedules(p=>({...p, [name.trim()]:[]}));
pushToast(`Département "${name.trim()}" ajouté !`);
};
const removeScheduleDept = name => {
setScheduleDepts(p=>p.filter(d=>d!==name));
setSchedules(p=>{ const n={...p}; delete n[name]; return n; });
pushToast(`Département supprimé`,"warn");
};
const renameScheduleDept = (oldName, newName) => {
if(!newName.trim()||scheduleDepts.includes(newName.trim())) return;
setScheduleDepts(p=>p.map(d=>d===oldName?newName.trim():d));
setSchedules(p=>{ const n={...p}; n[newName.trim()]=n[oldName]||[]; delete n[oldName]; re
pushToast("Département renommé !");
};
const archiveTask = tid => {
const t = tasks.find(x=>x.id===tid);
if(t){ setArchivedTasks(p=>[{...t, archivedAt:Date.now()},...p]); setTasks(p=>p.filter(x=
};
const addSchedulePhoto = (dept, label, photo) => {
setSchedules(p=>({...p,[dept]:[{id:Date.now(),label,photo,ts:Date.now()}, ...(p[dept]||[]
pushToast("Horaire ajouté !");
};
const deleteSchedulePhoto = (dept, id) => {
setSchedules(p=>({...p,[dept]:(p[dept]||[]).filter(s=>s.id!==id)}));
pushToast("Horaire supprimé","warn");
};
const saveNote = (userId, text) => {
setNotes(p=>({...p,[userId]:text}));
};
const createUser = data=>{setUsers(p=>[...p,{...data,id:Date.now()}]);pushToast(`${data.nam
const updateUser = data=>{setUsers(p=>p.map(u=>u.id===data.id?data:u));if(me.id===data.id)s
const deleteUser = uid=>{setUsers(p=>p.filter(u=>u.id!==uid));pushToast("Supprimé","warn");
const deleteTask = tid=>{setTasks(p=>p.filter(t=>t.id!==tid));pushToast("Supprimée","warn")
const saveTour = tour => {
setTourHistory(p=>[tour,...p]);
pushNotif(`Tournée ${tour.shift} complétée`,`Score: ${tour.score}/${tour.total} — ${tour.
pushToast(`Tournée ${tour.shift} sauvegardée !`);
setActiveTour(null); setModal(null);
};
// Reminder check
useEffect(()=>{
const overdue=tasks.filter(t=>t.status!=="done"&&t.dueDate&&new Date(t.dueDate)<new Date(
overdue.forEach(t=>{
const already=notifs.find(n=>n.type==="reminder"&&n.sub?.includes(t.title));
if(!already) pushNotif("Rappel — tâche non complétée",`${t.title} · Échéance dépassée`,
});
},[tasks]);
const saveShiftReport = report => {
setShiftReports(p=>[{...report, id:Date.now(), createdBy:me.id, ts:Date.now()},...p]);
pushNotif(`Rapport de shift — ${report.shift}`, `${me.name} · Note: ${report.rating}/5`,
pushToast("Rapport sauvegardé !");
setModal(null);
};
const applyTemplate = template => {
template.tasks.forEach((t,i) => {
setTimeout(()=>{
const task = {...t, id:Date.now()+i, createdBy:me.id, assignedTo:users[0]?.id, setTasks(p=>[task,...p]);
}, i*50);
status
});
pushToast(`Template "${template.name}" appliqué !`);
setModal(null);
};
const createEvent = data => { setEvents(p=>[{...data,id:Date.now(),createdBy:me.id},...p]);
const editEvent const deleteEvent = id = data => { setEvents(p=>p.map(e=>e.id===data.id?data:e)); pushToast("Évé
=> { setEvents(p=>p.filter(e=>e.id!==id)); pushToast("Événement su
const createAnnouncement = data => { setAnnouncements(p=>[{...data,id:Date.now(),createdBy:
const deleteAnnouncement = id => { setAnnouncements(p=>p.filter(a=>a.id!==id)); pushToast("
const sendUrgency = msg => { pushNotif(" URGENCE",msg,"urgency"); setAnnouncements(p=>[{i
const getUser = id=>users.find(u=>u.id===id);
const getPri = id=>PRIORITIES.find(p=>p.id===id);
const stats = {
todo:tasks.filter(t=>t.status==="todo").length,
inprogress:tasks.filter(t=>t.status==="inprogress").length,
done:tasks.filter(t=>t.status==="done").length,
urgent:tasks.filter(t=>t.priority==="urgent"&&t.status!=="done").length,
pinned:tasks.filter(t=>t.pinned&&t.status!=="done").length,
};
const [showPDFInfo, setShowPDFInfo] = useState(false);
const exportPDF = () => { setShowPDFInfo(true); };
const css = makeCSS(dark, themeColor);
return (
<div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",flexDirection:"colum
<style>{css}</style>
<div style={{position:"fixed",top:0,left:0,right:0,height:300,background:`radial-gradie
{/* HEADER */}
<div style={{position:"sticky",top:0,zIndex:30,background:dark?"rgba(10,10,13,0.93)":"r
<div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()
{store.logo
? <img src={store.logo} alt="" style={{width:34,height:34,borderRadius:9,objectFi
: <div style={{width:34,height:34,borderRadius:9,background:"var(--gold-dim)",bor
{store.name.slice(0,2).toUpperCase()}
</div>
}
<div>
<div className="serif" style={{fontSize:18,fontWeight:700,color:"var(--gold)",lin
<div style={{fontSize:9,color:"var(--t3)",letterSpacing:"1.5px",marginTop:1}}>{st
</div>
</div>
<div style={{display:"flex",gap:8,alignItems:"center"}}>
<button className="btn" onClick={()=>setShowUrgency(true)}
style={{height:34,padding:"0 12px",borderRadius:10,background:"#e63946",border:"n
SOS
</button>
<div style={{position:"relative"}}>
<button className="btn" onClick={()=>{setModal("notifs");setNotifs(p=>p.map(n=>({
style={{width:34,height:34,borderRadius:10,background:"var(--s2)",border:"1px s
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColo
</button>
{unread>0&&<span style={{position:"absolute",top:-3,right:-3,width:16,height:16,b
</div>
<button className="btn" onClick={()=>setModal("accountMenu")} style={{width:34,heig
{initials(me.name)}
</button>
</div>
</div>
{/* CONTENT */}
<div style={{flex:1,overflowY:"auto",paddingBottom:100,position:"relative",zIndex:1}}>
{tab==="home" && <HomeTab stats={stats} me={me} store={store} tasks={tasks} announce
{tab==="tasks" && <TasksTab tasks={tasks} archivedTasks={archivedTasks} me={me} getUs
{tab==="tour" && <TourTab tourHistory={tourHistory} tourConfig={tourConfig} me={me}
{tab==="team" && <TeamTab users={users} me={me} isOwner={isOwner} onAdd={()=>setModa
{tab==="stats" && <StatsTab tasks={tasks} users={users} tourHistory={tourHistory} shi
{tab==="gallery" && <GalleryTab gallery={gallery} allAppPhotos={allAppPhotos} me={me
{tab==="schedule" && <ScheduleTab schedules={schedules} scheduleDepts={scheduleDepts}
{tab==="notes" && <NotesTab notes={notes} me={me} onSave={saveNote}/>}
{tab==="comm" && <CommTab events={events} announcements={announcements} users={users
</div>
{/* BOTTOM NAV */}
<div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"1
{[
{id:"home", label:"ACCUEIL", icon:<svg width="17" height="17" viewBox="0 0 24 24"
{id:"tasks", label:"TÂCHES", icon:<svg width="17" height="17" viewBox="0 0 24 24"
{id:"tour", label:"TOURNÉE", icon:<svg width="17" height="17" viewBox="0 0 24 24"
{id:"team", label:"ÉQUIPE", icon:<svg width="17" height="17" viewBox="0 0 24
{id:"schedule",label:T(lang,"schedule"), icon:<svg width="16" height="16" viewBox="
{id:"gallery", label:T(lang,"gallery"), icon:<svg width="16" height="16" viewBox="
{id:"notes", label:T(lang,"notes"), icon:<svg width="16" height="16" viewBox="
{id:"comm", label:T(lang,"comm"), icon:<svg width="16" height="16" viewBox="
{id:"stats", label:T(lang,"stats"), icon:<svg width="16" height="16" viewBox="
].map(({id,label,icon,badge})=>(
<button key={id} className="nav-tab" onClick={()=>{setTab(id);if(id!=="tasks")setTa
style={{color:tab===id?"var(--gold)":"var(--t3)",position:"relative",flex:1}}>
<div style={{marginBottom:3}}>{icon}</div>
{badge>0&&<span style={{position:"absolute",top:0,right:"15%",width:15,height:15,
<span style={{borderBottom:tab===id?"1.5px solid var(--gold)":"1.5px solid transp
</button>
))}
</div>
{/* FAB */}
<button className="btn btn-gold" onClick={()=>setModal("newTask")}
style={{position:"fixed",bottom:80,right:"calc(50% - 205px)",width:48,height:48,borde
+
</button>
{/* MODALS */}
{modal==="newTask" && <NewTaskModal users={users} onSave={createTask} onClose={
{modal==="editTask" && editTaskData && <EditTaskModal task={editTaskData} users={us
{modal==="taskDetail" && activeTask && <TaskDetailModal task={activeTask} users={user
{modal==="newUser" && <NewUserModal onSave={createUser} onClose={()=>setModal(n
{modal==="editUser" && editUser && <EditUserModal user={editUser} me={me} isOwner={
{modal==="notifs" && <NotifsModalV2 notifs={notifs} onClose={()=>setModal(null)
{modal==="switchUser" && <SwitchUserModal users={users} me={me} onSwitch={u=>{setMe(u
{showPDFInfo && (
<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"bl
<div className="scale-in" style={{background:"var(--s1)",borderRadius:20,padding:28
<div style={{fontSize:36,textAlign:"center",marginBottom:14}}> </div>
<div className="serif" style={{fontSize:20,fontWeight:700,marginBottom:10,color:"
<div style={{fontSize:14,color:"var(--t2)",lineHeight:1.7,marginBottom:20,textAli
L'export PDF génère un rapport complet avec toutes vos tâches, statistiques et
<br/><br/>
<span style={{color:"var(--gold)",fontWeight:600}}>Cette fonctionnalité sera pl
<br/><br/>
Le rapport inclura : tâches, performance par membre, départements, tournées et
</div>
<button className="btn btn-gold" onClick={()=>setShowPDFInfo(false)} style={{widt
</div>
</div>
)}
{modal==="newEvent" && <EventFormModal title="Nouvel événement" initial={{title:"
{modal==="editEvent" && editTaskData && <EventFormModal title="Modifier l'événemen
{modal==="newAnnouncement"&& <AnnouncementModal me={me} users={users} onSave={createAnn
{modal==="accountMenu" && <AccountMenuModal me={me} users={users} isOwner={isOwner}
onSwitchUser={u=>{setMe(u);setModal(null);pushToast(`Connecté — ${u.name}`);}}
onSettings={()=>setModal("settings")}
onStoreProfile={()=>setModal("storeProfile")}
onExportPDF={()=>{setShowPDFInfo(true);setModal(null);}}
onSearch={()=>{setGlobalSearch(true);setModal(null);}}
onSOS={()=>{setShowUrgency(true);setModal(null);}}
onClose={()=>setModal(null)}
/>}
{modal==="shiftReport" && <ShiftReportModal me={me} onSave={saveShiftReport} onClose={
{modal==="templates" && <TemplatesModal templates={TASK_TEMPLATES} onApply={applyTem
{modal==="settings" && <SettingsModal lang={lang} setLang={setLang} themeColor={the
{modal==="storeProfile" && <StoreProfileModal store={store} onSave={s=>{setStore(s);s
{modal==="tourConfig" && <TourConfigModal config={tourConfig} onSave={c=>{setTourConf
{modal==="doTour" && activeTour && <DoTourModal shift={activeTour.shift} startTim
{/* TOAST */}
{showGlobalSearch&&(
<GlobalSearchModal query={globalQuery} setQuery={setGlobalQuery} tasks={tasks} events
)}
</div>
{showUrgency&&<UrgencyModal onSend={sendUrgency} onClose={()=>setShowUrgency(false)}/>}
{toast&&<div key={toast.k} style={{position:"fixed",bottom:94,left:"50%",transform:"tra
);
}
// ─── STAT BOX ────────────────────────────────────────────────────
function StatBox({label,value,sub,onClick,themeColor}){
const tc = themeColor||"#C9A84C";
return(
<div className="card card-tap" onClick={onClick}
style={{padding:"18px 16px",borderTop:`2.5px solid ${tc}`,position:"relative",overflow:
<div style={{position:"absolute",top:-20,right:-20,width:60,height:60,borderRadius:"50%
<div className="serif" style={{fontSize:36,fontWeight:700,color:tc,lineHeight:1,letterS
<div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginTop:7}}>{label}</div>
<div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>{sub}</div>
<div style={{position:"absolute",bottom:12,right:13,color:"var(--t3)",fontSize:16}}>›</
</div>
);
}
// ─── HOME TAB ─────────────────────────────────────────────────────
function HomeTab({stats,me,store,tasks,announcements,lang,themeColor,getUser,getPri,onNew,onG
const pinned = tasks.filter(t=>t.pinned&&t.status!=="done");
return(
<div style={{padding:"22px 16px 0",display:"flex",flexDirection:"column",gap:20}}>
<div className="fade-in">
<div className="tag" style={{marginBottom:5}}>BONJOUR</div>
<div className="serif" style={{fontSize:32,fontWeight:700,letterSpacing:"-0.5px",colo
<div style={{fontSize:13,color:"var(--t2)",marginTop:5}}>{new Date().toLocaleDateStri
</div>
<div className="fade-in" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
{[
{label:"À faire", value:stats.todo, sub:"en attente", filter:"todo"},
{label:"En cours", value:stats.inprogress, sub:"en progression", filter:"inprogre
{label:"Complétées", value:stats.done, sub:"ce cycle", filter:"done"},
{label:"Épinglées", value:stats.pinned, sub:"prioritaires", filter:"pinned"}
].map(s=>(
<StatBox key={s.label} label={s.label} value={s.value} sub={s.sub} themeColor={them
))}
</div>
{pinned.length>0&&(
<div className="fade-in">
<div className="tag" style={{marginBottom:10}}>ÉPINGLÉES</div>
<div style={{display:"flex",flexDirection:"column",gap:8}}>
{pinned.map(t=><MiniTaskCard key={t.id} task={t} getUser={getUser} getPri={getPri
</div>
</div>
)}
{/* QUICK SHORTCUTS */}
<div className="fade-in" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8
{[
{label:T(lang,"newUrgentTask"), icon:" ", action:onNew, color:"#e63946"},
{label:T(lang,"startTour"), icon:" ", action:()=>onGoTo("tour"), color:"var(--
{label:T(lang,"announce"), icon:" ", action:()=>onGoTo("comm"), color:"#f4a26
{label:T(lang,"myNotes"), icon:" ", action:()=>onGoTo("notes"), color:"#8b5c
{label:"Rapport de shift", icon:" ", action:onShiftReport, color:"#2a9d8f"},
].map(s=>(
<button key={s.label} className="btn card-tap" onClick={s.action}
style={{padding:"14px 12px",borderRadius:14,background:"transparent",border:`1.5p
<span style={{fontSize:20}}>{s.icon}</span>
<span style={{fontSize:12,fontWeight:600,color:themeColor,textAlign:"left",lineHe
</button>
))}
</div>
{announcements?.length>0&&(
<div className="fade-in">
<div className="tag" style={{marginBottom:10}}>ANNONCES</div>
<div style={{display:"flex",flexDirection:"column",gap:8}}>
{announcements.slice(0,3).map(a=>(
<div key={a.id} style={{padding:"12px 14px",background:"rgba(244,162,97,0.08)",
<div style={{fontSize:13,color:"var(--text)",lineHeight:1.5}}>{a.text}</div>
<div style={{fontSize:11,color:"var(--t3)",marginTop:5}}>{a.dept==="all"?"Tou
</div>
))}
</div>
</div>
)}
<button className="btn btn-gold fade-in" onClick={onNew} style={{width:"100%",padding:"
Créer une nouvelle tâche
</button>
</div>
);
}
function MiniTaskCard({task,getUser,getPri,onClick}){
const p=getPri(task.priority); const u=getUser(task.assignedTo); const s=STATUS_META[task.s
return(
<div className="card card-tap" onClick={onClick} style={{padding:"13px 15px",display:"fle
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:14,fontWeight:600,color:"var(--text)",overflow:"hidden",textOve
<div style={{fontSize:11,color:"var(--t2)",marginTop:2}}>{u?.name} · {task.department
</div>
<span className="pill" style={{background:s.bg,color:s.color,border:`1px solid ${s.bord
</div>
);
}
// ─── TASKS TAB ────────────────────────────────────────────────────
function TasksTab({tasks,archivedTasks,me,getUser,getPri,isOwner,onTask,onNew,initFilter,seen
const [filter,setFilter] = useState(initFilter==="urgent"||initFilter==="pinned"?"all":in
const [priFilter,setPri] = useState(initFilter==="urgent"?"urgent":"all");
const [deptFilter,setDept] = useState("all");
const [search,setSearch] = useState("");
const [showPinned,setPinned] = useState(initFilter==="pinned");
useEffect(()=>{
if(initFilter==="urgent"){setFilter("all");setPri("urgent");setPinned(false);}
else if(initFilter==="pinned"){setFilter("all");setPri("all");setPinned(true);}
else{setFilter(initFilter||"all");setPri("all");setPinned(false);}
},[initFilter]);
const [showFilters,setShowFilters] = useState(false);
const [showArchived,setShowArchived] = useState(false);
const hasActiveFilters = filter!=="active"||priFilter!=="all"||deptFilter!=="all"||showPinn
const sortFn = (a,b) => {
const pinDiff = (b.pinned?1:0)-(a.pinned?1:0);
if(pinDiff!==0) return pinDiff;
if(taskSort==="date") return (b.createdAt||0)-(a.createdAt||0);
if(taskSort==="priority") return ["urgent","high","normal","low"].indexOf(a.priority)-["u
if(taskSort==="dept") return (a.department||"").localeCompare(b.department||"");
if(taskSort==="assigned") { const ua=getUser(a.assignedTo)?.name||""; const ub=getUser(b.
return 0;
};
const sourceList = showArchived ? archivedTasks : tasks;
const filtered = sourceList.filter(t=>
(!showPinned||t.pinned)&&
(showArchived||(
filter==="all" ? true :
filter==="active" ? t.status!=="done" :
t.status===filter
))&&
(priFilter==="all"||t.priority===priFilter)&&
(deptFilter==="all"||t.department===deptFilter)&&
(!search||t.title.toLowerCase().includes(search.toLowerCase())||t.description?.toLowerCas
).sort(sortFn);
return(
<div style={{padding:"20px 16px",display:"flex",flexDirection:"column",gap:12}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
<div>
<div className="tag" style={{marginBottom:4}}>TÂCHES</div>
<div className="serif" style={{fontSize:22,fontWeight:700,color:"var(--gold)"}}>{fi
</div>
<button className="btn btn-gold" onClick={onNew} style={{padding:"9px 16px",borderRad
</div>
{/* SEARCH + FILTER BUTTON */}
<div style={{display:"flex",gap:8}}>
<div style={{position:"relative",flex:1}}>
<div style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",col
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
</div>
<input className="field" value={search} onChange={e=>setSearch(e.target.value)} pla
</div>
<button className="btn" onClick={()=>setShowFilters(p=>!p)}
style={{width:44,height:44,borderRadius:12,flexShrink:0,
background:hasActiveFilters?"var(--gold)":"var(--s2)",
color:hasActiveFilters?"#0a0a0d":"var(--t2)",
border:`1.5px solid ${hasActiveFilters?"var(--gold)":"var(--border)"}`}}>
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" s
</button>
<button className="btn" onClick={()=>setShowArchived(p=>!p)}
style={{width:44,height:44,borderRadius:12,flexShrink:0,
background:showArchived?"var(--gold)":"var(--s2)",
color:showArchived?"#0a0a0d":"var(--t3)",
border:"1px solid var(--border)"}}>
</button>
</div>
{/* FILTER PANEL */}
{showFilters&&(
<div style={{background:"var(--s2)",borderRadius:16,padding:"16px",border:"1px <div>
solid
<div className="tag" style={{marginBottom:8}}>STATUT</div>
<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
{[{id:"active",label:"Actives"},{id:"todo",label:"À faire"},{id:"inprogress",la
<button key={f.id} className="btn" onClick={()=>{setFilter(f.id);setPri("all"
style={{padding:"6px 13px",borderRadius:20,fontSize:12,
background:filter===f.id&&priFilter==="all"&&!showPinned?"var(--gold)":"v
color:filter===f.id&&priFilter==="all"&&!showPinned?"#0a0a0d":"var(--t2)"
border:"1px solid var(--border)"}}>
{f.label}
</button>
))}
<button className="btn" onClick={()=>{setPinned(p=>!p);setFilter("all");setPri(
style={{padding:"6px 13px",borderRadius:20,fontSize:12,
background:showPinned?"var(--gold)":"var(--s1)",color:showPinned?"#0a0a0d":
★ Épinglées
</button>
</div>
</div>
<div>
<div className="tag" style={{marginBottom:8}}>PRIORITÉ</div>
<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
{[{id:"all",label:"Toutes"},...PRIORITIES].map(p=>(
<button key={p.id||"all"} className="btn" onClick={()=>{setPri(p.id||"all");s
style={{padding:"6px 13px",borderRadius:20,fontSize:12,
background:priFilter===(p.id||"all")?"var(--gold)":"var(--s1)",
color:priFilter===(p.id||"all")?"#0a0a0d":"var(--t2)",
border:"1px solid var(--border)"}}>
{p.label}
</button>
))}
</div>
</div>
<div>
<div className="tag" style={{marginBottom:8}}>DÉPARTEMENT</div>
<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
{["all",...DEPARTMENTS].map(d=>(
<button key={d} className="btn" onClick={()=>setDept(d)}
style={{padding:"5px 11px",borderRadius:20,fontSize:11,
background:deptFilter===d?"var(--gold)":"var(--s1)",
color:deptFilter===d?"#0a0a0d":"var(--t3)",
border:"1px solid var(--border)"}}>
{d==="all"?"Tous":d}
</button>
))}
</div>
</div>
<div>
<div className="tag" style={{marginBottom:8}}>TRIER PAR</div>
<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
{[{id:"date",label:"Date"},{id:"priority",label:"Priorité"},{id:"dept",label:"D
<button key={s.id} className="btn" onClick={()=>setTaskSort(s.id)}
style={{padding:"6px 13px",borderRadius:20,fontSize:12,
background:taskSort===s.id?"var(--gold)":"var(--s1)",
color:taskSort===s.id?"#0a0a0d":"var(--t2)",
border:"1px solid var(--border)"}}>
{s.label}
</button>
))}
</div>
</div>
<button className="btn" onClick={()=>{setFilter("active");setPri("all");setDept("al
style={{width:"100%",padding:"10px",borderRadius:11,fontSize:13,background:"var(-
Réinitialiser
</button>
</div>
)}
{filtered.length===0
? <div style={{textAlign:"center",padding:"48px 20px",color:"var(--t3)"}}>
<div style={{fontSize:28,marginBottom:8}}>—</div>
<div style={{fontSize:14}}>{showArchived?"Aucune tâche archivée":"Aucune tâche tr
</div>
: filtered.map(t=><TaskCard key={t.id} task={t} getUser={getUser} getPri={getPri} onC
}
</div>
);
}
function TaskCard({task,getUser,getPri,onClick,unseen}){
const p=getPri(task.priority); const u=getUser(task.assignedTo); const s=STATUS_META[task.s
const overdue=task.dueDate&&new Date(task.dueDate)<new Date()&&task.status!=="done";
return(
<div className="card card-tap" onClick={onClick} style={{padding:"15px",borderLeft:`3px s
<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marg
<div style={{display:"flex",alignItems:"center",gap:7,flex:1,minWidth:0}}>
{unseen&&<div className="unread-dot"/>}
{task.pinned&&<span style={{fontSize:12,color:"var(--gold)"}}>★</span>}
<div style={{fontSize:15,fontWeight:600,color:"var(--text)",overflow:"hidden",textO
</div>
<div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0,marginLeft:8}}>
{task.recurrence&&task.recurrence!=="none"&&<span className="recur-tag">↻</span>}
<span className="pill" style={{background:s.bg,color:s.color,border:`1px solid ${s.
</div>
</div>
{task.description&&<div style={{fontSize:13,color:"var(--t2)",marginBottom:10,lineHeigh
{task.photo&&<div style={{borderRadius:10,overflow:"hidden",marginBottom:10,height:90}}
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<div style={{display:"flex",alignItems:"center",gap:7}}>
<div style={{width:22,height:22,borderRadius:6,background:u?.color,display:"flex",a
<span style={{fontSize:12,color:"var(--t2)"}}>{u?.name}</span>
<span style={{fontSize:11,color:"var(--t3)"}}>· {task.department}</span>
</div>
<div style={{display:"flex",gap:8,alignItems:"center"}}>
{task.comments.length>0&&<span style={{fontSize:11,color:"var(--t3)"}}> {task.com
{task.dueDate&&<span style={{fontSize:11,color:overdue?"#e63946":"var(--t3)",fontWe
</div>
</div>
</div>
);
}
// ─── TOUR TAB ─────────────────────────────────────────────────────
function TourTab({tourHistory,tourConfig,me,isOwner,onStart,onEditConfig}){
const [calMonth, setCalMonth] = useState(new Date());
const [selectedDay, setSelectedDay] = useState(null);
const year=calMonth.getFullYear(); const month=calMonth.getMonth();
const firstDay=new Date(year,month,1).getDay();
const daysInMonth=new Date(year,month+1,0).getDate();
const tourDays={};
tourHistory.forEach(t=>{ if(!tourDays[t.date]) tourDays[t.date]=[]; tourDays[t.date].push(t
const selectedTours = selectedDay ? (tourDays[selectedDay]||[]) : [];
const todayShiftsDone = (tourDays[todayStr()]||[]).map(t=>t.shift);
return(
<div style={{padding:"20px 16px",display:"flex",flexDirection:"column",gap:18}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
<div>
<div className="tag" style={{marginBottom:4}}>PLANCHER</div>
<div className="serif" style={{fontSize:22,fontWeight:700,color:"var(--gold)"}}>Tou
</div>
{isOwner&&<button className="btn btn-ghost" onClick={onEditConfig} style={{padding:"8
</div>
{/* TODAY SHIFTS */}
<div className="card" style={{padding:"18px"}}>
<div className="tag" style={{marginBottom:12}}>AUJOURD'HUI</div>
<div style={{display:"flex",flexDirection:"column",gap:8}}>
{SHIFTS.map(shift=>{
const done=todayShiftsDone.includes(shift);
const tour=tourDays[todayStr()]?.find(t=>t.shift===shift);
return(
<div key={shift} style={{display:"flex",alignItems:"center",gap:12,padding:"12p
<div style={{width:36,height:36,borderRadius:10,background:done?"rgba(42,157,
{shift==="Matin"?" ":shift==="Midi"?" ":" "}
</div>
<div style={{flex:1}}>
<div style={{fontSize:14,fontWeight:600,color:"var(--text)"}}>{shift}</div>
{done&&tour&&<div style={{fontSize:11,color:"var(--t2)",marginTop:1}}>Score
</div>
{done
? <span className="pill" style={{background:"rgba(42,157,143,0.1)",color:"#
: <button className="btn btn-gold" onClick={()=>onStart(shift)} style={{pad
}
</div>
);
})}
</div>
</div>
{/* CALENDAR */}
<div className="card" style={{padding:"18px"}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",margin
<button className="btn btn-ghost" onClick={()=>setCalMonth(m=>{const n=new Date(m);
<div style={{fontSize:14,fontWeight:700,color:"var(--text)",textTransform:"capitali
<button className="btn btn-ghost" onClick={()=>setCalMonth(m=>{const n=new Date(m);
</div>
<div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:8}
{["D","L","M","M","J","V","S"].map((d,i)=><div key={i} style={{textAlign:"center",f
</div>
<div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
{Array(firstDay).fill(null).map((_,i)=><div key={`e${i}`}/>)}
{Array(daysInMonth).fill(null).map((_,i)=>{
const day=i+1;
const dateStr=`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(
const hasTours=tourDays[dateStr];
const isToday=dateStr===todayStr();
const isSel=dateStr===selectedDay;
return(
<div key={day} onClick={()=>setSelectedDay(isSel?null:dateStr)}
style={{aspectRatio:"1",display:"flex",flexDirection:"column",alignItems:"cen
background:isSel?"var(--gold)":isToday?"var(--gold-dim)":"transparent",
border:isToday&&!isSel?"1px solid var(--gold-b)":"1px solid transparent"}}>
<span style={{fontSize:12,fontWeight:isToday?700:400,color:isSel?"#0a0a0d":is
{hasTours&&<div style={{display:"flex",gap:2,marginTop:2}}>
{hasTours.map((_,ti)=><div key={ti} style={{width:4,height:4,borderRadius:"
</div>}
</div>
);
})}
</div>
{selectedDay&&selectedTours.length>0&&(
<div style={{marginTop:14,paddingTop:14,borderTop:"1px solid var(--border)",display
<div className="tag" style={{marginBottom:4}}>{new Date(selectedDay+"T12:00:00").
{selectedTours.map((t,i)=>(
<div key={i} style={{padding:"10px 12px",background:"var(--s2)",borderRadius:11
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center
<div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{t.shift}</di
<div style={{fontSize:12,fontWeight:700,color:"var(--gold)"}}>{t.score}/{t.
</div>
<div style={{fontSize:11,color:"var(--t2)",marginTop:3}}>{t.doneBy} · {t.dura
{t.issues?.length>0&&<div style={{fontSize:11,color:"#e63946",marginTop:4}}>⚠
</div>
))}
</div>
)}
</div>
</div>
);
}
// ─── DO TOUR MODAL ────────────────────────────────────────────────
function DoTourModal({shift,startTime,config,me,onSave,onClose,onCreateTask,users}){
const allItems = config.order.flatMap(dept=>[
...config.baseItems.map(item=>({dept,item,key:`${dept}__base__${item}`})),
...(config.deptItems[dept]||[]).map(item=>({dept,item,key:`${dept}__spec__${item}`})),
]);
const [checks,setChecks] = useState({});
const [notes,setNotes] = useState({});
const [photos,setPhotos] = useState({});
const [currentDept,setCurrentDept] = useState(config.order[0]);
const fileRef = useRef();
const [photoTarget,setPhotoTarget] = useState(null);
const deptItems = allItems.filter(x=>x.dept===currentDept);
const totalItems = allItems.length;
const doneItems = Object.keys(checks).filter(k=>checks[k]==="ok"||checks[k]==="issue").len
const pct = totalItems>0?Math.round((doneItems/totalItems)*100):0;
const handleFile = e => {
const f=e.target.files[0]; if(!f) return;
const r=new FileReader(); r.onload=ev=>setPhotos(p=>({...p,[photoTarget]:ev.target.result
};
const handleSave = () => {
const issues = allItems.filter(x=>checks[x.key]==="issue").map(x=>({...x,note:notes[x.key
const elapsed = Math.round((Date.now()-startTime)/60000);
const duration = elapsed<60?`${elapsed} min`:`${Math.floor(elapsed/60)}h${elapsed%60>0?"
const score = allItems.filter(x=>checks[x.key]==="ok").length;
issues.forEach(issue=>{
onCreateTask({title:`⚠ Problème: ${issue.item}`,description:issue.note||"Problème signa
});
onSave({shift,date:todayStr(),doneBy:me.name,score,total:totalItems,duration,startTime:ne
};
return(
<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(5
<div style={{flex:1,background:"var(--s1)",display:"flex",flexDirection:"column"}}>
{/* HEADER */}
<div style={{padding:"14px 18px",borderBottom:"1px solid var(--border)",flexShrink:0}
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marg
<div>
<div className="tag" style={{marginBottom:3}}>TOURNÉE</div>
<div className="serif" style={{fontSize:20,fontWeight:700,color:"var(--gold)"}}
</div>
<button className="btn btn-ghost" onClick={onClose} style={{width:34,height:34,bo
</div>
{/* PROGRESS */}
<div style={{display:"flex",alignItems:"center",gap:10}}>
<div style={{flex:1,height:6,background:"var(--s2)",borderRadius:3,overflow:"hidd
<div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,va
</div>
<div style={{fontSize:12,fontWeight:700,color:"var(--gold)",whiteSpace:"nowrap"}}
</div>
{/* DEPT TABS */}
<div style={{display:"flex",gap:5,overflowX:"auto",marginTop:10,paddingBottom:2}}>
{config.order.map(d=>{
const dItems=allItems.filter(x=>x.dept===d);
const dDone=dItems.filter(x=>checks[x.key]==="ok"||checks[x.key]==="issue").len
const allDone=dDone===dItems.length;
return(
<button key={d} className="btn" onClick={()=>setCurrentDept(d)}
style={{padding:"5px 11px",borderRadius:20,fontSize:11,whiteSpace:"nowrap",
background:currentDept===d?"var(--gold)":allDone?"rgba(42,157,143,0.1)":"
color:currentDept===d?"#0a0a0d":allDone?"#2a9d8f":"var(--t2)",
border:`1px solid ${currentDept===d?"transparent":allDone?"rgba(42,157,14
{allDone&&currentDept!==d?"✓ ":""}{d}
</button>
);
})}
</div>
</div>
{/* ITEMS */}
<div style={{flex:1,overflowY:"auto",padding:"14px 16px",display:"flex",flexDirection
<div className="tag" style={{marginBottom:4}}>{currentDept}</div>
{deptItems.map(({item,key})=>{
const status=checks[key];
return(
<div key={key} style={{background:"var(--s2)",borderRadius:14,border:`1px solid
<div style={{padding:"13px 14px",display:"flex",alignItems:"center",gap:12}}>
<div style={{flex:1,fontSize:14,color:"var(--text)",fontWeight:500}}>{item}
<div style={{display:"flex",gap:6}}>
<button className="btn" onClick={()=>setChecks(p=>({...p,[key]:p[key]==="
style={{width:36,height:36,borderRadius:10,fontSize:16,
background:status==="ok"?"rgba(42,157,143,0.15)":"var(--s1)",
border:`1px solid ${status==="ok"?"rgba(42,157,143,0.4)":"var(--borde
✓
</button>
<button className="btn" onClick={()=>setChecks(p=>({...p,[key]:p[key]==="
style={{width:36,height:36,borderRadius:10,fontSize:16,
background:status==="issue"?"rgba(230,57,70,0.12)":"var(--s1)",
border:`1px solid ${status==="issue"?"rgba(230,57,70,0.35)":"var(--bo
⚠
</button>
</div>
</div>
{status==="issue"&&(
<div style={{padding:"0 14px 12px",display:"flex",flexDirection:"column",ga
<input className="field" value={notes[key]||""} onChange={e=>setNotes(p=>
<input ref={fileRef} type="file" accept="image/*" onChange={handleFile} s
{photos[key]
? <div style={{position:"relative",borderRadius:10,overflow:"hidden"}}>
<img src={photos[key]} alt="" style={{width:"100%",maxHeight:100,ob
<button className="btn" onClick={()=>setPhotos(p=>({...p,[key]:null
</div>
: <button className="btn btn-ghost" onClick={()=>{setPhotoTarget(key);s
}
</div>
)}
</div>
);
})}
</div>
{/* FOOTER */}
<div style={{padding:"12px 16px 32px",borderTop:"1px solid var(--border)",flexShrink:
<button className="btn btn-gold" onClick={handleSave} style={{width:"100%",padding:
Terminer la tournée · {pct}% complété
</button>
</div>
</div>
</div>
);
}
// ─── TOUR CONFIG MODAL ────────────────────────────────────────────
function TourConfigModal({config,onSave,onClose}){
const [cfg,setCfg] = useState(JSON.parse(JSON.stringify(config)));
const [activeTab,setActiveTab] = useState("base");
const [newItem,setNewItem] = useState("");
const addItem = () => {
if(!newItem.trim()) return;
if(activeTab==="base") setCfg(c=>({...c,baseItems:[...c.baseItems,newItem.trim()]}));
else setCfg(c=>({...c,deptItems:{...c.deptItems,[activeTab]:[...(c.deptItems[activeTab]||
setNewItem("");
};
const removeItem = (tab,idx) => {
if(tab==="base") setCfg(c=>({...c,baseItems:c.baseItems.filter((_,i)=>i!==idx)}));
else setCfg(c=>({...c,deptItems:{...c.deptItems,[tab]:c.deptItems[tab].filter((_,i)=>i!==
};
const moveOrder = (idx,dir) => {
setCfg(c=>{
const o=[...c.order];
const newIdx=idx+dir;
if(newIdx<0||newIdx>=o.length) return c;
[o[idx],o[newIdx]]=[o[newIdx],o[idx]];
return {...c,order:o};
});
};
const items = activeTab==="base"?cfg.baseItems:(cfg.deptItems[activeTab]||[]);
return(
<div className="overlay" onClick={onClose}>
<div className="sheet slide-up" onClick={e=>e.stopPropagation()} style={{maxHeight:"93v
<div className="handle"/>
<div style={{padding:"4px 18px 10px",borderBottom:"1px solid var(--border)",flexShrin
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marg
<div className="serif" style={{fontSize:20,fontWeight:700,color:"var(--text)"}}>C
<button className="btn btn-outline" onClick={onClose} style={{width:32,height:32,
</div>
<button className="btn btn-gold" onClick={()=>onSave(cfg)} style={{width:"100%",pad
</div>
<div style={{flex:1,overflowY:"auto",padding:"14px 18px 32px",display:"flex",flexDire
{/* ORDER */}
<div>
<div className="tag" style={{marginBottom:10}}>ORDRE DES ARRÊTS</div>
<div style={{display:"flex",flexDirection:"column",gap:6}}>
{cfg.order.map((dept,i)=>(
<div key={dept} style={{display:"flex",alignItems:"center",gap:10,padding:"10
<div style={{width:22,height:22,borderRadius:6,background:"var(--gold-dim)"
<div style={{flex:1,fontSize:13,fontWeight:500,color:"var(--text)"}}>{dept}
<div style={{display:"flex",gap:4}}>
<button className="btn btn-ghost" onClick={()=>moveOrder(i,-1)} style={{w
<button className="btn btn-ghost" onClick={()=>moveOrder(i,1)} style={{w
</div>
</div>
))}
</div>
</div>
{/* ITEMS */}
<div>
<div className="tag" style={{marginBottom:10}}>POINTS À VÉRIFIER</div>
<div style={{display:"flex",gap:5,overflowX:"auto",marginBottom:12,paddingBottom:
{["base",...DEPARTMENTS].map(t=>(
<button key={t} className="btn" onClick={()=>setActiveTab(t)}
style={{padding:"6px 12px",borderRadius:20,fontSize:11,whiteSpace:"nowrap",
background:activeTab===t?"var(--gold)":"var(--s2)",color:activeTab===t?"#
{t==="base"?"Base (tous)":t}
</button>
))}
</div>
<div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
{items.map((item,i)=>(
<div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px
<div style={{flex:1,fontSize:13,color:"var(--text)"}}>{item}</div>
<button className="btn btn-danger" onClick={()=>removeItem(activeTab,i)} st
</div>
))}
</div>
<div style={{display:"flex",gap:8}}>
<input className="field" value={newItem} onChange={e=>setNewItem(e.target.value
<button className="btn btn-gold" onClick={addItem} style={{width:44,height:44,b
</div>
</div>
</div>
</div>
</div>
);
}
// ─── TEAM TAB ─────────────────────────────────────────────────────
function TeamTab({users,me,isOwner,onAdd,onEdit,tasks}){
return(
<div style={{padding:"20px 16px",display:"flex",flexDirection:"column",gap:14}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
<div><div className="tag" style={{marginBottom:4}}>MEMBRES</div><div className="serif
{isOwner&&<button className="btn btn-gold" onClick={onAdd} style={{padding:"9px 16px"
</div>
{!isOwner&&<div className="card" style={{padding:"12px 16px",textAlign:"center",fontSiz
<div style={{display:"flex",flexDirection:"column",gap:10}}>
{users.map(u=>{
const active=tasks.filter(t=>t.assignedTo===u.id&&t.status!=="done").length;
return(
<div key={u.id} className={`card ${isOwner&&!u.isOwner?"card-tap":""}`} onClick={
style={{padding:"15px",display:"flex",alignItems:"center",gap:13}}>
<div style={{width:44,height:44,borderRadius:12,background:u.color,display:"fle
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:15,fontWeight:600,color:"var(--text)",overflow:"hidden"
<div style={{fontSize:12,color:"var(--t2)",marginTop:2}}>{u.role}</div>
</div>
<div style={{flexShrink:0,textAlign:"right"}}>
{u.isOwner
? <span className="pill" style={{background:"var(--gold-dim)",color:"var(--
: <><div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{active}<
}
</div>
</div>
);
})}
</div>
</div>
);
}
// ─── STATS TAB ────────────────────────────────────────────────────
function StatsTab({tasks,users,tourHistory,shiftReports}){
const [period,setPeriod]=useState(7);
const since=Date.now()-period*86400000;
const inPeriod=tasks.filter(t=>t.createdAt>=since);
const completed=tasks.filter(t=>t.completedAt&&t.completedAt>=since);
const rate=tasks.length>0?Math.round((tasks.filter(t=>t.status==="done").length/tasks.lengt
const late=tasks.filter(t=>t.status!=="done"&&t.dueDate&&new Date(t.dueDate)<new Date());
const byUser=users.map(u=>({...u,done:tasks.filter(t=>t.assignedTo===u.id&&t.status==="done
const byDept=DEPARTMENTS.map(d=>({name:d,total:tasks.filter(t=>t.department===d).length,don
const tourScore=tourHistory.length>0?Math.round(tourHistory.reduce((acc,t)=>acc+(t.score/t.
return(
<div style={{padding:"20px 16px",display:"flex",flexDirection:"column",gap:16}}>
<div><div className="tag" style={{marginBottom:4}}>PERFORMANCE</div><div className="ser
<div style={{display:"flex",gap:8}}>
{[7,14,30].map(d=>(
<button key={d} className="btn" onClick={()=>setPeriod(d)} style={{flex:1,padding:"
{d}j
</button>
))}
</div>
{[
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
{label:"Créées",val:inPeriod.length,color:"var(--gold)"},
{label:"Complétées",val:completed.length,color:"#2a9d8f"},
{label:"Taux",val:`${rate}%`,color:"var(--gold)"},
{label:"En retard",val:late.length,color:"#e63946"},
].map(s=>(
<div key={s.label} className="card" style={{padding:"15px",borderTop:`2px solid ${s
<div className="serif" style={{fontSize:30,fontWeight:700,color:s.color,lineHeigh
<div style={{fontSize:12,color:"var(--t2)",marginTop:6,fontWeight:500}}>{s.label}
</div>
))}
</div>
{tourScore!==null&&(
<div className="card" style={{padding:"15px",borderTop:"2px solid var(--gold)",displa
<div><div className="serif" style={{fontSize:28,fontWeight:700,color:"var(--gold)"}
<div style={{marginLeft:"auto",fontSize:12,color:"var(--t3)"}}>{tourHistory.length}
</div>
)}
{shiftReports?.length>0&&(()=>{
const avgRating = Math.round(shiftReports.reduce((a,r)=>a+r.rating,0)/shiftReports.le
const avgTraffic = ["faible","moyen","fort"][Math.round(shiftReports.reduce((a,r)=>a+
return(
<div className="card" style={{padding:"15px",borderTop:"2px solid var(--gold)",disp
<div style={{flex:1}}>
<div style={{display:"flex",gap:2,marginBottom:4}}>
{[1,2,3,4,5].map(n=><span key={n} style={{fontSize:18,color:n<=avgRating?"var
</div>
<div style={{fontSize:12,color:"var(--t2)"}}>Note moyenne des journées · </div>
<div style={{textAlign:"right",fontSize:12,color:"var(--t3)"}}>{shiftReports.leng
</div>
Achala
);
})()}
<div>
<div className="tag" style={{marginBottom:10}}>PAR MEMBRE</div>
<div style={{display:"flex",flexDirection:"column",gap:8}}>
{byUser.map(u=>(
<div key={u.id} className="card" style={{padding:"14px"}}>
<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:9}}>
<div style={{width:30,height:30,borderRadius:8,background:u.color,display:"fl
<div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:"var(--te
<div style={{textAlign:"right"}}>
<div style={{fontSize:15,fontWeight:700,color:"#2a9d8f"}}>{u.done}<span sty
{u.late>0&&<div style={{fontSize:10,color:"#e63946",fontWeight:600}}>{u.lat
</div>
</div>
<div style={{height:4,background:"var(--s2)",borderRadius:2,overflow:"hidden"}}
<div style={{height:"100%",width:`${u.total>0?Math.round(u.done/u.total*100):
</div>
<div style={{fontSize:10,color:"var(--t3)",marginTop:4,textAlign:"right"}}>{u.t
</div>
))}
</div>
</div>
<div>
<div className="tag" style={{marginBottom:10}}>PAR DÉPARTEMENT</div>
<div style={{display:"flex",flexDirection:"column",gap:7}}>
{byDept.map(d=>(
<div key={d.name} className="card" style={{padding:"12px 14px",display:"flex",ali
<div style={{flex:1}}>
<div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:6}}>
<div style={{height:4,background:"var(--s2)",borderRadius:2,overflow:"hidden"
<div style={{height:"100%",width:`${d.total>0?Math.round(d.done/d.total*100
</div>
</div>
<div style={{textAlign:"right",flexShrink:0}}>
<div style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>{d.done}<span s
{d.late>0&&<div style={{fontSize:10,color:"#e63946"}}>{d.late} en retard</div
</div>
</div>
))}
{byDept.length===0&&<div style={{textAlign:"center",padding:"24px",color:"var(--t3)
</div>
</div>
{/* RAPPORT DE JOURNÉE HISTORIQUE */}
<div>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",margin
<div className="tag">RAPPORTS DE JOURNÉE</div>
<span style={{fontSize:11,color:"var(--t3)"}}>{shiftReports.length} rapport{shiftRe
</div>
{shiftReports.length===0
? <div className="card" style={{padding:"24px",textAlign:"center"}}>
<div style={{fontSize:28,marginBottom:8}}> </div>
<div style={{fontSize:13,color:"var(--t3)"}}>Aucun rapport encore</div>
<div style={{fontSize:11,color:"var(--t3)",marginTop:4}}>Les rapports apparaîtr
</div>
: <div style={{display:"flex",flexDirection:"column",gap:10}}>
{shiftReports.slice(0,20).map(r=>{
const trafficColor = r.traffic==="fort"?"#e63946":r.traffic==="moyen"?"#f4a26
const trafficLabel = r.traffic==="fort"?" Fort":r.traffic==="moyen"?" Moy
return(
<div key={r.id} className="card" style={{padding:"16px"}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"fl
<div>
<div style={{fontSize:15,fontWeight:700,color:"var(--text)"}}>
{new Date(r.date+"T12:00:00").toLocaleDateString("fr-CA",{weekday:"
</div>
<div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>Par {r.doneB
</div>
<div style={{textAlign:"right"}}>
<div style={{display:"flex",gap:3,justifyContent:"flex-end",marginBot
{[1,2,3,4,5].map(n=>(
<span key={n} style={{fontSize:14,color:n<=r.rating?"var(--gold)"
))}
</div>
<span style={{fontSize:11,fontWeight:700,color:trafficColor}}>{traffi
</div>
</div>
{r.highlights&&(
<div style={{marginBottom:8,padding:"8px 12px",background:"rgba(42,157,
<div style={{fontSize:10,fontWeight:700,color:"#2a9d8f",marginBottom:
<div style={{fontSize:13,color:"var(--text)",lineHeight:1.5}}>{r.high
</div>
)}
{r.incidents&&(
<div style={{marginBottom:8,padding:"8px 12px",background:"rgba(230,57,
<div style={{fontSize:10,fontWeight:700,color:"#e63946",marginBottom:
<div style={{fontSize:13,color:"var(--text)",lineHeight:1.5}}>{r.inci
</div>
)}
{r.notes&&(
<div style={{padding:"8px 12px",background:"var(--s2)",borderRadius:10}
<div style={{fontSize:10,fontWeight:700,color:"var(--t3)",marginBotto
<div style={{fontSize:13,color:"var(--t2)",lineHeight:1.5}}>{r.notes}
</div>
)}
</div>
);
})}
</div>
}
</div>
</div>
);
}
// ─── TASK DETAIL MODAL ────────────────────────────────────────────
function TaskDetailModal({task,users,me,getUser,getPri,isOwner,onStatus,onComment,onDelete,on
const [comment,setComment]=useState("");
const [completionNote,setNote]=useState("");
const [completionPhoto,setPhoto]=useState(null);
const [confirmDel,setConfirmDel]=useState(false);
const fileRef=useRef(); const bottomRef=useRef();
const p=getPri(task.priority); const assigned=getUser(task.assignedTo); const createdBy=get
const overdue=task.dueDate&&new Date(task.dueDate)<new Date()&&task.status!=="done";
const canEdit=isOwner||me.id===task.createdBy||me.id===task.assignedTo;
const handleFile=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onlo
return(
<div className="overlay" onClick={onClose}>
<div className="sheet slide-up" onClick={e=>e.stopPropagation()}>
<div className="handle"/>
<div style={{overflowY:"auto",flex:1,padding:"4px 18px 16px",display:"flex",flexDirec
<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}
<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
<span className="pill" style={{background:p?.bg,color:p?.color,border:`1px soli
{task.recurrence&&task.recurrence!=="none"&&<span className="recur-tag">↻ {RECU
{task.pinned&&<span style={{fontSize:11,color:"var(--gold)",fontWeight:700}}>★
</div>
<div style={{display:"flex",gap:6}}>
<button className="btn btn-ghost" onClick={()=>onPin(task.id)} style={{width:34
{canEdit&&<button className="btn btn-ghost" onClick={()=>onEdit(task)} style={{
{(isOwner||me.id===task.createdBy)&&task.status==="done"&&<button className="bt
{(isOwner||me.id===task.createdBy)&&<button className="btn btn-danger" onClick=
<button className="btn btn-outline" onClick={onClose} style={{width:34,height:3
</div>
</div>
<div>
<div className="serif" style={{fontSize:22,fontWeight:700,color:"var(--text)",lin
<div style={{fontSize:12,color:"var(--t3)"}}>Par {createdBy?.name} · {ago(task.cr
</div>
{task.description&&<div style={{fontSize:14,color:"var(--t2)",lineHeight:1.7,paddin
{task.photo&&<div style={{borderRadius:14,overflow:"hidden"}}><img src={task.photo}
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
{[
{label:"ASSIGNÉ À",val:<div style={{display:"flex",alignItems:"center",gap:6}}>
{label:"DÉPARTEMENT",val:task.department},
{label:"STATUT",val:<span style={{color:s.color,fontWeight:600}}>{s.label}</spa
{label:"ÉCHÉANCE",val:<span style={{color:overdue?"#e63946":"var(--text)",fontW
].map(item=>(
<div key={item.label} style={{background:"var(--s2)",borderRadius:12,padding:"1
<div className="tag" style={{marginBottom:5}}>{item.label}</div>
<div style={{fontSize:12,color:"var(--text)",fontWeight:500}}>{item.val}</div
</div>
))}
</div>
{canEdit&&task.status!=="done"&&(
<div style={{display:"flex",flexDirection:"column",gap:10,padding:"14px",backgrou
<div className="tag">COMPLÉTER</div>
<input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={
{completionPhoto
? <div style={{position:"relative",borderRadius:10,overflow:"hidden"}}><img s
: <button className="btn btn-outline" onClick={()=>fileRef.current?.click()}
}
<input className="field" value={completionNote} onChange={e=>setNote(e.target.v
<div style={{display:"flex",gap:8}}>
{task.status==="todo"&&<button className="btn btn-warn" onClick={()=>onStatus
<button className="btn btn-ok" onClick={()=>onStatus(task.id,"done",completio
</div>
</div>
)}
{task.status==="done"&&<div style={{background:"rgba(42,157,143,0.08)",border:"1px
<div>
<div className="tag" style={{marginBottom:12}}>COMMENTAIRES ({task.comments.lengt
<div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:12}}>
{task.comments.map(c=>{const u=getUser(c.userId);return(
<div key={c.id} style={{display:"flex",gap:10}}>
<div style={{width:28,height:28,borderRadius:8,background:u?.color,display:
<div style={{flex:1}}>
<div style={{display:"flex",gap:8,alignItems:"baseline",marginBottom:4}}>
<div style={{fontSize:13,color:"var(--t2)",lineHeight:1.5,background:"var
</div>
</div>
);})}
<div ref={bottomRef}/>
</div>
<div style={{display:"flex",gap:8}}>
<input className="field" value={comment} onChange={e=>setComment(e.target.value
<button className="btn btn-gold" onClick={()=>{onComment(task.id,comment);setCo
</div>
</div>
</div>
</div>
{confirmDel&&(
<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:60,display
<div className="scale-in" style={{background:"var(--s1)",borderRadius:20,padding:24
<div className="serif" style={{fontSize:20,fontWeight:700,marginBottom:8,color:"v
<div style={{fontSize:13,color:"var(--t2)",marginBottom:20}}>Cette action est irr
<div style={{display:"flex",gap:8}}>
<button className="btn btn-ghost" onClick={()=>setConfirmDel(false)} style={{fl
<button className="btn btn-danger" onClick={()=>onDelete(task.id)} style={{flex
</div>
</div>
</div>
)}
</div>
);
}
// ─── NEW/EDIT TASK MODAL ──────────────────────────────────────────
function TaskFormModal({initial,users,onSave,onClose,title}){
const [form,setForm]=useState(initial);
const fileRef=useRef();
const set=k=>v=>setForm(p=>({...p,[k]:v}));
const toggleDay=d=>setForm(p=>({...p,customDays:p.customDays?.includes(d)?p.customDays.filt
const handleFile=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onlo
const handleSave=()=>{if(!form.title.trim()){alert("Veuillez entrer un titre");return;}onSa
return(
<div className="overlay" onClick={onClose}>
<div className="sheet slide-up" onClick={e=>e.stopPropagation()}>
<div className="handle"/>
<div style={{padding:"4px 18px 12px",borderBottom:"1px solid var(--border)",flexShrin
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marg
<div className="serif" style={{fontSize:20,fontWeight:700,color:"var(--text)"}}>{
<button className="btn btn-outline" onClick={onClose} style={{width:32,height:32,
</div>
<button className="btn btn-gold" onClick={handleSave} style={{width:"100%",padding:
{title==="Nouvelle tâche"?"Publier la tâche":"Sauvegarder"}
</button>
</div>
<div style={{overflowY:"auto",flex:1,padding:"14px 18px 32px",display:"flex",flexDire
<FL label="TITRE *"><input className="field" value={form.title} onChange={e=>set("t
<FL label="DESCRIPTION"><textarea className="field" value={form.description} onChan
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
<FL label="ASSIGNÉ À"><select className="field" value={form.assignedTo} onChange=
<FL label="PRIORITÉ"><select className="field" value={form.priority} onChange={e=
</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
<FL label="DÉPARTEMENT"><select className="field" value={form.department} onChang
<FL label="STATUT"><select className="field" value={form.status} onChange={e=>set
</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
<FL label="ÉCHÉANCE"><input type="date" className="field" value={form.dueDate||""
<FL label="HEURE"><input type="time" className="field" value={form.dueTime||""} o
</div>
<FL label="RÉCURRENCE">
<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
{RECURRENCE.map(r=>(
<button key={r.id} className="btn" onClick={()=>set("recurrence")(r.id)}
style={{padding:"7px 13px",borderRadius:20,fontSize:12,background:form.recu
{r.label}
</button>
))}
</div>
{form.recurrence==="custom"&&<div style={{display:"flex",gap:6,marginTop:10,flexW
{DAYS_SHORT.map((d,i)=>(
<button key={i} className="btn" onClick={()=>toggleDay(i)}
style={{width:40,height:40,borderRadius:10,fontSize:12,fontWeight:700,backg
{d}
</button>
))}
</div>}
{form.recurrence!=="none"&&<div style={{fontSize:12,color:"var(--gold)",marginTop
</FL>
<FL label="PHOTO">
<input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{d
{form.photo
? <div style={{position:"relative",borderRadius:12,overflow:"hidden"}}><img src
: <button className="btn btn-ghost" onClick={()=>fileRef.current?.click()} styl
}
</FL>
</div>
</div>
</div>
);
}
function NewTaskModal({users,onSave,onClose}){
return <TaskFormModal title="Nouvelle tâche" initial={{title:"",description:"",assignedTo:u
}
function EditTaskModal({task,users,onSave,onClose}){
return <TaskFormModal title="Modifier la tâche" initial={{...task}} users={users} onSave={o
}
// ─── USER MODALS ──────────────────────────────────────────────────
function UserFormModal({title,initial,onSave,onDelete,onClose,showDelete}){
const [form,setForm]=useState({...initial});
const set=k=>v=>setForm(p=>({...p,[k]:v}));
const [confirmDel,setConfirmDel]=useState(false);
return(
<div className="overlay" onClick={onClose}>
<div className="sheet slide-up" onClick={e=>e.stopPropagation()}>
<div className="handle"/>
<div style={{padding:"4px 18px 32px",display:"flex",flexDirection:"column",gap:14}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<div className="serif" style={{fontSize:20,fontWeight:700,color:"var(--text)"}}>{
<button className="btn btn-outline" onClick={onClose} style={{width:32,height:32,
</div>
<FL label="NOM COMPLET *"><input className="field" value={form.name} onChange={e=>s
{!form.isOwner&&(
<FL label="POSTE">
<input className="field" list="roles-list" value={form.role} onChange={e=>set("
<datalist id="roles-list">{["Directeur/Directrice","Dir. Adjoint(e)","Gérant(e)
</FL>
)}
<FL label="COULEUR">
<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
{COLORS.map(c=>(
<button key={c} className="btn" onClick={()=>set("color")(c)}
style={{width:36,height:36,borderRadius:10,background:c,border:form.color==
{form.color===c&&<span style={{fontSize:14,color:c==="#C9A84C"?"#0a0a0d":"w
</button>
))}
</div>
</FL>
<div style={{display:"flex",alignItems:"center",gap:12,padding:"13px",background:"v
<div style={{width:42,height:42,borderRadius:12,background:form.color,display:"fl
<div><div style={{fontSize:14,fontWeight:600,color:"var(--text)"}}>{form.name||"A
</div>
<button className="btn btn-gold" onClick={()=>{if(!form.name?.trim()){alert("Entrez
{title==="Nouvel utilisateur"?"Ajouter":"Sauvegarder"}
</button>
{showDelete&&<button className="btn btn-danger" onClick={()=>setConfirmDel(true)} s
</div>
</div>
{confirmDel&&(
<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:60,display
<div className="scale-in" style={{background:"var(--s1)",borderRadius:20,padding:24
<div className="serif" style={{fontSize:20,fontWeight:700,marginBottom:8,color:"v
<div style={{fontSize:13,color:"var(--t2)",marginBottom:20}}>Cette action est irr
<div style={{display:"flex",gap:8}}>
<button className="btn btn-ghost" onClick={()=>setConfirmDel(false)} style={{fl
<button className="btn btn-danger" onClick={()=>onDelete(form.id)} style={{flex
</div>
</div>
</div>
)}
</div>
);
}
function NewUserModal({onSave,onClose}){return <UserFormModal title="Nouvel utilisateur" init
function EditUserModal({user,me,isOwner,onSave,onDelete,onClose}){return <UserFormModal title
// ─── STORE PROFILE MODAL ──────────────────────────────────────────
function StoreProfileModal({store,onSave,onClose}){
const [form,setForm]=useState({...store});
const set=k=>v=>setForm(p=>({...p,[k]:v}));
const fileRef=useRef();
const handleFile=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onlo
return(
<div className="overlay" onClick={onClose}>
<div className="sheet slide-up" onClick={e=>e.stopPropagation()}>
<div className="handle"/>
<div style={{padding:"4px 18px 32px",display:"flex",flexDirection:"column",gap:14}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<div className="serif" style={{fontSize:20,fontWeight:700,color:"var(--text)"}}>P
<button className="btn btn-outline" onClick={onClose} style={{width:32,height:32,
</div>
<FL label="NOM DU MAGASIN"><input className="field" value={form.name} onChange={e=>
<FL label="NUMÉRO IGA"><input className="field" value={form.number} onChange={e=>se
<FL label="ADRESSE"><input className="field" value={form.address} onChange={e=>set(
<FL label="LOGO">
<input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{d
{form.logo
? <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px",backgro
<img src={form.logo} alt="" style={{width:52,height:52,borderRadius:12,obje
<div style={{flex:1}}>
<div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:
<button className="btn btn-danger" onClick={()=>set("logo")(null)} style=
</div>
</div>
: <button className="btn btn-ghost" onClick={()=>fileRef.current?.click()} styl
}
</FL>
</div>
</div>
</div>
<button className="btn btn-gold" onClick={()=>onSave(form)} style={{width:"100%",pa
);
}
// ─── NOTIFS MODAL ─────────────────────────────────────────────────
function NotifsModal({notifs,onClose}){
const typeColor=t=>t==="done"?"#2a9d8f":t==="reminder"?"#e63946":t==="mention"?"#8b5cf6":t=
const typeLabel=t=>t==="done"?"Complété":t==="reminder"?"Rappel":t==="mention"?"Mention":t=
return(
<div className="overlay" onClick={onClose}>
<div className="sheet slide-up" onClick={e=>e.stopPropagation()} style={{maxHeight:"70v
<div className="handle"/>
<div style={{padding:"4px 18px 8px",borderBottom:"1px solid var(--border)",display:"f
<div className="serif" style={{fontSize:20,fontWeight:700,color:"var(--text)"}}>Not
<button className="btn btn-outline" onClick={onClose} style={{width:32,height:32,bo
</div>
<div style={{overflowY:"auto",flex:1,padding:"12px 18px 32px",display:"flex",flexDire
{notifs.length===0
? <div style={{textAlign:"center",padding:"32px",color:"var(--t3)",fontSize:14}}>
: notifs.map(n=>(
<div key={n.id} style={{display:"flex",gap:12,padding:"13px 14px",background:"v
<div style={{flex:1}}>
<div style={{fontSize:10,fontWeight:700,color:typeColor(n.type),letterSpaci
<div style={{fontSize:14,fontWeight:600,color:"var(--text)",marginBottom:2}
<div style={{fontSize:12,color:"var(--t2)",fontStyle:"italic",marginBottom:
<div style={{fontSize:11,color:"var(--t3)"}}>{ago(n.ts)}</div>
</div>
</div>
))
}
</div>
</div>
</div>
);
}
// ─── SWITCH USER MODAL ────────────────────────────────────────────
function SwitchUserModal({users,me,onSwitch,onClose}){
return(
<div className="overlay" onClick={onClose}>
<div className="sheet slide-up" onClick={e=>e.stopPropagation()}>
<div className="handle"/>
<div style={{padding:"4px 18px 32px",display:"flex",flexDirection:"column",gap:10}}>
<div className="serif" style={{fontSize:20,fontWeight:700,color:"var(--text)",margi
{users.map(u=>(
<button key={u.id} className="btn" onClick={()=>onSwitch(u)}
style={{padding:"13px 15px",borderRadius:13,background:me.id===u.id?"var(--gold
<div style={{width:38,height:38,borderRadius:10,background:u.color,display:"fle
<div style={{textAlign:"left",flex:1}}>
<div style={{fontSize:14,fontWeight:600,color:"var(--text)"}}>{u.name}</div>
<div style={{fontSize:12,color:"var(--t2)"}}>{u.role}</div>
</div>
{me.id===u.id&&<span className="pill" style={{background:"var(--gold-dim)",colo
</button>
))}
</div>
</div>
</div>
);
}
// ─── FIELD LABEL ──────────────────────────────────────────────────
function FL({label,children}){
return(
<div style={{display:"flex",flexDirection:"column",gap:7}}>
<div className="tag">{label}</div>
{children}
</div>
);
}
// ─── COMM TAB ─────────────────────────────────────────────────────
const EVENT_COLORS = [
{color:"#3b82f6",label:"Bleu"},
{color:"#e63946",label:"Rouge"},
{color:"#2a9d8f",label:"Vert"},
{color:"#f4a261",label:"Orange"},
{color:"#8b5cf6",label:"Violet"},
{color:"#C9A84C",label:"Or"},
{color:"#ec4899",label:"Rose"},
{color:"#6b7280",label:"Gris"},
];
const REMINDER_OPTIONS = [
{id:"15",label:"15 min avant"},
{id:"60",label:"1h avant"},
{id:"1440",label:"1 jour avant"},
{id:"10080",label:"1 semaine avant"},
];
function CommTab({events,announcements,users,me,isOwner,getUser,onNewEvent,onEditEvent,onDele
const [view,setView]=useState("calendar");
const [calDate,setCalDate]=useState(new Date());
const [selectedDay,setSelectedDay]=useState(null);
const year=calDate.getFullYear(); const month=calDate.getMonth();
const firstDay=new Date(year,month,1).getDay();
const daysInMonth=new Date(year,month+1,0).getDate();
const todayDate=new Date();
const eventsByDay={};
events.forEach(e=>{
if(!eventsByDay[e.date]) eventsByDay[e.date]=[];
eventsByDay[e.date].push(e);
});
const selectedEvents = selectedDay ? (eventsByDay[selectedDay]||[]) : [];
const upcomingEvents = [...events].sort((a,b)=>a.date.localeCompare(b.date)||a.startTime.lo
return(
<div style={{padding:"20px 16px",display:"flex",flexDirection:"column",gap:16}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
<div><div className="tag" style={{marginBottom:4}}>COMMUNICATION</div><div className=
<div style={{display:"flex",gap:8}}>
<button className="btn btn-ghost" onClick={onNewAnnouncement} style={{padding:"8px
<button className="btn btn-gold" onClick={onNewEvent} style={{padding:"8px 14px",bo
</div>
</div>
{/* VIEW TOGGLE */}
<div style={{display:"flex",gap:6}}>
{[{id:"calendar",label:"Calendrier"},{id:"list",label:"Liste"},{id:"announcements",la
<button key={v.id} className="btn" onClick={()=>setView(v.id)}
style={{flex:1,padding:"8px",borderRadius:11,fontSize:12,fontWeight:700,
background:view===v.id?"var(--gold)":"var(--s2)",
color:view===v.id?"#0a0a0d":"var(--t2)",
border:"1px solid var(--border)"}}>
{v.label}
</button>
))}
</div>
{/* CALENDAR VIEW */}
{view==="calendar"&&(
<div className="card" style={{padding:"18px"}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marg
<button className="btn btn-ghost" onClick={()=>setCalDate(d=>{const n=new Date(d)
<div style={{fontSize:14,fontWeight:700,color:"var(--text)",textTransform:"capita
<button className="btn btn-ghost" onClick={()=>setCalDate(d=>{const n=new Date(d)
</div>
<div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:
{["D","L","M","M","J","V","S"].map((d,i)=><div key={i} style={{textAlign:"center"
</div>
<div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
{Array(firstDay).fill(null).map((_,i)=><div key={`e${i}`}/>)}
{Array(daysInMonth).fill(null).map((_,i)=>{
const day=i+1;
const dateStr=`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStar
const dayEvents=eventsByDay[dateStr]||[];
const isToday=day===todayDate.getDate()&&month===todayDate.getMonth()&&year===t
const isSel=dateStr===selectedDay;
return(
<div key={day} onClick={()=>setSelectedDay(isSel?null:dateStr)}
style={{borderRadius:9,cursor:"pointer",padding:"4px 2px",minHeight:44,disp
background:isSel?"var(--gold)":isToday?"var(--gold-dim)":"transparent",
border:isToday&&!isSel?"1px solid var(--gold-b)":"1px solid transparent"}
<span style={{fontSize:12,fontWeight:isToday?700:400,color:isSel?"#0a0a0d":
<div style={{display:"flex",flexDirection:"column",gap:1,width:"100%",paddi
{dayEvents.slice(0,2).map((ev,ei)=>(
<div key={ei} style={{height:4,borderRadius:2,background:isSel?"rgba(10
))}
</div>
</div>
{dayEvents.length>2&&<div style={{fontSize:8,color:isSel?"#0a0a0d":"var(-
);
})}
</div>
{selectedDay&&(
<div style={{marginTop:14,paddingTop:14,borderTop:"1px solid var(--border)",displ
<div className="tag">{new Date(selectedDay+"T12:00:00").toLocaleDateString("fr-
{selectedEvents.length===0
? <div style={{textAlign:"center",padding:"16px",color:"var(--t3)",fontSize:1
: selectedEvents.map(ev=><EventCard key={ev.id} event={ev} getUser={getUser}
}
</div>
<button className="btn btn-gold" onClick={onNewEvent} style={{width:"100%",padd
)}
</div>
)}
{/* LIST VIEW */}
{view==="list"&&(
<div style={{display:"flex",flexDirection:"column",gap:10}}>
<div className="tag" style={{marginBottom:2}}>PROCHAINS ÉVÉNEMENTS</div>
{upcomingEvents.length===0
? <div style={{textAlign:"center",padding:"32px",color:"var(--t3)",fontSize:13}}>
: upcomingEvents.map(ev=><EventCard key={ev.id} event={ev} getUser={getUser} onEd
}
{events.filter(e=>e.date<todayStr()).length>0&&(
<>
<div className="tag" style={{marginTop:8,marginBottom:2}}>PASSÉS</div>
{events.filter(e=>e.date<todayStr()).slice(0,5).map(ev=><EventCard key={ev.id}
</>
)}
</div>
)}
{/* ANNOUNCEMENTS VIEW */}
{view==="announcements"&&(
<div style={{display:"flex",flexDirection:"column",gap:10}}>
<button className="btn btn-gold" onClick={onNewAnnouncement} style={{width:"100%",p
{announcements.length===0
? <div style={{textAlign:"center",padding:"32px",color:"var(--t3)",fontSize:13}}>
: announcements.map(a=>{
const u=getUser(a.createdBy);
return(
<div key={a.id} style={{padding:"14px",background:"var(--s1)",border:"1px s
<div style={{display:"flex",justifyContent:"space-between",alignItems:"fl
<span className="pill" style={{background:"rgba(244,162,97,0.12)",color
{(isOwner||a.createdBy===me.id)&&<button className="btn btn-danger" onC
</div>
<div style={{fontSize:14,color:"var(--text)",lineHeight:1.6,marginBottom:
<div style={{fontSize:11,color:"var(--t3)"}}>{u?.name} · {ago(a.ts)}</div
</div>
);
})
}
</div>
)}
</div>
);
}
function EventCard({event,getUser,onEdit,showDate,past}){
const members=event.members?.map(id=>getUser(id)).filter(Boolean)||[];
const recLabel={none:"",daily:"Quotidien",weekly:"Hebdo",monthly:"Mensuel",custom:"Personna
return(
<div className="card card-tap" onClick={onEdit} style={{padding:"14px",borderLeft:`3px so
<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marg
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:14,fontWeight:600,color:"var(--text)",marginBottom:2}}>{event
{showDate&&<div style={{fontSize:11,color:"var(--t3)",marginBottom:4}}>{new Date(ev
<div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
<span style={{fontSize:12,color:event.color,fontWeight:600}}>{event.startTime} —
{event.category&&<span className="pill" style={{background:`${event.color}18`,col
{recLabel&&<span className="recur-tag">↻ {recLabel}</span>}
</div>
</div>
<div style={{flexShrink:0,marginLeft:10,fontSize:16}}>›</div>
</div>
{event.description&&<div style={{fontSize:12,color:"var(--t2)",marginBottom:8,lineHeigh
<div style={{display:"flex",alignItems:"center",gap:6}}>
{members.slice(0,4).map(u=>(
<div key={u.id} style={{width:22,height:22,borderRadius:6,background:u.color,displa
))}
</div>
</div>
{members.length>4&&<span style={{fontSize:11,color:"var(--t3)"}}>+{members.length-4}<
<span style={{fontSize:11,color:"var(--t3)",marginLeft:2}}>{members.length} participa
);
}
// ─── EVENT FORM MODAL ─────────────────────────────────────────────
function EventFormModal({title,initial,users,me,onSave,onDelete,onClose}){
const [form,setForm]=useState({...initial});
const [confirmDel,setConfirmDel]=useState(false);
const set=k=>v=>setForm(p=>({...p,[k]:v}));
const toggleMember=id=>setForm(p=>({...p,members:p.members?.includes(id)?p.members.filter(x
const toggleDay=d=>setForm(p=>({...p,customDays:p.customDays?.includes(d)?p.customDays.filt
return(
<div className="overlay" onClick={onClose}>
<div className="sheet slide-up" onClick={e=>e.stopPropagation()}>
<div className="handle"/>
<div style={{padding:"4px 18px 12px",borderBottom:"1px solid var(--border)",flexShrin
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marg
<div className="serif" style={{fontSize:20,fontWeight:700,color:"var(--text)"}}>{
<button className="btn btn-outline" onClick={onClose} style={{width:32,height:32,
</div>
<button className="btn btn-gold" onClick={()=>{if(!form.title?.trim()){alert("Entre
{onDelete?"Sauvegarder":"Créer l'événement"}
</button>
</div>
<div style={{overflowY:"auto",flex:1,padding:"14px 18px 32px",display:"flex",flexDire
<FL label="TITRE *"><input className="field" value={form.title||""} onChange={e=>se
<FL label="DESCRIPTION / ORDRE DU JOUR"><textarea className="field" value={form.des
{/* COLOR + CATEGORY */}
<FL label="CATÉGORIE">
<input className="field" value={form.category||""} onChange={e=>set("category")(e
<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
{EVENT_COLORS.map(({color,label})=>(
<button key={color} className="btn" onClick={()=>set("color")(color)} title={
style={{width:34,height:34,borderRadius:10,background:color,border:form.col
{form.color===color&&<span style={{fontSize:14,color:"white",textShadow:"0
</button>
))}
</div>
</FL>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
<FL label="DATE"><input type="date" className="field" value={form.date||""} onCha
<FL label="RAPPEL">
<select className="field" value={form.reminder||"60"} onChange={e=>set("reminde
{REMINDER_OPTIONS.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
</select>
</FL>
</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
<FL label="HEURE DÉBUT"><input type="time" className="field" value={form.startTim
<FL label="HEURE FIN"><input type="time" className="field" value={form.endTime||"
</div>
{/* RECURRENCE */}
<FL label="RÉCURRENCE">
<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
{RECURRENCE.map(r=>(
<button key={r.id} className="btn" onClick={()=>set("recurrence")(r.id)}
style={{padding:"7px 13px",borderRadius:20,fontSize:12,background:form.recu
{r.label}
</button>
))}
</div>
{form.recurrence==="custom"&&(
<div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap"}}>
{DAYS_SHORT.map((d,i)=>(
<button key={i} className="btn" onClick={()=>toggleDay(i)}
style={{width:40,height:40,borderRadius:10,fontSize:12,fontWeight:700,bac
{d}
</button>
))}
</div>
)}
</FL>
{/* MEMBERS */}
<FL label="PARTICIPANTS">
<div style={{display:"flex",flexDirection:"column",gap:7}}>
{users.map(u=>{
const selected=form.members?.includes(u.id);
return(
<button key={u.id} className="btn" onClick={()=>toggleMember(u.id)}
style={{padding:"11px 14px",borderRadius:12,background:selected?"var(--go
<div style={{width:30,height:30,borderRadius:8,background:u.color,display
<div style={{textAlign:"left",flex:1}}>
<div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{u.name}<
<div style={{fontSize:11,color:"var(--t2)"}}>{u.role}</div>
</div>
</button>
{selected&&<span style={{fontSize:14,color:"var(--gold)"}}>✓</span>}
);
})}
</div>
</FL>
{onDelete&&(
<button className="btn btn-danger" onClick={()=>setConfirmDel(true)} style={{widt
)}
</div>
</div>
{confirmDel&&(
<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:60,display
<div className="scale-in" style={{background:"var(--s1)",borderRadius:20,padding:24
<div className="serif" style={{fontSize:20,fontWeight:700,marginBottom:8,color:"v
<div style={{fontSize:13,color:"var(--t2)",marginBottom:20}}>Cette action est irr
<div style={{display:"flex",gap:8}}>
<button className="btn btn-ghost" onClick={()=>setConfirmDel(false)} style={{fl
<button className="btn btn-danger" onClick={()=>onDelete(form.id)} style={{flex
</div>
</div>
</div>
)}
</div>
);
}
// ─── ANNOUNCEMENT MODAL ───────────────────────────────────────────
function AnnouncementModal({me,users,onSave,onClose}){
const [text,setText]=useState("");
const [dept,setDept]=useState("all");
return(
<div className="overlay" onClick={onClose}>
<div className="sheet slide-up" onClick={e=>e.stopPropagation()}>
<div className="handle"/>
<div style={{padding:"4px 18px 32px",display:"flex",flexDirection:"column",gap:14}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<div className="serif" style={{fontSize:20,fontWeight:700,color:"var(--text)"}}>
<button className="btn btn-outline" onClick={onClose} style={{width:32,height:32,
</div>
<FL label="MESSAGE">
<textarea className="field" value={text} onChange={e=>setText(e.target.value)} pl
</FL>
<FL label="DESTINATAIRES">
<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
{["all",...DEPARTMENTS].map(d=>(
<button key={d} className="btn" onClick={()=>setDept(d)}
style={{padding:"7px 13px",borderRadius:20,fontSize:12,whiteSpace:"nowrap",
background:dept===d?"var(--gold)":"var(--s2)",color:dept===d?"#0a0a0d":"v
{d==="all"?"Toute l'équipe":d}
</button>
))}
</div>
</FL>
<div style={{padding:"12px 14px",background:"rgba(244,162,97,0.08)",borderRadius:12
Cette annonce apparaîtra sur l'accueil de {dept==="all"?"tous les membres":"tous
</div>
<button className="btn btn-gold" onClick={()=>{if(!text.trim()){alert("Entrez un me
Envoyer l'annonce
</button>
</div>
</div>
</div>
);
}
alerté
// ─── URGENCY MODAL ────────────────────────────────────────────────
function UrgencyModal({onSend,onClose}){
const [msg,setMsg]=useState("");
return(
<div style={{position:"fixed",inset:0,background:"rgba(230,57,70,0.15)",backdropFilter:"b
<div className="scale-in" style={{background:"var(--s1)",borderRadius:20,padding:28,wid
<div style={{textAlign:"center",marginBottom:16}}>
<div style={{fontSize:40,marginBottom:8}}> </div>
<div className="serif" style={{fontSize:22,fontWeight:700,color:"#e63946"}}>Mode Ur
<div style={{fontSize:13,color:"var(--t2)",marginTop:4}}>Toute l'équipe sera </div>
<textarea className="field" value={msg} onChange={e=>setMsg(e.target.value)}
placeholder="Décrivez l'urgence... Ex: Bris réfrigérateur boucherie, appeler rows={3} style={{resize:"none",borderColor:"rgba(230,57,70,0.3)",marginBottom:14}}
<div style={{display:"flex",gap:10}}>
<button className="btn btn-ghost" onClick={onClose} style={{flex:1,padding:"13px",b
<button className="btn" onClick={()=>{if(!msg.trim()){alert("Décrivez l'urgence");r
style={{flex:2,padding:"13px",borderRadius:12,fontSize:14,fontWeight:800,backgrou
Alerter l'équipe
</button>
</div>
</div>
</div>
techni
);
}
// ─── SCHEDULE TAB ─────────────────────────────────────────────────
function ScheduleTab({schedules,scheduleDepts,me,isOwner,onAdd,onDelete,onAddDept,onRemoveDep
const [selectedDept,setSelectedDept] = useState(scheduleDepts[0]||"");
const [label,setLabel] = useState("");
const [showAdd,setShowAdd] = useState(false);
const [selectedPhoto,setSelectedPhoto] = useState(null);
const [showManage,setShowManage] = useState(false);
const [newDeptName,setNewDeptName] = useState("");
const [renamingDept,setRenamingDept] = useState(null);
const [renameVal,setRenameVal] = useState("");
const fileRef = useRef();
// Keep selectedDept valid
useEffect(()=>{ if(!scheduleDepts.includes(selectedDept)&&scheduleDepts.length>0) setSelect
const handleFile = e => {
const f=e.target.files[0]; if(!f) return;
const r=new FileReader();
r.onload=ev=>{ onAdd(selectedDept, label||"Semaine du "+new Date().toLocaleDateString("fr
r.readAsDataURL(f);
};
const deptSchedules = schedules[selectedDept]||[];
return(
<div style={{padding:"20px 16px",display:"flex",flexDirection:"column",gap:16}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
<div><div className="tag" style={{marginBottom:4}}>HORAIRES</div><div className="seri
<div style={{display:"flex",gap:8}}>
{isOwner&&<button className="btn btn-ghost" onClick={()=>setShowManage(p=>!p)} styl
<button className="btn btn-gold" onClick={()=>setShowAdd(true)} style={{padding:"9p
</div>
</div>
{/* MANAGE DEPTS PANEL */}
{showManage&&isOwner&&(
<div className="card" style={{padding:"16px",display:"flex",flexDirection:"column",ga
<div className="tag">GÉRER LES DÉPARTEMENTS</div>
<div style={{display:"flex",flexDirection:"column",gap:6}}>
{scheduleDepts.map(d=>(
<div key={d} style={{display:"flex",alignItems:"center",gap:8}}>
{renamingDept===d
? <>
<input className="field" value={renameVal} onChange={e=>setRenameVal(e.
onKeyDown={e=>{if(e.key==="Enter"){onRenameDept(d,renameVal);setRenam
<button className="btn btn-gold" onClick={()=>{onRenameDept(d,renameVal
<button className="btn btn-ghost" onClick={()=>setRenamingDept(null)} s
</>
: <>
<div style={{flex:1,fontSize:13,color:"var(--text)",fontWeight:500}}>{d
<button className="btn btn-ghost" onClick={()=>{setRenamingDept(d);setR
<button className="btn btn-danger" onClick={()=>{if(window.confirm(`Sup
</>
}
</div>
))}
</div>
<div style={{display:"flex",gap:8,marginTop:4}}>
<input className="field" value={newDeptName} onChange={e=>setNewDeptName(e.target
onKeyDown={e=>{if(e.key==="Enter"){onAddDept(newDeptName);setNewDeptName("");}}
<button className="btn btn-gold" onClick={()=>{onAddDept(newDeptName);setNewDeptN
</div>
</div>
)}
{/* DEPT SELECTOR */}
{scheduleDepts.length>0
? <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>
{scheduleDepts.map(d=>{
const count=(schedules[d]||[]).length;
return(
<button key={d} className="btn" onClick={()=>setSelectedDept(d)}
style={{padding:"7px 13px",borderRadius:20,fontSize:12,whiteSpace:"nowrap",
background:selectedDept===d?"var(--gold)":"var(--s2)",
color:selectedDept===d?"#0a0a0d":"var(--t2)",
border:"1px solid var(--border)"}}>
{d}{count>0&&<span style={{marginLeft:5,background:selectedDept===d?"rgba(0
</button>
);
})}
</div>
: <div style={{textAlign:"center",padding:"20px",color:"var(--t3)",fontSize:13}}>
Aucun département — cliquez sur ⚙ Gérer pour en ajouter
</div>
}
{/* ADD FORM */}
{showAdd&&selectedDept&&(
<div className="card" style={{padding:"16px",display:"flex",flexDirection:"column",ga
<div className="tag">AJOUTER — {selectedDept.toUpperCase()}</div>
<input className="field" value={label} onChange={e=>setLabel(e.target.value)}
placeholder={`Ex: Semaine du ${new Date().toLocaleDateString("fr-CA",{day:"numeri
<input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{dis
<div style={{display:"flex",gap:8}}>
<button className="btn btn-gold" onClick={()=>fileRef.current?.click()} style={{f
<button className="btn btn-ghost" onClick={()=>setShowAdd(false)} style={{flex:1,
</div>
</div>
)}
{/* SCHEDULES LIST */}
{selectedDept&&(
deptSchedules.length===0
? <div style={{textAlign:"center",padding:"48px 20px",color:"var(--t3)"}}>
<div style={{fontSize:32,marginBottom:10}}> </div>
<div style={{fontSize:14,marginBottom:16}}>Aucun horaire pour {selectedDept}</d
<button className="btn btn-gold" onClick={()=>setShowAdd(true)} style={{padding
</div>
: <div style={{display:"flex",flexDirection:"column",gap:12}}>
{deptSchedules.map(s=>(
<div key={s.id} className="card" style={{overflow:"hidden"}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"cent
<div>
<div style={{fontSize:14,fontWeight:600,color:"var(--text)"}}>{s.label}
<div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>{new Date(s.ts
</div>
{isOwner&&<button className="btn btn-danger" onClick={()=>onDelete(select
</div>
{s.photo
? <div onClick={()=>setSelectedPhoto(s.photo)} style={{cursor:"zoom-in"}}
<img src={s.photo} alt={s.label} style={{width:"100%",maxHeight:300,o
<div style={{padding:"8px 14px",fontSize:11,color:"var(--t3)",textAli
</div>
: <div style={{padding:"20px",textAlign:"center",color:"var(--t3)",fontSi
}
</div>
))}
</div>
)}
{/* PHOTO VIEWER */}
{selectedPhoto&&(
<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.95)",zIndex:100,displa
<img src={selectedPhoto} alt="" style={{maxWidth:"100%",maxHeight:"90vh",objectFit:
<button className="btn" onClick={()=>setSelectedPhoto(null)} style={{position:"abso
</div>
)}
</div>
);
}
// ─── NOTES TAB ────────────────────────────────────────────────────
function NotesTab({notes,me,onSave}){
const myNotes = notes[me.id]||"";
const [text,setText] = useState(myNotes);
const [saved,setSaved] = useState(true);
useEffect(()=>{ setText(notes[me.id]||""); setSaved(true); },[me.id,notes]);
const handleChange = val => { setText(val); setSaved(false); };
const handleSave = () => { onSave(me.id,text); setSaved(true); };
return(
<div style={{padding:"20px 16px",display:"flex",flexDirection:"column",gap:16,height:"cal
<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
<div>
<div className="tag" style={{marginBottom:4}}>PRIVÉ</div>
<div className="serif" style={{fontSize:22,fontWeight:700,color:"var(--gold)"}}>Mes
</div>
<div style={{display:"flex",alignItems:"center",gap:10}}>
{!saved&&<span style={{fontSize:11,color:"var(--t3)"}}>Non sauvegardé</span>}
<button className="btn btn-gold" onClick={handleSave} style={{padding:"9px 16px",bo
{saved?"✓ Sauvegardé":"Sauvegarder"}
</button>
</div>
</div>
<div className="card" style={{padding:"6px",flex:1,display:"flex",flexDirection:"column
<textarea
value={text}
onChange={e=>handleChange(e.target.value)}
placeholder={"Vos notes privées...\n\nSeul vous pouvez voir ces notes. Idéal style={{flex:1,width:"100%",background:"transparent",border:"none",outline:"none",p
pour :
/>
</div>
<div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"v
<div style={{width:8,height:8,borderRadius:"50%",background:"var(--gold)",flexShrink:
<div style={{fontSize:12,color:"var(--t2)"}}>Ces notes sont <strong style={{color:"va
</div>
</div>
);
}
// ─── TRANSLATIONS ─────────────────────────────────────────────────
const TRANSLATIONS = {
fr: {
home:"ACCUEIL", tasks:"TÂCHES", tour:"TOURNÉE", team:"ÉQUIPE",
schedule:"HORAIRE", gallery:"GALERIE", notes:"NOTES", comm:"COMM", stats:"STATS",
newTask:"Nouvelle tâche", publish:"Publier la tâche", save:"Sauvegarder",
cancel:"Annuler", delete:"Supprimer", archive:"Archiver", close:"Fermer",
newUrgentTask:"Tâche urgente", startTour:"Démarrer tournée",
announce:"Annonce", myNotes:"Mes notes",
folderCreated:"Dossier créé !", photoAdded:"Photo ajoutée !",
deleted:"Supprimé", saved:"Sauvegardé",
gallery_title:"Galerie", allPhotos:"Toutes les photos",
noPhotos:"Aucune photo", addPhoto:"Ajouter une photo",
createFolder:"Créer un dossier", folderName:"Nom du dossier",
settings:"Paramètres", language:"Langue", theme:"Couleur principale",
appearance:"Apparence", darkMode:"Mode sombre",
},
en: {
home:"HOME", tasks:"TASKS", tour:"ROUNDS", team:"TEAM",
schedule:"SCHEDULE", gallery:"GALLERY", notes:"NOTES", comm:"COMM", stats:"STATS",
newTask:"New task", publish:"Publish task", save:"Save",
cancel:"Cancel", delete:"Delete", archive:"Archive", close:"Close",
newUrgentTask:"Urgent task", startTour:"Start round",
announce:"Announce", myNotes:"My notes",
folderCreated:"Folder created!", photoAdded:"Photo added!",
deleted:"Deleted", saved:"Saved",
gallery_title:"Gallery", allPhotos:"All photos",
noPhotos:"No photos", addPhoto:"Add photo",
createFolder:"Create folder", folderName:"Folder name",
settings:"Settings", language:"Language", theme:"Main color",
appearance:"Appearance", darkMode:"Dark mode",
},
};
const T = (lang, key) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS.fr[key] || key;
// ─── SETTINGS MODAL ───────────────────────────────────────────────
const THEME_COLORS = [
{color:"#C9A84C", label:"Or (défaut)"},
{color:"#e63946", label:"Rouge IGA"},
{color:"#3b82f6", label:"Bleu"},
{color:"#2a9d8f", label:"Vert"},
{color:"#8b5cf6", label:"Violet"},
{color:"#ec4899", label:"Rose"},
{color:"#f4a261", label:"Orange"},
{color:"#6b7280", label:"Gris"},
];
function SettingsModal({lang,setLang,themeColor,setThemeColor,dark,setDark,onClose}){
return(
<div className="overlay" onClick={onClose}>
<div className="sheet slide-up" onClick={e=>e.stopPropagation()}>
<div className="handle"/>
<div style={{padding:"4px 18px 32px",display:"flex",flexDirection:"column",gap:20}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<div className="serif" style={{fontSize:20,fontWeight:700,color:"var(--text)"}}>⚙
<button className="btn btn-outline" onClick={onClose} style={{width:32,height:32,
</div>
{/* LANGUAGE */}
<div>
<div className="tag" style={{marginBottom:10}}>{T(lang,"language")}</div>
<div style={{display:"flex",gap:8}}>
{[{id:"fr",label:" Français"},{id:"en",label:" English"}].map(l=>(
<button key={l.id} className="btn" onClick={()=>setLang(l.id)}
style={{flex:1,padding:"13px",borderRadius:13,fontSize:14,fontWeight:700,
background:lang===l.id?"var(--gold)":"var(--s2)",
color:lang===l.id?"#0a0a0d":"var(--t2)",
border:`1px solid ${lang===l.id?"transparent":"var(--border)"}`}}>
{l.label}
</button>
))}
</div>
</div>
{/* DARK MODE */}
<div>
<div className="tag" style={{marginBottom:10}}>{T(lang,"appearance")}</div>
<div style={{display:"flex",gap:8}}>
{[{id:true,label:" "+(lang==="en"?"Dark":"Sombre")},{id:false,label:"☀ <button key={String(m.id)} className="btn" onClick={()=>setDark(m.id)}
style={{flex:1,padding:"13px",borderRadius:13,fontSize:14,fontWeight:700,
background:dark===m.id?"var(--gold)":"var(--s2)",
color:dark===m.id?"#0a0a0d":"var(--t2)",
border:`1px solid ${dark===m.id?"transparent":"var(--border)"}`}}>
{m.label}
</button>
"+(lan
))}
</div>
</div>
{/* THEME COLOR */}
<div>
<div className="tag" style={{marginBottom:10}}>{T(lang,"theme")}</div>
<div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
{THEME_COLORS.map(({color,label})=>(
<button key={color} className="btn" onClick={()=>setThemeColor(color)} style={{width:44,height:44,borderRadius:12,background:color,
border:themeColor===color?"3px solid var(--text)":"3px solid transparent"
title=
flexShrink:0,boxShadow:themeColor===color?`0 0 12px ${color}60`:"none"}}>
{themeColor===color&&<span style={{fontSize:18,color:"white",textShadow:"0
</button>
))}
</div>
<div style={{marginTop:12,padding:"12px 14px",background:"var(--s2)",borderRadius
<div style={{width:28,height:28,borderRadius:8,background:themeColor,flexShrink
<div style={{fontSize:13,color:"var(--t2)"}}>Couleur sélectionnée — visible dan
</div>
</div>
</div>
</div>
</div>
);
}
// ─── GALLERY TAB ──────────────────────────────────────────────────
function GalleryTab({gallery,allAppPhotos,me,getUser,lang,onCreateFolder,onDeleteFolder,onAdd
const [selectedFolder,setSelectedFolder] = useState(null); // null = all photos view
const [viewMode,setViewMode] = useState("grid"); // grid | list
const [showNewFolder,setShowNewFolder] = useState(false);
const [newFolderName,setNewFolderName] = useState("");
const [renamingId,setRenamingId] = useState(null);
const [renameVal,setRenameVal] = useState("");
const [caption,setCaption] = useState("");
const [selectedPhoto,setSelectedPhoto] = useState(null);
const fileRef = useRef();
const handleFile = e => {
const f=e.target.files[0]; if(!f) return;
const r=new FileReader();
r.onload=ev=>{ onAddPhoto(selectedFolder,ev.target.result,caption||"Sans titre"); setCapt
r.readAsDataURL(f);
};
const currentFolder = gallery.find(f=>f.id===selectedFolder);
const displayPhotos = selectedFolder===0 ? allAppPhotos : (currentFolder?.photos||[]);
return(
<div style={{padding:"20px 16px",display:"flex",flexDirection:"column",gap:16}}>
{/* HEADER */}
<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
<div>
<div className="tag" style={{marginBottom:4}}>{T(lang,"gallery_title").toUpperCase(
<div className="serif" style={{fontSize:22,fontWeight:700,color:"var(--gold)"}}>
{selectedFolder===null ? T(lang,"gallery_title") : selectedFolder===0 ? T(lang,"a
</div>
</div>
<div style={{display:"flex",gap:7}}>
{selectedFolder!==null&&(
<button className="btn btn-ghost" onClick={()=>setSelectedFolder(null)} style={{p
)}
{selectedFolder!==null&&selectedFolder!==0&&(
<button className="btn btn-gold" onClick={()=>fileRef.current?.click()} style={{p
)}
</div>
</div>
{/* FOLDERS VIEW */}
{selectedFolder===null&&(
<>
{/* ALL PHOTOS SHORTCUT */}
<div className="card card-tap" onClick={()=>setSelectedFolder(0)}
style={{padding:"14px 16px",display:"flex",alignItems:"center",gap:12,borderLeft:
<div style={{width:48,height:48,borderRadius:12,background:"var(--gold-dim)",disp
<div style={{flex:1}}>
<div style={{fontSize:14,fontWeight:600,color:"var(--text)"}}>{T(lang,"allPhoto
<div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>{allAppPhotos.length}
</div>
<div style={{color:"var(--t3)",fontSize:18}}>›</div>
</div>
{/* CREATE FOLDER */}
{showNewFolder
? <div className="card" style={{padding:"14px",display:"flex",gap:8}}>
<input className="field" value={newFolderName} onChange={e=>setNewFolderName(
placeholder={T(lang,"folderName")+"..."} autoFocus
onKeyDown={e=>{if(e.key==="Enter"){onCreateFolder(newFolderName);setNewFold
style={{flex:1,padding:"10px 13px",fontSize:14}}/>
<button className="btn btn-gold" onClick={()=>{onCreateFolder(newFolderName);
<button className="btn btn-ghost" onClick={()=>setShowNewFolder(false)} style
</div>
: <button className="btn btn-ghost" onClick={()=>setShowNewFolder(true)} style={{
+ {T(lang,"createFolder")}
</button>
}
{/* FOLDER LIST */}
<div style={{display:"flex",flexDirection:"column",gap:10}}>
{gallery.map(folder=>{
const preview=folder.photos.slice(0,3);
return(
<div key={folder.id} className="card card-tap" onClick={()=>setSelectedFolder
style={{padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
{/* PREVIEW THUMBNAILS */}
<div style={{display:"flex",gap:3,flexShrink:0}}>
{preview.length>0
? preview.map((p,i)=><img key={i} src={p.photo} alt="" style={{width:i=
: <div style={{width:48,height:48,borderRadius:12,background:"var(--s2)
}
</div>
<div style={{flex:1,minWidth:0}}>
{renamingId===folder.id
? <input className="field" value={renameVal} onChange={e=>setRenameVal(
onKeyDown={e=>{if(e.key==="Enter"){onRenameFolder(folder.id,renameV
style={{padding:"7px 10px",fontSize:13}} autoFocus/>
: <div style={{fontSize:14,fontWeight:600,color:"var(--text)",overflow:
}
<div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>{folder.photos.l
</div>
<div style={{display:"flex",gap:6}} onClick={e=>e.stopPropagation()}>
<button className="btn btn-ghost" onClick={()=>{setRenamingId(folder.id);
<button className="btn btn-danger" onClick={()=>onDeleteFolder(folder.id)
</div>
</div>
);
})}
</div>
{gallery.length===0&&<div style={{textAlign:"center",padding:"32px",color:"var(--
</>
)}
{/* PHOTOS VIEW */}
{selectedFolder!==null&&(
<>
{/* VIEW TOGGLE */}
<div style={{display:"flex",gap:6}}>
{[{id:"grid",icon:"⊞"},{id:"list",icon:"☰"}].map(v=>(
<button key={v.id} className="btn" onClick={()=>setViewMode(v.id)}
style={{flex:1,padding:"9px",borderRadius:11,fontSize:18,
background:viewMode===v.id?"var(--gold)":"var(--s2)",
color:viewMode===v.id?"#0a0a0d":"var(--t2)",
border:"1px solid var(--border)"}}>
{v.icon}
</button>
))}
</div>
{/* ADD PHOTO (manual folders only) */}
{selectedFolder!==0&&(
<>
<input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={
<div style={{display:"flex",gap:8}}>
<input className="field" value={caption} onChange={e=>setCaption(e.target.val
<button className="btn btn-gold" onClick={()=>fileRef.current?.click()} style
</div>
</>
)}
{displayPhotos.length===0
? <div style={{textAlign:"center",padding:"48px 20px",color:"var(--t3)"}}>
<div style={{fontSize:32,marginBottom:10}}> </div>
<div style={{fontSize:14}}>{T(lang,"noPhotos")}</div>
</div>
: viewMode==="grid"
? <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
{displayPhotos.map((p,i)=>(
<div key={p.id||i} style={{position:"relative",borderRadius:10,overflow:"
<img src={p.photo} alt={p.caption||""} style={{width:"100%",height:"100
</div>
))}
</div>
: <div style={{display:"flex",flexDirection:"column",gap:8}}>
{displayPhotos.map((p,i)=>(
<div key={p.id||i} className="card card-tap" onClick={()=>setSelectedPhot
<img src={p.photo} alt="" style={{width:56,height:56,borderRadius:10,ob
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:13,fontWeight:600,color:"var(--text)",overflow:
{p.source&&<div style={{fontSize:11,color:"var(--gold)",marginTop:2}}
<div style={{fontSize:11,color:"var(--t3)",marginTop:1}}>{ago(p.ts||D
</div>
{selectedFolder!==0&&p.id&&(
<button className="btn btn-danger" onClick={e=>{e.stopPropagation();o
)}
</div>
))}
</div>
}
</>
)}
{/* PHOTO FULLSCREEN */}
{selectedPhoto&&(
<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.95)",zIndex:100,displa
<img src={selectedPhoto.photo} alt="" style={{maxWidth:"100%",maxHeight:"80vh",obje
{selectedPhoto.caption&&<div style={{marginTop:14,fontSize:14,color:"rgba(255,255,2
{selectedPhoto.source&&<div style={{fontSize:12,color:"rgba(255,255,255,0.4)",margi
<button className="btn" onClick={()=>setSelectedPhoto(null)} style={{position:"abso
</div>
)}
</div>
);
}
// ─── SHIFT REPORT MODAL ───────────────────────────────────────────
function ShiftReportModal({me,onSave,onClose}){
const [form,setForm] = useState({
shift: SHIFTS[0], date: todayStr(),
traffic:"moyen", rating:4, incidents:"", highlights:"", notes:""
});
const set = k => v => setForm(p=>({...p,[k]:v}));
return(
<div className="overlay" onClick={onClose}>
<div className="sheet slide-up" onClick={e=>e.stopPropagation()}>
<div className="handle"/>
<div style={{padding:"4px 18px 12px",borderBottom:"1px solid var(--border)",flexShrin
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marg
<div className="serif" style={{fontSize:20,fontWeight:700,color:"var(--text)"}}>
<button className="btn btn-outline" onClick={onClose} style={{width:32,height:32,
</div>
<button className="btn btn-gold" onClick={()=>onSave({...form,doneBy:me.name})} sty
Soumettre le rapport
</button>
</div>
<div style={{overflowY:"auto",flex:1,padding:"16px 18px 32px",display:"flex",flexDire
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
<FL label="QUART">
<select className="field" value={form.shift} onChange={e=>set("shift")(e.target
{SHIFTS.map(s=><option key={s} value={s}>{s}</option>)}
</select>
</FL>
<FL label="DATE">
<input type="date" className="field" value={form.date} onChange={e=>set("date")
</FL>
</div>
<FL label="ACHALANDAGE">
<div style={{display:"flex",gap:8}}>
{[{id:"faible",label:" Faible"},{id:"moyen",label:" Moyen"},{id:"fort",labe
<button key={t.id} className="btn" onClick={()=>set("traffic")(t.id)}
style={{flex:1,padding:"12px",borderRadius:12,fontSize:13,fontWeight:600,
background:form.traffic===t.id?"var(--gold)":"var(--s2)",
color:form.traffic===t.id?"#0a0a0d":"var(--t2)",
border:"1px solid var(--border)"}}>
{t.label}
</button>
))}
</div>
</FL>
<FL label="NOTE GÉNÉRALE DU SHIFT">
<div style={{display:"flex",gap:8,justifyContent:"center"}}>
{[1,2,3,4,5].map(n=>(
<button key={n} className="btn" onClick={()=>set("rating")(n)}
style={{width:50,height:50,borderRadius:12,fontSize:20,
background:form.rating>=n?"var(--gold)":"var(--s2)",
color:form.rating>=n?"#0a0a0d":"var(--t3)",
border:"1px solid var(--border)"}}>
★
</button>
))}
</div>
<div style={{textAlign:"center",fontSize:13,color:"var(--gold)",marginTop:6,fontW
{["","Très difficile","Difficile","Correct","Bien","Excellent !"][form.rating]}
</div>
</FL>
<FL label="POINTS POSITIFS">
<textarea className="field" value={form.highlights} onChange={e=>set("highlights"
placeholder="Ex: Bonne équipe aujourd'hui, livraison à l'heure..." rows={2} sty
</FL>
<FL label="INCIDENTS / PROBLÈMES">
<textarea className="field" value={form.incidents} onChange={e=>set("incidents")(
placeholder="Ex: Bris d'équipement, conflit client, manque de stock..." rows={2
</FL>
<FL label="NOTES ADDITIONNELLES">
<textarea className="field" value={form.notes} onChange={e=>set("notes")(e.target
placeholder="Autres observations..." rows={2} style={{resize:"none"}}/>
</FL>
</div>
</div>
</div>
);
}
// ─── TEMPLATES MODAL ──────────────────────────────────────────────
function TemplatesModal({templates,onApply,onClose,lang}){
const [selected,setSelected] = useState(null);
return(
<div className="overlay" onClick={onClose}>
<div className="sheet slide-up" onClick={e=>e.stopPropagation()}>
<div className="handle"/>
<div style={{padding:"4px 18px 32px",display:"flex",flexDirection:"column",gap:14}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<div className="serif" style={{fontSize:20,fontWeight:700,color:"var(--text)"}}>
<button className="btn btn-outline" onClick={onClose} style={{width:32,height:32,
</div>
<div style={{fontSize:13,color:"var(--t2)",lineHeight:1.5}}>Applique un template po
<div style={{display:"flex",flexDirection:"column",gap:10}}>
{templates.map((t,i)=>(
<div key={i} className="card" style={{padding:"14px",borderColor:selected===i?"
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center
<div style={{fontSize:15,fontWeight:700,color:"var(--text)"}}>{t.name}</div
<div style={{display:"flex",alignItems:"center",gap:8}}>
<span style={{fontSize:11,color:"var(--t3)"}}>{t.tasks.length} tâches</sp
<span style={{color:"var(--t3)",fontSize:16}}>{selected===i?"▲":"▼"}</spa
</div>
</div>
{selected===i&&(
<>
<div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}
{t.tasks.map((task,j)=>{
const p=PRIORITIES.find(pr=>pr.id===task.priority);
return(
<div key={j} style={{display:"flex",alignItems:"center",gap:8,paddi
<div style={{width:6,height:6,borderRadius:"50%",background:p?.co
<span style={{fontSize:13,color:"var(--text)",flex:1}}>{task.titl
<span style={{fontSize:10,color:"var(--t3)"}}>{task.department}</
</div>
);
})}
</div>
<button className="btn btn-gold" onClick={()=>onApply(t)} style={{width:"
Appliquer ce template
</button>
</>
)}
</div>
))}
</div>
</div>
</div>
</div>
);
}
// ─── GLOBAL SEARCH MODAL ──────────────────────────────────────────
function GlobalSearchModal({query,setQuery,tasks,events,announcements,notes,me,getUser,getPri
const q = query.toLowerCase().trim();
const results = q.length<2 ? [] : [
...tasks.filter(t=>t.title?.toLowerCase().includes(q)||t.description?.toLowerCase().inclu
...events.filter(e=>e.title?.toLowerCase().includes(q)||e.description?.toLowerCase().incl
...(announcements||[]).filter(a=>a.text?.toLowerCase().includes(q)).map(a=>({type:"announ
];
return(
<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(
<div onClick={e=>e.stopPropagation()} style={{background:"var(--s1)",borderBottom:"1px
<div style={{color:"var(--t3)"}}>
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" s
</div>
<input autoFocus value={query} onChange={e=>setQuery(e.target.value)}
placeholder="Chercher partout — tâches, événements, annonces..."
style={{flex:1,background:"transparent",border:"none",outline:"none",fontSize:16,co
<button className="btn" onClick={onClose} style={{background:"var(--s2)",border:"1px
</div>
<div style={{flex:1,overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"
{q.length<2
? <div style={{textAlign:"center",padding:"48px 20px",color:"var(--t3)",fontSize:14
: results.length===0
? <div style={{textAlign:"center",padding:"48px 20px",color:"var(--t3)",fontSize:
: results.map((r,i)=>(
<div key={i} className="card card-tap" onClick={()=>r.type==="task"&&onTask(r
style={{padding:"13px 14px",borderLeft:`3px solid ${r.color}`,display:"flex
<div style={{fontSize:18,flexShrink:0}}>
{r.type==="task"?" ":r.type==="event"?" ":" "}
</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:14,fontWeight:600,color:"var(--text)",overflow:"hid
<div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>{r.sub}</div>
</div>
<div style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:10,b
{r.type==="task"?"Tâche":r.type==="event"?"Événement":"Annonce"}
</div>
</div>
))
}
</div>
</div>
);
}
// ─── UPDATE NOTIFS MODAL with clear all ───────────────────────────
// (override the existing NotifsModal)
function NotifsModalV2({notifs,onClose,onClearAll,onMarkAllRead}){
const typeColor=t=>t==="done"?"#2a9d8f":t==="reminder"?"#e63946":t==="mention"?"#8b5cf6":t=
const typeLabel=t=>t==="done"?"Complété":t==="reminder"?"Rappel":t==="mention"?"Mention":t=
return(
<div className="overlay" onClick={onClose}>
<div className="sheet slide-up" onClick={e=>e.stopPropagation()} style={{maxHeight:"75v
<div className="handle"/>
<div style={{padding:"4px 18px 10px",borderBottom:"1px solid var(--border)",display:"
<div className="serif" style={{fontSize:20,fontWeight:700,color:"var(--text)"}}>Not
<div style={{display:"flex",gap:8}}>
{notifs.length>0&&<button className="btn btn-ghost" onClick={onMarkAllRead} style
{notifs.length>0&&<button className="btn btn-danger" onClick={onClearAll} style={
<button className="btn btn-outline" onClick={onClose} style={{width:32,height:32,
</div>
</div>
<div style={{overflowY:"auto",flex:1,padding:"12px 18px 32px",display:"flex",flexDire
{notifs.length===0
? <div style={{textAlign:"center",padding:"40px",color:"var(--t3)",fontSize:14}}>
<div style={{fontSize:32,marginBottom:10}}> </div>
Aucune notification
</div>
: notifs.map(n=>(
<div key={n.id} style={{display:"flex",gap:12,padding:"13px 14px",background:n.
<div style={{flex:1}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"cent
<div style={{fontSize:10,fontWeight:700,color:typeColor(n.type),letterSpa
{!n.read&&<div style={{width:6,height:6,borderRadius:"50%",background:"va
</div>
<div style={{fontSize:14,fontWeight:600,color:"var(--text)",marginBottom:2}
<div style={{fontSize:12,color:"var(--t2)",fontStyle:"italic",marginBottom:
<div style={{fontSize:11,color:"var(--t3)"}}>{ago(n.ts)}</div>
</div>
</div>
))
}
</div>
</div>
</div>
);
}
function AccountMenuModal({me,users,isOwner,onSwitchUser,onSettings,onStoreProfile,onExportPD
const [showSwitch,setShowSwitch] = useState(false);
return(
<div className="overlay" onClick={onClose}>
<div className="sheet slide-up" onClick={e=>e.stopPropagation()}>
<div className="handle"/>
<div style={{padding:"4px 18px 32px",display:"flex",flexDirection:"column",gap:10}}>
<div style={{display:"flex",alignItems:"center",gap:14,padding:"16px",background:"v
<div style={{width:48,height:48,borderRadius:13,background:me.color,display:"flex
<div>
<div className="serif" style={{fontSize:17,fontWeight:700,color:"var(--text)"}}
<div style={{fontSize:12,color:"var(--t2)"}}>{me.role}</div>
</div>
</div>
{[
{icon:" ", label:"Recherche globale", action:onSearch},
{icon:"⚙", label:"Paramètres", action:onSettings},
...(isOwner?[{icon:" ", label:"Profil du magasin", action:onStoreProfile}]:[]),
{icon:" ", label:"Exporter en PDF", action:onExportPDF},
{icon:" ", label:"Alerte urgence (SOS)", action:onSOS, danger:true},
].map(item=>(
<button key={item.label} className="btn" onClick={item.action}
style={{width:"100%",padding:"14px 16px",borderRadius:13,justifyContent:"flex-s
background:item.danger?"rgba(230,57,70,0.08)":"var(--s2)",
border:item.danger?"1px solid rgba(230,57,70,0.2)":"1px solid var(--border)",
color:item.danger?"#e63946":"var(--text)",fontSize:14,fontWeight:600}}>
<span style={{fontSize:18}}>{item.icon}</span>
{item.label}
</button>
))}
<button className="btn" onClick={()=>setShowSwitch(p=>!p)}
style={{width:"100%",padding:"14px 16px",borderRadius:13,justifyContent:"flex-sta
background:"var(--gold-dim)",border:"1px solid var(--gold-b)",color:"var(--gold
<span style={{fontSize:18}}> </span>
Changer de compte
<span style={{marginLeft:"auto"}}>{showSwitch?"▲":"▼"}</span>
</button>
{showSwitch&&(
<div style={{display:"flex",flexDirection:"column",gap:7,paddingLeft:8}}>
{users.map(u=>(
<button key={u.id} className="btn" onClick={()=>onSwitchUser(u)}
style={{padding:"11px 14px",borderRadius:12,
background:me.id===u.id?"var(--gold-dim)":"var(--s2)",
border:me.id===u.id?"1px solid var(--gold-b)":"1px solid var(--border)",
display:"flex",alignItems:"center",gap:10,width:"100%",justifyContent:"fl
<div style={{width:32,height:32,borderRadius:9,background:u.color,display:"
<div style={{textAlign:"left",flex:1}}>
<div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{u.name}</d
<div style={{fontSize:11,color:"var(--t2)"}}>{u.role}</div>
</div>
{me.id===u.id&&<span style={{fontSize:11,color:"var(--gold)",fontWeight:700
</button>
))}
</div>
)}
</div>
</div>
</div>
}
);
