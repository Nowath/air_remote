"use client";

import { useState } from "react";
import { CiCalendar as CalendarIcon } from "react-icons/ci";
import { format } from "date-fns";

import { cn } from "@/shared/lib";
import { Button } from "./button";
import { Calendar } from "./calendar";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "./field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import { ScrollArea, ScrollBar } from "./scroll-area";

type DatePickerProps = {
  /** Controlled value. Omit to use the component's internal state. */
  value?: Date;
  onChange?: (date: Date) => void;
  label?: string;
  description?: string;
};

export function DatePicker({
  value,
  onChange,
  label,
  description,
}: DatePickerProps) {
  const [internalDate, setInternalDate] = useState<Date | undefined>();
  const date = value ?? internalDate;

  function updateDate(next: Date) {
    if (value === undefined) {
      setInternalDate(next);
    }
    onChange?.(next);
  }

  function handleDateSelect(selected: Date | undefined) {
    if (selected) {
      updateDate(selected);
    }
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
      <FieldLabel htmlFor="date-time-picker">{label}</FieldLabel>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              id="date-time-picker"
              variant="outline"
              className={cn(
                "w-full pl-3 text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              {date ? (
                format(date, "MM/dd/yyyy HH:mm")
              ) : (
                <span>MM/DD/YYYY HH:mm</span>
              )}
              <CalendarIcon data-icon="inline-end" className="ml-auto opacity-50" />
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0">
          <div className="sm:flex">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              autoFocus
              className="w-full"
            />
            <div className="flex flex-col divide-y sm:h-70 sm:flex-row sm:divide-x sm:divide-y-0">
              <ScrollArea className="w-64 sm:w-auto">
                <div className="flex p-2 sm:flex-col">
                  {Array.from({ length: 24 }, (_, i) => i)
                    .reverse()
                    .map((hour) => (
                      <Button
                        key={hour}
                        size="icon"
                        variant={
                          date && date.getHours() === hour ? "default" : "ghost"
                        }
                        className="aspect-square shrink-0 sm:w-full"
                        onClick={() => handleTimeChange("hour", hour.toString())}
                      >
                        {hour}
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
                        date && date.getMinutes() === minute
                          ? "default"
                          : "ghost"
                      }
                      className="aspect-square shrink-0 sm:w-full"
                      onClick={() =>
                        handleTimeChange("minute", minute.toString())
                      }
                    >
                      {minute.toString().padStart(2, "0")}
                    </Button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" className="sm:hidden" />
              </ScrollArea>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <FieldDescription>{description}</FieldDescription>
    </Field>
  );
}

export { Calendar };
