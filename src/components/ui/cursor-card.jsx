// From Vengeance UI — https://www.vengenceui.com/components/cursor-card , this is added as they have policy.

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export function CursorCard({ children, image, description, href = '#', className }) {
  const [isHovered, setIsHovered] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springConfig = { damping: 25, stiffness: 300 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  const handleMouseMove = (e) => {
    x.set(e.clientX - 120);
    y.set(e.clientY + 20);
  };

  const handleMouseEnter = (e) => {
    springX.jump(e.clientX - 120);
    springY.jump(e.clientY + 20);
    handleMouseMove(e);
    setIsHovered(true);
  };

  return (
    <>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'relative inline-block font-bold text-neutral-900 dark:text-neutral-100 transition-colors',
          'hover:bg-orange-100 dark:hover:bg-orange-900/40 rounded px-1 -mx-1',
          className,
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsHovered(false)}
        onMouseMove={handleMouseMove}
      >
        {children}
      </a>

      {createPortal(
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={{ x: springX, y: springY }}
                className="fixed top-0 left-0 pointer-events-none z-50 w-[240px] bg-white dark:bg-neutral-900 p-3 shadow-2xl rounded-xl border border-neutral-200 dark:border-neutral-800"
              >
                <img src={image} alt="" loading="lazy" className="w-full h-auto rounded-md mb-3 object-cover" />
                {description && (
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 m-0 leading-relaxed">{description}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

export default CursorCard;
