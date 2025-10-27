import React, { memo, useMemo } from 'react';

interface VideoDisplayProps {
  imageBase64: string | null;
  title: string;
}

export const VideoDisplay = memo<VideoDisplayProps>(({ imageBase64, title }) => {
  // Evitar re-crear el src en cada render
  const imageSrc = useMemo(() => {
    if (!imageBase64) return null;
    return `data:image/jpeg;base64,${imageBase64}`;
  }, [imageBase64]);

  return (
    <div className="flex flex-col items-center space-y-4">
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <div className="border-4 border-white/30 rounded-lg overflow-hidden shadow-2xl bg-gray-900">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={title}
            className="w-[640px] h-[480px] object-cover"
            loading="eager"
            decoding="async"
            style={{
              // Forzar hardware acceleration (elimina parpadeos)
              transform: 'translateZ(0)',
              willChange: 'contents',
              imageRendering: 'crisp-edges',
            }}
          />
        ) : (
          <div className="w-[640px] h-[480px] flex items-center justify-center text-gray-500">
            <div className="text-center">
              <svg
                className="mx-auto h-16 w-16 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <p className="text-sm">Esperando video...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Comparación custom para evitar re-renders innecesarios
  return prevProps.imageBase64 === nextProps.imageBase64 && prevProps.title === nextProps.title;
});

VideoDisplay.displayName = 'VideoDisplay';