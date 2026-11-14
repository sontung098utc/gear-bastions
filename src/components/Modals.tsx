import React, { useEffect, useState } from 'react';
import {
  Award,
  Check,
  Coins,
  Crown,
  Flame,
  Gem,
  Gift,
  Hammer,
  Heart,
  Play,
  RotateCcw,
  ShieldAlert,
  Snowflake,
  Sparkles,
  Star,
  Timer,
  Trash2,
  Tv,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import {
  getBastionMaxHp,
  getCrossbowDamage,
  getFireInterval,
  getUpgradeCost,
} from '../state/storage';
import { HudSnapshot, LevelConfig, PlayerProgress, PlayerUpgrades } from '../types/game';

/* -------------------------------------------------------------------------- */
/*                               Victory Modal                                */
/* -------------------------------------------------------------------------- */

interface VictoryModalProps {
  level: LevelConfig;
  hud: HudSnapshot;
  goldEarned: number;
  gemsEarned: number;
  efficiencyBonusEarned: number;
  isVip: boolean;
  onNextLevel: () => void;
  onOpenUpgrades: () => void;
  onBackToTitle: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  level,
  hud,
  goldEarned,
  gemsEarned,
  efficiencyBonusEarned,
  isVip,
  onNextLevel,
  onOpenUpgrades,
  onBackToTitle,
}) => {
  const hpRatio = hud.hp / Math.max(1, hud.maxHp);
  const stars = hpRatio >= 0.85 ? 3 : hpRatio >= 0.45 ? 2 : 1;

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(2, 6, 23, 0.82)' }}
    >
      <div
        className="flex w-full max-w-[360px] flex-col items-center gap-3.5 rounded-2xl border border-amber-400/50 p-5 text-center shadow-2xl"
        style={{ backgroundColor: '#0f172a' }}
      >
        <div className="flex items-center gap-1.5">
          {[1, 2, 3].map((s) => (
            <Star
              key={s}
              className={`h-8 w-8 ${
                s <= stars
                  ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                  : 'fill-slate-800 text-slate-700'
              }`}
            />
          ))}
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
            Bastion Defended
          </p>
          <h2 className="text-2xl font-black text-white">
            Level {level.id} Complete!
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">{level.title}</p>
        </div>

        {/* Rewards Box */}
        <div className="grid w-full grid-cols-2 gap-2 rounded-xl border border-slate-700 bg-slate-900/90 p-3">
          <div className="flex items-center justify-center gap-2">
            <Coins className="h-5 w-5 text-amber-400" />
            <div className="text-left">
              <div className="text-sm font-black text-amber-200 tabular-nums">
                +{goldEarned}
              </div>
              <div className="text-[10px] font-semibold text-slate-400">Gold</div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Gem className="h-5 w-5 text-sky-400" />
            <div className="text-left">
              <div className="text-sm font-black text-sky-200 tabular-nums">
                +{gemsEarned}
              </div>
              <div className="text-[10px] font-semibold text-slate-400">Gems</div>
            </div>
          </div>
        </div>

        {efficiencyBonusEarned > 0 && (
          <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/50 px-3 py-2 text-xs font-bold text-amber-300">
            <Gift className="h-4 w-4 text-amber-400" />
            <span>
              Efficiency Chest ({hud.tapsUsed} taps): +{efficiencyBonusEarned} Gold!
            </span>
          </div>
        )}

        {isVip && (
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
            <Crown className="h-3.5 w-3.5" />
            <span>VIP 2x Gold Bonus Applied</span>
          </div>
        )}

        {level.introducesUpgrades && (
          <div className="w-full rounded-xl border border-emerald-500/40 bg-emerald-950/50 px-3 py-2 text-xs font-semibold text-emerald-200">
            Upgrades Unlocked! Spend Gold to boost Crossbow &amp; Bastion HP.
          </div>
        )}

        <div className="flex w-full flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={onOpenUpgrades}
            className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-extrabold transition-transform active:scale-95 ${
              level.introducesUpgrades
                ? 'border-emerald-400 bg-emerald-600 text-white'
                : 'border-emerald-500/40 bg-emerald-950/70 text-emerald-200'
            }`}
          >
            <Zap className="h-4 w-4" />
            <span>Upgrade Defenses</span>
          </button>

          <button
            type="button"
            onClick={onNextLevel}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 py-3 text-sm font-black text-slate-950 shadow-lg transition-transform active:scale-95"
          >
            <Play className="h-4 w-4 fill-slate-950" />
            <span>{level.id < 10 ? `Next: Level ${level.id + 1}` : 'Campaign Complete!'}</span>
          </button>

          <button
            type="button"
            onClick={onBackToTitle}
            className="py-1 text-xs font-semibold text-slate-400 hover:text-slate-200"
          >
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                       Defeat / Pinch Point Modal                           */
/* -------------------------------------------------------------------------- */

interface DefeatModalProps {
  level: LevelConfig;
  reason: 'hp' | 'timeout';
  freezes: number;
  gems: number;
  isVip: boolean;
  onReviveSuccess: () => void;
  onUseTacticalBooster: () => void;
  onRetry: () => void;
  onBackToTitle: () => void;
}

export const DefeatModal: React.FC<DefeatModalProps> = ({
  level,
  reason,
  freezes,
  gems,
  isVip,
  onReviveSuccess,
  onUseTacticalBooster,
  onRetry,
  onBackToTitle,
}) => {
  const [adCountdown, setAdCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (adCountdown === null) return;
    if (adCountdown <= 0) {
      setAdCountdown(null);
      onReviveSuccess();
      return;
    }
    const timer = window.setTimeout(() => {
      setAdCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [adCountdown, onReviveSuccess]);

  const handleWatchAd = () => {
    if (isVip) {
      onReviveSuccess();
    } else {
      setAdCountdown(2);
    }
  };

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(2, 6, 23, 0.85)' }}
    >
      <div
        className="flex w-full max-w-[360px] flex-col items-center gap-3.5 rounded-2xl border border-rose-500/45 p-5 text-center shadow-2xl"
        style={{ backgroundColor: '#0f172a' }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-500/40 bg-rose-950/70">
          <ShieldAlert className="h-6 w-6 text-rose-400" />
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-rose-400">
            {reason === 'timeout' ? 'Time Expired' : 'Gate Breached'}
          </p>
          <h2 className="text-xl font-black text-white">Hold the Bastion!</h2>
          <p className="mt-1 text-xs text-slate-400">
            Level {level.id}: {level.title}
          </p>
        </div>

        {adCountdown !== null ? (
          <div className="flex w-full flex-col items-center gap-2 rounded-xl border border-sky-500/50 bg-slate-900 p-4">
            <Tv className="h-6 w-6 text-sky-400" />
            <p className="text-xs font-bold text-sky-200">
              Sponsored Tactical Drop...
            </p>
            <div className="text-2xl font-black text-amber-400 tabular-nums">
              {adCountdown}s
            </div>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-2.5">
            <button
              type="button"
              onClick={handleWatchAd}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 py-3 px-3 text-xs font-black text-slate-950 shadow-lg transition-transform active:scale-95"
            >
              <Tv className="h-4 w-4" />
              <span>
                {isVip
                  ? 'VIP Instant Revive + 10s Freeze'
                  : 'Watch Rewarded Ad (Revive + 10s Freeze)'}
              </span>
            </button>

            <button
              type="button"
              onClick={onUseTacticalBooster}
              disabled={freezes <= 0 && gems < 30}
              className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 px-3 text-xs font-extrabold transition-transform active:scale-95 ${
                freezes > 0 || gems >= 30
                  ? 'border-sky-500/50 bg-sky-950/70 text-sky-200'
                  : 'border-slate-800 bg-slate-900 text-slate-500 opacity-60'
              }`}
            >
              <Snowflake className="h-4 w-4 text-sky-400" />
              <span>
                {freezes > 0
                  ? `Use Tactical Booster (1 Freeze · ${freezes} left)`
                  : 'Use Tactical Booster (30 Gems)'}
              </span>
            </button>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onRetry}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-bold text-slate-200 active:scale-95"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Retry</span>
              </button>
              <button
                type="button"
                onClick={onBackToTitle}
                className="flex flex-1 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 py-2.5 text-xs font-bold text-slate-400 active:scale-95"
              >
                Menu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                               Upgrade Modal                                */
