import { PlayerProgress, PlayerUpgrades } from '../types/game';

const STORAGE_KEY = 'gear_and_bastion_save_v1';

export const DEFAULT_PROGRESS: PlayerProgress = {
  highestUnlockedLevel: 1,
  currentLevel: 1,
  gold: 120,
  gems: 40,
  hammers: 1,
  freezes: 1,
  upgrades: {
    crossbowDamage: 1,
    fireRate: 1,
    bastionMaxHp: 1,
  },
  isVipNoAds: false,
  hasStarterPack: false,
  hasSeasonPass: false,
  goldenSkinEquipped: false,
  muted: false,
  completedLevels: [],
  lastDailyChestAt: 0,
  firstOfferShownAt: 0,
};

export function loadProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS, upgrades: { ...DEFAULT_PROGRESS.upgrades } };
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>;
    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      upgrades: {
        ...DEFAULT_PROGRESS.upgrades,
        ...(parsed.upgrades ?? {}),
      },
      completedLevels: Array.isArray(parsed.completedLevels) ? parsed.completedLevels : [],
    };
  } catch {
    return { ...DEFAULT_PROGRESS, upgrades: { ...DEFAULT_PROGRESS.upgrades } };
  }
}

export function saveProgress(progress: PlayerProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota errors
  }
}

export function resetSavedProgress(): PlayerProgress {
  const fresh: PlayerProgress = {
    ...DEFAULT_PROGRESS,
    upgrades: { ...DEFAULT_PROGRESS.upgrades },
    completedLevels: [],
  };
  saveProgress(fresh);
  return fresh;
}

export function getUpgradeCost(level: number): number {
  return Math.round(60 * Math.pow(1.42, level - 1));
}

export function getCrossbowDamage(upgrades: PlayerUpgrades): number {
  return 24 + (upgrades.crossbowDamage - 1) * 7;
}

export function getFireInterval(upgrades: PlayerUpgrades): number {
  return Math.max(0.32, 0.85 - (upgrades.fireRate - 1) * 0.055);
}

export function getBastionMaxHp(upgrades: PlayerUpgrades): number {
  return 100 + (upgrades.bastionMaxHp - 1) * 25;
}
