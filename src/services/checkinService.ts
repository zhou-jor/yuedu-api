import dayjs from 'dayjs';
import mongoose from 'mongoose';
import { Checkin, Task as TaskModel, PointLog, User } from '../models';
import { cache, cacheKeys } from '../utils/redis';
import { paginate } from '../utils/pagination';
import { AppError } from '../middleware/errorHandler';

const BASE_CHECKIN_POINTS = 10;
const STREAK_BONUS_POINTS = 5;
const STREAK_BONUS_DAYS = 7;

const DAILY_TASKS = [
  { taskKey: 'read_article', target: 1, points: 5, title: '阅读1篇文章' },
  { taskKey: 'post_comment', target: 1, points: 3, title: '发表1条评论' },
  { taskKey: 'share_article', target: 1, points: 3, title: '分享1篇文章' },
  { taskKey: 'browse_discover', target: 1, points: 2, title: '浏览发现页' },
];

const GROWTH_TASKS = [
  { taskKey: 'complete_profile', target: 1, points: 50, title: '完善个人资料' },
  { taskKey: 'follow_10', target: 10, points: 30, title: '关注10位用户' },
  { taskKey: 'read_100', target: 100, points: 100, title: '累计阅读100篇' },
  { taskKey: 'publish_first', target: 1, points: 50, title: '发布首篇文章' },
];

function todayStr() {
  return dayjs().format('YYYY-MM-DD');
}

function yesterdayStr() {
  return dayjs().subtract(1, 'day').format('YYYY-MM-DD');
}

function getWeekDates() {
  const start = dayjs().startOf('week').add(1, 'day'); // Monday
  return Array.from({ length: 7 }, (_, i) => start.add(i, 'day').format('YYYY-MM-DD'));
}

async function addPoints(userId: string, points: number, type: 'checkin' | 'task', description: string) {
  await PointLog.create({ userId, points, type, description });
  await User.findByIdAndUpdate(userId, { $inc: { 'stats.points': points } });
  await cache.del(cacheKeys.userInfo(userId));
}

export const checkinService = {
  async checkin(userId: string) {
    const date = todayStr();
    const existing = await Checkin.findOne({ userId, date });
    if (existing) {
      const user = await User.findById(userId).select('streakDays stats.points');
      return {
        alreadyCheckedIn: true,
        date,
        points: existing.points,
        streakDays: user?.streakDays ?? 0,
        totalPoints: user?.stats?.points ?? 0,
      };
    }

    const yesterdayCheckin = await Checkin.findOne({ userId, date: yesterdayStr() });
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(20002, '用户不存在', 404);
    }

    const streakDays = yesterdayCheckin ? user.streakDays + 1 : 1;
    let points = BASE_CHECKIN_POINTS;
    if (streakDays > 0 && streakDays % STREAK_BONUS_DAYS === 0) {
      points += STREAK_BONUS_POINTS;
    }

    await Checkin.create({ userId, date, points });
    await User.findByIdAndUpdate(userId, { streakDays });
    await addPoints(userId, points, 'checkin', `签到奖励${streakDays > 1 ? `（连续${streakDays}天）` : ''}`);

    const updatedUser = await User.findById(userId).select('streakDays stats.points');
    return {
      alreadyCheckedIn: false,
      date,
      points,
      streakDays: updatedUser?.streakDays ?? streakDays,
      totalPoints: updatedUser?.stats?.points ?? 0,
    };
  },

  async getStatus(userId: string) {
    const date = todayStr();
    const weekDates = getWeekDates();
    const checkins = await Checkin.find({
      userId,
      date: { $in: weekDates },
    }).select('date points');

    const checkedDates = new Set(checkins.map((c) => c.date));
    const calendar = weekDates.map((d) => ({
      date: d,
      checked: checkedDates.has(d),
    }));

    const todayCheckin = checkins.find((c) => c.date === date);
    const user = await User.findById(userId).select('streakDays stats.points');
    if (!user) {
      throw new AppError(20002, '用户不存在', 404);
    }

    return {
      calendar,
      streakDays: user.streakDays,
      checkedInToday: !!todayCheckin,
      todayPoints: todayCheckin?.points ?? 0,
      totalPoints: user.stats.points,
    };
  },

  async ensureDailyTasks(userId: string, date: string) {
    const existing = await TaskModel.find({ userId, taskType: 'daily', date });
    const existingKeys = new Set(existing.map((t) => t.taskKey));

    const toCreate = DAILY_TASKS.filter((t) => !existingKeys.has(t.taskKey)).map((t) => ({
      userId,
      taskType: 'daily' as const,
      taskKey: t.taskKey,
      progress: 0,
      target: t.target,
      points: t.points,
      status: 'pending' as const,
      date,
    }));

    if (toCreate.length > 0) {
      await TaskModel.insertMany(toCreate);
    }
  },

  async ensureGrowthTasks(userId: string) {
    const existing = await TaskModel.find({ userId, taskType: 'growth' });
    const existingKeys = new Set(existing.map((t) => t.taskKey));

    const toCreate = GROWTH_TASKS.filter((t) => !existingKeys.has(t.taskKey)).map((t) => ({
      userId,
      taskType: 'growth' as const,
      taskKey: t.taskKey,
      progress: 0,
      target: t.target,
      points: t.points,
      status: 'pending' as const,
      date: null,
    }));

    if (toCreate.length > 0) {
      await TaskModel.insertMany(toCreate);
    }
  },

  async getTasks(userId: string) {
    const date = todayStr();
    await this.ensureDailyTasks(userId, date);
    await this.ensureGrowthTasks(userId);

    const tasks = await TaskModel.find({
      userId,
      $or: [{ taskType: 'daily', date }, { taskType: 'growth' }],
    }).sort({ taskType: 1, createdAt: 1 });

    const taskMeta = [...DAILY_TASKS, ...GROWTH_TASKS].reduce(
      (acc, t) => {
        acc[t.taskKey] = t.title;
        return acc;
      },
      {} as Record<string, string>,
    );

    return tasks.map((task) => ({
      id: task._id,
      taskType: task.taskType,
      taskKey: task.taskKey,
      title: taskMeta[task.taskKey] || task.taskKey,
      progress: task.progress,
      target: task.target,
      points: task.points,
      status: task.status,
      date: task.date,
    }));
  },

  async claimReward(userId: string, taskId: string) {
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      throw new AppError(10004, '无效的任务ID', 400);
    }

    const task = await TaskModel.findOne({ _id: taskId, userId });
    if (!task) {
      throw new AppError(20002, '任务不存在', 404);
    }
    if (task.status === 'claimed') {
      throw new AppError(10004, '奖励已领取', 400);
    }
    if (task.status !== 'completed') {
      throw new AppError(10004, '任务尚未完成', 400);
    }

    task.status = 'claimed';
    await task.save();

    await addPoints(userId, task.points, 'task', `任务奖励：${task.taskKey}`);

    const user = await User.findById(userId).select('stats.points');
    return {
      taskId: task._id,
      points: task.points,
      totalPoints: user?.stats?.points ?? 0,
    };
  },

  async getPoints(userId: string, page: number, pageSize: number) {
    return paginate(PointLog, { userId }, { page, pageSize });
  },
};
