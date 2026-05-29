import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICheckin extends Document {
  userId: Types.ObjectId;
  date: string;
  points: number;
}

const checkinSchema = new Schema<ICheckin>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    points: { type: Number, default: 0 },
  },
  { timestamps: true },
);

checkinSchema.index({ userId: 1, date: 1 }, { unique: true });

export const Checkin = mongoose.model<ICheckin>('Checkin', checkinSchema);
