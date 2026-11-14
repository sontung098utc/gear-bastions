import { useCallback, useEffect, useRef, useState } from 'react';
import { soundEngine } from './audio/soundEngine';
import { BoosterBar } from './components/BoosterBar';
import {
  DefeatModal,
  SettingsModal,
  ShopDrawer,
  ShopProductId,
  StarterPackModal,
  UpgradeModal,
  VictoryModal,
} from './components/Modals';
import { TitleScreen } from './components/TitleScreen';
import { TopHud } from './components/TopHud';
import { LEVELS } from './data/levels';
import {
  getBastionMaxHp,
  getUpgradeCost,
  loadProgress,
  resetSavedProgress,
  saveProgress,
} from './state/storage';
import { BastionScene } from './three/BastionScene';
import {
  ActiveBoosterMode,
  GamePhase,
  HudSnapshot,
  LevelConfig,
  PlayerProgress,
  PlayerUpgrades,
} from './types/game';

const INITIAL_HUD: HudSnapshot = {
  hp: 100,
  maxHp: 100,
  waveIndex: 1,
  totalWaves: 1,
  enemiesRemaining: 0,
  tapsUsed: 0,
  timeRemaining: null,
  freezeRemaining: 0,
  activeDefenses: [],
  puzzleSolved: false,
  rotatedToBack: false,
};

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const floatingLayerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<BastionScene | null>(null);

  const [progress, setProgress] = useState<PlayerProgress>(() => loadProgress());
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const [phase, setPhase] = useState<GamePhase>('title');
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const [activeLevel, setActiveLevel] = useState<LevelConfig>(LEVELS[0]);
  const activeLevelRef = useRef(activeLevel);
  activeLevelRef.current = activeLevel;

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [boosterMode, setBoosterMode] = useState<ActiveBoosterMode>('none');
  const [defeatReason, setDefeatReason] = useState<'hp' | 'timeout'>('hp');

  const [lastVictoryRewards, setLastVictoryRewards] = useState({
    gold: 0,
    gems: 0,
    bonusGold: 0,
  });

  // Modal states
  const [showUpgrades, setShowUpgrades] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStarterOffer, setShowStarterOffer] = useState(false);

  // Sync mute & save whenever progress changes
  useEffect(() => {
    soundEngine.setMuted(progress.muted);
    saveProgress(progress);
    engineRef.current?.setUpgrades(progress.upgrades);
    engineRef.current?.setGoldenSkin(progress.goldenSkinEquipped);
  }, [progress]);

  // Pause 3D combat loop when modal is open
  useEffect(() => {
    const modalOpen = showUpgrades || showShop || showSettings || showStarterOffer;
    engineRef.current?.setPaused(modalOpen || phase !== 'playing');
  }, [showUpgrades, showShop, showSettings, showStarterOffer, phase]);

  const spawnFloatingText = useCallback(
    (x: number, y: number, text: string, color: string) => {
      const layer = floatingLayerRef.current;
      if (!layer) return;
      const el = document.createElement('div');
      el.className = 'floating-dmg';
      el.textContent = text;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.color = color;
      layer.appendChild(el);
      window.setTimeout(() => {
        if (el.parentNode === layer) layer.removeChild(el);
      }, 860);
    },
    []
  );

  // Mount Three.js engine once
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const engine = new BastionScene(container, {
      onHudUpdate: (snapshot) => {
        setHud(snapshot);
      },
      onVictory: (snapshot) => {
        setHud(snapshot);
        setBoosterMode('none');
        setPhase('victory');

        const lvl = activeLevelRef.current;
        const p = progressRef.current;
        const goldMultiplier = (p.isVipNoAds ? 2 : 1) * (p.hasSeasonPass ? 1.25 : 1);
        const bonusGold =
          lvl.efficiencyTapLimit && snapshot.tapsUsed <= lvl.efficiencyTapLimit
            ? lvl.efficiencyBonusGold ?? 0
            : 0;
        const goldEarned = Math.round(lvl.rewardGold * goldMultiplier) + bonusGold;
        const gemsEarned = lvl.rewardGems;

        setLastVictoryRewards({
          gold: goldEarned,
          gems: gemsEarned,
          bonusGold,
        });

        setProgress((prev) => {
          const completed = prev.completedLevels.includes(lvl.id)
            ? prev.completedLevels
            : [...prev.completedLevels, lvl.id];
          const nextUnlocked = Math.min(
            LEVELS.length,
            Math.max(prev.highestUnlockedLevel, lvl.id + 1)
          );
          return {
            ...prev,
            gold: prev.gold + goldEarned,
            gems: prev.gems + gemsEarned,
            completedLevels: completed,
            highestUnlockedLevel: nextUnlocked,
            currentLevel: Math.min(LEVELS.length, lvl.id + 1),
          };
        });

        if (lvl.triggersStarterPack && !p.hasStarterPack) {
          window.setTimeout(() => {
            setShowStarterOffer(true);
          }, 650);
        }
      },
      onDefeat: (snapshot, reason) => {
        setHud(snapshot);
        setBoosterMode('none');
        setDefeatReason(reason);
        setPhase('defeat');
      },
      onBoosterConsumed: (booster) => {
        if (booster === 'hammer') {
          setBoosterMode('none');
          setProgress((prev) => ({
            ...prev,
            hammers: Math.max(0, prev.hammers - 1),
          }));
        }
      },
      onFloatingText: spawnFloatingText,
    });

    engine.setGoldenSkin(progressRef.current.goldenSkinEquipped);
    engine.showTitleDiorama();
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [spawnFloatingText]);

  const startLevel = useCallback((levelId: number) => {
    soundEngine.unlock();
    const level = LEVELS.find((l) => l.id === levelId) ?? LEVELS[0];
    setActiveLevel(level);
    setBoosterMode('none');
    setShowUpgrades(false);
    setShowShop(false);
    setShowSettings(false);
    setShowStarterOffer(false);

    if (level.grantsFreeHammer) {
      setProgress((prev) => ({ ...prev, hammers: prev.hammers + 1 }));
    }

    const p = progressRef.current;
    const maxHp = getBastionMaxHp(p.upgrades);
    setHud({
      ...INITIAL_HUD,
      hp: maxHp,
      maxHp,
      totalWaves: level.waves.length,
      timeRemaining: level.timeLimitSeconds ?? null,
    });
    setPhase('playing');
    engineRef.current?.loadLevel(level, p.upgrades, true);
  }, []);

  const returnToTitle = useCallback(() => {
    setBoosterMode('none');
    setPhase('title');
    engineRef.current?.showTitleDiorama();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phaseRef.current === 'title' && (e.key === 'Enter' || e.key === ' ')) {
        if (!showShop && !showUpgrades && !showSettings) {
          e.preventDefault();
          startLevel(Math.min(LEVELS.length, progressRef.current.currentLevel));
        }
      } else if (e.key === 'r' || e.key === 'R') {
        engineRef.current?.resetCamera();
      } else if (e.key === 'm' || e.key === 'M') {
        setProgress((prev) => ({ ...prev, muted: !prev.muted }));
      } else if (e.key === 'Escape' && phaseRef.current === 'playing') {
        setShowSettings((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [startLevel, showShop, showUpgrades, showSettings]);

  const handleToggleHammer = () => {
    soundEngine.unlock();
    if (boosterMode === 'hammer') {
      setBoosterMode('none');
      engineRef.current?.setBoosterMode('none');
      return;
    }
    if (progress.hammers <= 0) return;
    setBoosterMode('hammer');
    engineRef.current?.setBoosterMode('hammer');
  };

  const handleUseFreeze = () => {
    soundEngine.unlock();
    if (progress.freezes <= 0 || hud.freezeRemaining > 0) return;
    setProgress((prev) => ({ ...prev, freezes: Math.max(0, prev.freezes - 1) }));
    engineRef.current?.activateFreeze(8);
  };

  const handleUpgrade = (key: keyof PlayerUpgrades) => {
    soundEngine.unlock();
    setProgress((prev) => {
      const curLvl = prev.upgrades[key];
      if (curLvl >= 10) return prev;
      const cost = getUpgradeCost(curLvl);
      if (prev.gold < cost) return prev;
      soundEngine.playPurchase();
      return {
        ...prev,
        gold: prev.gold - cost,
        upgrades: {
          ...prev.upgrades,
          [key]: curLvl + 1,
        },
      };
    });
  };

  const handleShopPurchase = (id: ShopProductId) => {
    soundEngine.unlock();
    soundEngine.playPurchase();
    setProgress((prev) => {
      switch (id) {
        case 'daily_chest': {
          const mult = prev.isVipNoAds ? 2 : 1;
          return {
            ...prev,
            gold: prev.gold + 100 * mult,
            gems: prev.gems + 15 * mult,
            lastDailyChestAt: Date.now(),
          };
        }
        case 'starter_pack':
          return {
            ...prev,
            hasStarterPack: true,
            goldenSkinEquipped: true,
            gems: prev.gems + 500,
            hammers: prev.hammers + 3,
          };
        case 'no_ads':
          return {
            ...prev,
            isVipNoAds: true,
          };
        case 'season_pass':
          return {
            ...prev,
            hasSeasonPass: true,
            gems: prev.gems + 300,
            hammers: prev.hammers + 2,
            freezes: prev.freezes + 2,
          };
        case 'pouch_099':
          return {
            ...prev,
            gems: prev.gems + 100,
            hammers: prev.hammers + 2,
            freezes: prev.freezes + 2,
          };
        case 'crate_499':
          return {
            ...prev,
            gems: prev.gems + 600,
            hammers: prev.hammers + 8,
            freezes: prev.freezes + 8,
          };
      }
    });
  };

  const handleRevive = () => {
    setPhase('playing');
    engineRef.current?.reviveBastion(0.55, 10);
  };

  const handleDefeatTacticalBooster = () => {
    if (progress.freezes > 0) {
      setProgress((prev) => ({ ...prev, freezes: prev.freezes - 1 }));
      setPhase('playing');
      engineRef.current?.reviveBastion(0.45, 8);
    } else if (progress.gems >= 30) {
      setProgress((prev) => ({ ...prev, gems: prev.gems - 30 }));
      setPhase('playing');
      engineRef.current?.reviveBastion(0.45, 8);
    }
  };

  return (
    <div className="flex h-[100dvh] w-full items-center justify-center bg-slate-950">
      {/* Crisp 9:16 Portrait Mobile Frame (full-screen on mobile, centered on desktop) */}
      <div className="relative h-[100dvh] w-full max-w-[430px] overflow-hidden bg-slate-900 shadow-[0_0_60px_rgba(0,0,0,0.9)] sm:border-x sm:border-slate-800">
        {/* Isolated 3D WebGL Mount */}
        <div ref={canvasContainerRef} className="absolute inset-0" />

        {/* Imperative Floating Damage Layer (Zero React re-renders) */}
        <div
          ref={floatingLayerRef}
          className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
        />

        {/* Title Screen */}
        {phase === 'title' && (
          <TitleScreen
            progress={progress}
            onStartLevel={startLevel}
            onOpenShop={() => setShowShop(true)}
            onOpenUpgrades={() => setShowUpgrades(true)}
            onOpenSettings={() => setShowSettings(true)}
          />
        )}

        {/* Active Gameplay HUD */}
        {phase !== 'title' && (
          <>
            <TopHud
              level={activeLevel}
              hud={hud}
              gold={progress.gold}
              gems={progress.gems}
              muted={progress.muted}
              isVip={progress.isVipNoAds}
              onToggleMute={() =>
                setProgress((prev) => ({ ...prev, muted: !prev.muted }))
              }
              onOpenShop={() => setShowShop(true)}
              onOpenSettings={() => setShowSettings(true)}
            />

            <BoosterBar
              hammers={progress.hammers}
              freezes={progress.freezes}
              boosterMode={boosterMode}
              freezeActive={hud.freezeRemaining > 0}
              activeDefenses={hud.activeDefenses}
              allDefenses={activeLevel.defenses}
              onToggleHammer={handleToggleHammer}
              onUseFreeze={handleUseFreeze}
              onResetCamera={() => engineRef.current?.resetCamera()}
              onOpenUpgrades={() => setShowUpgrades(true)}
            />
          </>
        )}

        {/* Victory Modal */}
        {phase === 'victory' && (
          <VictoryModal
            level={activeLevel}
            hud={hud}
            goldEarned={lastVictoryRewards.gold}
            gemsEarned={lastVictoryRewards.gems}
            efficiencyBonusEarned={lastVictoryRewards.bonusGold}
            isVip={progress.isVipNoAds}
            onNextLevel={() => {
              if (activeLevel.id < LEVELS.length) {
                startLevel(activeLevel.id + 1);
              } else {
                returnToTitle();
              }
            }}
            onOpenUpgrades={() => setShowUpgrades(true)}
            onBackToTitle={returnToTitle}
          />
        )}

        {/* Defeat / Pinch Point Modal */}
        {phase === 'defeat' && (
          <DefeatModal
            level={activeLevel}
            reason={defeatReason}
            freezes={progress.freezes}
            gems={progress.gems}
            isVip={progress.isVipNoAds}
            onReviveSuccess={handleRevive}
            onUseTacticalBooster={handleDefeatTacticalBooster}
            onRetry={() => startLevel(activeLevel.id)}
            onBackToTitle={returnToTitle}
          />
        )}

        {/* Upgrade Modal */}
        {showUpgrades && (
          <UpgradeModal
            gold={progress.gold}
            upgrades={progress.upgrades}
            onUpgrade={handleUpgrade}
            onClose={() => setShowUpgrades(false)}
          />
        )}

        {/* Shop Drawer */}
        {showShop && (
          <ShopDrawer
            progress={progress}
            onPurchase={handleShopPurchase}
            onToggleGoldenSkin={() =>
              setProgress((prev) => ({
                ...prev,
                goldenSkinEquipped: !prev.goldenSkinEquipped,
              }))
            }
            onClose={() => setShowShop(false)}
          />
        )}

        {/* Starter Pack Triggered Offer (Level 10 Victory) */}
        {showStarterOffer && !progress.hasStarterPack && (
          <StarterPackModal
            onBuy={() => {
              handleShopPurchase('starter_pack');
              setShowStarterOffer(false);
            }}
            onDismiss={() => setShowStarterOffer(false)}
          />
        )}

        {/* Settings Modal */}
        {showSettings && (
          <SettingsModal
            muted={progress.muted}
            hasStarterPack={progress.hasStarterPack}
            goldenSkinEquipped={progress.goldenSkinEquipped}
            inGame={phase !== 'title'}
            onToggleMute={() =>
              setProgress((prev) => ({ ...prev, muted: !prev.muted }))
            }
            onToggleGoldenSkin={() =>
              setProgress((prev) => ({
                ...prev,
                goldenSkinEquipped: !prev.goldenSkinEquipped,
              }))
            }
            onUnlockAllDemo={() =>
              setProgress((prev) => ({
                ...prev,
                highestUnlockedLevel: LEVELS.length,
              }))
            }
            onResetSave={() => {
              const fresh = resetSavedProgress();
              setProgress(fresh);
              returnToTitle();
            }}
            onRestartLevel={() => startLevel(activeLevel.id)}
            onReturnToTitle={returnToTitle}
            onClose={() => setShowSettings(false)}
          />
        )}
      </div>
    </div>
  );
}
