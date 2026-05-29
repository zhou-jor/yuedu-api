import { Model, FilterQuery, SortOrder } from 'mongoose';

interface PaginateOptions {
  page: number;
  pageSize: number;
  sort?: Record<string, SortOrder>;
  populate?: string | string[] | any[];
  select?: string;
}

export interface PaginateResult {
  list: any[];
  total: number;
  page: number;
  pageSize: number;
}

export const paginate = async <T>(
  model: Model<T>,
  filter: FilterQuery<T>,
  options: PaginateOptions,
): Promise<PaginateResult> => {
  const { page, pageSize, sort = { createdAt: -1 as SortOrder }, populate, select } = options;
  const skip = (page - 1) * pageSize;

  let query = model.find(filter).sort(sort).skip(skip).limit(pageSize);

  if (populate) {
    if (Array.isArray(populate)) {
      populate.forEach((p) => { query = query.populate(p); });
    } else {
      query = query.populate(populate);
    }
  }

  if (select) {
    query = query.select(select);
  }

  const [list, total] = await Promise.all([
    query.lean().exec(),
    model.countDocuments(filter),
  ]);

  return { list, total, page, pageSize };
};
