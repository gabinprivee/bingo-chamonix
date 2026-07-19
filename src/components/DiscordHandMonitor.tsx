import React, { useState, useEffect, useRef } from 'react';
import { Monitor, X } from 'lucide-react';
import confetti from 'canvas-confetti';

export function DiscordHandMonitor() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [status, setStatus] = useState<string>('En attente');
  const [detectedUser, setDetectedUser] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);

  const startMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor', // or 'window'
        }
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
        setStatus("Erreur: Permission refusée. Si vous êtes dans l'aperçu, essayez d'ouvrir l'app dans un nouvel onglet.");
      } else {
        setStatus("Erreur: Impossible de capturer l'écran");
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

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || !isMonitoring) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const base64Image = canvas.toDataURL('image/jpeg', 0.5); // compress
    
    try {
      setStatus("Analyse de l'image...");
      const response = await fetch('/api/detect-hand', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageBase64: base64Image })
      });
      
      const data = await response.json();
      
      if (data.result && data.result !== 'NONE' && !data.result.includes('NONE')) {
        setDetectedUser(data.result);
        triggerConfetti();
        // Give some time before dismissing
        setTimeout(() => setDetectedUser(null), 10000);
      }
      setStatus('Surveillance en cours...');
    } catch (err) {
      console.error(err);
      setStatus("Erreur d'analyse");
    }
  };

  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, []);

  return (
    <>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isMonitoring ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
            <Monitor size={20} />
          </div>
          <div>
            <h3 className="font-medium text-sm">Moniteur Discord (Main levée)</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{status}</p>
          </div>
        </div>
        
        <button
          onClick={isMonitoring ? stopMonitoring : startMonitoring}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isMonitoring 
              ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40' 
              : 'bg-primary-50 text-primary-600 hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-400 dark:hover:bg-primary-900/40'
          }`}
        >
          {isMonitoring ? 'Arrêter' : 'Démarrer'}
        </button>
      </div>
      
      {/* Hidden elements for capture */}
      <video ref={videoRef} style={{ display: 'none' }} muted playsInline />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
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
