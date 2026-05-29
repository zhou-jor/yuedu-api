import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISearchHistory extends Document {
  userId: Types.ObjectId;
  keyword: string;
}

const searchHistorySchema = new Schema<ISearchHistory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    keyword: { type: String, required: true },
  },
  { timestamps: true },
);

searchHistorySchema.index({ userId: 1, createdAt: -1 });

export const SearchHistory = mongoose.model<ISearchHistory>('SearchHistory', searchHistorySchema);
