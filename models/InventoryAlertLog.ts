import mongoose, { Schema, Document } from "mongoose";
export interface IInventoryAlertLog extends Document { tenantId:string; companyId:string; runKey:string; sentAt:Date; recipients:string[]; sections:string[]; counts:{nearExpiry:number;deadStock:number;fastMoving:number;slowMoving:number}; success:boolean; error?:string; }
const SchemaDef=new Schema<IInventoryAlertLog>({
  tenantId:{type:String,required:true,index:true}, companyId:{type:String,required:true,index:true}, runKey:{type:String,required:true,index:true}, sentAt:{type:Date,default:Date.now}, recipients:{type:[String],default:[]}, sections:{type:[String],default:[]},
  counts:{nearExpiry:{type:Number,default:0},deadStock:{type:Number,default:0},fastMoving:{type:Number,default:0},slowMoving:{type:Number,default:0}}, success:{type:Boolean,default:false}, error:{type:String,default:""}
},{timestamps:true,collection:"inventory_alert_logs"});
SchemaDef.index({tenantId:1,companyId:1,runKey:1},{unique:true});
export default mongoose.models.InventoryAlertLog || mongoose.model<IInventoryAlertLog>("InventoryAlertLog",SchemaDef);
