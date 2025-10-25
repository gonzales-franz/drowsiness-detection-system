import { useRef, useState, useCallback, useEffect } from 'react';

const CAMERA_CONFIG = {
  width: 640,
  height: 480,
  facingMode: 'user' as const,
};

export const useCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: CAMERA_CONFIG.width },
          height: { ideal: CAMERA_CONFIG.height },
          facingMode: CAMERA_CONFIG.facingMode,
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
        setError(null);
      }
    } catch (err) {
      console.error('Error al acceder a la cámara:', err);
      setError('No se pudo acceder a la cámara. Verifica los permisos.');
      setIsCameraActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // SIMPLE: Usar toDataURL sincrónico
  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (video.readyState !== video.HAVE_ENOUGH_DATA) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = CAMERA_CONFIG.width;
    canvas.height = CAMERA_CONFIG.height;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
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