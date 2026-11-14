export type BastionFace = 'front' | 'left' | 'right' | 'back';

export type DefenseType = 'crossbow' | 'flame' | 'cannon';

export type EnemyType = 'raider' | 'shield' | 'heavy' | 'boss';

export type GamePhase = 'title' | 'playing' | 'paused' | 'victory' | 'defeat';

export type ActiveBoosterMode = 'none' | 'hammer';

export interface PinDef {
  id: string;
  face: BastionFace;
  /** Local position relative to Bastion keep center (y is height from plinth) */
  position: [number, number, number];
  /** Local slide direction vector when pulled */
  slideDir: [number, number, number];
  /** Length of pin shaft */
  length?: number;
  /** Pin IDs or Bar IDs that must be removed before this pin can be pulled */
  blockedBy: string[];
  /** Visual color variant */
  woodTone?: 'oak' | 'walnut' | 'master';
  /** Master lock badge for Level 10 */
  isMasterLock?: boolean;
  /** Which defense this pin contributes to unlocking */
  unlocksDefense?: DefenseType;
}

export interface BarDef {
  id: string;
  face: BastionFace;
  position: [number, number, number];
  /** Rotation in radians [x, y, z] */
  rotation?: [number, number, number];
  length: number;
  /** Pin IDs that hold this bar in place; once all are pulled, the bar drops away */
  heldByPins: string[];
}

export interface GearDef {
  id: string;
  face: BastionFace;
  /** Socket position on Bastion wall */
  socketPosition: [number, number, number];
  /** Initial position if loose (sits on pedestal/ledge before snapping) */
  loosePosition?: [number, number, number];
  /** 'rusty' requires 2 taps; 'loose' requires 1 tap to snap into socket; 'driven' spins once pins/gears clear */
  kind: 'rusty' | 'loose' | 'driven';
  radius?: number;
  /** IDs of pins/gears that block this gear from engaging */
  blockedBy?: string[];
  /** Defense activated when this gear engages */
  activatesDefense?: DefenseType;
}

export interface WaveSpawn {
  delay: number;
  type: EnemyType;
  count: number;
  interval: number;
  pathIndex?: 0 | 1;
}

export interface LevelConfig {
  id: number;
  title: string;
  subtitle: string;
  hint?: string;
  /** Defenses present in this level */
  defenses: DefenseType[];
  /** Defenses that start already active without puzzle requirements (usually none, or Lv1 partial) */
  initiallyActiveDefenses?: DefenseType[];
  pins: PinDef[];
  bars: BarDef[];
  gears: GearDef[];
  waves: WaveSpawn[];
  /** Optional tap limit for efficiency bonus chest (Level 6) */
  efficiencyTapLimit?: number;
  efficiencyBonusGold?: number;
  /** Optional countdown timer in seconds (Level 9) */
  timeLimitSeconds?: number;
  /** Dual spawn paths (Level 9) */
  dualPath?: boolean;
  /** Free Hammer granted on level start (Level 7) */
  grantsFreeHammer?: boolean;
  /** Reward on victory */
  rewardGold: number;
  rewardGems: number;
  /** Opens Upgrade Modal callout after victory (Level 5) */
  introducesUpgrades?: boolean;
  /** Triggers Starter Pack offer after victory (Level 10) */
  triggersStarterPack?: boolean;
}

export interface PlayerUpgrades {
  crossbowDamage: number; // Lv 1..10
  fireRate: number;       // Lv 1..10
  bastionMaxHp: number;   // Lv 1..10
}

export interface PlayerProgress {
  highestUnlockedLevel: number;
  currentLevel: number;
  gold: number;
  gems: number;
  hammers: number;
  freezes: number;
  upgrades: PlayerUpgrades;
  isVipNoAds: boolean;
  hasStarterPack: boolean;
  hasSeasonPass: boolean;
  goldenSkinEquipped: boolean;
  muted: boolean;
  completedLevels: number[];
  lastDailyChestAt: number;
  firstOfferShownAt: number;
}

export interface HudSnapshot {
  hp: number;
  maxHp: number;
  waveIndex: number;
  totalWaves: number;
  enemiesRemaining: number;
  tapsUsed: number;
  timeRemaining: number | null;
  freezeRemaining: number;
  activeDefenses: DefenseType[];
  puzzleSolved: boolean;
  rotatedToBack: boolean;
}

export interface FloatingDamageItem {
  id: number;
  screenX: number;
  screenY: number;
  text: string;
  color: string;
  createdAt: number;
}
