// Infinite loading for "All products": loads the next batch when this block comes near the screen,
// and is also a real "Load more products" button, so keyboard and screen-reader users (who don't
// "scroll to the bottom") can load more too.
import { useEffect, useRef } from "react";

type LoadMoreProps = {
  loaded: number;
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  isError: boolean;
  onLoadMore: () => void;
};

/** Start loading this far before the block is on screen, so the next batch is usually ready. */
const PRELOAD_DISTANCE = "800px";

export function LoadMore({
  loaded,
  total,
  hasMore,
  isLoading,
  isError,
  onLoadMore,
}: LoadMoreProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  // The latest callback, read by the observer without re-creating it on every render.
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  // Load automatically when the block comes within PRELOAD_DISTANCE of the screen.
  // Re-created after each batch (`loaded` changes): a new observer reports the CURRENT position
  // straight away, so if the block is still on screen (a tall window), the next batch loads too.
  // Paused while loading, after an error (no retry loop: the shopper chooses Try again) and at the end.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || isLoading || isError) return;
    if (typeof IntersectionObserver === "undefined") return; // old browsers: the button still works
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMoreRef.current();
      },
      { rootMargin: `${PRELOAD_DISTANCE} 0px` },
    );
    observer.observe(sentinel);
    return () => observer.disconnect(); // cleanup: stop watching when the page closes or reloads
  }, [loaded, hasMore, isLoading, isError]);

  const handleClick = () => {
    // Not `disabled` while loading: a disabled button loses keyboard focus. Ignore the click instead.
    if (!isLoading) onLoadMore();
  };

  return (
    <div ref={sentinelRef} className="load-more">
      {/* role="status": screen readers hear "Showing 48 of 5000 products" after each batch. */}
      <p className="load-more__count" role="status">
        Showing {loaded} of {total} products
      </p>
      {total > 0 && (
        <div className="load-more__bar" aria-hidden="true">
          <span style={{ width: `${Math.min(100, (loaded / total) * 100)}%` }} />
        </div>
      )}
      {isError && (
        <p className="load-more__error" role="alert">
          We couldn't load more products. Check your connection and try again.
        </p>
      )}
      {hasMore ? (
        <button
          type="button"
          className="button button--secondary"
          onClick={handleClick}
          aria-busy={isLoading}
        >
          {isError ? "Try again" : isLoading ? "Loading more…" : "Load more products"}
        </button>
      ) : (
        <p className="load-more__end">You've seen every product.</p>
      )}
    </div>
  );
}
