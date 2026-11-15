import { useEffect, useState } from 'react';

type Theme = 'system' | 'dark' | 'light';

const labels: Record<Theme, string> = { system: 'Auto', dark: 'Dark', light: 'Light' };
const next: Record<Theme, Theme> = { system: 'dark', dark: 'light', light: 'system' };

function applyTheme(value: Theme) {
  if (value === 'system') {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = value;
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') {
      setTheme(saved);
      applyTheme(saved);
    }
  }, []);

  function toggle() {
    const value = next[theme];
    setTheme(value);
    localStorage.setItem('theme', value);
    applyTheme(value);
  }

  return (
    <button className="theme-toggle" onClick={toggle}>
      {labels[theme]}
    </button>
  );
}
