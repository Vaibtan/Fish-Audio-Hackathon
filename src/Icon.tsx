type IconName = 'sound' | 'headphones' | 'arrow' | 'play' | 'stop' | 'shield' | 'check' | 'swap' | 'lock' | 'spark';

/** Small, consistently drawn UI pictograms. Labels belong to their controls. */
export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    sound: <><path d="M4 10v4m4-8v12m4-15v18m4-15v12m4-8v4"/></>,
    headphones: <><path d="M4 14v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="12" width="4" height="8" rx="2"/><rect x="17" y="12" width="4" height="8" rx="2"/></>,
    arrow: <path d="M4 12h15m-6-6 6 6-6 6"/>,
    play: <path d="m8 4 12 8-12 8Z"/>,
    stop: <rect x="6" y="6" width="12" height="12" rx="1"/>,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9S4 17 4 12V6Z"/><path d="m8 12 3 3 5-6"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    swap: <><path d="M3 7h17m-5-5 5 5-5 5M21 17H4m5-5-5 5 5 5"/></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 4v3"/></>,
    spark: <path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"/>,
  };
  return <svg className={`icon ${className}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
