'use strict';
// ---------- finish screen: "screenshot this and tag me", and downloading race photos ----------
function flashBtn(id, msg) {
  const b = $(id),
    old = b.dataset.label || (b.dataset.label = b.textContent);
  b.textContent = msg;
  b.classList.add('done');
  setTimeout(() => {
    b.textContent = old;
    b.classList.remove('done');
  }, 1800);
}
function copyText(txt, btn) {
  const ok = () => flashBtn(btn, 'Copied!');
  const fb = () => {
    try {
      const ta = document.createElement('textarea');
      ta.value = txt;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.append(ta);
      ta.select();
      const r = document.execCommand && document.execCommand('copy');
      ta.remove();
      if (r) {
        ok();
        return;
      }
    } catch (e) {}
    flashBtn(btn, 'Long-press to copy');
  };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, fb);
  else fb();
}
// Share: straight to the phone's share sheet (no preview). Desktop browsers without one get the message copied.
function saveFile(f) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(f);
  a.download = f.name;
  document.body.append(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 4000);
}
$('copyHandle').addEventListener('click', () => copyText('@yourrunningbro', 'copyHandle'));
// the photo viewer's Download saves the photo you're looking at
$('vSave').addEventListener('click', () => {
  const p = lastRun && lastRun.photos && lastRun.photos[viewerAt];
  if (p && p.file) {
    saveFile(p.file);
    flashBtn('vSave', 'Downloaded!');
  } else flashBtn('vSave', 'One sec…');
});
