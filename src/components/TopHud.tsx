import React from 'react';
import {
  Clock,
  Coins,
  Gem,
  Heart,
  RotateCw,
  Settings,
  ShoppingBag,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { HudSnapshot, LevelConfig } from '../types/game';

interface TopHudProps {
  level: LevelConfig;
  hud: HudSnapshot;
  gold: number;
  gems: number;
  muted: boolean;
  isVip: boolean;
  onToggleMute: () => void;
  onOpenShop: () => void;
  onOpenSettings: () => void;
}

export const TopHud: React.FC<TopHudProps> = ({
  level,
  hud,
  gold,
  gems,
  muted,
  isVip,
  onToggleMute,
  onOpenShop,
  onOpenSettings,
}) => {
  const hpPct = Math.max(0, Math.min(100, (hud.hp / Math.max(1, hud.maxHp)) * 100));
  const hpBarColor =
    hpPct > 55 ? 'bg-emerald-500' : hpPct > 28 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-1.5 p-2.5">
      {/* Primary Top Row */}
      <div className="flex items-center justify-between gap-1.5">
        {/* Level + HP Cluster */}
        <div
          className="pointer-events-auto flex items-center gap-2 rounded-xl border border-amber-500/30 px-2.5 py-1.5 shadow-lg"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)' }}
        >
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-extrabold tracking-wider text-amber-400 uppercase tabular-nums">
                LV {level.id}/10
              </span>
              <span className="text-[10px] font-semibold text-slate-400 tabular-nums">
                W{hud.waveIndex}/{hud.totalWaves}
              </span>
            </div>
            {/* HP Bar */}
            <div className="mt-1 flex items-center gap-1">
              <Heart className="h-3 w-3 shrink-0 fill-rose-500 text-rose-500" />
              <div className="relative h-2 w-20 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full transition-all duration-150 ${hpBarColor}`}
                  style={{ width: `${hpPct}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-200 tabular-nums">
                {hud.hp}
              </span>
            </div>
          </div>
        </div>

        {/* Currencies + Action Icons */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <div
            className="flex items-center gap-2 rounded-xl border border-slate-700/80 px-2 py-1.5 shadow-lg"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)' }}
          >
            <div className="flex items-center gap-1">
              <Coins className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-bold text-amber-100 tabular-nums">{gold}</span>
            </div>
            <div className="h-3 w-px bg-slate-700" />
            <div className="flex items-center gap-1">
              <Gem className="h-3.5 w-3.5 text-sky-400" />
              <span className="text-xs font-bold text-sky-100 tabular-nums">{gems}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenShop}
            aria-label="Open Shop"
            className="relative flex h-8 w-8 items-center justify-center rounded-xl border border-amber-500/40 text-amber-300 transition-transform active:scale-95"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)' }}
          >
            <ShoppingBag className="h-4 w-4" />
            {isVip && (
              <span className="absolute -top-1 -right-1 rounded bg-amber-500 px-1 text-[8px] font-black text-slate-950">
                VIP
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute Sound' : 'Mute Sound'}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700/80 text-slate-200 transition-transform active:scale-95"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)' }}
          >
            {muted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Settings"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700/80 text-slate-200 transition-transform active:scale-95"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)' }}
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Compact Objective / Special Mode Strip */}
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div
          className="flex items-center gap-1.5 rounded-lg border border-slate-700/70 px-2.5 py-1 text-[11px] font-medium text-slate-200"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.82)' }}
        >
          {level.id === 4 && !hud.rotatedToBack ? (
            <>
              <RotateCw className="h-3.5 w-3.5 text-amber-400" />
              <span className="font-semibold text-amber-300">Drag to Rotate 360°</span>
            </>
          ) : (
            <span className="truncate max-w-[230px]">{level.hint ?? level.subtitle}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {hud.freezeRemaining > 0 && (
            <div
              className="flex items-center gap-1 rounded-lg border border-sky-400/50 px-2 py-1 text-[11px] font-bold text-sky-300 tabular-nums"
              style={{ backgroundColor: 'rgba(12, 74, 110, 0.88)' }}
            >
              <span>FROZEN {hud.freezeRemaining.toFixed(1)}s</span>
            </div>
          )}

          {level.efficiencyTapLimit && (
            <div
              className={`rounded-lg border px-2 py-1 text-[11px] font-bold tabular-nums ${
                hud.tapsUsed <= level.efficiencyTapLimit
                  ? 'border-amber-500/40 text-amber-300'
                  : 'border-rose-500/40 text-rose-300'
              }`}
              style={{ backgroundColor: 'rgba(15, 23, 42, 0.86)' }}
            >
              Taps {hud.tapsUsed}/{level.efficiencyTapLimit}
            </div>
          )}

          {hud.timeRemaining !== null && (
            <div
              className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold tabular-nums ${
                hud.timeRemaining <= 12
                  ? 'border-rose-500/60 text-rose-300'
                  : 'border-amber-500/40 text-amber-300'
              }`}
              style={{ backgroundColor: 'rgba(15, 23, 42, 0.88)' }}
            >
              <Clock className="h-3 w-3" />
              <span>{Math.ceil(hud.timeRemaining)}s</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
