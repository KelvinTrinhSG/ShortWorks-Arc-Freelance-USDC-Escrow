// Filter bar pieces shared by the talent and project directories.

// A filter button that opens a checkbox / radio list (Bootstrap dropdown).
export function FilterDropdown({ label, count, children }) {
  return (
    <li className="list-inline-item position-relative mb10">
      <button
        className={`open-btn dropdown-toggle ${count ? "fw600" : ""}`}
        type="button"
        data-bs-toggle="dropdown"
        data-bs-auto-close="outside"
      >
        {label}
        {count ? ` (${count})` : ""}
        <i className="fa fa-angle-down ms-2" />
      </button>
      <div className="dropdown-menu dd4 pb10">
        <div className="widget-wrapper pr20">
          <div className="checkbox-style1">{children}</div>
        </div>
      </div>
    </li>
  );
}

export function FilterCheck({ label, checked, onChange, type = "checkbox" }) {
  return (
    <label className="custom_checkbox">
      {label}
      <input type={type} checked={checked} onChange={onChange} />
      <span className="checkmark" />
    </label>
  );
}
