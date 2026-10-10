"use client";
import SelectInput from "../option/SelectInput";

// SelectInput takes {option, value} pairs and treats a null value as "nothing
// picked", so options are keyed by index here. That lets real values be
// numbers or null (e.g. "Unlimited" revisions).
export default function Select({
  label,
  options,
  value,
  onChange,
  required,
  placeholder = "Select",
}) {
  const index = options.findIndex((o) => o.value === value);
  const data = options.map((o, i) => ({ option: o.label, value: i }));

  return (
    <SelectInput
      label={
        <>
          {label}
          {required && <span className="text-danger"> *</span>}
        </>
      }
      defaultSelect={
        index === -1
          ? { option: placeholder, value: null }
          : { option: options[index].label, value: index }
      }
      data={data}
      handler={(_, i) => onChange(options[i].value)}
    />
  );
}
