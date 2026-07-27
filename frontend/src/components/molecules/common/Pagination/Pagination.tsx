import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
}

type PageEntry = number | "ellipsis";

function getPageNumbers(current: number, total: number): PageEntry[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: PageEntry[] = [1];
  if (current > 3) pages.push("ellipsis");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) pages.push(p);

  if (current < total - 2) pages.push("ellipsis");
  pages.push(total);

  return pages;
}

export default function Pagination({ page, pageCount, onPageChange, className }: PaginationProps) {
  if (pageCount <= 1) return null;

  const navButtonClass =
    "flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors " +
    "hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 " +
    "disabled:hover:border-gray-200 disabled:hover:text-gray-500 " +
    "dark:border-gray-700 dark:text-gray-400 dark:disabled:hover:border-gray-700 dark:disabled:hover:text-gray-400";

  return (
    <nav
      className={`flex items-center gap-1 ${className ?? ""}`}
      aria-label="Paginare"
    >
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Pagina anterioara"
        className={navButtonClass}
      >
        <FiChevronLeft aria-hidden="true" />
      </button>

      {getPageNumbers(page, pageCount).map((entry, index) =>
        entry === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            className="flex h-9 w-9 items-center justify-center text-sm text-gray-400 dark:text-gray-500"
          >
            …
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            onClick={() => onPageChange(entry)}
            aria-current={entry === page ? "page" : undefined}
            className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
              entry === page
                ? "bg-brand text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            }`}
          >
            {entry}
          </button>
        ),
      )}

      <button
        type="button"
        disabled={page === pageCount}
        onClick={() => onPageChange(page + 1)}
        aria-label="Pagina urmatoare"
        className={navButtonClass}
      >
        <FiChevronRight aria-hidden="true" />
      </button>
    </nav>
  );
}
