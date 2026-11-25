'use strict';
// ---------- 2D dosa for the finish card ----------
function drawDosaOn(c) {
  const circ = (x, y, r, f, st) => {
    c.beginPath();
    c.arc(x, y, r, 0, 6.283);
    c.fillStyle = f;
    c.fill();
    if (st) {
      c.strokeStyle = st;
      c.lineWidth = 0.8;
      c.stroke();
    }
  };
  circ(46, 52, 44, '#c9a66b');
  c.strokeStyle = '#a98450';
  c.lineWidth = 0.6;
  for (let r = 8; r < 44; r += 4) {
    c.beginPath();
    c.arc(46, 52, r, 0, 6.283);
    c.stroke();
  }
  circ(46, 52, 38, '#f4f2ec', '#d8d4ca');
  c.save();
  c.translate(46, 52);
  c.rotate(-0.35);
  c.fillStyle = '#3f8f32';
  c.beginPath();
  c.ellipse(0, 0, 34, 25, 0, 0, 6.283);
  c.fill();
  c.strokeStyle = '#7cc35c';
  c.lineWidth = 0.7;
  for (let y = -20; y <= 20; y += 5) {
    c.beginPath();
    c.moveTo(-30, y);
    c.lineTo(30, y + 3);
    c.stroke();
  }
  c.restore();
  circ(22, 40, 9, '#f4f2ec', '#cfcac0');
  circ(22, 40, 7, '#cf3f26');
  circ(38, 30, 10, '#c3c7cb', '#9aa0a6');
  circ(38, 30, 8, '#efeadc');
  c.fillStyle = '#2f6f26';
  c.fillRect(36, 28, 3, 1.4);
  c.fillRect(40, 31, 2.4, 1.2);
  circ(58, 26, 10, '#c3c7cb', '#9aa0a6');
  circ(58, 26, 8, '#e3bf3a');
  c.fillStyle = '#f0d050';
  c.fillRect(55, 24, 3, 3);
  c.fillRect(60, 27, 3, 2.6);
  c.fillStyle = '#2f6f26';
  c.fillRect(57, 22, 3, 1.2);
  c.save();
  c.translate(50, 62);
  c.rotate(-0.32);
  const gr = c.createLinearGradient(0, -10, 0, 10);
  gr.addColorStop(0, '#e9b04a');
  gr.addColorStop(0.45, '#a95a22');
  gr.addColorStop(0.7, '#c9822f');
  gr.addColorStop(1, '#e2a23d');
  c.fillStyle = gr;
  c.beginPath();
  c.moveTo(-38, -6);
  c.lineTo(34, -12);
  c.quadraticCurveTo(40, -2, 34, 8);
  c.lineTo(-38, 8);
  c.closePath();
  c.fill();
  c.strokeStyle = '#8a4a1c';
  c.lineWidth = 0.6;
  c.stroke();
  c.fillStyle = '#f6e08a';
  c.fillRect(-4, -9, 7, 6);
  c.strokeStyle = '#d8bc5a';
  c.strokeRect(-4, -9, 7, 6);
  c.restore();
  c.save();
  c.translate(86, 80);
  circ(0, 6, 10, '#c3c7cb', '#8f959b');
  c.fillStyle = '#d6d9dc';
  c.fillRect(-5.5, -12, 11, 18);
  c.strokeStyle = '#8f959b';
  c.lineWidth = 0.7;
  c.strokeRect(-5.5, -12, 11, 18);
  c.fillStyle = '#7a4a26';
  c.fillRect(-5, -12, 10, 2.5);
  c.fillStyle = '#d9b98f';
  c.fillRect(-3, -12.5, 6, 1.5);
  c.strokeStyle = 'rgba(255,255,255,.75)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(-1, -15);
  c.quadraticCurveTo(-4, -19, -1, -23);
  c.moveTo(2, -15);
  c.quadraticCurveTo(5, -19, 2, -24);
  c.stroke();
  c.restore();
}
// ---------- 2D treats for the finish card and the share image (drawn in a 100 x 100 box) ----------
function drawHoneyCake(c) {
  const circ = (x, y, r, f, st) => {
    c.beginPath();
    c.arc(x, y, r, 0, 6.283);
    c.fillStyle = f;
    c.fill();
    if (st) {
      c.strokeStyle = st;
      c.lineWidth = 0.8;
      c.stroke();
    }
  };
  circ(44, 56, 36, '#f4f2ec', '#d8d4ca');
  circ(44, 56, 30, '#ece8de');
  const slice = (x, y, rot) => {
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    c.fillStyle = '#d9913f';
    c.fillRect(-20, -6, 40, 16);
    c.fillStyle = '#b8732c';
    c.fillRect(-20, 6, 40, 4);
    c.fillStyle = '#c4362b';
    c.fillRect(-20, -10, 40, 5);
    c.fillStyle = '#f6efe0';
    c.fillRect(-20, -13, 40, 3);
    c.fillStyle = '#ffffff';
    for (let k = 0; k < 7; k++) c.fillRect(-18 + k * 6, -15 + (k % 2) * 1.5, 3, 2);
    c.strokeStyle = '#8a4a1c';
    c.lineWidth = 0.6;
    c.strokeRect(-20, -13, 40, 23);
    c.restore();
  };
  slice(36, 50, -0.15);
  slice(50, 66, 0.1);
  c.save();
  c.translate(84, 70);
  c.fillStyle = 'rgba(220,232,236,.75)';
  c.beginPath();
  c.moveTo(-8, -16);
  c.lineTo(8, -16);
  c.lineTo(6, 12);
  c.lineTo(-6, 12);
  c.closePath();
  c.fill();
  c.fillStyle = '#b07a45';
  c.beginPath();
  c.moveTo(-7.4, -11);
  c.lineTo(7.4, -11);
  c.lineTo(5.8, 11);
  c.lineTo(-5.8, 11);
  c.closePath();
  c.fill();
  c.fillStyle = '#d9b98f';
  c.fillRect(-7.4, -12.5, 14.8, 2.4);
  c.strokeStyle = '#9aa0a6';
  c.lineWidth = 0.7;
  c.beginPath();
  c.moveTo(-8, -16);
  c.lineTo(-6, 12);
  c.lineTo(6, 12);
  c.lineTo(8, -16);
  c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.8)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(-2, -19);
  c.quadraticCurveTo(-5, -23, -2, -28);
  c.moveTo(2, -19);
  c.quadraticCurveTo(5, -23, 2, -29);
  c.stroke();
  c.restore();
}
// NICE Road race breakfast: idlis with coconut and tomato chutney, a banana, and tender coconut water
function drawNiceBreakfast(c) {
  const circ = (x, y, r, f, st) => {
    c.beginPath();
    c.arc(x, y, r, 0, 6.283);
    c.fillStyle = f;
    c.fill();
    if (st) {
      c.strokeStyle = st;
      c.lineWidth = 0.8;
      c.stroke();
    }
  };
  circ(40, 58, 34, '#c3c7cb', '#8f959b'); // steel plate
  circ(40, 58, 29, '#d6d9dc');
  for (const [x, y] of [
    [28, 56],
    [44, 66],
    [46, 48]
  ]) {
    circ(x, y, 10, '#f4f1e6', '#d8d2bf'); // idli
    circ(x - 2, y - 2, 4, '#fbf9f2');
  }
  circ(24, 36, 7, '#c3c7cb', '#8f959b');
  circ(24, 36, 5.6, '#eef0dc'); // coconut chutney
  c.fillStyle = '#2f6f26';
  c.fillRect(22, 34, 3, 1.4);
  circ(60, 74, 6.5, '#c3c7cb', '#8f959b');
  circ(60, 74, 5, '#cf3f26'); // tomato chutney
  c.save();
  c.translate(48, 92);
  c.strokeStyle = '#f2d23a';
  c.lineWidth = 5;
  c.lineCap = 'round';
  c.beginPath();
  c.arc(0, -22, 20, 0.6 * Math.PI, 0.95 * Math.PI); // banana
  c.stroke();
  c.fillStyle = '#5e3e25';
  c.fillRect(-21, -17, 4, 4);
  c.restore();
  // tender coconut with a straw
  c.save();
  c.translate(82, 62);
  c.fillStyle = '#5c9a2e';
  c.beginPath();
  c.moveTo(-12, 22);
  c.lineTo(-14, 2);
  c.lineTo(-8, -10);
  c.lineTo(8, -10);
  c.lineTo(14, 2);
  c.lineTo(12, 22);
  c.closePath();
  c.fill();
  c.fillStyle = '#7fb33e';
  c.beginPath();
  c.moveTo(-8, -10);
  c.lineTo(-4, -16);
  c.lineTo(4, -16);
  c.lineTo(8, -10);
  c.closePath();
  c.fill();
  c.fillStyle = '#e9eecf';
  c.beginPath();
  c.ellipse(0, -16, 4.5, 1.6, 0, 0, 6.283);
  c.fill();
  c.strokeStyle = '#ff3fa4';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(1, -16);
  c.lineTo(6, -28);
  c.lineTo(10, -28);
  c.stroke();
  c.restore();
}
function drawTreat2D(canvas, id) {
  const c = canvas.getContext('2d');
  const S = canvas.width;
  c.clearRect(0, 0, S, S);
  c.save();
  c.scale(S / 100, S / 100);
  if (id === 'ulsoor') drawHoneyCake(c);
  else if (id === 'nice') drawNiceBreakfast(c);
  else drawDosaOn(c);
  c.restore();
}
