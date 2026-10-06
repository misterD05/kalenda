import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties, FormEvent, ReactNode } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import type { SlotInfo } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { it } from 'date-fns/locale/it'
import 'react-big-calendar/lib/css/react-big-calendar.css'

interface TuskType {
    id: number;
    name: string;
    color: string;
}

interface Tusk {
    id: number;
    name: string;
    start: Date;
    end: Date;
    idType: number | null;
    place: string;
    timeBefore: string | null;
    typeName: string;
    typeColor: string;
}

interface RawTusk {
    id: number;
    name: string;
    start: string | number | Date;
    end: string | number | Date;
    idType?: number | null;
    id_type?: number | null;
    place?: string | null;
    timeBefore?: string | null;
    time_before?: string | null;
    typeName?: string | null;
    type_name?: string | null;
    typeColor?: string | null;
    type_color?: string | null;
}

interface ApiResult {
    success: boolean;
    error?: string;
}

interface TuskPayload {
    name: string;
    start: string;
    end: string;
    place: string | null;
    idType: number | null;
    timeBefore: string | null;
}

interface TuskTypePayload {
    name: string;
    color: string;
}

interface TuskApi {
    getTusks(): Promise<RawTusk[]>;
    getTuskTypes(): Promise<TuskType[]>;
    insertTusk(payload: TuskPayload): Promise<ApiResult>;
    updateTusk(payload: TuskPayload & { id: number }): Promise<ApiResult>;
    deleteTusk(id: number): Promise<ApiResult>;
    insertTuskType(payload: TuskTypePayload): Promise<ApiResult>;
    updateTuskType(payload: TuskTypePayload & { id: number }): Promise<ApiResult>;
    deleteTuskType(id: number): Promise<ApiResult>;
    on(channel: string, callback: (...args: unknown[]) => void): void;
}

declare global {
    interface Window {
        api: TuskApi;
    }
}

interface TaskForm {
    name: string;
    start: string;
    end: string;
    place: string;
    idType: number | '';
}

interface TypeDraft {
    id: number | null;
    name: string;
    color: string;
}

const DEFAULT_EVENT_COLOR = '#3174ad';
const DEFAULT_TYPE_COLOR = '#500aff';
const HOUR_MS = 60 * 60 * 1000;

const locales = { it };

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
    getDay,
    locales,
});

const calendarMessages = {
    today: 'Today',
    previous: 'Back',
    next: 'Next',
    month: 'Month',
    week: 'Week',
    day: 'Day',
    agenda: 'Agenda',
    date: 'Date',
    time: 'Time',
    event: 'Task',
    allDay: 'All day',
    noEventsInRange: 'No tasks in this range',
    showMore: (total: number) => `+${total} more`,
};

const inputClass = 'p-2 rounded-xl bg-(--color-ui-dark-surface) border border-(--color-border-subtle) text-(--color-text-inverted) text-sm';
const labelClass = 'text-xs text-(--color-text-muted)';
const neutralButtonClass = 'px-4 py-2 bg-(--color-action-neutral) hover:bg-(--color-action-neutral-hover) text-(--color-text-inverted) rounded-xl text-sm transition';
const primaryButtonClass = 'px-4 py-2 bg-(--color-brand-primary-fallback) hover:bg-(--color-brand-primary-hover) text-(--color-text-inverted) rounded-xl text-sm transition disabled:opacity-50 disabled:cursor-not-allowed';
const editButtonClass = 'px-4 py-2 bg-(--color-action-edit) hover:bg-(--color-action-edit-hover) text-(--color-text-inverted) rounded-xl text-sm transition disabled:opacity-50 disabled:cursor-not-allowed';

function getContrastColor(hex: string): string {
    const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!match) return '#ffffff';
    const value = parseInt(match[1], 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#111111' : '#ffffff';
}

function toInputValue(date: Date): string {
    return format(date, "yyyy-MM-dd'T'HH:mm");
}

function toTusk(item: RawTusk): Tusk {
    return {
        id: item.id,
        name: item.name,
        start: new Date(item.start),
        end: new Date(item.end),
        idType: item.idType ?? item.id_type ?? null,
        place: item.place ?? '',
        timeBefore: item.timeBefore ?? item.time_before ?? null,
        typeName: item.typeName ?? item.type_name ?? '',
        typeColor: item.typeColor ?? item.type_color ?? DEFAULT_EVENT_COLOR,
    };
}

