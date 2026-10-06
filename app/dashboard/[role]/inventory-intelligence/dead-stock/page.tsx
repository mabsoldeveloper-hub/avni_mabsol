"use client";
import {useEffect,useState} from "react";
export default function DeadStockPage(){const[d,setD]=useState<any[]>([]);const[s,setS]=useState("");
    const load=()=>fetch(`/api/inventory-intelligence/dead-stock?q=${encodeURIComponent(s)}`).then(r=>r.json()).then(x=>setD(x.items||[]));
    useEffect(()=>{load()},[]);return <div className="p-5 max-w-[1500px] mx-auto space-y-5">
            <div>
                <h1 className="text-2xl font-black">Dead / Dump Stock</h1>
                <p className="text-xs text-slate-500">Stock with no sale movement for the configured number of days.</p>
            </div>
            <div className="flex gap-2">
                <input value={s} onChange={e=>setS(e.target.value)} placeholder="Search product" className="px-3 py-2 rounded-xl border w-full max-w-sm text-sm"/>
                <button onClick={load} className="px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold">Search</button>
            </div>
            <div className="overflow-auto rounded-2xl border bg-white">
                <table className="min-w-full text-xs">
                    <thead><tr className="bg-slate-50">
                        <th className="p-3 text-left">Product</th>
                        <th className="p-3">Code</th>
                        <th className="p-3">Stock</th>
                        <th className="p-3">Last Sale</th>
                        <th className="p-3">No Movement</th>
                        </tr>
                        </thead>
                        <tbody>{d.map(x=><tr key={x.id} className="border-t">
                            <td className="p-3 font-semibold">{x.product}</td>
                            <td className="p-3 text-center">{x.code}</td>
                            <td className="p-3 text-center">{x.stock}</td>
                            <td className="p-3 text-center">{x.lastSale||'Never'}</td>
                            <td className="p-3 text-center text-rose-600 font-bold">{x.noMovementDays===Infinity?'Never':`${x.noMovementDays} days`}</td>
                            </tr>)}
                        </tbody>
                </table>
            </div>
        </div>
}
