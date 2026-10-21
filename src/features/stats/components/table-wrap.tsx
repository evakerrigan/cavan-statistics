import { type ReactNode, useEffect, useRef } from 'react';
import styles from './table.module.scss';

/**
 * Card around a table whose header stays pinned to the top of the window
 * while the table scrolls past. `position: sticky` can't do it here: the
 * wrapper scrolls horizontally, which makes it the sticky container instead
 * of the page. So the header cells are shifted down by hand (via the
 * `--sticky-offset` variable on `thead`), never past the last row.
 */
export const TableWrap = ({ children }: { children: ReactNode }) => {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const table = wrap?.querySelector('table');
    const thead = table?.querySelector('thead');
    if (!table || !thead) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const top = table.getBoundingClientRect().top;
      const max = table.offsetHeight - thead.offsetHeight;
      const offset = Math.max(0, Math.min(-top, max));
      thead.style.setProperty('--sticky-offset', `${offset}px`);
      thead.toggleAttribute('data-stuck', offset > 0);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    // Rows expanding or a re-sort change the table height without a scroll.
    const observer = new ResizeObserver(schedule);
    observer.observe(table);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={wrapRef} className={styles.tableWrap}>
      {children}
    </div>
  );
};