async function loadEvents(): Promise<Tusk[]> {
    try {
        const rawTusks = await window.api.getTusks();
        return rawTusks.map(toTusk);
    } catch (error) {
        console.error('Error loading tasks:', error);
        return [];
    }
}

async function loadTuskTypes(): Promise<TuskType[]> {
    try {
        return await window.api.getTuskTypes();
    } catch (error) {
        console.error('Error loading task types:', error);
        return [];
    }
}

async function run(action: () => Promise<ApiResult>): Promise<boolean> {
    try {
        const res = await action();
        if (!res.success) {
            alert('Error: ' + (res.error ?? 'Unknown error'));
            return false;
        }
        return true;
    } catch (error) {
        console.error(error);
        alert('Error: ' + (error instanceof Error ? error.message : String(error)));
        return false;
    }
}

interface ModalProps {
    title: string;
    onClose: () => void;
    children: ReactNode;
}

function Modal({ title, onClose, children }: ModalProps) {
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 bg-(--color-background-overlay) flex items-center justify-center z-50 p-4"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className="bg-(--color-background-surface) border border-(--color-border-subtle) rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4"
            >
                <h2 className="text-lg font-semibold text-(--color-text-inverted)">{title}</h2>
                {children}
            </div>
        </div>
    );
}

const eventStyles = `
.rbc-calendar .rbc-event.tusk-event {
    background-color: var(--tusk-bg) !important;
    color: var(--tusk-fg) !important;
    border: 1px solid transparent !important;
    box-shadow: none;
}
.rbc-calendar .rbc-event.tusk-event.tusk-event-selected {
    border: 3px solid var(--color-text-inverted, #ffffff) !important;
}
.rbc-calendar .rbc-event.tusk-event .rbc-event-label,
.rbc-calendar .rbc-event.tusk-event .rbc-event-content {
    color: inherit;
}
`;

const emptyForm: TaskForm = { name: '', start: '', end: '', place: '', idType: '' };
const emptyTypeDraft: TypeDraft = { id: null, name: '', color: DEFAULT_TYPE_COLOR };

