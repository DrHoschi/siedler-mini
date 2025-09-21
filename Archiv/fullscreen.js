// fullscreen.js – iOS-Fallback (Pseudo-Fullscreen), Debug-Infos
export const Fullscreen = {
  isNativeSupported() {
    return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  },
  async enter(el) {
    // Versuche nativ
    const node = typeof el === 'string' ? document.querySelector(el) : el;
    const canNative = this.isNativeSupported() && node?.requestFullscreen;
    if (canNative) {
      try {
        await node.requestFullscreen();
        return { mode:'native' };
      } catch(e) {
        // fallback
      }
    }
    // iPhone-Fallback: Pseudo-FS via CSS
    document.documentElement.classList.add('pseudo-fs');
    window.scrollTo(0,0);
    return { mode:'pseudo' };
  },
  async exit() {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      try { await document.exitFullscreen?.(); } catch{}
      try { await document.webkitExitFullscreen?.(); } catch{}
      return { mode:'native-exit' };
    }
    document.documentElement.classList.remove('pseudo-fs');
    return { mode:'pseudo-exit' };
  },
  activeMode() {
    if (document.fullscreenElement || document.webkitFullscreenElement) return 'native';
    if (document.documentElement.classList.contains('pseudo-fs')) return 'pseudo';
    return 'none';
  }
};
