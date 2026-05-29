import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IConfig extends Document {
  key: string;
  value: unknown;
  description?: string;
  group?: string;
  updatedBy?: Types.ObjectId;
}

const configSchema = new Schema<IConfig>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
    description: String,
    group: String,
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

configSchema.index({ key: 1 }, { unique: true });
configSchema.index({ group: 1 });

export const Config = mongoose.model<IConfig>('Config', configSchema);
