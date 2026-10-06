"use client";
import {useEffect,useState} from "react";
export default function NearExpiryPage(){const[d,setD]=useState<any[]>([]);const[s,setS]=useState("");
    const[loading,setL]=useState(true);
    const load=()=>{setL(true);fetch(`/api/inventory-intelligence/near-expiry?q=${encodeURIComponent(s)}`).then(r=>r.json()).then(x=>setD(x.items||[])).finally(()=>setL(false))};
    
    useEffect(load,[]);return <div className="p-5 max-w-[1500px] mx-auto space-y-5">
            <div><h1 className="text-2xl font-black">Near Expiry</h1>
                <p className="text-xs text-slate-500">Products inside the configured expiry window and above minimum stock.</p>
            </div>
            <div className="flex gap-2"><input value={s} onChange={e=>setS(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load()} placeholder="Search product or batch" className="px-3 py-2 rounded-xl border w-full max-w-sm text-sm"/>
                <button onClick={load} className="px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold">Search</button>
            </div>
        <div className="overflow-auto rounded-2xl border bg-white">
            <table className="min-w-full text-xs">
                <thead>
                    <tr className="bg-slate-50">
                        <th className="p-3 text-left">Product</th>
                        <th className="p-3">Batch</th>
                        <th className="p-3">Expiry</th>
                        <th className="p-3">Days</th>
                        <th className="p-3">Stock</th>
                        <th className="p-3">MRP</th>
                    </tr>
                </thead>
                <tbody>{loading?<tr>
                    <td colSpan={6} className="p-8 text-center">Loading...</td>
                    </tr>:d.map(x=><tr key={x.id} className="border-t">
                        <td className="p-3 font-semibold">{x.product}</td>
                        <td className="p-3 text-center">{x.batchNo}</td>
                        <td className="p-3 text-center">{x.expiry}</td>
                        <td className="p-3 text-center text-amber-600 font-bold">{x.daysToExpiry}</td>
                        <td className="p-3 text-center">{x.stock}</td>
                        <td className="p-3 text-center">₹{Number(x.mrp||0).toLocaleString('en-IN')}</td>
                    </tr>)}
                </tbody>
            </table>
        </div>
    </div>
}
