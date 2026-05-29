import { Types } from 'mongoose';
import { Conversation, Message, User } from '../models';
import { paginate } from '../utils/pagination';
import { cache, cacheKeys } from '../utils/redis';
import { AppError } from '../middleware/errorHandler';
import { emitToUser, emitToConversation } from '../socket';

const RECALL_WINDOW_MS = 2 * 60 * 1000;

const getOtherParticipant = (participants: Types.ObjectId[], userId: string) =>
  participants.find((p) => p.toString() !== userId)?.toString();

const assertParticipant = async (userId: string, conversationId: string) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: new Types.ObjectId(userId),
    status: 'active',
  });

  if (!conversation) {
    throw new AppError(40401, '会话不存在', 404);
  }

  return conversation;
};

export const messageService = {
  async getConversations(userId: string, page: number, pageSize: number) {
    const filter = {
      participants: new Types.ObjectId(userId),
      status: 'active' as const,
    };

    const result = await paginate(Conversation, filter, {
      page,
      pageSize,
      sort: { updatedAt: -1 },
    });

    const enriched = await Promise.all(
      result.list.map(async (conv: any) => {
        const otherUserId = getOtherParticipant(conv.participants, userId);
        const otherUser = otherUserId
          ? await User.findById(otherUserId).select('nickname avatar').lean()
          : null;
        const online = otherUserId
          ? !!(await cache.get(cacheKeys.onlineStatus(otherUserId)))
          : false;

        const getMapValue = (map: Map<string, unknown> | Record<string, unknown> | undefined, key: string) => {
          if (!map) return undefined;
          if (map instanceof Map) return map.get(key);
          return map[key];
        };

        return {
          ...conv,
          otherUser,
          unreadCount: (getMapValue(conv.unreadCount, userId) as number) || 0,
          isPinned: !!getMapValue(conv.isPinned, userId),
          online,
        };
      }),
    );

    return { ...result, list: enriched };
  },

  async createConversation(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new AppError(10004, '不能与自己创建会话', 400);
    }

    const targetUser = await User.findById(targetUserId).select('nickname avatar status');
    if (!targetUser || targetUser.status !== 'active') {
      throw new AppError(40401, '用户不存在', 404);
    }

    const userObjId = new Types.ObjectId(userId);
    const targetObjId = new Types.ObjectId(targetUserId);

    let conversation = await Conversation.findOne({
      participants: { $all: [userObjId, targetObjId] },
      status: 'active',
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userObjId, targetObjId],
        lastMessage: { content: '', type: 'text', senderId: userObjId, createdAt: new Date() },
        unreadCount: new Map([[userId, 0], [targetUserId, 0]]),
        isPinned: new Map([[userId, false], [targetUserId, false]]),
      });
    }

    return {
      ...conversation.toObject(),
      otherUser: targetUser,
    };
  },

  async getMessages(userId: string, conversationId: string, page: number, pageSize: number) {
    await assertParticipant(userId, conversationId);

    return paginate(
      Message,
      { conversationId: new Types.ObjectId(conversationId) },
      {
        page,
        pageSize,
        sort: { createdAt: -1 },
        populate: { path: 'senderId', select: 'nickname avatar' } as any,
      },
    );
  },

  async getUnreadCount(userId: string) {
    const cacheKey = cacheKeys.messageUnread(userId);
    const cached = await cache.get<number>(cacheKey);
    if (cached !== null && cached !== undefined) {
      return { total: cached };
    }

    const conversations = await Conversation.find({
      participants: new Types.ObjectId(userId),
      status: 'active',
    }).select('unreadCount');

    let total = 0;
    for (const conv of conversations) {
      total += conv.unreadCount?.get(userId) || 0;
    }

    await cache.set(cacheKey, total, 300);
    return { total };
  },

  async sendMessage(
    userId: string,
    conversationId: string,
    type: string,
    content: string,
    articleRef?: string,
  ) {
    const conversation = await assertParticipant(userId, conversationId);
    const otherUserId = getOtherParticipant(conversation.participants, userId)!;

    const message = await Message.create({
      conversationId: new Types.ObjectId(conversationId),
      senderId: new Types.ObjectId(userId),
      type,
      content,
      articleRef: articleRef ? new Types.ObjectId(articleRef) : null,
    });

    const now = new Date();
    conversation.lastMessage = {
      content: type === 'text' ? content : `[${type}]`,
      type,
      senderId: new Types.ObjectId(userId),
      createdAt: now,
    };

    const currentUnread = conversation.unreadCount?.get(otherUserId) || 0;
    conversation.unreadCount.set(otherUserId, currentUnread + 1);
    await conversation.save();

    await cache.del(cacheKeys.messageUnread(otherUserId));

    const payload = {
      id: message._id,
      conversationId,
      senderId: userId,
      type: message.type,
      content: message.content,
      articleRef: message.articleRef,
      createdAt: (message as any).createdAt,
    };

    emitToUser(otherUserId, 'new_message', payload);
    emitToConversation(conversationId, 'new_message', payload);

    return message;
  },

  async recallMessage(userId: string, conversationId: string, messageId: string) {
    await assertParticipant(userId, conversationId);

    const message = await Message.findOne({
      _id: messageId,
      conversationId: new Types.ObjectId(conversationId),
      senderId: new Types.ObjectId(userId),
    });

    if (!message) {
      throw new AppError(40401, '消息不存在', 404);
    }

    if (message.isRecalled) {
      return { success: true, isRecalled: true };
    }

    const elapsed = Date.now() - new Date((message as any).createdAt).getTime();
    if (elapsed > RECALL_WINDOW_MS) {
      throw new AppError(10004, '超过2分钟，无法撤回', 400);
    }

    message.isRecalled = true;
    message.content = '';
    await message.save();

    const payload = { conversationId, messageId, isRecalled: true };
    const conversation = await Conversation.findById(conversationId);
    const otherUserId = conversation
      ? getOtherParticipant(conversation.participants, userId)
      : null;

    if (otherUserId) {
      emitToUser(otherUserId, 'message_recalled', payload);
    }
    emitToConversation(conversationId, 'message_recalled', payload);

    return { success: true, isRecalled: true };
  },

  async markRead(userId: string, conversationId: string) {
    const conversation = await assertParticipant(userId, conversationId);

    conversation.unreadCount.set(userId, 0);
    await conversation.save();
    await cache.del(cacheKeys.messageUnread(userId));

    await Message.updateMany(
      {
        conversationId: new Types.ObjectId(conversationId),
        readBy: { $ne: new Types.ObjectId(userId) },
      },
      { $addToSet: { readBy: new Types.ObjectId(userId) } },
    );

    const payload = { conversationId, userId };
    emitToConversation(conversationId, 'message_read', payload);

    const otherUserId = getOtherParticipant(conversation.participants, userId);
    if (otherUserId) {
      emitToUser(otherUserId, 'message_read', payload);
    }

    return { success: true };
  },

  async deleteConversation(userId: string, conversationId: string) {
    await assertParticipant(userId, conversationId);
    await Conversation.updateOne({ _id: conversationId }, { $set: { status: 'deleted' } });
    return { success: true };
  },

  async pinConversation(userId: string, conversationId: string, isPinned: boolean) {
    const conversation = await assertParticipant(userId, conversationId);
    conversation.isPinned.set(userId, isPinned);
    await conversation.save();
    return { isPinned };
  },
};
