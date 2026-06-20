import React from 'react';
import './DataTable.css';

/**
 * Generic data table. Readability prioritized over any glass effect —
 * background is solid/opaque by design, not translucent.
 *
 * Props:
 * - columns: Array<{ key: string, header: string, align?: 'left'|'right'|'center', render?: (row) => ReactNode }>
 * - data: Array<object> — rows; each row should contain the keys referenced in columns
 * - rowKey: string | (row) => string|number — field name or function to derive a unique row key (default 'id')
 * - emptyMessage: string shown when data is empty (default 'No records found')
 * - onRowClick: optional (row) => void
 */
export default function DataTable({
  columns = [],
  data = [],
  rowKey = 'id',
  emptyMessage = 'No records found',
  onRowClick = null,
}) {
  const getKey = (row, index) =>
    typeof rowKey === 'function' ? rowKey(row) : row[rowKey] ?? index;

  return (
    <div className="ui-datatable-wrapper">
      <table className="ui-datatable">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`ui-datatable__th ui-datatable__th--${col.align || 'left'}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td className="ui-datatable__empty" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={getKey(row, index)}
                className={onRowClick ? 'ui-datatable__row--clickable' : ''}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`ui-datatable__td ui-datatable__td--${col.align || 'left'}`}
                  >
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}