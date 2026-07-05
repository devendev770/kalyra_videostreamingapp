import React, { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

const InfiniteScroll = ({ fetchNextPage, hasNextPage, isFetchingNextPage, children }) => {
  const observerTarget = useRef(null);

  useEffect(() => {
    const target = observerTarget.current;
    if (!target || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(target);

    return () => {
      observer.unobserve(target);
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div className="flex flex-col gap-6">
      {children}
      {hasNextPage && (
        <div ref={observerTarget} className="py-8 flex justify-center w-full">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      )}
    </div>
  );
};

export default InfiniteScroll;
