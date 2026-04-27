import { useState, useRef, useEffect, useCallback } from "react";

const SURL = "https://sbokqrubrarsngkhuxwt.supabase.co";
const SKEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNib2txcnVicmFyc25na2h1eHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMjAwMDAsImV4cCI6MjA5Mjc5NjAwMH0.hWCE9C0__HpvP3TRru7l8rAME314c9-i2xj_XS9h2Bc";
const H = { apikey:SKEY, Authorization:`Bearer ${SKEY}`, "Content-Type":"application/json" };

const sb = {
  get: async (t, q="") => { const r = await fetch(`${SURL}/rest/v1/${t}?${q}&limit=500`, {headers:H}); return r.ok?r.json():[]; },
  insert: async (t, d) => { const r = await fetch(`${SURL}/rest/v1/${t}`, {method:"POST",headers:{...H,Prefer:"return=representation"},body:JSON.stringify(d)}); return r.ok?r.json():[]; },
  update: async (t, id, d) => { const r = await fetch(`${SURL}/rest/v1/${t}?id=eq.${id}`, {method:"PATCH",headers:{...H,Prefer:"return=representation"},body:JSON.stringify(d)}); return r.ok?r.json():[]; },
  del: async (t, id) => { await fetch(`${SURL}/rest/v1/${t}?id=eq.${id}`, {method:"DELETE",headers:H}); },
  upsert: async (t, d, on) => { const r = await fetch(`${SURL}/rest/v1/${t}`, {method:"POST",headers:{...H,Prefer:`resolution=merge-duplicates,return=representation`},body:JSON.stringify(d)}); return r.ok?r.json():[]; },
};

// ─── CONSTANTS ────────────────────────────────────────────────────
const DEPARTMENTS = ["Vestibule","Épicerie","Fruits & Légumes","PAM","Boulangerie","Viande","Poisson","Service","Charcuterie"];
const PRIORITY_LABELS = ["Critique","Élevée","Normale","Faible"];
const PRIORITY_IDS    = ["urgent","high","normal","low"];
const getPriorities = (c="#C9A84C") => PRIORITY_IDS.map((id,i)=>({
  id, label:PRIORITY_LABELS[i], color:c, bg:`${c}18`, border:`${c}35`
}));
const PRIORITIES = getPriorities();
// STATUS_META is now dynamic — generated via getStatusMeta(themeColor)
const getStatusMeta = (c="#C9A84C") => ({
  todo:       { label:"À faire",  color:c, bg:`${c}18`, border:`${c}40` },
  inprogress: { label:"En cours", color:c, bg:`${c}18`, border:`${c}40` },
  done:       { label:"Complété", color:c, bg:`${c}18`, border:`${c}40` },
});
const STATUS_META = getStatusMeta();
const RECURRENCE = [
  {id:"none",label:"Aucune"},{id:"daily",label:"Chaque jour"},
  {id:"weekly",label:"Chaque semaine"},{id:"monthly",label:"Chaque mois"},{id:"custom",label:"Jours spécifiques"},
];
const DAYS_SHORT = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
const COLORS = ["#C9A84C","#3b82f6","#2a9d8f","#e63946","#8b5cf6","#ec4899","#f4a261","#84cc16"];
const SHIFTS = ["Matin","Midi","Soir"];

// Default tour checklist per dept
const DEFAULT_TOUR_ITEMS = {
  base: ["Propreté générale","Allées / comptoir dégagé","Poubelles vidées","Affichage des prix en place"],
  "Vestibule":        ["Entrée propre et dégagée","Paniers disponibles et propres","Affichages promotionnels à jour"],
  "Épicerie":         ["Étalages bien garnis","Dates d'expiration vérifiées","Spéciaux bien identifiés"],
  "Fruits & Légumes": ["Produits frais et bien présentés","Retrait des produits abîmés","Brumisateur fonctionnel"],
  "PAM":              ["Comptoir propre","Stock suffisant","Ordonnances bien rangées"],
  "Boulangerie":      ["Produits frais du jour en place","Vitrine propre","Affichage des prix correct"],
  "Viande":           ["Comptoir réfrigéré à bonne temp.","Produits bien étiquetés et datés","Comptoir propre et sans odeur"],
  "Poisson":          ["Glace fraîche","Comptoir propre","Produits bien étiquetés"],
  "Service":          ["File d'attente gérée","Caisses propres","Sacs disponibles"],
  "Charcuterie":      ["Comptoir propre","Produits bien étiquetés","Stock suffisant en vitrine"],
};

const INIT_USERS = [
  { id:1, name:"Olivier", role:"Propriétaire", color:"#C9A84C", isOwner:true, pin:"1111" },
  { id:2, name:"Sophie Gagnon", role:"Dir. Adjointe", color:"#3b82f6", pin:"1111" },
  { id:3, name:"Kevin Lavoie", role:"Dir. Opérations", color:"#2a9d8f", pin:"1111" },
];

const INIT_TASKS = [];

const INIT_STORE = { name:"Mon IGA", number:"IGA-001", address:"123 rue Principale, Montréal", logo:null };

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
  return date.toLocaleDateString("fr-CA",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
};
const initials = name => name.trim().split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
const todayStr = () => new Date().toISOString().split("T")[0];
const nextDue = (rec, customDays) => { const n=new Date(); if(rec==="daily"){n.setDate(n.getDate()+1);} else if(rec==="weekly"){n.setDate(n.getDate()+7);} else if(rec==="monthly"){n.setMonth(n.getMonth()+1);} else if(rec==="custom"&&customDays?.length){const t=n.getDay();const s=[...customDays].sort((a,b)=>a-b);const nx=s.find(d=>d>t)??s[0];n.setDate(n.getDate()+(nx>t?nx-t:7-(t-nx)));} return n.toISOString().split("T")[0]; };

// ─── CSS ──────────────────────────────────────────────────────────
const makeCSS = (dark, themeColor="#C9A84C") => `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
html,body{height:100%;background:${dark?"#0a0a0d":"#f7f5f0"};}
body{font-family:'DM Sans',sans-serif;color:${dark?"#ede8df":"#1c1c1e"};}
.serif{font-family:'Cormorant Garamond',serif;}
::-webkit-scrollbar{width:3px;height:3px;}
::-webkit-scrollbar-thumb{background:${dark?"rgba(201,168,76,0.2)":"rgba(0,0,0,0.1)"};}
:root{
  --gold:${themeColor}; --gold-l:${themeColor}cc; --gold-dim:${themeColor}1a; --gold-b:${themeColor}44;
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
.card-tap{cursor:pointer;transition:transform .15s,opacity .15s;} .card-tap:active{transform:scale(0.975);opacity:0.85;}
.btn{display:flex;align-items:center;justify-content:center;gap:7px;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:600;transition:all .15s;-webkit-user-select:none;user-select:none;}
.btn:active{transform:scale(0.95);}
.btn-gold{background:linear-gradient(135deg,#C9A84C,#a8853b);color:#0a0a0d;border-radius:14px;box-shadow:0 4px 18px rgba(201,168,76,0.28);}
.btn-outline{background:transparent;border:1px solid var(--border);color:var(--t2);border-radius:12px;}
.btn-ghost{background:var(--s2);border:1px solid var(--border);color:var(--t2);border-radius:12px;}
.btn-danger{background:rgba(230,57,70,0.09);border:1px solid rgba(230,57,70,0.22);color:#e63946;border-radius:12px;}
.btn-ok{background:rgba(42,157,143,0.09);border:1px solid rgba(42,157,143,0.22);color:#2a9d8f;border-radius:12px;}
.btn-warn{background:rgba(244,162,97,0.09);border:1px solid rgba(244,162,97,0.22);color:#f4a261;border-radius:12px;}
.field{width:100%;background:var(--s2);border:1.5px solid var(--border);border-radius:12px;padding:13px 15px;color:var(--text);font-size:15px;outline:none;transition:border .2s,background .2s;font-family:'DM Sans',sans-serif;}
.field:focus{border-color:var(--gold-b);background:var(--gold-dim);}
.field::placeholder{color:var(--t3);}
option{background:${dark?"#141418":"#fff"};}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(5px);z-index:50;display:flex;flex-direction:column;justify-content:flex-end;}
.sheet{background:var(--s1);border-radius:22px 22px 0 0;display:flex;flex-direction:column;max-height:93vh;}
.handle{width:40px;height:4px;border-radius:2px;background:var(--border);margin:12px auto 2px;flex-shrink:0;}
.slide-up{animation:slideUp .28s cubic-bezier(.4,0,.2,1) both;}
@keyframes slideUp{from{opacity:0;transform:translateY(100%);}to{opacity:1;transform:translateY(0);}}
.fade-in{animation:fadeIn .3s ease both;}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
.scale-in{animation:scaleIn .2s cubic-bezier(.4,0,.2,1) both;}
@keyframes scaleIn{from{opacity:0;transform:scale(.94);}to{opacity:1;transform:scale(1);}}
.pill{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;letter-spacing:.3px;}
.tag{font-size:10px;font-weight:700;letter-spacing:1.8px;color:var(--t3);}
.gold-t{color:var(--gold);}
.nav-tab{display:flex;flex-direction:column;align-items:center;gap:3px;background:transparent;border:none;cursor:pointer;padding:6px 10px;border-radius:10px;font-family:'DM Sans',sans-serif;font-weight:600;font-size:9px;letter-spacing:.8px;transition:color .15s;}
.unread-dot{width:7px;height:7px;border-radius:50%;background:var(--gold);flex-shrink:0;box-shadow:0 0 5px rgba(201,168,76,0.5);}
.recur-tag{font-size:9px;font-weight:700;letter-spacing:.5px;color:var(--gold);background:var(--gold-dim);border:1px solid var(--gold-b);padding:2px 7px;border-radius:10px;}
.pin-tag{font-size:9px;font-weight:700;letter-spacing:.5px;color:#C9A84C;padding:2px 6px;border-radius:8px;background:rgba(201,168,76,0.15);border:1px solid rgba(201,168,76,0.3);}
.check-row{display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border-radius:12px;background:var(--s2);border:1px solid var(--border);cursor:pointer;transition:background .15s;}
.check-row:active{background:var(--gold-dim);}
input[type=date]::-webkit-calendar-picker-indicator,input[type=time]::-webkit-calendar-picker-indicator{filter:${dark?"invert(.4)":"invert(.6)"};}
`;

