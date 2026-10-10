"use client";

// Multi-select shown as toggle chips. `max` caps how many can be picked.
export default function ChipSelect({ label, options, value, onChange, max, required }) {
  const toggle = (optionValue) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else if (!max || value.length < max) {
      onChange([...value, optionValue]);
    }
  };
  const full = max && value.length >= max;

  return (
    <div className="mb20">
      <label className="heading-color ff-heading fw500 mb10 d-block">
        {label}
        {required && <span className="text-danger"> *</span>}
        {max && (
          <span className="fz13 text-muted fw400">
            {" "}
            ({value.length}/{max})
          </span>
        )}
      </label>
      <div className="d-flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              className={`btn btn-sm rounded-pill px-3 ${
                selected ? "btn-dark" : "btn-outline-secondary"
              }`}
              onClick={() => toggle(option.value)}
              disabled={!selected && full}
              aria-pressed={selected}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
