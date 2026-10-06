"use client";
import {useEffect,useState} from "react";
const defaults:any={enabled:true,recipients:[],
nearExpiry:{enabled:true,windowDays:90,minStock:1},
deadStock:{enabled:true,noMovementDays:180,minStock:1},
movement:{enabled:true,analysisDays:30,fastStockCoverDays:15,slowStockCoverDays:60,minSalesQty:1},
email:{enabled:true,frequency:'daily',sendHour:9,sendMinute:0,weeklyDay:1,monthlyDay:1,includeNearExpiry:true,includeDeadStock:true,includeFastMoving:true,includeSlowMoving:true}};
export default function InventoryAlertSettingsPage(){const[s,setS]=useState<any>(defaults);const[email,setEmail]=useState("");
    const[loading,setL]=useState(true);
    const[saving,setSaving]=useState(false);const[msg,setMsg]=useState("");
    const input='w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/20';

    useEffect(()=>{fetch('/api/inventory-intelligence/settings').then(r=>r.json()).then(x=>x.success&&setS({...defaults,...x.settings})).finally(()=>setL(false))},[]);
    const patch=(path:string,v:any)=>{const [a,b]=path.split('.');setS((p:any)=>({...p,[a]:{...p[a],[b]:v}}))};
    const save=async()=>{setSaving(true);setMsg('');
const r=await fetch('/api/inventory-intelligence/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(s)});
const x=await r.json();setMsg(x.success?'Settings saved successfully':x.error||'Save failed');setSaving(false)};

// const test=async()=>{if(!email)return setMsg('Enter test email');
// const r=await fetch('/api/inventory-intelligence/settings',{method:'POST',headers:{'Content-Type':'application/json'},
//     body:JSON.stringify({action:'TEST_EMAIL',testRecipient:email})});
//     const x=await r.json();
//     setMsg(x.success?'Test email sent successfully':'Test failed: '+(x.error||x.reason||'Unknown error'))};
const test = async () => {
    if (!email.trim()) {
        setMsg("Enter test email");
        return;
    }

    setMsg("Sending test email...");

    try {
        const r = await fetch(
            "/api/inventory-intelligence/settings",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    action: "TEST_EMAIL",
                    testRecipient: email.trim(),
                }),
            }
        );

        const x = await r.json();

        console.log("TEST EMAIL RESPONSE:", {
            httpStatus: r.status,
            response: x,
        });

        if (r.ok && x?.success === true) {
            setMsg(
                x?.message ||
                "Test email sent successfully"
            );
            return;
        }

        /* -----------------------------------------
           Get error from all possible locations
        ----------------------------------------- */

        const nestedError =
            Array.isArray(x?.results)
                ? x.results
                    .map((item: any) =>
                        item?.error ||
                        item?.reason ||
                        item?.message
                    )
                    .filter(Boolean)
                    .join(" | ")
                : "";

        const errorMessage =
            x?.error ||
            x?.reason ||
            x?.message ||
            nestedError ||
            x?.results?.[0]?.error ||
            `HTTP ${r.status}`;

        setMsg(
            `Test failed: ${errorMessage}`
        );

    } catch (error: any) {
        console.error(
            "TEST EMAIL FRONTEND ERROR:",
            error
        );

        setMsg(
            `Test failed: ${
                error?.message ||
                "Unable to connect to email API"
            }`
        );
    }
};

    if(loading)return <div className="p-8 text-sm text-slate-500">Loading settings...</div>;
return <div className="p-5 md:p-7 max-w-6xl mx-auto space-y-6">
    <div><h1 className="text-2xl font-black">Inventory Intelligence Settings</h1><p className="text-xs text-slate-500 mt-1">Admin controls the thresholds, email recipients and schedule. Changes affect this company only.</p>
    </div>{msg&&<div className="p-3 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-semibold">{msg}</div>}
    <section className="rounded-2xl border bg-white p-5 space-y-5">
        <div className="flex items-center justify-between">
            <div>
                <h2 className="font-black">Master Control</h2><p className="text-xs text-slate-500">Enable the whole inventory intelligence module.</p>
            </div>
            <input type="checkbox" checked={!!s.enabled} onChange={e=>setS({...s,enabled:e.target.checked})} className="w-5 h-5"/>
        </div>
    </section>

