import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IFollow extends Document {
  followerId: Types.ObjectId;
  followingId: Types.ObjectId;
}

const followSchema = new Schema<IFollow>(
  {
    followerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    followingId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
followSchema.index({ followingId: 1, createdAt: -1 });

export const Follow = mongoose.model<IFollow>('Follow', followSchema);