/* -------------------------------------------------------------------------- */

interface UpgradeModalProps {
  gold: number;
  upgrades: PlayerUpgrades;
  onUpgrade: (key: keyof PlayerUpgrades) => void;
  onClose: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  gold,
  upgrades,
  onUpgrade,
  onClose,
}) => {
  const rows: {
    key: keyof PlayerUpgrades;
    label: string;
    stat: string;
    icon: React.ReactNode;
    lvl: number;
  }[] = [
    {
      key: 'crossbowDamage',
      label: 'Crossbow & Cannon Power',
      stat: `${getCrossbowDamage(upgrades)} DMG`,
      icon: <Flame className="h-4 w-4 text-amber-400" />,
      lvl: upgrades.crossbowDamage,
    },
    {
      key: 'fireRate',
      label: 'Gear Fire Rate',
      stat: `${(1 / getFireInterval(upgrades)).toFixed(2)}/s`,
      icon: <Zap className="h-4 w-4 text-sky-400" />,
      lvl: upgrades.fireRate,
    },
    {
      key: 'bastionMaxHp',
      label: 'Bastion Gate Armor',
      stat: `${getBastionMaxHp(upgrades)} HP`,
      icon: <Heart className="h-4 w-4 text-rose-400" />,
      lvl: upgrades.bastionMaxHp,
    },
  ];

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(2, 6, 23, 0.85)' }}
    >
      <div
        className="flex w-full max-w-[380px] flex-col gap-3 rounded-2xl border border-amber-500/40 p-4 shadow-2xl"
        style={{ backgroundColor: '#0f172a' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white">Bastion Forge</h2>
            <p className="text-[11px] text-slate-400">Permanent campaign upgrades</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-slate-900 px-2.5 py-1">
              <Coins className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-black text-amber-200 tabular-nums">{gold}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {rows.map((r) => {
            const maxed = r.lvl >= 10;
            const cost = getUpgradeCost(r.lvl);
            const canAfford = !maxed && gold >= cost;
            return (
              <div
                key={r.key}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-700/80 bg-slate-900/90 p-3"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800">
                    {r.icon}
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-white">{r.label}</div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 tabular-nums">
                      <span>Lv {r.lvl}/10</span>
                      <span>·</span>
                      <span className="font-bold text-emerald-400">{r.stat}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!canAfford}
                  onClick={() => onUpgrade(r.key)}
                  className={`flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-black tabular-nums transition-transform active:scale-95 ${
                    maxed
                      ? 'bg-emerald-950 text-emerald-400'
                      : canAfford
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {maxed ? (
                    'MAX'
                  ) : (
                    <>
                      <Coins className="h-3.5 w-3.5" />
                      <span>{cost}</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-1 w-full rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700"
        >
          Done
        </button>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                               Shop Drawer                                  */
/* -------------------------------------------------------------------------- */

export type ShopProductId =
  | 'starter_pack'
  | 'no_ads'
  | 'season_pass'
  | 'pouch_099'
  | 'crate_499'
  | 'daily_chest';

interface ShopDrawerProps {
  progress: PlayerProgress;
  onPurchase: (id: ShopProductId) => void;
  onToggleGoldenSkin: () => void;
  onClose: () => void;
}

export const ShopDrawer: React.FC<ShopDrawerProps> = ({
  progress,
  onPurchase,
  onToggleGoldenSkin,
  onClose,
}) => {
  const [toast, setToast] = useState<string | null>(null);

  const now = Date.now();
  const dailyAvailable = now - progress.lastDailyChestAt >= 24 * 60 * 60 * 1000;

  const buy = (id: ShopProductId, label: string) => {
    onPurchase(id);
    setToast(`Unlocked: ${label}`);
    window.setTimeout(() => setToast(null), 2200);
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: 'rgba(2, 6, 23, 0.84)' }}
    >
      <div
        className="flex max-h-[88dvh] w-full flex-col gap-3 overflow-y-auto rounded-t-3xl border-t border-amber-500/40 p-4 shadow-2xl"
        style={{ backgroundColor: '#0f172a' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white">Royal Armory Shop</h2>
            <p className="text-[11px] text-slate-400">
              Simulated IAP Demo · Instant Unlock
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-bold tabular-nums">
              <span className="flex items-center gap-1 text-amber-300">
                <Coins className="h-3.5 w-3.5" /> {progress.gold}
              </span>
              <span className="flex items-center gap-1 text-sky-300">
                <Gem className="h-3.5 w-3.5" /> {progress.gems}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {toast && (
          <div className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/50 bg-emerald-950/90 py-2 text-xs font-bold text-emerald-300">
            <Check className="h-4 w-4" />
            <span>{toast}</span>
          </div>
        )}

        {/* Daily Chest */}
        <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900 p-3">
          <div className="flex items-center gap-2.5">
            <Gift className="h-6 w-6 text-amber-400" />
            <div>
              <div className="text-xs font-extrabold text-white">
                Daily Supply Chest {progress.isVipNoAds && '(2x VIP!)'}
              </div>
              <div className="text-[11px] text-slate-400">
                {progress.isVipNoAds ? '200 Gold + 30 Gems' : '100 Gold + 15 Gems'}
              </div>
            </div>
          </div>
          <button
            type="button"
            disabled={!dailyAvailable}
            onClick={() => buy('daily_chest', 'Daily Supply Chest')}
            className={`rounded-xl px-3 py-2 text-xs font-black ${
              dailyAvailable
                ? 'bg-emerald-500 text-slate-950 active:scale-95'
                : 'bg-slate-800 text-slate-500'
            }`}
          >
            {dailyAvailable ? 'CLAIM FREE' : 'CLAIMED'}
          </button>
        </div>

        {/* Starter Pack ($1.99 - 5x Value) */}
        <div className="flex flex-col gap-2 rounded-2xl border border-amber-400/60 bg-gradient-to-br from-amber-950/70 to-slate-900 p-3.5">
          <div className="flex items-center justify-between">
            <span className="rounded bg-amber-400 px-2 py-0.5 text-[10px] font-black text-slate-950 uppercase">
              5x Value · Limited
            </span>
            <span className="flex items-center gap-1 text-[11px] font-bold text-amber-300 tabular-nums">
              <Timer className="h-3.5 w-3.5" /> 23:59:42
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-white">Starter Pack</h3>
              <p className="text-[11px] text-amber-200/90">
                500 Gems + 3 Hammers + Golden Bastion Skin
              </p>
            </div>
            {progress.hasStarterPack ? (
              <button
                type="button"
                onClick={onToggleGoldenSkin}
                className="rounded-xl border border-amber-400/60 bg-amber-500/20 px-3 py-2 text-xs font-extrabold text-amber-200"
              >
                {progress.goldenSkinEquipped ? 'Skin: ON' : 'Equip Skin'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => buy('starter_pack', 'Starter Pack + Golden Skin')}
                className="rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-black text-slate-950 active:scale-95"
              >
                $1.99
              </button>
            )}
          </div>
        </div>

        {/* No-Ads Forever ($6.99) */}
        <div className="flex items-center justify-between rounded-xl border border-purple-500/40 bg-slate-900 p-3">
          <div className="flex items-center gap-2.5">
            <Crown className="h-6 w-6 text-purple-400" />
            <div>
              <div className="text-xs font-extrabold text-white">No-Ads Forever VIP</div>
              <div className="text-[11px] text-slate-400">
                Instant ad-free revives + 2x Chest &amp; Level Gold
              </div>
            </div>
          </div>
          <button
            type="button"
            disabled={progress.isVipNoAds}
            onClick={() => buy('no_ads', 'VIP No-Ads Forever')}
            className={`rounded-xl px-3.5 py-2 text-xs font-black ${
              progress.isVipNoAds
                ? 'bg-purple-950 text-purple-300'
                : 'bg-purple-500 text-white active:scale-95'
            }`}
          >
            {progress.isVipNoAds ? 'ACTIVE' : '$6.99'}
          </button>
        </div>

        {/* Season Pass ($4.99) */}
        <div className="flex items-center justify-between rounded-xl border border-sky-500/40 bg-slate-900 p-3">
          <div className="flex items-center gap-2.5">
            <Award className="h-6 w-6 text-sky-400" />
            <div>
              <div className="text-xs font-extrabold text-white">Clockwork Season Pass</div>
              <div className="text-[11px] text-slate-400">
                300 Gems + 2 Hammers + 2 Freezes + 25% Gold
              </div>
            </div>
          </div>
          <button
            type="button"
            disabled={progress.hasSeasonPass}
            onClick={() => buy('season_pass', 'Clockwork Season Pass')}
            className={`rounded-xl px-3.5 py-2 text-xs font-black ${
              progress.hasSeasonPass
                ? 'bg-sky-950 text-sky-300'
                : 'bg-sky-500 text-slate-950 active:scale-95'
            }`}
          >
            {progress.hasSeasonPass ? 'OWNED' : '$4.99'}
          </button>
        </div>

        {/* Booster Bundles */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => buy('pouch_099', 'Tactical Pouch')}
            className="flex flex-col items-start gap-1 rounded-xl border border-slate-700 bg-slate-900 p-3 text-left transition-transform active:scale-95"
          >
            <div className="flex w-full items-center justify-between">
              <Hammer className="h-4 w-4 text-amber-400" />
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-black text-amber-300">
                $0.99
              </span>
            </div>
            <div className="text-xs font-extrabold text-white">Tactical Pouch</div>
            <div className="text-[10px] text-slate-400">
              100 Gems · 2 Hammers · 2 Freezes
            </div>
          </button>

          <button
            type="button"
            onClick={() => buy('crate_499', 'Master Engineer Crate')}
            className="flex flex-col items-start gap-1 rounded-xl border border-amber-500/40 bg-slate-900 p-3 text-left transition-transform active:scale-95"
          >
            <div className="flex w-full items-center justify-between">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="rounded bg-amber-500 px-2 py-0.5 text-[11px] font-black text-slate-950">
                $4.99
              </span>
            </div>
            <div className="text-xs font-extrabold text-white">Engineer Crate</div>
            <div className="text-[10px] text-slate-400">
              600 Gems · 8 Hammers · 8 Freezes
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                         Starter Pack Triggered Modal                       */
/* -------------------------------------------------------------------------- */

interface StarterPackModalProps {
  onBuy: () => void;
  onDismiss: () => void;
}

export const StarterPackModal: React.FC<StarterPackModalProps> = ({
  onBuy,
  onDismiss,
}) => {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(2, 6, 23, 0.88)' }}
    >
      <div
        className="flex w-full max-w-[360px] flex-col items-center gap-3.5 rounded-2xl border-2 border-amber-400 p-5 text-center shadow-2xl"
        style={{ backgroundColor: '#0f172a' }}
      >
        <div className="flex w-full items-center justify-between">
          <span className="rounded bg-amber-400 px-2 py-0.5 text-[10px] font-black text-slate-950 uppercase">
            5x Value Offer
          </span>
          <span className="flex items-center gap-1 text-xs font-bold text-amber-300 tabular-nums">
            <Timer className="h-3.5 w-3.5" /> 23:59:59
          </span>
        </div>

        <Crown className="h-10 w-10 text-amber-400" />

        <div>
          <h2 className="text-xl font-black text-white">
            Royal Bastion Starter Pack
          </h2>
          <p className="mt-1 text-xs text-slate-300">
            Victory reward unlocked! Claim the Golden Bastion look &amp; war chest:
          </p>
        </div>

        <div className="grid w-full grid-cols-3 gap-2 rounded-xl border border-amber-500/30 bg-slate-900 p-3 text-center">
          <div>
            <Gem className="mx-auto h-5 w-5 text-sky-400" />
            <div className="mt-1 text-xs font-black text-white">500</div>
            <div className="text-[10px] text-slate-400">Gems</div>
          </div>
          <div>
            <Hammer className="mx-auto h-5 w-5 text-amber-400" />
            <div className="mt-1 text-xs font-black text-white">3x</div>
            <div className="text-[10px] text-slate-400">Hammers</div>
          </div>
          <div>
            <Sparkles className="mx-auto h-5 w-5 text-yellow-300" />
            <div className="mt-1 text-xs font-black text-white">Gold</div>
            <div className="text-[10px] text-slate-400">Skin</div>
          </div>
        </div>

        <button
          type="button"
          onClick={onBuy}
          className="w-full rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 py-3 text-sm font-black text-slate-950 shadow-lg transition-transform active:scale-95"
        >
          Claim Starter Pack — $1.99
        </button>

        <button
          type="button"
          onClick={onDismiss}
          className="text-xs font-semibold text-slate-400 hover:text-slate-200"
        >
          No thanks, continue
        </button>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                               Settings Modal                               */
/* -------------------------------------------------------------------------- */

interface SettingsModalProps {
  muted: boolean;
  hasStarterPack: boolean;
  goldenSkinEquipped: boolean;
  inGame: boolean;
  onToggleMute: () => void;
  onToggleGoldenSkin: () => void;
  onUnlockAllDemo: () => void;
  onResetSave: () => void;
  onRestartLevel: () => void;
  onReturnToTitle: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  muted,
  hasStarterPack,
  goldenSkinEquipped,
  inGame,
  onToggleMute,
  onToggleGoldenSkin,
  onUnlockAllDemo,
  onResetSave,
  onRestartLevel,
  onReturnToTitle,
  onClose,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(2, 6, 23, 0.85)' }}
    >
      <div
        className="flex w-full max-w-[350px] flex-col gap-3 rounded-2xl border border-slate-700 p-4 shadow-2xl"
        style={{ backgroundColor: '#0f172a' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-white">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleMute}
          className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-slate-200"
        >
          <span>Sound Effects</span>
          <span className="flex items-center gap-1.5 text-amber-300">
            {muted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4" />}
            {muted ? 'Muted' : 'On'}
          </span>
        </button>

        {hasStarterPack && (
          <button
            type="button"
            onClick={onToggleGoldenSkin}
            className="flex items-center justify-between rounded-xl border border-amber-500/40 bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-amber-200"
          >
            <span>Golden Bastion Skin</span>
            <span>{goldenSkinEquipped ? 'Equipped' : 'Off'}</span>
          </button>
        )}

        {inGame && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onRestartLevel();
                onClose();
              }}
              className="rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-bold text-slate-100"
            >
              Restart Level
            </button>
            <button
              type="button"
              onClick={() => {
                onReturnToTitle();
                onClose();
              }}
              className="rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-bold text-slate-100"
            >
              Main Menu
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            onUnlockAllDemo();
            onClose();
          }}
          className="rounded-xl border border-sky-500/40 bg-sky-950/50 py-2.5 text-xs font-bold text-sky-300"
        >
          Unlock All 10 Levels (Demo)
        </button>

        {!confirmReset ? (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-950/40 py-2.5 text-xs font-bold text-rose-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Reset Save Progress</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onResetSave();
                setConfirmReset(false);
                onClose();
              }}
              className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-black text-white"
            >
              Confirm Reset
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-bold text-slate-300"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
