import api from './axios';

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// Users
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  updateAvatar: (formData) => api.put('/users/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateBanner: (formData) => api.put('/users/banner', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getChannel: (id) => api.get(`/users/${id}/channel`),
  getHistory: (params) => api.get('/users/history', { params }),
  clearHistory: () => api.delete('/users/history'),
  toggleWatchLater: (videoId) => api.post(`/users/watch-later/${videoId}`),
  getWatchLater: (params) => api.get('/users/watch-later', { params }),
};

// Videos
export const videoAPI = {
  getFeed: (params) => api.get('/videos/feed', { params }),
  getTrending: (params) => api.get('/videos/trending', { params }),
  getByCategory: (category, params) => api.get(`/videos/category/${category}`, { params }),
  getVideo: (id) => api.get(`/videos/${id}`),
  getStatus: (id) => api.get(`/videos/${id}/status`),
  updateVideo: (id, data) => api.put(`/videos/${id}`, data),
  deleteVideo: (id) => api.delete(`/videos/${id}`),
  toggleLike: (id, type) => api.post(`/videos/${id}/like`, { type }),
  saveProgress: (id, progress) => api.post(`/videos/${id}/progress`, { progress }),
  initUpload: (data) => api.post('/videos/upload/init', data),
  uploadChunk: (formData) => api.post('/videos/upload/chunk', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  completeUpload: (data) => api.post('/videos/upload/complete', data),
  uploadDirect: (formData, onProgress) => api.post('/videos/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' }, onUploadProgress: onProgress }),
  importYouTube: (data) => api.post('/videos/import-youtube', data),
};

// Comments
export const commentAPI = {
  getComments: (videoId, params) => api.get(`/comments/video/${videoId}`, { params }),
  getReplies: (commentId, params) => api.get(`/comments/${commentId}/replies`, { params }),
  addComment: (videoId, data) => api.post(`/comments/video/${videoId}`, data),
  updateComment: (id, data) => api.put(`/comments/${id}`, data),
  deleteComment: (id) => api.delete(`/comments/${id}`),
  pinComment: (id) => api.post(`/comments/${id}/pin`),
  heartComment: (id) => api.post(`/comments/${id}/heart`),
  toggleLike: (id, type) => api.post(`/comments/${id}/like`, { type }),
};

// Subscriptions
export const subscriptionAPI = {
  toggle: (channelId) => api.post(`/subscriptions/${channelId}`),
  getAll: (params) => api.get('/subscriptions', { params }),
  getFeed: (params) => api.get('/subscriptions/feed', { params }),
  check: (channelId) => api.get(`/subscriptions/check/${channelId}`),
};

// Playlists
export const playlistAPI = {
  create: (data) => api.post('/playlists', data),
  getMine: () => api.get('/playlists/me'),
  getByUser: (userId) => api.get(`/playlists/user/${userId}`),
  getOne: (id) => api.get(`/playlists/${id}`),
  update: (id, data) => api.put(`/playlists/${id}`, data),
  delete: (id) => api.delete(`/playlists/${id}`),
  addVideo: (id, videoId) => api.post(`/playlists/${id}/videos`, { videoId }),
  removeVideo: (id, videoId) => api.delete(`/playlists/${id}/videos/${videoId}`),
};

// Notifications
export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (ids) => api.put('/notifications/read', { ids }),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// Search
export const searchAPI = {
  search: (params) => api.get('/search', { params }),
  suggestions: (q) => api.get('/search/suggestions', { params: { q } }),
};

// Vibes (Shorts backend)
export const shortAPI = {
  getFeed: (params) => api.get('/shorts/feed', { params }),
  getTrending: () => api.get('/shorts/trending'),
  getOne: (id) => api.get(`/shorts/${id}`),
};

// Live
export const liveAPI = {
  create: (data) => api.post('/live', data),
  getActive: (params) => api.get('/live/active', { params }),
  getOne: (id) => api.get(`/live/${id}`),
  end: (id) => api.post(`/live/${id}/end`),
  getStreamKey: () => api.get('/live/stream-key'),
  getMyStreams: () => api.get('/live/my-streams'),
};

// Watch Party
export const watchPartyAPI = {
  create: (data) => api.post('/watch-party', data),
  join: (roomCode) => api.post(`/watch-party/join/${roomCode}`),
  leave: (roomCode) => api.post(`/watch-party/leave/${roomCode}`),
  end: (roomCode) => api.post(`/watch-party/end/${roomCode}`),
  getPublic: () => api.get('/watch-party/public'),
};

// Community
export const communityAPI = {
  create: (data) => api.post('/community', data),
  getAll: (params) => api.get('/community', { params }),
  getByUser: (userId, params) => api.get(`/community/user/${userId}`, { params }),
  getOne: (id) => api.get(`/community/${id}`),
  delete: (id) => api.delete(`/community/${id}`),
  toggleLike: (id) => api.post(`/community/${id}/like`),
  vote: (id, optionId) => api.post(`/community/${id}/vote`, { optionId }),
};

// Studio
export const studioAPI = {
  getAnalytics: () => api.get('/studio/analytics'),
  getVideos: (params) => api.get('/studio/videos', { params }),
  bulkUpdate: (videoIds, updates) => api.put('/studio/videos/bulk', { videoIds, updates }),
  bulkDelete: (videoIds) => api.delete('/studio/videos/bulk', { data: { videoIds } }),
};

// Admin
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  toggleBan: (id) => api.post(`/admin/users/${id}/ban`),
  changeRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  getVideos: (params) => api.get('/admin/videos', { params }),
  removeVideo: (id) => api.delete(`/admin/videos/${id}`),
  getReports: (params) => api.get('/admin/reports', { params }),
  resolveReport: (id, data) => api.put(`/admin/reports/${id}`, data),
  createReport: (data) => api.post('/admin/reports', data),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  getAnalytics: () => api.get('/admin/analytics'),
  getCredentials: () => api.get('/admin/credentials'),
  updateCredentials: (data) => api.put('/admin/credentials', data),
};

// Spatial Rooms
export const spatialAPI = {
  create: (data) => api.post('/spatial', data),
  getPublic: () => api.get('/spatial/public'),
  getRoom: (roomCode) => api.get(`/spatial/${roomCode}`),
  join: (roomCode) => api.post(`/spatial/join/${roomCode}`),
  leave: (roomCode) => api.post(`/spatial/leave/${roomCode}`),
  end: (roomCode) => api.post(`/spatial/end/${roomCode}`),
};

// Dreamscape Canvas
export const dreamscapeAPI = {
  getCanvas: (roomId) => api.get(`/dreamscape/room/${roomId}`),
  getCanvasById: (id) => api.get(`/dreamscape/${id}`),
  addAsset: (roomId, data) => api.post(`/dreamscape/room/${roomId}/asset`, data),
  getInk: (roomId) => api.get(`/dreamscape/room/${roomId}/ink`),
};

