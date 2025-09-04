import { useRef, useEffect, useCallback, useState } from 'react';

interface UseInfiniteScrollOptions {
  enabled?: boolean;
  threshold?: number;
  onLoadMore: () => Promise<void>;
  rootMargin?: string;
}

interface UseInfiniteScrollReturn {
  loadMoreRef: React.RefObject<HTMLDivElement>;
  isLoadingMore: boolean;
}

export function useInfiniteScroll({
  enabled = true,
  threshold = 0.9,
  onLoadMore,
  rootMargin = '100px',
}: UseInfiniteScrollOptions): UseInfiniteScrollReturn {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleIntersection = useCallback(
    async (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      
      if (target.isIntersecting && enabled && !isLoadingMore) {
        setIsLoadingMore(true);
        try {
          await onLoadMore();
        } catch (error) {
          console.error('Error loading more items:', error);
        } finally {
          setIsLoadingMore(false);
        }
      }
    },
    [enabled, isLoadingMore, onLoadMore]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    
    if (!element || !enabled) {
      return;
    }

    // Disconnect any existing observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin,
      threshold,
    });

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [enabled, handleIntersection, rootMargin, threshold]);

  return {
    loadMoreRef,
    isLoadingMore,
  };
}