import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMessage extends Document {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  type: 'text' | 'image' | 'article_share' | 'audio' | 'system';
  content: string;
  articleRef?: Types.ObjectId | null;
  audioUrl?: string;
  audioDuration?: number;
  isRecalled: boolean;
  readBy: Types.ObjectId[];
}

const messageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['text', 'image', 'article_share', 'audio', 'system'],
      default: 'text',
    },
    content: { type: String, default: '' },
    articleRef: { type: Schema.Types.ObjectId, ref: 'Article', default: null },
    audioUrl: String,
    audioDuration: Number,
    isRecalled: { type: Boolean, default: false },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
