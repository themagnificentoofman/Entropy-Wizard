import React, { useEffect, useRef } from 'react';

const MatrixRain: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let intervalId: number | undefined;

    const initMatrix = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const columns = Math.floor(canvas.width / 20);
      const drops: number[] = new Array(columns).fill(1);
      const chars = '0123456789ABCDEF';

      if (intervalId) clearInterval(intervalId);

      intervalId = window.setInterval(() => {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#0ea5e9';
        ctx.font = '15px monospace';

        for (let i = 0; i < drops.length; i++) {
          const text = chars.charAt(Math.floor(Math.random() * chars.length));
          ctx.fillText(text, i * 20, drops[i] * 20);

          if (drops[i] * 20 > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
          }
          drops[i]++;
        }
      }, 50);
    };

    initMatrix();
    window.addEventListener('resize', initMatrix);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('resize', initMatrix);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed top-0 left-0 w-full h-full pointer-events-none opacity-20 z-0"
    />
  );
};

export default MatrixRain;