import React, { useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, Beaker, Bell, CheckCircle2, ChevronRight, ClipboardCheck,
  Droplets, Gauge, LayoutDashboard, LogOut, Menu, Plus, RefreshCw, Settings, ShieldCheck,
  Waves, X, Download, Search, UserRound, FlaskConical
} from "lucide-react";
import { api, getError } from "./api";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";

const nav = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, group: "OPERATIONS" },
  { id: "water-quality", label: "Water quality", icon: Activity, group: "OPERATIONS" },
  { id: "chemical-dosing", label: "Chemical dosing", icon: FlaskConical, group: "OPERATIONS" },
  { id: "treatment-process", label: "Treatment process", icon: Waves, group: "OPERATIONS" },
  { id: "alerts", label: "Alerts", icon: Bell, group: "OPERATIONS" },
  { id: "compliance", label: "Compliance", icon: ShieldCheck, group: "OPERATIONS" },
  { id: "audit", label: "Audit reports", icon: ClipboardCheck, group: "OPERATIONS" },
  { id: "admin", label: "Admin settings", icon: Settings, group: "ADMINISTRATION" }
];
const config = {
  "water-quality": { title: "Water quality", description: "Monitor quality parameters and review samples.", fields: [
    ["samplePoint", "Sample point", "text"], ["ph", "pH", "number"], ["turbidity", "Turbidity (NTU)", "number"], ["tds", "TDS (mg/L)", "number"], ["dissolvedOxygen", "Dissolved oxygen (mg/L)", "number"], ["temperature", "Temperature (°C)", "number"]
  ]},
  "chemical-dosing": { title: "Chemical dosing", description: "Record chemical usage and dosing activity.", fields: [
    ["chemical", "Chemical", "text"], ["quantity", "Quantity", "number"], ["unit", "Unit (L/kg)", "text"], ["tank", "Tank", "text"], ["operator", "Operator / shift", "text"]
  ]},
  "treatment-process": { title: "Treatment process", description: "Track treatment stages, equipment, and flow.", fields: [
    ["stage", "Treatment stage", "text"], ["flowRate", "Flow rate (MLD)", "number"], ["equipment", "Equipment", "text"], ["shift", "Shift", "text"]
  ]},
  "alerts": { title: "Alerts", description: "Review, acknowledge, and resolve plant alerts.", fields: [
    ["severity", "Severity", "select"], ["message", "Description", "text"], ["assignedTo", "Assigned to", "text"]
  ]},
  "compliance": { title: "Compliance", description: "Record internal checks and compliance reviews.", fields: [
    ["standard", "Standard / checklist", "text"], ["result", "Result / notes", "text"], ["reviewedBy", "Reviewed by", "text"]
  ]}
};
const fmt = value => value == null || value === "" ? "—" : value;
const dateFmt = value => value ? new Date(value).toLocaleString() : "—";

function Logo() {
  return <div className="brand"><div className="brand-icon"><Droplets size={26}/></div><div><b>Aqua<span>Ops</span></b><small>PLANT INTELLIGENCE</small></div></div>;
}

function Login({ onLogin }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError("");
    try { const { data } = await api.post("/auth/login", { username, password }); localStorage.setItem("aquaops_token", data.token); onLogin(data.user); }
    catch (err) { setError(getError(err)); } finally { setBusy(false); }
  }
  return <main className="login-shell">
    <section className="login-promo"><Logo/><div className="promo-copy"><p className="eyebrow">WATER TREATMENT INTELLIGENCE</p><h1>Clarity for every drop.</h1><p>Your single source of truth for plant performance, quality, and environmental compliance.</p></div><div className="promo-footer"><span><Droplets size={16}/> Quality monitoring</span><span><ShieldCheck size={16}/> Compliance insights</span></div></section>
    <section className="login-panel"><form className="login-form" onSubmit={submit}><p className="eyebrow dark">SECURE ACCESS</p><h2>Welcome back</h2><p className="muted">Sign in to monitor Kaveri Water Treatment Plant.</p>
      {error && <div className="error-box">{error}</div>}
      <label>Username<input autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} required placeholder="Enter your username"/></label>
      <label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="Enter your password"/></label>
      <button className="primary wide" disabled={busy}>{busy ? "Signing in…" : "Log in"} <ChevronRight size={18}/></button>
    </form></section>
  </main>;
}

