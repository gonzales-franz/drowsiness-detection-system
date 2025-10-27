import { useRef, useState, useCallback, useEffect } from 'react';

const CAMERA_CONFIG = {
  width: 640,
  height: 480,
  facingMode: 'user' as const,
  frameRate: 30,
};

export const useCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      // Asegurar que no hay stream previo
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: CAMERA_CONFIG.width },
          height: { ideal: CAMERA_CONFIG.height },
          facingMode: CAMERA_CONFIG.facingMode,
          frameRate: { ideal: CAMERA_CONFIG.frameRate },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Esperar a que el video esté completamente listo
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error('Video ref no disponible'));
            return;
          }

          const video = videoRef.current;
          
          video.onloadedmetadata = () => {
            video.play()
              .then(() => {
                // Verificar que el video tenga dimensiones válidas
                if (video.videoWidth > 0 && video.videoHeight > 0) {
                  resolve();
                } else {
                  reject(new Error('Video sin dimensiones válidas'));
                }
              })
              .catch(reject);
          };

          video.onerror = () => {
            reject(new Error('Error al cargar video'));
          };

          // Timeout de seguridad
          setTimeout(() => {
            reject(new Error('Timeout al iniciar video'));
          }, 5000);
        });

        streamRef.current = stream;
        setIsCameraActive(true);
        setError(null);
      }
    } catch (err) {
      console.error('Error al acceder a la cámara:', err);
      setError('No se pudo acceder a la cámara. Verifica los permisos.');
      setIsCameraActive(false);
      
      // Limpiar en caso de error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    console.log('🛑 Deteniendo cámara...');
    
    // Detener todos los tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        console.log(`Deteniendo track: ${track.kind}`);
        track.stop();
      });
      streamRef.current = null;
    }

    // Limpiar video element completamente
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current.load(); // ← CRÍTICO: Resetear el elemento video
    }

    // Limpiar canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }

    setIsCameraActive(false);
    console.log('Cámara detenida completamente');
  }, []);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Validaciones estrictas
    if (!video || !canvas) return null;
    if (!streamRef.current) return null; // Verificar que hay stream activo
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return null;
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;

    const ctx = canvas.getContext('2d', {
      alpha: false,
      willReadFrequently: false,
    });

    if (!ctx) return null;

    // Asegurar dimensiones correctas
    if (canvas.width !== CAMERA_CONFIG.width || canvas.height !== CAMERA_CONFIG.height) {
      canvas.width = CAMERA_CONFIG.width;
      canvas.height = CAMERA_CONFIG.height;
    }

    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      return dataUrl.split(',')[1];
    } catch (err) {
      console.error('Error al capturar frame:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    canvasRef,
    isCameraActive,
    error,
    startCamera,
    stopCamera,
    captureFrame,
  };
};