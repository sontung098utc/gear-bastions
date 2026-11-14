import React from 'react';
import { ArrowUpCircle, Play, Settings, ShoppingBag, Trophy } from 'lucide-react';
import { LEVELS } from '../data/levels';
import { PlayerProgress } from '../types/game';

interface TitleScreenProps {
  progress: PlayerProgress;
  onStartLevel: (levelId: number) => void;
  onOpenShop: () => void;
  onOpenUpgrades: () => void;
  onOpenSettings: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  progress,
  onStartLevel,
  onOpenShop,
  onOpenUpgrades,
  onOpenSettings,
}) => {
  const playTarget = Math.min(LEVELS.length, progress.currentLevel);

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between p-4">
      {/* Top Bar: Currencies & Utility */}
      <div className="pointer-events-auto flex items-center justify-between">
        <div
          className="flex items-center gap-2 rounded-xl border border-amber-500/30 px-3 py-1.5 text-xs font-bold text-amber-200"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.88)' }}
        >
          <Trophy className="h-3.5 w-3.5 text-amber-400" />
          <span className="tabular-nums">
            {progress.completedLevels.length}/10 Cleared
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenShop}
            aria-label="Shop"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/40 text-amber-300 transition-transform active:scale-95"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)' }}
          >
            <ShoppingBag className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Settings"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 text-slate-200 transition-transform active:scale-95"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)' }}
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Bespoke Inline SVG Title Lockup */}
      <div className="mt-1 flex flex-col items-center text-center">
        <svg
          viewBox="0 0 320 112"
          className="w-72 drop-shadow-[0_6px_18px_rgba(0,0,0,0.85)]"
          aria-label="Gear and Bastion"
        >
          <defs>
            <linearGradient id="brassTitleGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>
          {/* Decorative Gear + Tower Crest */}
          <g transform="translate(160, 28)">
            <circle cx="0" cy="0" r="19" fill="#0f172a" stroke="url(#brassTitleGrad)" strokeWidth="3" />
            <path
              d="M-4,-23 L4,-23 L5,-18 L9,-17 L13,-20 L18,-15 L15,-11 L17,-7 L22,-6 L22,2 L17,3 L15,7 L18,11 L13,16 L9,13 L5,15 L4,20 L-4,20 L-5,15 L-9,13 L-13,16 L-18,11 L-15,7 L-17,3 L-22,2 L-22,-6 L-17,-7 L-15,-11 L-18,-15 L-13,-20 L-9,-17 L-5,-18 Z"
              fill="none"
              stroke="url(#brassTitleGrad)"
              strokeWidth="2.2"
            />
            <rect x="-7" y="-8" width="14" height="16" rx="1.5" fill="url(#brassTitleGrad)" />
            <rect x="-7" y="-12" width="4" height="5" fill="#fde68a" />
            <rect x="-2" y="-12" width="4" height="5" fill="#fde68a" />
            <rect x="3" y="-12" width="4" height="5" fill="#fde68a" />
            <rect x="-2.5" y="0" width="5" height="8" rx="2.5" fill="#0f172a" />
          </g>
          <text
            x="160"
            y="82"
            textAnchor="middle"
            fill="url(#brassTitleGrad)"
            fontSize="30"
            fontWeight="900"
            letterSpacing="2"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            GEAR &amp; BASTION
          </text>
          <text
            x="160"
            y="102"
            textAnchor="middle"
            fill="#cbd5e1"
            fontSize="11"
            fontWeight="700"
            letterSpacing="3.2"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            CLOCKWORK SIEGE PUZZLE
          </text>
        </svg>
      </div>

      {/* Bottom Interactive Card */}
      <div
        className="pointer-events-auto flex flex-col gap-3 rounded-2xl border border-amber-500/35 p-3.5 shadow-2xl"
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)' }}
      >
        {/* Level Selector Strip */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span>Campaign Levels</span>
            <span className="text-amber-300 tabular-nums">
              {progress.gold} Gold · {progress.gems} Gems
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {LEVELS.map((lvl) => {
              const unlocked = lvl.id <= progress.highestUnlockedLevel;
              const completed = progress.completedLevels.includes(lvl.id);
              const selected = lvl.id === playTarget;
              return (
                <button
                  key={lvl.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => onStartLevel(lvl.id)}
                  className={`flex h-9 items-center justify-center rounded-lg border text-xs font-extrabold tabular-nums transition-all active:scale-95 ${
                    selected
                      ? 'border-amber-400 bg-amber-500 text-slate-950 shadow-md'
                      : completed
                      ? 'border-emerald-500/50 bg-emerald-950/60 text-emerald-300'
                      : unlocked
                      ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-amber-400/60'
                      : 'border-slate-800 bg-slate-900/50 text-slate-600'
                  }`}
                >
                  {lvl.id}
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary Play + Upgrades Row */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onStartLevel(playTarget)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 py-3 text-sm font-black tracking-wide text-slate-950 shadow-lg transition-transform active:scale-95"
          >
            <Play className="h-4 w-4 fill-slate-950" />
            <span>PLAY LEVEL {playTarget}</span>
          </button>

          <button
            type="button"
            onClick={onOpenUpgrades}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/50 bg-emerald-950/70 px-3.5 py-3 text-xs font-bold text-emerald-200 transition-transform active:scale-95"
          >
            <ArrowUpCircle className="h-4 w-4 text-emerald-400" />
            <span>Upgrades</span>
          </button>
        </div>

        {/* Flat 1-line Control Hint */}
        <p className="text-center text-[11px] font-medium text-slate-400">
          Tap pins &amp; gears · Drag to orbit 360° · Enter to play
        </p>
      </div>
    </div>
  );
};
