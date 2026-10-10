// Page numbers with "…" gaps, e.g. 1 … 4 5 6 … 20
function pageItems(page, totalPages) {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const items = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) items.push("gap-" + p);
    items.push(p);
  });
  return items;
}

// `noun` is the plural used in the "1 – 10 of 42 …" line, e.g. "talents".
export default function Pagination({ page, pageSize, total, noun, onChange }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  return (
    <div className="mbp_pagination text-center mt30">
      <ul className="page_navigation">
        <li className={`page-item ${page === 1 ? "disabled" : ""}`}>
          <button
            type="button"
            className="page-link"
            onClick={() => onChange(page - 1)}
            disabled={page === 1}
            aria-label="Previous page"
          >
            <span className="fas fa-angle-left" />
          </button>
        </li>
        {pageItems(page, totalPages).map((p) =>
          typeof p === "string" ? (
            <li key={p} className="page-item">
              <span className="page-link">...</span>
            </li>
          ) : (
            <li
              key={p}
              className={`page-item ${p === page ? "active" : ""}`}
              aria-current={p === page ? "page" : undefined}
            >
              <button type="button" className="page-link" onClick={() => onChange(p)}>
                {p}
              </button>
            </li>
          ),
        )}
        <li className={`page-item ${page === totalPages ? "disabled" : ""}`}>
          <button
            type="button"
            className="page-link"
            onClick={() => onChange(page + 1)}
            disabled={page === totalPages}
            aria-label="Next page"
          >
            <span className="fas fa-angle-right" />
          </button>
        </li>
      </ul>
      <p className="mt10 mb-0 text-center">
        {(page - 1) * pageSize + 1} – {Math.min(page * pageSize, total)} of {total} {noun}
      </p>
    </div>
  );
}
