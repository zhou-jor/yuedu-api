import mongoose, { Document, Schema, Types } from 'mongoose';

export interface INotification extends Document {
  userId: Types.ObjectId;
  fromUserId: Types.ObjectId;
  type: 'like' | 'comment' | 'follow' | 'system' | 'achievement';
  targetType?: 'article' | 'comment' | null;
  targetId?: Types.ObjectId | null;
  content: string;
  isRead: boolean;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['like', 'comment', 'follow', 'system', 'achievement'],
      required: true,
    },
    targetType: { type: String, enum: ['article', 'comment'], default: null },
    targetId: { type: Schema.Types.ObjectId, default: null },
    content: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
