import React from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'

import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = {
}

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
    getDay,
    locales,
})

const events = [
    {
    title: 'Project',
    start: new Date(2026, 8, 18, 10, 0),
    end: new Date(2026, 8, 18, 11, 30),
    },
]

export function MyCalendar() {
    return (
        <div className="p-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-2xl h-[85vh]">
            <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            culture="it"
            style={{ height: '100%' }}
            />
        </div>
    )
}
