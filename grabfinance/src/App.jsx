import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import * as XLSX from "xlsx";

// ╔══════════════════════════════════════════════════════════════╗
// ║  GANTI URL INI DENGAN URL DEPLOYMENT GOOGLE APPS SCRIPT      ║
// ║  Contoh: https://script.google.com/macros/s/AKfycb.../exec  ║
// ╚══════════════════════════════════════════════════════════════╝
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxHSzU3eZQJydXFT_kpqmISAISC40WXYFkjLNIBRMNKL5M3qQTx-fot6c_lsat9UTki/exec";

// ─── Helpers ─────────────────────────────────────────────────────
const IS_OFFLINE = APPS_SCRIPT_URL === "GANTI_DENGAN_URL_APPS_SCRIPT_ANDA";
const fmt = (n) => new Intl.NumberFormat("id-ID", { style:"currency", currency:"IDR", maximumFractionDigits:0 }).format(n||0);
const fmtShort = (n) => {
  n = parseFloat(n)||0;
  if(n>=1e9) return `Rp${(n/1e9).toFixed(1)}M`;
  if(n>=1e6) return `Rp${(n/1e6).toFixed(1)}Jt`;
  if(n>=1e3) return `Rp${(n/1e3).toFixed(0)}rb`;
  return `Rp${n}`;
};
const todayStr = () => new Date().toISOString().split("T")[0];
const genId = () => Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const DAYS_ID = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
const MONTHS_ID = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const KAT_COLOR = { Operasional:"#f59e0b", Maintenance:"#ef4444", Cicilan:"#8b5cf6" };
const fmtInput = (v) => { const n=String(v).replace(/\D/g,""); return n?new Intl.NumberFormat("id-ID").format(n):""; };

// ─── Local Storage (cache & offline fallback) ─────────────────────
const LS = {
  get:(k)=>{ try{ return JSON.parse(localStorage.getItem(k)||"[]") }catch{ return [] } },
  set:(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)) }catch{} },
};

// ─── API Layer ────────────────────────────────────────────────────
const api = {
  async getAll() {
    if(IS_OFFLINE){
      return { pemasukan: LS.get("gf_pi"), pengeluaran: LS.get("gf_po") };
    }
    const r = await fetch(`${APPS_SCRIPT_URL}?action=getAll`);
    const d = await r.json();
    // cache lokal
    LS.set("gf_pi", d.pemasukan||[]);
    LS.set("gf_po", d.pengeluaran||[]);
    return d;
  },
  async post(body) {
    if(IS_OFFLINE) return null;
    const r = await fetch(APPS_SCRIPT_URL, { method:"POST", body:JSON.stringify(body) });
    return r.json();
  },
  async addPemasukan(payload) {
    const id = genId();
    const item = { ID:id, Tanggal:payload.tanggal, Uraian:payload.uraian, Jumlah:payload.jumlah };
    if(IS_OFFLINE){ const a=[...LS.get("gf_pi"),item]; LS.set("gf_pi",a); return {success:true,id}; }
    return this.post({ action:"addPemasukan", payload });
  },
  async addPengeluaran(payload) {
    const id = genId();
    const item = { ID:id, Tanggal:payload.tanggal, Kategori:payload.kategori, Uraian:payload.uraian, Jumlah:payload.jumlah };
    if(IS_OFFLINE){ const a=[...LS.get("gf_po"),item]; LS.set("gf_po",a); return {success:true,id}; }
    return this.post({ action:"addPengeluaran", payload });
  },
  async deletePemasukan(id) {
    if(IS_OFFLINE){ LS.set("gf_pi",LS.get("gf_pi").filter(x=>x.ID!==id)); return {success:true}; }
    return this.post({ action:"deletePemasukan", id });
  },
  async deletePengeluaran(id) {
    if(IS_OFFLINE){ LS.set("gf_po",LS.get("gf_po").filter(x=>x.ID!==id)); return {success:true}; }
    return this.post({ action:"deletePengeluaran", id });
  },
};

// ─── Sample data ──────────────────────────────────────────────────
const SAMPLE_PI = [
  {ID:"s1",Tanggal:"2025-04-07",Uraian:"GrabCar pagi Senin",Jumlah:95000},
  {ID:"s2",Tanggal:"2025-04-12",Uraian:"GrabFood Sabtu siang",Jumlah:210000},
  {ID:"s3",Tanggal:"2025-04-19",Uraian:"GrabCar Sabtu malam",Jumlah:185000},
  {ID:"s4",Tanggal:"2025-05-03",Uraian:"GrabCar Sabtu penuh",Jumlah:320000},
  {ID:"s5",Tanggal:"2025-05-10",Uraian:"GrabFood Sabtu",Jumlah:175000},
  {ID:"s6",Tanggal:"2025-05-17",Uraian:"GrabCar Sabtu sore",Jumlah:240000},
  {ID:"s7",Tanggal:"2025-05-20",Uraian:"Order Selasa pagi",Jumlah:85000},
  {ID:"s8",Tanggal:"2025-05-24",Uraian:"GrabCar Sabtu",Jumlah:290000},
  {ID:"s9",Tanggal:"2025-06-07",Uraian:"GrabCar Sabtu",Jumlah:310000},
  {ID:"s10",Tanggal:"2025-06-14",Uraian:"GrabFood Sabtu",Jumlah:200000},
  {ID:"s11",Tanggal:"2025-06-21",Uraian:"GrabCar Sabtu malam",Jumlah:270000},
  {ID:"s12",Tanggal:"2025-06-22",Uraian:"GrabFood Minggu",Jumlah:195000},
];
const SAMPLE_PO = [
  {ID:"t1",Tanggal:"2025-04-05",Kategori:"Operasional",Uraian:"BBM Pertamax",Jumlah:80000},
  {ID:"t2",Tanggal:"2025-04-15",Kategori:"Maintenance",Uraian:"Servis rutin",Jumlah:150000},
  {ID:"t3",Tanggal:"2025-04-30",Kategori:"Cicilan",Uraian:"Cicilan motor April",Jumlah:500000},
  {ID:"t4",Tanggal:"2025-05-08",Kategori:"Operasional",Uraian:"BBM + parkir",Jumlah:75000},
  {ID:"t5",Tanggal:"2025-05-31",Kategori:"Cicilan",Uraian:"Cicilan motor Mei",Jumlah:500000},
  {ID:"t6",Tanggal:"2025-06-10",Kategori:"Operasional",Uraian:"BBM Shell",Jumlah:90000},
  {ID:"t7",Tanggal:"2025-06-18",Kategori:"Maintenance",Uraian:"Ganti ban belakang",Jumlah:220000},
  {ID:"t8",Tanggal:"2025-06-30",Kategori:"Cicilan",Uraian:"Cicilan motor Juni",Jumlah:500000},
];

