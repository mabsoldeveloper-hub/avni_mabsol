import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import InventoryAlertSetting from "@/models/InventoryAlertSetting";
import { getInventorySettings, sendInventoryAlertEmail, shouldRunNow } from "@/lib/inventoryIntelligence";
export const dynamic="force-dynamic"; export const runtime="nodejs";
export async function GET(req:Request){try{const secret=process.env.CRON_SECRET||"";const supplied=req.headers.get("x-cron-secret")||new URL(req.url).searchParams.get("secret")||"";if(!secret||supplied!==secret)return NextResponse.json({success:false,error:"Unauthorized"},{status:401});await dbConnect();const docs=await InventoryAlertSetting.find({enabled:true}).lean();const results=[];for(const d of docs){const s=await getInventorySettings(String(d.tenantId||"TENANT001"),String(d.companyId));if(shouldRunNow(s))results.push(await sendInventoryAlertEmail(s));}return NextResponse.json({success:true,checked:docs.length,executed:results.length,results})}catch(e:any){return NextResponse.json({success:false,error:e.message},{status:500})}}
