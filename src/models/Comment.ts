import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IComment extends Document {
  articleId: Types.ObjectId;
  userId: Types.ObjectId;
  parentId?: Types.ObjectId | null;
  replyTo?: Types.ObjectId | null;
  content: string;
  mentions: Types.ObjectId[];
  likes: number;
  status: 'active' | 'deleted';
}

const commentSchema = new Schema<IComment>(
  {
    articleId: { type: Schema.Types.ObjectId, ref: 'Article', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
    replyTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    content: { type: String, required: true },
    mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    likes: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'deleted'], default: 'active' },
  },
  { timestamps: true },
);

commentSchema.index({ articleId: 1, createdAt: -1 });
commentSchema.index({ articleId: 1, likes: -1 });
commentSchema.index({ userId: 1, createdAt: -1 });
commentSchema.index({ parentId: 1, createdAt: 1 });

export const Comment = mongoose.model<IComment>('Comment', commentSchema);
