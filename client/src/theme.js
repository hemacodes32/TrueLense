export function getTheme() {
  try {
    const saved = localStorage.getItem('truelense_theme');
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch (_) {}
  return 'dark';
}

export function setTheme(theme) {
  const finalTheme = theme === 'light' ? 'light' : 'dark';
  try {
    localStorage.setItem('truelense_theme', finalTheme);
  } catch (_) {}
  if (finalTheme === 'light') {
    document.body.classList.add('light-theme');
    document.documentElement.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
    document.documentElement.classList.remove('light-theme');
  }
}
