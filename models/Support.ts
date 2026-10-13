
import mongoose, { Schema, Model } from "mongoose";

export interface ISupport {
  LCODE?: string | number;
  SNO?: string | number;
  REMARK?: string;
  [key: string]: any;
}

const SupportSchema = new Schema<ISupport>(
  {
    LCODE: Schema.Types.Mixed,
    SNO: Schema.Types.Mixed,
    REMARK: String,
  },
  {
    collection: "vfp_new_folder_support",
    strict: false,
    versionKey: false,
  }
);

const Support: Model<ISupport> =
  (mongoose.models.Support as Model<ISupport>) ||
  mongoose.model<ISupport>("Support", SupportSchema);

//export default Support;


export default mongoose.models.Support ||
  mongoose.model<ISupport>(
    "Support",
    SupportSchema,
    "vfp_new_folder_support"
  );

  