{
  const script = document.createElement('script');
  script.textContent = `
    document.currentScript.dataset.type = typeof window.onbeforeunload;
  `;
  document.documentElement.appendChild(script);
  script.dataset.type === 'function'
}
