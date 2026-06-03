"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

interface DateTimePickerProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
}

export function DateTimePicker({ value, onChange, placeholder = "Pick a date and time" }: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(value ? new Date(value) : undefined)
  const [selectedTime, setSelectedTime] = React.useState(value ? format(new Date(value), "HH:mm") : "")

  const displayDate = value ? new Date(value) : selectedDate
  const displayTime = value ? format(new Date(value), "HH:mm") : selectedTime

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !displayDate && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayDate ? (
            format(displayDate, "PPP") + (displayTime ? ` at ${displayTime}` : "")
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={5}>
        <Calendar
          mode="single"
          selected={displayDate}
          onSelect={(d) => {
            if (d) {
              setSelectedDate(d)
              const t = selectedTime || "12:00"
              const [hours, minutes] = t.split(':')
              const newDate = new Date(d)
              newDate.setHours(parseInt(hours), parseInt(minutes))
              onChange(newDate.toISOString())
            }
          }}
          initialFocus
        />
        <div className="p-3 border-t space-y-3">
          <label className="text-sm font-medium">Time</label>
          <Input
            type="time"
            value={displayTime}
            onChange={(e) => {
              setSelectedTime(e.target.value)
              const d = displayDate || new Date()
              const [hours, minutes] = e.target.value.split(':')
              const newDate = new Date(d)
              newDate.setHours(parseInt(hours), parseInt(minutes))
              onChange(newDate.toISOString())
            }}
            className="w-full"
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}