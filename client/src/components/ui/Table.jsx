import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";
import { Skeleton } from "./Display";
import Button from "./Button";
import { formatNumber } from "../../utils/format";
import useMediaQuery from "../../hooks/useMediaQuery";

export function DataTable({ columns, rows, loading, onRowClick, sort, onSort, empty, skeletonRows = 6, rowKey = (row) => row._id, getRowStyle, mobileRender }) {
  const isMobile = useMediaQuery("(max-width: 640px)");
  const toggleSort = (key) => {
    if (!onSort) return;
    if (sort === key) onSort(`-${key}`);
    else if (sort === `-${key}`) onSort("");
    else onSort(key);
  };

  const sortIcon = (key) => {
    if (sort === key) return <ArrowUp />;
    if (sort === `-${key}`) return <ArrowDown />;
    return <ChevronsUpDown style={{ opacity: 0.5 }} />;
  };

  if (!loading && rows.length === 0 && empty) return empty;

  if (isMobile && mobileRender) {
    return (
      <ul className="mobile-list">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <li key={`s-${i}`} className="mobile-list__item" style={{ display: "grid", gap: 8 }}>
                <Skeleton width="55%" />
                <Skeleton width="35%" height={10} />
              </li>
            ))
          : rows.map((row) => (
              <li
                key={rowKey(row)}
                className="mobile-list__item"
                onClick={(event) => {
                  if (!onRowClick || event.target.closest("button, a, input, select, [data-stop]")) return;
                  onRowClick(row, event);
                }}
              >
                {mobileRender(row)}
              </li>
            ))}
      </ul>
    );
  }

  return (
    <div className="table-wrap">
      <table className={`table ${onRowClick ? "table--interactive" : ""}`}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={column.align === "right" ? "align-right" : ""} style={{ width: column.width, minWidth: column.minWidth }}>
                {column.sortable && onSort ? (
                  <button type="button" className="table__sort" onClick={() => toggleSort(column.sortKey || column.key)}>
                    {column.header}
                    {sortIcon(column.sortKey || column.key)}
                  </button>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={`s-${i}`}>
                  {columns.map((column, j) => (
                    <td key={column.key}>
                      <Skeleton width={j === 0 ? "70%" : `${40 + ((i + j) % 4) * 12}%`} height={10} />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  style={getRowStyle?.(row)}
                  onClick={(event) => {
                    if (!onRowClick || event.target.closest("button, a, input, select, [data-stop]")) return;
                    onRowClick(row, event);
                  }}
                >
                  {columns.map((column) => (
                    <td key={column.key} className={column.align === "right" ? "align-right" : ""} style={{ maxWidth: column.maxWidth }}>
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ pagination, onPageChange, label = "results" }) {
  if (!pagination) return null;
  const { page, pages, total, limit } = pagination;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="pagination">
      <span className="num">
        {total === 0 ? `No ${label}` : `${formatNumber(from)}–${formatNumber(to)} of ${formatNumber(total)} ${label}`}
      </span>
      <div className="pagination__controls">
        <span className="num" style={{ marginRight: 8 }}>
          Page {page} of {pages}
        </span>
        <Button size="sm" variant="secondary" icon={ChevronLeft} disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page" />
        <Button size="sm" variant="secondary" icon={ChevronRight} disabled={page >= pages} onClick={() => onPageChange(page + 1)} aria-label="Next page" />
      </div>
    </div>
  );
}
