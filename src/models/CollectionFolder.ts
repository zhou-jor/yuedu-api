import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICollectionFolder extends Document {
  userId: Types.ObjectId;
  name: string;
  articleCount: number;
  isDefault: boolean;
}

const collectionFolderSchema = new Schema<ICollectionFolder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    articleCount: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

collectionFolderSchema.index({ userId: 1, createdAt: -1 });

export const CollectionFolder = mongoose.model<ICollectionFolder>(
  'CollectionFolder',
  collectionFolderSchema,
);
