"use client";

import { useRouter } from "next/navigation";

type MonthOption = {
  value: string;
  label: string;
};

type MonthPickerProps = {
  options: MonthOption[];
  selected: string;
  basePath: string;
};

export default function MonthPicker({ options, selected, basePath }: MonthPickerProps) {
  const router = useRouter();

  return (
    <select
      value={selected}
      onChange={(event) => {
        router.push(`${basePath}/${event.target.value}`);
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
