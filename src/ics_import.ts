import { dialog, ipcMain } from 'electron'
import { readFile } from 'node:fs/promises'
import { basename, extname } from 'node:path'
import ICAL from 'ical.js'

interface IcsEvent {
    name: string;
    start: string;
    end: string;
    place: string | null;
}

interface IcsFile {
    name: string;
    events: IcsEvent[];
}

interface IcsImportResult {
    canceled: boolean;
    files: IcsFile[];
    error?: string;
}

const MAX_OCCURRENCES = 500;
const MAX_ITERATIONS = 20000;
const WINDOW_MONTHS = 12;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function buildEvent(name: string, place: string, start: Date, end: Date, isAllDay: boolean): IcsEvent | null {
    if (Number.isNaN(start.getTime())) return null;
    const safeEnd = end > start ? end : new Date(start.getTime() + (isAllDay ? DAY_MS : HOUR_MS));
    return {
        name,
        start: start.toISOString(),
        end: safeEnd.toISOString(),
        place: place || null,
    };
}

function expandEvent(event: ICAL.Event, windowStart: Date, windowEnd: Date): IcsEvent[] {
    const name = (event.summary || '').trim() || 'Untitled';
    const place = (event.location || '').trim();
    const isAllDay = event.startDate.isDate;

    if (!event.isRecurring()) {
        const single = buildEvent(name, place, event.startDate.toJSDate(), event.endDate.toJSDate(), isAllDay);
        return single ? [single] : [];
    }

    const results: IcsEvent[] = [];
    const iterator = event.iterator();
    let occurrence = iterator.next();
    let guard = 0;

    while (occurrence && guard < MAX_ITERATIONS && results.length < MAX_OCCURRENCES) {
        guard++;
        const details = event.getOccurrenceDetails(occurrence);
        const start = details.startDate.toJSDate();
        if (start > windowEnd) break;

        if (start >= windowStart) {
            const item = buildEvent(
                (details.item.summary || name).trim(),
                (details.item.location || place).trim(),
                start,
                details.endDate.toJSDate(),
                isAllDay
            );
            if (item) results.push(item);
        }
        occurrence = iterator.next();
    }

    return results;
}

function parseIcs(content: string, windowStart: Date, windowEnd: Date): IcsEvent[] {
    ICAL.TimezoneService.reset();

    const root = new ICAL.Component(ICAL.parse(content));
    for (const timezone of root.getAllSubcomponents('vtimezone')) {
        ICAL.TimezoneService.register(timezone);
    }

    const events = root.getAllSubcomponents('vevent').map((component) => new ICAL.Event(component));

    const masters = new Map<string, ICAL.Event>();
    for (const event of events) {
        if (!event.isRecurrenceException()) masters.set(event.uid, event);
    }

    const toExpand: ICAL.Event[] = [];
    for (const event of events) {
        if (!event.isRecurrenceException()) {
            toExpand.push(event);
            continue;
        }
        const master = masters.get(event.uid);
        if (master) master.relateException(event);
        else toExpand.push(event);
    }

    return toExpand.flatMap((event) => expandEvent(event, windowStart, windowEnd));
}

export function registerIcsImport(): void {
    ipcMain.handle('import-ics', async (): Promise<IcsImportResult> => {
        const selection = await dialog.showOpenDialog({
            title: 'Import calendar',
            properties: ['openFile', 'multiSelections'],
            filters: [{ name: 'iCalendar', extensions: ['ics'] }],
        });

        if (selection.canceled || selection.filePaths.length === 0) {
            return { canceled: true, files: [] };
        }

        try {
            const windowStart = new Date();
            windowStart.setMonth(windowStart.getMonth() - WINDOW_MONTHS);
            const windowEnd = new Date();
            windowEnd.setMonth(windowEnd.getMonth() + WINDOW_MONTHS);

            const files: IcsFile[] = [];
            for (const filePath of selection.filePaths) {
                const content = await readFile(filePath, 'utf-8');
                files.push({
                    name: basename(filePath, extname(filePath)),
                    events: parseIcs(content, windowStart, windowEnd),
                });
            }
            return { canceled: false, files };
        } catch (error) {
            return {
                canceled: false,
                files: [],
                error: error instanceof Error ? error.message : String(error),
            };
        }
    });
}
