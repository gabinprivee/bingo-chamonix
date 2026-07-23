import React, { useState, useEffect, useRef } from 'react';
import { Monitor, X } from 'lucide-react';
import confetti from 'canvas-confetti';

export function DiscordHandMonitor() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [status, setStatus] = useState<string>('En attente');
  const [detectedUser, setDetectedUser] = useState<string | null>(null);
  const [debugImage, setDebugImage] = useState<string | null>(null);
  const [participants, setParticipants] = useState<string>("");
  const [manualUser, setManualUser] = useState<string>("");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);

  const startMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      setIsMonitoring(true);
      setStatus('Surveillance en cours...');
      
      stream.getVideoTracks()[0].onended = () => {
        stopMonitoring();
      };
      
      intervalRef.current = window.setInterval(captureAndAnalyze, 5000); // Check every 5s
    } catch (err: any) {
      console.error("Erreur capture d'écran:", err);
      if (err.name === 'NotAllowedError' || err.message.includes('permission')) {
        setStatus("Erreur: Permission de capture d'écran refusée par le navigateur (iframe).");
        setIsMonitoring(false);
      } else {
        setStatus("Erreur: Impossible de capturer l'écran");
        setIsMonitoring(false);
      }
    }
  };

  const stopMonitoring = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsMonitoring(false);
    setStatus('Surveillance arrêtée');
  };

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults, particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults, particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  };

  const handleManualTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUser.trim()) return;
    setDetectedUser(manualUser);
    triggerConfetti();
    setTimeout(() => setDetectedUser(null), 10000);
    setManualUser('');
  };

  const isAnalyzing = useRef(false);
  const captureAndAnalyze = async () => {
    if (isAnalyzing.current) return;
    isAnalyzing.current = true;
    if (!videoRef.current || !canvasRef.current || !isMonitoring) return;
    if (videoRef.current.videoWidth === 0) {
      console.warn("videoWidth is 0");
      setStatus("En attente de la source vidéo...");
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Resize if too large
    const MAX_WIDTH = 1920;
    let width = video.videoWidth;
    let height = video.videoHeight;
    
    if (width > MAX_WIDTH) {
      height = Math.round((height * MAX_WIDTH) / width);
      width = MAX_WIDTH;
    }
    
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, width, height);
    
    const base64Image = canvas.toDataURL('image/jpeg', 0.8); // compress
    
    try {
      setStatus("Analyse de l'image...");
      setDebugImage(base64Image);
      const response = await fetch('/api/detect-hand', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageBase64: base64Image, participants })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Server error");
      }
      
      const resultText = data.result ? data.result.toUpperCase() : "NONE";
            if (resultText && !resultText.includes('NONE') && !resultText.includes('NO ONE') && !resultText.includes('NOBODY')) {
        setDetectedUser(data.result);
        triggerConfetti();
        stopMonitoring();
        // Give some time before dismissing
        setTimeout(() => setDetectedUser(null), 10000);
      }
      setStatus('Surveillance en cours...');
    } catch (err) {
      console.error(err);
      setStatus("Erreur d'analyse: " + (err.message || "Inconnue"));
    } finally {
      isAnalyzing.current = false;
    }
  };

  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, []);

  return (
    <>
      <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl ${isMonitoring ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
            <Monitor size={22} />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-200">Moniteur Discord (Main levée)</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{status}</p>
            {status.includes('Erreur: Permission') && (
              <button 
                onClick={() => window.open(window.location.href, '_blank')}
                className="mt-1 text-xs text-primary-500 hover:text-primary-600 underline font-semibold flex items-center gap-1"
              >
                Ouvrir dans un nouvel onglet pour autoriser
              </button>
            )}
          </div>
        </div>
        
        <button
          onClick={isMonitoring ? stopMonitoring : startMonitoring}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${
            isMonitoring 
               ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20' 
               : 'bg-primary-500 text-white hover:bg-primary-600 shadow-primary-500/20'
          }`}
        >
          {isMonitoring ? 'Arrêter' : 'Démarrer'}
        </button>
      </div>

      <div className="mb-6">
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block uppercase tracking-wider ml-1">
          Liste des participants (Optionnel)
        </label>
        <textarea
          value={participants}
          onChange={(e) => setParticipants(e.target.value)}
          placeholder="Ex: Gabin, Alice, Bob (aide l'IA à trouver qui lève la main)"
          className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded-xl focus:ring-primary-500 focus:border-primary-500 block p-3 outline-none transition-colors"
          rows={2}
          disabled={isMonitoring}
        />
        <p className="text-[10px] text-gray-400 mt-1 ml-1">Séparés par des virgules. Recommandé si la détection échoue.</p>
      </div>
      
      <div className="mb-6">
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block uppercase tracking-wider ml-1">
          Déclenchement Manuel
        </label>
        <form onSubmit={handleManualTrigger} className="flex gap-2">
          <input
            type="text"
            value={manualUser}
            onChange={(e) => setManualUser(e.target.value)}
            placeholder="Entrez un nom ou numéro..."
            className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded-xl focus:ring-primary-500 focus:border-primary-500 block p-3 outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={!manualUser.trim()}
            className="px-4 py-2 bg-purple-500 text-white rounded-xl text-sm font-bold hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-purple-500/20"
          >
            Déclencher
          </button>
        </form>
      </div>

      {debugImage && (
        <div className="mt-2 mb-6 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <span className="uppercase tracking-wider">Aperçu capture Discord</span>
            <button onClick={() => setDebugImage(null)} className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors bg-white dark:bg-gray-700 p-1 rounded-md shadow-sm border border-gray-200 dark:border-gray-600"><X size={14} /></button>
          </div>
          <img src={debugImage} alt="Debug capture" className="w-full max-h-48 object-contain bg-black" />
        </div>
      )}
      
      {/* Hidden elements for capture - avoid display none which can break some browser renderers */}
      <div className="absolute top-0 left-0 w-0 h-0 overflow-hidden opacity-0 pointer-events-none">
        <video ref={videoRef} muted playsInline autoPlay />
        <canvas ref={canvasRef} />
      </div>
      
      {/* Alert Overlay */}
      {detectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/20 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl transform scale-110 flex flex-col items-center pointer-events-auto border-4 border-primary-500">
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-purple-500 mb-2">
              Main Levée !
            </h2>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
              {detectedUser}
            </p>
            <button 
              onClick={() => setDetectedUser(null)}
              className="px-6 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full font-medium transition-colors flex items-center gap-2"
            >
              <X size={18} /> Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
