import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getInventorySettings, buildInventoryReport } from "@/lib/inventoryIntelligence";
export const dynamic="force-dynamic";
export async function GET(req:Request){try{const u=await getCurrentUser();
    if(!u)return NextResponse.json({success:false,error:"Unauthorized"},
        {status:401});
        const companyId=new URL(req.url).searchParams.get("companyId")||(typeof (u as any).companyId==="object"?String((u as any).companyId?._id||""):String((u as any).companyId||""));
        const s=await getInventorySettings(String((u as any).tenantId||"TENANT001"),
        companyId);const r=await buildInventoryReport(s);
        return NextResponse.json({success:true,settings:s,summary:{nearExpiry:r.nearExpiry.length,deadStock:r.deadStock.length,fastMoving:r.fastMoving.length,slowMoving:r.slowMoving.length},report:r})}catch(e:any){return NextResponse.json({success:false,error:e.message},
            {status:500})}}
