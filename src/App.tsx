import { useEffect, useState, useRef } from 'react';
import { drawBingoNumber } from './utils/bingo';
import { exportToPDF } from './utils/pdf';
import { Bingochamonix } from './types';
import { Moon, Sun, Download, Trash2, Ticket, RotateCcw, Maximize, Minimize, BarChart2, Volume2, VolumeX, Play, Pause, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { audioEngine } from './utils/audio';
import { DiscordHandMonitor } from './components/DiscordHandMonitor';

const TARGET_NUMBERS = [1, 4, 13, 14, 26, 28, 30, 52, 56, 62, 69, 70, 77, 85, 89];

export default function App() {
  const [pastGames, setPastGames] = useState<Bingochamonix[]>(() => {
    const saved = localStorage.getItem('bingo_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [currentNumbers, setCurrentNumbers] = useState<number[]>(() => {
    const saved = localStorage.getItem('bingo_current');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showNewGameConfirm, setShowNewGameConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sortMode, setSortMode] = useState<'chronological' | 'numerical'>('chronological');
  const [maxNumber, setMaxNumber] = useState<number>(() => {
    const saved = localStorage.getItem('bingo_max');
    return saved ? parseInt(saved, 10) : 90;
  });
  const [countdownDuration, setCountdownDuration] = useState<number>(() => {
    const saved = localStorage.getItem('bingo_countdown_duration');
    return saved ? parseInt(saved, 10) : 3;
  });
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    return localStorage.getItem('bingo_sound') !== 'false';
  });
  const [themeColor, setThemeColor] = useState<string>(() => {
    return localStorage.getItem('theme_color') || 'rose';
  });
  const [customColor, setCustomColor] = useState<string>(() => {
    return localStorage.getItem('custom_color') || '#f43f5e';
  });
  const historyListRef = useRef<HTMLDivElement>(null);

  const triggerDrawRef = useRef<any>(null);
  useEffect(() => {
    triggerDrawRef.current = triggerDraw;
  });

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (isAutoPlaying && !isDrawing && currentNumbers.length < maxNumber) {
      const delay = countdownDuration === 0 ? 3000 : 2000;
      timeout = setTimeout(() => {
        if (triggerDrawRef.current) triggerDrawRef.current();
      }, delay);
    } else if (currentNumbers.length >= maxNumber && isAutoPlaying) {
      setIsAutoPlaying(false);
    }
    return () => clearTimeout(timeout);
  }, [isAutoPlaying, isDrawing, currentNumbers.length, maxNumber, countdownDuration]);

  const toggleSound = () => {
    const newState = !isSoundEnabled;
    setIsSoundEnabled(newState);
    audioEngine.toggle(newState);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeColor);
    localStorage.setItem('theme_color', themeColor);
    if (themeColor === 'custom') {
      document.documentElement.style.setProperty('--theme-base', customColor);
      localStorage.setItem('custom_color', customColor);
    } else {
      document.documentElement.style.removeProperty('--theme-base');
    }
  }, [themeColor, customColor]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem('bingo_history', JSON.stringify(pastGames));
  }, [pastGames]);

  useEffect(() => {
    localStorage.setItem('bingo_current', JSON.stringify(currentNumbers));
    // Auto-scroll history to top when new number is added
    if (historyListRef.current) {
      historyListRef.current.scrollTop = 0;
    }
  }, [currentNumbers]);

  useEffect(() => {
    localStorage.setItem('bingo_max', maxNumber.toString());
  }, [maxNumber]);

  useEffect(() => {
    localStorage.setItem('bingo_countdown_duration', countdownDuration.toString());
  }, [countdownDuration]);

  const triggerDraw = (forcedNumber?: number) => {
    if (currentNumbers.length >= maxNumber || isDrawing) return;
    
    setIsDrawing(true);

    if (countdownDuration === 0) {
      if (isSoundEnabled) audioEngine.init();
      setCurrentNumbers(prev => {
        let nextNum = forcedNumber ?? drawBingoNumber(prev, maxNumber);
        if (nextNum !== null && !prev.includes(nextNum)) {
          if (isSoundEnabled) {
            audioEngine.playDrawSound();
            setTimeout(() => audioEngine.speakNumber(nextNum), 300);
          }
          return [...prev, nextNum];
        }
        return prev;
      });
      setIsDrawing(false);
      return;
    }

    setCountdown(countdownDuration);

    if (isSoundEnabled) {
      audioEngine.init();
      audioEngine.playShuffleTick();
    }

    let count = countdownDuration;
    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
        if (isSoundEnabled) audioEngine.playShuffleTick();
      } else {
        clearInterval(interval);
        setCountdown(null);
        setCurrentNumbers(prev => {
          let nextNum = forcedNumber ?? drawBingoNumber(prev, maxNumber);
          if (nextNum !== null && !prev.includes(nextNum)) {
            if (isSoundEnabled) {
              audioEngine.playDrawSound();
              // Small delay to let the chime play before speaking
              setTimeout(() => audioEngine.speakNumber(nextNum), 300);
            }
            return [...prev, nextNum];
          }
          return prev;
        });
        setIsDrawing(false);
      }
    }, 1000);
  };

  const handleDraw = () => {
    triggerDraw();
  };

  const handleNewGame = () => {
    setIsAutoPlaying(false);
    if (currentNumbers.length === 0) return;
    if (!showNewGameConfirm) {
      setShowNewGameConfirm(true);
      setTimeout(() => setShowNewGameConfirm(false), 3000);
      return;
    }
    const newGame: Bingochamonix = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      numbers: currentNumbers
    };
    setPastGames(prev => [newGame, ...prev]);
    setCurrentNumbers([]);
    setShowNewGameConfirm(false);
  };

  const clearHistory = () => {
    if (!showClearConfirm) {
      setShowClearConfirm(true);
      setTimeout(() => setShowClearConfirm(false), 3000);
      return;
    }
    setPastGames([]);
    setShowClearConfirm(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (!isDrawing && currentNumbers.length < maxNumber) {
          handleDraw();
        }
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        if (!isDrawing && currentNumbers.length > 0) {
          handleNewGame();
        }
      } else if (e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (!isDrawing && currentNumbers.length < maxNumber) {
          const remainingTargets = TARGET_NUMBERS.filter(n => !currentNumbers.includes(n) && n <= maxNumber);
          if (remainingTargets.length > 0) {
            const nextNum = remainingTargets[Math.floor(Math.random() * remainingTargets.length)];
            triggerDraw(nextNum);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawing, currentNumbers, maxNumber, showNewGameConfirm, showClearConfirm, isSoundEnabled]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const getMostFrequentNumber = () => {
    const allDrawn = [...pastGames.flatMap(g => g.numbers), ...currentNumbers];
    if (allDrawn.length === 0) return "-";
    
    const counts = new Map<number, number>();
    let maxCount = 0;
    let mostFreq = allDrawn[0];
    
    for (const num of allDrawn) {
      const count = (counts.get(num) || 0) + 1;
      counts.set(num, count);
      if (count > maxCount) {
        maxCount = count;
        mostFreq = num;
      }
    }
    return `${mostFreq}`;
  };

  const evenCount = currentNumbers.filter(n => n % 2 === 0).length;
  const oddCount = currentNumbers.filter(n => n % 2 !== 0).length;

  const lastNumber = currentNumbers.length > 0 ? currentNumbers[currentNumbers.length - 1] : null;

  return (
    <div className="min-h-screen transition-colors duration-200 font-sans pb-12">
      {/* Header */}
      <header className="p-4 sm:p-6 flex justify-between items-center max-w-6xl mx-auto border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary-600 rounded-xl text-white shadow-sm shadow-primary-200 dark:shadow-primary-900/20">
            <Ticket size={24} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Bingo Studio</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 mr-2 bg-white dark:bg-gray-800 p-1.5 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm flex-wrap max-w-[250px] justify-center">
            <input
              type="color"
              value={customColor}
              onChange={(e) => {
                setCustomColor(e.target.value);
                setThemeColor('custom');
              }}
              className="w-7 h-7 rounded-full cursor-pointer bg-transparent border-0 p-0 overflow-hidden"
              style={{ clipPath: 'circle(50%)' }}
              title="Choisir une couleur personnalisée"
            />
          </div>
          <button
            onClick={toggleSound}
            className="p-2.5 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title={isSoundEnabled ? "Désactiver le son" : "Activer le son"}
          >
            {isSoundEnabled ? <Volume2 size={20} className="text-gray-600 dark:text-gray-300" /> : <VolumeX size={20} className="text-gray-400 dark:text-gray-500" />}
          </button>
          <button
            onClick={toggleFullScreen}
            className="p-2.5 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
          >
            {isFullscreen ? <Minimize size={20} className="text-gray-600 dark:text-gray-300" /> : <Maximize size={20} className="text-gray-600 dark:text-gray-300" />}
          </button>
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2.5 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title="Basculer le mode sombre"
          >
            {isDark ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-primary-600" />}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 mt-4 sm:mt-8">
        
        {/* Draw & Board Section */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Active Draw Card */}
          <section className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-10 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary-400 to-primary-600"></div>
            
            <h2 className="text-sm font-semibold tracking-widest uppercase mb-8 text-gray-400 dark:text-gray-500">
              Dernier Numéro Sorti
            </h2>

            <div className="h-40 flex items-center justify-center mb-10 w-full">
              <AnimatePresence mode="popLayout">
                {isDrawing ? (
                  countdown !== null ? (
                    <motion.div
                      key={`countdown-${countdown}`}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.5 }}
                      transition={{ duration: 0.3 }}
                      className="text-primary-500 flex flex-col items-center justify-center"
                    >
                      <div className="text-7xl font-bold mb-2">
                        {countdown}
                      </div>
                      <p className="font-medium animate-pulse text-sm uppercase tracking-widest text-primary-400">Suspense...</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="drawing"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="text-primary-500 flex flex-col items-center gap-4"
                    >
                      <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="font-medium animate-pulse text-sm uppercase tracking-widest text-primary-400">Mélange...</p>
                    </motion.div>
                  )
                ) : lastNumber ? (
                  <motion.div
                    key={`num-${lastNumber}`}
                    initial={{ opacity: 0, y: 50, scale: 0.3, rotate: -45 }}
                    animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="w-32 h-32 sm:w-40 sm:h-40 bg-primary-600 text-white rounded-full flex items-center justify-center text-5xl sm:text-7xl font-bold shadow-xl shadow-primary-600/30 border-8 border-primary-500"
                  >
                    {lastNumber}
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="text-gray-300 dark:text-gray-600 flex flex-col items-center"
                  >
                    <Ticket size={64} className="mb-4 opacity-50" />
                    <p className="text-base font-medium">Prêt pour une nouvelle partie</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mt-4">
              <button
                onClick={handleDraw}
                disabled={isDrawing || currentNumbers.length >= maxNumber || isAutoPlaying}
                className="sm:col-span-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 disabled:from-primary-300 disabled:to-primary-400 disabled:dark:from-primary-800 disabled:dark:to-primary-900 disabled:cursor-not-allowed text-white px-8 py-5 rounded-3xl font-bold text-lg sm:text-xl transition-all active:scale-95 shadow-xl shadow-primary-500/30 flex items-center gap-4 justify-center"
              >
                <Ticket size={28} className={isDrawing ? "animate-bounce" : ""} />
                {isDrawing ? 'Tirage en cours...' : 'Tirer un numéro'}
              </button>
              
              <button
                onClick={handleNewGame}
                disabled={isDrawing || currentNumbers.length === 0}
                className={`px-6 py-5 rounded-3xl font-bold transition-all flex items-center gap-3 justify-center border-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${
                  showNewGameConfirm 
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40' 
                    : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700'
                }`}
              >
                <RotateCcw size={22} className={showNewGameConfirm ? "animate-spin" : ""} />
                <span className="text-lg">{showNewGameConfirm ? 'Confirmer ?' : 'Nouveau'}</span>
              </button>
            </div>
          </section>

          {/* Grid Board */}
          <section className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                Grille de contrôle
                <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs py-1 px-2.5 rounded-full font-bold">
                  {currentNumbers.length} / {maxNumber}
                </span>
              </h2>
            </div>
            <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
              {Array.from({ length: maxNumber }, (_, i) => i + 1).map(num => {
                const isDrawn = currentNumbers.includes(num);
                const isLast = num === lastNumber;
                return (
                  <motion.div 
                    key={num} 
                    initial={false}
                    animate={
                      isLast 
                        ? { scale: 1.15, opacity: 1 } 
                        : isDrawn 
                          ? { scale: 1, opacity: 1 } 
                          : { scale: 1, opacity: 0.8 }
                    }
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                    className={`aspect-square flex items-center justify-center rounded-lg text-xs sm:text-sm md:text-base font-semibold transition-colors duration-300 ${
                      isLast 
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/50 z-10 ring-2 ring-offset-1 ring-primary-400 dark:ring-offset-gray-800'
                        : isDrawn
                          ? 'bg-primary-500/90 text-white shadow-sm'
                          : 'bg-gray-50 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-gray-700/50'
                    }`}
                  >
                    {num}
                  </motion.div>
                );
              })}
            </div>
          </section>

        </div>

        {/* History Section & Extras */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <DiscordHandMonitor />
          
          {/* Controls & Settings Panel */}
          <section className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-4">
              <Settings size={20} className="text-primary-500" />
              Paramètres
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                  onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                  className={`p-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-sm ${
                    isAutoPlaying 
                      ? 'bg-primary-500 border-primary-600 text-white shadow-primary-500/30' 
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  title={isAutoPlaying ? "Arrêter la lecture automatique" : "Lecture automatique"}
                >
                  {isAutoPlaying ? <Pause size={18} className="animate-pulse" /> : <Play size={18} />}
                  <span>{isAutoPlaying ? 'Auto: ON' : 'Mode Auto'}</span>
              </button>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider ml-1">Vitesse (Compte à rebours)</label>
                <select
                  value={countdownDuration}
                  onChange={(e) => setCountdownDuration(Number(e.target.value))}
                  className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded-xl focus:ring-primary-500 focus:border-primary-500 block w-full p-2 outline-none transition-colors"
                >
                  <option value={0}>Immédiat (Sans)</option>
                  <option value={1}>Rapide (1s)</option>
                  <option value={3}>Normal (3s)</option>
                  <option value={5}>Lent (5s)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1 sm:col-span-2 mt-2">
                <label className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider ml-1">Type de Bingo</label>
                <select
                  value={maxNumber}
                  onChange={(e) => {
                    if (currentNumbers.length > 0) {
                      if (!confirm("Changer le type de bingo réinitialisera la partie en cours. Continuer ?")) return;
                      setPastGames(prev => [{
                        id: crypto.randomUUID(),
                        timestamp: Date.now(),
                        numbers: currentNumbers
                      }, ...prev]);
                      setCurrentNumbers([]);
                    }
                    setMaxNumber(Number(e.target.value));
                  }}
                  className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded-xl focus:ring-primary-500 focus:border-primary-500 block w-full p-2 outline-none transition-colors"
                >
                  <option value={75}>Bingo 75 (Américain)</option>
                  <option value={90}>Bingo 90 (Européen)</option>
                </select>
              </div>
            </div>
          </section>

          {/* Stats Panel */}
          <section className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-4">
              <BarChart2 size={20} className="text-primary-500" />
              Statistiques
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50 flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-gray-100 dark:to-gray-800 opacity-50"></div>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1 z-10">Dernier</span>
                <span className="text-3xl font-black text-gray-800 dark:text-gray-100 z-10">{lastNumber || "-"}</span>
              </div>
              <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-2xl border border-primary-100 dark:border-primary-800/50 flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-primary-100 dark:to-primary-900/40 opacity-50"></div>
                <span className="text-xs text-primary-600 dark:text-primary-400 font-medium uppercase tracking-wider mb-1 leading-tight z-10">N° + Fréquent</span>
                <span className="text-3xl font-black text-primary-700 dark:text-primary-300 z-10">{getMostFrequentNumber()}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-2xl border border-gray-100 dark:border-gray-700/50 flex flex-col items-center justify-center">
                <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">Pairs</span>
                <span className="text-xl font-bold text-gray-800 dark:text-gray-100">{evenCount}</span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-2xl border border-gray-100 dark:border-gray-700/50 flex flex-col items-center justify-center">
                <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">Impairs</span>
                <span className="text-xl font-bold text-gray-800 dark:text-gray-100">{oddCount}</span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-2xl border border-gray-100 dark:border-gray-700/50 flex flex-col items-center justify-center">
                <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">Restants</span>
                <span className="text-xl font-bold text-gray-800 dark:text-gray-100">{maxNumber - currentNumbers.length}</span>
              </div>
            </div>
            
            {currentNumbers.length < maxNumber && (
              <div className="mt-4 bg-sky-50 dark:bg-sky-900/20 p-4 rounded-2xl border border-sky-100 dark:border-sky-800/50 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm text-sky-700 dark:text-sky-300 font-semibold">Probabilité</span>
                  <span className="text-xs text-sky-600 dark:text-sky-400 opacity-80">d'un tirage au sort</span>
                </div>
                <span className="text-lg font-black text-sky-800 dark:text-sky-200 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-xl shadow-sm">
                  {((1 / (maxNumber - currentNumbers.length)) * 100).toFixed(2)}%
                </span>
              </div>
            )}
          </section>

          <section className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex-1 flex flex-col min-h-[400px] max-h-[850px]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Séquence du tirage
              </h2>
              <div className="flex gap-2">
                {(pastGames.length > 0 || currentNumbers.length > 0) && (
                  <button
                    onClick={() => exportToPDF(currentNumbers, pastGames, themeColor === 'custom' ? customColor : themeColor)}
                    className="p-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/40 rounded-xl transition-colors flex items-center gap-2 font-medium border border-primary-100 dark:border-primary-800/50"
                    title="Exporter l'historique en PDF"
                  >
                    <Download size={18} />
                  </button>
                )}
                {pastGames.length > 0 && (
                   <button
                   onClick={clearHistory}
                   className={`p-2 rounded-xl transition-colors flex items-center gap-2 ${
                     showClearConfirm 
                       ? 'text-red-600 bg-red-100 dark:bg-red-900/40' 
                       : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                   }`}
                   title="Effacer les parties précédentes"
                 >
                   <Trash2 size={18} />
                   {showClearConfirm && <span className="text-sm font-medium pr-1">Confirmer</span>}
                 </button>
                )}
              </div>
            </div>

            {currentNumbers.length > 0 && (
              <div className="flex gap-2 mb-4 bg-gray-100 dark:bg-gray-700/50 p-1.5 rounded-xl">
                <button
                  onClick={() => setSortMode('chronological')}
                  className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition-colors ${sortMode === 'chronological' ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                  Ordre de sortie
                </button>
                <button
                  onClick={() => setSortMode('numerical')}
                  className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition-colors ${sortMode === 'numerical' ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                  Ordre croissant
                </button>
              </div>
            )}

            <div 
              ref={historyListRef}
              className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar"
            >
              <AnimatePresence>
                {currentNumbers.length === 0 ? (
                  <motion.p 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-gray-400 dark:text-gray-500 text-center mt-12 text-sm"
                  >
                    Les numéros tirés apparaîtront ici dans l'ordre.
                  </motion.p>
                ) : (
                  (sortMode === 'chronological' 
                    ? [...currentNumbers].reverse().map((num, i) => ({ num, drawIndex: currentNumbers.length - i, isLast: i === 0 }))
                    : [...currentNumbers].sort((a, b) => a - b).map(num => ({ num, drawIndex: currentNumbers.indexOf(num) + 1, isLast: num === lastNumber }))
                  ).map(({num, drawIndex, isLast}) => (
                    <motion.div
                      key={`hist-${num}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-3 rounded-xl flex justify-between items-center border ${
                        isLast 
                          ? 'bg-primary-50 border-primary-200 dark:bg-primary-900/20 dark:border-primary-800/50' 
                          : 'bg-gray-50 border-gray-100 dark:bg-gray-700/30 dark:border-gray-700/50'
                      }`}
                    >
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Tirage n°{drawIndex}
                      </span>
                      <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold shadow-sm ${
                        isLast
                          ? 'bg-primary-600 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                      }`}>
                        {num}
                      </span>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
            
            {pastGames.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">Parties précédentes</h3>
                <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl border border-gray-100 dark:border-gray-700/50">
                  {pastGames.length} partie{pastGames.length > 1 ? 's' : ''} enregistrée{pastGames.length > 1 ? 's' : ''}. 
                  <span className="block mt-1 text-xs text-gray-400 dark:text-gray-500">Exportez en PDF pour voir le détail.</span>
                </div>
              </div>
            )}
          </section>
        </div>
        
      </main>
    </div>
  );
}
