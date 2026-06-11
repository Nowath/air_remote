"use client";

import { useId, useState } from "react";
import { FiClock as ClockIcon } from "react-icons/fi";
import { format } from "date-fns";

import { cn } from "@/shared/lib";
import { Button } from "./button";
import { Field, FieldDescription, FieldLabel } from "./field";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { ScrollArea, ScrollBar } from "./scroll-area";

type TimePickerProps = {
  /** Controlled value. Omit to use the component's internal state. */
  value?: Date;
  onChange?: (date: Date) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
};

export function TimePicker({
  value,
  onChange,
  label,
  description,
  disabled,
}: TimePickerProps) {
  const id = useId();
  const [internalDate, setInternalDate] = useState<Date | undefined>();
  const date = value ?? internalDate;

  function updateDate(next: Date) {
    if (value === undefined) {
      setInternalDate(next);
    }
    onChange?.(next);
  }

  function handleTimeChange(type: "hour" | "minute", amount: string) {
    const newDate = new Date(date ?? new Date());

    if (type === "hour") {
      newDate.setHours(parseInt(amount, 10));
    } else if (type === "minute") {
      newDate.setMinutes(parseInt(amount, 10));
    }

    updateDate(newDate);
  }

  return (
    <Field className="flex flex-col">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              id={id}
              variant="outline"
              disabled={disabled}
              className={cn(
                "w-full pl-3 text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              {date ? format(date, "HH:mm") : <span>HH:mm</span>}
              <ClockIcon data-icon="inline-end" className="ml-auto opacity-50" />
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0">
          <div className="flex flex-col divide-y sm:h-70 sm:flex-row sm:divide-x sm:divide-y-0">
            <ScrollArea className="w-64 sm:w-auto">
              <div className="flex p-2 sm:flex-col">
                {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                  <Button
                    key={hour}
                    size="icon"
                    variant={
                      date && date.getHours() === hour ? "default" : "ghost"
                    }
                    className="aspect-square shrink-0 sm:w-full"
                    onClick={() => handleTimeChange("hour", hour.toString())}
                  >
                    {hour.toString().padStart(2, "0")}
                  </Button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" className="sm:hidden" />
            </ScrollArea>
            <ScrollArea className="w-64 sm:w-auto">
              <div className="flex p-2 sm:flex-col">
                {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
                  <Button
                    key={minute}
                    size="icon"
                    variant={
                      date && date.getMinutes() === minute ? "default" : "ghost"
                    }
                    className="aspect-square shrink-0 sm:w-full"
                    onClick={() => handleTimeChange("minute", minute.toString())}
                  >
                    {minute.toString().padStart(2, "0")}
                  </Button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" className="sm:hidden" />
            </ScrollArea>
          </div>
        </PopoverContent>
      </Popover>
      <FieldDescription>{description}</FieldDescription>
    </Field>
  );
}
