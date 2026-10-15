export function Logo({ large = false }: { large?: boolean }) {
  const height = large ? 36 : 18;
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={height * 1.8} height={height} viewBox="0 0 36 20" aria-hidden="true">
        <path
          d="M1 12 C5 12 6 4 10 4 C14 4 15 16 19 16 C23 16 24 8 28 8 C31 8 33 11 35 11"
          fill="none"
          stroke="var(--wave)"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
      <span className={large ? 'text-[24px] leading-8 font-semibold tracking-tight' : 'text-[16px] leading-6 font-semibold tracking-tight'}>
        Stillpoint
      </span>
    </span>
  );
}
