export function ArrowUpRight({ className = "" }: { className?: string }) {
  return (
    <svg
      width="7"
      height="7"
      viewBox="0 0 7 7"
      fill="none"
      className={className}
    >
      <path
        d="M1 6L6 1M6 1H1M6 1V6"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
