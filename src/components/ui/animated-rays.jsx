// From Vengeance UI (MIT) — https://www.vengenceui.com/components/animated-rays

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function AnimatedRays({ className = '', children }) {
  const checkDark = () => document.documentElement.classList.contains('dark');
  const [isDark, setIsDark] = useState(checkDark);

  useEffect(() => {
    const observer = new MutationObserver(() => setIsDark(checkDark()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const stripes = `repeating-linear-gradient(100deg, var(--stripe-color) 0%, var(--stripe-color) 7%, transparent 10%, transparent 12%, var(--stripe-color) 16%)`;
  const rainbow = `repeating-linear-gradient(100deg, #60a5fa 10%, #e879f9 15%, #60a5fa 20%, #5eead4 25%, #60a5fa 30%)`;

  return (
    <section className={cn('relative w-full h-full overflow-hidden', className)}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `${stripes}, ${rainbow}`,
          backgroundSize: '300%, 200%',
          backgroundPosition: '50% 50%, 50% 50%',
          filter: isDark ? 'blur(10px) opacity(50%) saturate(200%)' : 'blur(10px) invert(100%)',
          maskImage: 'radial-gradient(ellipse at 100% 0%, black 40%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 100% 0%, black 40%, transparent 70%)',
        }}
      >
        <div
          className="absolute inset-0 animate-aurora-bg"
          style={{
            backgroundImage: `${stripes}, ${rainbow}`,
            backgroundSize: '200%, 100%',
            backgroundAttachment: 'fixed',
            mixBlendMode: 'difference',
          }}
        />
      </div>
      {children && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">{children}</div>
      )}
    </section>
  );
}

export default AnimatedRays;
