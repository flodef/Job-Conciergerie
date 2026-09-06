type LogoProps = {
  size?: number;
  className?: string;
};

export default function Logo({ size = 40, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60A5FA" />
          <stop offset="0.5" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#2DD4BF" />
        </linearGradient>
        <linearGradient id="logo-grad-2" x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3B82F6" />
          <stop offset="1" stopColor="#14B8A6" />
        </linearGradient>
      </defs>

      {/* House roof */}
      <path
        d="M32 10L52 26V28H12V26L32 10Z"
        fill="url(#logo-grad)"
      />

      {/* House body */}
      <rect x="16" y="28" width="32" height="22" rx="3" fill="url(#logo-grad-2)" fillOpacity="0.2" stroke="url(#logo-grad)" strokeWidth="2.5" />

      {/* Bell (concierge) on top of house */}
      <g>
        {/* Bell dome */}
        <path
          d="M32 14C29.5 14 27.5 15.8 27.5 18.2V21H36.5V18.2C36.5 15.8 34.5 14 32 14Z"
          fill="url(#logo-grad)"
        />
        {/* Bell base line */}
        <rect x="26" y="21" width="12" height="2" rx="1" fill="url(#logo-grad)" />
        {/* Bell clapper */}
        <circle cx="32" cy="25" r="1.8" fill="url(#logo-grad)" />
      </g>

      {/* Door */}
      <rect x="27" y="36" width="10" height="14" rx="2" fill="url(#logo-grad)" fillOpacity="0.6" />

      {/* Sparkles */}
      <g>
        <path
          d="M50 16L51.2 19.2L54.4 20.4L51.2 21.6L50 24.8L48.8 21.6L45.6 20.4L48.8 19.2L50 16Z"
          fill="#2DD4BF"
        />
        <path
          d="M14 44L14.8 46L16.8 46.8L14.8 47.6L14 49.6L13.2 47.6L11.2 46.8L13.2 46L14 44Z"
          fill="#60A5FA"
          fillOpacity="0.7"
        />
      </g>
    </svg>
  );
}
