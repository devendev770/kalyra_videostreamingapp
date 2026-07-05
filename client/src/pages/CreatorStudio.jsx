import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { studioAPI, videoAPI } from '../api';
import {
  Upload, BarChart3, Film, Settings, AlertCircle,
  Loader2, Trash2, CheckCircle2, Play, Plus, Sliders
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { formatDistanceToNow } from 'date-fns';

const CreatorStudio = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMode, setUploadMode] = useState('file'); // 'file' or 'youtube'
  
  // Video upload form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('gaming');
  const [tags, setTags] = useState('');
  const [isShort, setIsShort] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Fetch dashboard stats
  const { data: analyticsRes, isLoading: statsLoading } = useQuery({
    queryKey: ['studio-analytics'],
    queryFn: () => studioAPI.getAnalytics(),
  });

  // Fetch creator's videos
  const { data: videosRes, isLoading: videosLoading, refetch: refetchVideos } = useQuery({
    queryKey: ['studio-videos'],
    queryFn: () => studioAPI.getVideos(),
  });

  const uploadMutation = useMutation({
    mutationFn: (formData) => videoAPI.uploadDirect(formData, (progressEvent) => {
      const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      setUploadProgress(percent);
    }),
    onSuccess: () => {
      toast.success('Video uploaded! Transcoding starting...');
      setShowUploadModal(false);
      setVideoFile(null);
      setTitle('');
      setDescription('');
      setUploadProgress(0);
      setUploading(false);
      refetchVideos();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Direct upload failed');
      setUploading(false);
      setUploadProgress(0);
    },
  });

  const importYouTubeMutation = useMutation({
    mutationFn: (data) => videoAPI.importYouTube(data),
    onSuccess: () => {
      toast.success('YouTube Video Imported Successfully!');
      setShowUploadModal(false);
      setYoutubeUrl('');
      setTitle('');
      setDescription('');
      refetchVideos();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'YouTube Import failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => videoAPI.deleteVideo(id),
    onSuccess: () => {
      refetchVideos();
      toast.success('Video deleted successfully');
    },
  });

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (uploadMode === 'file') {
      if (!videoFile) return toast.error('Please select a video file');
      
      setUploading(true);
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('isShort', isShort);
      formData.append('tags', JSON.stringify(tags.split(',').map((t) => t.trim())));

      uploadMutation.mutate(formData);
    } else {
      if (!youtubeUrl) return toast.error('Please enter a YouTube video URL');
      importYouTubeMutation.mutate({
        youtubeUrl,
        title: title || undefined,
        description,
        category,
        isShort,
        tags: tags ? tags.split(',').map((t) => t.trim()) : [],
      });
    }
  };

  const analytics = analyticsRes?.data || {};
  const videos = videosRes?.data?.videos || [];

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {/* Studio Header Banner */}
      <div className="flex justify-between items-center bg-[#1616194d] border border-[#27272a8c] rounded-2xl p-5">
        <div>
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-accent" />
            Creator Studio
          </h1>
          <p className="text-[11px] text-zinc-400 mt-1">Manage content, track metrics, and optimize your channel.</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary-hover rounded-xl text-xs font-semibold text-white shadow-lg shadow-primary/20 active:scale-95 transition-all cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          Upload Video
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#27272a8c] gap-4">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          { id: 'content', label: 'My Content', icon: Film },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'border-primary text-accent'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dashboard View */}
      {activeTab === 'dashboard' && (
        <div className="flex flex-col gap-6">
          {/* Key Analytics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Subscribers', value: analytics.subscriberCount || 0 },
              { label: 'Total Views', value: analytics.totalViews || 0 },
              { label: 'Total Likes', value: analytics.totalLikes || 0 },
              { label: 'Total Videos', value: analytics.totalVideos || 0 },
            ].map((card, idx) => (
              <div key={idx} className="bg-[#1616194d] border border-border/60 rounded-2xl p-4 flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{card.label}</span>
                <span className="text-xl font-bold text-white">{card.value}</span>
              </div>
            ))}
          </div>

          {/* Top Videos Analytics Grid */}
          <div className="bg-[#16161933] border border-[#27272a66] rounded-2xl p-5">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4">
              Top Performing Videos
            </h3>
            <div className="flex flex-col gap-3">
              {(analytics.topVideos || []).map((video) => (
                <div key={video._id} className="flex gap-3 justify-between items-center bg-[#09090b59] border border-[#27272a66] rounded-xl p-3">
                  <div className="flex gap-2.5 min-w-0 flex-1">
                    <img src={video.thumbnailUrl} alt="" className="w-16 aspect-video object-cover rounded-lg" />
                    <div className="flex flex-col justify-center min-w-0">
                      <span className="font-bold text-xs text-white truncate">{video.title}</span>
                      <span className="text-[10px] text-zinc-400 mt-1">{video.views} views • {video.likes} likes</span>
                    </div>
                  </div>
                </div>
              ))}
              {(analytics.topVideos || []).length === 0 && (
                <span className="text-xs text-zinc-500 text-center py-4">No content analytics available.</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content View */}
      {activeTab === 'content' && (
        <div className="bg-[#16161933] border border-[#27272a66] rounded-2xl p-5">
          <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4">
            Uploads list
          </h3>
          
          {videosLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-12 bg-[#1616191a] border border-dashed border-border rounded-2xl">
              <span className="text-xs text-zinc-400">No uploads cataloged. Go upload a video!</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {videos.map((vid) => (
                <div key={vid._id} className="flex gap-3 justify-between items-center bg-[#09090b59] border border-[#27272a66] rounded-xl p-3">
                  <div className="flex gap-3 min-w-0 flex-1">
                    <img src={vid.thumbnailUrl} alt="" className="w-20 aspect-video object-cover rounded-lg" />
                    <div className="flex flex-col justify-center min-w-0">
                      <span className="font-bold text-xs text-white truncate">{vid.title}</span>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] font-bold">
                        <span className={`px-2 py-0.5 rounded uppercase tracking-wider text-[8px] ${
                          vid.status === 'published' ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/10' :
                          vid.status === 'processing' ? 'bg-primary-dark/20 text-accent border border-primary/10 animate-pulse' :
                          'bg-red-950/20 text-red-400 border border-red-500/10'
                        }`}>{vid.status}</span>
                        <span className="text-zinc-500">{vid.views} views • {vid.likes} likes</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(vid._id)}
                    className="p-2 hover:bg-red-500/10 hover:text-red-400 text-zinc-500 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload Video Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleUploadSubmit}
            className="w-full max-w-md bg-surface-light border border-border rounded-2xl p-6 shadow-2xl animate-fadeIn flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-sm font-bold text-white uppercase tracking-widest pb-2 border-b border-border">
              Upload New Video
            </h3>

            {/* Upload Mode Selector */}
            <div className="flex bg-[#09090b59] border border-border p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setUploadMode('file')}
                className={`flex-1 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                  uploadMode === 'file' ? 'bg-primary text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('youtube')}
                className={`flex-1 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                  uploadMode === 'youtube' ? 'bg-primary text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Import YouTube
              </button>
            </div>

            {/* Conditional input: File vs YouTube URL */}
            {uploadMode === 'file' ? (
              <div className="flex flex-col gap-1.5 animate-fadeIn">
                <label className="text-xs font-bold text-zinc-400 uppercase">Select Video File *</label>
                <input
                  type="file"
                  accept="video/*"
                  required
                  onChange={(e) => setVideoFile(e.target.files[0])}
                  className="w-full text-xs text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary file:text-white hover:file:bg-primary-hover cursor-pointer"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 animate-fadeIn">
                <label className="text-xs font-bold text-zinc-400 uppercase">YouTube Video URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="w-full h-11 bg-[#09090b99] border border-border focus:border-primary rounded-xl px-4 text-xs text-white outline-none"
                />
              </div>
            )}

            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase">
                Title {uploadMode === 'file' ? '*' : '(Optional)'}
              </label>
              <input
                type="text"
                required={uploadMode === 'file'}
                placeholder={uploadMode === 'file' ? 'My epic stream moment...' : 'Leave blank to auto-fetch from YouTube'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-11 bg-[#09090b99] border border-border focus:border-primary rounded-xl px-4 text-xs text-white outline-none"
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase">Description</label>
              <textarea
                placeholder="Details about the video..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-20 bg-[#09090b99] border border-border focus:border-primary rounded-xl p-4 text-xs text-white outline-none resize-none"
              />
            </div>

            {/* Category & Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-11 bg-[#09090b99] border border-border focus:border-primary rounded-xl px-4 text-xs text-zinc-400 outline-none"
                >
                  <option value="gaming">Gaming</option>
                  <option value="music">Music</option>
                  <option value="education">Education</option>
                  <option value="tech">Tech</option>
                  <option value="sports">Sports</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase">Vibe Format</label>
                <select
                  value={isShort ? 'yes' : 'no'}
                  onChange={(e) => setIsShort(e.target.value === 'yes')}
                  className="w-full h-11 bg-[#09090b99] border border-border focus:border-primary rounded-xl px-4 text-xs text-zinc-400 outline-none"
                >
                  <option value="no">Long Format</option>
                  <option value="yes">{"Vibe (< 1m)"}</option>
                </select>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase">Tags (comma separated)</label>
              <input
                type="text"
                placeholder="gaming, gameplay, epic"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full h-11 bg-[#09090b99] border border-border focus:border-primary rounded-xl px-4 text-xs text-white outline-none"
              />
            </div>

            {/* Upload progress */}
            {uploading && (
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase">
                  <span>Uploading to server</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-surface h-1.5 rounded-full overflow-hidden">
                  <div className="bg-primary h-full transition-all duration-350" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 text-xs mt-2">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2.5 rounded-xl font-semibold bg-surface-hover text-zinc-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading || importYouTubeMutation.isPending}
                className="px-4 py-2.5 rounded-xl font-semibold bg-primary hover:bg-primary-hover text-white flex items-center gap-1.5 cursor-pointer"
              >
                {uploading || importYouTubeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : uploadMode === 'file' ? (
                  'Start Upload'
                ) : (
                  'Import Video'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default CreatorStudio;
