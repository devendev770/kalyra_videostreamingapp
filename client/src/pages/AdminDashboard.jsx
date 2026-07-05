import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { adminAPI } from '../api';
import {
  ShieldAlert, Users, Film, AlertTriangle, FileText,
  Loader2, CheckCircle, Ban, ArrowRight, Activity,
  Eye, EyeOff, Copy, Save, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('tickets');

  // Fetch admin stats
  const { data: dashboardRes, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminAPI.getDashboard(),
  });

  // Fetch report tickets
  const { data: reportsRes, isLoading: reportsLoading, refetch: refetchReports } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () => adminAPI.getReports(),
  });

  // Fetch user accounts
  const { data: usersRes, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminAPI.getUsers(),
  });

  // Fetch platform logs
  const { data: logsRes, isLoading: logsLoading } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: () => adminAPI.getAuditLogs(),
  });

  // Fetch system credentials
  const { data: credentialsRes, isLoading: credsLoading, refetch: refetchCreds } = useQuery({
    queryKey: ['admin-credentials'],
    queryFn: () => adminAPI.getCredentials(),
    enabled: activeTab === 'credentials',
  });

  const updateCredsMutation = useMutation({
    mutationFn: (updates) => adminAPI.updateCredentials(updates),
    onSuccess: () => {
      refetchCreds();
      toast.success('System credentials updated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to update system credentials');
    }
  });

  const banMutation = useMutation({
    mutationFn: (id) => adminAPI.toggleBan(id),
    onSuccess: () => {
      refetchUsers();
      toast.success('User status updated');
    },
  });

  const resolveReportMutation = useMutation({
    mutationFn: ({ id, status, reviewNote, actionTaken }) => adminAPI.resolveReport(id, { status, reviewNote, actionTaken }),
    onSuccess: () => {
      refetchReports();
      toast.success('Report ticket resolved');
    },
  });

  const stats = dashboardRes?.data?.stats || {};
  const reports = reportsRes?.data?.reports || [];
  const users = usersRes?.data?.users || [];
  const logs = logsRes?.data?.logs || [];

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {/* Admin Dashboard header banner */}
      <div className="flex justify-between items-center bg-[#1616194d] border border-[#27272a8c] rounded-2xl p-5">
        <div>
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            Admin Operations
          </h1>
          <p className="text-[11px] text-zinc-400 mt-1">Platform moderation panel, user account toggles, and audit logging.</p>
        </div>
      </div>

      {/* Numerical Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: stats.totalUsers || 0, icon: Users },
          { label: 'Total Videos', value: stats.totalVideos || 0, icon: Film },
          { label: 'Pending Tickets', value: stats.pendingReports || 0, icon: AlertTriangle },
          { label: 'Active Broadcasts', value: stats.activeStreams || 0, icon: Activity },
        ].map((card, idx) => (
          <div key={idx} className="bg-[#1616194d] border border-border/60 rounded-2xl p-4 flex flex-col gap-1.5 relative overflow-hidden">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{card.label}</span>
            <span className="text-xl font-bold text-white">{card.value}</span>
            <card.icon className="absolute right-4 bottom-4 w-10 h-10 text-primary/10 pointer-events-none" />
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#27272a8c] gap-4">
        {[
          { id: 'tickets', label: 'Report Tickets' },
          { id: 'users', label: 'User Accounts' },
          { id: 'logs', label: 'Audit Logs' },
          { id: 'credentials', label: 'System Config' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'border-red-500 text-red-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report tickets panel */}
      {activeTab === 'tickets' && (
        <div className="bg-[#16161933] border border-[#27272a66] rounded-2xl p-5">
          <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4">
            Pending Report Tickets
          </h3>

          {reportsLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 bg-[#1616191a] border border-dashed border-border rounded-2xl">
              <span className="text-xs text-zinc-400">No pending tickets online. Good job!</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {reports.map((ticket) => (
                <div key={ticket._id} className="bg-[#09090b66] border border-border/60 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start flex-wrap gap-2 text-xs">
                    <div className="flex flex-col">
                      <span className="font-bold text-white">Reason: {ticket.reason}</span>
                      <span className="text-[10px] text-zinc-400 mt-0.5">Target Type: {ticket.targetType} • Target ID: {ticket.targetId}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500">{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</span>
                  </div>
                  <p className="text-xs text-zinc-400 bg-surface/50 border border-[#27272a66] rounded-lg p-3 leading-relaxed">
                    {ticket.description || 'No descriptive comments provided.'}
                  </p>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => resolveReportMutation.mutate({ id: ticket._id, status: 'resolved', reviewNote: 'Action approved', actionTaken: 'dismissed' })}
                      className="px-3.5 py-1.5 bg-surface-hover text-zinc-400 hover:text-white rounded-lg text-[10px] font-bold"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => resolveReportMutation.mutate({ id: ticket._id, status: 'resolved', reviewNote: 'Action approved', actionTaken: 'removed' })}
                      className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-bold"
                    >
                      Take Action
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* User list accounts panel */}
      {activeTab === 'users' && (
        <div className="bg-[#16161933] border border-[#27272a66] rounded-2xl p-5">
          <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4">
            User Account Moderations
          </h3>

          {usersLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {users.map((acc) => (
                <div key={acc._id} className="flex justify-between items-center bg-[#09090b59] border border-[#27272a66] rounded-xl p-3.5">
                  <div className="flex flex-col">
                    <span className="font-bold text-xs text-white">{acc.displayName || acc.username}</span>
                    <span className="text-[10px] text-zinc-400 mt-0.5">@{acc.username} • Role: {acc.role}</span>
                  </div>
                  <button
                    onClick={() => banMutation.mutate(acc._id)}
                    className={`flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      acc.isActive
                        ? 'bg-red-950/20 text-red-400 border border-red-500/20 hover:bg-red-950/40'
                        : 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-950/40'
                    }`}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    {acc.isActive ? 'Suspend' : 'Unsuspend'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Platform Audit Logs panel */}
      {activeTab === 'logs' && (
        <div className="bg-[#16161933] border border-[#27272a66] rounded-2xl p-5">
          <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4">
            Security Audit Logs
          </h3>

          {logsLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 max-h-96 overflow-y-auto">
              {logs.map((log) => (
                <div key={log._id} className="flex justify-between items-center bg-surface/20 border-b border-border/30 py-2.5 px-2 text-[10px] font-mono text-zinc-400">
                  <span>Action: {log.action} • Triggered by: @{log.userId?.username || 'system'}</span>
                  <span className="text-zinc-500">{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* System Config Credentials panel */}
      {activeTab === 'credentials' && (
        <CredentialsTab
          credentialsRes={credentialsRes}
          isLoading={credsLoading}
          onSave={(updates) => updateCredsMutation.mutate(updates)}
          isSaving={updateCredsMutation.isLoading}
        />
      )}
    </div>
  );
};

const CredentialsTab = ({ credentialsRes, isLoading, onSave, isSaving }) => {
  const [form, setForm] = useState({});
  const [showSensitive, setShowSensitive] = useState({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (credentialsRes?.data?.credentials) {
      setForm(credentialsRes.data.credentials);
    }
  }, [credentialsRes]);

  const handleCopy = (key, value) => {
    navigator.clipboard.writeText(value);
    toast.success(`${key} copied to clipboard`);
  };

  const handleToggleShow = (key) => {
    setShowSensitive(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChange = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  if (isLoading) {
    return (
      <div className="py-8 flex justify-center">
        <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
      </div>
    );
  }

  const groups = [
    {
      title: 'General configuration',
      fields: [
        { key: 'ADMIN_EMAIL', label: 'Creator Admin Email', desc: 'Identifies the creator user who automatically receives admin role privileges.' },
        { key: 'CLIENT_URL', label: 'Client Application URL', desc: 'Used for CORS and redirect origins.' },
        { key: 'PORT', label: 'Backend Server Port', desc: 'The local port the backend express server runs on.' },
        { key: 'NODE_ENV', label: 'Environment Mode', desc: 'e.g. development, production, test.' }
      ]
    },
    {
      title: 'Database & Cache Config',
      fields: [
        { key: 'MONGODB_URI', label: 'MongoDB Connection URI', desc: 'Secure connection string to MongoDB Cluster.', isSensitive: true },
        { key: 'REDIS_HOST', label: 'Redis Server Host', desc: 'Hostname for caching and queue management.' },
        { key: 'REDIS_PORT', label: 'Redis Server Port', desc: 'Connection port for Redis service.' },
        { key: 'REDIS_PASSWORD', label: 'Redis Password', desc: 'Authentication secret for Redis connection.', isSensitive: true },
        { key: 'REDIS_TLS', label: 'Redis TLS Enabled', desc: 'Whether TLS/SSL is required for cache connection.' }
      ]
    },
    {
      title: 'Security & Token Keys',
      fields: [
        { key: 'JWT_ACCESS_SECRET', label: 'JWT Access Token Secret', desc: 'Cryptographic signature key for short-lived sessions.', isSensitive: true },
        { key: 'JWT_REFRESH_SECRET', label: 'JWT Refresh Token Secret', desc: 'Cryptographic signature key for long-lived sessions.', isSensitive: true },
        { key: 'JWT_ACCESS_EXPIRY', label: 'Access Expiry Duration', desc: 'e.g. 15m' },
        { key: 'JWT_REFRESH_EXPIRY', label: 'Refresh Expiry Duration', desc: 'e.g. 7d' }
      ]
    },
    {
      title: 'Cloudinary Asset Storage',
      fields: [
        { key: 'CLOUDINARY_CLOUD_NAME', label: 'Cloudinary Cloud Name', desc: 'Identifier for your Cloudinary media account.' },
        { key: 'CLOUDINARY_API_KEY', label: 'Cloudinary API Key', desc: 'Access key identifier for Cloudinary integrations.' },
        { key: 'CLOUDINARY_API_SECRET', label: 'Cloudinary API Secret', desc: 'Private signing secret for asset uploads.', isSensitive: true }
      ]
    },
    {
      title: 'Backblaze B2 Storage',
      fields: [
        { key: 'B2_ENDPOINT', label: 'S3-Compatible Endpoint', desc: 'Backblaze S3 API URL endpoint.' },
        { key: 'B2_REGION', label: 'Storage Bucket Region', desc: 'Physical storage zone region identifier.' },
        { key: 'B2_KEY_ID', label: 'B2 Key ID / Access ID', desc: 'API identity identifier for Backblaze.' },
        { key: 'B2_APPLICATION_KEY', label: 'B2 Application Key / Secret', desc: 'API authorization secret for file uploads.', isSensitive: true },
        { key: 'B2_BUCKET_NAME', label: 'B2 Bucket Name', desc: 'The storage bucket name where raw videos are uploaded.' },
        { key: 'B2_BUCKET_ID', label: 'B2 Bucket ID', desc: 'Identifier code of the storage bucket.' }
      ]
    },
    {
      title: 'RTMP Live Streaming',
      fields: [
        { key: 'NMS_RTMP_PORT', label: 'RTMP Broadcast Port', desc: 'Port used by OBS Studio or encoder tools to stream RTMP raw video (default 1935).' },
        { key: 'NMS_HTTP_PORT', label: 'NMS HTTP Port', desc: 'Port serving HLS feeds and player playback services (default 8000).' },
        { key: 'FFMPEG_PATH', label: 'FFmpeg Binary Path', desc: 'Absolute path to FFmpeg binary for transcoding. Leave blank to disable transcoding.' }
      ]
    },
    {
      title: 'Google OAuth Integration',
      fields: [
        { key: 'GOOGLE_CLIENT_ID', label: 'Google Client ID', desc: 'OAuth client ID for Google SSO button login.' },
        { key: 'GOOGLE_CLIENT_SECRET', label: 'Google Client Secret', desc: 'OAuth client private secret.', isSensitive: true },
        { key: 'GOOGLE_CALLBACK_URL', label: 'OAuth Callback Endpoint', desc: 'Redirect endpoint for OAuth authorization callback.' }
      ]
    },
    {
      title: 'SMTP Mail Server Settings',
      fields: [
        { key: 'SMTP_HOST', label: 'SMTP Server Host', desc: 'Outgoing email server host (e.g. smtp.gmail.com).' },
        { key: 'SMTP_PORT', label: 'SMTP Server Port', desc: 'Mail server port (e.g. 587 or 465).' },
        { key: 'SMTP_USER', label: 'SMTP Account User', desc: 'Email address of the sender account.' },
        { key: 'SMTP_PASS', label: 'SMTP Auth Password / App Secret', desc: 'Secure app-specific password of the email client.', isSensitive: true },
        { key: 'EMAIL_FROM', label: 'Sender From Header', desc: 'Format: App Name <email@example.com>' }
      ]
    }
  ];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 animate-fadeIn">
      <div className="bg-red-950/20 border border-red-500/20 rounded-2xl p-4 flex gap-3.5">
        <Lock className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1">
          <span className="font-bold text-xs text-red-400">Security warning & instructions</span>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Modifying these parameters updates the active configuration variables in the server's running memory and writes the new settings directly to the <code>.env</code> file on disk. Ensure your entries are formatted properly to prevent database disconnects or auth handshake failures.
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center bg-[#09090b59] border border-[#27272a66] rounded-xl p-3.5 flex-wrap gap-3">
        <input
          type="text"
          placeholder="Filter config keys..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-surface border border-border rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-red-500 w-full sm:w-64"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (credentialsRes?.data?.credentials) {
                setForm(credentialsRes.data.credentials);
                toast.success('Form reset to saved server values');
              }
            }}
            className="px-3.5 py-2 bg-surface-hover hover:bg-surface-hover/80 text-zinc-400 rounded-xl text-xs font-bold transition-all"
          >
            Reset Form
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Configuration
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {groups.map((group, gIdx) => {
          const filteredFields = group.fields.filter(f =>
            f.key.toLowerCase().includes(search.toLowerCase()) ||
            f.label.toLowerCase().includes(search.toLowerCase())
          );

          if (filteredFields.length === 0) return null;

          return (
            <div key={gIdx} className="bg-[#16161933] border border-[#27272a66] rounded-2xl p-5 flex flex-col gap-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest border-b border-[#27272a66] pb-2">
                {group.title}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredFields.map((field) => {
                  const val = form[field.key] || '';
                  const show = !field.isSensitive || showSensitive[field.key];
                  return (
                    <div key={field.key} className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                          {field.label}
                          <span className="text-[10px] text-zinc-500 font-mono">({field.key})</span>
                        </label>
                      </div>
                      <div className="relative flex items-center">
                        <input
                          type={show ? 'text' : 'password'}
                          value={val}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          className="w-full h-10 bg-[#09090b99] border border-border focus:border-red-500 rounded-xl pl-3.5 pr-20 text-xs text-white outline-none"
                        />
                        <div className="absolute right-2 flex items-center gap-1">
                          {field.isSensitive && (
                            <button
                              type="button"
                              onClick={() => handleToggleShow(field.key)}
                              className="p-1.5 hover:bg-surface-hover text-zinc-400 hover:text-white rounded-lg transition-all"
                              title={show ? 'Hide value' : 'Show value'}
                            >
                              {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCopy(field.key, val)}
                            className="p-1.5 hover:bg-surface-hover text-zinc-400 hover:text-white rounded-lg transition-all"
                            title="Copy to clipboard"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <span className="text-[10px] text-zinc-500 leading-normal">{field.desc}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </form>
  );
};

export default AdminDashboard;
