"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function InventoryIntelligencePage(){
  const [data,setData]=useState<any>(null); 
  const [loading,setLoading]=useState(true); const [error,setError]=useState("");
  useEffect(()=>{fetch("/api/inventory-intelligence/dashboard").then(r=>r.json()).then(x=>{if(!x.success)throw new Error(x.error);setData(x)}).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[]);
  if(loading)return <div className="p-8 text-sm text-slate-500">Loading Inventory Intelligence...</div>;
  if(error)return <div className="p-8 text-sm text-rose-600">{error}</div>;
  const s=data?.settings, c=data?.summary||{};

  const cards=[
      ['Near Expiry',c.nearExpiry,'/dashboard/inventory-intelligence/near-expiry','text-amber-600'],
      ['Dead / Dump Stock',c.deadStock,'/dashboard/inventory-intelligence/dead-stock','text-rose-600'],
      ['Fast Moving',c.fastMoving,'/dashboard/inventory-intelligence/movement?type=fast','text-emerald-600'],
      ['Slow Moving',c.slowMoving,'/dashboard/inventory-intelligence/movement?type=slow','text-orange-600']
  ];

  return <div className="p-4 md:p-6 space-y-6 max-w-[1500px] mx-auto">
    <div className="rounded-3xl p-6 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <div className="text-[10px] uppercase tracking-widest font-bold text-indigo-300">Inventory Intelligence</div>
        <h1 className="text-2xl font-black mt-1">Stock Risk & Movement Center</h1>
        <p className="text-xs text-slate-300 mt-1">Near expiry, dead stock, fast moving and slow moving analysis with admin-controlled email alerts.</p>
      </div>
    <Link href="/dashboard/inventory-intelligence/settings" className="px-4 py-2.5 rounded-xl bg-white text-slate-900 text-xs font-bold">⚙ Alert Settings</Link>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">{cards.map(([title,count,href,color]:any)=>
      <Link key={title} href={href} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:shadow-lg transition">
        <div className="text-xs font-bold text-slate-500">{title}</div>
        <div className={`text-3xl font-black mt-2 ${color}`}>{count}</div>
        <div className="text-[11px] text-slate-400 mt-2">Open report →</div>
      </Link>)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="font-black text-slate-900 dark:text-white">Current Rules</h2>
        <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">Near expiry<br/><b>{s?.nearExpiry?.windowDays} days</b></div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">Dead stock<br/><b>{s?.deadStock?.noMovementDays} days</b></div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">Analysis window<br/><b>{s?.movement?.analysisDays} days</b></div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">Fast / Slow cover<br/><b>{s?.movement?.fastStockCoverDays} / {s?.movement?.slowStockCoverDays} days</b></div>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <h2 className="font-black text-slate-900 dark:text-white">Email Schedule</h2>
            <p className="text-xs text-slate-500 mt-2">{s?.email?.enabled?`${s.email.frequency} at ${String(s.email.sendHour).padStart(2,'0')}:${String(s.email.sendMinute).padStart(2,'0')}`:'Disabled'}</p>
            <p className="text-xs text-slate-500 mt-2">Recipients: {s?.recipients?.length||0}</p>
            <p className="text-[11px] text-slate-400 mt-4">The server cron runner checks this schedule. See the included setup guide for the Hostinger/Cron command.</p>
      </section>
    </div>
  </div>
}
