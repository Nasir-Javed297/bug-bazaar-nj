// Performance fix #2 (task D4-2, docs/performance.md): for very long lists ("All products",
// up to 5,000 items, loaded 24 at a time by infinite loading) only the rows near the screen are
// rendered: ~5 rows instead of 1,250. Rows are swapped in and out while scrolling ("virtualization").
//
// Layout matches the normal grid: as many columns as fit at >= 220px with 20px gaps.
// Accessibility: off-screen items are not in the page, so each item says its position
// (aria-posinset / aria-setsize): a screen reader announces "item 37 of 5000".
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useLayoutEffect, useRef, useState } from "react";
import type { Product } from "../types/api";
import { ProductCard } from "./ProductCard";

const MIN_COLUMN_WIDTH = 220;
const GAP = 20;
/** First guess for a row's height; real heights are measured as rows render. */
const ESTIMATED_ROW_HEIGHT = 340 + GAP;
/** Extra rows rendered above and below the screen, so fast scrolling doesn't show blank space. */
const OVERSCAN_ROWS = 3;

type VirtualProductGridProps = {
  products: Product[];
  /**
   * How many products exist in total. With infinite loading only some are loaded yet, but a
   * screen reader should still hear "item 37 of 5000", not "of 48". Defaults to products.length.
   */
  total?: number;
};

export function VirtualProductGrid({ products, total = products.length }: VirtualProductGridProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);
  // Distance from the top of the page to the list: the virtualizer works in page coordinates.
  const [listTop, setListTop] = useState(0);

  // Measure width (-> column count) and position, before paint and whenever the size changes.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const width = list.clientWidth;
      setColumns(Math.max(1, Math.floor((width + GAP) / (MIN_COLUMN_WIDTH + GAP))));
      setListTop(list.getBoundingClientRect().top + window.scrollY);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, []);

  const rowCount = Math.ceil(products.length / columns);
  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    // Real row heights, measured as rows render. If a row measures 0 (no layout: inside a hidden
    // container, or in tests), keep the estimate: with 0-height rows "everything fits on screen",
    // the virtualizer renders more rows, measures 0 again... an infinite update loop (found by a test).
    measureElement: (element) => element.getBoundingClientRect().height || ESTIMATED_ROW_HEIGHT,
    overscan: OVERSCAN_ROWS,
    scrollMargin: listTop,
  });

  return (
    <div
      ref={listRef}
      role="list"
      className="product-grid-virtual"
      // The full height of ALL rows, so the scrollbar is right even though few rows exist.
      style={{ height: virtualizer.getTotalSize() }}
    >
      {virtualizer.getVirtualItems().map((row) => {
        const firstIndex = row.index * columns;
        return (
          <div
            key={row.key}
            data-index={row.index} // lets measureElement know which row this is
            ref={virtualizer.measureElement}
            className="product-grid-virtual__row"
            style={{
              transform: `translateY(${row.start - virtualizer.options.scrollMargin}px)`,
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {products.slice(firstIndex, firstIndex + columns).map((product, offset) => (
              <div
                key={product.id}
                role="listitem"
                aria-setsize={total}
                aria-posinset={firstIndex + offset + 1}
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
