/**
 * Heptapod Circle — renders a SHA-256 hash as a circular ink logogram,
 * in the spirit of the written language in Arrival.
 *
 * Everything is derived deterministically from the hash's 32 bytes:
 *   0-5   : radius wobble (how far the ring departs from a true circle)
 *   6-12  : brush pressure (where the stroke runs thick or thin)
 *   13-15 : whether the brush lifts, and where
 *   16-28 : the flourishes hanging off the ring
 *   29-31 : ink accents
 */

function heptapodCircle(hexHash, size) {
    size = size || 200;

    var B = [];
    for (var i = 0; i < 32; i++) {
        B.push(parseInt(hexHash.substr(i * 2, 2), 16));
    }
    function u(i) { return B[((i % 32) + 32) % 32] / 255; }

    var cx = 200, cy = 200, TAU = Math.PI * 2;
    var baseR = 102;

    function f(n) { return n.toFixed(1); }

    // Catmull-Rom through the sample points, so every edge reads as brushwork
    // rather than as the polygon it actually is.
    function smoothOpen(pts, cmd) {
        var n = pts.length;
        if (n < 2) return '';
        var d = (cmd || 'M') + f(pts[0].x) + ',' + f(pts[0].y);
        for (var i = 0; i < n - 1; i++) {
            var p0 = pts[i > 0 ? i - 1 : 0];
            var p1 = pts[i];
            var p2 = pts[i + 1];
            var p3 = pts[i + 2 < n ? i + 2 : n - 1];
            d += ' C' + f(p1.x + (p2.x - p0.x) / 6) + ',' + f(p1.y + (p2.y - p0.y) / 6) +
                 ' ' + f(p2.x - (p3.x - p1.x) / 6) + ',' + f(p2.y - (p3.y - p1.y) / 6) +
                 ' ' + f(p2.x) + ',' + f(p2.y);
        }
        return d;
    }

    function smoothClosed(pts) {
        var n = pts.length;
        if (n < 3) return '';
        var d = 'M' + f(pts[0].x) + ',' + f(pts[0].y);
        for (var i = 0; i < n; i++) {
            var p0 = pts[(i - 1 + n) % n];
            var p1 = pts[i];
            var p2 = pts[(i + 1) % n];
            var p3 = pts[(i + 2) % n];
            d += ' C' + f(p1.x + (p2.x - p0.x) / 6) + ',' + f(p1.y + (p2.y - p0.y) / 6) +
                 ' ' + f(p2.x - (p3.x - p1.x) / 6) + ',' + f(p2.y - (p3.y - p1.y) / 6) +
                 ' ' + f(p2.x) + ',' + f(p2.y);
        }
        return d + ' Z';
    }

    // One stroke, given its two edges.
    function band(outerEdge, innerEdge) {
        var rev = innerEdge.slice().reverse();
        return smoothOpen(outerEdge, 'M') + ' ' + smoothOpen(rev, 'L') + ' Z';
    }

    // --- The ring: radius wobbles gently, thickness swings hard ---
    var wob1 = { a: 2 + u(0) * 5, fq: 2 + Math.floor(u(1) * 2), ph: u(2) * TAU };
    var wob2 = { a: 1 + u(3) * 3, fq: 4 + Math.floor(u(4) * 3), ph: u(5) * TAU };

    function radiusAt(a) {
        return baseR +
               Math.sin(a * wob1.fq + wob1.ph) * wob1.a +
               Math.sin(a * wob2.fq + wob2.ph) * wob2.a;
    }

    var thinW = 1.5 + u(6) * 2;
    var thickW = 16 + u(7) * 14;
    var pr1 = { fq: 1, ph: u(8) * TAU, w: 1.0 };
    var pr2 = { fq: 2 + Math.floor(u(9) * 2), ph: u(10) * TAU, w: 0.6 };
    var pr3 = { fq: 4 + Math.floor(u(11) * 3), ph: u(12) * TAU, w: 0.3 };
    var prTotal = pr1.w + pr2.w + pr3.w;

    function widthAt(a) {
        var v = Math.sin(a * pr1.fq + pr1.ph) * pr1.w +
                Math.sin(a * pr2.fq + pr2.ph) * pr2.w +
                Math.sin(a * pr3.fq + pr3.ph) * pr3.w;
        v = (v / prTotal + 1) / 2;
        v = v * v * (3 - 2 * v);
        return thinW + (thickW - thinW) * v;
    }

    // Some hashes lift the brush: a short break whose ends taper to a point.
    var lifts = u(13) > 0.45;
    var liftCenter = u(14) * TAU;
    var liftHalf = (7 + u(15) * 11) * Math.PI / 180;

    var N = 240;
    var startA = lifts ? liftCenter + liftHalf : 0;
    var spanA = lifts ? TAU - liftHalf * 2 : TAU;
    var lastSample = lifts ? N : N - 1;

    var outer = [], inner = [];
    for (var si = 0; si <= lastSample; si++) {
        var t = si / N;
        var ang = startA + spanA * t;
        var rr = radiusAt(ang);
        var w = widthAt(ang);
        if (lifts) {
            var e = Math.min(t, 1 - t) / 0.13;
            if (e < 1) w *= e * e * (3 - 2 * e);
        }
        var nx = Math.cos(ang), ny = Math.sin(ang);
        var px = cx + nx * rr, py = cy + ny * rr;
        outer.push({ x: px + nx * w / 2, y: py + ny * w / 2 });
        inner.push({ x: px - nx * w / 2, y: py - ny * w / 2 });
    }

    var svg = '';
    if (lifts) {
        svg += '<path class="heptapod-fill" d="' + band(outer, inner) + '"/>';
    } else {
        svg += '<path class="heptapod-fill" fill-rule="evenodd" d="' +
               smoothClosed(outer) + ' ' + smoothClosed(inner) + '"/>';
    }

    // A stroke along a cubic. The brush holds its width, then lifts near the
    // tip — tapering linearly from the base just reads as a stray hair.
    function taperedCubic(p0, p1, p2, p3, wStart) {
        var steps = 26, pts = [], i, tt, mt;
        for (i = 0; i <= steps; i++) {
            tt = i / steps; mt = 1 - tt;
            pts.push({
                x: mt * mt * mt * p0.x + 3 * mt * mt * tt * p1.x + 3 * mt * tt * tt * p2.x + tt * tt * tt * p3.x,
                y: mt * mt * mt * p0.y + 3 * mt * mt * tt * p1.y + 3 * mt * tt * tt * p2.y + tt * tt * tt * p3.y
            });
        }
        var oA = [], iA = [];
        for (i = 0; i <= steps; i++) {
            var pa = pts[i > 0 ? i - 1 : 0];
            var pb = pts[i < steps ? i + 1 : steps];
            var dx = pb.x - pa.x, dy = pb.y - pa.y;
            var len = Math.sqrt(dx * dx + dy * dy) || 1;
            var tt2 = i / steps;
            var hold = tt2 < 0.55 ? 1 : 1 - Math.pow((tt2 - 0.55) / 0.45, 1.4);
            var half = Math.max(wStart * hold, 0.4) / 2;
            oA.push({ x: pts[i].x - dy / len * half, y: pts[i].y + dx / len * half });
            iA.push({ x: pts[i].x + dy / len * half, y: pts[i].y - dx / len * half });
        }
        return band(oA, iA);
    }

    // --- Flourishes: the part that actually distinguishes one logogram ---
    var nF = 4 + Math.floor(u(16) * 3);
    for (var j = 0; j < nF; j++) {
        var o = 17 + j * 2;
        var fa = (j / nF) * TAU + (u(o) - 0.5) * (TAU / nF) * 0.8;

        if (lifts) {
            var away = Math.abs(((fa - liftCenter + Math.PI * 3) % TAU) - Math.PI);
            if (away > Math.PI - liftHalf - 0.2) fa += liftHalf * 2 + 0.35;
        }

        var fr = radiusAt(fa), fw = widthAt(fa);
        var rx = Math.cos(fa), ry = Math.sin(fa);
        var tx = -ry, ty = rx;
        var ox = cx + rx * fr, oy = cy + ry * fr;

        var code = B[(o + 1) % 32];
        var kind = code % 4;
        var dir = (code & 4) ? 1 : -1;
        // Mostly outward: an inward flourish gets swallowed by the ring.
        var out = (code & 24) !== 0 ? 1 : -1;
        var L = 24 + u(o + 1) * 32;

        var P = function (radial, tangential) {
            return {
                x: ox + rx * radial * out + tx * tangential * dir,
                y: oy + ry * radial * out + ty * tangential * dir
            };
        };

        if (kind === 3) {
            var lr = 8 + u(o + 1) * 9;
            var lc = P(lr + fw * 0.3, 0);
            svg += '<circle class="heptapod-stroke" fill="none" cx="' + f(lc.x) + '" cy="' + f(lc.y) +
                   '" r="' + f(lr) + '" stroke-width="' + f(Math.max(4, fw * 0.55)) + '"/>';
            continue;
        }

        var p0 = P(-fw * 0.35, 0), p1, p2, p3;
        if (kind === 0) {           // hook, swinging well clear of the ring
            p1 = P(L * 0.50, 0);
            p2 = P(L * 1.05, L * 0.50);
            p3 = P(L * 0.70, L * 1.20);
        } else if (kind === 1) {    // curl, coming back toward the ring
            p1 = P(L * 0.45, L * 0.10);
            p2 = P(L * 0.95, L * 0.85);
            p3 = P(L * 0.05, L * 1.05);
        } else {                    // spur
            p1 = P(L * 0.40, L * 0.12);
            p2 = P(L * 0.78, L * 0.34);
            p3 = P(L * 1.05, L * 0.55);
        }

        svg += '<path class="heptapod-fill" d="' +
               taperedCubic(p0, p1, p2, p3, Math.max(fw * 0.9, 5.5)) + '"/>';
    }

    // --- Ink accents: a couple of deliberate beads on the ring, not dust ---
    var nD = 1 + Math.floor(u(29) * 3);
    for (var k = 0; k < nD; k++) {
        var da = u(30 + k) * TAU;
        var dRad = radiusAt(da) + (u(31 - k) - 0.5) * 20;
        var dr = 3.5 + u(28 - k) * 4;
        svg += '<circle class="heptapod-fill" cx="' + f(cx + Math.cos(da) * dRad) +
               '" cy="' + f(cy + Math.sin(da) * dRad) + '" r="' + f(dr) + '"/>';
    }

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="' + size +
           '" height="' + size + '" class="heptapod-svg">' + svg + '</svg>';
}

/**
 * SHA-256 hash of a string, returned as 64 hex chars.
 */
async function hashText(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(function(b) {
        return b.toString(16).padStart(2, '0');
    }).join('');
}

/**
 * Render the name-hash heptapod logo in the header.
 */
(async function() {
    var nameHash = await hashText("Sidharth Sharma");
    var el = document.getElementById('name-heptapod');
    if (el) {
        el.innerHTML = heptapodCircle(nameHash, 32);
    }
})();