// ─── APP ──────────────────────────────────────────────────────────
export default function App() {
  const [ready, setReady] = useState(false);
  const [joinRequests, setJoinRequests] = useState([]);
  const [loginUser, setLoginUser] = useState(null); // null = show user picker
  const [dark, setDark]           = useState(true);
  const [lang, setLang]           = useState("fr");
  const [themeColor, setThemeColor] = useState("#C9A84C");
  const [gallery, setGallery] = useState([]);
  const [users, setUsers]         = useState(INIT_USERS);
  const [tasks, setTasks]         = useState(INIT_TASKS);
  const [store, setStore]         = useState(INIT_STORE);
  const [tourConfig, setTourConfig] = useState(INIT_TOUR_CONFIG);
  const [tourHistory, setTourHistory] = useState([]);
  const [events, setEvents] = useState([
    { id:1, title:"Réunion direction", description:"Bilan de la semaine et objectifs", date:"2026-04-28", startTime:"08:00", endTime:"09:00", members:[1,2,3], color:"#3b82f6", category:"Rencontre direction", recurrence:"weekly", customDays:[], reminder:"60", createdBy:1 },
    { id:2, title:"Visite représentant Loblaws", description:"Présentation nouvelles promotions", date:"2026-04-30", startTime:"10:00", endTime:"11:30", members:[1,2], color:"#e63946", category:"Rencontre représentant", recurrence:"none", customDays:[], reminder:"1440", createdBy:1 },
    { id:3, title:"Inventaire mensuel", description:"Inventaire complet tous départements", date:"2026-04-29", startTime:"07:00", endTime:"12:00", members:[1,2,3], color:"#f4a261", category:"Inventaire", recurrence:"monthly", customDays:[], reminder:"1440", createdBy:1 },
  ]);
  const [announcements, setAnnouncements] = useState([]);
  const [showUrgency, setShowUrgency]   = useState(false);
  const [shiftReports, setShiftReports] = useState([]);
  const [showGlobalSearch, setGlobalSearch] = useState(false);
  const [globalQuery, setGlobalQuery]   = useState("");

  const TASK_TEMPLATES = [
    { name:"Ouverture magasin", tasks:[
      {title:"Vérifier les caisses", department:"Service", priority:"urgent"},
      {title:"Allumer les lumières et systèmes", department:"Général", priority:"urgent"},
      {title:"Vérifier températures réfrigérateurs", department:"Viande", priority:"urgent"},
      {title:"Mettre les spéciaux en place", department:"Épicerie", priority:"high"},
      {title:"Vérifier l'entrée et le stationnement", department:"Vestibule", priority:"normal"},
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
    "Viande":        [{id:1, label:"Semaine du 21 avril", photo:null, ts:Date.now()-86400000}],
    "Boulangerie":   [{id:2, label:"Semaine du 21 avril", photo:null, ts:Date.now()-86400000}],
    "Épicerie":      [],
    "Fruits & Légumes":[],
    "PAM":           [],
    "Poisson":       [],
    "Service":       [],
    "Charcuterie":   [],
  });
  const [scheduleDepts, setScheduleDepts] = useState(["Viande","Boulangerie","Épicerie","Fruits & Légumes","PAM","Poisson","Service","Charcuterie"]);
  const [notes, setNotes] = useState({});  // keyed by userId
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [taskSort, setTaskSort] = useState("date");
  const [me, setMe]               = useState(INIT_USERS[0]);
  const [tab, setTab]             = useState("home");
  const [taskFilter, setTaskFilter] = useState("all");
  const [seenTasks, setSeenTasks] = useState(new Set([1,2,3]));
  const [notifs, setNotifs] = useState([]);
  const [modal, setModal]         = useState(null);
  const [activeTask, setActive]   = useState(null);
  const [editUser, setEditUser]   = useState(null);
  const [editTaskData, setEditTaskData] = useState(null);
  const [activeTour, setActiveTour] = useState(null);
  const [selectedTour, setSelectedTour] = useState(null);
  const [toast, setToast]         = useState(null);

  // REALTIME - poll every 15 seconds for new data
  useEffect(() => {
    if(!ready) return;
    const poll = async () => {
      try {
        const newTasks = await sb.get("tasks", "archived=eq.false&order=created_at.desc");
        const newComments = await sb.get("comments", "order=created_at");
        if(newTasks?.length) {
          const mapped = newTasks.map(t=>({
            ...t, assignedTo:t.assigned_to, createdBy:t.created_by,
            dueDate:t.due_date, dueTime:t.due_time,
            customDays:t.custom_days||[], pinned:t.pinned||false,
            createdAt:new Date(t.created_at).getTime(),
            completedAt:t.completed_at?new Date(t.completed_at).getTime():null,
            comments:(newComments||[]).filter(c=>c.task_id===t.id).map(c=>({id:c.id,userId:c.user_id,text:c.text,ts:new Date(c.created_at).getTime()}))
          }));
          // Detect new tasks and notify
          setTasks(prev => {
            const prevIds = new Set(prev.map(t=>t.id));
            mapped.forEach(t => {
              if(!prevIds.has(t.id) && t.createdBy !== undefined) {
                pushNotif(`Nouvelle tâche`, t.title, "task");
              }
            });
            return mapped;
          });
        }
        // Check for new announcements
        const ann = await sb.get("announcements", "order=created_at.desc");
        if(ann?.length) {
          setAnnouncements(prev => {
            const prevIds = new Set(prev.map(a=>a.id));
            const mapped = ann.map(a=>({...a,createdBy:a.created_by,ts:new Date(a.created_at).getTime()}));
            mapped.forEach(a => {
              if(!prevIds.has(a.id)) pushNotif("Nouvelle annonce", a.text.slice(0,60), "announce");
            });
            return mapped;
          });
        }
      } catch(e) { console.error("Poll error:", e); }
    };
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, [ready]);

  useEffect(() => {
    const load = async () => {
      try {
        // Users
        const users = await sb.get("users", "order=id");
        if (users?.length) {
          const u = users.map(x => ({id:x.id,name:x.name,role:x.role,color:x.color,isOwner:x.is_owner,pin:x.pin||"1111"}));
          setUsers(u);
          setMe(u.find(x=>x.isOwner)||u[0]);
        }
        // Tasks + comments
        const tasks = await sb.get("tasks", "archived=eq.false&order=created_at.desc");
        const comments = await sb.get("comments", "order=created_at");
        if (tasks?.length) {
          setTasks(tasks.map(t=>({
            ...t, assignedTo:t.assigned_to, createdBy:t.created_by,
            dueDate:t.due_date, dueTime:t.due_time,
            customDays:t.custom_days||[], pinned:t.pinned||false,
            createdAt:new Date(t.created_at).getTime(),
            completedAt:t.completed_at?new Date(t.completed_at).getTime():null,
            comments:(comments||[]).filter(c=>c.task_id===t.id).map(c=>({id:c.id,userId:c.user_id,text:c.text,ts:new Date(c.created_at).getTime()}))
          })));
        }
        // Announcements
        const ann = await sb.get("announcements", "order=created_at.desc");
        if (ann?.length) setAnnouncements(ann.map(a=>({...a,createdBy:a.created_by,ts:new Date(a.created_at).getTime()})));
        // Events
        const evts = await sb.get("events", "order=date");
        if (evts?.length) setEvents(evts.map(e=>({...e,startTime:e.start_time,endTime:e.end_time,createdBy:e.created_by,customDays:e.custom_days||[],members:e.members||[]})));
        // Tour history
        const tours = await sb.get("tour_history", "order=created_at.desc");
        if (tours?.length) setTourHistory(tours.map(t=>({...t,doneBy:t.done_by,startTime:t.start_time,issues:t.issues||[],ts:new Date(t.created_at).getTime()})));
        // Shift reports
        const reports = await sb.get("shift_reports", "order=created_at.desc");
        if (reports?.length) setShiftReports(reports.map(r=>({...r,doneBy:r.done_by,createdBy:r.created_by,ts:new Date(r.created_at).getTime()})));
        // Store
        const store = await sb.get("store_profile");
        if (store?.length) setStore({name:store[0].name,number:store[0].number,address:store[0].address||"",logo:store[0].logo||null});
        // Notes
        const notes = await sb.get("notes");
        if (notes?.length) { const m={}; notes.forEach(n=>{m[n.user_id]=n.text;}); setNotes(m); }
        // Schedules
        const depts = await sb.get("schedule_depts","order=sort_order");
        const photos = await sb.get("schedule_photos","order=created_at.desc");
        if (depts?.length) {
          const newDepts=[], newSched={};
          depts.forEach(d=>{
            newDepts.push(d.name);
            newSched[d.name]=(photos||[]).filter(p=>p.dept_id===d.id).map(p=>({id:p.id,label:p.label,photo:p.photo||null,ts:new Date(p.created_at).getTime()}));
          });
          setScheduleDepts(newDepts);
          setSchedules(newSched);
        }
      // Load gallery
      try {
        const gFolders = await sb.get("gallery_folders","order=created_at.desc");
        const gPhotos = await sb.get("gallery_photos","order=created_at.desc");
        if(gFolders?.length){
          setGallery(gFolders.map(f=>({
            id:f.id,name:f.name,createdBy:f.created_by,ts:new Date(f.created_at).getTime(),
            photos:(gPhotos||[]).filter(p=>p.folder_id===f.id).map(p=>({id:p.id,photo:p.photo,caption:p.caption,addedBy:p.added_by,ts:new Date(p.created_at).getTime()}))
          })));
        }
      } catch(e) { console.error("Gallery error:",e); }

      // Load join requests (owner only)
      try {
        const reqs = await sb.get("join_requests", "order=created_at.desc");
        if(reqs?.length) setJoinRequests(reqs);
      } catch(e) { /* table might not exist yet */ }
      } catch(e) { console.error("Load error:", e); }
      setReady(true);
    };
    load();
  }, []);

  const isOwner = me.isOwner;
  const unread  = notifs.filter(n=>!n.read).length;
  const pendingRequests = joinRequests.filter(r=>r.status==="pending").length;
  const unseenCount = tasks.filter(t=>!seenTasks.has(t.id)).length;

  const pushToast = (msg,type="ok") => { setToast({msg,type,k:Date.now()}); setTimeout(()=>setToast(null),3000); };
  const pushNotif = (text,sub,type="task") => setNotifs(p=>[{id:Date.now(),text,sub,type,ts:Date.now(),read:false},...p]);
  const clearAllNotifs = () => setNotifs([]);
  const markAllRead = () => setNotifs(p=>p.map(n=>({...n,read:true})));

  const openTask = t => { setSeenTasks(p=>new Set([...p,t.id])); setActive(t); setModal("taskDetail"); };

  const createTask = async data => {
    try {
      const res = await sb.insert("tasks",{title:data.title,description:data.description,assigned_to:data.assignedTo,created_by:me.id,priority:data.priority,status:"todo",department:data.department,due_date:data.dueDate,due_time:data.dueTime,photo:data.photo,recurrence:data.recurrence,custom_days:data.customDays,pinned:false,archived:false});
      if(res?.[0]){const t={...res[0],assignedTo:res[0].assigned_to,createdBy:res[0].created_by,dueDate:res[0].due_date,dueTime:res[0].due_time,customDays:res[0].custom_days||[],createdAt:new Date(res[0].created_at).getTime(),comments:[],completedAt:null};setTasks(p=>[t,...p]);}
      pushNotif(`Nouvelle tâche par ${me.name}`,data.title,"task");
      pushToast("Tâche créée !"); setModal(null);
    } catch(e){pushToast("Erreur","warn");}
  };

  const editTask = async data => {
    try {
      await sb.update("tasks",data.id,{title:data.title,description:data.description,assigned_to:data.assignedTo,priority:data.priority,status:data.status,department:data.department,due_date:data.dueDate,due_time:data.dueTime,photo:data.photo,recurrence:data.recurrence,custom_days:data.customDays,pinned:data.pinned});
      setTasks(p=>p.map(t=>t.id===data.id?{...data}:t));
      pushToast("Tâche modifiée !"); setModal(null); setActive(null);
    } catch(e){pushToast("Erreur","warn");}
  };

  const updateStatus = async (taskId,status,note,photo) => {
    const now=Date.now();
    try {
      await sb.update("tasks",taskId,{status,completed_at:status==="done"?new Date().toISOString():null,...(photo?{photo}:{})});
      if(status==="done"&&note){const res=await sb.insert("comments",{task_id:taskId,user_id:me.id,text:"✓ "+note});if(res?.[0]){const c={id:res[0].id,userId:me.id,text:"✓ "+note,ts:now};setTasks(p=>p.map(t=>t.id===taskId?{...t,status,completedAt:now,comments:[...t.comments,c],...(photo?{photo}:{})}:t));setActive(p=>p?.id===taskId?{...p,status,completedAt:now,comments:[...p.comments,c]}:p);}}
      else{setTasks(p=>p.map(t=>t.id===taskId?{...t,status,completedAt:status==="done"?now:null,...(photo?{photo}:{})}:t));setActive(p=>p?.id===taskId?{...p,status,completedAt:status==="done"?now:null}:p);}
      if(status==="done"){const t=tasks.find(x=>x.id===taskId);pushNotif("Tâche complétée",t?.title,"done");pushToast("Complété !");}
    } catch(e){pushToast("Erreur","warn");}
  };

  const togglePin = async taskId => {
    const task=tasks.find(t=>t.id===taskId);if(!task)return;
    try{await sb.update("tasks",taskId,{pinned:!task.pinned});setTasks(p=>p.map(t=>t.id===taskId?{...t,pinned:!t.pinned}:t));setActive(p=>p?.id===taskId?{...p,pinned:!p.pinned}:p);pushToast("Épinglée !");}catch(e){}
  };

  const addComment = async (taskId,text) => {
    if(!text.trim()) return;
    try {
      const res=await sb.insert("comments",{task_id:taskId,user_id:me.id,text});
      if(res?.[0]){const c={id:res[0].id,userId:me.id,text,ts:new Date(res[0].created_at).getTime()};setTasks(p=>p.map(t=>t.id===taskId?{...t,comments:[...t.comments,c]}:t));setActive(p=>p?{...p,comments:[...p.comments,c]}:p);const mentioned=users.filter(u=>text.toLowerCase().includes("@"+u.name.toLowerCase().split(" ")[0]));mentioned.forEach(u=>{if(u.id!==me.id)pushNotif(`${me.name} vous a mentionné`,text.slice(0,60),"mention");});}
    } catch(e){console.error(e);}
  };

  const createGalleryFolder = async name => {
    if(!name.trim()) return;
    try {
      const res = await sb.insert("gallery_folders",{name:name.trim(),created_by:me.id});
      if(res?.[0]) setGallery(p=>[{id:res[0].id,name:name.trim(),createdBy:me.id,ts:Date.now(),photos:[]},...p]);
      pushToast(T(lang,"folderCreated"));
    } catch(e) { pushToast("Erreur","warn"); }
  };
  const deleteGalleryFolder = async id => {
    try {
      await sb.del("gallery_folders",id);
      setGallery(p=>p.filter(f=>f.id!==id));
      pushToast(T(lang,"deleted"),"warn");
    } catch(e) { pushToast("Erreur","warn"); }
  };
  const addPhotoToFolder = async (folderId, photo, caption) => {
    try {
      const res = await sb.insert("gallery_photos",{folder_id:folderId,photo,caption,added_by:me.id});
      if(res?.[0]) {
        const newPhoto = {id:res[0].id,photo,caption,addedBy:me.id,ts:Date.now()};
        setGallery(p=>p.map(f=>f.id===folderId?{...f,photos:[newPhoto,...f.photos]}:f));
      }
      pushToast(T(lang,"photoAdded"));
    } catch(e) { pushToast("Erreur","warn"); }
  };
  const deletePhotoFromFolder = async (folderId, photoId) => {
    try {
      await sb.del("gallery_photos",photoId);
      setGallery(p=>p.map(f=>f.id===folderId?{...f,photos:f.photos.filter(p=>p.id!==photoId)}:f));
      pushToast(T(lang,"deleted"),"warn");
    } catch(e) { pushToast("Erreur","warn"); }
  };
  const renameGalleryFolder = async (id, name) => {
    try {
      await sb.update("gallery_folders",id,{name});
      setGallery(p=>p.map(f=>f.id===id?{...f,name}:f));
      pushToast(T(lang,"saved"));
    } catch(e) { pushToast("Erreur","warn"); }
  };

  // Auto-collect all photos from tasks into a virtual "all" list
  const allAppPhotos = [
    ...tasks.filter(t=>t.photo).map(t=>({photo:t.photo,caption:t.title,source:"Tâche",ts:t.createdAt})),
    ...archivedTasks.filter(t=>t.photo).map(t=>({photo:t.photo,caption:t.title,source:"Archive",ts:t.createdAt})),
    ...tourHistory.filter(t=>t.issues?.some(i=>i.photo)).flatMap(t=>t.issues.filter(i=>i.photo).map(i=>({photo:i.photo,caption:i.item,source:`Tournée ${t.shift}`,ts:t.ts||Date.now()}))),
    ...Object.values(schedules).flat().filter(s=>s.photo).map(s=>({photo:s.photo,caption:s.label,source:"Horaire",ts:s.ts})),
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
    setSchedules(p=>{ const n={...p}; n[newName.trim()]=n[oldName]||[]; delete n[oldName]; return n; });
    pushToast("Département renommé !");
  };

  const archiveTask = async tid => {
    try{await sb.update("tasks",tid,{archived:true,archived_at:new Date().toISOString()});const t=tasks.find(x=>x.id===tid);if(t){setArchivedTasks(p=>[{...t,archivedAt:Date.now()},...p]);setTasks(p=>p.filter(x=>x.id!==tid));}pushToast("Tâche archivée");setModal(null);setActive(null);}catch(e){pushToast("Erreur","warn");}
  };
  const addSchedulePhoto = async (dept,label,photo) => {
    try{const depts=await sb.get("schedule_depts");let dr=depts?.find(d=>d.name===dept);if(!dr){const nd=await sb.insert("schedule_depts",{name:dept,sort_order:0});dr=nd?.[0];}if(dr?.id){const res=await sb.insert("schedule_photos",{dept_id:dr.id,label,photo});if(res?.[0])setSchedules(p=>({...p,[dept]:[{id:res[0].id,label,photo,ts:Date.now()},...(p[dept]||[])]}));}pushToast("Horaire ajouté !");}catch(e){pushToast("Erreur","warn");}
  };
  
  const deleteSchedulePhoto = async (dept,id) => {
    try{await sb.del("schedule_photos",id);setSchedules(p=>({...p,[dept]:(p[dept]||[]).filter(s=>s.id!==id)}));pushToast("Horaire supprimé","warn");}catch(e){}
  };
  
  const saveNote = async (userId,text) => {
    try{const ex=await sb.get("notes",`user_id=eq.${userId}`);if(ex?.length){await sb.update("notes",ex[0].id,{text,updated_at:new Date().toISOString()});}else{await sb.insert("notes",{user_id:userId,text});}setNotes(p=>({...p,[userId]:text}));}catch(e){console.error(e);}
  };

  const createUser = async data => {
    try{const res=await sb.insert("users",{name:data.name,role:data.role,color:data.color,is_owner:false});if(res?.[0])setUsers(p=>[...p,{...res[0],isOwner:false}]);pushToast(`${data.name} ajouté !`);setModal(null);}catch(e){pushToast("Erreur","warn");}
  };
  const updateUser = async data => {
    try{
      await sb.update("users",data.id,{name:data.name,role:data.role,color:data.color,pin:data.pin||"1111"});
      setUsers(p=>p.map(u=>u.id===data.id?data:u));
      if(me.id===data.id)setMe(data);
      pushToast("Profil mis à jour !");setModal(null);setEditUser(null);
    }catch(e){pushToast("Erreur","warn");}
  };
  const deleteUser = async uid => {
    try{await sb.del("users",uid);setUsers(p=>p.filter(u=>u.id!==uid));pushToast("Supprimé","warn");setModal(null);setEditUser(null);}catch(e){pushToast("Erreur","warn");}
  };
  const deleteTask = async tid => { try{await sb.del("tasks",tid);setTasks(p=>p.filter(t=>t.id!==tid));pushToast("Supprimée","warn");setModal(null);setActive(null);}catch(e){pushToast("Erreur","warn");} };

  const saveTour = async tour => {
    try{
      const issuesWithPhotos = tour.issues||[];
      // Strip photos from issues for tour_history (too large)
      const safeIssues = issuesWithPhotos.map(i=>({...i,photo:null}));
      const res = await sb.insert("tour_history",{shift:tour.shift,date:tour.date,done_by:tour.doneBy,score:tour.score,total:tour.total,duration:tour.duration,start_time:tour.startTime,issues:safeIssues});
      if(res?.[0]) setTourHistory(p=>[{...tour,id:res[0].id},...p]);

      // Auto-save tour photos to gallery
      const photosToSave = issuesWithPhotos.filter(i=>i.photo);
      if(photosToSave.length>0){
        try{
          // Find or create "Photos Tournées" folder
          const existingFolders = await sb.get("gallery_folders");
          let tourFolder = existingFolders?.find(f=>f.name==="Photos Tournées");
          if(!tourFolder){
            const newFolder = await sb.insert("gallery_folders",{name:"Photos Tournées",created_by:me.id});
            tourFolder = newFolder?.[0];
            if(tourFolder) setGallery(p=>[{id:tourFolder.id,name:"Photos Tournées",createdBy:me.id,ts:Date.now(),photos:[]},...p]);
          }
          if(tourFolder?.id){
            for(const issue of photosToSave){
              const caption = `${tour.shift} · ${tour.date} · ${issue.item}`;
              const photoRes = await sb.insert("gallery_photos",{folder_id:tourFolder.id,photo:issue.photo,caption,added_by:me.id});
              if(photoRes?.[0]){
                const newPhoto = {id:photoRes[0].id,photo:issue.photo,caption,addedBy:me.id,ts:Date.now()};
                setGallery(p=>p.map(f=>f.id===tourFolder.id?{...f,photos:[newPhoto,...f.photos]}:f));
              }
            }
          }
        }catch(e){ console.error("Tour photos to gallery error:",e); }
      }

      pushNotif(`Tournée ${tour.shift} complétée`,`Score: ${tour.score}/${tour.total} — ${tour.doneBy}`,"done");
      pushToast(`Tournée ${tour.shift} sauvegardée !`);
      setActiveTour(null);setModal(null);
    }catch(e){console.error("Tour save error:",e);pushToast("Erreur sauvegarde tournée","warn");}
  };

  // Reminders disabled - handled manually

  const saveShiftReport = async report => {
    try{const res=await sb.insert("shift_reports",{date:report.date,traffic:report.traffic,rating:report.rating,highlights:report.highlights,incidents:report.incidents,notes:report.notes,done_by:me.name,created_by:me.id});if(res?.[0])setShiftReports(p=>[{...res[0],doneBy:me.name,createdBy:me.id,ts:Date.now()},...p]);pushNotif("Rapport de journée",`${me.name} · Note: ${report.rating}/5`,"report");pushToast("Rapport sauvegardé !");setModal(null);}catch(e){pushToast("Erreur","warn");}
  };

  const applyTemplate = template => {
    template.tasks.forEach((t,i) => {
      setTimeout(()=>{
        const task = {...t, id:Date.now()+i, createdBy:me.id, assignedTo:users[0]?.id, status:"todo", comments:[], createdAt:Date.now(), dueDate:todayStr(), dueTime:"", photo:null, recurrence:"none", customDays:[], pinned:false, description:""};
        setTasks(p=>[task,...p]);
      }, i*50);
    });
    pushToast(`Template "${template.name}" appliqué !`);
    setModal(null);
  };

  const createEvent = async data => {
    try{const res=await sb.insert("events",{title:data.title,description:data.description,date:data.date,start_time:data.startTime,end_time:data.endTime,color:data.color,category:data.category,recurrence:data.recurrence,custom_days:data.customDays,reminder:data.reminder,members:data.members,created_by:me.id});if(res?.[0])setEvents(p=>[{...res[0],startTime:res[0].start_time,endTime:res[0].end_time,createdBy:me.id,customDays:res[0].custom_days||[],members:res[0].members||[]},...p]);pushNotif(`Nouvel événement: ${data.title}`,`${data.date} à ${data.startTime}`,"event");pushToast("Événement créé !");setModal(null);}catch(e){pushToast("Erreur","warn");}
  };
  const editEvent = async data => {
    try{await sb.update("events",data.id,{title:data.title,description:data.description,date:data.date,start_time:data.startTime,end_time:data.endTime,color:data.color,category:data.category,recurrence:data.recurrence,custom_days:data.customDays,reminder:data.reminder,members:data.members});setEvents(p=>p.map(e=>e.id===data.id?data:e));pushToast("Événement modifié !");setModal(null);}catch(e){pushToast("Erreur","warn");}
  };
  const deleteEvent = async id => {
    try{await sb.del("events",id);setEvents(p=>p.filter(e=>e.id!==id));pushToast("Événement supprimé","warn");setModal(null);}catch(e){}
  };
  const createAnnouncement = async data => {
    try{const res=await sb.insert("announcements",{text:data.text,dept:data.dept,created_by:me.id});if(res?.[0])setAnnouncements(p=>[{...res[0],createdBy:me.id,ts:Date.now()},...p]);pushNotif(`Annonce de ${me.name}`,data.text.slice(0,60),"announce");pushToast("Annonce envoyée !");setModal(null);}catch(e){pushToast("Erreur","warn");}
  };
  const deleteAnnouncement = async id => {
    try{await sb.del("announcements",id);setAnnouncements(p=>p.filter(a=>a.id!==id));pushToast("Annonce supprimée","warn");}catch(e){}
  };
  const sendUrgency = msg => { pushNotif("🆘 URGENCE",msg,"urgency"); setAnnouncements(p=>[{id:Date.now(),text:"🆘 URGENCE: "+msg,dept:"all",createdBy:me.id,ts:Date.now()},...p]); setShowUrgency(false); pushToast("Alerte urgence envoyée !"); };

  const sendJoinRequest = async (name, role) => {
    try {
      const res = await sb.insert("join_requests", {name, role, status:"pending"});
      if(res?.[0]) pushToast("Demande envoyée ! En attente d'approbation.");
    } catch(e) { pushToast("Erreur","warn"); }
  };
  const approveRequest = async (req) => {
    try {
      const colors = ["#3b82f6","#2a9d8f","#8b5cf6","#ec4899","#f4a261","#84cc16"];
      const color = colors[users.length % colors.length];
      const newUser = await sb.insert("users",{name:req.name,role:req.role,color,is_owner:false});
      if(newUser?.[0]) {
        setUsers(p=>[...p,{...newUser[0],isOwner:false}]);
        await sb.update("join_requests",req.id,{status:"approved"});
        setJoinRequests(p=>p.map(r=>r.id===req.id?{...r,status:"approved"}:r));
        pushToast(`${req.name} approuvé !`);
      }
    } catch(e) { pushToast("Erreur","warn"); }
  };
  const rejectRequest = async (req) => {
    try {
      await sb.update("join_requests",req.id,{status:"rejected"});
      setJoinRequests(p=>p.map(r=>r.id===req.id?{...r,status:"rejected"}:r));
      pushToast("Demande refusée","warn");
    } catch(e) {}
  };

  const getUser = id=>users.find(u=>u.id===id);
  const getPri  = id=>PRIORITIES.find(p=>p.id===id);
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

  if (!ready) return (
    <div style={{minHeight:"100vh",background:"#0a0a0d",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&display=swap'); @keyframes spin{to{transform:rotate(360deg);}}`}</style>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:44,fontWeight:700,color:"#C9A84C"}}>GroceryOps</div>
      <div style={{width:36,height:36,borderRadius:"50%",border:"3px solid rgba(201,168,76,0.2)",borderTopColor:"#C9A84C",animation:"spin 1s linear infinite"}}/>
    </div>
  );

  if (!loginUser) return (
    <PinLoginScreen users={users} onLogin={(u)=>{setLoginUser(u);setMe(u);}} onJoinRequest={sendJoinRequest}/>
  );

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column",maxWidth:430,margin:"0 auto",position:"relative"}}>
      <style>{css}</style>
      <div style={{position:"fixed",top:0,left:0,right:0,height:300,background:`radial-gradient(ellipse at 30% 0%,rgba(201,168,76,0.06),transparent 65%)`,pointerEvents:"none",zIndex:0,maxWidth:430,margin:"0 auto"}}/>

      {/* HEADER */}
      <div style={{position:"sticky",top:0,zIndex:30,background:dark?"rgba(10,10,13,0.93)":"rgba(247,245,240,0.93)",backdropFilter:"blur(18px)",borderBottom:"1px solid var(--border)",padding:"13px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>isOwner&&setModal("storeProfile")}>
          {store.logo
            ? <img src={store.logo} alt="" style={{width:34,height:34,borderRadius:9,objectFit:"cover",border:"1.5px solid var(--gold-b)"}}/>
            : <div style={{width:34,height:34,borderRadius:9,background:"var(--gold-dim)",border:"1px solid var(--gold-b)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"var(--gold)"}}>
                {store.name.slice(0,2).toUpperCase()}
              </div>
          }
          <div>
            <div className="serif" style={{fontSize:18,fontWeight:700,color:"var(--gold)",lineHeight:1,letterSpacing:"-0.2px"}}>{store.name}</div>
            <div style={{fontSize:9,color:"var(--t3)",letterSpacing:"1.5px",marginTop:1}}>{store.number}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button className="btn" onClick={()=>setShowUrgency(true)}
            style={{height:34,padding:"0 12px",borderRadius:10,background:"#e63946",border:"none",color:"white",fontSize:11,fontWeight:900,letterSpacing:"0.5px"}}>
            SOS
          </button>
          <div style={{position:"relative"}}>
            <button className="btn" onClick={()=>{setModal("notifs");setNotifs(p=>p.map(n=>({...n,read:true})));}}
              style={{width:34,height:34,borderRadius:10,background:"var(--s2)",border:"1px solid var(--border)",color:"var(--t2)"}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </button>
            {unread>0&&<span style={{position:"absolute",top:-3,right:-3,width:16,height:16,borderRadius:"50%",background:"#e63946",border:`2px solid var(--bg)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:800,color:"white",pointerEvents:"none"}}>{unread}</span>}
          </div>
          <button className="btn" onClick={()=>setModal("accountMenu")} style={{width:34,height:34,borderRadius:10,background:"var(--gold)",fontSize:11,fontWeight:700,color:"#0a0a0d",border:"none"}}>
            {initials(me.name)}
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{flex:1,overflowY:"auto",paddingBottom:100,position:"relative",zIndex:1}}>
        {tab==="home"  && <HomeTab stats={stats} me={me} store={store} tasks={tasks} announcements={announcements} lang={lang} themeColor={themeColor} getUser={getUser} getPri={getPri} onNew={()=>setModal("newTask")} onGoTo={f=>{if(f==="tour"||f==="comm"||f==="notes"||f==="gallery"){setTab(f);}else{setTaskFilter(f||"active");setTab("tasks");}}} onTask={openTask}/>}
        {tab==="tasks" && <TasksTab tasks={tasks} archivedTasks={archivedTasks} me={me} getUser={getUser} getPri={getPri} isOwner={isOwner} onTask={openTask} onNew={()=>setModal("newTask")} initFilter={taskFilter} seenTasks={seenTasks} taskSort={taskSort} setTaskSort={setTaskSort}/>}
        {tab==="tour"  && <TourTab tourHistory={tourHistory} tourConfig={tourConfig} me={me} isOwner={isOwner} lang={lang} onSelectTour={t=>setSelectedTour(t)} onStart={(shift)=>{setActiveTour({shift,startTime:Date.now()});setModal("doTour");}} onEditConfig={()=>setModal("tourConfig")}/>}
        {tab==="team"  && <TeamTab users={users} me={me} isOwner={isOwner} onAdd={()=>setModal("newUser")} onEdit={u=>{setEditUser(u);setModal("editUser");}} tasks={tasks} joinRequests={joinRequests} onApprove={approveRequest} onReject={rejectRequest}/>}
        {tab==="stats" && <StatsTab tasks={tasks} users={users} tourHistory={tourHistory} shiftReports={shiftReports}/>}
        {tab==="gallery"  && <GalleryTab gallery={gallery} allAppPhotos={allAppPhotos} me={me} getUser={getUser} lang={lang} themeColor={themeColor} onCreateFolder={createGalleryFolder} onDeleteFolder={deleteGalleryFolder} onAddPhoto={addPhotoToFolder} onDeletePhoto={deletePhotoFromFolder} onRenameFolder={renameGalleryFolder}/>}
        {tab==="schedule" && <ScheduleTab schedules={schedules} scheduleDepts={scheduleDepts} me={me} isOwner={isOwner} onAdd={addSchedulePhoto} onDelete={deleteSchedulePhoto} onAddDept={addScheduleDept} onRemoveDept={removeScheduleDept} onRenameDept={renameScheduleDept}/>}
        {tab==="notes"    && <NotesTab notes={notes} me={me} onSave={saveNote}/>}
        {tab==="comm"  && <CommTab events={events} announcements={announcements} users={users} me={me} isOwner={isOwner} getUser={getUser} onNewEvent={()=>setModal("newEvent")} onEditEvent={e=>{setEditTaskData(e);setModal("editEvent");}} onDeleteAnnouncement={deleteAnnouncement} onNewAnnouncement={()=>setModal("newAnnouncement")}/>}
      </div>

      {/* BOTTOM NAV */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:dark?"rgba(10,10,13,0.95)":"rgba(247,245,240,0.95)",backdropFilter:"blur(18px)",borderTop:"1px solid var(--border)",padding:"8px 4px 22px",display:"flex",alignItems:"center",justifyContent:"space-around",zIndex:30}}>
        {[
          {id:"home",  label:"ACCUEIL", icon:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>},
          {id:"tasks", label:"TÂCHES",  icon:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>, badge:unseenCount},
          {id:"tour",  label:"TOURNÉE", icon:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>},
          {id:"team",     label:"ÉQUIPE",   icon:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>},
          {id:"schedule",label:T(lang,"schedule"), icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>},
          {id:"gallery", label:T(lang,"gallery"),  icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>},
          {id:"notes",   label:T(lang,"notes"),    icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>},
          {id:"comm",    label:T(lang,"comm"),     icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>},
          {id:"stats",   label:T(lang,"stats"),    icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>},
        ].map(({id,label,icon,badge})=>(
          <button key={id} className="nav-tab" onClick={()=>{setTab(id);if(id!=="tasks")setTaskFilter("all");}}
            style={{color:tab===id?"var(--gold)":"var(--t3)",position:"relative",flex:1}}>
            <div style={{marginBottom:3}}>{icon}</div>
            {badge>0&&<span style={{position:"absolute",top:0,right:"15%",width:15,height:15,borderRadius:"50%",background:"var(--danger)",border:`2px solid ${dark?"#0a0a0d":"#f7f5f0"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:800,color:"white"}}>{badge}</span>}
            <span style={{borderBottom:tab===id?"1.5px solid var(--gold)":"1.5px solid transparent",paddingBottom:1}}>{label}</span>
          </button>
        ))}
      </div>

      {/* FAB */}
      <button className="btn btn-gold" onClick={()=>setModal("newTask")}
        style={{position:"fixed",bottom:80,right:"calc(50% - 205px)",width:48,height:48,borderRadius:14,fontSize:24,zIndex:31,boxShadow:"0 4px 20px rgba(201,168,76,0.4)"}}>
        +
      </button>

      {/* MODALS */}
      {modal==="newTask"      && <NewTaskModal    users={users} onSave={createTask} onClose={()=>setModal(null)}/>}
      {modal==="editTask"     && editTaskData && <EditTaskModal task={editTaskData} users={users} onSave={editTask} onClose={()=>{setModal(null);setEditTaskData(null);}}/>}
      {modal==="taskDetail"   && activeTask && <TaskDetailModal task={activeTask} users={users} me={me} getUser={getUser} getPri={getPri} isOwner={isOwner} onStatus={updateStatus} onComment={addComment} onDelete={deleteTask} onArchive={archiveTask} onEdit={t=>{setEditTaskData(t);setModal("editTask");}} onPin={togglePin} onClose={()=>{setModal(null);setActive(null);}}/>}
      {modal==="newUser"      && <NewUserModal    onSave={createUser} onClose={()=>setModal(null)}/>}
      {modal==="editUser"     && editUser && <EditUserModal user={editUser} me={me} isOwner={isOwner} onSave={updateUser} onDelete={deleteUser} onClose={()=>{setModal(null);setEditUser(null);}}/>}
      {modal==="notifs"       && <NotifsModalV2   notifs={notifs} onClose={()=>setModal(null)} onClearAll={clearAllNotifs} onMarkAllRead={markAllRead}/>}
      {modal==="switchUser"   && <SwitchUserModal users={users} me={me} onSwitch={u=>{setMe(u);setModal(null);pushToast(`Connecté — ${u.name}`);}} onClose={()=>setModal(null)}/>}
      {showPDFInfo && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(5px)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={()=>setShowPDFInfo(false)}>
          <div className="scale-in" style={{background:"var(--s1)",borderRadius:20,padding:28,width:"100%",maxWidth:340,border:"1px solid var(--border)"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:36,textAlign:"center",marginBottom:14}}>📄</div>
            <div className="serif" style={{fontSize:20,fontWeight:700,marginBottom:10,color:"var(--text)",textAlign:"center"}}>Export PDF</div>
            <div style={{fontSize:14,color:"var(--t2)",lineHeight:1.7,marginBottom:20,textAlign:"center"}}>
              L'export PDF génère un rapport complet avec toutes vos tâches, statistiques et tournées de plancher.
              <br/><br/>
              <span style={{color:"var(--gold)",fontWeight:600}}>Cette fonctionnalité sera pleinement active une fois l'app hébergée sur votre serveur.</span>
              <br/><br/>
              Le rapport inclura : tâches, performance par membre, départements, tournées et historique.
            </div>
            <button className="btn btn-gold" onClick={()=>setShowPDFInfo(false)} style={{width:"100%",padding:"14px",borderRadius:13,fontSize:14}}>Compris !</button>
          </div>
        </div>
      )}
      {modal==="newEvent"       && <EventFormModal title="Nouvel événement" initial={{title:"",description:"",date:todayStr(),startTime:"09:00",endTime:"10:00",members:[me.id],color:"#3b82f6",category:"",recurrence:"none",customDays:[],reminder:"60"}} users={users} me={me} onSave={createEvent} onClose={()=>setModal(null)}/>}
      {modal==="editEvent"      && editTaskData && <EventFormModal title="Modifier l'événement" initial={{...editTaskData}} users={users} me={me} onSave={editEvent} onDelete={deleteEvent} onClose={()=>{setModal(null);setEditTaskData(null);}}/>}
      {modal==="newAnnouncement"&& <AnnouncementModal me={me} users={users} onSave={createAnnouncement} onClose={()=>setModal(null)}/>}
      {modal==="accountMenu" && <AccountMenuModal me={me} users={users} isOwner={isOwner}
          onSwitchUser={u=>{setMe(u);setModal(null);pushToast(`Connecté — ${u.name}`);}}
          onSettings={()=>setModal("settings")}
          onStoreProfile={()=>setModal("storeProfile")}
          onExportPDF={()=>{setShowPDFInfo(true);setModal(null);}}
          onSearch={()=>{setGlobalSearch(true);setModal(null);}}
          onSOS={()=>{setShowUrgency(true);setModal(null);}}
          onChangePin={()=>{setModal("changePin");}}
          onClose={()=>setModal(null)}
        />}
      {modal==="changePin" && <ChangePinModal me={me} onSave={async (newPin)=>{
          try{
            await sb.update("users",me.id,{pin:newPin});
            setUsers(p=>p.map(u=>u.id===me.id?{...u,pin:newPin}:u));
            setMe(p=>({...p,pin:newPin}));
            pushToast("NIP modifié !");setModal(null);
          }catch(e){pushToast("Erreur","warn");}
        }} onClose={()=>setModal(null)}/>}
  onSave={saveShiftReport} onClose={()=>setModal(null)}/>}
      {modal==="templates"    && <TemplatesModal templates={TASK_TEMPLATES} onApply={applyTemplate} onClose={()=>setModal(null)} lang={lang}/>}
      {modal==="settings"     && <SettingsModal lang={lang} setLang={setLang} themeColor={themeColor} setThemeColor={setThemeColor} dark={dark} setDark={setDark} onClose={()=>setModal(null)}/>}
       {modal==="storeProfile" && <StoreProfileModal store={store} onSave={async s=>{
          try{
            const ex=await sb.get("store_profile");
            if(ex?.length) await sb.update("store_profile",ex[0].id,{name:s.name,number:s.number,address:s.address||"",logo:s.logo||null});
            else await sb.insert("store_profile",{name:s.name,number:s.number,address:s.address||"",logo:s.logo||null});
            setStore(s); setModal(null); pushToast("Profil mis à jour !");
          }catch(e){pushToast("Erreur sauvegarde","warn");}
        }} onClose={()=>setModal(null)}/>}
      {modal==="tourConfig"   && <TourConfigModal config={tourConfig} onSave={c=>{setTourConfig(c);setModal(null);pushToast("Liste de tournée mise à jour !");}} onClose={()=>setModal(null)}/>}
      {modal==="doTour"       && activeTour && <DoTourModal shift={activeTour.shift} startTime={activeTour.startTime} config={tourConfig} me={me} onSave={saveTour} onClose={()=>{setModal(null);setActiveTour(null);}} onCreateTask={createTask} users={users}/>}

      {/* TOAST */}
      {selectedTour&&<TourDetailModal tour={selectedTour} isOwner={isOwner} gallery={gallery} setGallery={setGallery} onClose={()=>setSelectedTour(null)} onDelete={async(t)=>{
          try{
            await sb.del("tour_history",t.id);
            setTourHistory(p=>p.filter(x=>x.id!==t.id));
            try{
              const gf=await sb.get("gallery_folders");
              const tf=gf?.find(f=>f.name==="Photos Tournées");
              if(tf){
                const gp=await sb.get("gallery_photos",`folder_id=eq.${tf.id}`);
                const toRemove=gp?.filter(p=>p.caption?.includes(t.date)&&p.caption?.includes(t.shift));
                for(const p of toRemove||[]) await sb.del("gallery_photos",p.id);
                setGallery(prev=>prev.map(f=>f.id===tf.id?{...f,photos:f.photos.filter(p=>!(p.caption?.includes(t.date)&&p.caption?.includes(t.shift)))}:f));
              }
            }catch(e){}
            setSelectedTour(null);
            pushToast("Tournée supprimée","warn");
          }catch(e){pushToast("Erreur","warn");}
        }}/>}
      {showGlobalSearch&&(
        <GlobalSearchModal query={globalQuery} setQuery={setGlobalQuery} tasks={tasks} events={events} announcements={announcements} notes={notes} me={me} getUser={getUser} getPri={getPri} onTask={t=>{openTask(t);setGlobalSearch(false);}} onClose={()=>{setGlobalSearch(false);setGlobalQuery("");}}/>
      )}
      {showUrgency&&<UrgencyModal onSend={sendUrgency} onClose={()=>setShowUrgency(false)}/>}
      {toast&&<div key={toast.k} style={{position:"fixed",bottom:94,left:"50%",transform:"translateX(-50%)",zIndex:99,background:toast.type==="warn"?"rgba(230,57,70,0.92)":"rgba(42,157,143,0.92)",borderRadius:12,padding:"11px 20px",color:"white",fontSize:14,fontWeight:600,boxShadow:"0 4px 20px rgba(0,0,0,0.3)",whiteSpace:"nowrap",animation:"fadeIn .2s ease both"}}>{toast.msg}</div>}
    </div>
  );
}

// ─── STAT BOX ────────────────────────────────────────────────────
function StatBox({label,value,sub,onClick,themeColor}){
  const tc = themeColor||"#C9A84C";
  return(
    <div className="card card-tap" onClick={onClick}
      style={{padding:"18px 16px",borderTop:`2.5px solid ${tc}`,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:-20,right:-20,width:60,height:60,borderRadius:"50%",background:`${tc}20`,pointerEvents:"none"}}/>
      <div className="serif" style={{fontSize:36,fontWeight:700,color:tc,lineHeight:1,letterSpacing:"-1px"}}>{value}</div>
      <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginTop:7}}>{label}</div>
      <div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>{sub}</div>
      <div style={{position:"absolute",bottom:12,right:13,color:"var(--t3)",fontSize:16}}>›</div>
    </div>
  );
}

// ─── HOME TAB ─────────────────────────────────────────────────────
function HomeTab({stats,me,store,tasks,announcements,lang,themeColor,getUser,getPri,onNew,onGoTo,onTask}){
  const pinned = tasks.filter(t=>t.pinned&&t.status!=="done");
  return(
    <div style={{padding:"22px 16px 0",display:"flex",flexDirection:"column",gap:20}}>
      <div className="fade-in">
        <div className="tag" style={{marginBottom:5}}>BONJOUR</div>
        <div className="serif" style={{fontSize:32,fontWeight:700,letterSpacing:"-0.5px",color:"var(--text)",lineHeight:1.1}}>{me.name}</div>
        <div style={{fontSize:13,color:"var(--t2)",marginTop:5}}>{new Date().toLocaleDateString("fr-CA",{weekday:"long",day:"numeric",month:"long"})}</div>
      </div>

      <div className="fade-in" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
        {[
          {label:"À faire",    value:stats.todo,       sub:"en attente",     filter:"todo"},
          {label:"En cours",   value:stats.inprogress, sub:"en progression", filter:"inprogress"},
          {label:"Complétées", value:stats.done,       sub:"ce cycle",       filter:"done"},
          {label:"Épinglées",  value:stats.pinned,     sub:"prioritaires",   filter:"pinned"},
        ].map(s=>(
          <StatBox key={s.label} label={s.label} value={s.value} sub={s.sub} themeColor={themeColor} onClick={()=>onGoTo(s.filter)}/>
        ))}
      </div>

      {pinned.length>0&&(
        <div className="fade-in">
          <div className="tag" style={{marginBottom:10}}>ÉPINGLÉES</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {pinned.map(t=><MiniTaskCard key={t.id} task={t} getUser={getUser} getPri={getPri} onClick={()=>onTask(t)}/>)}
          </div>
        </div>
      )}

      {/* QUICK SHORTCUTS */}
      <div className="fade-in" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        {[
          {label:T(lang,"newUrgentTask"), icon:"⚡", action:onNew, color:"#e63946"},
          {label:T(lang,"startTour"),     icon:"🚶", action:()=>onGoTo("tour"), color:"var(--gold)"},
          {label:T(lang,"announce"),      icon:"📢", action:()=>onGoTo("comm"), color:"#f4a261"},
          {label:T(lang,"myNotes"),       icon:"📝", action:()=>onGoTo("notes"), color:"#8b5cf6"},


        ].map(s=>(
          <button key={s.label} className="btn card-tap" onClick={s.action}
            style={{padding:"14px 12px",borderRadius:14,background:"transparent",border:`1.5px solid ${themeColor}`,flexDirection:"column",gap:6,alignItems:"flex-start"}}>
            <span style={{fontSize:20}}>{s.icon}</span>
            <span style={{fontSize:12,fontWeight:600,color:themeColor,textAlign:"left",lineHeight:1.3}}>{s.label}</span>
          </button>
        ))}
      </div>

      {(()=>{
        const todayAnn = announcements?.filter(a=>{
          const d = new Date(a.ts||a.created_at);
          const today = new Date();
          return d.getDate()===today.getDate()&&d.getMonth()===today.getMonth()&&d.getFullYear()===today.getFullYear();
        })||[];
        if(todayAnn.length===0) return null;
        return(
          <div className="fade-in">
            <div className="tag" style={{marginBottom:10}}>ANNONCES DU JOUR</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {todayAnn.map(a=>(
                <div key={a.id} style={{padding:"12px 14px",background:"rgba(244,162,97,0.08)",border:"1px solid rgba(244,162,97,0.2)",borderRadius:12,borderLeft:"3px solid #f4a261"}}>
                  <div style={{fontSize:13,color:"var(--text)",lineHeight:1.5}}>{a.text}</div>
                  <div style={{fontSize:11,color:"var(--t3)",marginTop:5}}>{a.dept==="all"?"Toute l'équipe":a.dept} · {ago(a.ts)}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
      <button className="btn btn-gold fade-in" onClick={onNew} style={{width:"100%",padding:"16px",borderRadius:14,fontSize:15,marginBottom:8}}>
        Créer une nouvelle tâche
      </button>
    </div>
  );
}

function MiniTaskCard({task,getUser,getPri,onClick}){
  const p=getPri(task.priority); const u=getUser(task.assignedTo); const s=STATUS_META[task.status];
  return(
    <div className="card card-tap" onClick={onClick} style={{padding:"13px 15px",display:"flex",gap:10,alignItems:"center",borderLeft:`3px solid ${p?.color}`}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:14,fontWeight:600,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{task.pinned&&"★ "}{task.title}</div>
        <div style={{fontSize:11,color:"var(--t2)",marginTop:2}}>{u?.name} · {task.department}</div>
      </div>
      <span className="pill" style={{background:s.bg,color:s.color,border:`1px solid ${s.border}`,flexShrink:0}}>{s.label}</span>
    </div>
  );
}

// ─── TASKS TAB ────────────────────────────────────────────────────
function TasksTab({tasks,archivedTasks,me,getUser,getPri,isOwner,onTask,onNew,initFilter,seenTasks,taskSort,setTaskSort}){
  const [filter,setFilter]   = useState(initFilter==="urgent"||initFilter==="pinned"?"all":initFilter==="done"?"done":initFilter||"active");
  const [priFilter,setPri]   = useState(initFilter==="urgent"?"urgent":"all");
  const [deptFilter,setDept] = useState("all");
  const [search,setSearch]   = useState("");
  const [showPinned,setPinned] = useState(initFilter==="pinned");

  useEffect(()=>{
    if(initFilter==="urgent"){setFilter("all");setPri("urgent");setPinned(false);}
    else if(initFilter==="pinned"){setFilter("all");setPri("all");setPinned(true);}
    else{setFilter(initFilter||"all");setPri("all");setPinned(false);}
  },[initFilter]);

  const [showFilters,setShowFilters]   = useState(false);
  const [showArchived,setShowArchived] = useState(false);
  const hasActiveFilters = filter!=="active"||priFilter!=="all"||deptFilter!=="all"||showPinned||taskSort!=="date";
  const sortFn = (a,b) => {
    const pinDiff = (b.pinned?1:0)-(a.pinned?1:0);
    if(pinDiff!==0) return pinDiff;
    if(taskSort==="date")     return (b.createdAt||0)-(a.createdAt||0);
    if(taskSort==="priority") return ["urgent","high","normal","low"].indexOf(a.priority)-["urgent","high","normal","low"].indexOf(b.priority);
    if(taskSort==="dept")     return (a.department||"").localeCompare(b.department||"");
    if(taskSort==="assigned") { const ua=getUser(a.assignedTo)?.name||""; const ub=getUser(b.assignedTo)?.name||""; return ua.localeCompare(ub); }
    return 0;
  };
  const sourceList = showArchived ? archivedTasks : tasks;
  const filtered = sourceList.filter(t=>
    (!showPinned||t.pinned)&&
    (showArchived||(
      filter==="all"  ? true :
      filter==="active" ? t.status!=="done" :
      t.status===filter
    ))&&
    (priFilter==="all"||t.priority===priFilter)&&
    (deptFilter==="all"||t.department===deptFilter)&&
    (!search||t.title.toLowerCase().includes(search.toLowerCase())||t.description?.toLowerCase().includes(search.toLowerCase()))
  ).sort(sortFn);

  return(
    <div style={{padding:"20px 16px",display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div>
          <div className="tag" style={{marginBottom:4}}>TÂCHES</div>
          <div className="serif" style={{fontSize:22,fontWeight:700,color:"var(--gold)"}}>{filtered.length} résultat{filtered.length!==1?"s":""}</div>
        </div>
        <button className="btn btn-gold" onClick={onNew} style={{padding:"9px 16px",borderRadius:12,fontSize:13}}>+ Nouvelle</button>
      </div>

            {/* SEARCH + FILTER BUTTON */}
      <div style={{display:"flex",gap:8}}>
        <div style={{position:"relative",flex:1}}>
          <div style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"var(--t3)",pointerEvents:"none"}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <input className="field" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..." style={{paddingLeft:32,fontSize:14}}/>
        </div>
        <button className="btn" onClick={()=>setShowFilters(p=>!p)}
          style={{width:44,height:44,borderRadius:12,flexShrink:0,
            background:hasActiveFilters?"var(--gold)":"var(--s2)",
            color:hasActiveFilters?"#0a0a0d":"var(--t2)",
            border:`1.5px solid ${hasActiveFilters?"var(--gold)":"var(--border)"}`}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
        </button>
        <button className="btn" onClick={()=>setShowArchived(p=>!p)}
          style={{width:44,height:44,borderRadius:12,flexShrink:0,
            background:showArchived?"var(--gold)":"var(--s2)",
            color:showArchived?"#0a0a0d":"var(--t3)",
            border:"1px solid var(--border)"}}>
          📦
        </button>
      </div>

      {/* FILTER PANEL */}
      {showFilters&&(
        <div style={{background:"var(--s2)",borderRadius:16,padding:"16px",border:"1px solid var(--border)",display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <div className="tag" style={{marginBottom:8}}>STATUT</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {[{id:"active",label:"Actives"},{id:"todo",label:"À faire"},{id:"inprogress",label:"En cours"},{id:"done",label:"Complétées"},{id:"all",label:"Toutes"}].map(f=>(
                <button key={f.id} className="btn" onClick={()=>{setFilter(f.id);setPri("all");setPinned(false);}}
                  style={{padding:"6px 13px",borderRadius:20,fontSize:12,
                    background:filter===f.id&&priFilter==="all"&&!showPinned?"var(--gold)":"var(--s1)",
                    color:filter===f.id&&priFilter==="all"&&!showPinned?"#0a0a0d":"var(--t2)",
                    border:"1px solid var(--border)"}}>
                  {f.label}
                </button>
              ))}
              <button className="btn" onClick={()=>{setPinned(p=>!p);setFilter("all");setPri("all");}}
                style={{padding:"6px 13px",borderRadius:20,fontSize:12,
                  background:showPinned?"var(--gold)":"var(--s1)",color:showPinned?"#0a0a0d":"var(--t2)",border:"1px solid var(--border)"}}>
                ★ Épinglées
              </button>
            </div>
          </div>
          <div>
            <div className="tag" style={{marginBottom:8}}>PRIORITÉ</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {[{id:"all",label:"Toutes"},...PRIORITIES].map(p=>(
                <button key={p.id||"all"} className="btn" onClick={()=>{setPri(p.id||"all");setFilter("all");setPinned(false);}}
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
              {[{id:"date",label:"Date"},{id:"priority",label:"Priorité"},{id:"dept",label:"Département"},{id:"assigned",label:"Assigné"}].map(s=>(
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
          <button className="btn" onClick={()=>{setFilter("active");setPri("all");setDept("all");setPinned(false);setTaskSort("date");setSearch("");setShowFilters(false);}}
            style={{width:"100%",padding:"10px",borderRadius:11,fontSize:13,background:"var(--s1)",border:"1px solid var(--border)",color:"var(--t2)"}}>
            Réinitialiser
          </button>
        </div>
      )}

      {filtered.length===0
        ? <div style={{textAlign:"center",padding:"48px 20px",color:"var(--t3)"}}>
            <div style={{fontSize:28,marginBottom:8}}>—</div>
            <div style={{fontSize:14}}>{showArchived?"Aucune tâche archivée":"Aucune tâche trouvée"}</div>
          </div>
        : filtered.map(t=><TaskCard key={t.id} task={t} getUser={getUser} getPri={getPri} onClick={()=>onTask(t)} unseen={!seenTasks?.has(t.id)}/>)
      }
    </div>
  );
}

function TaskCard({task,getUser,getPri,onClick,unseen}){
  const p=getPri(task.priority); const u=getUser(task.assignedTo); const s=STATUS_META[task.status];
  const overdue=task.dueDate&&new Date(task.dueDate)<new Date()&&task.status!=="done";
  return(
    <div className="card card-tap" onClick={onClick} style={{padding:"15px",borderLeft:`3px solid ${p?.color}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7}}>
        <div style={{display:"flex",alignItems:"center",gap:7,flex:1,minWidth:0}}>
          {unseen&&<div className="unread-dot"/>}
          {task.pinned&&<span style={{fontSize:12,color:"var(--gold)"}}>★</span>}
          <div style={{fontSize:15,fontWeight:600,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{task.title}</div>
        </div>
        <div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0,marginLeft:8}}>
          {task.recurrence&&task.recurrence!=="none"&&<span className="recur-tag">↻</span>}
          <span className="pill" style={{background:s.bg,color:s.color,border:`1px solid ${s.border}`}}>{s.label}</span>
        </div>
      </div>
      {task.description&&<div style={{fontSize:13,color:"var(--t2)",marginBottom:10,lineHeight:1.5,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{task.description}</div>}
      {task.photo&&<div style={{borderRadius:10,overflow:"hidden",marginBottom:10,height:90}}><img src={task.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <div style={{width:22,height:22,borderRadius:6,background:u?.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:u?.id===1?"#0a0a0d":"white"}}>{initials(u?.name||"?")}</div>
          <span style={{fontSize:12,color:"var(--t2)"}}>{u?.name}</span>
          <span style={{fontSize:11,color:"var(--t3)"}}>· {task.department}</span>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {task.comments.length>0&&<span style={{fontSize:11,color:"var(--t3)"}}>💬 {task.comments.length}</span>}
          {task.dueDate&&<span style={{fontSize:11,color:overdue?"#e63946":"var(--t3)",fontWeight:overdue?700:400}}>{overdue?"⚠ ":""}{new Date(task.dueDate).toLocaleDateString("fr-CA",{month:"short",day:"numeric"})}{task.dueTime?" "+task.dueTime:""}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── TOUR TAB ─────────────────────────────────────────────────────
function TourTab({tourHistory,tourConfig,me,isOwner,onStart,onEditConfig,onSelectTour}){
  const [calMonth, setCalMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const year=calMonth.getFullYear(); const month=calMonth.getMonth();
  const firstDay=new Date(year,month,1).getDay();
  const daysInMonth=new Date(year,month+1,0).getDate();

  const tourDays={};
  tourHistory.forEach(t=>{ if(!tourDays[t.date]) tourDays[t.date]=[]; tourDays[t.date].push(t); });

  const selectedTours = selectedDay ? (tourDays[selectedDay]||[]) : [];
  const todayShiftsDone = (tourDays[todayStr()]||[]).map(t=>t.shift);

  return(
    <div style={{padding:"20px 16px",display:"flex",flexDirection:"column",gap:18}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div>
          <div className="tag" style={{marginBottom:4}}>PLANCHER</div>
          <div className="serif" style={{fontSize:22,fontWeight:700,color:"var(--gold)"}}>Tournée</div>
        </div>
        {isOwner&&<button className="btn btn-ghost" onClick={onEditConfig} style={{padding:"8px 14px",borderRadius:12,fontSize:12}}>⚙ Modifier la liste</button>}
      </div>

      {/* TODAY SHIFTS */}
      <div className="card" style={{padding:"18px"}}>
        <div className="tag" style={{marginBottom:12}}>AUJOURD'HUI</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {SHIFTS.map(shift=>{
            const done=todayShiftsDone.includes(shift);
            const tour=tourDays[todayStr()]?.find(t=>t.shift===shift);
            return(
              <div key={shift} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:12,background:done?"rgba(42,157,143,0.08)":"var(--s2)",border:`1px solid ${done?"rgba(42,157,143,0.25)":"var(--border)"}`}}>
                <div style={{width:36,height:36,borderRadius:10,background:done?"rgba(42,157,143,0.15)":"var(--gold-dim)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>
                  {shift==="Matin"?"🌅":shift==="Midi"?"☀️":"🌙"}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:600,color:"var(--text)"}}>{shift}</div>
                  {done&&tour&&<div style={{fontSize:11,color:"var(--t2)",marginTop:1}}>Score {tour.score}/{tour.total} · {tour.doneBy} · {tour.duration}</div>}
                </div>
                {done
                  ? <button className="btn" onClick={()=>onStart(shift)}
                      style={{padding:"6px 12px",borderRadius:10,fontSize:11,background:"rgba(42,157,143,0.1)",color:"#2a9d8f",border:"1px solid rgba(42,157,143,0.2)"}}>
                      ✓ Fait · Refaire
                    </button>
                  : <button className="btn btn-gold" onClick={()=>onStart(shift)} style={{padding:"8px 14px",borderRadius:10,fontSize:12}}>Démarrer</button>
                }
              </div>
            );
          })}
        </div>
      </div>

      {/* CALENDAR */}
      <div className="card" style={{padding:"18px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <button className="btn btn-ghost" onClick={()=>setCalMonth(m=>{const n=new Date(m);n.setMonth(n.getMonth()-1);return n;})} style={{width:32,height:32,borderRadius:9,fontSize:16}}>‹</button>
          <div style={{fontSize:14,fontWeight:700,color:"var(--text)",textTransform:"capitalize"}}>{calMonth.toLocaleDateString("fr-CA",{month:"long",year:"numeric"})}</div>
          <button className="btn btn-ghost" onClick={()=>setCalMonth(m=>{const n=new Date(m);n.setMonth(n.getMonth()+1);return n;})} style={{width:32,height:32,borderRadius:9,fontSize:16}}>›</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:8}}>
          {["D","L","M","M","J","V","S"].map((d,i)=><div key={i} style={{textAlign:"center",fontSize:10,color:"var(--t3)",fontWeight:700,padding:"4px 0"}}>{d}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
          {Array(firstDay).fill(null).map((_,i)=><div key={`e${i}`}/>)}
          {Array(daysInMonth).fill(null).map((_,i)=>{
            const day=i+1;
            const dateStr=`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
            const hasTours=tourDays[dateStr];
            const isToday=dateStr===todayStr();
            const isSel=dateStr===selectedDay;
            return(
              <div key={day} onClick={()=>setSelectedDay(isSel?null:dateStr)}
                style={{aspectRatio:"1",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",borderRadius:9,cursor:hasTours?"pointer":"default",
                  background:isSel?"var(--gold)":isToday?"var(--gold-dim)":"transparent",
                  border:isToday&&!isSel?"1px solid var(--gold-b)":"1px solid transparent"}}>
                <span style={{fontSize:12,fontWeight:isToday?700:400,color:isSel?"#0a0a0d":isToday?"var(--gold)":"var(--text)"}}>{day}</span>
                {hasTours&&<div style={{display:"flex",gap:2,marginTop:2}}>
                  {hasTours.map((_,ti)=><div key={ti} style={{width:4,height:4,borderRadius:"50%",background:isSel?"#0a0a0d":"var(--gold)"}}/>)}
                </div>}
              </div>
            );
          })}
        </div>
        {selectedDay&&selectedTours.length>0&&(
          <div style={{marginTop:14,paddingTop:14,borderTop:"1px solid var(--border)",display:"flex",flexDirection:"column",gap:8}}>
            <div className="tag" style={{marginBottom:4}}>{new Date(selectedDay+"T12:00:00").toLocaleDateString("fr-CA",{weekday:"long",day:"numeric",month:"long"})}</div>
            {selectedTours.map((t,i)=>(
              <div key={i} className="card-tap" onClick={()=>onSelectTour(t)} style={{padding:"10px 12px",background:"var(--s2)",borderRadius:11,border:"1px solid var(--border)",cursor:"pointer"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{t.shift}</div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{fontSize:12,fontWeight:700,color:"var(--gold)"}}>{t.score}/{t.total}</div><span style={{color:"var(--t3)"}}>›</span></div>
                </div>
                <div style={{fontSize:11,color:"var(--t2)",marginTop:3}}>{t.doneBy} · {t.duration} · {t.startTime}</div>
                {t.issues?.length>0&&<div style={{fontSize:11,color:"#e63946",marginTop:4}}>⚠ {t.issues.length} problème{t.issues.length>1?"s":""} signalé{t.issues.length>1?"s":""}</div>}
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

  const [checks,setChecks]   = useState({});
  const [notes,setNotes]     = useState({});
  const [photos,setPhotos]   = useState({});
  const [currentDept,setCurrentDept] = useState(config.order[0]);
  const fileRef = useRef();
  const [photoTarget,setPhotoTarget] = useState(null);

  const deptItems = allItems.filter(x=>x.dept===currentDept);
  const totalItems = allItems.length;
  const doneItems  = Object.keys(checks).filter(k=>checks[k]==="ok"||checks[k]==="issue").length;
  const pct = totalItems>0?Math.round((doneItems/totalItems)*100):0;

  const handleFile = e => {
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader(); r.onload=ev=>setPhotos(p=>({...p,[photoTarget]:ev.target.result})); r.readAsDataURL(f);
  };

  const handleSave = () => {
    const issues = allItems.filter(x=>checks[x.key]==="issue").map(x=>({...x,note:notes[x.key],photo:photos[x.key]}));
    const elapsed = Math.round((Date.now()-startTime)/60000);
    const duration = elapsed<60?`${elapsed} min`:`${Math.floor(elapsed/60)}h${elapsed%60>0?" "+elapsed%60+"min":""}`;
    const score = allItems.filter(x=>checks[x.key]==="ok").length;
    issues.forEach(issue=>{
      onCreateTask({title:`⚠ Problème: ${issue.item}`,description:issue.note||"Problème signalé lors de la tournée "+shift,assignedTo:users.find(u=>u.isOwner)?.id||users[0]?.id,priority:"urgent",status:"todo",department:issue.dept,dueDate:todayStr(),dueTime:"",photo:issue.photo||null,recurrence:"none",customDays:[]});
    });
    onSave({shift,date:todayStr(),doneBy:me.name,score,total:totalItems,duration,startTime:new Date(startTime).toLocaleTimeString("fr-CA",{hour:"2-digit",minute:"2-digit"}),issues});
  };

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(5px)",zIndex:50,display:"flex",flexDirection:"column"}}>
      <div style={{flex:1,background:"var(--s1)",display:"flex",flexDirection:"column"}}>
        {/* HEADER */}
        <div style={{padding:"14px 18px",borderBottom:"1px solid var(--border)",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div>
              <div className="tag" style={{marginBottom:3}}>TOURNÉE</div>
              <div className="serif" style={{fontSize:20,fontWeight:700,color:"var(--gold)"}}>{shift}</div>
            </div>
            <button className="btn btn-ghost" onClick={onClose} style={{width:34,height:34,borderRadius:10,fontSize:18}}>×</button>
          </div>
          {/* PROGRESS */}
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{flex:1,height:6,background:"var(--s2)",borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,var(--gold),#a8853b)",borderRadius:3,transition:"width .3s"}}/>
            </div>
            <div style={{fontSize:12,fontWeight:700,color:"var(--gold)",whiteSpace:"nowrap"}}>{doneItems}/{totalItems}</div>
          </div>
          {/* DEPT TABS */}
          <div style={{display:"flex",gap:5,overflowX:"auto",marginTop:10,paddingBottom:2}}>
            {config.order.map(d=>{
              const dItems=allItems.filter(x=>x.dept===d);
              const dDone=dItems.filter(x=>checks[x.key]==="ok"||checks[x.key]==="issue").length;
              const allDone=dDone===dItems.length;
              return(
                <button key={d} className="btn" onClick={()=>setCurrentDept(d)}
                  style={{padding:"5px 11px",borderRadius:20,fontSize:11,whiteSpace:"nowrap",flexShrink:0,
                    background:currentDept===d?"var(--gold)":allDone?"rgba(42,157,143,0.1)":"var(--s2)",
                    color:currentDept===d?"#0a0a0d":allDone?"#2a9d8f":"var(--t2)",
                    border:`1px solid ${currentDept===d?"transparent":allDone?"rgba(42,157,143,0.3)":"var(--border)"}`}}>
                  {allDone&&currentDept!==d?"✓ ":""}{d}
                </button>
              );
            })}
          </div>
        </div>

        {/* ITEMS */}
        <div style={{flex:1,overflowY:"auto",padding:"14px 16px",display:"flex",flexDirection:"column",gap:8}}>
          <div className="tag" style={{marginBottom:4}}>{currentDept}</div>
          {deptItems.map(({item,key})=>{
            const status=checks[key];
            return(
              <div key={key} style={{background:"var(--s2)",borderRadius:14,border:`1px solid ${status==="ok"?"rgba(42,157,143,0.3)":status==="issue"?"rgba(230,57,70,0.3)":"var(--border)"}`,overflow:"hidden"}}>
                <div style={{padding:"13px 14px",display:"flex",alignItems:"center",gap:12}}>
                  <div style={{flex:1,fontSize:14,color:"var(--text)",fontWeight:500}}>{item}</div>
                  <div style={{display:"flex",gap:6}}>
                    <button className="btn" onClick={()=>setChecks(p=>({...p,[key]:p[key]==="ok"?undefined:"ok"}))}
                      style={{width:36,height:36,borderRadius:10,fontSize:16,
                        background:status==="ok"?"rgba(42,157,143,0.15)":"var(--s1)",
                        border:`1px solid ${status==="ok"?"rgba(42,157,143,0.4)":"var(--border)"}`}}>
                      ✓
                    </button>
                    <button className="btn" onClick={()=>setChecks(p=>({...p,[key]:p[key]==="issue"?undefined:"issue"}))}
                      style={{width:36,height:36,borderRadius:10,fontSize:16,
                        background:status==="issue"?"rgba(230,57,70,0.12)":"var(--s1)",
                        border:`1px solid ${status==="issue"?"rgba(230,57,70,0.35)":"var(--border)"}`}}>
                      ⚠
                    </button>
                  </div>
                </div>
                {status==="issue"&&(
                  <div style={{padding:"0 14px 12px",display:"flex",flexDirection:"column",gap:8}}>
                    <input className="field" value={notes[key]||""} onChange={e=>setNotes(p=>({...p,[key]:e.target.value}))} placeholder="Décrire le problème..." style={{fontSize:13,padding:"10px 12px"}}/>
                    <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{display:"none"}} onClick={()=>setPhotoTarget(key)}/>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <button className="btn btn-ghost" onClick={()=>{setPhotoTarget(key);setTimeout(()=>fileRef.current?.click(),50);}}
                        style={{padding:"8px 12px",borderRadius:10,fontSize:12,flexShrink:0}}>
                        📷 {photos[key]?"Changer":"Photo"}
                      </button>
                      {photos[key]&&(
                        <div style={{position:"relative",borderRadius:8,overflow:"hidden",width:60,height:60,flexShrink:0}}>
                          <img src={photos[key]} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                          <button className="btn" onClick={()=>setPhotos(p=>({...p,[key]:null}))} style={{position:"absolute",top:2,right:2,width:18,height:18,borderRadius:"50%",background:"rgba(0,0,0,0.7)",color:"white",fontSize:11,border:"none",padding:0}}>×</button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* FOOTER */}
        <div style={{padding:"12px 16px 32px",borderTop:"1px solid var(--border)",flexShrink:0}}>
          <button className="btn btn-gold" onClick={handleSave} style={{width:"100%",padding:"16px",borderRadius:14,fontSize:15}}>
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
    else setCfg(c=>({...c,deptItems:{...c.deptItems,[activeTab]:[...(c.deptItems[activeTab]||[]),newItem.trim()]}}));
    setNewItem("");
  };

  const removeItem = (tab,idx) => {
    if(tab==="base") setCfg(c=>({...c,baseItems:c.baseItems.filter((_,i)=>i!==idx)}));
    else setCfg(c=>({...c,deptItems:{...c.deptItems,[tab]:c.deptItems[tab].filter((_,i)=>i!==idx)}}));
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
      <div className="sheet slide-up" onClick={e=>e.stopPropagation()} style={{maxHeight:"93vh"}}>
        <div className="handle"/>
        <div style={{padding:"4px 18px 10px",borderBottom:"1px solid var(--border)",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div className="serif" style={{fontSize:20,fontWeight:700,color:"var(--text)"}}>Configurer la tournée</div>
            <button className="btn btn-outline" onClick={onClose} style={{width:32,height:32,borderRadius:10,fontSize:18}}>×</button>
          </div>
          <button className="btn btn-gold" onClick={()=>onSave(cfg)} style={{width:"100%",padding:"14px",borderRadius:13,fontSize:14}}>Sauvegarder</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"14px 18px 32px",display:"flex",flexDirection:"column",gap:16}}>

          {/* ORDER */}
          <div>
            <div className="tag" style={{marginBottom:10}}>ORDRE DES ARRÊTS</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {cfg.order.map((dept,i)=>(
                <div key={dept} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"var(--s2)",borderRadius:11,border:"1px solid var(--border)"}}>
                  <div style={{width:22,height:22,borderRadius:6,background:"var(--gold-dim)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"var(--gold)"}}>{i+1}</div>
                  <div style={{flex:1,fontSize:13,fontWeight:500,color:"var(--text)"}}>{dept}</div>
                  <div style={{display:"flex",gap:4}}>
                    <button className="btn btn-ghost" onClick={()=>moveOrder(i,-1)} style={{width:28,height:28,borderRadius:7,fontSize:12,padding:0}}>↑</button>
                    <button className="btn btn-ghost" onClick={()=>moveOrder(i,1)}  style={{width:28,height:28,borderRadius:7,fontSize:12,padding:0}}>↓</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ITEMS */}
          <div>
            <div className="tag" style={{marginBottom:10}}>POINTS À VÉRIFIER</div>
            <div style={{display:"flex",gap:5,overflowX:"auto",marginBottom:12,paddingBottom:2}}>
              {["base",...DEPARTMENTS].map(t=>(
                <button key={t} className="btn" onClick={()=>setActiveTab(t)}
                  style={{padding:"6px 12px",borderRadius:20,fontSize:11,whiteSpace:"nowrap",flexShrink:0,
                    background:activeTab===t?"var(--gold)":"var(--s2)",color:activeTab===t?"#0a0a0d":"var(--t2)",border:"1px solid var(--border)"}}>
                  {t==="base"?"Base (tous)":t}
                </button>
              ))}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
              {items.map((item,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"var(--s2)",borderRadius:11,border:"1px solid var(--border)"}}>
                  <div style={{flex:1,fontSize:13,color:"var(--text)"}}>{item}</div>
                  <button className="btn btn-danger" onClick={()=>removeItem(activeTab,i)} style={{width:28,height:28,borderRadius:7,fontSize:13,padding:0}}>×</button>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8}}>
              <input className="field" value={newItem} onChange={e=>setNewItem(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addItem()} placeholder="Ajouter un point..." style={{flex:1,padding:"11px 13px",fontSize:14}}/>
              <button className="btn btn-gold" onClick={addItem} style={{width:44,height:44,borderRadius:12,fontSize:20,flexShrink:0}}>+</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TEAM TAB ─────────────────────────────────────────────────────
function TeamTab({users,me,isOwner,onAdd,onEdit,tasks,joinRequests,onApprove,onReject}){
  return(
    <div style={{padding:"20px 16px",display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div><div className="tag" style={{marginBottom:4}}>MEMBRES</div><div className="serif" style={{fontSize:22,fontWeight:700,color:"var(--gold)"}}>Équipe</div></div>
        {isOwner&&<button className="btn btn-gold" onClick={onAdd} style={{padding:"9px 16px",borderRadius:12,fontSize:13}}>+ Ajouter</button>}
      </div>
      {!isOwner&&<div className="card" style={{padding:"12px 16px",textAlign:"center",fontSize:13,color:"var(--t2)"}}>Seul le propriétaire peut gérer l'équipe</div>}
      {isOwner&&joinRequests?.filter(r=>r.status==="pending").length>0&&(
        <div>
          <div className="tag" style={{marginBottom:10}}>DEMANDES D'ACCÈS EN ATTENTE</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {joinRequests.filter(r=>r.status==="pending").map(r=>(
              <div key={r.id} className="card" style={{padding:"14px",borderLeft:"3px solid #f4a261"}}>
                <div style={{fontSize:14,fontWeight:600,color:"var(--text)",marginBottom:2}}>{r.name}</div>
                <div style={{fontSize:12,color:"var(--t2)",marginBottom:10}}>{r.role}</div>
                <div style={{display:"flex",gap:8}}>
                  <button className="btn btn-ok" onClick={()=>onApprove(r)} style={{flex:1,padding:"10px",borderRadius:11,fontSize:13,fontWeight:700}}>✓ Approuver</button>
                  <button className="btn btn-danger" onClick={()=>onReject(r)} style={{flex:1,padding:"10px",borderRadius:11,fontSize:13}}>✕ Refuser</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {users.map(u=>{
          const active=tasks.filter(t=>t.assignedTo===u.id&&t.status!=="done").length;
          return(
            <div key={u.id} className={`card ${isOwner&&!u.isOwner?"card-tap":""}`} onClick={()=>isOwner&&!u.isOwner&&onEdit(u)}
              style={{padding:"15px",display:"flex",alignItems:"center",gap:13}}>
              <div style={{width:44,height:44,borderRadius:12,background:u.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:u.id===1?"#0a0a0d":"white",flexShrink:0,boxShadow:`0 2px 10px ${u.color}40`}}>{initials(u.name)}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:15,fontWeight:600,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.name}</div>
                <div style={{fontSize:12,color:"var(--t2)",marginTop:2}}>{u.role}</div>
              </div>
              <div style={{flexShrink:0,textAlign:"right"}}>
                {u.isOwner
                  ? <span className="pill" style={{background:"var(--gold-dim)",color:"var(--gold)",border:"1px solid var(--gold-b)"}}>OWNER</span>
                  : <><div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{active}</div><div style={{fontSize:10,color:"var(--t3)"}}>tâche{active!==1?"s":""}</div></>
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
  const rate=tasks.length>0?Math.round((tasks.filter(t=>t.status==="done").length/tasks.length)*100):0;
  const late=tasks.filter(t=>t.status!=="done"&&t.dueDate&&new Date(t.dueDate)<new Date());
  const byUser=users.map(u=>({...u,done:tasks.filter(t=>t.assignedTo===u.id&&t.status==="done").length,total:tasks.filter(t=>t.assignedTo===u.id).length,late:tasks.filter(t=>t.assignedTo===u.id&&t.status!=="done"&&t.dueDate&&new Date(t.dueDate)<new Date()).length})).sort((a,b)=>b.done-a.done);
  const byDept=DEPARTMENTS.map(d=>({name:d,total:tasks.filter(t=>t.department===d).length,done:tasks.filter(t=>t.department===d&&t.status==="done").length,late:tasks.filter(t=>t.department===d&&t.status!=="done"&&t.dueDate&&new Date(t.dueDate)<new Date()).length})).filter(d=>d.total>0).sort((a,b)=>b.total-a.total);
  const tourScore=tourHistory.length>0?Math.round(tourHistory.reduce((acc,t)=>acc+(t.score/t.total*100),0)/tourHistory.length):null;
  return(
    <div style={{padding:"20px 16px",display:"flex",flexDirection:"column",gap:16}}>
      <div><div className="tag" style={{marginBottom:4}}>PERFORMANCE</div><div className="serif" style={{fontSize:22,fontWeight:700,color:"var(--gold)"}}>Statistiques</div></div>
      <div style={{display:"flex",gap:8}}>
        {[7,14,30].map(d=>(
          <button key={d} className="btn" onClick={()=>setPeriod(d)} style={{flex:1,padding:"9px",borderRadius:12,fontSize:13,fontWeight:600,background:period===d?"var(--gold)":"var(--s2)",color:period===d?"#0a0a0d":"var(--t2)",border:"1px solid var(--border)"}}>
            {d}j
          </button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {[
          {label:"Créées",val:inPeriod.length,color:"var(--gold)"},
          {label:"Complétées",val:completed.length,color:"#2a9d8f"},
          {label:"Taux",val:`${rate}%`,color:"var(--gold)"},
          {label:"En retard",val:late.length,color:"#e63946"},
        ].map(s=>(
          <div key={s.label} className="card" style={{padding:"15px",borderTop:`2px solid ${s.color}`}}>
            <div className="serif" style={{fontSize:30,fontWeight:700,color:s.color,lineHeight:1}}>{s.val}</div>
            <div style={{fontSize:12,color:"var(--t2)",marginTop:6,fontWeight:500}}>{s.label}</div>
          </div>
        ))}
      </div>
      {tourScore!==null&&(
        <div className="card" style={{padding:"15px",borderTop:"2px solid var(--gold)",display:"flex",alignItems:"center",gap:14}}>
          <div><div className="serif" style={{fontSize:28,fontWeight:700,color:"var(--gold)"}}>{tourScore}%</div><div style={{fontSize:12,color:"var(--t2)",marginTop:4}}>Score moyen des tournées</div></div>
          <div style={{marginLeft:"auto",fontSize:12,color:"var(--t3)"}}>{tourHistory.length} tournée{tourHistory.length>1?"s":""}</div>
        </div>
      )}
      {shiftReports?.length>0&&(()=>{
        const avgRating = Math.round(shiftReports.reduce((a,r)=>a+r.rating,0)/shiftReports.length*10)/10;
        const avgTraffic = ["faible","moyen","fort"][Math.round(shiftReports.reduce((a,r)=>a+(r.traffic==="fort"?2:r.traffic==="moyen"?1:0),0)/shiftReports.length)];
        return(
          <div className="card" style={{padding:"15px",borderTop:"2px solid var(--gold)",display:"flex",alignItems:"center",gap:14}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:2,marginBottom:4}}>
                {[1,2,3,4,5].map(n=><span key={n} style={{fontSize:18,color:n<=avgRating?"var(--gold)":"var(--t3)"}}>★</span>)}
              </div>
              <div style={{fontSize:12,color:"var(--t2)"}}>Note moyenne des journées · Achalandage {avgTraffic}</div>
            </div>
            <div style={{textAlign:"right",fontSize:12,color:"var(--t3)"}}>{shiftReports.length} rapport{shiftReports.length>1?"s":""}</div>
          </div>
        );
      })()}
      <div>
        <div className="tag" style={{marginBottom:10}}>PAR MEMBRE</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {byUser.map(u=>(
            <div key={u.id} className="card" style={{padding:"14px"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:9}}>
                <div style={{width:30,height:30,borderRadius:8,background:u.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:u.id===1?"#0a0a0d":"white"}}>{initials(u.name)}</div>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{u.name}</div><div style={{fontSize:11,color:"var(--t2)"}}>{u.role}</div></div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:15,fontWeight:700,color:"#2a9d8f"}}>{u.done}<span style={{fontSize:11,color:"var(--t3)",fontWeight:400}}>/{u.total}</span></div>
                  {u.late>0&&<div style={{fontSize:10,color:"#e63946",fontWeight:600}}>{u.late} en retard</div>}
                </div>
              </div>
              <div style={{height:4,background:"var(--s2)",borderRadius:2,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${u.total>0?Math.round(u.done/u.total*100):0}%`,background:"linear-gradient(90deg,var(--gold),#a8853b)",borderRadius:2,transition:"width 1s"}}/>
              </div>
              <div style={{fontSize:10,color:"var(--t3)",marginTop:4,textAlign:"right"}}>{u.total>0?Math.round(u.done/u.total*100):0}%</div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="tag" style={{marginBottom:10}}>PAR DÉPARTEMENT</div>
        <div style={{display:"flex",flexDirection:"column",gap:7}}>
          {byDept.map(d=>(
            <div key={d.name} className="card" style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:12}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:6}}>{d.name}</div>
                <div style={{height:4,background:"var(--s2)",borderRadius:2,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${d.total>0?Math.round(d.done/d.total*100):0}%`,background:"linear-gradient(90deg,var(--gold),#a8853b)",borderRadius:2}}/>
                </div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>{d.done}<span style={{fontSize:11,color:"var(--t3)"}}>/{d.total}</span></div>
                {d.late>0&&<div style={{fontSize:10,color:"#e63946"}}>{d.late} en retard</div>}
              </div>
            </div>
          ))}
          {byDept.length===0&&<div style={{textAlign:"center",padding:"24px",color:"var(--t3)",fontSize:13}}>Aucune donnée</div>}
        </div>
      </div>
      {/* RAPPORT DE JOURNÉE HISTORIQUE */}
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div className="tag">RAPPORTS DE JOURNÉE</div>
          <span style={{fontSize:11,color:"var(--t3)"}}>{shiftReports.length} rapport{shiftReports.length!==1?"s":""}</span>
        </div>
        {shiftReports.length===0
          ? <div className="card" style={{padding:"24px",textAlign:"center"}}>
              <div style={{fontSize:28,marginBottom:8}}>📊</div>
              <div style={{fontSize:13,color:"var(--t3)"}}>Aucun rapport encore</div>
              <div style={{fontSize:11,color:"var(--t3)",marginTop:4}}>Les rapports apparaîtront ici après chaque journée</div>
            </div>
          : <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {shiftReports.slice(0,20).map(r=>{
                const trafficColor = r.traffic==="fort"?"#e63946":r.traffic==="moyen"?"#f4a261":"#2a9d8f";
                const trafficLabel = r.traffic==="fort"?"🔴 Fort":r.traffic==="moyen"?"🟡 Moyen":"🟢 Faible";
                return(
                  <div key={r.id} className="card" style={{padding:"16px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                      <div>
                        <div style={{fontSize:15,fontWeight:700,color:"var(--text)"}}>
                          {new Date(r.date+"T12:00:00").toLocaleDateString("fr-CA",{weekday:"long",day:"numeric",month:"long"})}
                        </div>
                        <div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>Par {r.doneBy} · {ago(r.ts)}</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{display:"flex",gap:3,justifyContent:"flex-end",marginBottom:4}}>
                          {[1,2,3,4,5].map(n=>(
                            <span key={n} style={{fontSize:14,color:n<=r.rating?"var(--gold)":"var(--t3)"}}>★</span>
                          ))}
                        </div>
                        <span style={{fontSize:11,fontWeight:700,color:trafficColor}}>{trafficLabel}</span>
                      </div>
                    </div>
                    {r.highlights&&(
                      <div style={{marginBottom:8,padding:"8px 12px",background:"rgba(42,157,143,0.08)",borderRadius:10,borderLeft:"2px solid #2a9d8f"}}>
                        <div style={{fontSize:10,fontWeight:700,color:"#2a9d8f",marginBottom:3}}>POINTS POSITIFS</div>
                        <div style={{fontSize:13,color:"var(--text)",lineHeight:1.5}}>{r.highlights}</div>
                      </div>
                    )}
                    {r.incidents&&(
                      <div style={{marginBottom:8,padding:"8px 12px",background:"rgba(230,57,70,0.07)",borderRadius:10,borderLeft:"2px solid #e63946"}}>
                        <div style={{fontSize:10,fontWeight:700,color:"#e63946",marginBottom:3}}>INCIDENTS</div>
                        <div style={{fontSize:13,color:"var(--text)",lineHeight:1.5}}>{r.incidents}</div>
                      </div>
                    )}
                    {r.notes&&(
                      <div style={{padding:"8px 12px",background:"var(--s2)",borderRadius:10}}>
                        <div style={{fontSize:10,fontWeight:700,color:"var(--t3)",marginBottom:3}}>NOTES</div>
                        <div style={{fontSize:13,color:"var(--t2)",lineHeight:1.5}}>{r.notes}</div>
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
function TaskDetailModal({task,users,me,getUser,getPri,isOwner,onStatus,onComment,onDelete,onEdit,onPin,onClose}){
  const [comment,setComment]=useState("");
  const [completionNote,setNote]=useState("");
  const [completionPhoto,setPhoto]=useState(null);
  const [confirmDel,setConfirmDel]=useState(false);
  const fileRef=useRef(); const bottomRef=useRef();
  const p=getPri(task.priority); const assigned=getUser(task.assignedTo); const createdBy=getUser(task.createdBy); const s=STATUS_META[task.status];
  const overdue=task.dueDate&&new Date(task.dueDate)<new Date()&&task.status!=="done";
  const canEdit=isOwner||me.id===task.createdBy||me.id===task.assignedTo;
  const handleFile=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setPhoto(ev.target.result);r.readAsDataURL(f);};
  return(
    <div className="overlay" onClick={onClose}>
      <div className="sheet slide-up" onClick={e=>e.stopPropagation()}>
        <div className="handle"/>
        <div style={{overflowY:"auto",flex:1,padding:"4px 18px 16px",display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <span className="pill" style={{background:p?.bg,color:p?.color,border:`1px solid ${p?.border}`}}>{p?.label}</span>
              {task.recurrence&&task.recurrence!=="none"&&<span className="recur-tag">↻ {RECURRENCE.find(r=>r.id===task.recurrence)?.label}</span>}
              {task.pinned&&<span style={{fontSize:11,color:"var(--gold)",fontWeight:700}}>★ Épinglée</span>}
            </div>
            <div style={{display:"flex",gap:6}}>
              <button className="btn btn-ghost" onClick={()=>onPin(task.id)} style={{width:34,height:34,borderRadius:10,fontSize:15,color:"var(--gold)"}}>★</button>
              {canEdit&&<button className="btn btn-ghost" onClick={()=>onEdit(task)} style={{width:34,height:34,borderRadius:10,fontSize:14}}>✏️</button>}
              {(isOwner||me.id===task.createdBy)&&task.status==="done"&&<button className="btn btn-ghost" onClick={()=>onArchive(task.id)} style={{width:34,height:34,borderRadius:10,fontSize:13}} title="Archiver">📦</button>}
              {(isOwner||me.id===task.createdBy)&&<button className="btn btn-danger" onClick={()=>setConfirmDel(true)} style={{padding:"0 12px",height:34,borderRadius:10,fontSize:12,fontWeight:700}}>Effacer</button>}
              <button className="btn btn-outline" onClick={onClose} style={{width:34,height:34,borderRadius:10,fontSize:18}}>×</button>
            </div>
          </div>
          <div>
            <div className="serif" style={{fontSize:22,fontWeight:700,color:"var(--text)",lineHeight:1.25,marginBottom:4}}>{task.title}</div>
            <div style={{fontSize:12,color:"var(--t3)"}}>Par {createdBy?.name} · {ago(task.createdAt)}</div>
          </div>
          {task.description&&<div style={{fontSize:14,color:"var(--t2)",lineHeight:1.7,padding:"12px 14px",background:"var(--s2)",borderRadius:12}}>{task.description}</div>}
          {task.photo&&<div style={{borderRadius:14,overflow:"hidden"}}><img src={task.photo} alt="" style={{width:"100%",maxHeight:200,objectFit:"cover",display:"block"}}/></div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[
              {label:"ASSIGNÉ À",val:<div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:20,height:20,borderRadius:6,background:assigned?.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:assigned?.id===1?"#0a0a0d":"white"}}>{initials(assigned?.name||"?")}</div><span>{assigned?.name}</span></div>},
              {label:"DÉPARTEMENT",val:task.department},
              {label:"STATUT",val:<span style={{color:s.color,fontWeight:600}}>{s.label}</span>},
              {label:"ÉCHÉANCE",val:<span style={{color:overdue?"#e63946":"var(--text)",fontWeight:overdue?700:400}}>{overdue?"⚠ ":""}{task.dueDate?`${new Date(task.dueDate).toLocaleDateString("fr-CA",{month:"short",day:"numeric"})}${task.dueTime?" "+task.dueTime:""}`:"—"}</span>},
            ].map(item=>(
              <div key={item.label} style={{background:"var(--s2)",borderRadius:12,padding:"10px 12px"}}>
                <div className="tag" style={{marginBottom:5}}>{item.label}</div>
                <div style={{fontSize:12,color:"var(--text)",fontWeight:500}}>{item.val}</div>
              </div>
            ))}
          </div>
          {canEdit&&task.status!=="done"&&(
            <div style={{display:"flex",flexDirection:"column",gap:10,padding:"14px",background:"var(--s2)",borderRadius:14}}>
              <div className="tag">COMPLÉTER</div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{display:"none"}}/>
              {completionPhoto
                ? <div style={{position:"relative",borderRadius:10,overflow:"hidden"}}><img src={completionPhoto} alt="" style={{width:"100%",maxHeight:120,objectFit:"cover",display:"block"}}/><button className="btn" onClick={()=>setPhoto(null)} style={{position:"absolute",top:6,right:6,width:26,height:26,borderRadius:"50%",background:"rgba(0,0,0,0.65)",color:"white",fontSize:14,border:"none"}}>×</button></div>
                : <button className="btn btn-outline" onClick={()=>fileRef.current?.click()} style={{padding:"11px",borderRadius:10,fontSize:13}}>📷 Photo preuve</button>
              }
              <input className="field" value={completionNote} onChange={e=>setNote(e.target.value)} placeholder="Note de complétion..." style={{padding:"11px 13px"}}/>
              <div style={{display:"flex",gap:8}}>
                {task.status==="todo"&&<button className="btn btn-warn" onClick={()=>onStatus(task.id,"inprogress")} style={{flex:1,padding:"12px",borderRadius:12,fontSize:13}}>Démarrer</button>}
                <button className="btn btn-ok" onClick={()=>onStatus(task.id,"done",completionNote,completionPhoto)} style={{flex:2,padding:"12px",borderRadius:12,fontSize:14,fontWeight:700}}>✓ Marquer complété</button>
              </div>
            </div>
          )}
          {task.status==="done"&&<div style={{background:"rgba(42,157,143,0.08)",border:"1px solid rgba(42,157,143,0.2)",borderRadius:12,padding:"11px 14px",fontSize:13,color:"#2a9d8f",fontWeight:600}}>Complété · {ago(task.completedAt)}</div>}
          <div>
            <div className="tag" style={{marginBottom:12}}>COMMENTAIRES ({task.comments.length})</div>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:12}}>
              {task.comments.map(c=>{const u=getUser(c.userId);return(
                <div key={c.id} style={{display:"flex",gap:10}}>
                  <div style={{width:28,height:28,borderRadius:8,background:u?.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:u?.id===1?"#0a0a0d":"white",flexShrink:0}}>{initials(u?.name||"?")}</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",gap:8,alignItems:"baseline",marginBottom:4}}><span style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{u?.name}</span><span style={{fontSize:11,color:"var(--t3)"}}>{ago(c.ts)}</span></div>
                    <div style={{fontSize:13,color:"var(--t2)",lineHeight:1.5,background:"var(--s2)",borderRadius:10,padding:"9px 12px"}}>{c.text}</div>
                  </div>
                </div>
              );})}
              <div ref={bottomRef}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <input className="field" value={comment} onChange={e=>setComment(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();onComment(task.id,comment);setComment("");}}} placeholder="Commentaire... (@nom pour mentionner)" style={{flex:1,padding:"11px 14px",fontSize:13}}/>
              <button className="btn btn-gold" onClick={()=>{onComment(task.id,comment);setComment("");}} style={{width:44,height:44,borderRadius:12,fontSize:18,flexShrink:0}}>›</button>
            </div>
          </div>
        </div>
      </div>
      {confirmDel&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={()=>setConfirmDel(false)}>
          <div className="scale-in" style={{background:"var(--s1)",borderRadius:20,padding:24,width:"100%",maxWidth:300,border:"1px solid var(--border)"}}>
            <div className="serif" style={{fontSize:20,fontWeight:700,marginBottom:8,color:"var(--text)"}}>Supprimer ?</div>
            <div style={{fontSize:13,color:"var(--t2)",marginBottom:20}}>Cette action est irréversible.</div>
            <div style={{display:"flex",gap:8}}>
              <button className="btn btn-ghost" onClick={()=>setConfirmDel(false)} style={{flex:1,padding:"12px",borderRadius:12,fontSize:14}}>Annuler</button>
              <button className="btn btn-danger" onClick={()=>onDelete(task.id)} style={{flex:1,padding:"12px",borderRadius:12,fontSize:14}}>Supprimer</button>
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
  const toggleDay=d=>setForm(p=>({...p,customDays:p.customDays?.includes(d)?p.customDays.filter(x=>x!==d):[...(p.customDays||[]),d]}));
  const handleFile=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>set("photo")(ev.target.result);r.readAsDataURL(f);};
  const handleSave=()=>{if(!form.title.trim()){alert("Veuillez entrer un titre");return;}onSave(form);};
  return(
    <div className="overlay" onClick={onClose}>
      <div className="sheet slide-up" onClick={e=>e.stopPropagation()}>
        <div className="handle"/>
        <div style={{padding:"4px 18px 12px",borderBottom:"1px solid var(--border)",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div className="serif" style={{fontSize:20,fontWeight:700,color:"var(--text)"}}>{title}</div>
            <button className="btn btn-outline" onClick={onClose} style={{width:32,height:32,borderRadius:10,fontSize:18}}>×</button>
          </div>
          <button className="btn btn-gold" onClick={handleSave} style={{width:"100%",padding:"15px",borderRadius:13,fontSize:15}}>
            {title==="Nouvelle tâche"?"Publier la tâche":"Sauvegarder"}
          </button>
        </div>
        <div style={{overflowY:"auto",flex:1,padding:"14px 18px 32px",display:"flex",flexDirection:"column",gap:14}}>
          <FL label="TITRE *"><input className="field" value={form.title} onChange={e=>set("title")(e.target.value)} placeholder="Ex: Vérifier les prix du circulaire"/></FL>
          <FL label="DESCRIPTION"><textarea className="field" value={form.description} onChange={e=>set("description")(e.target.value)} placeholder="Détails..." rows={2} style={{resize:"none"}}/></FL>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <FL label="ASSIGNÉ À"><select className="field" value={form.assignedTo} onChange={e=>set("assignedTo")(Number(e.target.value))}>{users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></FL>
            <FL label="PRIORITÉ"><select className="field" value={form.priority} onChange={e=>set("priority")(e.target.value)}>{PRIORITIES.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></FL>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <FL label="DÉPARTEMENT"><select className="field" value={form.department} onChange={e=>set("department")(e.target.value)}>{DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}</select></FL>
            <FL label="STATUT"><select className="field" value={form.status} onChange={e=>set("status")(e.target.value)}>{Object.entries(STATUS_META).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></FL>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <FL label="ÉCHÉANCE"><input type="date" className="field" value={form.dueDate||""} onChange={e=>set("dueDate")(e.target.value)}/></FL>
            <FL label="HEURE"><input type="time" className="field" value={form.dueTime||""} onChange={e=>set("dueTime")(e.target.value)}/></FL>
          </div>
          <FL label="RÉCURRENCE">
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {RECURRENCE.map(r=>(
                <button key={r.id} className="btn" onClick={()=>set("recurrence")(r.id)}
                  style={{padding:"7px 13px",borderRadius:20,fontSize:12,background:form.recurrence===r.id?"var(--gold)":"var(--s2)",color:form.recurrence===r.id?"#0a0a0d":"var(--t2)",border:"1px solid var(--border)"}}>
                  {r.label}
                </button>
              ))}
            </div>
            {form.recurrence==="custom"&&<div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap"}}>
              {DAYS_SHORT.map((d,i)=>(
                <button key={i} className="btn" onClick={()=>toggleDay(i)}
                  style={{width:40,height:40,borderRadius:10,fontSize:12,fontWeight:700,background:form.customDays?.includes(i)?"var(--gold)":"var(--s2)",color:form.customDays?.includes(i)?"#0a0a0d":"var(--t2)",border:"1px solid var(--border)"}}>
                  {d}
                </button>
              ))}
            </div>}
            {form.recurrence!=="none"&&<div style={{fontSize:12,color:"var(--gold)",marginTop:6,fontWeight:500}}>↻ Se recrée après complétion</div>}
          </FL>
          <FL label="PHOTO">
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{display:"none"}}/>
            {form.photo
              ? <div style={{position:"relative",borderRadius:12,overflow:"hidden"}}><img src={form.photo} alt="" style={{width:"100%",maxHeight:140,objectFit:"cover",display:"block"}}/><button className="btn" onClick={()=>set("photo")(null)} style={{position:"absolute",top:8,right:8,width:28,height:28,borderRadius:"50%",background:"rgba(0,0,0,0.65)",color:"white",fontSize:16,border:"none"}}>×</button></div>
              : <button className="btn btn-ghost" onClick={()=>fileRef.current?.click()} style={{width:"100%",padding:"15px",borderRadius:12,fontSize:14}}>📷 Ajouter une photo</button>
            }
          </FL>
        </div>
      </div>
    </div>
  );
}

function NewTaskModal({users,onSave,onClose}){
  return <TaskFormModal title="Nouvelle tâche" initial={{title:"",description:"",assignedTo:users[0]?.id,priority:"normal",status:"todo",department:"Général",dueDate:"",dueTime:"",photo:null,recurrence:"none",customDays:[]}} users={users} onSave={onSave} onClose={onClose}/>;
}
function EditTaskModal({task,users,onSave,onClose}){
  return <TaskFormModal title="Modifier la tâche" initial={{...task}} users={users} onSave={onSave} onClose={onClose}/>;
}

// ─── USER MODALS ──────────────────────────────────────────────────
function UserFormModal({title,initial,onSave,onDelete,onClose,showDelete,isCurrentUser}){
  const [form,setForm]=useState({...initial});
  const set=k=>v=>setForm(p=>({...p,[k]:v}));
  const [confirmDel,setConfirmDel]=useState(false);
  return(
    <div className="overlay" onClick={onClose}>
      <div className="sheet slide-up" onClick={e=>e.stopPropagation()}>
        <div className="handle"/>
        <div style={{padding:"4px 18px 32px",display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div className="serif" style={{fontSize:20,fontWeight:700,color:"var(--text)"}}>{title}</div>
            <button className="btn btn-outline" onClick={onClose} style={{width:32,height:32,borderRadius:10,fontSize:18}}>×</button>
          </div>
          <FL label="NOM COMPLET *"><input className="field" value={form.name} onChange={e=>set("name")(e.target.value)} placeholder="Ex: Marie Côté" autoFocus/></FL>
          {!form.isOwner&&(
            <FL label="POSTE">
              <input className="field" list="roles-list" value={form.role} onChange={e=>set("role")(e.target.value)} placeholder="Ex: Directeur, Gérant(e)..."/>
              <datalist id="roles-list">{["Directeur/Directrice","Dir. Adjoint(e)","Gérant(e)","Assistant(e) gérant"].map(r=><option key={r} value={r}/>)}</datalist>
            </FL>
          )}
          {(showDelete||form.isCurrentUser)&&(
            <FL label={showDelete?"NIP — "+(form.name||""):"Mon NIP"}>
              <input className="field" value={form.pin||""} onChange={e=>set("pin")(e.target.value.slice(0,4).replace(/\D/g,""))}
                placeholder="4 chiffres" maxLength={4} inputMode="numeric" type={showDelete?"text":"password"}/>
              <div style={{fontSize:11,color:"var(--t3)",marginTop:4}}>
                {showDelete?"Visible car vous êtes propriétaire":"Changer votre NIP personnel"}
              </div>
            </FL>
          )}
          <FL label="COULEUR">
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {COLORS.map(c=>(
                <button key={c} className="btn" onClick={()=>set("color")(c)}
                  style={{width:36,height:36,borderRadius:10,background:c,border:form.color===c?"2.5px solid var(--text)":"2px solid transparent"}}>
                  {form.color===c&&<span style={{fontSize:14,color:c==="#C9A84C"?"#0a0a0d":"white"}}>✓</span>}
                </button>
              ))}
            </div>
          </FL>
          <div style={{display:"flex",alignItems:"center",gap:12,padding:"13px",background:"var(--s2)",borderRadius:13,border:"1px solid var(--border)"}}>
            <div style={{width:42,height:42,borderRadius:12,background:form.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:form.color==="#C9A84C"?"#0a0a0d":"white"}}>{initials(form.name||"?")}</div>
            <div><div style={{fontSize:14,fontWeight:600,color:"var(--text)"}}>{form.name||"Aperçu"}</div><div style={{fontSize:12,color:"var(--t2)"}}>{form.role}</div></div>
          </div>
          <button className="btn btn-gold" onClick={()=>{if(!form.name?.trim()){alert("Entrez un nom");return;}onSave(form);}} style={{width:"100%",padding:"15px",borderRadius:13,fontSize:15}}>
            {title==="Nouvel utilisateur"?"Ajouter":"Sauvegarder"}
          </button>
          {showDelete&&<button className="btn btn-danger" onClick={()=>setConfirmDel(true)} style={{width:"100%",padding:"13px",borderRadius:12,fontSize:14}}>Supprimer cet utilisateur</button>}
        </div>
      </div>
      {confirmDel&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={()=>setConfirmDel(false)}>
          <div className="scale-in" style={{background:"var(--s1)",borderRadius:20,padding:24,width:"100%",maxWidth:300,border:"1px solid var(--border)"}}>
            <div className="serif" style={{fontSize:20,fontWeight:700,marginBottom:8,color:"var(--text)"}}>Supprimer ?</div>
            <div style={{fontSize:13,color:"var(--t2)",marginBottom:20}}>Cette action est irréversible.</div>
            <div style={{display:"flex",gap:8}}>
              <button className="btn btn-ghost" onClick={()=>setConfirmDel(false)} style={{flex:1,padding:"12px",borderRadius:12,fontSize:14}}>Annuler</button>
              <button className="btn btn-danger" onClick={()=>onDelete(form.id)} style={{flex:1,padding:"12px",borderRadius:12,fontSize:14}}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function NewUserModal({onSave,onClose}){return <UserFormModal title="Nouvel utilisateur" initial={{name:"",role:"Dir. Adjoint(e)",color:COLORS[1]}} onSave={onSave} onClose={onClose}/>;}
function EditUserModal({user,me,isOwner,onSave,onDelete,onClose}){return <UserFormModal title="Modifier" initial={{...user}} onSave={onSave} onDelete={onDelete} onClose={onClose} showDelete={isOwner&&!user.isOwner}/>;}

// ─── STORE PROFILE MODAL ──────────────────────────────────────────
function StoreProfileModal({store,onSave,onClose}){
  const [form,setForm]=useState({...store});
  const set=k=>v=>setForm(p=>({...p,[k]:v}));
  const fileRef=useRef();
  const handleFile=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>set("logo")(ev.target.result);r.readAsDataURL(f);};
  return(
    <div className="overlay" onClick={onClose}>
      <div className="sheet slide-up" onClick={e=>e.stopPropagation()}>
        <div className="handle"/>
        <div style={{padding:"4px 18px 32px",display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div className="serif" style={{fontSize:20,fontWeight:700,color:"var(--text)"}}>Profil du magasin</div>
            <button className="btn btn-outline" onClick={onClose} style={{width:32,height:32,borderRadius:10,fontSize:18}}>×</button>
          </div>
          <FL label="NOM DU MAGASIN"><input className="field" value={form.name} onChange={e=>set("name")(e.target.value)} placeholder="Mon IGA"/></FL>
          <FL label="NUMÉRO IGA"><input className="field" value={form.number} onChange={e=>set("number")(e.target.value)} placeholder="IGA-001"/></FL>
          <FL label="ADRESSE"><input className="field" value={form.address} onChange={e=>set("address")(e.target.value)} placeholder="123 rue Principale..."/></FL>
          <FL label="LOGO">
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{display:"none"}}/>
            {form.logo
              ? <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px",background:"var(--s2)",borderRadius:12,border:"1px solid var(--border)"}}>
                  <img src={form.logo} alt="" style={{width:52,height:52,borderRadius:12,objectFit:"cover",border:"1.5px solid var(--gold-b)"}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:4}}>Logo actuel</div>
                    <button className="btn btn-danger" onClick={()=>set("logo")(null)} style={{padding:"5px 12px",borderRadius:8,fontSize:12}}>Supprimer</button>
                  </div>
                </div>
              : <button className="btn btn-ghost" onClick={()=>fileRef.current?.click()} style={{width:"100%",padding:"16px",borderRadius:12,fontSize:14}}>📷 Ajouter un logo</button>
            }
          </FL>
          <button className="btn btn-gold" onClick={()=>onSave(form)} style={{width:"100%",padding:"15px",borderRadius:13,fontSize:15}}>Sauvegarder</button>
        </div>
      </div>
    </div>
  );
}

// ─── NOTIFS MODAL ─────────────────────────────────────────────────
function NotifsModal({notifs,onClose}){
  const typeColor=t=>t==="done"?"#2a9d8f":t==="reminder"?"#e63946":t==="mention"?"#8b5cf6":t==="urgency"?"#e63946":t==="event"?"#3b82f6":t==="announce"?"#f4a261":"var(--gold)";
  const typeLabel=t=>t==="done"?"Complété":t==="reminder"?"Rappel":t==="mention"?"Mention":t==="urgency"?"🆘 URGENCE":t==="event"?"Événement":t==="announce"?"Annonce":"Nouvelle tâche";
  return(
    <div className="overlay" onClick={onClose}>
      <div className="sheet slide-up" onClick={e=>e.stopPropagation()} style={{maxHeight:"70vh"}}>
        <div className="handle"/>
        <div style={{padding:"4px 18px 8px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div className="serif" style={{fontSize:20,fontWeight:700,color:"var(--text)"}}>Notifications</div>
          <button className="btn btn-outline" onClick={onClose} style={{width:32,height:32,borderRadius:10,fontSize:18}}>×</button>
        </div>
        <div style={{overflowY:"auto",flex:1,padding:"12px 18px 32px",display:"flex",flexDirection:"column",gap:8}}>
          {notifs.length===0
            ? <div style={{textAlign:"center",padding:"32px",color:"var(--t3)",fontSize:14}}>Aucune notification</div>
            : notifs.map(n=>(
              <div key={n.id} style={{display:"flex",gap:12,padding:"13px 14px",background:"var(--s2)",borderRadius:14,border:"1px solid var(--border)",borderLeft:`3px solid ${typeColor(n.type)}`}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,fontWeight:700,color:typeColor(n.type),letterSpacing:"0.5px",marginBottom:3}}>{typeLabel(n.type).toUpperCase()}</div>
                  <div style={{fontSize:14,fontWeight:600,color:"var(--text)",marginBottom:2}}>{n.text}</div>
                  <div style={{fontSize:12,color:"var(--t2)",fontStyle:"italic",marginBottom:4}}>"{n.sub}"</div>
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
          <div className="serif" style={{fontSize:20,fontWeight:700,color:"var(--text)",marginBottom:4}}>Changer de compte</div>
          {users.map(u=>(
            <button key={u.id} className="btn" onClick={()=>onSwitch(u)}
              style={{padding:"13px 15px",borderRadius:13,background:me.id===u.id?"var(--gold-dim)":"var(--s2)",border:me.id===u.id?"1px solid var(--gold-b)":"1px solid var(--border)",display:"flex",alignItems:"center",gap:12,width:"100%",justifyContent:"flex-start"}}>
              <div style={{width:38,height:38,borderRadius:10,background:u.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:u.id===1?"#0a0a0d":"white",flexShrink:0}}>{initials(u.name)}</div>
              <div style={{textAlign:"left",flex:1}}>
                <div style={{fontSize:14,fontWeight:600,color:"var(--text)"}}>{u.name}</div>
                <div style={{fontSize:12,color:"var(--t2)"}}>{u.role}</div>
              </div>
              {me.id===u.id&&<span className="pill" style={{background:"var(--gold-dim)",color:"var(--gold)",border:"1px solid var(--gold-b)"}}>Actif</span>}
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

function CommTab({events,announcements,users,me,isOwner,getUser,onNewEvent,onEditEvent,onDeleteAnnouncement,onNewAnnouncement}){
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
  const upcomingEvents = [...events].sort((a,b)=>a.date.localeCompare(b.date)||a.startTime.localeCompare(b.startTime)).filter(e=>e.date>=todayStr()).slice(0,5);

  return(
    <div style={{padding:"20px 16px",display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div><div className="tag" style={{marginBottom:4}}>COMMUNICATION</div><div className="serif" style={{fontSize:22,fontWeight:700,color:"var(--gold)"}}>Agenda & Annonces</div></div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn btn-ghost" onClick={onNewAnnouncement} style={{padding:"8px 12px",borderRadius:11,fontSize:12}}>📢</button>
          <button className="btn btn-gold" onClick={onNewEvent} style={{padding:"8px 14px",borderRadius:11,fontSize:13}}>+ Événement</button>
        </div>
      </div>

      {/* VIEW TOGGLE */}
      <div style={{display:"flex",gap:6}}>
        {[{id:"calendar",label:"Calendrier"},{id:"list",label:"Liste"},{id:"announcements",label:"Annonces"}].map(v=>(
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
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <button className="btn btn-ghost" onClick={()=>setCalDate(d=>{const n=new Date(d);n.setMonth(n.getMonth()-1);return n;})} style={{width:32,height:32,borderRadius:9,fontSize:16}}>‹</button>
            <div style={{fontSize:14,fontWeight:700,color:"var(--text)",textTransform:"capitalize"}}>{calDate.toLocaleDateString("fr-CA",{month:"long",year:"numeric"})}</div>
            <button className="btn btn-ghost" onClick={()=>setCalDate(d=>{const n=new Date(d);n.setMonth(n.getMonth()+1);return n;})} style={{width:32,height:32,borderRadius:9,fontSize:16}}>›</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:8}}>
            {["D","L","M","M","J","V","S"].map((d,i)=><div key={i} style={{textAlign:"center",fontSize:10,color:"var(--t3)",fontWeight:700,padding:"3px 0"}}>{d}</div>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
            {Array(firstDay).fill(null).map((_,i)=><div key={`e${i}`}/>)}
            {Array(daysInMonth).fill(null).map((_,i)=>{
              const day=i+1;
              const dateStr=`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const dayEvents=eventsByDay[dateStr]||[];
              const isToday=day===todayDate.getDate()&&month===todayDate.getMonth()&&year===todayDate.getFullYear();
              const isSel=dateStr===selectedDay;
              return(
                <div key={day} onClick={()=>setSelectedDay(isSel?null:dateStr)}
                  style={{borderRadius:9,cursor:"pointer",padding:"4px 2px",minHeight:44,display:"flex",flexDirection:"column",alignItems:"center",
                    background:isSel?"var(--gold)":isToday?"var(--gold-dim)":"transparent",
                    border:isToday&&!isSel?"1px solid var(--gold-b)":"1px solid transparent"}}>
                  <span style={{fontSize:12,fontWeight:isToday?700:400,color:isSel?"#0a0a0d":isToday?"var(--gold)":"var(--text)",marginBottom:3}}>{day}</span>
                  <div style={{display:"flex",flexDirection:"column",gap:1,width:"100%",padding:"0 2px"}}>
                    {dayEvents.slice(0,2).map((ev,ei)=>(
                      <div key={ei} style={{height:4,borderRadius:2,background:isSel?"rgba(10,10,13,0.4)":ev.color,width:"100%"}}/>
                    ))}
                    {dayEvents.length>2&&<div style={{fontSize:8,color:isSel?"#0a0a0d":"var(--t3)",textAlign:"center"}}>+{dayEvents.length-2}</div>}
                  </div>
                </div>
              );
            })}
          </div>
          {selectedDay&&(
            <div style={{marginTop:14,paddingTop:14,borderTop:"1px solid var(--border)",display:"flex",flexDirection:"column",gap:8}}>
              <div className="tag">{new Date(selectedDay+"T12:00:00").toLocaleDateString("fr-CA",{weekday:"long",day:"numeric",month:"long"})}</div>
              {selectedEvents.length===0
                ? <div style={{textAlign:"center",padding:"16px",color:"var(--t3)",fontSize:13}}>Aucun événement ce jour</div>
                : selectedEvents.map(ev=><EventCard key={ev.id} event={ev} getUser={getUser} onEdit={()=>onEditEvent(ev)}/>)
              }
              <button className="btn btn-gold" onClick={onNewEvent} style={{width:"100%",padding:"11px",borderRadius:12,fontSize:13}}>+ Ajouter un événement</button>
            </div>
          )}
        </div>
      )}

      {/* LIST VIEW */}
      {view==="list"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div className="tag" style={{marginBottom:2}}>PROCHAINS ÉVÉNEMENTS</div>
          {upcomingEvents.length===0
            ? <div style={{textAlign:"center",padding:"32px",color:"var(--t3)",fontSize:13}}>Aucun événement à venir</div>
            : upcomingEvents.map(ev=><EventCard key={ev.id} event={ev} getUser={getUser} onEdit={()=>onEditEvent(ev)} showDate/>)
          }
          {events.filter(e=>e.date<todayStr()).length>0&&(
            <>
              <div className="tag" style={{marginTop:8,marginBottom:2}}>PASSÉS</div>
              {events.filter(e=>e.date<todayStr()).slice(0,5).map(ev=><EventCard key={ev.id} event={ev} getUser={getUser} onEdit={()=>onEditEvent(ev)} showDate past/>)}
            </>
          )}
        </div>
      )}

      {/* ANNOUNCEMENTS VIEW */}
      {view==="announcements"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <button className="btn btn-gold" onClick={onNewAnnouncement} style={{width:"100%",padding:"14px",borderRadius:13,fontSize:14}}>📢 Nouvelle annonce</button>
          {announcements.length===0
            ? <div style={{textAlign:"center",padding:"32px",color:"var(--t3)",fontSize:13}}>Aucune annonce</div>
            : announcements.map(a=>{
                const u=getUser(a.createdBy);
                return(
                  <div key={a.id} style={{padding:"14px",background:"var(--s1)",border:"1px solid var(--border)",borderRadius:14,borderLeft:"3px solid #f4a261"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                      <span className="pill" style={{background:"rgba(244,162,97,0.12)",color:"#f4a261",border:"1px solid rgba(244,162,97,0.25)",fontSize:10}}>{a.dept==="all"?"📢 Toute l'équipe":a.dept}</span>
                      {(isOwner||a.createdBy===me.id)&&<button className="btn btn-danger" onClick={()=>onDeleteAnnouncement(a.id)} style={{width:26,height:26,borderRadius:7,fontSize:12,padding:0}}>×</button>}
                    </div>
                    <div style={{fontSize:14,color:"var(--text)",lineHeight:1.6,marginBottom:8}}>{a.text}</div>
                    <div style={{fontSize:11,color:"var(--t3)"}}>{u?.name} · {ago(a.ts)}</div>
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
  const recLabel={none:"",daily:"Quotidien",weekly:"Hebdo",monthly:"Mensuel",custom:"Personnalisé"}[event.recurrence]||"";
  return(
    <div className="card card-tap" onClick={onEdit} style={{padding:"14px",borderLeft:`3px solid ${event.color}`,opacity:past?0.6:1}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:600,color:"var(--text)",marginBottom:2}}>{event.title}</div>
          {showDate&&<div style={{fontSize:11,color:"var(--t3)",marginBottom:4}}>{new Date(event.date+"T12:00:00").toLocaleDateString("fr-CA",{weekday:"short",day:"numeric",month:"short"})}</div>}
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span style={{fontSize:12,color:event.color,fontWeight:600}}>{event.startTime} — {event.endTime}</span>
            {event.category&&<span className="pill" style={{background:`${event.color}18`,color:event.color,border:`1px solid ${event.color}35`,fontSize:10}}>{event.category}</span>}
            {recLabel&&<span className="recur-tag">↻ {recLabel}</span>}
          </div>
        </div>
        <div style={{flexShrink:0,marginLeft:10,fontSize:16}}>›</div>
      </div>
      {event.description&&<div style={{fontSize:12,color:"var(--t2)",marginBottom:8,lineHeight:1.5}}>{event.description}</div>}
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        {members.slice(0,4).map(u=>(
          <div key={u.id} style={{width:22,height:22,borderRadius:6,background:u.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:u.id===1?"#0a0a0d":"white"}}>{initials(u.name)}</div>
        ))}
        {members.length>4&&<span style={{fontSize:11,color:"var(--t3)"}}>+{members.length-4}</span>}
        <span style={{fontSize:11,color:"var(--t3)",marginLeft:2}}>{members.length} participant{members.length>1?"s":""}</span>
      </div>
    </div>
  );
}

// ─── EVENT FORM MODAL ─────────────────────────────────────────────
function EventFormModal({title,initial,users,me,onSave,onDelete,onClose}){
  const [form,setForm]=useState({...initial});
  const [confirmDel,setConfirmDel]=useState(false);
  const set=k=>v=>setForm(p=>({...p,[k]:v}));
  const toggleMember=id=>setForm(p=>({...p,members:p.members?.includes(id)?p.members.filter(x=>x!==id):[...(p.members||[]),id]}));
  const toggleDay=d=>setForm(p=>({...p,customDays:p.customDays?.includes(d)?p.customDays.filter(x=>x!==d):[...(p.customDays||[]),d]}));
  return(
    <div className="overlay" onClick={onClose}>
      <div className="sheet slide-up" onClick={e=>e.stopPropagation()}>
        <div className="handle"/>
        <div style={{padding:"4px 18px 12px",borderBottom:"1px solid var(--border)",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div className="serif" style={{fontSize:20,fontWeight:700,color:"var(--text)"}}>{title}</div>
            <button className="btn btn-outline" onClick={onClose} style={{width:32,height:32,borderRadius:10,fontSize:18}}>×</button>
          </div>
          <button className="btn btn-gold" onClick={()=>{if(!form.title?.trim()){alert("Entrez un titre");return;}onSave(form);}} style={{width:"100%",padding:"15px",borderRadius:13,fontSize:15}}>
            {onDelete?"Sauvegarder":"Créer l'événement"}
          </button>
        </div>
        <div style={{overflowY:"auto",flex:1,padding:"14px 18px 32px",display:"flex",flexDirection:"column",gap:14}}>
          <FL label="TITRE *"><input className="field" value={form.title||""} onChange={e=>set("title")(e.target.value)} placeholder="Ex: Réunion direction"/></FL>
          <FL label="DESCRIPTION / ORDRE DU JOUR"><textarea className="field" value={form.description||""} onChange={e=>set("description")(e.target.value)} placeholder="Points à discuter..." rows={2} style={{resize:"none"}}/></FL>

          {/* COLOR + CATEGORY */}
          <FL label="CATÉGORIE">
            <input className="field" value={form.category||""} onChange={e=>set("category")(e.target.value)} placeholder="Ex: Rencontre direction, Inventaire..." style={{marginBottom:10}}/>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {EVENT_COLORS.map(({color,label})=>(
                <button key={color} className="btn" onClick={()=>set("color")(color)} title={label}
                  style={{width:34,height:34,borderRadius:10,background:color,border:form.color===color?"2.5px solid var(--text)":"2px solid transparent",flexShrink:0}}>
                  {form.color===color&&<span style={{fontSize:14,color:"white",textShadow:"0 1px 2px rgba(0,0,0,0.5)"}}>✓</span>}
                </button>
              ))}
            </div>
          </FL>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <FL label="DATE"><input type="date" className="field" value={form.date||""} onChange={e=>set("date")(e.target.value)}/></FL>
            <FL label="RAPPEL">
              <select className="field" value={form.reminder||"60"} onChange={e=>set("reminder")(e.target.value)}>
                {REMINDER_OPTIONS.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </FL>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <FL label="HEURE DÉBUT"><input type="time" className="field" value={form.startTime||""} onChange={e=>set("startTime")(e.target.value)}/></FL>
            <FL label="HEURE FIN"><input type="time" className="field" value={form.endTime||""} onChange={e=>set("endTime")(e.target.value)}/></FL>
          </div>

          {/* RECURRENCE */}
          <FL label="RÉCURRENCE">
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {RECURRENCE.map(r=>(
                <button key={r.id} className="btn" onClick={()=>set("recurrence")(r.id)}
                  style={{padding:"7px 13px",borderRadius:20,fontSize:12,background:form.recurrence===r.id?"var(--gold)":"var(--s2)",color:form.recurrence===r.id?"#0a0a0d":"var(--t2)",border:"1px solid var(--border)"}}>
                  {r.label}
                </button>
              ))}
            </div>
            {form.recurrence==="custom"&&(
              <div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap"}}>
                {DAYS_SHORT.map((d,i)=>(
                  <button key={i} className="btn" onClick={()=>toggleDay(i)}
                    style={{width:40,height:40,borderRadius:10,fontSize:12,fontWeight:700,background:form.customDays?.includes(i)?"var(--gold)":"var(--s2)",color:form.customDays?.includes(i)?"#0a0a0d":"var(--t2)",border:"1px solid var(--border)"}}>
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
                    style={{padding:"11px 14px",borderRadius:12,background:selected?"var(--gold-dim)":"var(--s2)",border:`1px solid ${selected?"var(--gold-b)":"var(--border)"}`,display:"flex",alignItems:"center",gap:10,width:"100%",justifyContent:"flex-start"}}>
                    <div style={{width:30,height:30,borderRadius:8,background:u.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:u.id===1?"#0a0a0d":"white",flexShrink:0}}>{initials(u.name)}</div>
                    <div style={{textAlign:"left",flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{u.name}</div>
                      <div style={{fontSize:11,color:"var(--t2)"}}>{u.role}</div>
                    </div>
                    {selected&&<span style={{fontSize:14,color:"var(--gold)"}}>✓</span>}
                  </button>
                );
              })}
            </div>
          </FL>

          {onDelete&&(
            <button className="btn btn-danger" onClick={()=>setConfirmDel(true)} style={{width:"100%",padding:"13px",borderRadius:12,fontSize:14}}>Supprimer cet événement</button>
          )}
        </div>
      </div>
      {confirmDel&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={()=>setConfirmDel(false)}>
          <div className="scale-in" style={{background:"var(--s1)",borderRadius:20,padding:24,width:"100%",maxWidth:300,border:"1px solid var(--border)"}}>
            <div className="serif" style={{fontSize:20,fontWeight:700,marginBottom:8,color:"var(--text)"}}>Supprimer ?</div>
            <div style={{fontSize:13,color:"var(--t2)",marginBottom:20}}>Cette action est irréversible.</div>
            <div style={{display:"flex",gap:8}}>
              <button className="btn btn-ghost" onClick={()=>setConfirmDel(false)} style={{flex:1,padding:"12px",borderRadius:12,fontSize:14}}>Annuler</button>
              <button className="btn btn-danger" onClick={()=>onDelete(form.id)} style={{flex:1,padding:"12px",borderRadius:12,fontSize:14}}>Supprimer</button>
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
            <div className="serif" style={{fontSize:20,fontWeight:700,color:"var(--text)"}}>📢 Nouvelle annonce</div>
            <button className="btn btn-outline" onClick={onClose} style={{width:32,height:32,borderRadius:10,fontSize:18}}>×</button>
          </div>
          <FL label="MESSAGE">
            <textarea className="field" value={text} onChange={e=>setText(e.target.value)} placeholder="Ex: Réunion lundi 8h — présence obligatoire..." rows={4} style={{resize:"none"}} autoFocus/>
          </FL>
          <FL label="DESTINATAIRES">
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["all",...DEPARTMENTS].map(d=>(
                <button key={d} className="btn" onClick={()=>setDept(d)}
                  style={{padding:"7px 13px",borderRadius:20,fontSize:12,whiteSpace:"nowrap",
                    background:dept===d?"var(--gold)":"var(--s2)",color:dept===d?"#0a0a0d":"var(--t2)",border:"1px solid var(--border)"}}>
                  {d==="all"?"Toute l'équipe":d}
                </button>
              ))}
            </div>
          </FL>
          <div style={{padding:"12px 14px",background:"rgba(244,162,97,0.08)",borderRadius:12,border:"1px solid rgba(244,162,97,0.2)",fontSize:13,color:"var(--t2)"}}>
            Cette annonce apparaîtra sur l'accueil de {dept==="all"?"tous les membres":"tous les membres du département "+dept}.
          </div>
          <button className="btn btn-gold" onClick={()=>{if(!text.trim()){alert("Entrez un message");return;}onSave({text,dept});}} style={{width:"100%",padding:"15px",borderRadius:13,fontSize:15}}>
            Envoyer l'annonce
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── URGENCY MODAL ────────────────────────────────────────────────
function UrgencyModal({onSend,onClose}){
  const [msg,setMsg]=useState("");
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(230,57,70,0.15)",backdropFilter:"blur(5px)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={onClose}>
      <div className="scale-in" style={{background:"var(--s1)",borderRadius:20,padding:28,width:"100%",maxWidth:360,border:"2px solid rgba(230,57,70,0.4)"}} onClick={e=>e.stopPropagation()}>
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{fontSize:40,marginBottom:8}}>🆘</div>
          <div className="serif" style={{fontSize:22,fontWeight:700,color:"#e63946"}}>Mode Urgence</div>
          <div style={{fontSize:13,color:"var(--t2)",marginTop:4}}>Toute l'équipe sera alertée immédiatement</div>
        </div>
        <textarea className="field" value={msg} onChange={e=>setMsg(e.target.value)}
          placeholder="Décrivez l'urgence... Ex: Bris réfrigérateur boucherie, appeler technicien immédiatement"
          rows={3} style={{resize:"none",borderColor:"rgba(230,57,70,0.3)",marginBottom:14}} autoFocus/>
        <div style={{display:"flex",gap:10}}>
          <button className="btn btn-ghost" onClick={onClose} style={{flex:1,padding:"13px",borderRadius:12,fontSize:14}}>Annuler</button>
          <button className="btn" onClick={()=>{if(!msg.trim()){alert("Décrivez l'urgence");return;}onSend(msg);}}
            style={{flex:2,padding:"13px",borderRadius:12,fontSize:14,fontWeight:800,background:"#e63946",color:"white",border:"none",boxShadow:"0 4px 16px rgba(230,57,70,0.4)"}}>
            🆘 Alerter l'équipe
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SCHEDULE TAB ─────────────────────────────────────────────────
function ScheduleTab({schedules,scheduleDepts,me,isOwner,onAdd,onDelete,onAddDept,onRemoveDept,onRenameDept}){
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
  useEffect(()=>{ if(!scheduleDepts.includes(selectedDept)&&scheduleDepts.length>0) setSelectedDept(scheduleDepts[0]); },[scheduleDepts]);

  const handleFile = e => {
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=ev=>{ onAdd(selectedDept, label||"Semaine du "+new Date().toLocaleDateString("fr-CA",{day:"numeric",month:"long"}), ev.target.result); setLabel(""); setShowAdd(false); };
    r.readAsDataURL(f);
  };

  const deptSchedules = schedules[selectedDept]||[];

  return(
    <div style={{padding:"20px 16px",display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div><div className="tag" style={{marginBottom:4}}>HORAIRES</div><div className="serif" style={{fontSize:22,fontWeight:700,color:"var(--gold)"}}>Par département</div></div>
        <div style={{display:"flex",gap:8}}>
          {isOwner&&<button className="btn btn-ghost" onClick={()=>setShowManage(p=>!p)} style={{padding:"8px 12px",borderRadius:11,fontSize:12}}>⚙ Gérer</button>}
          <button className="btn btn-gold" onClick={()=>setShowAdd(true)} style={{padding:"9px 14px",borderRadius:12,fontSize:13}}>+ Ajouter</button>
        </div>
      </div>

      {/* MANAGE DEPTS PANEL */}
      {showManage&&isOwner&&(
        <div className="card" style={{padding:"16px",display:"flex",flexDirection:"column",gap:12,borderColor:"var(--gold-b)"}}>
          <div className="tag">GÉRER LES DÉPARTEMENTS</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {scheduleDepts.map(d=>(
              <div key={d} style={{display:"flex",alignItems:"center",gap:8}}>
                {renamingDept===d
                  ? <>
                      <input className="field" value={renameVal} onChange={e=>setRenameVal(e.target.value)} style={{flex:1,padding:"8px 12px",fontSize:13}}
                        onKeyDown={e=>{if(e.key==="Enter"){onRenameDept(d,renameVal);setRenamingDept(null);}}}/>
                      <button className="btn btn-gold" onClick={()=>{onRenameDept(d,renameVal);setRenamingDept(null);}} style={{padding:"8px 12px",borderRadius:10,fontSize:12}}>✓</button>
                      <button className="btn btn-ghost" onClick={()=>setRenamingDept(null)} style={{padding:"8px 12px",borderRadius:10,fontSize:12}}>×</button>
                    </>
                  : <>
                      <div style={{flex:1,fontSize:13,color:"var(--text)",fontWeight:500}}>{d}</div>
                      <button className="btn btn-ghost" onClick={()=>{setRenamingDept(d);setRenameVal(d);}} style={{padding:"6px 10px",borderRadius:9,fontSize:11}}>✏️</button>
                      <button className="btn btn-danger" onClick={()=>{if(window.confirm(`Supprimer "${d}" ?`)) onRemoveDept(d);}} style={{padding:"6px 10px",borderRadius:9,fontSize:11}}>×</button>
                    </>
                }
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:8,marginTop:4}}>
            <input className="field" value={newDeptName} onChange={e=>setNewDeptName(e.target.value)} placeholder="Nouveau département..." style={{flex:1,padding:"10px 13px",fontSize:13}}
              onKeyDown={e=>{if(e.key==="Enter"){onAddDept(newDeptName);setNewDeptName("");}}}/>
            <button className="btn btn-gold" onClick={()=>{onAddDept(newDeptName);setNewDeptName("");}} style={{width:42,height:42,borderRadius:11,fontSize:20,flexShrink:0}}>+</button>
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
                  style={{padding:"7px 13px",borderRadius:20,fontSize:12,whiteSpace:"nowrap",flexShrink:0,
                    background:selectedDept===d?"var(--gold)":"var(--s2)",
                    color:selectedDept===d?"#0a0a0d":"var(--t2)",
                    border:"1px solid var(--border)"}}>
                  {d}{count>0&&<span style={{marginLeft:5,background:selectedDept===d?"rgba(0,0,0,0.2)":"var(--gold-dim)",color:selectedDept===d?"#0a0a0d":"var(--gold)",borderRadius:10,padding:"1px 6px",fontSize:10,fontWeight:700}}>{count}</span>}
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
        <div className="card" style={{padding:"16px",display:"flex",flexDirection:"column",gap:12,borderColor:"var(--gold-b)"}}>
          <div className="tag">AJOUTER — {selectedDept.toUpperCase()}</div>
          <input className="field" value={label} onChange={e=>setLabel(e.target.value)}
            placeholder={`Ex: Semaine du ${new Date().toLocaleDateString("fr-CA",{day:"numeric",month:"long"})}`}/>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{display:"none"}}/>
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-gold" onClick={()=>fileRef.current?.click()} style={{flex:2,padding:"13px",borderRadius:12,fontSize:14}}>📷 Scanner / Photo</button>
            <button className="btn btn-ghost" onClick={()=>setShowAdd(false)} style={{flex:1,padding:"13px",borderRadius:12,fontSize:14}}>Annuler</button>
          </div>
        </div>
      )}

      {/* SCHEDULES LIST */}
      {selectedDept&&(
        deptSchedules.length===0
          ? <div style={{textAlign:"center",padding:"48px 20px",color:"var(--t3)"}}>
              <div style={{fontSize:32,marginBottom:10}}>📅</div>
              <div style={{fontSize:14,marginBottom:16}}>Aucun horaire pour {selectedDept}</div>
              <button className="btn btn-gold" onClick={()=>setShowAdd(true)} style={{padding:"12px 20px",borderRadius:12,fontSize:13,margin:"0 auto"}}>Ajouter un horaire</button>
            </div>
          : <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {deptSchedules.map(s=>(
                <div key={s.id} className="card" style={{overflow:"hidden"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderBottom:s.photo?"1px solid var(--border)":"none"}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:600,color:"var(--text)"}}>{s.label}</div>
                      <div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>{new Date(s.ts).toLocaleDateString("fr-CA",{day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"})}</div>
                    </div>
                    {isOwner&&<button className="btn btn-danger" onClick={()=>onDelete(selectedDept,s.id)} style={{width:30,height:30,borderRadius:8,fontSize:13,padding:0}}>×</button>}
                  </div>
                  {s.photo
                    ? <div onClick={()=>setSelectedPhoto(s.photo)} style={{cursor:"zoom-in"}}>
                        <img src={s.photo} alt={s.label} style={{width:"100%",maxHeight:300,objectFit:"contain",background:"var(--s2)",display:"block"}}/>
                        <div style={{padding:"8px 14px",fontSize:11,color:"var(--t3)",textAlign:"center"}}>Appuyer pour agrandir</div>
                      </div>
                    : <div style={{padding:"20px",textAlign:"center",color:"var(--t3)",fontSize:13,background:"var(--s2)"}}>Aucune photo</div>
                  }
                </div>
              ))}
            </div>
      )}

      {/* PHOTO VIEWER */}
      {selectedPhoto&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.95)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setSelectedPhoto(null)}>
          <img src={selectedPhoto} alt="" style={{maxWidth:"100%",maxHeight:"90vh",objectFit:"contain",borderRadius:12}}/>
          <button className="btn" onClick={()=>setSelectedPhoto(null)} style={{position:"absolute",top:20,right:20,width:36,height:36,borderRadius:10,background:"rgba(255,255,255,0.15)",color:"white",fontSize:20,border:"none"}}>×</button>
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
    <div style={{padding:"20px 16px",display:"flex",flexDirection:"column",gap:16,height:"calc(100vh - 160px)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div>
          <div className="tag" style={{marginBottom:4}}>PRIVÉ</div>
          <div className="serif" style={{fontSize:22,fontWeight:700,color:"var(--gold)"}}>Mes notes</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {!saved&&<span style={{fontSize:11,color:"var(--t3)"}}>Non sauvegardé</span>}
          <button className="btn btn-gold" onClick={handleSave} style={{padding:"9px 16px",borderRadius:12,fontSize:13,opacity:saved?0.5:1}}>
            {saved?"✓ Sauvegardé":"Sauvegarder"}
          </button>
        </div>
      </div>

      <div className="card" style={{padding:"6px",flex:1,display:"flex",flexDirection:"column"}}>
        <textarea
          value={text}
          onChange={e=>handleChange(e.target.value)}
          placeholder={"Vos notes privées...\n\nSeul vous pouvez voir ces notes. Idéal pour :\n• Idées et projets\n• Rappels personnels\n• Observations\n• Contacts importants"}
          style={{flex:1,width:"100%",background:"transparent",border:"none",outline:"none",padding:"14px",fontSize:15,color:"var(--text)",fontFamily:"'DM Sans',sans-serif",lineHeight:1.7,resize:"none"}}
        />
      </div>

      <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"var(--s2)",borderRadius:12,border:"1px solid var(--border)"}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:"var(--gold)",flexShrink:0}}/>
        <div style={{fontSize:12,color:"var(--t2)"}}>Ces notes sont <strong style={{color:"var(--text)"}}>privées</strong> — personne d'autre ne peut les voir</div>
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
            <div className="serif" style={{fontSize:20,fontWeight:700,color:"var(--text)"}}>⚙ {T(lang,"settings")}</div>
            <button className="btn btn-outline" onClick={onClose} style={{width:32,height:32,borderRadius:10,fontSize:18}}>×</button>
          </div>

          {/* LANGUAGE */}
          <div>
            <div className="tag" style={{marginBottom:10}}>{T(lang,"language")}</div>
            <div style={{display:"flex",gap:8}}>
              {[{id:"fr",label:"🇫🇷 Français"},{id:"en",label:"🇬🇧 English"}].map(l=>(
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
              {[{id:true,label:"🌙 "+(lang==="en"?"Dark":"Sombre")},{id:false,label:"☀ "+(lang==="en"?"Light":"Clair")}].map(m=>(
                <button key={String(m.id)} className="btn" onClick={()=>setDark(m.id)}
                  style={{flex:1,padding:"13px",borderRadius:13,fontSize:14,fontWeight:700,
                    background:dark===m.id?"var(--gold)":"var(--s2)",
                    color:dark===m.id?"#0a0a0d":"var(--t2)",
                    border:`1px solid ${dark===m.id?"transparent":"var(--border)"}`}}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* THEME COLOR */}
          <div>
            <div className="tag" style={{marginBottom:10}}>{T(lang,"theme")}</div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              {THEME_COLORS.map(({color,label})=>(
                <button key={color} className="btn" onClick={()=>setThemeColor(color)} title={label}
                  style={{width:44,height:44,borderRadius:12,background:color,
                    border:themeColor===color?"3px solid var(--text)":"3px solid transparent",
                    flexShrink:0,boxShadow:themeColor===color?`0 0 12px ${color}60`:"none"}}>
                  {themeColor===color&&<span style={{fontSize:18,color:"white",textShadow:"0 1px 3px rgba(0,0,0,0.5)"}}>✓</span>}
                </button>
              ))}
            </div>
            <div style={{marginTop:12,padding:"12px 14px",background:"var(--s2)",borderRadius:12,border:"1px solid var(--border)",display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:28,height:28,borderRadius:8,background:themeColor,flexShrink:0,boxShadow:`0 0 10px ${themeColor}50`}}/>
              <div style={{fontSize:13,color:"var(--t2)"}}>Couleur sélectionnée — visible dans toute l'app</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── GALLERY TAB ──────────────────────────────────────────────────
function GalleryTab({gallery,allAppPhotos,me,getUser,lang,onCreateFolder,onDeleteFolder,onAddPhoto,onDeletePhoto,onRenameFolder}){
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
    r.onload=ev=>{ onAddPhoto(selectedFolder,ev.target.result,caption||"Sans titre"); setCaption(""); };
    r.readAsDataURL(f);
  };

  const currentFolder = gallery.find(f=>f.id===selectedFolder);
  const displayPhotos = selectedFolder===0 ? allAppPhotos : (currentFolder?.photos||[]);

  return(
    <div style={{padding:"20px 16px",display:"flex",flexDirection:"column",gap:16}}>
      {/* HEADER */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div>
          <div className="tag" style={{marginBottom:4}}>{T(lang,"gallery_title").toUpperCase()}</div>
          <div className="serif" style={{fontSize:22,fontWeight:700,color:"var(--gold)"}}>
            {selectedFolder===null ? T(lang,"gallery_title") : selectedFolder===0 ? T(lang,"allPhotos") : currentFolder?.name}
          </div>
        </div>
        <div style={{display:"flex",gap:7}}>
          {selectedFolder!==null&&(
            <button className="btn btn-ghost" onClick={()=>setSelectedFolder(null)} style={{padding:"8px 12px",borderRadius:11,fontSize:12}}>← Retour</button>
          )}
          {selectedFolder!==null&&selectedFolder!==0&&(
            <button className="btn btn-gold" onClick={()=>fileRef.current?.click()} style={{padding:"8px 14px",borderRadius:11,fontSize:13}}>+ Photo</button>
          )}
        </div>
      </div>

      {/* FOLDERS VIEW */}
      {selectedFolder===null&&(
        <>
          {/* ALL PHOTOS SHORTCUT */}
          <div className="card card-tap" onClick={()=>setSelectedFolder(0)}
            style={{padding:"14px 16px",display:"flex",alignItems:"center",gap:12,borderLeft:"3px solid var(--gold)"}}>
            <div style={{width:48,height:48,borderRadius:12,background:"var(--gold-dim)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>🖼</div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:600,color:"var(--text)"}}>{T(lang,"allPhotos")}</div>
              <div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>{allAppPhotos.length} photo{allAppPhotos.length!==1?"s":""} depuis tâches, tournées, horaires</div>
            </div>
            <div style={{color:"var(--t3)",fontSize:18}}>›</div>
          </div>

          {/* CREATE FOLDER */}
          {showNewFolder
            ? <div className="card" style={{padding:"14px",display:"flex",gap:8}}>
                <input className="field" value={newFolderName} onChange={e=>setNewFolderName(e.target.value)}
                  placeholder={T(lang,"folderName")+"..."} autoFocus
                  onKeyDown={e=>{if(e.key==="Enter"){onCreateFolder(newFolderName);setNewFolderName("");setShowNewFolder(false);}}}
                  style={{flex:1,padding:"10px 13px",fontSize:14}}/>
                <button className="btn btn-gold" onClick={()=>{onCreateFolder(newFolderName);setNewFolderName("");setShowNewFolder(false);}} style={{width:42,height:42,borderRadius:11,fontSize:20,flexShrink:0}}>+</button>
                <button className="btn btn-ghost" onClick={()=>setShowNewFolder(false)} style={{width:42,height:42,borderRadius:11,fontSize:18,flexShrink:0}}>×</button>
              </div>
            : <button className="btn btn-ghost" onClick={()=>setShowNewFolder(true)} style={{width:"100%",padding:"13px",borderRadius:13,fontSize:14,border:"1.5px dashed var(--border)"}}>
                + {T(lang,"createFolder")}
              </button>
          }

          {/* FOLDER LIST */}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {gallery.map(folder=>{
              const preview=folder.photos.slice(0,3);
              return(
                <div key={folder.id} className="card card-tap" onClick={()=>setSelectedFolder(folder.id)}
                  style={{padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
                  {/* PREVIEW THUMBNAILS */}
                  <div style={{display:"flex",gap:3,flexShrink:0}}>
                    {preview.length>0
                      ? preview.map((p,i)=><img key={i} src={p.photo} alt="" style={{width:i===0?48:32,height:i===0?48:32,borderRadius:8,objectFit:"cover",border:"1px solid var(--border)"}}/>)
                      : <div style={{width:48,height:48,borderRadius:12,background:"var(--s2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>📁</div>
                    }
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    {renamingId===folder.id
                      ? <input className="field" value={renameVal} onChange={e=>setRenameVal(e.target.value)} onClick={e=>e.stopPropagation()}
                          onKeyDown={e=>{if(e.key==="Enter"){onRenameFolder(folder.id,renameVal);setRenamingId(null);}}}
                          style={{padding:"7px 10px",fontSize:13}} autoFocus/>
                      : <div style={{fontSize:14,fontWeight:600,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{folder.name}</div>
                    }
                    <div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>{folder.photos.length} photo{folder.photos.length!==1?"s":""}</div>
                  </div>
                  <div style={{display:"flex",gap:6}} onClick={e=>e.stopPropagation()}>
                    <button className="btn btn-ghost" onClick={()=>{setRenamingId(folder.id);setRenameVal(folder.name);}} style={{width:28,height:28,borderRadius:7,fontSize:12,padding:0}}>✏️</button>
                    <button className="btn btn-danger" onClick={()=>onDeleteFolder(folder.id)} style={{width:28,height:28,borderRadius:7,fontSize:12,padding:0}}>×</button>
                  </div>
                </div>
              );
            })}
            {gallery.length===0&&<div style={{textAlign:"center",padding:"32px",color:"var(--t3)",fontSize:13}}>Aucun dossier — créez-en un !</div>}
          </div>
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
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{display:"none"}}/>
              <div style={{display:"flex",gap:8}}>
                <input className="field" value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Titre / description..." style={{flex:1,padding:"10px 13px",fontSize:13}}/>
                <button className="btn btn-gold" onClick={()=>fileRef.current?.click()} style={{width:44,height:44,borderRadius:11,fontSize:18,flexShrink:0}}>📷</button>
              </div>
            </>
          )}

          {displayPhotos.length===0
            ? <div style={{textAlign:"center",padding:"48px 20px",color:"var(--t3)"}}>
                <div style={{fontSize:32,marginBottom:10}}>📷</div>
                <div style={{fontSize:14}}>{T(lang,"noPhotos")}</div>
              </div>
            : viewMode==="grid"
              ? <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                  {displayPhotos.map((p,i)=>(
                    <div key={p.id||i} style={{position:"relative",borderRadius:10,overflow:"hidden",aspectRatio:"1",cursor:"pointer"}}>
                      <img src={p.photo} alt={p.caption||""} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} onClick={()=>setSelectedPhoto(p)}/>
                      {selectedFolder!==0&&p.id&&(
                        <button className="btn" onClick={e=>{e.stopPropagation();onDeletePhoto(selectedFolder,p.id);}}
                          style={{position:"absolute",top:4,right:4,width:22,height:22,borderRadius:"50%",background:"rgba(0,0,0,0.7)",color:"white",fontSize:12,border:"none",padding:0,zIndex:2}}>×</button>
                      )}
                    </div>
                  ))}
                </div>
              : <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {displayPhotos.map((p,i)=>(
                    <div key={p.id||i} className="card card-tap" onClick={()=>setSelectedPhoto(p)} style={{padding:"12px",display:"flex",gap:12,alignItems:"center"}}>
                      <img src={p.photo} alt="" style={{width:56,height:56,borderRadius:10,objectFit:"cover",flexShrink:0}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.caption||"Sans titre"}</div>
                        {p.source&&<div style={{fontSize:11,color:"var(--gold)",marginTop:2}}>{p.source}</div>}
                        <div style={{fontSize:11,color:"var(--t3)",marginTop:1}}>{ago(p.ts||Date.now())}</div>
                      </div>
                      {selectedFolder!==0&&p.id&&(
                        <button className="btn btn-danger" onClick={e=>{e.stopPropagation();onDeletePhoto(selectedFolder,p.id);}} style={{width:28,height:28,borderRadius:7,fontSize:12,padding:0,flexShrink:0}}>×</button>
                      )}
                    </div>
                  ))}
                </div>
          }
        </>
      )}

      {/* PHOTO FULLSCREEN */}
      {selectedPhoto&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.95)",zIndex:100,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setSelectedPhoto(null)}>
          <img src={selectedPhoto.photo} alt="" style={{maxWidth:"100%",maxHeight:"80vh",objectFit:"contain",borderRadius:12}}/>
          {selectedPhoto.caption&&<div style={{marginTop:14,fontSize:14,color:"rgba(255,255,255,0.7)",fontWeight:500,textAlign:"center"}}>{selectedPhoto.caption}</div>}
          {selectedPhoto.source&&<div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:4}}>{selectedPhoto.source}</div>}
          <button className="btn" onClick={()=>setSelectedPhoto(null)} style={{position:"absolute",top:20,right:20,width:36,height:36,borderRadius:10,background:"rgba(255,255,255,0.15)",color:"white",fontSize:20,border:"none"}}>×</button>
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
        <div style={{padding:"4px 18px 12px",borderBottom:"1px solid var(--border)",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div className="serif" style={{fontSize:20,fontWeight:700,color:"var(--text)"}}>📊 Rapport de shift</div>
            <button className="btn btn-outline" onClick={onClose} style={{width:32,height:32,borderRadius:10,fontSize:18}}>×</button>
          </div>
          <button className="btn btn-gold" onClick={()=>onSave({...form,doneBy:me.name})} style={{width:"100%",padding:"15px",borderRadius:13,fontSize:15}}>
            Soumettre le rapport
          </button>
        </div>
        <div style={{overflowY:"auto",flex:1,padding:"16px 18px 32px",display:"flex",flexDirection:"column",gap:16}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <FL label="QUART">
              <select className="field" value={form.shift} onChange={e=>set("shift")(e.target.value)}>
                {SHIFTS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </FL>
            <FL label="DATE">
              <input type="date" className="field" value={form.date} onChange={e=>set("date")(e.target.value)}/>
            </FL>
          </div>

          <FL label="ACHALANDAGE">
            <div style={{display:"flex",gap:8}}>
              {[{id:"faible",label:"🟢 Faible"},{id:"moyen",label:"🟡 Moyen"},{id:"fort",label:"🔴 Fort"}].map(t=>(
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
            <div style={{textAlign:"center",fontSize:13,color:"var(--gold)",marginTop:6,fontWeight:600}}>
              {["","Très difficile","Difficile","Correct","Bien","Excellent !"][form.rating]}
            </div>
          </FL>

          <FL label="POINTS POSITIFS">
            <textarea className="field" value={form.highlights} onChange={e=>set("highlights")(e.target.value)}
              placeholder="Ex: Bonne équipe aujourd'hui, livraison à l'heure..." rows={2} style={{resize:"none"}}/>
          </FL>

          <FL label="INCIDENTS / PROBLÈMES">
            <textarea className="field" value={form.incidents} onChange={e=>set("incidents")(e.target.value)}
              placeholder="Ex: Bris d'équipement, conflit client, manque de stock..." rows={2} style={{resize:"none"}}/>
          </FL>

          <FL label="NOTES ADDITIONNELLES">
            <textarea className="field" value={form.notes} onChange={e=>set("notes")(e.target.value)}
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
            <div className="serif" style={{fontSize:20,fontWeight:700,color:"var(--text)"}}>📋 Templates de tâches</div>
            <button className="btn btn-outline" onClick={onClose} style={{width:32,height:32,borderRadius:10,fontSize:18}}>×</button>
          </div>
          <div style={{fontSize:13,color:"var(--t2)",lineHeight:1.5}}>Applique un template pour créer plusieurs tâches d'un coup.</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {templates.map((t,i)=>(
              <div key={i} className="card" style={{padding:"14px",borderColor:selected===i?"var(--gold-b)":"var(--border)",cursor:"pointer"}} onClick={()=>setSelected(selected===i?null:i)}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:selected===i?12:0}}>
                  <div style={{fontSize:15,fontWeight:700,color:"var(--text)"}}>{t.name}</div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:11,color:"var(--t3)"}}>{t.tasks.length} tâches</span>
                    <span style={{color:"var(--t3)",fontSize:16}}>{selected===i?"▲":"▼"}</span>
                  </div>
                </div>
                {selected===i&&(
                  <>
                    <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
                      {t.tasks.map((task,j)=>{
                        const p=PRIORITIES.find(pr=>pr.id===task.priority);
                        return(
                          <div key={j} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"var(--s2)",borderRadius:9}}>
                            <div style={{width:6,height:6,borderRadius:"50%",background:p?.color,flexShrink:0}}/>
                            <span style={{fontSize:13,color:"var(--text)",flex:1}}>{task.title}</span>
                            <span style={{fontSize:10,color:"var(--t3)"}}>{task.department}</span>
                          </div>
                        );
                      })}
                    </div>
                    <button className="btn btn-gold" onClick={()=>onApply(t)} style={{width:"100%",padding:"13px",borderRadius:12,fontSize:14}}>
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
function GlobalSearchModal({query,setQuery,tasks,events,announcements,notes,me,getUser,getPri,onTask,onClose}){
  const q = query.toLowerCase().trim();
  const results = q.length<2 ? [] : [
    ...tasks.filter(t=>t.title?.toLowerCase().includes(q)||t.description?.toLowerCase().includes(q)).map(t=>({type:"task",item:t,label:t.title,sub:t.department,color:getPri(t.priority)?.color||"var(--gold)"})),
    ...events.filter(e=>e.title?.toLowerCase().includes(q)||e.description?.toLowerCase().includes(q)).map(e=>({type:"event",item:e,label:e.title,sub:e.date+" · "+e.startTime,color:e.color||"#3b82f6"})),
    ...(announcements||[]).filter(a=>a.text?.toLowerCase().includes(q)).map(a=>({type:"announce",item:a,label:a.text.slice(0,60),sub:"Annonce · "+ago(a.ts),color:"#f4a261"})),
  ];

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)",zIndex:200,display:"flex",flexDirection:"column",padding:"0"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"var(--s1)",borderBottom:"1px solid var(--border)",padding:"14px 16px",display:"flex",gap:10,alignItems:"center"}}>
        <div style={{color:"var(--t3)"}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
        <input autoFocus value={query} onChange={e=>setQuery(e.target.value)}
          placeholder="Chercher partout — tâches, événements, annonces..."
          style={{flex:1,background:"transparent",border:"none",outline:"none",fontSize:16,color:"var(--text)",fontFamily:"'DM Sans',sans-serif"}}/>
        <button className="btn" onClick={onClose} style={{background:"var(--s2)",border:"1px solid var(--border)",color:"var(--t2)",borderRadius:9,padding:"6px 12px",fontSize:13}}>Fermer</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}} onClick={e=>e.stopPropagation()}>
        {q.length<2
          ? <div style={{textAlign:"center",padding:"48px 20px",color:"var(--t3)",fontSize:14}}>Tapez au moins 2 caractères pour chercher</div>
          : results.length===0
            ? <div style={{textAlign:"center",padding:"48px 20px",color:"var(--t3)",fontSize:14}}>Aucun résultat pour "{query}"</div>
            : results.map((r,i)=>(
                <div key={i} className="card card-tap" onClick={()=>r.type==="task"&&onTask(r.item)}
                  style={{padding:"13px 14px",borderLeft:`3px solid ${r.color}`,display:"flex",alignItems:"center",gap:12}}>
                  <div style={{fontSize:18,flexShrink:0}}>
                    {r.type==="task"?"📋":r.type==="event"?"📅":"📢"}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:600,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.label}</div>
                    <div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>{r.sub}</div>
                  </div>
                  <div style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:10,background:`${r.color}18`,color:r.color,flexShrink:0}}>
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
  const typeColor=t=>t==="done"?"#2a9d8f":t==="reminder"?"#e63946":t==="mention"?"#8b5cf6":t==="urgency"?"#e63946":t==="event"?"#3b82f6":t==="announce"?"#f4a261":t==="report"?"#2a9d8f":"var(--gold)";
  const typeLabel=t=>t==="done"?"Complété":t==="reminder"?"Rappel":t==="mention"?"Mention":t==="urgency"?"SOS":t==="event"?"Événement":t==="announce"?"Annonce":t==="report"?"Rapport":"Tâche";
  return(
    <div className="overlay" onClick={onClose}>
      <div className="sheet slide-up" onClick={e=>e.stopPropagation()} style={{maxHeight:"75vh"}}>
        <div className="handle"/>
        <div style={{padding:"4px 18px 10px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div className="serif" style={{fontSize:20,fontWeight:700,color:"var(--text)"}}>Notifications</div>
          <div style={{display:"flex",gap:8}}>
            {notifs.length>0&&<button className="btn btn-ghost" onClick={onMarkAllRead} style={{padding:"6px 10px",borderRadius:9,fontSize:11}}>Tout lire</button>}
            {notifs.length>0&&<button className="btn btn-danger" onClick={onClearAll} style={{padding:"6px 10px",borderRadius:9,fontSize:11}}>Tout effacer</button>}
            <button className="btn btn-outline" onClick={onClose} style={{width:32,height:32,borderRadius:10,fontSize:18}}>×</button>
          </div>
        </div>
        <div style={{overflowY:"auto",flex:1,padding:"12px 18px 32px",display:"flex",flexDirection:"column",gap:8}}>
          {notifs.length===0
            ? <div style={{textAlign:"center",padding:"40px",color:"var(--t3)",fontSize:14}}>
                <div style={{fontSize:32,marginBottom:10}}>🔔</div>
                Aucune notification
              </div>
            : notifs.map(n=>(
              <div key={n.id} style={{display:"flex",gap:12,padding:"13px 14px",background:n.read?"var(--s2)":"var(--s1)",borderRadius:14,border:"1px solid var(--border)",borderLeft:`3px solid ${typeColor(n.type)}`}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                    <div style={{fontSize:10,fontWeight:700,color:typeColor(n.type),letterSpacing:"0.5px"}}>{typeLabel(n.type).toUpperCase()}</div>
                    {!n.read&&<div style={{width:6,height:6,borderRadius:"50%",background:"var(--gold)"}}/>}
                  </div>
                  <div style={{fontSize:14,fontWeight:600,color:"var(--text)",marginBottom:2}}>{n.text}</div>
                  <div style={{fontSize:12,color:"var(--t2)",fontStyle:"italic",marginBottom:4}}>"{n.sub}"</div>
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

function AccountMenuModal({me,users,isOwner,onSwitchUser,onSettings,onStoreProfile,onExportPDF,onSearch,onSOS,onChangePin,onClose}){
  const [showSwitch,setShowSwitch] = useState(false);
  return(
    <div className="overlay" onClick={onClose}>
      <div className="sheet slide-up" onClick={e=>e.stopPropagation()}>
        <div className="handle"/>
        <div style={{padding:"4px 18px 32px",display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:14,padding:"16px",background:"var(--s2)",borderRadius:16,border:"1px solid var(--border)",marginBottom:4}}>
            <div style={{width:48,height:48,borderRadius:13,background:me.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,color:me.id===1?"#0a0a0d":"white",flexShrink:0}}>{initials(me.name)}</div>
            <div>
              <div className="serif" style={{fontSize:17,fontWeight:700,color:"var(--text)"}}>{me.name}</div>
              <div style={{fontSize:12,color:"var(--t2)"}}>{me.role}</div>
            </div>
          </div>
          {[
            {icon:"🔍", label:"Recherche globale",              action:onSearch},
            {icon:"⚙",  label:"Paramètres",                    action:onSettings},
            ...(isOwner?[{icon:"🏪", label:"Profil du magasin", action:onStoreProfile}]:[]),
            {icon:"📄", label:"Exporter en PDF",                action:onExportPDF},
          {icon:"🔐", label:"Changer mon NIP",                  action:onChangePin},
            {icon:"🆘", label:"Alerte urgence (SOS)",           action:onSOS, danger:true},
          ].map(item=>(
            <button key={item.label} className="btn" onClick={item.action}
              style={{width:"100%",padding:"14px 16px",borderRadius:13,justifyContent:"flex-start",gap:14,
                background:item.danger?"rgba(230,57,70,0.08)":"var(--s2)",
                border:item.danger?"1px solid rgba(230,57,70,0.2)":"1px solid var(--border)",
                color:item.danger?"#e63946":"var(--text)",fontSize:14,fontWeight:600}}>
              <span style={{fontSize:18}}>{item.icon}</span>
              {item.label}
            </button>
          ))}

        </div>
      </div>
    </div>
  );
}

// ─── JOIN REQUEST FORM ────────────────────────────────────────────
function JoinRequestForm({onSend}){
  const [show,setShow] = useState(false);
  const [name,setName] = useState("");
  const [role,setRole] = useState("");
  const [sent,setSent] = useState(false);

  const handleSend = async () => {
    if(!name.trim()) return;
    await onSend(name.trim(), role.trim()||"Employé");
    setSent(true);
  };

  if(sent) return(
    <div style={{marginTop:8,padding:"16px",background:"rgba(42,157,143,0.1)",borderRadius:14,border:"1px solid rgba(42,157,143,0.2)",textAlign:"center",fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{fontSize:20,marginBottom:6}}>✓</div>
      <div style={{fontSize:13,color:"#2a9d8f",fontWeight:600}}>Demande envoyée !</div>
      <div style={{fontSize:11,color:"rgba(42,157,143,0.7)",marginTop:4}}>Le propriétaire va approuver ton accès</div>
    </div>
  );

  if(!show) return(
    <button onClick={()=>setShow(true)}
      style={{marginTop:8,padding:"14px",borderRadius:14,background:"transparent",border:"1.5px dashed rgba(237,232,223,0.15)",color:"rgba(237,232,223,0.35)",fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",width:"100%"}}>
      + Demander l'accès
    </button>
  );

  return(
    <div style={{marginTop:8,padding:"16px",background:"#141418",borderRadius:14,border:"1px solid rgba(237,232,223,0.1)",fontFamily:"'DM Sans',sans-serif",display:"flex",flexDirection:"column",gap:10}}>
      <div style={{fontSize:13,color:"rgba(237,232,223,0.5)",marginBottom:2}}>Nouvelle demande d'accès</div>
      <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ton nom complet"
        style={{padding:"12px 14px",borderRadius:10,background:"#0a0a0d",border:"1px solid rgba(237,232,223,0.1)",color:"#ede8df",fontSize:14,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/>
      <input value={role} onChange={e=>setRole(e.target.value)} placeholder="Ton poste (ex: Gérant)"
        style={{padding:"12px 14px",borderRadius:10,background:"#0a0a0d",border:"1px solid rgba(237,232,223,0.1)",color:"#ede8df",fontSize:14,outline:"none",fontFamily:"'DM Sans',sans-serif"}}/>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>setShow(false)} style={{flex:1,padding:"12px",borderRadius:10,background:"transparent",border:"1px solid rgba(237,232,223,0.1)",color:"rgba(237,232,223,0.4)",fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Annuler</button>
        <button onClick={handleSend} style={{flex:2,padding:"12px",borderRadius:10,background:"#C9A84C",color:"#0a0a0d",fontSize:13,fontWeight:700,cursor:"pointer",border:"none",fontFamily:"'DM Sans',sans-serif"}}>Envoyer la demande</button>
      </div>
    </div>
  );
}

// ─── PIN LOGIN SCREEN ─────────────────────────────────────────────
function PinLoginScreen({users, onLogin, onJoinRequest}){
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handlePin = (digit) => {
    if(pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError(false);
    if(newPin.length === 4){
      const userPin = selectedUser.pin || "0000";
      if(newPin === userPin){
        setTimeout(()=>onLogin(selectedUser), 200);
      } else {
        setTimeout(()=>{ setPin(""); setError(true); }, 400);
      }
    }
  };

  const initials = name => name.trim().split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();

  return(
    <div style={{minHeight:"100vh",background:"#0a0a0d",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'DM Sans',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=DM+Sans:wght@400;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}`}</style>

      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:48,fontWeight:700,color:"#C9A84C",marginBottom:4}}>GroceryOps</div>

      {!selectedUser ? (
        <>
          <div style={{fontSize:14,color:"rgba(237,232,223,0.4)",marginBottom:36}}>Qui es-tu ?</div>
          <div style={{display:"flex",flexDirection:"column",gap:10,width:"100%",maxWidth:320}}>
            {users.map(u=>(
              <button key={u.id} onClick={()=>setSelectedUser(u)}
                style={{padding:"16px 18px",borderRadius:16,background:"#141418",border:`1.5px solid ${u.color}40`,display:"flex",alignItems:"center",gap:12,cursor:"pointer",width:"100%"}}>
                <div style={{width:44,height:44,borderRadius:12,background:u.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:u.id===1?"#0a0a0d":"white",flexShrink:0}}>
                  {initials(u.name)}
                </div>
                <div style={{textAlign:"left",flex:1}}>
                  <div style={{fontSize:15,fontWeight:600,color:"#ede8df"}}>{u.name}</div>
                  <div style={{fontSize:12,color:"rgba(237,232,223,0.4)",marginTop:1}}>{u.role}</div>
                </div>
                <div style={{color:u.color,fontSize:18}}>›</div>
              </button>
            ))}
            <JoinRequestForm onSend={onJoinRequest}/>
          </div>
        </>
      ) : (
        <>
          <div style={{fontSize:14,color:"rgba(237,232,223,0.4)",marginBottom:28}}>Entrez votre NIP</div>

          {/* USER BADGE */}
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:28,padding:"12px 18px",background:"#141418",borderRadius:14,border:`1px solid ${selectedUser.color}40`}}>
            <div style={{width:36,height:36,borderRadius:10,background:selectedUser.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:selectedUser.id===1?"#0a0a0d":"white"}}>
              {initials(selectedUser.name)}
            </div>
            <div style={{fontSize:14,fontWeight:600,color:"#ede8df"}}>{selectedUser.name}</div>
          </div>

          {/* PIN DOTS */}
          <div style={{display:"flex",gap:16,marginBottom:8}}>
            {[0,1,2,3].map(i=>(
              <div key={i} style={{width:16,height:16,borderRadius:"50%",background:pin.length>i?(error?"#e63946":"#C9A84C"):"rgba(237,232,223,0.15)",transition:"background .15s"}}/>
            ))}
          </div>
          {error&&<div style={{fontSize:12,color:"#e63946",marginBottom:8,fontWeight:600}}>NIP incorrect — réessaie</div>}
          <div style={{height:16,marginBottom:28}}/>

          {/* KEYPAD */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,width:240}}>
            {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((d,i)=>(
              <button key={i} onClick={()=>{ if(d==="⌫"){setPin(p=>p.slice(0,-1));setError(false);} else if(d!=="") handlePin(String(d));}}
                style={{height:64,borderRadius:14,background:d===""?"transparent":"#141418",border:d===""?"none":"1px solid rgba(237,232,223,0.08)",fontSize:d==="⌫"?20:22,fontWeight:600,color:"#ede8df",cursor:d===""?"default":"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                {d}
              </button>
            ))}
          </div>

          <button onClick={()=>{setSelectedUser(null);setPin("");setError(false);}}
            style={{marginTop:24,background:"transparent",border:"none",color:"rgba(237,232,223,0.3)",fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
            ← Changer de compte
          </button>
        </>
      )}
    </div>
  );
}

// ─── CHANGE PIN MODAL ─────────────────────────────────────────────
function ChangePinModal({me,onSave,onClose}){
  const [step,setStep] = useState("current"); // current | new | confirm
  const [currentPin,setCurrentPin] = useState("");
  const [newPin,setNewPin] = useState("");
  const [confirmPin,setConfirmPin] = useState("");
  const [error,setError] = useState("");

  const handleDigit = (digit) => {
    setError("");
    if(step==="current"){
      const p=currentPin+digit;
      setCurrentPin(p);
      if(p.length===4){
        if(p===me.pin){setTimeout(()=>{setStep("new");setCurrentPin("");},300);}
        else{setTimeout(()=>{setCurrentPin("");setError("NIP actuel incorrect");},400);}
      }
    } else if(step==="new"){
      const p=newPin+digit;
      setNewPin(p);
      if(p.length===4) setTimeout(()=>setStep("confirm"),300);
    } else {
      const p=confirmPin+digit;
      setConfirmPin(p);
      if(p.length===4){
        if(p===newPin){onSave(p);}
        else{setTimeout(()=>{setConfirmPin("");setError("Les NIPs ne correspondent pas");},400);}
      }
    }
  };

  const del = () => {
    setError("");
    if(step==="current") setCurrentPin(p=>p.slice(0,-1));
    else if(step==="new") setNewPin(p=>p.slice(0,-1));
    else setConfirmPin(p=>p.slice(0,-1));
  };

  const currentVal = step==="current"?currentPin:step==="new"?newPin:confirmPin;
  const titles = {current:"NIP actuel",new:"Nouveau NIP",confirm:"Confirmer le NIP"};
  const subtitles = {current:"Entrez votre NIP actuel",new:"Choisissez un nouveau NIP à 4 chiffres",confirm:"Entrez à nouveau votre nouveau NIP"};

  return(
    <div className="overlay" onClick={onClose}>
      <div className="sheet slide-up" onClick={e=>e.stopPropagation()}>
        <div className="handle"/>
        <div style={{padding:"4px 18px 40px",display:"flex",flexDirection:"column",alignItems:"center",gap:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",marginBottom:24}}>
            <div className="serif" style={{fontSize:20,fontWeight:700,color:"var(--text)"}}>🔐 Changer mon NIP</div>
            <button className="btn btn-outline" onClick={onClose} style={{width:32,height:32,borderRadius:10,fontSize:18}}>×</button>
          </div>

          <div style={{fontSize:16,fontWeight:600,color:"var(--text)",marginBottom:6}}>{titles[step]}</div>
          <div style={{fontSize:13,color:"var(--t2)",marginBottom:24,textAlign:"center"}}>{subtitles[step]}</div>

          <div style={{display:"flex",gap:14,marginBottom:8}}>
            {[0,1,2,3].map(i=>(
              <div key={i} style={{width:14,height:14,borderRadius:"50%",background:currentVal.length>i?"var(--gold)":"var(--s2)",border:"1.5px solid var(--border)",transition:"background .15s"}}/>
            ))}
          </div>
          {error&&<div style={{fontSize:12,color:"#e63946",marginBottom:8,fontWeight:600}}>{error}</div>}
          <div style={{height:20}}/>

          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,width:240}}>
            {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((d,i)=>(
              <button key={i} onClick={()=>{ if(d==="⌫") del(); else if(d!=="") handleDigit(String(d));}}
                style={{height:60,borderRadius:13,background:d===""?"transparent":"var(--s2)",border:d===""?"none":"1px solid var(--border)",fontSize:d==="⌫"?18:20,fontWeight:600,color:"var(--text)",cursor:d===""?"default":"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                {d}
              </button>
            ))}
          </div>

          {step!=="current"&&(
            <button onClick={()=>{setStep(step==="new"?"current":"new");setNewPin("");setConfirmPin("");setError("");}}
              style={{marginTop:20,background:"transparent",border:"none",color:"var(--t3)",fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
              ← Retour
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TOUR DETAIL MODAL ────────────────────────────────────────────
function TourDetailModal({tour, isOwner, gallery, setGallery, onClose, onDelete}){
  const [confirmDelete, setConfirmDelete] = useState(false);

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(5px)",zIndex:50,display:"flex",flexDirection:"column",justifyContent:"flex-end"}} onClick={onClose}>
      <div className="slide-up" onClick={e=>e.stopPropagation()}
        style={{background:"var(--s1)",borderRadius:"22px 22px 0 0",display:"flex",flexDirection:"column",maxHeight:"88vh"}}>
        
        {/* HANDLE */}
        <div style={{width:40,height:4,borderRadius:2,background:"var(--border)",margin:"12px auto 0",flexShrink:0}}/>

        {/* FIXED HEADER */}
        <div style={{padding:"12px 18px 14px",borderBottom:"1px solid var(--border)",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div>
              <div className="tag" style={{marginBottom:3}}>TOURNÉE · {tour.date}</div>
              <div className="serif" style={{fontSize:22,fontWeight:700,color:"var(--gold)"}}>{tour.shift}</div>
            </div>
            <button className="btn btn-outline" onClick={onClose} style={{width:34,height:34,borderRadius:10,fontSize:18,flexShrink:0}}>×</button>
          </div>

          {/* STATS GRID */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
            {[
              {l:"PAR",    v:tour.doneBy},
              {l:"SCORE",  v:`${tour.score}/${tour.total}`},
              {l:"DURÉE",  v:tour.duration||"—"},
              {l:"HEURE",  v:tour.startTime||"—"},
            ].map(x=>(
              <div key={x.l} style={{background:"var(--s2)",borderRadius:10,padding:"8px 10px"}}>
                <div style={{fontSize:9,fontWeight:700,letterSpacing:"1px",color:"var(--t3)",marginBottom:4}}>{x.l}</div>
                <div style={{fontSize:11,fontWeight:600,color:"var(--gold)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* SCROLLABLE PROBLEMS */}
        <div style={{overflowY:"auto",flex:1,padding:"14px 18px 24px",display:"flex",flexDirection:"column",gap:10}}>
          <div className="tag">PROBLÈMES SIGNALÉS ({tour.issues?.length||0})</div>

          {(!tour.issues||tour.issues.length===0)
            ? <div style={{textAlign:"center",padding:"24px",color:"var(--t2)",fontSize:13}}>
                <div style={{fontSize:28,marginBottom:8}}>✓</div>
                Aucun problème signalé
              </div>
            : tour.issues.map((issue,i)=>(
                <div key={i} style={{padding:"12px 14px",background:"rgba(230,57,70,0.07)",borderRadius:12,borderLeft:"3px solid #e63946"}}>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:2}}>{issue.item}</div>
                  <div style={{fontSize:11,color:"var(--t3)",marginBottom:6}}>{issue.dept}</div>
                  {issue.note&&<div style={{fontSize:13,color:"var(--t2)",lineHeight:1.5,marginBottom:8}}>{issue.note}</div>}
                  {issue.photo&&<img src={issue.photo} alt="" style={{width:"100%",maxHeight:160,objectFit:"cover",borderRadius:10,display:"block"}}/>}
                </div>
              ))
          }

          {/* DELETE BUTTON - owner only */}
          {isOwner&&!confirmDelete&&(
            <button className="btn btn-danger" onClick={()=>setConfirmDelete(true)}
              style={{width:"100%",padding:"13px",borderRadius:12,fontSize:14,marginTop:8}}>
              Supprimer cette tournée
            </button>
          )}
          {isOwner&&confirmDelete&&(
            <div style={{background:"rgba(230,57,70,0.08)",border:"1px solid rgba(230,57,70,0.25)",borderRadius:14,padding:"16px",display:"flex",flexDirection:"column",gap:10,marginTop:8}}>
              <div style={{fontSize:13,color:"var(--text)",textAlign:"center",fontWeight:600}}>Supprimer cette tournée et ses photos ?</div>
              <div style={{display:"flex",gap:8}}>
                <button className="btn btn-ghost" onClick={()=>setConfirmDelete(false)} style={{flex:1,padding:"12px",borderRadius:11,fontSize:14}}>Annuler</button>
                <button className="btn btn-danger" onClick={()=>onDelete(tour)} style={{flex:1,padding:"12px",borderRadius:11,fontSize:14,fontWeight:700}}>Supprimer</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
