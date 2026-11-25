import type { LandmarkOption } from '../../routes/rider-form.mapper';
import type { RiderCopy } from './rider-copy';

interface LandmarkPickerProps {
  id: 'from' | 'to';
  value: string;
  query: string;
  options: readonly LandmarkOption[];
  copy: RiderCopy;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
}

export function LandmarkPicker({
  id,
  value,
  query,
  options,
  copy,
  onChange,
  onSearch,
}: LandmarkPickerProps) {
  return (
    <fieldset>
      <legend>{copy[id]}</legend>
      <input
        type="search"
        aria-label={`${copy[id]} · ${copy.search}`}
        value={query}
        onChange={(event) => {
          onSearch(event.target.value);
        }}
      />
      <select
        aria-label={copy[id]}
        required
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      >
        <option value="">{copy.choose}</option>
        {options.map(({ id: key, label }) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </fieldset>
  );
}
