import { useEffect, useState, type SubmitEventHandler } from 'react';
import { LandmarkPicker } from './landmark-picker';
import type { RideFormValues, LandmarkOption } from '../../routes/rider-form.mapper';
import type { RiderCopy } from './rider-copy';

type Endpoints = Pick<RideFormValues, 'from' | 'to'>;
interface RideFormProps {
  values: RideFormValues;
  onChange: (values: RideFormValues) => void;
  queries: Endpoints;
  onSearch: (queries: Endpoints) => void;
  options: { from: readonly LandmarkOption[]; to: readonly LandmarkOption[] };
  onSubmit: SubmitEventHandler<HTMLFormElement>;
  isBusy: boolean;
  passengerOptions: readonly number[];
  error: string | undefined;
  copy: RiderCopy;
}

export function RideForm(props: RideFormProps) {
  const { onSubmit, ...fields } = props;
  const [isReady, setReady] = useState(false);
  // Edits made before hydration can be lost when React takes control of the fields.
  useEffect(() => {
    setReady(true);
  }, []);
  return (
    <form onSubmit={onSubmit}>
      <fieldset className="panel" disabled={!isReady}>
        <RideFields {...fields} />
      </fieldset>
    </form>
  );
}

function RideFields(props: Omit<RideFormProps, 'onSubmit'>) {
  const { values, onChange, queries, onSearch, options, isBusy, error, copy } = props;
  return (
    <>
      {(['from', 'to'] as const).map((id) => (
        <LandmarkPicker
          key={id}
          id={id}
          value={values[id]}
          query={queries[id]}
          options={options[id]}
          copy={copy}
          onChange={(value) => {
            onChange({ ...values, [id]: value });
          }}
          onSearch={(query) => {
            onSearch({ ...queries, [id]: query });
          }}
        />
      ))}
      <PassengerField
        values={values}
        onChange={onChange}
        copy={copy}
        passengerOptions={props.passengerOptions}
      />
      <PickupTime values={values} onChange={onChange} copy={copy} />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="primary" type="submit" disabled={isBusy}>
        {isBusy ? copy.working : copy.quote}
      </button>
    </>
  );
}

function PickupTime({
  values,
  onChange,
  copy,
}: Pick<RideFormProps, 'values' | 'onChange' | 'copy'>) {
  return (
    <fieldset>
      <legend>{copy.when}</legend>
      {(['now', 'later'] as const).map((when) => (
        <label className="radio" key={when}>
          <input
            type="radio"
            name="when"
            checked={values.when === when}
            onChange={() => {
              onChange({ ...values, when });
            }}
          />
          {copy[when]}
        </label>
      ))}
      {values.when === 'later' && (
        <label>
          {copy.date}
          <input
            type="datetime-local"
            required
            value={values.date}
            onChange={(event) => {
              onChange({ ...values, date: event.target.value });
            }}
          />
        </label>
      )}
    </fieldset>
  );
}

function PassengerField({
  values,
  onChange,
  copy,
  passengerOptions,
}: Pick<RideFormProps, 'values' | 'onChange' | 'copy' | 'passengerOptions'>) {
  return (
    <label className="field">
      {copy.passengers}
      <select
        value={values.passengers}
        onChange={(event) => {
          onChange({ ...values, passengers: Number(event.target.value) });
        }}
      >
        {passengerOptions.map((count) => (
          <option key={count}>{count}</option>
        ))}
      </select>
    </label>
  );
}
