import React, { useEffect, useState, useCallback } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { it } from 'date-fns/locale/it'

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
    idType?: number;
    place?: string;
    timeBefore?: string;
    typeColor?: string;
}

const locales = { 'it': it };
const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
    getDay,
    locales,
});

async function loadEvents(): Promise<Tusk[]> {
    try {
        const rawTusks = await window.api.getTusks();
        return rawTusks.map((item: any) => ({
            ...item,
            start: new Date(item.start),
            end: new Date(item.end),
        }));
    } catch (error) {
        console.error("Error", error);
        return [];
    }
}

async function loadTuskTypes(): Promise<TuskType[]> {
    try {
        return await window.api.getTuskTypes();
    } catch (error) {
        console.error("Error", error);
        return [];
    }
}

export function MyCalendar() {
    const [events, setEvents] = useState<Tusk[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<Tusk | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'modify'>('create');
    const [tuskTypes, setTuskTypes] = useState<TuskType[]>([]);

    const [formName, setFormName] = useState('');
    const [formStart, setFormStart] = useState('');
    const [formEnd, setFormEnd] = useState('');
    const [formPlace, setFormPlace] = useState('');
    const [formIdType, setFormIdType] = useState<number | ''>('');

    const refreshEvents = useCallback(async () => {
        const loaded = await loadEvents();
        setEvents(loaded);
    }, []);

    useEffect(() => {
        refreshEvents();
        loadTuskTypes().then(setTuskTypes);
    }, [refreshEvents]);

    function handleOpenCreate(){
        setModalMode('create');
        setFormName('');
        const now = new Date();
        const later = new Date(now.getTime() + 60 * 60 * 1000);
        setFormStart(now.toISOString().slice(0, 16));
        setFormEnd(later.toISOString().slice(0, 16));
        setFormPlace('');
        setFormIdType(tuskTypes.length > 0 ? tuskTypes[0].id : '');
        setIsModalOpen(true);
    };

    function handleOpenModify(){
        if (!selectedEvent) {
            alert("Select a tusk before");
            return;
        }
        setModalMode('modify');
        setFormName(selectedEvent.name);
        setFormStart(new Date(selectedEvent.start).toISOString().slice(0, 16));
        setFormEnd(new Date(selectedEvent.end).toISOString().slice(0, 16));
        setFormPlace(selectedEvent.place || '');
        setFormIdType(selectedEvent.idType || '');
        setIsModalOpen(true);
    };

    async function handleSave(e: React.FormEvent){
        e.preventDefault();
        if (!formName.trim()) return;

        const payload = {
            name: formName,
            start: new Date(formStart).toISOString(),
            end: new Date(formEnd).toISOString(),
            place: formPlace || null,
            idType: formIdType === '' ? null : Number(formIdType),
            timeBefore: null
        };

        if (modalMode === 'create') {
            const res = await window.api.insertTusk(payload);
            if (res.success) {
                refreshEvents();
                setIsModalOpen(false);
            } else {
                alert("Error" + res.error);
            }
        } else {
            if (!selectedEvent) return;
            const res = await window.api.updateTusks({
                id: selectedEvent.id,
                ...payload
            });
            if (res.success) {
                refreshEvents();
                setSelectedEvent(null);
                setIsModalOpen(false);
            } else {
                alert("Error" + res.error);
            }
        }
    };

    async function handleDelete(){
        if (!selectedEvent) {
            alert("Select a Tusk");
            return;
        }

        if (!confirm(`Are you sure you want to delete "${selectedEvent.name}"?`)) return;

        const res = await window.api.deleteTusk(selectedEvent.id);
        if (res.success) {
            refreshEvents();
            setSelectedEvent(null);
        } else {
            alert("Error" + res.error);
        }
    };

    function eventPropGetter(event: Tusk){
        const isSelected = selectedEvent?.id === event.id;
        return {
            style: {
                backgroundColor: event.typeColor || '#3b82f6',
                borderColor: isSelected ? '#ffffff' : 'transparent',
                borderWidth: isSelected ? '3px' : '1px',
            },
        };
    };

    return (
        <div className="flex gap-2 p-2 w-full h-[90vh] relative">
            <div className="flex-1 bg-(--bg-surface) border border-(--border-color) rounded-2xl shadow-2xl p-2 h-full">
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    culture="it"
                    style={{ height: '100%' }}
                    onSelectEvent={(event) => setSelectedEvent(event)}
                    eventPropGetter={eventPropGetter}
                />
            </div>
            <ControlBar
                onNew={handleOpenCreate}
                onModify={handleOpenModify}
                onDelete={handleDelete}
                hasSelection={!!selectedEvent}
            />

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-(--bg-surface) border border-(--border-color) rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4">
                        <h2 className="text-lg font-semibold text-white">
                            {modalMode === 'create' ? 'Nuovo Impegno' : 'Modifica Impegno'}
                        </h2>

                        <form onSubmit={handleSave} className="flex flex-col gap-3">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-zinc-400">Nome</label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    required
                                    className="p-2 rounded-xl bg-zinc-800 border border-(--border-color) text-white text-sm"
                                    placeholder="Nome impegno..."
                                />
                            </div>

                            <div className="flex gap-2">
                                <div className="flex flex-col gap-1 flex-1">
                                    <label className="text-xs text-zinc-400">Inizio</label>
                                    <input
                                        type="datetime-local"
                                        value={formStart}
                                        onChange={(e) => setFormStart(e.target.value)}
                                        required
                                        className="p-2 rounded-xl bg-zinc-800 border border-(--border-color) text-white text-sm"
                                    />
                                </div>
                                <div className="flex flex-col gap-1 flex-1">
                                    <label className="text-xs text-zinc-400">Fine</label>
                                    <input
                                        type="datetime-local"
                                        value={formEnd}
                                        onChange={(e) => setFormEnd(e.target.value)}
                                        required
                                        className="p-2 rounded-xl bg-zinc-800 border border-(--border-color) text-white text-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-zinc-400">Luogo</label>
                                <input
                                    type="text"
                                    value={formPlace}
                                    onChange={(e) => setFormPlace(e.target.value)}
                                    className="p-2 rounded-xl bg-zinc-800 border border-(--border-color) text-white text-sm"
                                    placeholder="Luogo..."
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-zinc-400">Tipo</label>
                                <select
                                    value={formIdType}
                                    onChange={(e) => setFormIdType(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="p-2 rounded-xl bg-zinc-800 border border-(--border-color) text-white text-sm"
                                >
                                    <option value="">Nessuno</option>
                                    {tuskTypes.map((type) => (
                                        <option key={type.id} value={type.id}>
                                            {type.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end gap-2 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl text-sm transition"
                                >
                                    Annulla
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm transition"
                                >
                                    Salva
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

interface ControlBarProps {
    onNew: () => void;
    onModify: () => void;
    onDelete: () => void;
    hasSelection: boolean;
}

export function ControlBar({ onNew, onModify, onDelete, hasSelection }: ControlBarProps) {
    return (
        <div className='flex flex-col items-center justify-between p-3 w-24 bg-(--bg-surface)/50 border border-(--border-color) rounded-2xl shadow-2xl h-full select-none'>
            <div className="flex flex-col gap-3 w-full">
                <button
                    onClick={onNew}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition shadow"
                >
                    New
                </button>
                <button
                    onClick={onModify}
                    disabled={!hasSelection}
                    className={`w-full py-2 font-medium rounded-xl text-sm transition shadow ${
                        hasSelection
                            ? 'bg-amber-600 hover:bg-amber-500 text-white'
                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    }`}
                >
                    Modify
                </button>
                <button
                    onClick={onDelete}
                    disabled={!hasSelection}
                    className={`w-full py-2 font-medium rounded-xl text-sm transition shadow ${
                        hasSelection
                            ? 'bg-rose-600 hover:bg-rose-500 text-white'
                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    }`}
                >
                    Delete
                </button>
            </div>

            <div className="flex flex-col gap-3 w-full border-t border-(--border-color) pt-3">
                <button
                    onClick={() => alert("Coming soon")}
                    className="w-full py-2 bg-zinc-700 hover:bg-zinc-600 text-white font-medium rounded-xl text-xs transition shadow"
                >
                    Types
                </button>
                <button
                    onClick={() => alert("Coming soon")}
                    className="w-full py-2 bg-zinc-700 hover:bg-zinc-600 text-white font-medium rounded-xl text-xs transition shadow"
                >
                    Ring
                </button>
            </div>
        </div>
    );
}