<section className="rounded-2xl border bg-white p-5"><h2 className="font-black">Near Expiry Alert</h2>
<div className="grid md:grid-cols-3 gap-4 mt-4"><label className="text-xs font-bold">Enabled<input type="checkbox" checked={s.nearExpiry.enabled} onChange={e=>patch('nearExpiry.enabled',e.target.checked)} className="ml-3"/></label>
<label className="text-xs font-bold">Expiry within (days)<input className={input} type="number" value={s.nearExpiry.windowDays} onChange={e=>patch('nearExpiry.windowDays',e.target.value)}/></label>
<label className="text-xs font-bold">Minimum stock<input className={input} type="number" value={s.nearExpiry.minStock} onChange={e=>patch('nearExpiry.minStock',e.target.value)}/></label></div></section>
    <section className="rounded-2xl border bg-white p-5">
        <h2 className="font-black">Dead / Dump Stock</h2>
        <div className="grid md:grid-cols-3 gap-4 mt-4">
            <label className="text-xs font-bold">Enabled<input type="checkbox" checked={s.deadStock.enabled} onChange={e=>patch('deadStock.enabled',e.target.checked)} className="ml-3"/></label>
            <label className="text-xs font-bold">No movement for (days)<input className={input} type="number" value={s.deadStock.noMovementDays} onChange={e=>patch('deadStock.noMovementDays',e.target.value)}/></label>
            <label className="text-xs font-bold">Minimum stock<input className={input} type="number" value={s.deadStock.minStock} onChange={e=>patch('deadStock.minStock',e.target.value)}/></label>
        </div>
    </section>
    <section className="rounded-2xl border bg-white p-5">
        <h2 className="font-black">Fast / Slow Moving</h2>
        <div className="grid md:grid-cols-5 gap-4 mt-4">
            <label className="text-xs font-bold">Enabled<input type="checkbox" checked={s.movement.enabled} onChange={e=>patch('movement.enabled',e.target.checked)} className="ml-3"/></label>
            <label className="text-xs font-bold">Analysis days<input className={input} type="number" value={s.movement.analysisDays} onChange={e=>patch('movement.analysisDays',e.target.value)}/></label>
            <label className="text-xs font-bold">Fast cover ≤ days<input className={input} type="number" value={s.movement.fastStockCoverDays} onChange={e=>patch('movement.fastStockCoverDays',e.target.value)}/></label>
            <label className="text-xs font-bold">Slow cover ≥ days<input className={input} type="number" value={s.movement.slowStockCoverDays} onChange={e=>patch('movement.slowStockCoverDays',e.target.value)}/></label>
            <label className="text-xs font-bold">Min sales qty<input className={input} type="number" value={s.movement.minSalesQty} onChange={e=>patch('movement.minSalesQty',e.target.value)}/></label>
        </div>
    </section>
    <section className="rounded-2xl border bg-white p-5 space-y-5"><h2 className="font-black">Email Schedule</h2>
        <div className="grid md:grid-cols-4 gap-4">
            <label className="text-xs font-bold">Email enabled<input type="checkbox" checked={s.email.enabled} onChange={e=>patch('email.enabled',e.target.checked)} className="ml-3"/></label>
            <label className="text-xs font-bold">Frequency
                <select className={input} value={s.email.frequency} onChange={e=>patch('email.frequency',e.target.value)}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                </select>
            </label>
            <label className="text-xs font-bold">Hour (0-23)<input className={input} type="number" min="0" max="23" value={s.email.sendHour} onChange={e=>patch('email.sendHour',e.target.value)}/></label>
            <label className="text-xs font-bold">Minute<input className={input} type="number" min="0" max="59" value={s.email.sendMinute} onChange={e=>patch('email.sendMinute',e.target.value)}/></label>
        </div>
            <div className="grid md:grid-cols-3 gap-4">
                <label className="text-xs font-bold">Weekly day
                    <select className={input} value={s.email.weeklyDay} onChange={e=>patch('email.weeklyDay',e.target.value)}>
                        <option value="0">Sunday</option>
                        <option value="1">Monday</option>
                        <option value="2">Tuesday</option>
                        <option value="3">Wednesday</option>
                        <option value="4">Thursday</option>
                        <option value="5">Friday</option>
                        <option value="6">Saturday</option>
                    </select>
                </label>
                <label className="text-xs font-bold">Monthly day<input className={input} type="number" min="1" max="28" value={s.email.monthlyDay} onChange={e=>patch('email.monthlyDay',e.target.value)}/></label>
                <label className="text-xs font-bold">Recipients<input className={input} value={s.recipients.join(', ')} onChange={e=>setS({...s,recipients:e.target.value.split(',').map((x:string)=>x.trim()).filter(Boolean)})}/></label>
            </div>
                <div className="grid md:grid-cols-4 gap-3 text-xs">
                    <label><input type="checkbox" checked={s.email.includeNearExpiry} onChange={e=>patch('email.includeNearExpiry',e.target.checked)}/> Near expiry</label>
                    <label><input type="checkbox" checked={s.email.includeDeadStock} onChange={e=>patch('email.includeDeadStock',e.target.checked)}/> Dead stock</label>
                    <label><input type="checkbox" checked={s.email.includeFastMoving} onChange={e=>patch('email.includeFastMoving',e.target.checked)}/> Fast moving</label>
                    <label><input type="checkbox" checked={s.email.includeSlowMoving} onChange={e=>patch('email.includeSlowMoving',e.target.checked)}/> Slow moving</label>
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                    <button onClick={save} disabled={saving} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold">{saving?'Saving...':'Save Settings'}</button>
                    <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Test recipient email" className="px-3 py-2.5 rounded-xl border text-sm w-64"/>
                    <button onClick={test} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold">Send Test Alert</button>
                </div>
    </section>
    </div>
}
