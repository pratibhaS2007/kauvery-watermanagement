import React, { useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, Beaker, Bell, CheckCircle2, ChevronRight, ClipboardCheck,
  Droplets, Gauge, LayoutDashboard, LogOut, Menu, Plus, RefreshCw, Settings, ShieldCheck,
  Waves, X, Download, Search, UserRound, FlaskConical, Clock3, CheckCheck, Radio
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



function ComplianceDashboard({ records = [] }) {
  const [selectedParameter, setSelectedParameter] = React.useState("All Parameters");

  const parameters = [
    { name: "pH", current: 7.27, unit: "", limit: "6.50 – 7.50", min: 6.5, max: 7.5, time: "14:32:04" },
    { name: "Turbidity", current: 0.41, unit: " NTU", limit: "≤ 1.00 NTU", max: 1, time: "14:32:04" },
    { name: "Free chlorine", current: 3.6, unit: " mg/L", limit: "2.00 – 4.00 mg/L", min: 2, max: 4, time: "14:31:58" },
    { name: "TDS", current: 287, unit: " ppm", limit: "≤ 500 ppm", max: 500, time: "14:31:54" },
    { name: "Temperature", current: 22.8, unit: " °C", limit: "18 – 28 °C", min: 18, max: 28, time: "14:31:49" },
  ];

  const withinLimit = (p) =>
    (p.min === undefined || p.current >= p.min) &&
    (p.max === undefined || p.current <= p.max);

  const allCompliant = parameters.every(withinLimit);
  const filteredParameters = selectedParameter === "All Parameters"
    ? parameters
    : parameters.filter((p) => p.name === selectedParameter);

  function exportSnapshot() {
    const rows = [
      ["Parameter", "Current Reading", "Permitted Range", "Status", "Last Checked"],
      ...parameters.map((p) => [
        p.name,
        `${p.current}${p.unit}`,
        p.limit,
        withinLimit(p) ? "Within limit" : "Violation",
        p.time,
      ]),
    ];

    const csv = rows.map((row) =>
      row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
    ).join("\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "aquaops-compliance.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="compliance-page">
      <div className="compliance-heading">
        <div>
          <span className="compliance-eyebrow">WATER QUALITY / REGULATORY MONITORING</span>
          <h2>Environmental Compliance</h2>
          <p>Compare monitored parameters with permitted limits and review compliance at a glance.</p>
        </div>
        <button className="primary" onClick={exportSnapshot}>
          <Download size={16} /> Export snapshot
        </button>
      </div>

      <div className="compliance-metrics">
        <article className="compliance-metric">
          <span>Overall status</span>
          <div className={`compliance-status ${allCompliant ? "good" : "bad"}`}>
            <CheckCircle2 size={21} />
            {allCompliant ? "Compliant" : "Needs review"}
          </div>
          <small>{allCompliant ? "All displayed parameters are within limits" : "One or more limits exceeded"}</small>
        </article>

        <article className="compliance-metric">
          <span>Parameters monitored</span>
          <div className="compliance-number">{parameters.length}</div>
          <small>Parameters in this dashboard</small>
        </article>

        <article className="compliance-metric">
          <span>Within permitted limits</span>
          <div className="compliance-number">{parameters.filter(withinLimit).length}<span> / {parameters.length}</span></div>
          <small>Based on displayed readings</small>
        </article>
      </div>

      <section className="compliance-register">
        <div className="compliance-register-head">
          <div>
            <span className="compliance-eyebrow">MONITORING REGISTER</span>
            <h3>Permitted limits register</h3>
            <p>Review each reading against its configured reference range.</p>
          </div>
          <label className="compliance-filter">
            <span>Parameter</span>
            <select
              value={selectedParameter}
              onChange={(event) => setSelectedParameter(event.target.value)}
            >
              <option>All Parameters</option>
              {parameters.map((p) => <option key={p.name}>{p.name}</option>)}
            </select>
          </label>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Current reading</th>
                <th>Permitted range</th>
                <th>Status</th>
                <th>Last checked</th>
              </tr>
            </thead>
            <tbody>
              {filteredParameters.map((p) => {
                const compliant = withinLimit(p);
                return (
                  <tr key={p.name}>
                    <td><b>{p.name}</b></td>
                    <td><strong>{p.current}{p.unit}</strong></td>
                    <td>{p.limit}</td>
                    <td>
                      <span className={`compliance-chip ${compliant ? "good" : "bad"}`}>
                        <i /> {compliant ? "Within limit" : "Violation"}
                      </span>
                    </td>
                    <td>{p.time}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="compliance-table-footer">
          Showing {filteredParameters.length} of {parameters.length} parameters
        </div>
      </section>

      <p className="compliance-disclaimer">
        Demonstration values only. Connect verified plant readings and approved regulatory limits before operational use.
      </p>
    </div>
  );
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
      
<div className="content">
  {page !== "compliance" && (
    <div className="page-intro">
      <div>
        <p className="eyebrow dark">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"
          }).toUpperCase()}
        </p>
        <h1>
          {page === "overview"
            ? `Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${user.name.split(" ")[0]}`
            : current?.label || "Audit reports"}
        </h1>
        <p className="muted">
          {page === "overview"
            ? "Here’s what needs your attention across the plant."
            : config[page]?.description ||
              (page === "audit"
                ? "Review system activity and export records."
                : "Manage plant configuration and access.")}
        </p>
      </div>
      <span className="updated">
        <i /> {loading ? "Updating…" : "Data from database"}
      </span>
    </div>
  )}
        {error&&<div className="error-box page-error"><span>{error}</span><button onClick={()=>setError("")}><X size={16}/></button></div>}
        {page==="overview"&&<Overview data={dashboard} onNavigate={setPage}/>}
        {page === "water-quality" && (
  <WaterQualityOverview
    records={records.map(r => ({ ...r.data, ...r, ...r.data }))}
    onRecordReading={() => setModal(true)}
  />
)}


{page === "compliance" && (
  <ComplianceDashboard records={records} />
)}

{config[page] &&
  page !== "water-quality" &&
  page !== "chemical-dosing" &&
  page !== "treatment-process" &&
  page !== "alerts" &&
  page !== "compliance" && (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3>{config[page].title} records</h3>
          <p>Records saved in MongoDB</p>
        </div>
        <div className="head-actions">
          <div className="search-box">
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search records"
            />
          </div>
          <button className="primary" onClick={() => setModal(true)}>
            <Plus size={17} />
            Add record
          </button>
        </div>
      </div>
      <RecordsTable
        records={pageRecords}
        module={page}
        onStatus={changeStatus}
        onExport={exportCsv}
      />
    </section>
  )}

{page === "chemical-dosing" && (
  <ChemicalDosingOverview
    records={records}
    onAddRecord={() => setModal(true)}
    onExport={exportCsv}
  />
)}

{page === "treatment-process" && (
  <TreatmentProcessOverview
    records={records}
    onAddRecord={() => setModal(true)}
    onExport={exportCsv}
  />
)}
{page === "alerts" && (
  <AlertsOverview
    records={records}
    onAddRecord={() => setModal(true)}
    onStatus={changeStatus}
    onExport={exportCsv}
  />
)}

{page === "audit" && (
  <AuditReports audit={audit} onExport={exportCsv} />
)}
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

function ChemicalDosingOverview({ records = [], onAddRecord, onExport }) {
  const totalRecords = records.length;

  const completed = records.filter(
    (r) => r.status === "Completed"
  ).length;

  const inProgress = records.filter(
    (r) => r.status === "In Progress"
  ).length;

  const chemicals = [
    ...new Set(
      records
        .map((r) => r.data?.chemical)
        .filter(Boolean)
    ),
  ];

  const totalQuantity = records.reduce((sum, r) => {
    const quantity = Number(r.data?.quantity);
    return sum + (Number.isFinite(quantity) ? quantity : 0);
  }, 0);

  return (
    <div className="chemical-page">
      <div className="chemical-heading">
        <div>
          <span className="chemical-eyebrow">TREATMENT OPERATIONS</span>
          <h2>Chemical Dosing Overview</h2>
          <p>
            Monitor chemical usage, dosing activity, and treatment records.
          </p>
        </div>

        <div className="chemical-actions">
          <button className="secondary" onClick={onExport}>
            <Download size={16} /> Export CSV
          </button>
          <button className="primary" onClick={onAddRecord}>
            <Plus size={17} /> Record dosing
          </button>
        </div>
      </div>

      <div className="chemical-metrics">
        <article className="chemical-metric">
          <span>Total records</span>
          <div><ClipboardCheck size={20} /><strong>{totalRecords}</strong></div>
          <small>Saved dosing entries</small>
        </article>

        <article className="chemical-metric">
          <span>Chemicals used</span>
          <div><FlaskConical size={20} /><strong>{chemicals.length}</strong></div>
          <small>Unique chemical names</small>
        </article>

        <article className="chemical-metric">
          <span>Completed batches</span>
          <div><CheckCircle2 size={20} /><strong>{completed}</strong></div>
          <small>Marked as completed</small>
        </article>

        <article className="chemical-metric">
          <span>In progress</span>
          <div><Activity size={20} /><strong>{inProgress}</strong></div>
          <small>Currently in progress</small>
        </article>
      </div>

      <section className="panel chemical-summary">
        <div className="panel-head">
          <div>
            <h3>Chemical usage summary</h3>
            <p>Summary of quantities entered in dosing records.</p>
          </div>
          <Beaker size={22} />
        </div>

        <div className="chemical-total">
          <span>Total recorded quantity</span>
          <strong>{totalQuantity.toLocaleString()}</strong>
          <small>
            Combined numeric quantities. Check the units before comparing
            different chemicals.
          </small>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Dosing records</h3>
            <p>Review chemical, tank, operator, and dosing status.</p>
          </div>
          <span className="status-chip">
            {totalRecords} record{totalRecords === 1 ? "" : "s"}
          </span>
        </div>

        {records.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Chemical</th>
                  <th>Quantity</th>
                  <th>Tank</th>
                  <th>Operator / shift</th>
                  <th>Status</th>
                  <th>Recorded</th>
                </tr>
              </thead>
              <tbody>
                {[...records]
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt || 0) -
                      new Date(a.createdAt || 0)
                  )
                  .map((record) => (
                    <tr key={record._id}>
                      <td>
                        <b>{record.data?.chemical || record.title || "—"}</b>
                        <small className="cell-sub">
                          {record.title || "Dosing entry"}
                        </small>
                      </td>
                      <td>
                        <b>{record.data?.quantity ?? "—"}</b>{" "}
                        {record.data?.unit || ""}
                      </td>
                      <td>{record.data?.tank || "—"}</td>
                      <td>{record.data?.operator || "—"}</td>
                      <td>
                        <span
                          className={`status-chip ${
                            record.status === "Completed" ? "success" :
                            record.status === "In Progress" ? "warning" : ""
                          }`}
                        >
                          {record.status || "Recorded"}
                        </span>
                      </td>
                      <td>{dateFmt(record.createdAt)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <FlaskConical size={24} />
            <p>No dosing records yet.</p>
            <span>Add your first record to populate this dashboard.</span>
          </div>
        )}
      </section>
    </div>
  );
}


function TreatmentProcessOverview({ records = [], onAddRecord, onExport }) {
  const stages = [
    {
      name: "Raw water intake",
      subtitle: "Intake & screening",
      icon: Waves,
      aliases: ["raw water intake", "intake", "screening"],
      metric: "flowRate",
      label: "Flow rate",
      unit: "MLD",
      sample: "12.8",
    },
    {
      name: "Treatment",
      subtitle: "Coagulation & flocculation",
      icon: Beaker,
      aliases: ["treatment", "coagulation", "flocculation"],
      metric: "ph",
      label: "pH level",
      unit: "",
      sample: "7.27",
    },
    {
      name: "Filtration",
      subtitle: "Rapid sand filters",
      icon: Gauge,
      aliases: ["filtration", "filter", "rapid sand filter"],
      metric: "turbidity",
      label: "Turbidity",
      unit: "NTU",
      sample: "0.41",
    },
    {
      name: "Disinfection",
      subtitle: "Chlorine contact",
      icon: ShieldCheck,
      aliases: ["disinfection", "chlorination", "chlorine contact"],
      metric: "freeChlorine",
      label: "Free chlorine",
      unit: "mg/L",
      sample: "3.6",
    },
    {
      name: "Treated water",
      subtitle: "Clearwell & distribution",
      icon: Droplets,
      aliases: ["treated water", "clearwell", "distribution"],
      metric: "compliance",
      label: "Compliance",
      unit: "",
      sample: "100%",
    },
  ];

  const normalize = (value) =>
    String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  const getStageRecord = (stage) =>
    [...records].reverse().find((record) => {
      const name = normalize(record.data?.stage || record.title);
      return stage.aliases.some(
        (alias) => name === normalize(alias) ||
          name.includes(normalize(alias))
      );
    });

  const getStatus = (record) => {
    if (!record) return "Not configured";
    const status = normalize(record.status);

    if (["running", "active", "online", "operational"].includes(status)) {
      return "Active";
    }
    if (["paused", "inactive", "offline", "stopped"].includes(status)) {
      return "Inactive";
    }
    if (status === "maintenance" || status === "under maintenance") {
      return "Maintenance";
    }
    return "Not configured";
  };

  const stageData = stages.map((stage) => {
    const record = getStageRecord(stage);
    const data = record?.data || {};

    const metricAliases = {
      flowRate: ["flowRate", "flow", "flow_rate"],
      ph: ["ph", "pH", "phLevel"],
      turbidity: ["turbidity", "turbidityLevel"],
      freeChlorine: ["freeChlorine", "chlorine", "free_chlorine"],
      compliance: ["compliance", "compliancePercent"],
    };

    const key = metricAliases[stage.metric] || [stage.metric];
    const recordedValue = key
      .map((field) => data[field])
      .find((value) => value !== undefined && value !== null && value !== "");

    return {
      ...stage,
      record,
      status: getStatus(record),
      value: recordedValue ?? null,
      equipment: data.equipment || "Not specified",
      shift: data.shift || "Not specified",
    };
  });

  const activeCount = stageData.filter((stage) => stage.status === "Active").length;
  const maintenanceCount = stageData.filter(
    (stage) => stage.status === "Maintenance"
  ).length;
  const inactiveCount = stageData.filter(
    (stage) => stage.status === "Inactive"
  ).length;
  const configuredCount = stageData.filter(
    (stage) => stage.status !== "Not configured"
  ).length;

  const flowChart = [
    { time: "06:00", flow: 9.2 },
    { time: "08:00", flow: 10.5 },
    { time: "10:00", flow: 11.4 },
    { time: "12:00", flow: 12.8 },
    { time: "14:00", flow: 11.9 },
    { time: "16:00", flow: 12.4 },
  ];

  const maintenance = [
    { name: "Filter 02 backwash", time: "Today · 14:50", status: "Due soon" },
    { name: "Chlorine analyzer calibration", time: "Tomorrow · 09:00", status: "Scheduled" },
    { name: "Pump 03 inspection", time: "06 Sep · 11:30", status: "Scheduled" },
  ];

  return (
    <div className="tp-page">
      <div className="tp-heading">
        <div>
          <span className="tp-eyebrow">PROCESS MAP / PLANT OPERATIONS</span>
          <h2>Treatment Process</h2>
          <p>
            Follow water from intake to distribution and monitor each stage.
          </p>
        </div>
        <div className="tp-actions">
          <button className="secondary" onClick={onExport}>
            <Download size={16} /> Export CSV
          </button>
          <button className="primary" onClick={onAddRecord}>
            <Plus size={17} /> Update stage
          </button>
        </div>
      </div>

      <section className="tp-health">
        <div className="tp-health-icon"><Activity size={24} /></div>
        <div className="tp-health-copy">
          <strong>
            {configuredCount === 5
              ? `${activeCount} of 5 stages active`
              : `${configuredCount} of 5 stages configured`}
          </strong>
          <span>
            {configuredCount === 5
              ? maintenanceCount || inactiveCount
                ? "Some stages need attention."
                : "All five stages have a recorded status."
              : "Add records for each stage to track its actual status."}
          </span>
        </div>
        <div className="tp-health-counts">
          <span className="tp-count active">{activeCount} Active</span>
          <span className="tp-count inactive">{inactiveCount} Inactive</span>
          <span className="tp-count maintenance">{maintenanceCount} Maintenance</span>
        </div>
      </section>

      <section className="tp-process-section">
        <div className="tp-section-heading">
          <div>
            <h3>Water treatment flow</h3>
            <p>Each stage uses its latest matching saved process record.</p>
          </div>
          <span className="tp-live-label"><i /> Database-linked status</span>
        </div>

        <div className="tp-stage-flow">
          {stageData.map((stage, index) => {
            const Icon = stage.icon;
            const statusClass = stage.status.toLowerCase().replace(/\s+/g, "-");

            return (
              <React.Fragment key={stage.name}>
                <article className={`tp-stage-card ${statusClass}`}>
                  <div className="tp-stage-top">
                    <span className="tp-stage-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className={`tp-status ${statusClass}`}>
                      <i />
                      {stage.status}
                    </span>
                  </div>

                  <div className="tp-stage-icon"><Icon size={25} /></div>
                  <h4>{stage.name}</h4>
                  <p className="tp-stage-subtitle">{stage.subtitle}</p>

                  <div className="tp-stage-reading">
                    <span>{stage.label}</span>
                    <strong>
                      {stage.value !== null
                        ? `${stage.value}${stage.unit ? ` ${stage.unit}` : ""}`
                        : "—"}
                    </strong>
                  </div>

                  <div className="tp-stage-details">
                    <span>Equipment</span>
                    <b>{stage.equipment}</b>
                    <span>Shift</span>
                    <b>{stage.shift}</b>
                  </div>
                </article>

                {index < stageData.length - 1 && (
                  <div className="tp-stage-connector">
                    <ChevronRight size={20} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        <p className="tp-note">
          A stage without a matching saved record is shown as Not configured.
          Readings are not invented or filled with sample values.
        </p>
      </section>

      <div className="tp-lower-grid">
        <section className="panel tp-chart-panel">
          <div className="panel-head">
            <div>
              <h3>Stage performance</h3>
              <p>Throughput & efficiency · illustrative trend</p>
            </div>
            <Gauge size={22} />
          </div>

          <div className="tp-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={flowChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit=" MLD" />
                <Tooltip />
                <Bar
                  dataKey="flow"
                  name="Flow rate"
                  fill="#0d9488"
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="tp-note">
            Example chart data only. Connect historical flow readings to display
            actual plant performance.
          </p>
        </section>

        <section className="panel tp-maintenance-panel">
          <div className="panel-head">
            <div>
              <h3>Upcoming maintenance</h3>
              <p>Planned plant activities</p>
            </div>
            <Settings size={21} />
          </div>

          <div className="tp-maintenance-list">
            {maintenance.map((item) => (
              <div className="tp-maintenance-item" key={item.name}>
                <span className="tp-maintenance-icon"><Settings size={17} /></span>
                <div className="tp-maintenance-info">
                  <b>{item.name}</b>
                  <small>{item.time}</small>
                </div>
                <span className={`tp-maintenance-status ${
                  item.status === "Due soon" ? "due" : ""
                }`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
          <p className="tp-note">
            These are example maintenance entries. They are not yet linked to a
            maintenance schedule in the database.
          </p>
        </section>
      </div>
    </div>
  );
}


function AlertsOverview({ records = [], onAddRecord, onStatus, onExport }) {
  const [severity, setSeverity] = useState("All Severity");
  const [stage, setStage] = useState("All Stages");
  const [query, setQuery] = useState("");

  const alertStages = [
    "Disinfection",
    "Filtration",
    "AI monitor",
    "Compliance",
    "Raw water intake",
  ];

  const severityOptions = [
    "All Severity",
    "Critical",
    "High",
    "Medium",
    "Low",
  ];

  const stageOptions = ["All Stages", ...alertStages];

  const getSeverity = (record) => {
    const value = String(record.data?.severity || "Low").toLowerCase();

    if (value.includes("critical")) return "Critical";
    if (value.includes("high")) return "High";
    if (value.includes("medium") || value.includes("warning")) return "Medium";
    return "Low";
  };

  const getStage = (record) => {
    const value = String(
      record.data?.stage || record.data?.source || ""
    ).toLowerCase();

    return alertStages.find((item) =>
      value.includes(item.toLowerCase())
    ) || "Other";
  };

  const getMessage = (record) =>
    record.data?.message ||
    record.data?.description ||
    "Review this alert and its recorded details.";

  const getStatus = (record) => record.status || "Open";

  const visibleRecords = records.filter((record) => {
    const matchesSeverity =
      severity === "All Severity" || getSeverity(record) === severity;

    const matchesStage =
      stage === "All Stages" || getStage(record) === stage;

    const searchable = [
      record.title,
      getMessage(record),
      getSeverity(record),
      getStage(record),
      getStatus(record),
    ].join(" ").toLowerCase();

    return (
      matchesSeverity &&
      matchesStage &&
      searchable.includes(query.toLowerCase())
    );
  });

  const openCount = records.filter((record) =>
    ["open", "new"].includes(getStatus(record).toLowerCase())
  ).length;

  const criticalCount = records.filter(
    (record) => getSeverity(record) === "Critical" &&
      !["resolved", "closed"].includes(getStatus(record).toLowerCase())
  ).length;

  const severityClass = (value) => value.toLowerCase();

  const statusClass = (value) =>
    value.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="alerts-page">
      <div className="alerts-heading">
        <div>
          <span className="alerts-eyebrow">INCIDENT CENTER / {String(openCount).padStart(2, "0")} OPEN</span>
          <h2>Alerts</h2>
          <p>
            Prioritize exceptions, review automated detection, and keep a
            clear record of every response.
          </p>
        </div>

        <div className="alerts-heading-actions">
          <button className="secondary" onClick={onExport}>
            <Download size={16} /> Export
          </button>
          <button className="primary" onClick={onAddRecord}>
            <Plus size={17} /> Create alert
          </button>
        </div>
      </div>

      <section className="alerts-filter-panel">
        <div className="alerts-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search incidents..."
          />
        </div>

        <label className="alerts-filter">
          <span>Severity</span>
          <select
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
          >
            {severityOptions.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>

        <label className="alerts-filter">
          <span>Stage</span>
          <select
            value={stage}
            onChange={(event) => setStage(event.target.value)}
          >
            {stageOptions.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </section>

      <div className="alerts-layout">
        <section className="alerts-list-section">
          <div className="alerts-list-heading">
            <div>
              <h3>Incident feed</h3>
              <p>{visibleRecords.length} matching alert(s)</p>
            </div>
            <span className="alerts-count">
              <AlertTriangle size={15} />
              {criticalCount} critical
            </span>
          </div>

          {visibleRecords.length ? (
            <div className="alerts-list">
              {visibleRecords.map((record) => {
                const recordSeverity = getSeverity(record);
                const recordStatus = getStatus(record);
                const recordStage = getStage(record);

                return (
                  <article className="alert-card" key={record._id}>
                    <div className={`alert-card-icon ${severityClass(recordSeverity)}`}>
                      {recordSeverity === "Critical" || recordSeverity === "High"
                        ? <AlertTriangle size={20} />
                        : <Activity size={20} />}
                    </div>

                    <div className="alert-card-content">
                      <div className="alert-card-top">
                        <h4>{record.title}</h4>
                        <span className={`alert-severity ${severityClass(recordSeverity)}`}>
                          {recordSeverity}
                        </span>
                      </div>

                      <p>{getMessage(record)}</p>

                      <div className="alert-card-meta">
                        <span><Waves size={14} /> {recordStage}</span>
                        <span><Clock3 size={14} /> {dateFmt(record.createdAt)}</span>
                        <span className={`alert-status ${statusClass(recordStatus)}`}>
                          {recordStatus}
                        </span>
                      </div>

                      <div className="alert-card-actions">
                        {recordStatus !== "Acknowledged" &&
                          recordStatus !== "Resolved" && (
                            <button
                              className="small-action"
                              onClick={() => onStatus(record, "Acknowledged")}
                            >
                              <CheckCheck size={14} /> Acknowledge
                            </button>
                          )}

                        {recordStatus !== "Resolved" && (
                          <button
                            className="small-action"
                            onClick={() => onStatus(record, "Resolved")}
                          >
                            <CheckCircle2 size={14} /> Resolve
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="alerts-empty">
              <CheckCircle2 size={28} />
              <h3>No matching alerts</h3>
              <p>Try changing the filters or create a new alert.</p>
            </div>
          )}
        </section>

        <aside className="detection-panel">
          <div className="detection-heading">
            <span className="detection-icon"><Activity size={21} /></span>
            <div>
              <span className="alerts-eyebrow">DETECTION ENGINE</span>
              <h3>Monitoring status</h3>
            </div>
          </div>

          <div className="detection-status">
            <span className="detection-status-dot" />
            <div>
              <strong>Database connected</strong>
              <p>Alert records are loaded from the application database.</p>
            </div>
          </div>

          <div className="detection-stats">
            <div>
              <span>Alert records</span>
              <strong>{records.length}</strong>
            </div>
            <div>
              <span>Open alerts</span>
              <strong>{openCount}</strong>
            </div>
            <div>
              <span>Critical alerts</span>
              <strong>{criticalCount}</strong>
            </div>
          </div>

          <div className="detection-notice">
            <Radio size={17} />
            <p>
              Live sensor connectivity, automated rule evaluation, AI models,
              and scan timestamps are not exposed by the current frontend API.
              They are not reported as active here.
            </p>
          </div>

          <button className="secondary detection-export" onClick={onExport}>
            <Download size={16} /> Export alert records
          </button>
        </aside>
      </div>
    </div>
  );
}

function AuditReports({ audit = [], onExport }) {
  const [reportType, setReportType] = useState("All Types");

  const reports = [
    {
      id: 1,
      name: "Monthly compliance report",
      file: "PDF · 2.4 MB",
      period: "August 2026",
      type: "Compliance",
      status: "Ready",
    },
    {
      id: 2,
      name: "Chemical usage & inventory",
      file: "PDF · 1.1 MB",
      period: "August 2026",
      type: "Operations",
      status: "Ready",
    },
    {
      id: 3,
      name: "Plant performance audit",
      file: "PDF · 4.8 MB",
      period: "Q2 2026",
      type: "Audit",
      status: "Ready",
    },
    {
      id: 4,
      name: "Incident response log",
      file: "PDF · 860 KB",
      period: "01–31 Aug 2026",
      type: "Events",
      status: "Ready",
    },
  ];

  const visibleReports =
    reportType === "All Types"
      ? reports
      : reports.filter((report) => report.type === reportType);

  function downloadReport(report) {
    const rows = [
      ["Report", report.name],
      ["Period", report.period],
      ["Type", report.type],
      ["Status", report.status],
      [],
      ["Audit event", "Action", "Module", "Details", "Date"],
      ...audit.map((item) => [
        item.actor || "",
        item.action || "",
        item.module || "",
        item.details || "",
        item.createdAt ? new Date(item.createdAt).toLocaleString() : "",
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) =>
            `"${String(value ?? "").replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");

    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" })
    );

    const link = document.createElement("a");
    link.href = url;
    link.download = `${report.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function generateReport() {
    const report = {
      name: "Audit activity export",
      period: new Date().toLocaleDateString(),
      type: "Audit",
      status: "Ready",
    };

    downloadReport(report);
  }

  return (
    <div className="audit-reports-page">
      <div className="audit-reports-heading">
        <div>
          <span className="audit-reports-eyebrow">
            DOCUMENT CENTER / {String(reports.length).padStart(2, "0")} ARCHIVED
          </span>
          <h2>Audit reports</h2>
          <p>
            Generate clear, traceable reports for operators, auditors,
            and environmental submissions.
          </p>
        </div>

        <button className="primary" onClick={generateReport}>
          <Download size={17} />
          Generate report
        </button>
      </div>

      <section className="audit-reports-panel">
        <div className="audit-reports-toolbar">
          <div>
            <h3>Recent reports</h3>
            <p>Generated from available application records.</p>
          </div>

          <label className="audit-reports-filter">
            <span>Report type</span>
            <select
              value={reportType}
              onChange={(event) => setReportType(event.target.value)}
            >
              {["All Types", "Compliance", "Operations", "Audit", "Events"].map(
                (type) => (
                  <option key={type}>{type}</option>
                )
              )}
            </select>
          </label>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Report</th>
                <th>Period</th>
                <th>Type</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {visibleReports.map((report) => (
                <tr key={report.id}>
                  <td>
                    <div className="audit-report-name">
                      <span className="audit-report-file-icon">
                        <ClipboardCheck size={19} />
                      </span>
                      <div>
                        <b>{report.name}</b>
                        <small>{report.file}</small>
                      </div>
                    </div>
                  </td>
                  <td>{report.period}</td>
                  <td>
                    <span className="audit-report-type">{report.type}</span>
                  </td>
                  <td>
                    <span className="audit-report-ready">
                      <i /> {report.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="audit-report-download"
                      onClick={() => downloadReport(report)}
                    >
                      <Download size={15} />
                      Download
                    </button>
                  </td>
                </tr>
              ))}

              {!visibleReports.length && (
                <tr>
                  <td colSpan={5}>No reports match this type.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="audit-reports-footer">
          Showing {visibleReports.length} of {reports.length} archived reports
          <button className="text-button" onClick={onExport}>
            <Download size={15} /> Export audit events
          </button>
        </div>
      </section>

      <p className="audit-reports-note">
        The listed reports are demonstration entries. Download actions export
        available audit activity as CSV, not pre-existing PDF files.
      </p>
    </div>
  );
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


function WaterQualityOverview({ records = [], onRecordReading }) {
  const [range, setRange] = useState("7D");

  const normalized = useMemo(() => {
    const getValue = (obj, keys) => {
      for (const key of keys) {
        if (obj?.[key] !== undefined && obj[key] !== null && obj[key] !== "") {
          const value = Number(obj[key]);
          if (Number.isFinite(value)) return value;
        }
      }
      return null;
    };

    return records
      .map((record) => {
        const item = { ...(record?.data || {}), ...record };
        const rawDate =
          item.recordedAt ||
          item.timestamp ||
          item.createdAt ||
          item.date ||
          item.created_at;

        const date = rawDate ? new Date(rawDate) : null;

        return {
          ...item,
          chartDate: date && !Number.isNaN(date.getTime()) ? date : null,
          label:
            date && !Number.isNaN(date.getTime())
              ? date.toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Recorded",
          ph: getValue(item, ["ph", "pH", "phLevel", "ph_level"]),
          tds: getValue(item, ["tds", "TDS", "tdsLevel", "tds_level"]),
          turbidity: getValue(item, [
            "turbidity",
            "turbidityLevel",
            "turbidity_level",
          ]),
          temperature: getValue(item, [
            "temperature",
            "temp",
            "waterTemperature",
          ]),
        };
      })
      .sort((a, b) => {
        if (!a.chartDate || !b.chartDate) return 0;
        return a.chartDate - b.chartDate;
      });
  }, [records]);

  const chartData = useMemo(() => {
    const now = Date.now();
    const duration =
      range === "24H"
        ? 24 * 60 * 60 * 1000
        : range === "7D"
          ? 7 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000;

    const datedRecords = normalized.filter(
      (item) => item.chartDate && item.chartDate.getTime() >= now - duration
    );

    // If older records have no usable timestamps, show available records
    // rather than leaving the chart blank.
    const source = datedRecords.length
      ? datedRecords
      : normalized.filter((item) => !item.chartDate).slice(-12);

    return source.map((item, index) => ({
      ...item,
      label: item.chartDate
        ? range === "24H"
          ? item.chartDate.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : item.chartDate.toLocaleDateString([], {
              month: "short",
              day: "numeric",
            })
        : `Reading ${index + 1}`,
    }));
  }, [normalized, range]);

  const latest = normalized[normalized.length - 1] || {};

  const parameters = [
    {
      name: "pH level",
      value: latest.ph,
      unit: "pH",
      icon: <Beaker size={18} />,
      note: "Acidity / alkalinity",
    },
    {
      name: "TDS",
      value: latest.tds,
      unit: "ppm",
      icon: <Droplets size={18} />,
      note: "Dissolved solids",
    },
    {
      name: "Turbidity",
      value: latest.turbidity,
      unit: "NTU",
      icon: <Waves size={18} />,
      note: "Water clarity",
    },
    {
      name: "Temperature",
      value: latest.temperature,
      unit: "°C",
      icon: <Activity size={18} />,
      note: "Water temperature",
    },
  ];

  const formatValue = (value) =>
    value === null || value === undefined ? "—" : value.toLocaleString();

  return (
    <section className="wq-page">
      <header className="wq-header">
        <div className="wq-header-actions">
          <span className="wq-status">
            {normalized.length ? "Records available" : "Awaiting readings"}
          </span>
          <button
            className="primary"
            type="button"
            onClick={onRecordReading}
          >
            <Plus size={16} />
            Record reading
          </button>
        </div>
      </header>

      <div>
        <div className="wq-section-label">LATEST MEASUREMENTS</div>
        <div className="wq-metrics">
          {parameters.map((parameter) => (
            <article className="wq-metric" key={parameter.name}>
              <div className="wq-metric-top">
                <span>{parameter.name}</span>
                <span className="wq-metric-icon">{parameter.icon}</span>
              </div>

              <div className="wq-metric-value">
                {formatValue(parameter.value)}{" "}
                <span className="wq-metric-unit">{parameter.unit}</span>
              </div>

              <div className="wq-metric-foot">
                <span>{parameter.note}</span>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="wq-layout">
        <section className="wq-card wq-trends-card">
          <div className="wq-card-head wq-trends-head">
            <div>
              <div className="wq-section-label">HISTORICAL DATA</div>
              <h3>Water Quality Trends</h3>
              <p>Explore recorded parameter values over time.</p>
            </div>

            <div
              className="wq-time-filters"
              role="group"
              aria-label="Chart time range"
            >
              {["24H", "7D", "30D"].map((item) => (
                <button
                  key={item}
                  type="button"
                  className={range === item ? "active" : ""}
                  aria-pressed={range === item}
                  onClick={() => setRange(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="wq-chart">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 12, right: 18, left: 0, bottom: 4 }}
                >
                  <CartesianGrid
                    stroke="#e7f1ee"
                    strokeDasharray="4 5"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#779294", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={22}
                    tickMargin={12}
                  />
                  <YAxis
                    tick={{ fill: "#779294", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={38}
                    tickMargin={8}
                  />
                  <Tooltip
                    contentStyle={{
                      border: "1px solid #d6eae5",
                      borderRadius: "12px",
                      background: "#fbfffe",
                      fontSize: "12px",
                      boxShadow: "0 8px 24px #00383212",
                    }}
                    labelStyle={{
                      color: "#174647",
                      fontWeight: 700,
                      marginBottom: 6,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ph"
                    name="pH"
                    stroke="#009d89"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="tds"
                    name="TDS"
                    stroke="#548bce"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="turbidity"
                    name="Turbidity"
                    stroke="#e6a23c"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="temperature"
                    name="Temperature"
                    stroke="#8b78cb"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="wq-chart-empty">
                <span className="wq-empty-icon">
                  <Activity size={24} />
                </span>
                <strong>No trend data available yet</strong>
                <span>
                  Record water quality readings to populate this chart.
                </span>
              </div>
            )}
          </div>

          <div className="wq-chart-legend">
            {[
              ["pH", "teal"],
              ["TDS", "blue"],
              ["Turbidity", "amber"],
              ["Temperature", "purple"],
            ].map(([label, color]) => (
              <span className="wq-legend-item" key={label}>
                <span className={`wq-legend-dot ${color}`} />
                {label}
              </span>
            ))}
          </div>
        </section>

        <section className="wq-card">
          <div className="wq-card-head">
            <div>
              <div className="wq-section-label">CURRENT SNAPSHOT</div>
              <h3>Latest Parameters</h3>
              <p>Most recently available measurements.</p>
            </div>
          </div>

          <div className="wq-card-body wq-latest-body">
            {parameters.map((parameter) => (
              <div className="wq-quality-row" key={parameter.name}>
                <span className="wq-quality-icon">{parameter.icon}</span>
                <div className="wq-quality-info">
                  <b>{parameter.name}</b>
                  <small>{parameter.note}</small>
                </div>
                <div className="wq-quality-value">
                  {formatValue(parameter.value)}
                  <span>{parameter.unit}</span>
                </div>
              </div>
            ))}

            <div className="wq-record-summary">
              <span>Total readings available</span>
              <strong>{normalized.length}</strong>
            </div>
          </div>
        </section>
      </div>

      <section className="wq-card">
        <div className="wq-card-head">
          <div>
            <div className="wq-section-label">READING LOG</div>
            <h3>Recent Water Quality Readings</h3>
            <p>Review the latest recorded measurements.</p>
          </div>
          <span className="wq-record-count">
            {normalized.length} records
          </span>
        </div>

        {normalized.length ? (
          <div className="table-wrap">
            <table className="wq-history">
              <thead>
                <tr>
                  <th>Recorded at</th>
                  <th>pH</th>
                  <th>TDS (ppm)</th>
                  <th>Turbidity (NTU)</th>
                  <th>Temperature (°C)</th>
                </tr>
              </thead>
              <tbody>
                {[...normalized].reverse().slice(0, 10).map((item, index) => (
                  <tr key={item._id || item.id || index}>
                    <td>
                      <b>
                        {item.chartDate
                          ? item.chartDate.toLocaleString()
                          : "Date unavailable"}
                      </b>
                    </td>
                    <td>{formatValue(item.ph)}</td>
                    <td>{formatValue(item.tds)}</td>
                    <td>{formatValue(item.turbidity)}</td>
                    <td>{formatValue(item.temperature)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="wq-empty">
            No readings have been recorded yet.
          </div>
        )}
      </section>
    </section>
  );
}


export default App;