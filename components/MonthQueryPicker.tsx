"use client";

import { useRouter } from "next/navigation";

type MonthOption = {
  value: string;
  label: string;
};

type MonthQueryPickerProps = {
  options: MonthOption[];
  selected: string;
  path: string;
  queryKey?: string;
};

export default function MonthQueryPicker({
  options,
  selected,
  path,
  queryKey = "month"
}: MonthQueryPickerProps) {
  const router = useRouter();

  return (
    <select
      value={selected}
      onChange={(event) => {
        const value = event.target.value;
        router.push(`${path}?${queryKey}=${value}`);
      }}
      style={{ maxWidth: 240 }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
