"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";

type ContextualMinimum = {
  fieldId: string;
  values: Record<string, number>;
};

type Field = {
  id: string;
  label: string;
  type: "email" | "text" | "date" | "select" | "number";
  required?: boolean;
  hint?: string;
  options?: string[];
  min?: number;
  max?: number;
  contextualMinimum?: ContextualMinimum;
};

type LocalRequestFormProps = {
  fields: Field[];
  submitLabel: string;
  successTitle: string;
  successText: string;
  disclaimer: string;
};

export function LocalRequestForm({ fields, submitLabel, successTitle, successText, disclaimer }: LocalRequestFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (submitted) successHeadingRef.current?.focus();
  }, [submitted]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  function handleFieldChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = event.currentTarget;
    setFieldValues((current) => ({ ...current, [name]: value }));
  }

  function getMinimum(field: Field) {
    if (!field.contextualMinimum) return field.min;
    const sourceValue = fieldValues[field.contextualMinimum.fieldId];
    return field.contextualMinimum.values[sourceValue] ?? field.min;
  }

  function resetDemonstration() {
    setFieldValues({});
    setSubmitted(false);
  }

  if (submitted) {
    return (
      <div className="local-form-success" role="status" tabIndex={-1}>
        <p className="eyebrow">Local showcase state</p>
        <h3 ref={successHeadingRef} tabIndex={-1}>{successTitle}</h3>
        <p>{successText}</p>
        <button type="button" className="text-action" onClick={resetDemonstration}>
          Reset demonstration
        </button>
      </div>
    );
  }

  return (
    <form className="local-request-form" onSubmit={handleSubmit}>
      {fields.map((field) => (
        <label key={field.id} htmlFor={field.id}>
          <span>{field.label}{field.required ? " *" : ""}</span>
          {field.type === "select" ? (
            <select id={field.id} name={field.id} required={field.required} defaultValue="" onChange={handleFieldChange}>
              <option value="" disabled>Select</option>
              {field.options?.map((option) => <option key={option}>{option}</option>)}
            </select>
          ) : (
            <input
              id={field.id}
              name={field.id}
              type={field.type}
              required={field.required}
              min={getMinimum(field)}
              max={field.max}
              autoComplete={field.type === "email" ? "email" : undefined}
              onChange={handleFieldChange}
            />
          )}
          {field.hint ? <small>{field.hint}</small> : null}
        </label>
      ))}
      <button className="primary-action" type="submit">{submitLabel}<span aria-hidden="true">↗</span></button>
      <p className="form-disclaimer">{disclaimer}</p>
    </form>
  );
}
