import React from 'react';
import { ArrowUpCircle, Hammer, RotateCcw, Snowflake } from 'lucide-react';
import { ActiveBoosterMode, DefenseType } from '../types/game';

interface BoosterBarProps {
  hammers: number;
  freezes: number;
  boosterMode: ActiveBoosterMode;
  freezeActive: boolean;
  activeDefenses: DefenseType[];
  allDefenses: DefenseType[];
  onToggleHammer: () => void;
  onUseFreeze: () => void;
  onResetCamera: () => void;
  onOpenUpgrades: () => void;
}

export const BoosterBar: React.FC<BoosterBarProps> = ({
  hammers,
  freezes,
  boosterMode,
  freezeActive,
  activeDefenses,
  allDefenses,
  onToggleHammer,
  onUseFreeze,
  onResetCamera,
  onOpenUpgrades,
}) => {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-1.5 p-2.5">
      {/* Defense Status Strip */}
      <div
        className="pointer-events-auto flex items-center gap-2 rounded-lg border border-slate-700/70 px-3 py-1"
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.84)' }}
      >
        {allDefenses.map((def) => {
          const online = activeDefenses.includes(def);
          const label =
            def === 'crossbow' ? 'Crossbow' : def === 'flame' ? 'Ember Trap' : 'Mortar';
          return (
            <div key={def} className="flex items-center gap-1 text-[10px] font-bold tracking-wide uppercase">
              <span
                className={`h-2 w-2 rounded-full ${
                  online ? 'bg-emerald-400' : 'bg-slate-600'
                }`}
              />
              <span className={online ? 'text-emerald-300' : 'text-slate-400'}>{label}</span>
            </div>
          );
        })}
      </div>

      {/* Tactile Booster Dock */}
      <div
        className="pointer-events-auto grid w-full grid-cols-4 gap-1.5 rounded-2xl border border-amber-500/30 p-1.5 shadow-2xl"
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
      >
        {/* Hammer Booster */}
        <button
          type="button"
          onClick={onToggleHammer}
          disabled={hammers <= 0 && boosterMode !== 'hammer'}
          className={`relative flex flex-col items-center justify-center rounded-xl border py-2 transition-all active:scale-95 ${
            boosterMode === 'hammer'
              ? 'border-amber-400 bg-amber-500/25 text-amber-200'
              : hammers > 0
              ? 'border-slate-700 bg-slate-800/80 text-slate-100 hover:border-amber-500/50'
              : 'border-slate-800 bg-slate-900/60 text-slate-500 opacity-60'
          }`}
        >
          <Hammer className="h-4 w-4 text-amber-400" />
          <span className="mt-0.5 text-[10px] font-bold">
            {boosterMode === 'hammer' ? 'TAP PIN!' : 'Hammer'}
          </span>
          <span className="absolute top-1 right-1.5 rounded bg-slate-950/90 px-1 text-[9px] font-extrabold text-amber-300 tabular-nums">
            {hammers}
          </span>
        </button>

        {/* Clock Freeze Booster */}
        <button
          type="button"
          onClick={onUseFreeze}
          disabled={freezes <= 0 || freezeActive}
          className={`relative flex flex-col items-center justify-center rounded-xl border py-2 transition-all active:scale-95 ${
            freezeActive
              ? 'border-sky-400 bg-sky-500/25 text-sky-200'
              : freezes > 0
              ? 'border-slate-700 bg-slate-800/80 text-slate-100 hover:border-sky-500/50'
              : 'border-slate-800 bg-slate-900/60 text-slate-500 opacity-60'
          }`}
        >
          <Snowflake className="h-4 w-4 text-sky-400" />
          <span className="mt-0.5 text-[10px] font-bold">Freeze 8s</span>
          <span className="absolute top-1 right-1.5 rounded bg-slate-950/90 px-1 text-[9px] font-extrabold text-sky-300 tabular-nums">
            {freezes}
          </span>
        </button>

        {/* Reset Camera */}
        <button
          type="button"
          onClick={onResetCamera}
          className="flex flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-800/80 py-2 text-slate-100 transition-all hover:border-slate-500 active:scale-95"
        >
          <RotateCcw className="h-4 w-4 text-slate-300" />
          <span className="mt-0.5 text-[10px] font-bold">Camera</span>
        </button>

        {/* Upgrades */}
        <button
          type="button"
          onClick={onOpenUpgrades}
          className="flex flex-col items-center justify-center rounded-xl border border-emerald-600/40 bg-emerald-950/60 py-2 text-emerald-200 transition-all hover:border-emerald-400/70 active:scale-95"
        >
          <ArrowUpCircle className="h-4 w-4 text-emerald-400" />
          <span className="mt-0.5 text-[10px] font-bold">Upgrades</span>
        </button>
      </div>
    </div>
  );
};
