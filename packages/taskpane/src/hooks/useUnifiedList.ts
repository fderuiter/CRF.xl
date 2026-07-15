/**
 * @issue #335
 */
import { useState, useMemo } from "react";

export interface UseUnifiedListOptions<T> {
  data: T[];
  mode: "paginated" | "capped";
  itemsPerPage?: number;
  previewLimit?: number;
  filterDependencies?: any[];
}

export function useUnifiedList<T>({
  data,
  mode,
  itemsPerPage = 10,
  previewLimit = 3,
  filterDependencies = [],
}: UseUnifiedListOptions<T>) {
  const [page, setPage] = useState(1);

  const [prevDeps, setPrevDeps] = useState(filterDependencies);

  if (
    prevDeps.length !== filterDependencies.length ||
    prevDeps.some((dep, index) => dep !== filterDependencies[index])
  ) {
    setPage(1);
    setPrevDeps(filterDependencies);
  }

  const { items, totalPages, overflowCount, boundedPage } = useMemo(() => {
    if (mode === "capped") {
      const sliced = data.slice(0, previewLimit);
      const overflow = Math.max(0, data.length - previewLimit);
      return {
        items: sliced,
        totalPages: 1,
        overflowCount: overflow,
        boundedPage: 1,
      };
    } else {
      // paginated mode
      const safePageSize = Math.max(1, itemsPerPage);
      const total = Math.max(1, Math.ceil(data.length / safePageSize));
      const current = Math.min(Math.max(1, page), total);

      const start = (current - 1) * safePageSize;
      const sliced = data.slice(start, start + safePageSize);

      return {
        items: sliced,
        totalPages: total,
        overflowCount: 0,
        boundedPage: current,
      };
    }
  }, [data, mode, itemsPerPage, previewLimit, page]);

  return {
    items,
    page: boundedPage,
    totalPages,
    overflowCount,
    setPage,
  };
}
