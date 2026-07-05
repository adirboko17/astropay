"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export interface SearchableComboboxOption {
  value: string;
  label: string;
  hint?: string;
}

interface SearchableComboboxProps {
  label: string;
  value: string;
  options: SearchableComboboxOption[];
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  freeText?: boolean;
  onChange: (value: string) => void;
}

export function SearchableCombobox({
  label,
  value,
  options,
  placeholder = "הקלד לחיפוש...",
  disabled = false,
  allowClear = true,
  freeText = false,
  onChange,
}: SearchableComboboxProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) => {
      const haystack = `${option.label} ${option.hint ?? ""}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [options, query]);

  useEffect(() => {
    if (!open) {
      setQuery(selectedOption?.label ?? (freeText ? value : ""));
    }
  }, [open, selectedOption, freeText, value]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function selectOption(option: SearchableComboboxOption | null) {
    if (option) {
      onChange(option.value);
      setQuery(option.label);
    } else if (allowClear) {
      onChange("");
      setQuery("");
    }
    setOpen(false);
  }

  function commitFreeText() {
    if (!freeText) return;
    onChange(query.trim());
    setOpen(false);
  }

  function handleInputChange(nextQuery: string) {
    setQuery(nextQuery);
    setOpen(true);
    setActiveIndex(0);

    if (freeText) {
      onChange(nextQuery);
      return;
    }

    const exactMatch = options.find(
      (option) => option.label.toLowerCase() === nextQuery.trim().toLowerCase(),
    );
    if (exactMatch) {
      onChange(exactMatch.value);
    } else if (allowClear && !nextQuery.trim()) {
      onChange("");
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.min(current + 1, Math.max(filteredOptions.length - 1, 0)));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (freeText) {
        commitFreeText();
        return;
      }
      const option = filteredOptions[activeIndex];
      if (option) selectOption(option);
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
      setQuery(selectedOption?.label ?? (freeText ? value : ""));
    }
  }

  const showDropdown = open && !disabled && (freeText ? false : filteredOptions.length > 0);

  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <div ref={containerRef} className="relative">
        <input
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => handleInputChange(event.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
        />

        {showDropdown ? (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
          >
            {allowClear ? (
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={!value}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectOption(null)}
                  className="flex w-full px-3 py-2 text-start text-sm text-slate-500 transition hover:bg-slate-50"
                >
                  — ללא שיוך —
                </button>
              </li>
            ) : null}
            {filteredOptions.map((option, index) => (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectOption(option)}
                  className={`flex w-full flex-col px-3 py-2 text-start transition ${
                    index === activeIndex || option.value === value
                      ? "bg-blue-50 text-blue-900"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-sm font-medium">{option.label}</span>
                  {option.hint ? (
                    <span className="text-xs text-slate-400">{option.hint}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </label>
  );
}
