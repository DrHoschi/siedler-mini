/* ui-build.css v16.1.4
   - kleine Politur für Icon-Buttons
   - Icons kommen jetzt als <img> mit dataURL (aus Atlas-Frame gerendert)
*/
:root{
  --ui-gap: 10px;
  --ui-blur: 14px;
  --ui-bg: rgba(10,20,10,0.7);
  --ui-pill: 16px;
  --ui-btn: rgba(24,48,24,0.9);
  --ui-btn-border: rgba(255,255,255,0.08);
  --ui-btn-active: rgba(36,72,36,0.95);
  --ui-text: #d7f6d7;
}

#buildBar{
  position: fixed;
  left: 0; right: 0;
  bottom: 0;             /* bleibt unten im Hochformat */
  display: flex;
  gap: var(--ui-gap);
  padding: 12px;
  background: rgba(0,0,0,0.35);
  backdrop-filter: blur(var(--ui-blur));
  align-items: center;
  z-index: 12;
  overflow-x: auto;
}

.buildBtn{
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: var(--ui-btn);
  color: var(--ui-text);
  border: 1px solid var(--ui-btn-border);
  border-radius: var(--ui-pill);
  white-space: nowrap;
  font: 600 14px/1 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
}

.buildBtn:active,
.buildBtn.is-active{ background: var(--ui-btn-active); }

.buildBtn img.bm-icon{
  width: 48px; height: 48px;       /* sichtbare Icongröße */
  image-rendering: pixelated;      /* retro crisp */
  display: block;
  border-radius: 10px;             /* wirkt wie „nur Icon“ auf farbigem Button */
  background: transparent;
}
