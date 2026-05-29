import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectMongo } from '../config/database';
import {
  User,
  Article,
  Category,
  Comment,
  Follow,
  Interaction,
  CollectionFolder,
  Conversation,
  Message,
  Notification,
  Checkin,
  Task,
  PointLog,
  Feedback,
  Config,
  Banner,
  SearchHistory,
  ReadingProgress,
  AuditLog,
} from '../models';

const calcWordCount = (content: string): number => {
  const text = content.replace(/<[^>]+>/g, '').trim();
  return text.length;
};

const calcReadTime = (wordCount: number): number => Math.max(1, Math.ceil(wordCount / 300));

const randomPublishedAt = (): Date => {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  return new Date(thirtyDaysAgo + Math.random() * (now - thirtyDaysAgo));
};

const ARTICLE_CONTENTS: Record<number, string> = {
  1: `随着2026年的到来，人工智能技术已经深度融入我们的日常生活。从智能家居到自动驾驶，从医疗诊断到教育辅导，AI正在以肉眼可见的速度改变着世界。本文将深入探讨人工智能在交通、医疗、教育、工作等八大领域的具体应用，分析其带来的便利与挑战，并展望未来几年可能的发展方向。无论是语音助手帮你规划行程，还是推荐算法为你筛选资讯，AI已经成为不可分割的数字伙伴。我们也需要关注数据隐私、算法偏见等议题，在享受技术红利的同时保持清醒思考，让技术真正服务于人的全面发展。`,

  2: `设计思维源自工业设计领域，如今已广泛应用于商业创新、教育实践乃至个人生活规划。它的核心在于以用户为中心，通过共情、定义、构思、原型和测试五个阶段，系统化地解决复杂问题。在日常生活中，我们可以用设计思维来优化家居布局、规划旅行路线、改善人际关系。例如，在准备一次家庭聚会时，先了解每位成员的偏好，再定义聚会目标， brainstorm 活动方案，小规模试水后正式执行。这种思维方式帮助我们跳出惯性思维，以更开放、更有创造力的态度面对日常挑战。`,

  3: `每座城市都有属于自己的秘密角落，那些隐藏在街角、巷尾的小咖啡馆，往往是城市最有温度的地方。周末的午后，我沿着老城区的小巷漫步，推开一扇不起眼的木门，便进入了一个完全不同的世界。磨豆机的嗡鸣、拿铁的奶泡、书架上泛黄的旧书，构成了一幅宁静的画面。这些咖啡馆没有连锁品牌的统一装潢，却有着店主独特的审美与故事。在这里，时间仿佛慢了下来，你可以读一本书、写一段文字，或者只是静静地观察来来往往的行人。`,

  4: `深夜，当城市的喧嚣渐渐退去，一盏台灯、一本书，便构成了最治愈的场景。心理学研究表明，睡前阅读有助于降低皮质醇水平，改善睡眠质量。与刷短视频带来的即时刺激不同，深度阅读需要专注与沉浸，这种「心流」状态本身就是一种疗愈。我在无数个失眠的夜晚，靠读书找到了内心的平静。从散文到诗歌，从小说到哲学，文字像一位老友，陪伴我度过那些孤独的时刻。如果你也在寻找一种慢下来的方式，不妨试试在睡前放下手机，翻开一本搁置已久的书。`,

  5: `在信息爆炸的时代，如何高效地获取、整理和运用知识，成为每个人都需要面对的课题。个人知识管理系统（PKM）正是为此而生。一个有效的 PKM 通常包含三个环节：输入——有选择地阅读与收集；处理——用自己的语言提炼、关联与归纳；输出——通过写作、分享来巩固与检验。工具方面，Notion、Obsidian、语雀等各有特色，但工具只是载体，关键在于建立适合自己的方法论。建议从一个小主题开始，持续积累、定期回顾，让知识真正内化为能力。`,

  6: `2026年的出版界精彩纷呈，众多重量级作品即将与读者见面。本文精选了十本最值得期待的新书，涵盖文学、非虚构、科技与人文等多个领域。其中包括诺奖得主的最新长篇、新锐作家的处女作，以及探讨人工智能伦理的深度非虚构作品。每一本书都代表了一种思考方式、一种生活态度。阅读不仅是消遣，更是与伟大心灵对话的过程。不妨提前将这些书目加入 wish list，在新书上市时第一时间开启阅读之旅。`,

  7: `人类是社会性动物，社交连接对于心理健康与幸福感至关重要。从进化心理学的角度看，群体归属曾关系到生存，这种需求深植于我们的基因之中。现代社会的原子化趋势，让许多人感到孤独与疏离。研究表明，高质量的社交关系能够降低抑郁风险、延长寿命、提升免疫力。社交连接不一定是频繁的聚会，一次深度的对话、一个可以倾诉的朋友、一个志同道合的社群，都能带来归属感。在这个数字时代，我们更需要有意识地经营真实的人际关系。`,

  8: `极简主义不是简单地扔东西，而是一种关于「什么对你真正重要」的生活哲学。断舍离的核心理念是：通过减少物质占有，为真正有价值的事物腾出空间——时间、精力、注意力。实践极简可以从一个抽屉、一个衣柜开始，问自己：这件物品在过去一年里是否被使用过？它是否带来 joy？逐步地，你会发现生活变得轻盈，决策变得清晰。极简主义也延伸到数字生活：清理冗余的 App、取消不必要的订阅、减少信息摄入。从断舍离开始，重新掌握生活的主动权。`,
};