// ═══════════════════════════════════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [pi, setPi] = useState([]);       // pemasukan
  const [po, setPo] = useState([]);       // pengeluaran
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState(null);
  const [filterPeriod, setFilterPeriod] = useState("bulan");
  const [filterDate, setFilterDate] = useState(todayStr().slice(0,7));
  const [fI, setFI] = useState({tanggal:todayStr(),uraian:"",jumlah:""});
  const [fE, setFE] = useState({tanggal:todayStr(),kategori:"Operasional",uraian:"",jumlah:""});
  const [mobileNav, setMobileNav] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState(null);
  const toastTimer = useRef(null);

  // PWA install prompt
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Online/offline detection
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online",on); window.removeEventListener("offline",off); };
  }, []);

  const showToast = useCallback((msg, type="success") => {
    setToast({msg,type});
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(()=>setToast(null),3500);
  },[]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.getAll();
      const pi = d.pemasukan||[];
      const po = d.pengeluaran||[];
      setPi(pi.length ? pi : IS_OFFLINE ? SAMPLE_PI : pi);
      setPo(po.length ? po : IS_OFFLINE ? SAMPLE_PO : po);
    } catch(e) {
      // Jika gagal fetch, pakai cache lokal
      const cached_pi = LS.get("gf_pi");
      const cached_po = LS.get("gf_po");
      setPi(cached_pi.length ? cached_pi : SAMPLE_PI);
      setPo(cached_po.length ? cached_po : SAMPLE_PO);
      showToast("📶 Menggunakan data cache (offline)","warn");
    }
    setLoading(false);
  },[showToast]);

  useEffect(()=>{ loadData(); },[loadData]);

  // ─ Submit ──────────────────────────────────────────────────────
  const submitIncome = async () => {
    if(!fI.uraian||!fI.jumlah) return showToast("Lengkapi semua field ⚠️","warn");
    setSyncing(true);
    const payload = { tanggal:fI.tanggal, uraian:fI.uraian, jumlah:parseFloat(String(fI.jumlah).replace(/\D/g,"")) };
    try {
      await api.addPemasukan(payload);
      await loadData();
      setFI({tanggal:todayStr(),uraian:"",jumlah:""});
      showToast("✅ Pemasukan berhasil disimpan!");
    } catch { showToast("❌ Gagal menyimpan","error"); }
    setSyncing(false);
  };

  const submitExpense = async () => {
    if(!fE.uraian||!fE.jumlah) return showToast("Lengkapi semua field ⚠️","warn");
    setSyncing(true);
    const payload = { tanggal:fE.tanggal, kategori:fE.kategori, uraian:fE.uraian, jumlah:parseFloat(String(fE.jumlah).replace(/\D/g,"")) };
    try {
      await api.addPengeluaran(payload);
      await loadData();
      setFE({tanggal:todayStr(),kategori:"Operasional",uraian:"",jumlah:""});
      showToast("✅ Pengeluaran berhasil disimpan!");
    } catch { showToast("❌ Gagal menyimpan","error"); }
    setSyncing(false);
  };

  const delI = async (id) => { if(!confirm("Hapus data ini?"))return; setSyncing(true); await api.deletePemasukan(id); await loadData(); showToast("🗑️ Data dihapus"); setSyncing(false); };
  const delE = async (id) => { if(!confirm("Hapus data ini?"))return; setSyncing(true); await api.deletePengeluaran(id); await loadData(); showToast("🗑️ Data dihapus"); setSyncing(false); };

  // ─ Computed ───────────────────────────────────────────────────
  const stats = useMemo(()=>{
    const now = new Date();
    const thisM = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
    const tI = pi.reduce((s,x)=>s+(parseFloat(x.Jumlah)||0),0);
    const tO = po.reduce((s,x)=>s+(parseFloat(x.Jumlah)||0),0);
    const mI = pi.filter(x=>String(x.Tanggal).slice(0,7)===thisM).reduce((s,x)=>s+(parseFloat(x.Jumlah)||0),0);
    const mO = po.filter(x=>String(x.Tanggal).slice(0,7)===thisM).reduce((s,x)=>s+(parseFloat(x.Jumlah)||0),0);
    return {tI,tO,net:tI-tO,mI,mO,mNet:mI-mO};
  },[pi,po]);

  const chartMonthly = useMemo(()=>{
    const map={};
    pi.forEach(x=>{ const m=String(x.Tanggal).slice(0,7); if(!map[m])map[m]={month:m,pemasukan:0,pengeluaran:0}; map[m].pemasukan+=parseFloat(x.Jumlah)||0; });
    po.forEach(x=>{ const m=String(x.Tanggal).slice(0,7); if(!map[m])map[m]={month:m,pemasukan:0,pengeluaran:0}; map[m].pengeluaran+=parseFloat(x.Jumlah)||0; });
    return Object.values(map).sort((a,b)=>a.month.localeCompare(b.month)).map(d=>({
      ...d, net:d.pemasukan-d.pengeluaran,
      label:`${MONTHS_ID[parseInt(d.month.split("-")[1])-1]} '${d.month.split("-")[0].slice(2)}`
    }));
  },[pi,po]);

  const expPie = useMemo(()=>{ const m={}; po.forEach(x=>{m[x.Kategori]=(m[x.Kategori]||0)+(parseFloat(x.Jumlah)||0);}); return Object.entries(m).map(([name,value])=>({name,value})); },[po]);

  const dayPred = useMemo(()=>{
    const m=Array(7).fill(0).map((_,i)=>({day:DAYS_ID[i],total:0,count:0}));
    pi.forEach(x=>{ const d=new Date(x.Tanggal); if(isNaN(d))return; m[d.getDay()].total+=parseFloat(x.Jumlah)||0; m[d.getDay()].count+=1; });
    return m.map(d=>({...d,avg:d.count?Math.round(d.total/d.count):0})).sort((a,b)=>b.avg-a.avg);
  },[pi]);

  const filtered = useMemo(()=>{
    let pI=pi, pO=po;
    if(filterPeriod==="bulan"){ pI=pi.filter(x=>String(x.Tanggal).slice(0,7)===filterDate); pO=po.filter(x=>String(x.Tanggal).slice(0,7)===filterDate); }
    else if(filterPeriod==="tahun"){ const y=filterDate.slice(0,4); pI=pi.filter(x=>String(x.Tanggal).startsWith(y)); pO=po.filter(x=>String(x.Tanggal).startsWith(y)); }
    const iT=pI.reduce((s,x)=>s+(parseFloat(x.Jumlah)||0),0);
    const oT=pO.reduce((s,x)=>s+(parseFloat(x.Jumlah)||0),0);
    return {pI,pO,iT,oT,net:iT-oT};
  },[pi,po,filterPeriod,filterDate]);

  // ─ Export Excel ───────────────────────────────────────────────
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pi.map(x=>({Tanggal:x.Tanggal,Uraian:x.Uraian,Pemasukan:x.Jumlah}))), "Pemasukan");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(po.map(x=>({Tanggal:x.Tanggal,Kategori:x.Kategori,Uraian:x.Uraian,Pengeluaran:x.Jumlah}))), "Pengeluaran");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(chartMonthly.map(m=>({Bulan:m.label,Pemasukan:m.pemasukan,Pengeluaran:m.pengeluaran,NetProfit:m.net}))), "Ringkasan");
    XLSX.writeFile(wb, `KeuanganGrab_${todayStr()}.xlsx`);
    showToast("📊 File Excel berhasil diunduh!");
  };

  const installPWA = async () => {
    if(!installPrompt) return;
    installPrompt.prompt();
    const {outcome} = await installPrompt.userChoice;
    if(outcome==="accepted") { setInstallPrompt(null); showToast("✅ Aplikasi berhasil diinstall!"); }
  };

  // ─ Nav items ──────────────────────────────────────────────────
  const NAV = [
    {id:"dashboard",label:"Dashboard",em:"🏠"},
    {id:"pemasukan",label:"Pemasukan",em:"💰"},
    {id:"pengeluaran",label:"Pengeluaran",em:"💸"},
    {id:"laporan",label:"Laporan",em:"📋"},
    {id:"analitik",label:"Analitik",em:"📊"},
  ];

  // ─ Reusable components ─────────────────────────────────────────
  const StatCard = ({label,val,color,sub}) => (
    <div style={{background:"#ffffff",border:`1px solid ${color}25`,borderRadius:14,padding:"16px 18px",position:"relative",overflow:"hidden"}}>
      <div style={{fontSize:10,color:"#94a3b8",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:7}}>{label}</div>
      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:19,fontWeight:800,color}}>{fmtShort(val)}</div>
      {sub&&<div style={{fontSize:10,color:"#64748b",marginTop:3}}>{sub}</div>}
      <div style={{position:"absolute",right:-8,top:-8,width:60,height:60,borderRadius:"50%",background:color,opacity:0.06}}/>
    </div>
  );

  const TT = {formatter:(v)=>fmt(v), contentStyle:{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:8,fontSize:11}};

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div style={{fontFamily:"'Sora','Nunito',sans-serif",background:"#f0f4f8",minHeight:"100vh",color:"#1e293b",display:"flex",flexDirection:"column"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#f0f4f8}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:2px}
        .inp{background:#ffffff;border:1px solid #e2e8f0;color:#1e293b;border-radius:10px;font-family:inherit;font-size:13px;padding:10px 13px;width:100%;transition:border .2s}
        .inp:focus{outline:none;border-color:#0ea5e9;box-shadow:0 0 0 3px rgba(14,165,233,.1)}
        .btn{border:none;cursor:pointer;border-radius:10px;font-family:inherit;font-weight:700;transition:all .2s;font-size:13px}
        .btn:active{transform:scale(.97)}
        .nav{display:flex;align-items:center;gap:9px;padding:10px 13px;border-radius:10px;cursor:pointer;transition:all .2s;color:#64748b;font-weight:600;font-size:13px;white-space:nowrap}
        .nav:hover{background:#f1f5f9;color:#475569}
        .nav.on{background:linear-gradient(135deg,rgba(14,165,233,.15),rgba(99,102,241,.08));color:#0284c7;border:1px solid rgba(14,165,233,.25)}
        .card{background:linear-gradient(135deg,#ffffff,#f8fafc);border:1px solid #e2e8f0;border-radius:16px}
        .tr{border-bottom:1px solid #e2e8f0;transition:background .15s}
        .tr:hover{background:rgba(14,165,233,.06)}
        .badge{display:inline-flex;align-items:center;padding:2px 9px;border-radius:999px;font-size:10px;font-weight:700}
        .toast{position:fixed;top:16px;right:16px;z-index:9999;padding:11px 18px;border-radius:12px;font-weight:600;font-size:12px;display:flex;align-items:center;gap:8px;box-shadow:0 8px 30px rgba(0,0,0,.15);animation:slIn .3s ease;max-width:300px}
        @keyframes slIn{from{transform:translateX(120px);opacity:0}to{transform:translateX(0);opacity:1}}
        .spin{animation:spin 1s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        /* Mobile bottom nav */
        .botNav{display:none}
        @media(max-width:768px){
          .sidebar{display:none!important}
          .main{margin-left:0!important;padding:16px 12px 80px!important}
          .botNav{display:flex;position:fixed;bottom:0;left:0;right:0;background:#ffffff;border-top:1px solid #e2e8f0;z-index:100;padding:4px 0}
          .grid4{grid-template-columns:repeat(2,1fr)!important}
          .grid32{grid-template-columns:1fr!important}
          .grid31{grid-template-columns:1fr!important}
          .grid2{grid-template-columns:1fr!important}
          .grid3{grid-template-columns:repeat(2,1fr)!important}
          h1{font-size:20px!important}
        }
        select option{background:#ffffff}
        input[type=date]::-webkit-calendar-picker-indicator{filter:none}
      `}</style>

      {/* Top bar */}
      <header style={{background:"#ffffff",borderBottom:"1px solid #e2e8f0",padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{background:"linear-gradient(135deg,#0ea5e9,#6366f1)",borderRadius:9,width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>🚗</div>
          <div>
            <div style={{fontWeight:800,fontSize:15,color:"#0f172a",lineHeight:1.2}}>GrabFinance</div>
            <div style={{fontSize:9,color:"#38bdf8",letterSpacing:2,textTransform:"uppercase"}}>Manajer Keuangan</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {/* Status online */}
          <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:online?"#34d399":"#f87171"}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:online?"#34d399":"#f87171"}}/>
            {online ? (IS_OFFLINE?"Lokal":"Online") : "Offline"}
          </div>
          {/* Syncing indicator */}
          {syncing&&<div style={{width:16,height:16,border:"2px solid #38bdf8",borderTopColor:"transparent",borderRadius:"50%"}} className="spin"/>}
          {/* Install PWA button */}
          {installPrompt&&(
            <button className="btn" onClick={installPWA} style={{padding:"6px 12px",background:"linear-gradient(135deg,#0ea5e9,#6366f1)",color:"white",fontSize:11}}>
              📲 Install App
            </button>
          )}
          {/* Refresh */}
          <button className="btn" onClick={loadData} style={{padding:"6px 10px",background:"#ffffff",border:"1px solid #e2e8f0",color:"#94a3b8",fontSize:11}}>
            🔄
          </button>
        </div>
      </header>

      <div style={{display:"flex",flex:1}}>
        {/* Sidebar — desktop only */}
        <aside className="sidebar" style={{width:200,background:"#ffffff",borderRight:"1px solid #e2e8f0",padding:"16px 10px",display:"flex",flexDirection:"column",position:"sticky",top:57,height:"calc(100vh - 57px)",overflowY:"auto"}}>
          <nav style={{flex:1,display:"flex",flexDirection:"column",gap:3}}>
            {NAV.map(n=>(
              <div key={n.id} className={`nav${tab===n.id?" on":""}`} onClick={()=>setTab(n.id)}>
                <span style={{fontSize:16}}>{n.em}</span> {n.label}
              </div>
            ))}
          </nav>
          <div style={{borderTop:"1px solid #e2e8f0",paddingTop:12,display:"flex",flexDirection:"column",gap:3}}>
            <div className="nav" style={{color:"#34d399"}} onClick={exportExcel}>📥 Export Excel</div>
          </div>
          <div style={{marginTop:10,padding:"8px 10px",background:"#f8fafc",borderRadius:8,fontSize:9,color:"#64748b",textAlign:"center",lineHeight:1.6}}>
            {IS_OFFLINE?"💾 Mode Lokal\n(hubungkan ke\nGoogle Sheets)":"☁️ Terhubung ke\nGoogle Sheets"}
          </div>
        </aside>

        {/* Main content */}
        <main className="main" style={{flex:1,padding:"22px 24px 40px",overflowY:"auto",maxWidth:"100%"}}>

          {/* Loading skeleton */}
          {loading&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              {[...Array(3)].map((_,i)=>(
                <div key={i} style={{height:80,borderRadius:14,background:"linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)",backgroundSize:"200%",animation:"shimmer 1.5s infinite",opacity:0.6}}/>
              ))}
              <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
            </div>
          )}

          {!loading&&<>

          {/* ═══ DASHBOARD ══════════════════════════════════════════ */}
          {tab==="dashboard"&&(
            <div>
              <h1 style={{fontSize:22,fontWeight:800,color:"#0f172a",marginBottom:18}}>Dashboard 🏠</h1>

              {/* Stats */}
              <div className="grid4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18}}>
                <StatCard label="Total Pemasukan" val={stats.tI} color="#34d399" sub={`${pi.length} transaksi`}/>
                <StatCard label="Total Pengeluaran" val={stats.tO} color="#f87171" sub={`${po.length} transaksi`}/>
                <StatCard label="Net Profit" val={stats.net} color={stats.net>=0?"#34d399":"#f87171"} sub={fmt(stats.net)}/>
                <StatCard label="Bulan Ini (Masuk)" val={stats.mI} color="#38bdf8" sub={`Keluar: ${fmtShort(stats.mO)}`}/>
              </div>

              {/* Charts */}
              <div className="grid32" style={{display:"grid",gridTemplateColumns:"3fr 2fr",gap:14,marginBottom:14}}>
                <div className="card" style={{padding:18}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",letterSpacing:1,marginBottom:12}}>TREN BULANAN</div>
                  <ResponsiveContainer width="100%" height={190}>
                    <AreaChart data={chartMonthly}>
                      <defs>
                        <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#34d399" stopOpacity={.25}/><stop offset="95%" stopColor="#34d399" stopOpacity={0}/></linearGradient>
                        <linearGradient id="go" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f87171" stopOpacity={.25}/><stop offset="95%" stopColor="#f87171" stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                      <XAxis dataKey="label" tick={{fill:"#475569",fontSize:10}} axisLine={false}/>
                      <YAxis tickFormatter={fmtShort} tick={{fill:"#475569",fontSize:9}} axisLine={false}/>
                      <Tooltip {...TT}/>
                      <Legend wrapperStyle={{fontSize:10,color:"#94a3b8"}}/>
                      <Area type="monotone" dataKey="pemasukan" name="Pemasukan" stroke="#34d399" fill="url(#gi)" strokeWidth={2}/>
                      <Area type="monotone" dataKey="pengeluaran" name="Pengeluaran" stroke="#f87171" fill="url(#go)" strokeWidth={2}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="card" style={{padding:18}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",letterSpacing:1,marginBottom:12}}>KATEGORI PENGELUARAN</div>
                  <ResponsiveContainer width="100%" height={190}>
                    <PieChart>
                      <Pie data={expPie} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                        {expPie.map((e,i)=><Cell key={i} fill={KAT_COLOR[e.name]||"#38bdf8"}/>)}
                      </Pie>
                      <Tooltip {...TT}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Prediksi hari */}
              <div className="card" style={{padding:18}}>
                <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",letterSpacing:1,marginBottom:12}}>🔥 PREDIKSI HARI RAMAI (berdasarkan rata-rata pemasukan)</div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={dayPred}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                    <XAxis dataKey="day" tick={{fill:"#475569",fontSize:11}} axisLine={false}/>
                    <YAxis tickFormatter={fmtShort} tick={{fill:"#475569",fontSize:9}} axisLine={false}/>
                    <Tooltip {...TT}/>
                    <Bar dataKey="avg" name="Rata-rata" radius={[6,6,0,0]}>
                      {dayPred.map((_,i)=><Cell key={i} fill={["#0ea5e9","#6366f1","#8b5cf6","#cbd5e1","#cbd5e1","#cbd5e1","#cbd5e1"][i]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
                  {dayPred.slice(0,3).map((d,i)=>(
                    <div key={i} style={{background:i===0?"rgba(14,165,233,.08)":"rgba(99,102,241,.06)",border:`1px solid ${i===0?"#0ea5e950":"#6366f140"}`,borderRadius:8,padding:"5px 12px",fontSize:11}}>
                      {["🔥","📈","✨"][i]} <strong>{d.day}</strong> — {fmtShort(d.avg)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ PEMASUKAN ══════════════════════════════════════════ */}
          {tab==="pemasukan"&&(
            <div>
              <h1 style={{fontSize:22,fontWeight:800,color:"#0f172a",marginBottom:20}}>💰 Input Pemasukan</h1>
              <div className="grid31" style={{display:"grid",gridTemplateColumns:"340px 1fr",gap:18}}>
                <div className="card" style={{padding:20}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#38bdf8",letterSpacing:1,marginBottom:16}}>TAMBAH PEMASUKAN</div>
                  <div style={{display:"flex",flexDirection:"column",gap:12}}>
                    <div>
                      <label style={{fontSize:10,color:"#94a3b8",display:"block",marginBottom:5,fontWeight:700,letterSpacing:.5}}>TANGGAL</label>
                      <input type="date" className="inp" value={fI.tanggal} onChange={e=>setFI({...fI,tanggal:e.target.value})}/>
                    </div>
                    <div>
                      <label style={{fontSize:10,color:"#94a3b8",display:"block",marginBottom:5,fontWeight:700,letterSpacing:.5}}>URAIAN / KETERANGAN</label>
                      <input type="text" className="inp" placeholder="Contoh: GrabCar pagi, GrabFood..." value={fI.uraian} onChange={e=>setFI({...fI,uraian:e.target.value})} onKeyDown={e=>e.key==="Enter"&&submitIncome()}/>
                    </div>
                    <div>
                      <label style={{fontSize:10,color:"#94a3b8",display:"block",marginBottom:5,fontWeight:700,letterSpacing:.5}}>JUMLAH (Rp)</label>
                      <input type="text" inputMode="numeric" className="inp" style={{fontFamily:"'JetBrains Mono',monospace"}} placeholder="0" value={fI.jumlah} onChange={e=>setFI({...fI,jumlah:fmtInput(e.target.value)})} onKeyDown={e=>e.key==="Enter"&&submitIncome()}/>
                    </div>
                    <button className="btn" disabled={syncing} onClick={submitIncome} style={{padding:"12px",background:"linear-gradient(135deg,#0ea5e9,#6366f1)",color:"white",marginTop:4,opacity:syncing?.7:1}}>
                      {syncing?"⏳ Menyimpan...":"+ Simpan Pemasukan"}
                    </button>
                  </div>
                  <div style={{marginTop:18,padding:12,background:"#f8fafc",borderRadius:10}}>
                    <div style={{fontSize:10,color:"#94a3b8",fontWeight:700,marginBottom:5}}>TOTAL PEMASUKAN</div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:20,fontWeight:800,color:"#34d399"}}>{fmtShort(stats.tI)}</div>
                    <div style={{fontSize:10,color:"#64748b",marginTop:3}}>{pi.length} transaksi total</div>
                  </div>
                </div>
                <div className="card" style={{padding:20}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",letterSpacing:1,marginBottom:14}}>RIWAYAT PEMASUKAN ({pi.length})</div>
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                      <thead><tr style={{borderBottom:"2px solid #e2e8f0"}}>
                        {["Tanggal","Uraian","Jumlah",""].map(h=><th key={h} style={{textAlign:"left",padding:"6px 10px",color:"#64748b",fontWeight:700,fontSize:10,letterSpacing:.5}}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {[...pi].sort((a,b)=>b.Tanggal>a.Tanggal?1:-1).map(x=>(
                          <tr key={x.ID} className="tr">
                            <td style={{padding:"9px 10px",color:"#94a3b8",fontSize:11,whiteSpace:"nowrap"}}>{x.Tanggal}</td>
                            <td style={{padding:"9px 10px"}}>{x.Uraian}</td>
                            <td style={{padding:"9px 10px",fontFamily:"'JetBrains Mono',monospace",color:"#34d399",fontWeight:700,whiteSpace:"nowrap"}}>{fmt(x.Jumlah)}</td>
                            <td style={{padding:"9px 10px"}}>
                              <button onClick={()=>delI(x.ID)} style={{background:"rgba(248,113,113,.1)",border:"1px solid #f87171",color:"#f87171",padding:"3px 9px",borderRadius:6,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>Hapus</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!pi.length&&<div style={{textAlign:"center",padding:40,color:"#64748b",fontSize:13}}>Belum ada data pemasukan</div>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ PENGELUARAN ════════════════════════════════════════ */}
          {tab==="pengeluaran"&&(
            <div>
              <h1 style={{fontSize:22,fontWeight:800,color:"#0f172a",marginBottom:20}}>💸 Input Pengeluaran</h1>
              <div className="grid31" style={{display:"grid",gridTemplateColumns:"340px 1fr",gap:18}}>
                <div className="card" style={{padding:20}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#f87171",letterSpacing:1,marginBottom:16}}>TAMBAH PENGELUARAN</div>
                  <div style={{display:"flex",flexDirection:"column",gap:12}}>
                    <div>
                      <label style={{fontSize:10,color:"#94a3b8",display:"block",marginBottom:5,fontWeight:700,letterSpacing:.5}}>TANGGAL</label>
                      <input type="date" className="inp" value={fE.tanggal} onChange={e=>setFE({...fE,tanggal:e.target.value})}/>
                    </div>
                    <div>
                      <label style={{fontSize:10,color:"#94a3b8",display:"block",marginBottom:5,fontWeight:700,letterSpacing:.5}}>KATEGORI</label>
                      <select className="inp" value={fE.kategori} onChange={e=>setFE({...fE,kategori:e.target.value})}>
                        <option>Operasional</option><option>Maintenance</option><option>Cicilan</option>
                      </select>
                    </div>
                    <div>
                      <label style={{fontSize:10,color:"#94a3b8",display:"block",marginBottom:5,fontWeight:700,letterSpacing:.5}}>URAIAN</label>
                      <input type="text" className="inp" placeholder="Contoh: BBM, servis, cicilan..." value={fE.uraian} onChange={e=>setFE({...fE,uraian:e.target.value})} onKeyDown={e=>e.key==="Enter"&&submitExpense()}/>
                    </div>
                    <div>
                      <label style={{fontSize:10,color:"#94a3b8",display:"block",marginBottom:5,fontWeight:700,letterSpacing:.5}}>JUMLAH (Rp)</label>
                      <input type="text" inputMode="numeric" className="inp" style={{fontFamily:"'JetBrains Mono',monospace"}} placeholder="0" value={fE.jumlah} onChange={e=>setFE({...fE,jumlah:fmtInput(e.target.value)})} onKeyDown={e=>e.key==="Enter"&&submitExpense()}/>
                    </div>
                    <button className="btn" disabled={syncing} onClick={submitExpense} style={{padding:"12px",background:"linear-gradient(135deg,#ef4444,#f59e0b)",color:"white",marginTop:4,opacity:syncing?.7:1}}>
                      {syncing?"⏳ Menyimpan...":"+ Simpan Pengeluaran"}
                    </button>
                  </div>
                  <div style={{marginTop:18,padding:12,background:"#f8fafc",borderRadius:10}}>
                    <div style={{fontSize:10,color:"#94a3b8",fontWeight:700,marginBottom:5}}>TOTAL PENGELUARAN</div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:20,fontWeight:800,color:"#f87171"}}>{fmtShort(stats.tO)}</div>
                    <div style={{fontSize:10,color:"#64748b",marginTop:3}}>{po.length} transaksi total</div>
                  </div>
                </div>
                <div className="card" style={{padding:20}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",letterSpacing:1,marginBottom:14}}>RIWAYAT PENGELUARAN ({po.length})</div>
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                      <thead><tr style={{borderBottom:"2px solid #e2e8f0"}}>
                        {["Tanggal","Kategori","Uraian","Jumlah",""].map(h=><th key={h} style={{textAlign:"left",padding:"6px 10px",color:"#64748b",fontWeight:700,fontSize:10,letterSpacing:.5}}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {[...po].sort((a,b)=>b.Tanggal>a.Tanggal?1:-1).map(x=>(
                          <tr key={x.ID} className="tr">
                            <td style={{padding:"9px 10px",color:"#94a3b8",fontSize:11,whiteSpace:"nowrap"}}>{x.Tanggal}</td>
                            <td style={{padding:"9px 10px"}}><span className="badge" style={{background:`${KAT_COLOR[x.Kategori]}20`,color:KAT_COLOR[x.Kategori]}}>{x.Kategori}</span></td>
                            <td style={{padding:"9px 10px"}}>{x.Uraian}</td>
                            <td style={{padding:"9px 10px",fontFamily:"'JetBrains Mono',monospace",color:"#f87171",fontWeight:700,whiteSpace:"nowrap"}}>{fmt(x.Jumlah)}</td>
                            <td style={{padding:"9px 10px"}}>
                              <button onClick={()=>delE(x.ID)} style={{background:"rgba(248,113,113,.1)",border:"1px solid #f87171",color:"#f87171",padding:"3px 9px",borderRadius:6,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>Hapus</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!po.length&&<div style={{textAlign:"center",padding:40,color:"#64748b",fontSize:13}}>Belum ada data pengeluaran</div>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ LAPORAN ════════════════════════════════════════════ */}
          {tab==="laporan"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
                <h1 style={{fontSize:22,fontWeight:800,color:"#0f172a"}}>📋 Laporan Keuangan</h1>
                <button className="btn" onClick={exportExcel} style={{padding:"9px 16px",background:"linear-gradient(135deg,#059669,#0ea5e9)",color:"white",display:"flex",alignItems:"center",gap:7}}>
                  📥 Export Excel
                </button>
              </div>

              {/* Filter */}
              <div className="card" style={{padding:"12px 16px",marginBottom:18,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <span style={{fontSize:10,color:"#94a3b8",fontWeight:700,letterSpacing:.5}}>FILTER:</span>
                {["bulan","tahun","semua"].map(p=>(
                  <button key={p} onClick={()=>setFilterPeriod(p)} style={{padding:"5px 13px",borderRadius:8,border:`1px solid ${filterPeriod===p?"#0ea5e9":"#e2e8f0"}`,background:filterPeriod===p?"rgba(14,165,233,.12)":"transparent",color:filterPeriod===p?"#38bdf8":"#64748b",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}}>
                    {p==="bulan"?"Per Bulan":p==="tahun"?"Per Tahun":"Semua"}
                  </button>
                ))}
                {filterPeriod!=="semua"&&(
                  <input type={filterPeriod==="tahun"?"number":"month"} className="inp" style={{width:140,padding:"5px 11px"}} value={filterPeriod==="tahun"?filterDate.slice(0,4):filterDate} onChange={e=>setFilterDate(filterPeriod==="tahun"?e.target.value+"-01":e.target.value)}/>
                )}
              </div>

              {/* Summary */}
              <div className="grid3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:18}}>
                {[
                  {l:"Total Pemasukan",v:filtered.iT,c:"#34d399"},
                  {l:"Total Pengeluaran",v:filtered.oT,c:"#f87171"},
                  {l:"Laba Bersih",v:filtered.net,c:filtered.net>=0?"#34d399":"#f87171"},
                ].map((s,i)=>(
                  <div key={i} className="card" style={{padding:16,textAlign:"center"}}>
                    <div style={{fontSize:10,color:"#94a3b8",fontWeight:700,marginBottom:7,letterSpacing:.5}}>{s.l}</div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:20,fontWeight:800,color:s.c}}>{fmtShort(s.v)}</div>
                    <div style={{fontSize:10,color:"#64748b",marginTop:3}}>{fmt(s.v)}</div>
                  </div>
                ))}
              </div>

              {/* Bar chart */}
              <div className="card" style={{padding:18,marginBottom:18}}>
                <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",letterSpacing:1,marginBottom:12}}>GRAFIK PERBANDINGAN BULANAN</div>
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={chartMonthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                    <XAxis dataKey="label" tick={{fill:"#475569",fontSize:10}} axisLine={false}/>
                    <YAxis tickFormatter={fmtShort} tick={{fill:"#475569",fontSize:9}} axisLine={false}/>
                    <Tooltip {...TT}/>
                    <Legend wrapperStyle={{fontSize:10}}/>
                    <Bar dataKey="pemasukan" name="Pemasukan" fill="#34d399" radius={[4,4,0,0]}/>
                    <Bar dataKey="pengeluaran" name="Pengeluaran" fill="#f87171" radius={[4,4,0,0]}/>
                    <Bar dataKey="net" name="Net Profit" fill="#38bdf8" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Detail tables */}
              <div className="grid2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                {[
                  {title:"DETAIL PEMASUKAN",data:filtered.pI,color:"#34d399",keys:["Tanggal","Uraian","Jumlah"]},
                  {title:"DETAIL PENGELUARAN",data:filtered.pO,color:"#f87171"},
                ].map((t,ti)=>(
                  <div key={ti} className="card" style={{padding:18}}>
                    <div style={{fontSize:11,fontWeight:700,color:t.color,marginBottom:12,letterSpacing:.5}}>{t.title} ({t.data.length})</div>
                    <div style={{maxHeight:280,overflowY:"auto"}}>
                      {t.data.length ? t.data.map(x=>(
                        <div key={x.ID} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"8px 0",borderBottom:"1px solid #e2e8f0",fontSize:12,gap:8}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{x.Uraian}</div>
                            <div style={{fontSize:10,color:"#94a3b8",marginTop:2,display:"flex",alignItems:"center",gap:5}}>
                              {x.Tanggal}
                              {x.Kategori&&<span className="badge" style={{background:`${KAT_COLOR[x.Kategori]}20`,color:KAT_COLOR[x.Kategori],fontSize:9}}>{x.Kategori}</span>}
                            </div>
                          </div>
                          <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:t.color,flexShrink:0,fontSize:11}}>{fmtShort(x.Jumlah)}</div>
                        </div>
                      )):<div style={{color:"#64748b",textAlign:"center",padding:30,fontSize:12}}>Tidak ada data</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ ANALITIK ═══════════════════════════════════════════ */}
          {tab==="analitik"&&(
            <div>
              <h1 style={{fontSize:22,fontWeight:800,color:"#0f172a",marginBottom:20}}>📊 Analitik & Business Intelligence</h1>

              <div className="grid2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                <div className="card" style={{padding:18}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",letterSpacing:1,marginBottom:12}}>NET PROFIT TREND</div>
                  <ResponsiveContainer width="100%" height={185}>
                    <LineChart data={chartMonthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                      <XAxis dataKey="label" tick={{fill:"#475569",fontSize:10}} axisLine={false}/>
                      <YAxis tickFormatter={fmtShort} tick={{fill:"#475569",fontSize:9}} axisLine={false}/>
                      <Tooltip {...TT}/>
                      <Line type="monotone" dataKey="net" stroke="#38bdf8" strokeWidth={2.5} dot={{fill:"#38bdf8",r:4}} name="Net Profit"/>
                      <Line type="monotone" dataKey="pemasukan" stroke="#34d399" strokeWidth={1.5} dot={false} strokeDasharray="4 4" name="Pemasukan"/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="card" style={{padding:18}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",letterSpacing:1,marginBottom:12}}>ANALISIS HARI TERBAIK</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:5}}>
                    {dayPred.map((d,i)=>(
                      <div key={i} style={{textAlign:"center",padding:"10px 4px",borderRadius:10,background:i===0?"rgba(14,165,233,.1)":i===1?"rgba(99,102,241,.08)":"rgba(248,250,252,1)",border:`1px solid ${i===0?"#0ea5e940":i===1?"#6366f130":"#e2e8f0"}`}}>
                        <div style={{fontSize:9,fontWeight:700,color:i<2?"#38bdf8":"#64748b"}}>{d.day}</div>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:700,color:i<2?"#38bdf8":"#94a3b8",marginTop:4}}>{fmtShort(d.avg)}</div>
                        <div style={{fontSize:8,color:"#64748b",marginTop:2}}>{d.count}×</div>
                        {i===0&&<div style={{marginTop:4,fontSize:7,background:"#38bdf818",color:"#38bdf8",borderRadius:3,padding:"1px 3px"}}>RAMAI</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* KPI */}
              <div className="card" style={{padding:18}}>
                <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",letterSpacing:1,marginBottom:14}}>KEY PERFORMANCE INDICATORS</div>
                <div className="grid3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:11}}>
                  {[
                    {l:"Rata-rata Pemasukan/Bulan",v:chartMonthly.length?fmtShort(chartMonthly.reduce((s,m)=>s+m.pemasukan,0)/chartMonthly.length):"N/A",c:"#34d399"},
                    {l:"Rata-rata Pengeluaran/Bulan",v:chartMonthly.length?fmtShort(chartMonthly.reduce((s,m)=>s+m.pengeluaran,0)/chartMonthly.length):"N/A",c:"#f87171"},
                    {l:"Bulan Terbaik",v:chartMonthly.length?chartMonthly.reduce((b,m)=>m.pemasukan>b.pemasukan?m:b,chartMonthly[0]).label:"N/A",c:"#38bdf8"},
                    {l:"Total Transaksi",v:`${pi.length+po.length} transaksi`,c:"#a78bfa"},
                    {l:"Margin Keuntungan",v:stats.tI?`${((stats.net/stats.tI)*100).toFixed(1)}%`:"0%",c:stats.net>=0?"#34d399":"#f87171"},
                    {l:"Pengeluaran Terbesar",v:expPie.length?expPie.reduce((b,e)=>e.value>b.value?e:b,expPie[0]).name:"N/A",c:"#f59e0b"},
                  ].map((k,i)=>(
                    <div key={i} style={{padding:14,background:"#f8fafc",borderRadius:10,border:"1px solid #e2e8f0"}}>
                      <div style={{fontSize:9,color:"#64748b",fontWeight:700,marginBottom:6,letterSpacing:.5,textTransform:"uppercase"}}>{k.l}</div>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:18,fontWeight:800,color:k.c}}>{k.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          </>}
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <nav className="botNav" style={{justifyContent:"space-around"}}>
        {NAV.map(n=>(
          <div key={n.id} onClick={()=>setTab(n.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"6px 10px",cursor:"pointer",flex:1,color:tab===n.id?"#38bdf8":"#475569"}}>
            <span style={{fontSize:19}}>{n.em}</span>
            <span style={{fontSize:9,fontWeight:700}}>{n.label}</span>
          </div>
        ))}
      </nav>

      {/* Toast notification */}
      {toast&&(
        <div className="toast" style={{background:toast.type==="success"?"#065f46":toast.type==="warn"?"#92400e":"#7f1d1d",border:`1px solid ${toast.type==="success"?"#34d399":toast.type==="warn"?"#f59e0b":"#f87171"}30`}}>
          <span>{toast.msg}</span>
          <span onClick={()=>setToast(null)} style={{cursor:"pointer",opacity:.6,marginLeft:4}}>✕</span>
        </div>
      )}
    </div>
  );
}
