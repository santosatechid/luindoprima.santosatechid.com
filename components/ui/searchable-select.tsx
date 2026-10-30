"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/shadcn/utils";

export type SearchableOption = {
  value: string;
  label: string;
  hint?: string;
};

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Pilih…",
  searchPlaceholder = "Cari…",
  emptyText = "Tidak ditemukan.",
  className,
  contentClassName,
  disabled,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  contentClassName?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "flex h-11 w-full items-center justify-between gap-2 rounded-2xl border border-border bg-foreground/5 px-4 py-2.5 text-sm whitespace-nowrap transition-[color,background-color,border-color,box-shadow] outline-none",
            "focus-visible:border-interactive-border focus-visible:bg-interactive-surface focus-visible:ring-[3px] focus-visible:ring-interactive-fill/25",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="line-clamp-1 flex-1 text-left">
            {selected?.label ?? placeholder}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn(
          "w-[var(--radix-popover-trigger-width)] min-w-[240px] overflow-hidden rounded-2xl p-0",
          contentClassName,
        )}
      >
        <Command>
          <CommandInput autoFocus placeholder={searchPlaceholder} />
          <CommandList className="max-h-64">
            <CommandEmpty>{emptyText}</CommandEmpty>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={`${option.label} ${option.value} ${option.hint ?? ""}`}
                onSelect={() => {
                  onValueChange(option.value);
                  setOpen(false);
                }}
                className="mx-1 cursor-pointer px-2.5 py-2"
              >
                <Check
                  className={cn(
                    "size-3.5 shrink-0",
                    value === option.value ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs">{option.label}</span>
                  {option.hint ? (
                    <span className="text-muted-foreground block truncate text-[10.5px]">
                      {option.hint}
                    </span>
                  ) : null}
                </span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
