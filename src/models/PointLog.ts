import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPointLog extends Document {
  userId: Types.ObjectId;
  points: number;
  type: 'checkin' | 'task' | 'reward' | 'exchange';
  description: string;
}

const pointLogSchema = new Schema<IPointLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    points: { type: Number, required: true },
    type: {
      type: String,
      enum: ['checkin', 'task', 'reward', 'exchange'],
      required: true,
    },
    description: { type: String, default: '' },
  },
  { timestamps: true },
);

pointLogSchema.index({ userId: 1, createdAt: -1 });

export const PointLog = mongoose.model<IPointLog>('PointLog', pointLogSchema);
