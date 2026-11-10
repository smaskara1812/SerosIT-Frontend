// Sero's Run: the endless runner behind the 404 page's Play button. Sero runs along a lease road at dusk; jump cones, oil slicks, pipe stacks, drums and
// tumbleweeds, duck crane hooks and helicopters. The score is in metres drilled.
//
// createGame(canvas, { onBest(m), onOver(m, isBest), onEscape() }) -> { destroy() }
// It is one self-contained piece: it draws only on its own canvas, loads nothing, makes no sound, stores nothing (the best run is kept in this module, so it
// lasts while the app is open and is gone when the page is closed or refreshed), and puts its key and touch listeners on only while it exists: destroy() removes
// them all and stops the loop. With `onEscape` given, Esc asks the host to close it (P pauses); without it Esc pauses too.

let visitBest = 0 // the best run since the app was opened in this tab

export function createGame(canvas, opts) {
  opts = opts || {};
  var W = 800, H = 260, GROUND = 214;               // the game's own units; the canvas is scaled to fit
  var ctx = canvas.getContext("2d");
  var dpr = 1, scale = 1;
  var onBest = opts.onBest || function () {};
  var onOver = opts.onOver || function () {};

  var best = visitBest;
  onBest(best);

  // ---- state ----
  var state = "ready";                                // ready | run | paused | over
  var raf = 0, last = 0, t = 0;
  var dist = 0, speed = 0, newBest = false;
  var sero, obstacles, nextGap, clouds, derricks;

  function reset() {
    sero = { x: 70, y: GROUND, vy: 0, duck: false, air: false, step: 0, blink: 0, dead: false };
    obstacles = [];
    dist = 0; speed = 330; newBest = false;
    nextGap = 520;
    if (!derricks) {
      derricks = []; clouds = [];
      for (var i = 0; i < 6; i++) derricks.push({ x: i * 190 + 40, h: 46 + (i * 37) % 38 });
      for (var j = 0; j < 4; j++) clouds.push({ x: j * 230 + 60, y: 28 + (j * 41) % 60, w: 70 + (j * 29) % 40 });
    }
  }
  reset();

  // ---- helpers ----
  function mix(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }
  function rgb(c, a) { return "rgba(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + "," + (a == null ? 1 : a) + ")"; }
  function metres() { return Math.floor(dist / 30); }
  function night() { return 0.5 - 0.5 * Math.cos(2 * Math.PI * metres() / 1500); }   // 0 at dusk, 1 deep night, back again
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  // ---- sizing ----
  function fit() {
    var box = canvas.parentElement.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(box.width * dpr));
    canvas.height = Math.max(1, Math.round(box.width * (H / W) * dpr));
    scale = canvas.width / W;
    draw();
  }

  // ---- obstacles ----
  function unlocked() {
    var m = metres(), kinds = ["cone", "cone2"];
    if (m >= 60) kinds.push("spill");
    if (m >= 80) kinds.push("pipes");
    if (m >= 140) kinds.push("barrels");
    if (m >= 180) kinds.push("hook");
    if (m >= 250) kinds.push("weed");
    if (m >= 320) kinds.push("heli");
    return kinds;
  }
  function spawn() {
    var kinds = unlocked(), k = kinds[Math.floor(Math.random() * kinds.length)];
    var o = { kind: k, x: W + 30, swing: Math.random() * 6 };
    if (k === "cone") { o.w = 20; o.h = 32; o.y = GROUND - 32; }
    else if (k === "cone2") { o.w = 46; o.h = 32; o.y = GROUND - 32; }
    else if (k === "pipes") { o.w = 76; o.h = 36; o.y = GROUND - 36; }
    else if (k === "spill") { o.w = 70 + Math.floor(Math.random() * 50); o.h = 8; o.y = GROUND - 8; }            // an oil slick: flat and wide, jump it
    else if (k === "barrels") { o.w = 58; o.h = 38; o.y = GROUND - 38; }                                         // two oil drums side by side
    else if (k === "weed") { o.w = 28; o.h = 28; o.y = GROUND - 28; o.fast = 90; }                              // a tumbleweed, rolling faster than the ground moves
    else if (k === "hook") { o.w = 22; o.h = GROUND - 38; o.y = 0; }                // hangs from the top, its tip 38 above the ground: duck
    else { o.w = 54; o.h = 22; o.y = GROUND - 56; o.fast = 110; }                   // a helicopter at head height: duck, or jump over it
    obstacles.push(o);
    var jumpReach = speed * 0.64 + o.w;                                              // never closer than one jump can cover
    nextGap = jumpReach + 180 + Math.random() * speed * 0.7;
  }
  function hitbox(o) {
    if (o.kind === "spill") return { x: o.x + 8, y: o.y + 1, w: o.w - 16, h: 7 };                  // thin: only feet on the slick count
    var pad = o.kind === "weed" ? 6 : 4;                                              // a little forgiveness: hits must be real
    if (o.kind === "hook") return { x: o.x + 4, y: 0, w: o.w - 8, h: GROUND - 40 };      // from the ceiling down to the hook's tip
    return { x: o.x + pad, y: o.y + pad, w: o.w - pad * 2, h: o.h - pad * 2 };
  }
  function seroBox() {
    var h = sero.duck && !sero.air ? 28 : 48;
    return { x: sero.x + 8, y: sero.y - h + 2, w: 22, h: h - 4 };
  }
  function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

  // ---- control ----
  function jump() {
    if (state === "ready" || state === "over") { start(); return; }
    if (state === "paused") { resume(); return; }
    if (!sero.air) { sero.vy = -790; sero.air = true; sero.duck = false; }
  }
  function start() { reset(); state = "run"; last = performance.now(); sero.vy = -790; sero.air = true; }
  function pause() { if (state === "run") { state = "paused"; draw(); } }
  function resume() { if (state === "paused") { state = "run"; last = performance.now(); } }
  function end() {
    state = "over"; sero.dead = true;
    var m = metres();
    if (m > best) { best = m; visitBest = m; newBest = true; onBest(best); }
    onOver(m, newBest);
  }

  function onKey(e) {
    var k = e.key;
    if (k === " " || k === "ArrowUp" || k === "w" || k === "W") { e.preventDefault(); if (!e.repeat) jump(); }
    else if (k === "ArrowDown" || k === "s" || k === "S") { e.preventDefault(); if (state === "run") { sero.duck = true; if (sero.air) sero.vy = Math.max(sero.vy, 700); } }
    else if (k === "Escape" && opts.onEscape) { e.preventDefault(); opts.onEscape(); }
    else if (k === "p" || k === "P" || k === "Escape") { if (state === "run") pause(); else if (state === "paused") resume(); }
  }
  function onKeyUp(e) { if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") sero.duck = false; }
  function onDown(e) {
    var r = canvas.getBoundingClientRect(), low = (e.clientY - r.top) > r.height * 0.62;
    if (state === "run" && low) { sero.duck = true; if (sero.air) sero.vy = Math.max(sero.vy, 700); }
    else jump();
  }
  function onUp() { sero.duck = false; }
  function onHide() { if (document.hidden) pause(); }

  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("pointerdown", onDown);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  window.addEventListener("blur", pause);
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("resize", fit);

  // ---- update ----
  function update(dt) {
    t += dt;
    speed = Math.min(760, 330 + metres() * 0.55);
    dist += speed * dt;

    // Sero
    if (sero.air) {
      sero.vy += 2600 * dt;
      sero.y += sero.vy * dt;
      if (sero.y >= GROUND) { sero.y = GROUND; sero.vy = 0; sero.air = false; }
    }
    sero.step += dt * (speed / 38);
    sero.blink = (t % 3.4) > 3.28 ? 1 : 0;

    // the world
    for (var i = 0; i < derricks.length; i++) { derricks[i].x -= speed * 0.16 * dt; if (derricks[i].x < -60) derricks[i].x += derricks.length * 190; }
    for (var c = 0; c < clouds.length; c++) { clouds[c].x -= speed * 0.07 * dt; if (clouds[c].x < -120) clouds[c].x += W + 240; }

    // obstacles
    nextGap -= speed * dt;
    if (nextGap <= 0) spawn();
    var box = seroBox();
    for (var j = obstacles.length - 1; j >= 0; j--) {
      var o = obstacles[j];
      o.x -= (speed + (o.fast || 0)) * dt;
      if (o.x + o.w < -20) { obstacles.splice(j, 1); continue; }
      if (overlap(box, hitbox(o))) { end(); return; }
    }
  }

  // ---- drawing ----
  function sky() {
    var n = night();
    var topA = [38, 44, 104], botA = [244, 138, 80];            // dusk: indigo into orange
    var topB = [8, 14, 38], botB = [30, 44, 98];                // night
    var g = ctx.createLinearGradient(0, 0, 0, GROUND);
    g.addColorStop(0, rgb(mix(topA, topB, n)));
    g.addColorStop(1, rgb(mix(botA, botB, n)));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // stars
    if (n > 0.15) {
      ctx.fillStyle = "rgba(255,255,255," + (n * 0.85).toFixed(2) + ")";
      for (var s = 0; s < 38; s++) {
        var sx = (s * 97 + 31) % W, sy = (s * 53 + 11) % 120;
        ctx.fillRect(sx, sy, s % 5 === 0 ? 2 : 1, s % 5 === 0 ? 2 : 1);
      }
    }
    // sun going down, moon coming up
    var sunY = 128 + n * 120, sc = mix([255, 214, 150], [236, 240, 255], n);
    ctx.fillStyle = rgb(sc, 0.95);
    ctx.beginPath(); ctx.arc(640, n < 0.5 ? sunY : 70 + (1 - n) * 60, n < 0.5 ? 30 : 22, 0, 7); ctx.fill();
    // clouds
    ctx.fillStyle = rgb(mix([255, 190, 150], [70, 84, 150], n), 0.35);
    for (var c = 0; c < clouds.length; c++) { rr(clouds[c].x, clouds[c].y, clouds[c].w, 12, 6); ctx.fill(); rr(clouds[c].x + 14, clouds[c].y - 7, clouds[c].w * 0.5, 12, 6); ctx.fill(); }
  }
  function derrick(x, h, col) {
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.5;
    var b = GROUND - 8, hw = h * 0.3;
    ctx.beginPath(); ctx.moveTo(x - hw, b); ctx.lineTo(x, b - h); ctx.lineTo(x + hw, b); ctx.moveTo(x - hw * 0.6, b - h * 0.4); ctx.lineTo(x + hw * 0.6, b - h * 0.4);
    ctx.moveTo(x - hw * 0.3, b - h * 0.7); ctx.lineTo(x + hw * 0.3, b - h * 0.7); ctx.stroke();
    ctx.fillRect(x - 3, b - h - 4, 6, 4);
  }
  function ground() {
    var n = night();
    var far = rgb(mix([66, 52, 98], [14, 22, 56], n));
    for (var i = 0; i < derricks.length; i++) derrick(derricks[i].x, derricks[i].h, far);
    ctx.fillStyle = rgb(mix([52, 38, 78], [10, 16, 42], n));                        // low hills
    ctx.beginPath(); ctx.moveTo(0, GROUND - 4);
    for (var x = 0; x <= W; x += 40) ctx.lineTo(x, GROUND - 14 - 8 * Math.sin((x + dist * 0.08) / 70));
    ctx.lineTo(W, GROUND); ctx.lineTo(0, GROUND); ctx.fill();
    ctx.fillStyle = rgb(mix([40, 30, 62], [8, 12, 32], n)); ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = rgb(mix([120, 92, 120], [60, 80, 140], n), 0.9); ctx.fillRect(0, GROUND, W, 2);
    // road dashes and pebbles, moving at full speed
    ctx.fillStyle = rgb(mix([150, 116, 128], [80, 100, 160], n), 0.7);
    var off = dist % 120;
    for (var d = -1; d < 8; d++) ctx.fillRect(d * 120 - off, GROUND + 14, 46, 3);
    var off2 = (dist * 1.0) % 90;
    for (var p = -1; p < 10; p++) ctx.fillRect(p * 90 - off2 + ((p * 37) % 25), GROUND + 30 + (p * 13) % 12, 3, 2);
  }
  function drawObstacle(o) {
    if (o.kind === "cone" || o.kind === "cone2") {
      var n = o.kind === "cone" ? 1 : 2;
      for (var i = 0; i < n; i++) {
        var x = o.x + i * 26;
        ctx.fillStyle = "#f58220"; ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.lineTo(x + 20, GROUND); ctx.lineTo(x + 12, GROUND - 32); ctx.lineTo(x + 8, GROUND - 32); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.fillRect(x + 4.5, GROUND - 19, 11, 5);
        ctx.fillStyle = "#c8650f"; ctx.fillRect(x - 2, GROUND - 3, 24, 3);
      }
    } else if (o.kind === "pipes") {
      var cols = ["#8aa0c8", "#6e86b3", "#8aa0c8"];
      for (var r = 0; r < 2; r++) for (var q = 0; q < 3 - r; q++) {
        var cx = o.x + 12 + q * 26 + r * 13, cy = GROUND - 12 - r * 22;
        ctx.fillStyle = cols[(q + r) % 3]; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, 7); ctx.fill();
        ctx.fillStyle = "#14214a"; ctx.beginPath(); ctx.arc(cx, cy, 6.5, 0, 7); ctx.fill();
      }
    } else if (o.kind === "spill") {
      // an oil slick: a glossy pool that stands out from the road, with a hazard sign so it is seen early
      var scx = o.x + o.w / 2, rx = o.w / 2, sy = GROUND + 2;
      var pulse = 0.55 + 0.25 * Math.sin(t * 5);
      ctx.fillStyle = "rgba(245,200,40," + (0.16 * pulse).toFixed(3) + ")"; ctx.beginPath(); ctx.ellipse(scx, sy, rx + 7, 13, 0, 0, 7); ctx.fill();   // warning glow
      ctx.fillStyle = "#02030a"; ctx.beginPath(); ctx.ellipse(scx, sy, rx, 9, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = "#f5c828"; ctx.lineWidth = 2; ctx.setLineDash([9, 6]); ctx.beginPath(); ctx.ellipse(scx, sy, rx, 9, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);   // hazard-yellow outline
      ctx.fillStyle = "rgba(190,210,255,0.45)"; ctx.beginPath(); ctx.ellipse(scx - rx * 0.28, sy - 3, rx * 0.34, 2.6, 0, 0, 7); ctx.fill();   // glossy highlight
      var hues = ["#35e0bd", "#a47cff", "#ff9a3c"];
      for (var h = 0; h < 3; h++) {
        ctx.strokeStyle = hues[h]; ctx.globalAlpha = 0.95; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.ellipse(scx + Math.sin(t * 1.4 + h * 2) * rx * 0.12, sy, rx * (0.3 + h * 0.18), 3 + h * 1.6, 0, 3.4, 5.9); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      var sx = o.x + o.w * 0.5 - 1, sTop = GROUND - 44;                                            // a warning sign on a post, behind the slick
      ctx.fillStyle = "#8a93b0"; ctx.fillRect(sx, sTop + 20, 2, 24);
      ctx.fillStyle = "#f5c828"; ctx.beginPath(); ctx.moveTo(sx + 1, sTop); ctx.lineTo(sx + 14, sTop + 22); ctx.lineTo(sx - 12, sTop + 22); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#1a1405"; ctx.fillRect(sx, sTop + 6, 2, 8); ctx.fillRect(sx, sTop + 16, 2, 2.5);
    } else if (o.kind === "barrels") {
      for (var b = 0; b < 2; b++) {
        var bx = o.x + b * 30;
        ctx.fillStyle = b ? "#c4402f" : "#d9582f"; rr(bx, GROUND - 38, 28, 38, 4); ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.fillRect(bx, GROUND - 28, 28, 3); ctx.fillRect(bx, GROUND - 12, 28, 3);
        ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fillRect(bx + 5, GROUND - 36, 4, 34);
      }
    } else if (o.kind === "weed") {
      var cx2 = o.x + 14, cy2 = GROUND - 14, rot = -dist * 0.045 - o.swing;
      ctx.strokeStyle = "#9a7a52"; ctx.lineWidth = 1.6;
      ctx.save(); ctx.translate(cx2, cy2); ctx.rotate(rot);
      for (var wi = 0; wi < 9; wi++) { ctx.rotate(0.7); ctx.beginPath(); ctx.ellipse(0, 0, 13 - (wi % 3) * 2, 7 + (wi % 2) * 3, 0, 0, 6); ctx.stroke(); }
      ctx.restore();
    } else if (o.kind === "hook") {
      var sw = Math.sin(t * 2.2 + o.swing) * 3, tipY = GROUND - 40;
      ctx.strokeStyle = "#9fb4dd"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(o.x + 11, 0); ctx.lineTo(o.x + 11 + sw, tipY - 26); ctx.stroke();
      ctx.fillStyle = "#f2b01e"; rr(o.x + 2 + sw, tipY - 26, 18, 14, 3); ctx.fill();         // the block
      ctx.strokeStyle = "#cfd8ee"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(o.x + 11 + sw, tipY - 6, 7, -0.4, 3.4); ctx.stroke();   // the hook
    } else {
      var bob = Math.sin(t * 9 + o.swing) * 1.5;
      ctx.fillStyle = "#d84a3a"; rr(o.x + 8, o.y + 5 + bob, 38, 15, 7); ctx.fill();
      ctx.fillStyle = "#9fd2ff"; rr(o.x + 30, o.y + 7 + bob, 12, 7, 3); ctx.fill();
      ctx.fillStyle = "#d84a3a"; ctx.fillRect(o.x, o.y + 9 + bob, 14, 4);                    // tail
      ctx.strokeStyle = "#e8eefc"; ctx.lineWidth = 2; var a = t * 40;
      ctx.beginPath(); ctx.moveTo(o.x + 27 - 26 * Math.cos(a), o.y + 3 + bob); ctx.lineTo(o.x + 27 + 26 * Math.cos(a), o.y + 3 + bob); ctx.stroke();
    }
  }
  function drawSero() {
    var s = sero, duck = s.duck && !s.air;
    ctx.save();
    ctx.translate(s.x + 19, s.y);
    if (s.dead) ctx.rotate(0.12);
    if (duck) ctx.scale(1.12, 0.62);
    // legs
    var swing = s.air ? 0.5 : Math.sin(s.step * 2.4);
    ctx.fillStyle = "#1f6fb5";
    rr(-12, -12, 9, 12 + (s.air ? -3 : 0), 3); ctx.fill();
    ctx.save(); ctx.translate(0, 0); ctx.fillStyle = "#175a94"; rr(5 + swing * 3, -12, 9, 12 - (s.air ? 3 : 0), 3); ctx.fill(); ctx.restore();
    ctx.fillStyle = "#0b2a4a"; rr(-14, -4, 13, 5, 2); ctx.fill(); rr(4 + swing * 3, -4, 13, 5, 2); ctx.fill();
    // body and arm
    ctx.fillStyle = "#fff"; rr(-15, -34, 30, 25, 9); ctx.fill();
    ctx.fillStyle = "#0b2a4a"; rr(-9, -30, 18, 11, 3); ctx.fill();
    ctx.fillStyle = "#f58220"; ctx.fillRect(-4, -14, 8, 3);
    ctx.fillStyle = "#1f6fb5"; ctx.save(); ctx.translate(14, -28); ctx.rotate(-swing * 0.7 + (s.air ? -1 : 0)); rr(-3, 0, 7, 16, 3); ctx.fill(); ctx.fillStyle = "#f58220"; ctx.beginPath(); ctx.arc(0.5, 17, 4, 0, 7); ctx.fill(); ctx.restore();
    // head
    ctx.fillStyle = "#fff"; rr(-16, -58, 33, 25, 10); ctx.fill();
    ctx.fillStyle = "#0b2a4a"; rr(-12, -53, 28, 15, 7); ctx.fill();
    ctx.fillStyle = "#1f6fb5"; rr(-20, -50, 6, 12, 3); ctx.fill();
    if (s.dead) {
      ctx.strokeStyle = "#2ec4a6"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-6, -48); ctx.lineTo(-1, -43); ctx.moveTo(-1, -48); ctx.lineTo(-6, -43); ctx.moveTo(5, -48); ctx.lineTo(10, -43); ctx.moveTo(10, -48); ctx.lineTo(5, -43); ctx.stroke();
    } else if (s.blink) {
      ctx.fillStyle = "#2ec4a6"; ctx.fillRect(-6, -45, 6, 2); ctx.fillRect(5, -45, 6, 2);
    } else {
      ctx.fillStyle = "#2ec4a6"; rr(-6, -50, 6, 9, 3); ctx.fill(); rr(5, -50, 6, 9, 3); ctx.fill();
    }
    // hard hat
    ctx.fillStyle = "#f58220"; ctx.beginPath(); ctx.moveTo(-17, -55); ctx.quadraticCurveTo(-17, -69, 0, -69); ctx.quadraticCurveTo(17, -69, 18, -55); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#d9680f"; rr(-20, -58, 41, 5, 2.5); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, -62, 4.5, 0, 7); ctx.fill();
    // antenna
    ctx.strokeStyle = "#1f6fb5"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(12, -58); ctx.lineTo(19, -67); ctx.stroke();
    ctx.fillStyle = "#f58220"; ctx.beginPath(); ctx.arc(20, -69, 2.6, 0, 7); ctx.fill();
    ctx.restore();
    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)"; var lift = Math.max(0, GROUND - s.y); ctx.beginPath(); ctx.ellipse(s.x + 19, GROUND + 3, Math.max(8, 17 - lift * 0.05), 3, 0, 0, 7); ctx.fill();
  }
  function text(str, x, y, size, color, align, weight) {
    size *= Math.min(1.8, Math.max(1, 0.62 / scale));                              // on a small screen the words are drawn larger, so they stay readable
    ctx.font = (weight || 600) + " " + size + "px 'Avenir Next','Segoe UI',system-ui,sans-serif";
    ctx.textAlign = align || "left"; ctx.fillStyle = color; ctx.fillText(str, x, y);
  }
  function hud() {
    text(metres() + " m", W - 18, 30, 20, "rgba(238,243,255,0.95)", "right", 650);
    if (best) text("best " + best + " m", W - 18, 50, 12, "rgba(238,243,255,0.65)", "right", 500);
  }
  function banner(title, sub) {
    ctx.fillStyle = "rgba(8,14,38,0.55)"; ctx.fillRect(0, 0, W, H);
    text(title, W / 2, 112, 28, "#eef3ff", "center", 700);
    text(sub, W / 2, 142, 15, "rgba(238,243,255,0.8)", "center", 500);
  }
  function draw() {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    sky(); ground();
    for (var i = 0; i < obstacles.length; i++) drawObstacle(obstacles[i]);
    drawSero();
    hud();
    if (state === "ready") banner("Sero's Run", "Press Space or tap to start");
    else if (state === "paused") banner("Paused", "Press P or Space to carry on");
    else if (state === "over") banner(newBest && metres() > 0 ? "New best: " + metres() + " m" : "Run over at " + metres() + " m", "Press Space or tap to run again");
  }

  // ---- loop ----
  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - last) / 1000);                                   // a long gap (a slow tab) never jumps the game ahead
    last = now;
    if (state === "run") update(dt);
    else { t += dt; sero.blink = (t % 3.4) > 3.28 ? 1 : 0; }
    draw();
  }
  fit();
  last = performance.now();
  raf = requestAnimationFrame(frame);

  return {
    destroy: function () {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onDown); window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("blur", pause); document.removeEventListener("visibilitychange", onHide); window.removeEventListener("resize", fit);
    }
  };
}
