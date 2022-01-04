{
  const s = document.createElement('script');
  s.textContent = `{
    const player = document.querySelector('.html5-video-player');
    if (player) {
      const t = player.getCurrentTime();
      if (t) {
        const s = new URLSearchParams(location.search);
        s.set('t', t + 's');
        history.replaceState(history.state, '', '?' + s.toString());
      }
    }
  }`;
  document.body.appendChild(s);
  s.remove();
}