async function clearAllCollections(): Promise<void> {
  const models = [
    User,
    Article,
    Category,
    Comment,
    Follow,
    Interaction,
    CollectionFolder,
    Conversation,
    Message,
    Notification,
    Checkin,
    Task,
    PointLog,
    Feedback,
    Config,
    Banner,
    SearchHistory,
    ReadingProgress,
    AuditLog,
  ];

  for (const model of models) {
    await (model as any).deleteMany({});
  }
  console.log('[Seed] All collections cleared');
}

async function seed(): Promise<void> {
  await connectMongo();
  await clearAllCollections();

  // ── Users ──
  const users = await User.insertMany([
    {
      phone: '13800138000',
      nickname: '书虫小明',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      bio: '用阅读丈量世界的宽度',
      interests: ['科技', '文化', '心理'],
      stats: { articles: 12, followers: 1234, following: 128, likes: 3600, points: 2680 },
    },
    {
      phone: '13800138001',
      nickname: '林小雨',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
      bio: '读书是一种生活方式',
    },
    {
      phone: '13800138002',
      nickname: '科技观察者',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
      bio: '关注前沿科技动态',
      role: 'author',
    },
    {
      phone: '13800138003',
      nickname: '文学漫步',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
      role: 'author',
    },
    {
      phone: '13800139999',
      nickname: '管理员',
      role: 'admin',
    },
  ]);

  const [xiaoming, xiaoyu, techObserver, literature, admin] = users;
  console.log(`[Seed] Created ${users.length} users`);

  // ── Categories ──
  const categoryDefs = [
    { name: '科技', icon: '🔬', color: '#3498db', sort: 1 },
    { name: '文化', icon: '📚', color: '#e74c3c', sort: 2 },
    { name: '生活', icon: '🌿', color: '#2ecc71', sort: 3 },
    { name: '情感', icon: '❤️', color: '#e91e63', sort: 4 },
    { name: '财经', icon: '💰', color: '#f39c12', sort: 5 },
    { name: '健康', icon: '🏃', color: '#1abc9c', sort: 6 },
    { name: '旅行', icon: '✈️', color: '#9b59b6', sort: 7 },
    { name: '教育', icon: '🎓', color: '#34495e', sort: 8 },
  ];

  const categories = await Category.insertMany(categoryDefs);
  const catMap = Object.fromEntries(categories.map((c) => [c.name, c._id]));
  console.log(`[Seed] Created ${categories.length} categories`);

  // ── Articles ──
  const articleDefs = [
    {
      title: '深度解析：2026年人工智能将如何重塑我们的日常生活',
      author: techObserver._id,
      category: catMap['科技'],
      cover: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800',
      tags: ['人工智能', '科技趋势', '2026'],
      stats: { views: 15600, likes: 2341, comments: 456, collects: 890, shares: 234 },
      contentIdx: 1,
    },
    {
      title: '设计思维在日常生活中的应用',
      author: literature._id,
      category: catMap['文化'],
      cover: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800',
      tags: ['设计思维', '生活哲学'],
      contentIdx: 2,
    },
    {
      title: '城市漫步：发现隐藏在街角的咖啡馆',
      author: xiaoyu._id,
      category: catMap['生活'],
      cover: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800',
      tags: ['城市', '咖啡', '探店'],
      contentIdx: 3,
    },
    {
      title: '深夜读书的治愈力量',
      author: xiaoming._id,
      category: catMap['文化'],
      cover: 'https://images.unsplash.com/photo-1512820790801-4159aa173f2?w=800',
      tags: ['阅读', '治愈', '深夜'],
      contentIdx: 4,
    },
    {
      title: '如何建立有效的个人知识管理系统',
      author: techObserver._id,
      category: catMap['教育'],
      cover: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800',
      tags: ['知识管理', '效率', 'PKM'],
      contentIdx: 5,
    },
    {
      title: '2026年最值得期待的10本新书',
      author: literature._id,
      category: catMap['文化'],
      cover: 'https://images.unsplash.com/photo-1516979187450-637abb4f9353?w=800',
      tags: ['书单', '2026', '阅读推荐'],
      contentIdx: 6,
    },
    {
      title: '心理学视角：为什么我们需要社交连接',
      author: xiaoyu._id,
      category: catMap['情感'],
      cover: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800',
      tags: ['心理学', '社交', '人际关系'],
      contentIdx: 7,
    },
    {
      title: '极简主义生活指南：从断舍离开始',
      author: xiaoming._id,
      category: catMap['生活'],
      cover: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=800',
      tags: ['极简主义', '断舍离', '生活方式'],
      contentIdx: 8,
    },
  ];

  const articles = await Article.insertMany(
    articleDefs.map((def) => {
      const content = ARTICLE_CONTENTS[def.contentIdx];
      const wordCount = calcWordCount(content);
      const readTime = calcReadTime(wordCount);
      const summary = content.slice(0, 80) + '…';

      return {
        author: def.author,
        title: def.title,
        content,
        summary,
        cover: def.cover,
        category: def.category,
        tags: def.tags,
        status: 'published' as const,
        stats: def.stats ?? {
          views: Math.floor(Math.random() * 5000) + 500,
          likes: Math.floor(Math.random() * 500) + 50,
          comments: 0,
          collects: Math.floor(Math.random() * 200) + 20,
          shares: Math.floor(Math.random() * 100) + 10,
        },
        wordCount,
        readTime,
        publishedAt: randomPublishedAt(),
      };
    }),
  );
  console.log(`[Seed] Created ${articles.length} articles`);

  // Update category articleCount
  const categoryCounts: Record<string, number> = {};
  for (const def of articleDefs) {
    const catName = categories.find((c) => c._id.equals(def.category))!.name;
    categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
  }
  for (const [name, count] of Object.entries(categoryCounts)) {
    await Category.updateOne({ name }, { articleCount: count });
  }

  // ── Banners (articles 1, 2, 6) ──
  const bannerArticles = [articles[0], articles[1], articles[5]];
  const banners = await Banner.insertMany(
    bannerArticles.map((article, idx) => ({
      title: article.title,
      image: article.cover,
      link: article._id.toString(),
      linkType: 'article' as const,
      sort: idx,
      status: 'active' as const,
    })),
  );
  console.log(`[Seed] Created ${banners.length} banners`);

  // ── Config ──
  await Config.insertMany([
    {
      key: 'faq',
      value: [
        {
          question: '如何修改个人资料？',
          answer: '进入「我的」页面，点击头像或昵称即可编辑个人资料，包括头像、昵称、简介和兴趣标签。',
        },
        {
          question: '如何签到获取积分？',
          answer: '在「我的」-「签到」页面点击签到按钮，每日签到可获得积分奖励，连续签到有额外加成。',
        },
        {
          question: '如何发布文章？',
          answer: '成为作者后，在「创作中心」点击「写文章」，填写标题、正文和封面即可发布或保存草稿。',
        },
        {
          question: '如何反馈问题？',
          answer: '您可以通过「设置」-「帮助与反馈」提交问题，我们会尽快处理并回复。',
        },
        {
          question: '如何注销账号？',
          answer: '进入「设置」-「账号与安全」-「注销账号」，按提示操作即可。注销后数据将无法恢复。',
        },
      ],
      description: '常见问题',
      group: 'client',
      updatedBy: admin._id,
    },
    {
      key: 'features',
      value: {
        enableCheckin: true,
        enableThirdPartyLogin: true,
        enableArticlePublish: true,
        darkMode: true,
        share: true,
        audio: true,
        pushNotification: true,
      },
      description: '功能开关',
      group: 'client',
      updatedBy: admin._id,
    },
  ]);
  console.log('[Seed] Created config entries (faq, features)');

  // ── Follows ──
  const follows = await Follow.insertMany([
    { followerId: xiaoming._id, followingId: xiaoyu._id },
    { followerId: xiaoming._id, followingId: techObserver._id },
    { followerId: xiaoming._id, followingId: literature._id },
    { followerId: xiaoyu._id, followingId: xiaoming._id },
  ]);
  console.log(`[Seed] Created ${follows.length} follow relationships`);

  // ── Comments (articles 1-3, 2-3 each) ──
  const commentDefs = [
    { articleIdx: 0, userId: xiaoyu._id, content: '分析得很透彻，期待AI在教育领域的更多应用！' },
    { articleIdx: 0, userId: techObserver._id, content: '感谢阅读，后续会继续更新这个系列文章。' },
    { articleIdx: 0, userId: literature._id, content: '技术进步的同时，人文思考同样重要。' },
    { articleIdx: 1, userId: xiaoming._id, content: '设计思维确实可以应用到生活的方方面面，很受启发。' },
    { articleIdx: 1, userId: xiaoyu._id, content: '用设计思维规划旅行路线，效果出奇地好！' },
    { articleIdx: 2, userId: xiaoming._id, content: '这篇写得太有画面感了，下次一起去探店吧！' },
    { articleIdx: 2, userId: techObserver._id, content: '城市角落的发现，往往是最惊喜的体验。' },
    { articleIdx: 2, userId: literature._id, content: '咖啡馆是城市里的避难所，说得太好了。' },
  ];

  const comments = await Comment.insertMany(
    commentDefs.map((c) => ({
      articleId: articles[c.articleIdx]._id,
      userId: c.userId,
      content: c.content,
    })),
  );

  // Sync comment counts on articles 1-3
  for (let i = 0; i < 3; i++) {
    const count = commentDefs.filter((c) => c.articleIdx === i).length;
    await Article.updateOne({ _id: articles[i]._id }, { 'stats.comments': count });
  }
  console.log(`[Seed] Created ${comments.length} comments`);

  // ── Collections (书虫小明 collects articles 1, 2, 3) ──
  const collects = await Interaction.insertMany([
    { userId: xiaoming._id, articleId: articles[0]._id, type: 'collect' },
    { userId: xiaoming._id, articleId: articles[1]._id, type: 'collect' },
    { userId: xiaoming._id, articleId: articles[2]._id, type: 'collect' },
  ]);
  console.log(`[Seed] Created ${collects.length} collection interactions`);

  // ── Conversation & Messages ──
  const xiaomingId = xiaoming._id.toString();
  const xiaoyuId = xiaoyu._id.toString();

  const messageDefs = [
    { sender: xiaoming, content: '小雨，最近在读什么书？' },
    { sender: xiaoyu, content: '在看一本关于城市设计的书，很有意思！' },
    { sender: xiaoming, content: '推荐一下呗，我也想看看。' },
    { sender: xiaoyu, content: '是《城市的表情》，里面有很多关于咖啡馆的描写。' },
    { sender: xiaoming, content: '听起来不错，周末一起去那家新开的咖啡馆聊聊？' },
  ];

  const conversation = await Conversation.create({
    participants: [xiaoming._id, xiaoyu._id],
    lastMessage: {
      content: messageDefs[4].content,
      type: 'text',
      senderId: xiaoming._id,
      createdAt: new Date(),
    },
    unreadCount: new Map([
      [xiaomingId, 0],
      [xiaoyuId, 1],
    ]),
    isPinned: new Map([
      [xiaomingId, false],
      [xiaoyuId, false],
    ]),
  });

  const messages = await Message.insertMany(
    messageDefs.map((msg, idx) => ({
      conversationId: conversation._id,
      senderId: msg.sender._id,
      type: 'text' as const,
      content: msg.content,
      readBy: idx < messageDefs.length - 1 ? [msg.sender._id] : [xiaoming._id],
      createdAt: new Date(Date.now() - (messageDefs.length - idx) * 60_000),
    })),
  );
  console.log(`[Seed] Created 1 conversation with ${messages.length} messages`);

  // ── Summary ──
  const stats = {
    users: await User.countDocuments(),
    categories: await Category.countDocuments(),
    articles: await Article.countDocuments(),
    banners: await Banner.countDocuments(),
    configs: await Config.countDocuments(),
    follows: await Follow.countDocuments(),
    comments: await Comment.countDocuments(),
    interactions: await Interaction.countDocuments(),
    conversations: await Conversation.countDocuments(),
    messages: await Message.countDocuments(),
  };

  console.log('\n========== Seed Summary ==========');
  console.log(`  Users:         ${stats.users}`);
  console.log(`  Categories:    ${stats.categories}`);
  console.log(`  Articles:      ${stats.articles}`);
  console.log(`  Banners:       ${stats.banners}`);
  console.log(`  Configs:       ${stats.configs}`);
  console.log(`  Follows:       ${stats.follows}`);
  console.log(`  Comments:      ${stats.comments}`);
  console.log(`  Interactions:  ${stats.interactions}`);
  console.log(`  Conversations: ${stats.conversations}`);
  console.log(`  Messages:      ${stats.messages}`);
  console.log('==================================\n');
  console.log('[Seed] Done!');
}

seed()
  .catch((err) => {
    console.error('[Seed] Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log('[MongoDB] Disconnected');
  });
