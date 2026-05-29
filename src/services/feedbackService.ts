import { Feedback, Config } from '../models';
import type { IFeedback } from '../models/Feedback';

const DEFAULT_FAQ = [
  {
    question: '如何修改个人资料？',
    answer: '进入「我的」页面，点击头像或昵称即可编辑个人资料。',
  },
  {
    question: '如何签到获取积分？',
    answer: '在「我的」-「签到」页面点击签到按钮，每日签到可获得积分奖励。',
  },
  {
    question: '如何反馈问题？',
    answer: '您可以通过本页面的反馈表单提交问题，我们会尽快处理。',
  },
  {
    question: '如何注销账号？',
    answer: '进入「设置」-「账号与安全」-「注销账号」，按提示操作即可。',
  },
];

export const feedbackService = {
  async create(
    userId: string,
    type: 'feature' | 'bug' | 'complaint' | 'other',
    content: string,
    images: string[] = [],
    contact?: string,
  ) {
    const feedback = await Feedback.create({
      userId,
      type,
      content,
      images: images.slice(0, 9),
      contact,
    });

    const obj = feedback.toObject() as IFeedback & { createdAt?: Date };
    return {
      id: feedback._id,
      type: feedback.type,
      content: feedback.content,
      status: feedback.status,
      createdAt: obj.createdAt,
    };
  },

  async getFaq() {
    const config = await Config.findOne({ key: 'faq' }).lean();
    if (config?.value && Array.isArray(config.value)) {
      return config.value;
    }
    return DEFAULT_FAQ;
  },
};
