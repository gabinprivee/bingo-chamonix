import { useEffect, useState, useRef } from 'react';
import { drawBingoNumber } from './utils/bingo';
import { exportToPDF } from './utils/pdf';
import { BingoGame } from './types';
import { Moon, Sun, Download, Trash2, Ticket, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [pastGames, setPastGames] = useState<BingoGame[]>(() => {
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
  const [showNewGameConfirm, setShowNewGameConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const historyListRef = useRef<HTMLDivElement>(null);

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

  const handleDraw = () => {
    if (currentNumbers.length >= 90) return;
    
    setIsDrawing(true);
    setTimeout(() => {
      const newNum = drawBingoNumber(currentNumbers);
      if (newNum !== null) {
        setCurrentNumbers(prev => [...prev, newNum]);
      }
      setIsDrawing(false);
    }, 600);
  };

  const handleNewGame = () => {
    if (currentNumbers.length === 0) return;
    if (!showNewGameConfirm) {
      setShowNewGameConfirm(true);
      setTimeout(() => setShowNewGameConfirm(false), 3000);
      return;
    }
    const newGame: BingoGame = {
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

  const lastNumber = currentNumbers.length > 0 ? currentNumbers[currentNumbers.length - 1] : null;

  return (
    <div className="min-h-screen transition-colors duration-200 font-sans pb-12">
      {/* Header */}
      <header className="p-4 sm:p-6 flex justify-between items-center max-w-6xl mx-auto border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-600 rounded-xl text-white shadow-sm shadow-rose-200 dark:shadow-rose-900/20">
            <Ticket size={24} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Bingo Studio</h1>
        </div>
        <button
          onClick={() => setIsDark(!isDark)}
          className="p-2.5 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          aria-label="Basculer le mode sombre"
        >
          {isDark ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-rose-600" />}
        </button>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 mt-4 sm:mt-8">
        
        {/* Draw & Board Section */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Active Draw Card */}
          <section className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-10 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-400 to-rose-600"></div>
            
            <h2 className="text-sm font-semibold tracking-widest uppercase mb-8 text-gray-400 dark:text-gray-500">
              Dernier Numéro Sorti
            </h2>

            <div className="h-40 flex items-center justify-center mb-10 w-full">
              <AnimatePresence mode="popLayout">
                {isDrawing ? (
                  <motion.div
                    key="drawing"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="text-rose-500 flex flex-col items-center gap-4"
                  >
                    <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="font-medium animate-pulse text-sm uppercase tracking-widest text-rose-400">Mélange...</p>
                  </motion.div>
                ) : lastNumber ? (
                  <motion.div
                    key={`num-${lastNumber}`}
                    initial={{ opacity: 0, y: 50, scale: 0.3, rotate: -45 }}
                    animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="w-32 h-32 sm:w-40 sm:h-40 bg-rose-600 text-white rounded-full flex items-center justify-center text-5xl sm:text-7xl font-bold shadow-xl shadow-rose-600/30 border-8 border-rose-500"
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

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <button
                onClick={handleDraw}
                disabled={isDrawing || currentNumbers.length >= 90}
                className="bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 disabled:cursor-not-allowed text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all active:scale-95 shadow-lg shadow-rose-600/20 flex items-center gap-3 justify-center min-w-[220px]"
              >
                <Ticket size={24} className={isDrawing ? "animate-bounce" : ""} />
                {isDrawing ? 'Tirage...' : 'Tirer un numéro'}
              </button>
              
              <button
                onClick={handleNewGame}
                disabled={isDrawing || currentNumbers.length === 0}
                className={`px-6 py-4 rounded-2xl font-semibold transition-all flex items-center gap-3 justify-center border-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  showNewGameConfirm 
                    ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40' 
                    : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700'
                }`}
              >
                <RotateCcw size={20} />
                {showNewGameConfirm ? 'Confirmer ?' : 'Nouvelle Partie'}
              </button>
            </div>
          </section>

          {/* 90 Grid Board */}
          <section className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                Grille de contrôle
                <span className="bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-xs py-1 px-2.5 rounded-full font-bold">
                  {currentNumbers.length} / 90
                </span>
              </h2>
            </div>
            <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
              {Array.from({ length: 90 }, (_, i) => i + 1).map(num => {
                const isDrawn = currentNumbers.includes(num);
                const isLast = num === lastNumber;
                return (
                  <div 
                    key={num} 
                    className={`aspect-square flex items-center justify-center rounded-lg text-xs sm:text-sm md:text-base font-semibold transition-all duration-300 ${
                      isLast 
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/40 scale-110 z-10 ring-2 ring-white dark:ring-gray-800'
                        : isDrawn
                          ? 'bg-rose-500/90 text-white shadow-sm'
                          : 'bg-gray-50 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-gray-700/50'
                    }`}
                  >
                    {num}
                  </div>
                );
              })}
            </div>
          </section>

        </div>

        {/* History Section */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <section className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex-1 flex flex-col min-h-[500px] max-h-[850px]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Séquence du tirage
              </h2>
              <div className="flex gap-2">
                {(pastGames.length > 0 || currentNumbers.length > 0) && (
                  <button
                    onClick={() => exportToPDF(currentNumbers, pastGames)}
                    className="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl transition-colors flex items-center gap-2 font-medium border border-rose-100 dark:border-rose-800/50"
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
                  [...currentNumbers].reverse().map((num, index) => (
                    <motion.div
                      key={`hist-${num}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-3 rounded-xl flex justify-between items-center border ${
                        index === 0 
                          ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800/50' 
                          : 'bg-gray-50 border-gray-100 dark:bg-gray-700/30 dark:border-gray-700/50'
                      }`}
                    >
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Tirage n°{currentNumbers.length - index}
                      </span>
                      <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold shadow-sm ${
                        index === 0
                          ? 'bg-rose-600 text-white'
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
