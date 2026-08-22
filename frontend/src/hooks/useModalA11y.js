import { useEffect } from 'react';

/**
 * Shared modal/drawer accessibility behavior: closes on Escape and locks
 * background scroll while open. Apply to any full-screen modal/drawer.
 * Pass `active: false` for modals that are conditionally rendered by a parent
 * but whose hook call site is unconditional (e.g. gated behind local state).
 */
const useModalA11y = (onClose, active = true) => {
  useEffect(() => {
    if (!active) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, active]);
};

export default useModalA11y;
