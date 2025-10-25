import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useCamera } from '../hooks/useCamera';
import { VideoDisplay } from './VideoDisplay';
import { ErrorMessage } from './ErrorMessage';

export const DrowsinessDetection: React.FC = () => {
  const { isConnected, error: wsError, lastMessage, connect, sendFrame, disconnect } = useWebSocket();
  const { videoRef, canvasRef, isCameraActive, error: cameraError, startCamera, stopCamera, captureFrame } = useCamera();
  const [isRunning, setIsRunning] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [sketchImage, setSketchImage] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  
  const animationFrameRef = useRef<number>();
  const frameCountRef = useRef<number>(0);
  const fpsUpdateTimeRef = useRef<number>(0);
  
  const isRunningRef = useRef<boolean>(false);
  const isConnectedRef = useRef<boolean>(false);

  // ← Sincronizar refs con estado
  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  const processFrame = useCallback(() => {
    // Usar refs en lugar de state
    if (!isRunningRef.current || !isConnectedRef.current) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const frameBase64 = captureFrame();

    if (frameBase64) {
      sendFrame(frameBase64);
      
      // Contar FPS
      frameCountRef.current++;
      const currentTime = performance.now();
      const fpsElapsed = currentTime - fpsUpdateTimeRef.current;
      if (fpsElapsed >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / fpsElapsed));
        frameCountRef.current = 0;
        fpsUpdateTimeRef.current = currentTime;
      }
    }

    // Continuar loop
    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [captureFrame, sendFrame]); 

  const handleStart = async () => {
    try {
      await startCamera();
      connect();
      setIsRunning(true);
      isRunningRef.current = true; 
      fpsUpdateTimeRef.current = performance.now();
      
      // Esperar a que el video esté listo
      setTimeout(() => {
        animationFrameRef.current = requestAnimationFrame(processFrame);
      }, 500);
    } catch (err) {
      console.error('Error al iniciar:', err);
    }
  };

  const handleStop = () => {
    setIsRunning(false);
    isRunningRef.current = false; 
    stopCamera();
    disconnect();
    setOriginalImage(null);
    setSketchImage(null);
    setFps(0);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.error) {
        console.error('Error del servidor:', lastMessage.error);
      } else {
        setOriginalImage(lastMessage.original_image);
        setSketchImage(lastMessage.sketch_image);
      }
    }
  }, [lastMessage]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      stopCamera();
    };
  }, [stopCamera]);

  const error = cameraError || wsError;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex flex-col items-center justify-center p-8">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted
        className="hidden" 
      />
      <canvas ref={canvasRef} className="hidden" />

      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold text-white mb-2">
          Sistema de Detección de Somnolencia
        </h1>
        <p className="text-gray-400">
          Procesamiento en tiempo real con IA {isRunning && `• ${fps} FPS`}
        </p>
      </div>

      {error && (
        <div className="mb-8 w-full max-w-2xl">
          <ErrorMessage message={error} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <VideoDisplay imageBase64={originalImage} title="Video Original" />
        <VideoDisplay imageBase64={sketchImage} title="Análisis de Puntos" />
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={handleStart}
          disabled={isRunning}
          className={`px-8 py-3 rounded-lg font-bold text-white text-lg transition-all transform hover:scale-105 ${
            isRunning
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 shadow-lg'
          }`}
        >
          {isRunning ? '🔴 Procesando...' : '▶️ Iniciar Detección'}
        </button>

        <button
          onClick={handleStop}
          disabled={!isRunning}
          className={`px-8 py-3 rounded-lg font-bold text-white text-lg transition-all transform hover:scale-105 ${
            !isRunning
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700 shadow-lg'
          }`}
        >
          ⏹️ Detener
        </button>
      </div>

      <div className="flex gap-6 text-white bg-black/30 px-6 py-3 rounded-lg">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isCameraActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}
          />
          <span className="text-sm">Cámara: {isCameraActive ? 'Activa' : 'Inactiva'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}
          />
          <span className="text-sm">Servidor: {isConnected ? 'Conectado' : 'Desconectado'}</span>
        </div>
        {isRunning && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-sm">FPS: {fps}</span>
          </div>
        )}
      </div>

      {lastMessage?.json_report && (
        <details className="mt-8 w-full max-w-4xl">
          <summary className="cursor-pointer bg-black/50 text-white px-4 py-2 rounded-lg hover:bg-black/70">
            📊 Ver Reporte en Tiempo Real (JSON)
          </summary>
          <div className="mt-2 bg-black/80 rounded-lg p-4 text-white">
            <pre className="text-xs overflow-auto max-h-64">
              {JSON.stringify(lastMessage.json_report, null, 2)}
            </pre>
          </div>
        </details>
      )}
    </div>
  );
};