export function MyCalendar() {
    const [events, setEvents] = useState<Tusk[]>([]);
    const [tuskTypes, setTuskTypes] = useState<TuskType[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const [modalMode, setModalMode] = useState<'create' | 'modify' | null>(null);
    const [form, setForm] = useState<TaskForm>(emptyForm);
    const [isSaving, setIsSaving] = useState(false);

    const [isTypesModalOpen, setIsTypesModalOpen] = useState(false);
    const [typeDraft, setTypeDraft] = useState<TypeDraft>(emptyTypeDraft);

    const selectedEvent = useMemo(
        () => events.find((event) => event.id === selectedId) ?? null,
        [events, selectedId]
    );

    const displayEvents = useMemo(() => {
        const colorByType = new Map(tuskTypes.map((type) => [type.id, type.color]));
        return events.map((event) => {
            const typeColor =
                (event.idType !== null ? colorByType.get(event.idType) : undefined) ??
                event.typeColor ??
                DEFAULT_EVENT_COLOR;
            return { ...event, typeColor };
        });
    }, [events, tuskTypes]);

    const formTypeColor = useMemo(
        () => tuskTypes.find((type) => type.id === form.idType)?.color ?? null,
        [tuskTypes, form.idType]
    );

    const refreshEvents = useCallback(async () => {
        setEvents(await loadEvents());
    }, []);

    const refreshTypes = useCallback(async () => {
        setTuskTypes(await loadTuskTypes());
    }, []);

    useEffect(() => {
        refreshEvents();
        refreshTypes();
    }, [refreshEvents, refreshTypes]);

    useEffect(() => {
        if (selectedId !== null && !selectedEvent) setSelectedId(null);
    }, [selectedId, selectedEvent]);

    const closeTaskModal = useCallback(() => setModalMode(null), []);

    const closeTypesModal = useCallback(() => {
        setIsTypesModalOpen(false);
        setTypeDraft(emptyTypeDraft);
    }, []);

    function updateForm<K extends keyof TaskForm>(key: K, value: TaskForm[K]) {
        setForm((current) => ({ ...current, [key]: value }));
    }

    function handleOpenCreate(start?: Date, end?: Date) {
        const from = start ?? new Date();
        const to = end ?? new Date(from.getTime() + HOUR_MS);
        setForm({
            name: '',
            start: toInputValue(from),
            end: toInputValue(to),
            place: '',
            idType: tuskTypes.length > 0 ? tuskTypes[0].id : '',
        });
        setModalMode('create');
    }

    function handleOpenModify() {
        if (!selectedEvent) {
            alert('Select a task first');
            return;
        }
        setForm({
            name: selectedEvent.name,
            start: toInputValue(selectedEvent.start),
            end: toInputValue(selectedEvent.end),
            place: selectedEvent.place,
            idType: selectedEvent.idType ?? '',
        });
        setModalMode('modify');
    }

    async function handleSave(e: FormEvent) {
        e.preventDefault();
        if (isSaving || modalMode === null) return;

        const name = form.name.trim();
        if (!name) return;

        const start = new Date(form.start);
        const end = new Date(form.end);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            alert('Invalid date');
            return;
        }
        if (end <= start) {
            alert('End must be after start');
            return;
        }

        const payload: TuskPayload = {
            name,
            start: start.toISOString(),
            end: end.toISOString(),
            place: form.place.trim() || null,
            idType: form.idType === '' ? null : form.idType,
            timeBefore: selectedEvent && modalMode === 'modify' ? selectedEvent.timeBefore : null,
        };

        if (modalMode === 'modify' && !selectedEvent) return;

        setIsSaving(true);
        const ok = await run(() =>
            modalMode === 'create' || !selectedEvent
                ? window.api.insertTusk(payload)
                : window.api.updateTusk({ id: selectedEvent.id, ...payload })
        );
        setIsSaving(false);

        if (ok) {
            await refreshEvents();
            setModalMode(null);
        }
    }

    async function handleDelete() {
        if (!selectedEvent) {
            alert('Select a task first');
            return;
        }
        if (!confirm(`Are you sure you want to delete "${selectedEvent.name}"?`)) return;

        const ok = await run(() => window.api.deleteTusk(selectedEvent.id));
        if (ok) {
            setSelectedId(null);
            await refreshEvents();
        }
    }

    function handleSelectSlot(slot: SlotInfo) {
        if (slot.action === 'click') {
            setSelectedId(null);
            return;
        }
        handleOpenCreate(slot.start, slot.end);
    }

    async function handleSaveType(e: FormEvent) {
        e.preventDefault();
        const name = typeDraft.name.trim();
        if (!name) return;

        const payload: TuskTypePayload = { name, color: typeDraft.color };
        const ok = await run(() =>
            typeDraft.id === null
                ? window.api.insertTuskType(payload)
                : window.api.updateTuskType({ id: typeDraft.id, ...payload })
        );

        if (ok) {
            setTypeDraft(emptyTypeDraft);
            await Promise.all([refreshTypes(), refreshEvents()]);
        }
    }

    async function handleDeleteType(id: number) {
        if (!confirm('Are you sure you want to delete this type?')) return;

        const ok = await run(() => window.api.deleteTuskType(id));
        if (ok) {
            if (typeDraft.id === id) setTypeDraft(emptyTypeDraft);
            await Promise.all([refreshTypes(), refreshEvents()]);
        }
    }

    const eventPropGetter = useCallback(
        (event: Tusk) => {
            const isSelected = selectedId === event.id;
            const backgroundColor = event.typeColor || DEFAULT_EVENT_COLOR;

            return {
                className: isSelected ? 'tusk-event tusk-event-selected' : 'tusk-event',
                style: {
                    '--tusk-bg': backgroundColor,
                    '--tusk-fg': getContrastColor(backgroundColor),
                } as CSSProperties,
            };
        },
        [selectedId]
    );

    const isEditingType = typeDraft.id !== null;

    return (
        <div className="flex gap-2 p-2 w-full h-[90vh] relative">
            <style>{eventStyles}</style>
            <div className="flex-1 bg-(--color-background-surface) border border-(--color-border-subtle) rounded-2xl shadow-2xl p-2 h-full">
                <Calendar
                    localizer={localizer}
                    events={displayEvents}
                    titleAccessor="name"
                    startAccessor="start"
                    endAccessor="end"
                    culture="it"
                    messages={calendarMessages}
                    style={{ height: '100%' }}
                    selectable
                    popup
                    onSelectEvent={(event) => setSelectedId(event.id)}
                    onSelectSlot={handleSelectSlot}
                    onDoubleClickEvent={(event) => {
                        setSelectedId(event.id);
                        setForm({
                            name: event.name,
                            start: toInputValue(event.start),
                            end: toInputValue(event.end),
                            place: event.place,
                            idType: event.idType ?? '',
                        });
                        setModalMode('modify');
                    }}
                    eventPropGetter={eventPropGetter}
                />
            </div>

            <ControlBar
                onNew={() => handleOpenCreate()}
                onModify={handleOpenModify}
                onDelete={handleDelete}
                onOpenTypes={() => setIsTypesModalOpen(true)}
                hasSelection={selectedEvent !== null}
            />

            {modalMode !== null && (
                <Modal
                    title={modalMode === 'create' ? 'New Task' : 'Modify Task'}
                    onClose={closeTaskModal}
                >
                    <form onSubmit={handleSave} className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                            <label htmlFor="task-name" className={labelClass}>Name</label>
                            <input
                                id="task-name"
                                type="text"
                                value={form.name}
                                onChange={(e) => updateForm('name', e.target.value)}
                                required
                                autoFocus
                                className={inputClass}
                                placeholder="Task name..."
                            />
                        </div>

                        <div className="flex gap-2">
                            <div className="flex flex-col gap-1 flex-1">
                                <label htmlFor="task-start" className={labelClass}>Start</label>
                                <input
                                    id="task-start"
                                    type="datetime-local"
                                    value={form.start}
                                    onChange={(e) => updateForm('start', e.target.value)}
                                    required
                                    className={inputClass}
                                />
                            </div>
                            <div className="flex flex-col gap-1 flex-1">
                                <label htmlFor="task-end" className={labelClass}>End</label>
                                <input
                                    id="task-end"
                                    type="datetime-local"
                                    value={form.end}
                                    min={form.start}
                                    onChange={(e) => updateForm('end', e.target.value)}
                                    required
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label htmlFor="task-place" className={labelClass}>Place</label>
                            <input
                                id="task-place"
                                type="text"
                                value={form.place}
                                onChange={(e) => updateForm('place', e.target.value)}
                                className={inputClass}
                                placeholder="Location..."
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label htmlFor="task-type" className={labelClass}>Type</label>
                            <div className="flex items-center gap-2">
                                <span
                                    className="w-4 h-4 rounded-full border border-(--color-border-subtle) shrink-0"
                                    style={{ backgroundColor: formTypeColor ?? 'transparent' }}
                                ></span>
                                <select
                                    id="task-type"
                                    value={form.idType}
                                    onChange={(e) => updateForm('idType', e.target.value === '' ? '' : Number(e.target.value))}
                                    className={`${inputClass} flex-1`}
                                >
                                    <option value="">None</option>
                                    {tuskTypes.map((type) => (
                                        <option key={type.id} value={type.id}>
                                            {type.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                            <button type="button" onClick={closeTaskModal} className={neutralButtonClass}>
                                Cancel
                            </button>
                            <button type="submit" disabled={isSaving} className={primaryButtonClass}>
                                {isSaving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {isTypesModalOpen && (
                <Modal
                    title={isEditingType ? 'Modify Task Type' : 'Manage Task Types'}
                    onClose={closeTypesModal}
                >
                    <form onSubmit={handleSaveType} className="flex flex-col gap-3 border-b border-(--color-border-subtle) pb-4">
                        <div className="flex flex-col gap-1">
                            <label htmlFor="type-name" className={labelClass}>Type Name</label>
                            <input
                                id="type-name"
                                type="text"
                                value={typeDraft.name}
                                onChange={(e) => setTypeDraft((current) => ({ ...current, name: e.target.value }))}
                                required
                                autoFocus
                                className={inputClass}
                                placeholder="e.g. Work, Study..."
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label htmlFor="type-color" className={labelClass}>Color</label>
                            <div className="flex items-center gap-2">
                                <input
                                    id="type-color"
                                    type="color"
                                    value={typeDraft.color}
                                    onChange={(e) => setTypeDraft((current) => ({ ...current, color: e.target.value }))}
                                    className="w-10 h-10 rounded-xl bg-(--color-ui-dark-surface) border border-(--color-border-subtle) cursor-pointer p-1"
                                />
                                <span className="text-sm text-(--color-text-inverted)">{typeDraft.color}</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-2">
                            {isEditingType && (
                                <button
                                    type="button"
                                    onClick={() => setTypeDraft(emptyTypeDraft)}
                                    className={neutralButtonClass}
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                type="submit"
                                className={isEditingType ? editButtonClass : primaryButtonClass}
                            >
                                {isEditingType ? 'Save Changes' : 'Add Type'}
                            </button>
                        </div>
                    </form>

                    <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                        <span className={labelClass}>Existing Types</span>
                        {tuskTypes.length === 0 ? (
                            <p className="text-xs text-(--color-ui-disabled-text)">No types added yet.</p>
                        ) : (
                            tuskTypes.map((type) => (
                                <div
                                    key={type.id}
                                    className="flex items-center justify-between p-2 rounded-xl bg-(--color-ui-dark-surface) border border-(--color-border-subtle)"
                                >
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: type.color }}
                                        ></span>
                                        <span className="text-sm text-(--color-text-inverted)">{type.name}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setTypeDraft({ id: type.id, name: type.name, color: type.color })}
                                            className="px-2.5 py-1 bg-(--color-action-edit) hover:bg-(--color-action-edit-hover) text-(--color-text-inverted) rounded-lg text-xs transition"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteType(type.id)}
                                            className="px-2.5 py-1 bg-(--color-action-delete) hover:bg-(--color-action-delete-hover) text-(--color-text-inverted) rounded-lg text-xs transition"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="flex justify-end mt-2">
                        <button type="button" onClick={closeTypesModal} className={neutralButtonClass}>
                            Close
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
}

interface ControlBarProps {
    onNew: () => void;
    onModify: () => void;
    onDelete: () => void;
    onOpenTypes: () => void;
    hasSelection: boolean;
}

export function ControlBar({ onNew, onModify, onDelete, onOpenTypes, hasSelection }: ControlBarProps) {
    const enabledEdit = 'bg-(--color-action-edit) hover:bg-(--color-action-edit-hover) text-(--color-text-inverted)';
    const enabledDelete = 'bg-(--color-action-delete) hover:bg-(--color-action-delete-hover) text-(--color-text-inverted)';
    const disabled = 'bg-(--color-ui-dark-surface) text-(--color-ui-disabled-text) cursor-not-allowed';

    return (
        <div className="flex flex-col items-center justify-between p-3 w-24 bg-(--color-background-surface)/50 border border-(--color-border-subtle) rounded-2xl shadow-2xl h-full select-none">
            <div className="flex flex-col gap-3 w-full">
                <button
                    type="button"
                    onClick={onNew}
                    className="w-full py-2 bg-(--color-brand-primary-fallback) hover:bg-(--color-brand-primary-hover) text-(--color-text-inverted) font-medium rounded-xl text-sm transition shadow"
                >
                    New
                </button>
                <button
                    type="button"
                    onClick={onModify}
                    disabled={!hasSelection}
                    className={`w-full py-2 font-medium rounded-xl text-sm transition shadow ${hasSelection ? enabledEdit : disabled}`}
                >
                    Modify
                </button>
                <button
                    type="button"
                    onClick={onDelete}
                    disabled={!hasSelection}
                    className={`w-full py-2 font-medium rounded-xl text-sm transition shadow ${hasSelection ? enabledDelete : disabled}`}
                >
                    Delete
                </button>
            </div>

            <div className="flex flex-col gap-3 w-full border-t border-(--color-border-subtle) pt-3">
                <button
                    type="button"
                    onClick={onOpenTypes}
                    className="w-full py-2 bg-(--color-action-neutral) hover:bg-(--color-action-neutral-hover) text-(--color-text-inverted) font-medium rounded-xl text-xs transition shadow"
                >
                    Types
                </button>
                <button
                    type="button"
                    onClick={() => alert('Coming soon')}
                    className="w-full py-2 bg-(--color-action-neutral) hover:bg-(--color-action-neutral-hover) text-(--color-text-inverted) font-medium rounded-xl text-xs transition shadow"
                >
                    Ring
                </button>
            </div>
        </div>
    );
}