function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [page, setPage] = useState("overview");
  const [dashboard, setDashboard] = useState(null);
  const [records, setRecords] = useState([]);
  const [audit, setAudit] = useState([]);
  const [settings, setSettings] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const pageRecords = useMemo(()=>records.filter(r=>`${r.title} ${r.status} ${JSON.stringify(r.data)}`.toLowerCase().includes(search.toLowerCase())),[records,search]);

  useEffect(() => {
    const token = localStorage.getItem("aquaops_token");
    if (!token) { setChecking(false); return; }
    api.get("/auth/me").then(({data})=>setUser(data.user)).catch(()=>localStorage.removeItem("aquaops_token")).finally(()=>setChecking(false));
  }, []);

  async function load() {
    if (!user) return;
    setLoading(true); setError("");
    try {
      if (page === "overview") { const {data}=await api.get("/dashboard"); setDashboard(data); }
      else if (page === "audit") { const {data}=await api.get("/audit"); setAudit(data.events); }
      else if (page === "admin") {
        const {data}=await api.get("/settings"); setSettings(data.settings);
        if (user.role === "admin") { const u=await api.get("/users"); setUsers(u.data.users); }
      } else if (config[page]) { const {data}=await api.get(`/records/${page}`); setRecords(data.records); }
    } catch (e) { setError(getError(e)); }
    finally { setLoading(false); }
  }
  useEffect(()=>{load();}, [user, page]);

  function logout() { localStorage.removeItem("aquaops_token"); setUser(null); setDashboard(null); setPage("overview"); }
  async function createRecord(payload) {
    try { await api.post(`/records/${page}`, payload); setModal(false); await load(); }
    catch(e) { setError(getError(e)); }
  }
  async function changeStatus(record, status) {
    try { await api.patch(`/records/${page}/${record._id}`, {status}); await load(); }
    catch(e) { setError(getError(e)); }
  }
  async function saveSettings(e) {
    e.preventDefault();
    try { const {data}=await api.patch("/settings", settings); setSettings(data.settings); setError(""); alert("Settings saved successfully"); }
    catch(e) { setError(getError(e)); }
  }
  async function addUser(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try { await api.post("/users", {name:f.get("name"), username:f.get("username"), password:f.get("password"), role:f.get("role")}); e.currentTarget.reset(); const {data}=await api.get("/users"); setUsers(data.users); alert("User created"); }
    catch(e) { setError(getError(e)); }
  }
  function exportCsv() {
    const rows = page === "audit" ? audit : records;
    const keys = ["title","status","createdBy","createdAt","data"];
    const csv = [keys.join(","), ...rows.map(r=>keys.map(k=>JSON.stringify(k==="data"?JSON.stringify(r[k]||{}):(r[k]??""))).join(","))].join("\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); const a=document.createElement("a"); a.href=url; a.download=`aquaops-${page}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  if (checking) return <div className="loading-screen">Loading AquaOps…</div>;
  if (!user) return <Login onLogin={setUser}/>;

  const current = nav.find(n=>n.id===page);

  return <div className="app-shell">
    {mobileNav && <button className="mobile-scrim" onClick={()=>setMobileNav(false)} aria-label="Close menu"/>}
    <aside className={`sidebar ${mobileNav?"show":""}`}><Logo/><div className="nav-label">OPERATIONS</div>{nav.filter(n=>n.group==="OPERATIONS").map(n=><button key={n.id} className={`nav-item ${page===n.id?"active":""}`} onClick={()=>{setPage(n.id);setMobileNav(false);setSearch("");}}><n.icon size={20}/><span>{n.label}</span>{n.id==="alerts"&&dashboard?.activeAlerts>0&&<em>{String(dashboard.activeAlerts).padStart(2,"0")}</em>}</button>)}<div className="nav-label admin-label">ADMINISTRATION</div>{nav.filter(n=>n.group==="ADMINISTRATION").map(n=><button key={n.id} className={`nav-item ${page===n.id?"active":""}`} onClick={()=>{setPage(n.id);setMobileNav(false);}}><n.icon size={20}/><span>{n.label}</span></button>)}<div className="sidebar-bottom"><div className="user-mini"><div className="avatar"><UserRound size={19}/></div><div><b>{user.name}</b><small>{user.role}</small></div><button className="icon-button small" title="Log out" onClick={logout}><LogOut size={17}/></button></div></div></aside>
    <main className="main-area"><header className="topbar"><button className="icon-button menu-toggle" onClick={()=>setMobileNav(true)}><Menu/></button><div><p className="top-eyebrow">LIVE OPERATIONS / KAVERI</p><h2>Kaveri Water Treatment Plant</h2></div>
<div className="top-actions">
  <span className="live-pill"><i/> Connected session</span>

  <button
    className="icon-button"
    title="Refresh data"
    onClick={load}
  >
    <RefreshCw size={19}/>
  </button>

  <button
    className="icon-button"
    title="View alerts"
    onClick={() => setPage("alerts")}
  >
    <Bell size={19}/>
    {dashboard?.activeAlerts > 0 && (
      <span className="notification-count">
        {dashboard.activeAlerts}
      </span>
    )}
  </button>

  <button
    className="account-button"
    title="Account details"
    onClick={() =>
      alert(
        `Name: ${user.name}\nUsername: ${user.username}\nRole: ${user.role}`
      )
    }
  >
    <div className="avatar"><UserRound size={19}/></div>
    <span>{user.name}</span>
  </button>
</div>
</header>
      <div className="content"><div className="page-intro"><div><p className="eyebrow dark">{new Date().toLocaleDateString(undefined,{weekday:"long",day:"2-digit",month:"long",year:"numeric"}).toUpperCase()}</p><h1>{page==="overview"?`Good ${new Date().getHours()<12?"morning":new Date().getHours()<17?"afternoon":"evening"}, ${user.name.split(" ")[0]}`:current?.label || "Audit reports"}</h1><p className="muted">{page==="overview"?"Here’s what needs your attention across the plant.":config[page]?.description || (page==="audit"?"Review system activity and export records.":"Manage plant configuration and access.")}</p></div><span className="updated"><i/> {loading?"Updating…":"Data from database"}</span></div>
        {error&&<div className="error-box page-error"><span>{error}</span><button onClick={()=>setError("")}><X size={16}/></button></div>}
        {page==="overview"&&<Overview data={dashboard} onNavigate={setPage}/>}
        {config[page]&&<section className="panel"><div className="panel-head"><div><h3>{config[page].title} records</h3><p>Records saved in MongoDB</p></div><div className="head-actions"><div className="search-box"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search records"/></div><button className="primary" onClick={()=>setModal(true)}><Plus size={17}/> Add record</button></div></div><RecordsTable records={pageRecords} module={page} onStatus={changeStatus} onExport={exportCsv}/></section>}
        {page==="audit"&&<section className="panel"><div className="panel-head"><div><h3>Audit trail</h3><p>Administrative activity history</p></div><button className="secondary" onClick={exportCsv}><Download size={16}/> Export CSV</button></div><div className="table-wrap"><table><thead><tr><th>Actor</th><th>Action</th><th>Module</th><th>Details</th><th>Date</th></tr></thead><tbody>{audit.map(a=><tr key={a._id}><td>{a.actor}</td><td><span className="status-chip">{a.action}</span></td><td>{a.module}</td><td>{a.details}</td><td>{dateFmt(a.createdAt)}</td></tr>)}{!audit.length&&<EmptyRow text="No audit events yet"/>}</tbody></table></div></section>}
        {page==="admin"&&<Admin settings={settings} setSettings={setSettings} saveSettings={saveSettings} users={users} addUser={addUser} isAdmin={user.role==="admin"}/>}
      </div>
    </main>
    {modal&&<RecordModal module={page} onClose={()=>setModal(false)} onSave={createRecord}/>}
  </div>;
}

function Overview({data,onNavigate}) {
  if(!data) return <div className="empty-state"><RefreshCw className="spin"/> Loading dashboard data…</div>;
  const metrics=[
    {label:"Plant health",value:`${data.plantHealth}%`,note:"Based on current alert status",icon:Gauge,accent:"green"},
    {label:"Flow rate",value:`${data.flowRate} MLD`,note:"Latest recorded process flow",icon:Waves,accent:"teal"},
    {label:"Active alerts",value:String(data.activeAlerts).padStart(2,"0"),note:"Open items need review",icon:AlertTriangle,accent:"amber",click:()=>onNavigate("alerts")},
    {label:"Compliance score",value:`${data.complianceScore}%`,note:"Based on recorded compliance checks",icon:ShieldCheck,accent:"green",click:()=>onNavigate("compliance")}
  ];
  const chart=(data.quality||[]).slice().reverse().map((r,i)=>({sample:r.title.length>14?r.title.slice(0,14)+"…":r.title,ph:Number(r.data?.ph)||0,turbidity:Number(r.data?.turbidity)||0}));
  return <><div className="metric-grid">{metrics.map(m=><button key={m.label} className={`metric-card ${m.accent}`} onClick={m.click||undefined}><div className="metric-top"><span>{m.label}</span><span className="metric-icon"><m.icon size={22}/></span></div><div className="metric-value">{m.value}</div><div className="metric-note">{m.accent==="amber"?<b className="warning-text">Review</b>:<b className="good-text">●</b>} {m.note}</div></button>)}</div>
    <div className="dashboard-grid"><section className="panel chart-panel"><div className="panel-head"><div><h3>Water quality trends</h3><p>Latest recorded samples</p></div><Activity size={20} className="subtle-icon"/></div>{chart.length?<ResponsiveContainer width="100%" height={250}><LineChart data={chart} margin={{top:10,right:10,left:-18,bottom:4}}><CartesianGrid strokeDasharray="3 3" stroke="#e2eeeb"/><XAxis dataKey="sample" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/><Tooltip/><Line type="monotone" dataKey="ph" name="pH" stroke="#00bfa5" strokeWidth={3} dot={{r:4}}/><Line type="monotone" dataKey="turbidity" name="Turbidity (NTU)" stroke="#e5a72d" strokeWidth={2} dot={{r:3}}/></LineChart></ResponsiveContainer>:<div className="empty-state">Add water quality samples to see trends.</div>}</section>
      <section className="panel alert-panel"><div className="panel-head"><div><h3>Attention required</h3><p>Recent active alerts</p></div><button className="text-button" onClick={()=>onNavigate("alerts")}>View all <ChevronRight size={16}/></button></div>{data.alerts?.length?data.alerts.slice(0,4).map(a=><div className="alert-row" key={a._id}><span className={`alert-dot ${(a.data?.severity||"info").toLowerCase()}`}/><div><b>{a.title}</b><p>{a.data?.message||"Review this alert"}</p><small>{dateFmt(a.createdAt)}</small></div><span className="status-chip">{a.status}</span></div>):<div className="empty-state"><CheckCircle2/> No active alerts</div>}</section>
      <section className="panel recent-panel"><div className="panel-head"><div><h3>Recent quality samples</h3><p>Latest saved measurements</p></div><button className="text-button" onClick={()=>onNavigate("water-quality")}>All samples <ChevronRight size={16}/></button></div><div className="table-wrap"><table><thead><tr><th>Sample</th><th>pH</th><th>Turbidity</th><th>Status</th></tr></thead><tbody>{data.quality?.slice(0,5).map(r=><tr key={r._id}><td>{r.title}</td><td>{fmt(r.data?.ph)}</td><td>{fmt(r.data?.turbidity)}</td><td><span className={`status-chip ${r.status==="Within Range"?"success":""}`}>{r.status}</span></td></tr>)}{!data.quality?.length&&<EmptyRow text="No samples recorded"/>}</tbody></table></div></section></div>
  </>;
}

function RecordsTable({records,module,onStatus,onExport}) {
  const alertModule=module==="alerts";
  return <><div className="table-wrap"><table><thead><tr><th>Record</th><th>Details</th><th>Status</th><th>Created</th>{alertModule&&<th>Actions</th>}</tr></thead><tbody>{records.map(r=><tr key={r._id}><td><b>{r.title}</b><small className="cell-sub">{r.createdBy||"system"}</small></td><td><div className="data-tags">{Object.entries(r.data||{}).slice(0,5).map(([k,v])=><span key={k}><b>{k}:</b> {String(v)}</span>)}</div></td><td><span className={`status-chip ${["Within Range","Compliant","Resolved","Completed"].includes(r.status)?"success":r.status==="Open"||r.status==="Needs Review"?"warning":""}`}>{r.status}</span></td><td>{dateFmt(r.createdAt)}</td>{alertModule&&<td><div className="row-actions">{r.status!=="Acknowledged"&&r.status!=="Resolved"&&<button className="small-action" onClick={()=>onStatus(r,"Acknowledged")}>Acknowledge</button>}{r.status!=="Resolved"&&<button className="small-action" onClick={()=>onStatus(r,"Resolved")}>Resolve</button>}</div></td>}</tr>)}{!records.length&&<EmptyRow text="No records found. Add the first record to get started." cols={alertModule?5:4}/>}</tbody></table></div><div className="table-footer"><span>{records.length} record(s)</span><button className="text-button" onClick={onExport}><Download size={15}/> Export CSV</button></div></>;
}
function EmptyRow({text,cols=4}) { return <tr><td colSpan={cols}><div className="empty-state">{text}</div></td></tr>; }

function RecordModal({module,onClose,onSave}) {
  const c=config[module]; const [title,setTitle]=useState(""); const [values,setValues]=useState({}); const [status,setStatus]=useState(module==="alerts"?"Open":"Recorded");
  if(!c) return null;
  function submit(e){e.preventDefault(); const data={}; c.fields.forEach(([key,,type])=>{const v=values[key];if(v!==undefined&&v!=="")data[key]=type==="number"?Number(v):v;}); if(module==="alerts"&&!data.severity)data.severity="Warning"; onSave({title,data,status});}
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><form className="modal" onSubmit={submit}><div className="modal-head"><div><p className="eyebrow dark">NEW ENTRY</p><h2>Add {c.title.toLowerCase()} record</h2></div><button type="button" className="icon-button" onClick={onClose}><X/></button></div><label>Record title<input value={title} onChange={e=>setTitle(e.target.value)} required placeholder="Enter a descriptive title"/></label><div className="form-grid">{c.fields.map(([key,label,type])=><label key={key}>{label}{type==="select"?<select value={values[key]||"Warning"} onChange={e=>setValues({...values,[key]:e.target.value})}><option>Info</option><option>Warning</option><option>Critical</option></select>:<input type={type} step={type==="number"?"any":undefined} value={values[key]??""} onChange={e=>setValues({...values,[key]:e.target.value})} placeholder={`Enter ${label.toLowerCase()}`}/>}</label>)}</div>{module!=="water-quality"&&<label>Status<select value={status} onChange={e=>setStatus(e.target.value)}>{(module==="alerts"?["Open","Acknowledged","Resolved"]:module==="compliance"?["Compliant","Non-compliant","Under Review"]:module==="treatment-process"?["Running","Paused","Maintenance"]:module==="chemical-dosing"?["Completed","In Progress","Scheduled"]:["Recorded"]).map(s=><option key={s}>{s}</option>)}</select></label>}<div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary"><Plus size={16}/> Save record</button></div></form></div>;
}

function Admin({settings,setSettings,saveSettings,users,addUser,isAdmin}) {
  if(!settings) return <div className="panel empty-state">Loading configuration…</div>;
  return <div className="admin-grid"><section className="panel"><div className="panel-head"><div><h3>Plant configuration</h3><p>Manage plant identity and monitoring thresholds.</p></div><Settings size={20}/></div><form className="settings-form" onSubmit={saveSettings}><label>Plant name<input disabled={!isAdmin} value={settings.plantName||""} onChange={e=>setSettings({...settings,plantName:e.target.value})}/></label><h4>Quality thresholds</h4><p className="muted small-text">These demo thresholds trigger review alerts. Confirm suitable limits before operational use.</p><div className="form-grid">{[["phMin","Minimum pH"],["phMax","Maximum pH"],["turbidityMax","Maximum turbidity (NTU)"],["tdsMax","Maximum TDS (mg/L)"]].map(([key,label])=><label key={key}>{label}<input type="number" step="any" disabled={!isAdmin} value={settings.thresholds?.[key]??""} onChange={e=>setSettings({...settings,thresholds:{...settings.thresholds,[key]:Number(e.target.value)}})}/></label>)}</div>{isAdmin?<button className="primary">Save settings</button>:<p className="muted">Viewer/operator access is read-only.</p>}</form></section>
    <section className="panel"><div className="panel-head"><div><h3>User management</h3><p>Accounts and access roles</p></div><UserRound size={20}/></div>{isAdmin?<><form className="settings-form" onSubmit={addUser}><div className="form-grid"><label>Full name<input name="name" required/></label><label>Username<input name="username" required/></label><label>Temporary password<input name="password" type="password" minLength="8" required/></label><label>Role<select name="role"><option value="operator">Operator</option><option value="viewer">Viewer</option><option value="admin">Admin</option></select></label></div><button className="primary"><Plus size={16}/> Create user</button></form><div className="table-wrap users-table"><table><thead><tr><th>Name</th><th>Username</th><th>Role</th></tr></thead><tbody>{users.map(u=><tr key={u._id}><td>{u.name}</td><td>{u.username}</td><td><span className="status-chip">{u.role}</span></td></tr>)}</tbody></table></div></>:<p className="muted">Administrator access is required to manage users.</p>}</section></div>;
}

export default App;