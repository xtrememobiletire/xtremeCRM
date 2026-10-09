import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Zap, Sun, Sunset, Moon } from 'lucide-react';

export interface ArrivalWindowData {
  arrivalWindowStart?: string; // ISO string
  arrivalWindowEnd?: string;   // ISO string
  estimatedArrivalMinutes?: number;
  appointmentDate?: string;    // ISO string
  displayLabel?: string;
}

interface ArrivalWindowSelectorProps {
  value?: ArrivalWindowData;
  onChange: (data: ArrivalWindowData) => void;
  className?: string;
}

const ETA_PRESETS = [
  { label: 'ASAP (~20m)', minutes: 20 },
  { label: '30 mins', minutes: 30 },
  { label: '45 mins', minutes: 45 },
  { label: '1 hour', minutes: 60 },
  { label: '90 mins', minutes: 90 },
  { label: '2 hours', minutes: 120 },
];

export const ArrivalWindowSelector: React.FC<ArrivalWindowSelectorProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const [mode, setMode] = useState<'ETA' | 'WINDOW'>('ETA');
  const [selectedEta, setSelectedEta] = useState<number>(30);

  // Scheduled window state
  const todayStr = new Date().toISOString().split('T')[0];
  const [windowDate, setWindowDate] = useState<string>(todayStr);
  const [startHour, setStartHour] = useState<number>(6);
  const [startMinute, setStartMinute] = useState<string>('00');
  const [startAmPm, setStartAmPm] = useState<'AM' | 'PM'>('PM');

  const [endHour, setEndHour] = useState<number>(7);
  const [endMinute, setEndMinute] = useState<string>('00');
  const [endAmPm, setEndAmPm] = useState<'AM' | 'PM'>('PM');

  // Helper to convert 12h + AM/PM to 24h
  const to24Hour = (hour: number, ampm: 'AM' | 'PM') => {
    if (ampm === 'AM') {
      return hour === 12 ? 0 : hour;
    }
    return hour === 12 ? 12 : hour + 12;
  };

  // Sync state when ETA changes
  const handleEtaSelect = (minutes: number) => {
    setSelectedEta(minutes);
    const arrivalTime = new Date(Date.now() + minutes * 60000);
    const windowEnd = new Date(arrivalTime.getTime() + 30 * 60000); // 30m buffer

    onChange({
      estimatedArrivalMinutes: minutes,
      appointmentDate: arrivalTime.toISOString(),
      arrivalWindowStart: arrivalTime.toISOString(),
      arrivalWindowEnd: windowEnd.toISOString(),
      displayLabel: `ETA ~${minutes}m (${arrivalTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })})`,
    });
  };

  // Sync state when Scheduled Window changes
  const updateWindowTimes = (
    dateStr: string,
    sH: number,
    sM: string,
    sAmpm: 'AM' | 'PM',
    eH: number,
    eM: string,
    eAmpm: 'AM' | 'PM'
  ) => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);

      const sHour24 = to24Hour(sH, sAmpm);
      const startDate = new Date(year, month - 1, day, sHour24, parseInt(sM, 10), 0);

      const eHour24 = to24Hour(eH, eAmpm);
      const endDate = new Date(year, month - 1, day, eHour24, parseInt(eM, 10), 0);

      // If end time is before or equal to start time, push end time to next day or +1 hr
      const finalEndDate = endDate <= startDate ? new Date(startDate.getTime() + 60 * 60000) : endDate;

      const label = `${sH}:${sM} ${sAmpm} – ${eH}:${eM} ${eAmpm}`;

      onChange({
        arrivalWindowStart: startDate.toISOString(),
        arrivalWindowEnd: finalEndDate.toISOString(),
        appointmentDate: startDate.toISOString(),
        estimatedArrivalMinutes: undefined,
        displayLabel: `${dateStr === todayStr ? 'Today' : dateStr} (${label})`,
      });
    } catch {
      // Fallback
    }
  };

  // Handle Quick Range presets
  const applyPresetRange = (preset: '1HR' | '2HR' | 'MORNING' | 'AFTERNOON' | 'EVENING') => {
    let sH = 9, sM = '00', sAmpm: 'AM' | 'PM' = 'AM';
    let eH = 10, eM = '00', eAmpm: 'AM' | 'PM' = 'AM';

    if (preset === '1HR') {
      const now = new Date();
      const currentHour = now.getHours();
      const nextHour = (currentHour + 1) % 24;
      const afterNext = (currentHour + 2) % 24;

      sAmpm = nextHour >= 12 ? 'PM' : 'AM';
      sH = nextHour % 12 === 0 ? 12 : nextHour % 12;

      eAmpm = afterNext >= 12 ? 'PM' : 'AM';
      eH = afterNext % 12 === 0 ? 12 : afterNext % 12;
    } else if (preset === '2HR') {
      const now = new Date();
      const currentHour = now.getHours();
      const nextHour = (currentHour + 1) % 24;
      const afterTwo = (currentHour + 3) % 24;

      sAmpm = nextHour >= 12 ? 'PM' : 'AM';
      sH = nextHour % 12 === 0 ? 12 : nextHour % 12;

      eAmpm = afterTwo >= 12 ? 'PM' : 'AM';
      eH = afterTwo % 12 === 0 ? 12 : afterTwo % 12;
    } else if (preset === 'MORNING') {
      sH = 8; sM = '00'; sAmpm = 'AM';
      eH = 12; eM = '00'; eAmpm = 'PM';
    } else if (preset === 'AFTERNOON') {
      sH = 12; sM = '00'; sAmpm = 'PM';
      eH = 5; eM = '00'; eAmpm = 'PM';
    } else if (preset === 'EVENING') {
      sH = 5; sM = '00'; sAmpm = 'PM';
      eH = 9; eM = '00'; eAmpm = 'PM';
    }

    setStartHour(sH);
    setStartMinute(sM);
    setStartAmPm(sAmpm);
    setEndHour(eH);
    setEndMinute(eM);
    setEndAmPm(eAmpm);

    updateWindowTimes(windowDate, sH, sM, sAmpm, eH, eM, eAmpm);
  };

  // Initial setup
  useEffect(() => {
    if (!value?.arrivalWindowStart && !value?.estimatedArrivalMinutes) {
      handleEtaSelect(30);
    }
  }, []);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Mode Toggle */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg border border-slate-200">
        <button
          type="button"
          onClick={() => {
            setMode('ETA');
            handleEtaSelect(selectedEta);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-semibold transition ${
            mode === 'ETA'
              ? 'bg-white text-blue-700 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>Quick ETA / Urgent</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMode('WINDOW');
            updateWindowTimes(windowDate, startHour, startMinute, startAmPm, endHour, endMinute, endAmPm);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-semibold transition ${
            mode === 'WINDOW'
              ? 'bg-white text-blue-700 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-blue-500" />
          <span>Between Time (Arrival Window)</span>
        </button>
      </div>

      {/* Mode 1: Quick ETA Pills */}
      {mode === 'ETA' && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {ETA_PRESETS.map((preset) => (
              <button
                key={preset.minutes}
                type="button"
                onClick={() => handleEtaSelect(preset.minutes)}
                className={`py-2 px-2.5 rounded-lg border text-xs font-medium text-center transition flex flex-col items-center justify-center gap-0.5 ${
                  selectedEta === preset.minutes
                    ? 'border-blue-600 bg-blue-50/70 text-blue-700 shadow-sm font-semibold'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Driver target arrival: <strong className="text-slate-700">{value?.displayLabel || `~${selectedEta}m`}</strong></span>
          </div>
        </div>
      )}

      {/* Mode 2: Between Time Window Picker */}
      {mode === 'WINDOW' && (
        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-500 mr-1">Presets:</span>
            <button
              type="button"
              onClick={() => applyPresetRange('1HR')}
              className="px-2 py-1 rounded bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-[11px] font-medium text-slate-700 hover:text-blue-700 transition"
            >
              +1 Hr Window
            </button>
            <button
              type="button"
              onClick={() => applyPresetRange('2HR')}
              className="px-2 py-1 rounded bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-[11px] font-medium text-slate-700 hover:text-blue-700 transition"
            >
              +2 Hr Window
            </button>
            <button
              type="button"
              onClick={() => applyPresetRange('MORNING')}
              className="px-2 py-1 rounded bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-[11px] font-medium text-slate-700 hover:text-amber-700 transition flex items-center gap-1"
            >
              <Sun className="w-3 h-3 text-amber-500" /> Morning (8am-12pm)
            </button>
            <button
              type="button"
              onClick={() => applyPresetRange('AFTERNOON')}
              className="px-2 py-1 rounded bg-white hover:bg-orange-50 border border-slate-200 hover:border-orange-300 text-[11px] font-medium text-slate-700 hover:text-orange-700 transition flex items-center gap-1"
            >
              <Sunset className="w-3 h-3 text-orange-500" /> Afternoon (12pm-5pm)
            </button>
            <button
              type="button"
              onClick={() => applyPresetRange('EVENING')}
              className="px-2 py-1 rounded bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-[11px] font-medium text-slate-700 hover:text-indigo-700 transition flex items-center gap-1"
            >
              <Moon className="w-3 h-3 text-indigo-500" /> Evening (5pm-9pm)
            </button>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1 w-24 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Service Date</span>
            </label>
            <input
              type="date"
              value={windowDate}
              min={todayStr}
              onChange={(e) => {
                const d = e.target.value;
                setWindowDate(d);
                updateWindowTimes(d, startHour, startMinute, startAmPm, endHour, endMinute, endAmPm);
              }}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Start and End Window Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200/80">
            {/* Start Time */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                Arrive Between (Start)
              </span>
              <div className="flex items-center gap-1.5">
                <select
                  value={startHour}
                  onChange={(e) => {
                    const h = Number(e.target.value);
                    setStartHour(h);
                    updateWindowTimes(windowDate, h, startMinute, startAmPm, endHour, endMinute, endAmPm);
                  }}
                  className="px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <span className="text-slate-400 font-bold">:</span>
                <select
                  value={startMinute}
                  onChange={(e) => {
                    const m = e.target.value;
                    setStartMinute(m);
                    updateWindowTimes(windowDate, startHour, m, startAmPm, endHour, endMinute, endAmPm);
                  }}
                  className="px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {['00', '15', '30', '45'].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <div className="flex rounded-lg border border-slate-300 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setStartAmPm('AM');
                      updateWindowTimes(windowDate, startHour, startMinute, 'AM', endHour, endMinute, endAmPm);
                    }}
                    className={`px-2 py-1 text-xs font-bold transition ${
                      startAmPm === 'AM' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStartAmPm('PM');
                      updateWindowTimes(windowDate, startHour, startMinute, 'PM', endHour, endMinute, endAmPm);
                    }}
                    className={`px-2 py-1 text-xs font-bold transition ${
                      startAmPm === 'PM' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>

            {/* End Time */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                And (End Window)
              </span>
              <div className="flex items-center gap-1.5">
                <select
                  value={endHour}
                  onChange={(e) => {
                    const h = Number(e.target.value);
                    setEndHour(h);
                    updateWindowTimes(windowDate, startHour, startMinute, startAmPm, h, endMinute, endAmPm);
                  }}
                  className="px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <span className="text-slate-400 font-bold">:</span>
                <select
                  value={endMinute}
                  onChange={(e) => {
                    const m = e.target.value;
                    setEndMinute(m);
                    updateWindowTimes(windowDate, startHour, startMinute, startAmPm, endHour, m, endAmPm);
                  }}
                  className="px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {['00', '15', '30', '45'].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <div className="flex rounded-lg border border-slate-300 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setEndAmPm('AM');
                      updateWindowTimes(windowDate, startHour, startMinute, startAmPm, endHour, endMinute, 'AM');
                    }}
                    className={`px-2 py-1 text-xs font-bold transition ${
                      endAmPm === 'AM' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEndAmPm('PM');
                      updateWindowTimes(windowDate, startHour, startMinute, startAmPm, endHour, endMinute, 'PM');
                    }}
                    className={`px-2 py-1 text-xs font-bold transition ${
                      endAmPm === 'PM' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Active summary banner */}
          <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              Driver Promised Arrival Window:
            </span>
            <span className="font-bold bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-700">
              {startHour}:{startMinute} {startAmPm} – {endHour}:{endMinute} {endAmPm}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
