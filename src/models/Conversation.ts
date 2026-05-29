import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IConversation extends Document {
  participants: Types.ObjectId[];
  lastMessage: {
    content: string;
    type: string;
    senderId: Types.ObjectId;
    createdAt: Date;
  };
  unreadCount: Map<string, number>;
  isPinned: Map<string, boolean>;
  status: 'active' | 'deleted';
}

const conversationSchema = new Schema<IConversation>(
  {
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      validate: {
        validator: (v: Types.ObjectId[]) => v.length === 2,
        message: 'participants must contain exactly 2 users',
      },
      required: true,
    },
    lastMessage: {
      content: { type: String, default: '' },
      type: { type: String, default: 'text' },
      senderId: { type: Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date, default: Date.now },
    },
    unreadCount: { type: Map, of: Number, default: {} },
    isPinned: { type: Map, of: Boolean, default: {} },
    status: { type: String, enum: ['active', 'deleted'], default: 'active' },
  },
  { timestamps: true },
);

conversationSchema.index({ participants: 1, updatedAt: -1 });

export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);
