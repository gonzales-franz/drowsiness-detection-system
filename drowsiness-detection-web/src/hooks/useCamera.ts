import { useRef, useState, useCallback, useEffect } from 'react';

const CAMERA_CONFIG = {
  width: 640,
  height: 480,
  facingMode: 'user' as const,
};

// Helper function to convert Blob to Base64 asynchronously
const blobToBase64 = (blob: Blob): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
        resolve(reader.result.split(',')[1] || null);
      } else {
        resolve(null);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
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

  

  // ASYNCHRONOUS frame capture and encoding
  const captureFrame = useCallback(async (): Promise<string | null> => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.readyState < videoRef.current.HAVE_ENOUGH_DATA) {
      return null;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Ensure canvas dimensions match video or desired capture size
    if (canvas.width !== CAMERA_CONFIG.width || canvas.height !== CAMERA_CONFIG.height) {
      canvas.width = CAMERA_CONFIG.width;
      canvas.height = CAMERA_CONFIG.height;
    }


    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to Blob asynchronously
    return new Promise<string | null>((resolve) => {
      canvas.toBlob(
        async (blob) => {
          if (blob) {
            const base64 = await blobToBase64(blob);
            resolve(base64);
          } else {
            resolve(null);
          }
        },
        'image/jpeg', // MIME type
        0.7 // Quality (adjust as needed, lower might be faster)
      );
    });
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