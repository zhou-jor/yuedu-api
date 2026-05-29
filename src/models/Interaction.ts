import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IInteraction extends Document {
  userId: Types.ObjectId;
  articleId: Types.ObjectId;
  type: 'like' | 'collect' | 'rate' | 'share';
  folderId?: Types.ObjectId | null;
  rating?: number | null;
}

const interactionSchema = new Schema<IInteraction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    articleId: { type: Schema.Types.ObjectId, ref: 'Article', required: true },
    type: {
      type: String,
      enum: ['like', 'collect', 'rate', 'share'],
      required: true,
    },
    folderId: { type: Schema.Types.ObjectId, ref: 'CollectionFolder', default: null },
    rating: { type: Number, min: 1, max: 5, default: null },
  },
  { timestamps: true },
);

interactionSchema.index({ userId: 1, articleId: 1, type: 1 }, { unique: true });
interactionSchema.index({ userId: 1, type: 1, createdAt: -1 });

export const Interaction = mongoose.model<IInteraction>('Interaction', interactionSchema);
