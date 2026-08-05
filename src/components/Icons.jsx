/** Inline stroke icons. No icon font, no external requests. */

const S = ({ children, ...p }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...p}>
    {children}
  </svg>
);

export const IconHome = (p) => (
  <S {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5.5 9.5V20h13V9.5" />
  </S>
);

export const IconDumbbell = (p) => (
  <S {...p}>
    <path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12" />
  </S>
);

export const IconCalendar = (p) => (
  <S {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2.5" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </S>
);

export const IconUser = (p) => (
  <S {...p}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.5 20c1.2-3.8 4-5.6 7.5-5.6s6.3 1.8 7.5 5.6" />
  </S>
);

export const IconSpark = (p) => (
  <S {...p}>
    <path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3" />
  </S>
);

export const IconArrowUp = (p) => (
  <S {...p}>
    <path d="M12 20V5M6 11l6-6 6 6" />
  </S>
);

export const IconPush = (p) => (
  <S {...p}>
    <path d="M4 12h6M14 12h6M10 8v8M14 8v8" />
  </S>
);

export const IconLegs = (p) => (
  <S {...p}>
    <path d="M9 3v9l-2 9M15 3v9l2 9M9 3h6" />
  </S>
);

export const IconBody = (p) => (
  <S {...p}>
    <circle cx="12" cy="5" r="2.4" />
    <path d="M12 8v7M6 10.5h12M9 21l3-6 3 6" />
  </S>
);

export const IconRun = (p) => (
  <S {...p}>
    <circle cx="14" cy="4.5" r="2" />
    <path d="M12 21l2-6-3-3 1-4 3 3 3 1M9 12l-2 2" />
  </S>
);

export const IconMountain = (p) => (
  <S {...p}>
    <path d="M3 19l6-10 4 6 2-3 6 7z" />
  </S>
);

export const IconWave = (p) => (
  <S {...p}>
    <path d="M3 13c2-2.2 4-2.2 6 0s4 2.2 6 0 4-2.2 6 0M3 18c2-2.2 4-2.2 6 0s4 2.2 6 0 4-2.2 6 0" />
  </S>
);

export const IconPulse = (p) => (
  <S {...p}>
    <path d="M3 12h4l2-5 3 10 2.5-6 1.8 3H21" />
  </S>
);

export const IconPlus = (p) => (
  <S {...p}>
    <path d="M12 5v14M5 12h14" />
  </S>
);

export const IconSwap = (p) => (
  <S {...p}>
    <path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5" />
  </S>
);

export const IconChevronLeft = (p) => (
  <S {...p}>
    <path d="M15 5l-7 7 7 7" />
  </S>
);

export const IconFlame = (p) => (
  <S {...p} fill="currentColor" stroke="none">
    <path d="M12.8 2c.3 2.4-.9 3.6-2 4.7C9.4 8 8 9.3 8 11.8a4 4 0 0 0 8 .3c0-1-.3-1.8-.7-2.5 1.6.8 2.7 2.5 2.7 4.6a6 6 0 1 1-12 0c0-3.3 1.9-5 3.5-6.5C11 6.2 12.6 4.7 12.8 2z" />
  </S>
);

/** Icon for each session type, matching the picker cards in the design. */
export const SESSION_ICON = {
  push: IconPush,
  pull: IconArrowUp,
  legs: IconLegs,
  full_body: IconBody,
  cardio: IconPulse,
  hike: IconMountain,
  swim: IconWave,
  custom: IconPlus,
};
