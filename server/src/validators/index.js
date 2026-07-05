import Joi from 'joi';

export const registerSchema = {
  body: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(128).required(),
    displayName: Joi.string().max(50).optional(),
  }),
};

export const loginSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
};

export const forgotPasswordSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
  }),
};

export const resetPasswordSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().length(6).required(),
    newPassword: Joi.string().min(8).max(128).required(),
  }),
};

export const updateProfileSchema = {
  body: Joi.object({
    displayName: Joi.string().max(50).optional(),
    bio: Joi.string().max(1000).allow('').optional(),
    channelDescription: Joi.string().max(5000).allow('').optional(),
    channelLinks: Joi.array().items(Joi.object({
      title: Joi.string().max(50),
      url: Joi.string().uri(),
    })).max(10).optional(),
    notificationPreferences: Joi.object({
      email: Joi.boolean(),
      push: Joi.boolean(),
      subscriptions: Joi.boolean(),
      comments: Joi.boolean(),
      likes: Joi.boolean(),
    }).optional(),
    watchHistoryEnabled: Joi.boolean().optional(),
  }),
};

export const videoSchema = {
  body: Joi.object({
    title: Joi.string().max(100).required(),
    description: Joi.string().max(5000).allow('').optional(),
    category: Joi.string().valid(
      'music', 'gaming', 'education', 'entertainment', 'sports',
      'news', 'technology', 'tech', 'cooking', 'travel', 'fashion',
      'comedy', 'film', 'science', 'howto', 'pets', 'autos', 'other'
    ).optional(),
    tags: Joi.array().items(Joi.string().max(30)).max(30).optional(),
    status: Joi.string().valid('published', 'draft', 'private', 'unlisted', 'scheduled').optional(),
    allowComments: Joi.boolean().optional(),
    ageRestricted: Joi.boolean().optional(),
    publishAt: Joi.date().iso().greater('now').optional(),
    chapters: Joi.array().items(Joi.object({
      title: Joi.string().max(100).required(),
      startTime: Joi.number().min(0).required(),
    })).optional(),
  }),
};

export const commentSchema = {
  body: Joi.object({
    text: Joi.string().max(10000).required(),
    parentId: Joi.string().hex().length(24).optional(),
  }),
};

export const playlistSchema = {
  body: Joi.object({
    name: Joi.string().max(150).required(),
    description: Joi.string().max(5000).allow('').optional(),
    visibility: Joi.string().valid('public', 'private', 'unlisted').optional(),
  }),
};

export const communityPostSchema = {
  body: Joi.object({
    text: Joi.string().max(5000).optional(),
    type: Joi.string().valid('text', 'image', 'poll').optional(),
    poll: Joi.object({
      question: Joi.string().max(300).required(),
      options: Joi.array().items(Joi.object({
        text: Joi.string().max(100).required(),
      })).min(2).max(5).required(),
      endsAt: Joi.date().iso().greater('now').optional(),
    }).optional(),
  }),
};

export const reportSchema = {
  body: Joi.object({
    targetId: Joi.string().hex().length(24).required(),
    targetType: Joi.string().valid('video', 'comment', 'user', 'live', 'post').required(),
    reason: Joi.string().valid(
      'spam', 'harassment', 'hate_speech', 'violence', 'nudity',
      'misinformation', 'copyright', 'other'
    ).required(),
    description: Joi.string().max(2000).allow('').optional(),
  }),
};

export const watchPartySchema = {
  body: Joi.object({
    videoId: Joi.string().hex().length(24).required(),
    title: Joi.string().max(100).optional(),
    maxParticipants: Joi.number().min(2).max(100).optional(),
    chatEnabled: Joi.boolean().optional(),
    isPublic: Joi.boolean().optional(),
  }),
};

export const liveStreamSchema = {
  body: Joi.object({
    title: Joi.string().max(100).required(),
    description: Joi.string().max(5000).allow('').optional(),
    category: Joi.string().valid(
      'music', 'gaming', 'education', 'entertainment', 'sports',
      'news', 'technology', 'cooking', 'travel', 'other'
    ).optional(),
    chatEnabled: Joi.boolean().optional(),
    dvrEnabled: Joi.boolean().optional(),
    tags: Joi.array().items(Joi.string().max(30)).max(15).optional(),
  }),
};

export const searchSchema = {
  query: Joi.object({
    q: Joi.string().max(200).required(),
    type: Joi.string().valid('video', 'channel', 'playlist', 'all').allow('').default('all'),
    category: Joi.string().optional().allow(''),
    sort: Joi.string().valid('relevance', 'date', 'views', 'rating').allow('').default('relevance'),
    duration: Joi.string().valid('short', 'medium', 'long').allow('').optional(),
    uploadDate: Joi.string().valid('hour', 'day', 'week', 'month', 'year').allow('').optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
  }),
};

export const paginationSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    sort: Joi.string().optional(),
  }),
};

export const idParamSchema = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};
