type Props = {
  className?: string;
};

export function BrandMark({ className }: Props) {
  return (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="7.5" className="fill-primary" />
      <path
        d="M7 13 C 10 9, 13 9, 16 13 S 22 17, 25 13"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-[hsl(var(--primary-foreground))]"
      />
      <path
        d="M7 21 C 10 17, 13 17, 16 21 S 22 25, 25 21"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
        className="stroke-[hsl(var(--primary-foreground))]"
      />
    </svg>
  );
}
