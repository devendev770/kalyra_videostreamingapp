import React from 'react';

export const CardSkeleton = () => {
  return (
    <div className="flex flex-col bg-[#16161933] border border-border/30 rounded-2xl overflow-hidden p-1">
      <div className="aspect-video w-full bg-surface-light/60 shimmer rounded-xl" />
      <div className="p-3.5 flex gap-3">
        <div className="w-9 h-9 rounded-xl bg-surface-light/60 shimmer flex-shrink-0" />
        <div className="flex flex-col flex-1 gap-2">
          <div className="h-4 bg-surface-light/60 shimmer rounded w-11/12" />
          <div className="h-3 bg-surface-light/60 shimmer rounded w-2/3 mt-1" />
          <div className="h-3 bg-surface-light/60 shimmer rounded w-1/2 mt-0.5" />
        </div>
      </div>
    </div>
  );
};

export const VideoGridSkeleton = ({ count = 8 }) => {
  return (
    <div className="video-grid">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
};

export const VideoDetailsSkeleton = () => {
  return (
    <div className="w-full flex flex-col lg:flex-row gap-6">
      <div className="flex-1 min-w-0">
        <div className="aspect-video w-full bg-surface-light/60 shimmer rounded-2xl" />
        <div className="mt-4 flex flex-col gap-3">
          <div className="h-6 bg-surface-light/60 shimmer rounded-md w-3/4" />
          <div className="flex justify-between items-center py-2 border-b border-[#27272a66] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-surface-light/60 shimmer" />
              <div className="flex flex-col gap-1.5">
                <div className="h-3.5 bg-surface-light/60 shimmer rounded w-32" />
                <div className="h-3 bg-surface-light/60 shimmer rounded w-20" />
              </div>
            </div>
            <div className="h-9 bg-surface-light/60 shimmer rounded-xl w-24" />
          </div>
        </div>
      </div>
      <div className="w-full lg:w-96 flex flex-col gap-4">
        <div className="h-6 bg-surface-light/60 shimmer rounded w-1/3" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-2.5">
            <div className="w-32 h-20 bg-surface-light/60 shimmer rounded-lg flex-shrink-0" />
            <div className="flex flex-col gap-1.5 flex-1 py-1">
              <div className="h-3.5 bg-surface-light/60 shimmer rounded w-11/12" />
              <div className="h-3 bg-surface-light/60 shimmer rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
