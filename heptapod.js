/**
 * Heptapod Circle — turns a SHA-256 hash into a bold, inky ~270° arc SVG
 * inspired by the logograms in Arrival.
 *
 * Byte mapping:
 *   0-9   : Arc shape (thickness, wobble, pressure, gap position)
 *   10-29 : Cluster positions and density zones for brush strokes
 *   30-49 : Brush stroke parameters (length, thickness, curvature)
 *   50-63 : Ink splatters near density zones
 */

function heptapodCircle(hexHash, size) {
    size = size || 200;
    var bytes = [];
    for (var i = 0; i < 64; i++) {
        bytes.push(parseInt(hexHash[i], 16) * 17); // 0-255
    }

    var cx = 200, cy = 200, r = 130;
    var TAU = Math.PI * 2;
    var svg = '';

    // --- Bytes 0-9: Arc parameters ---
    var baseThick = 16 + (bytes[0] / 255) * 14;       // 16-30px — very bold
    var waviness = 1.5 + (bytes[1] / 255) * 4;        // subtle organic wobble
    var waveFreq = 1.5 + (bytes[2] / 255) * 2.5;      // low freq = smooth
    var pressureVar = 0.25 + (bytes[3] / 255) * 0.45;

    // --- Single large gap (~70-110°), position determined by bytes[4-5] ---
    var gapCenter = (bytes[4] / 255) * 360;
    var gapWidth = 70 + (bytes[5] / 255) * 40;  // 70-110 degree gap
    var gapStart = ((gapCenter - gapWidth / 2) + 360) % 360;
    var gapEnd = (gapCenter + gapWidth / 2) % 360;

    function isInGap(deg) {
        deg = ((deg % 360) + 360) % 360;
        if (gapStart < gapEnd) {
            return deg >= gapStart && deg <= gapEnd;
        } else {
            return deg >= gapStart || deg <= gapEnd;
        }
    }

    // --- Bytes 10-17: 2-3 density cluster centers on the arc ---
    var numClusters = 2 + Math.floor((bytes[10] / 255) * 2); // 2-3
    var clusters = [];
    for (var ci = 0; ci < numClusters; ci++) {
        var cDeg = (bytes[11 + ci * 2] / 255) * 360;
        // Push away from gap center so clusters sit on the arc
        var distFromGap = Math.abs(((cDeg - gapCenter + 540) % 360) - 180);
        if (distFromGap < gapWidth / 2 + 20) {
            cDeg = (cDeg + gapWidth) % 360;
        }
        var cSpread = 20 + (bytes[12 + ci * 2] / 255) * 30; // how wide each cluster spreads
        clusters.push({ deg: cDeg, spread: cSpread });
    }

    function clusterDensity(deg) {
        var maxD = 0;
        for (var k = 0; k < clusters.length; k++) {
            var diff = Math.abs(((deg - clusters[k].deg + 540) % 360) - 180);
            var d = Math.max(0, 1.0 - diff / clusters[k].spread);
            if (d > maxD) maxD = d;
        }
        return maxD;
    }

    // --- Build the main arc points ---
    var segments = 540;
    var arcPoints = [];

    for (var s = 0; s <= segments; s++) {
        var deg = (s / segments) * 360;
        if (isInGap(deg)) continue;
        var angle = (deg / 360) * TAU;

        var wobble = Math.sin(angle * waveFreq + bytes[6] * 0.05) * waviness
                   + Math.sin(angle * (waveFreq + 1.7) + bytes[7] * 0.03) * waviness * 0.4
                   + Math.sin(angle * 0.7 + bytes[8] * 0.07) * waviness * 0.25;
        var pr = r + wobble;
        var px = cx + Math.cos(angle) * pr;
        var py = cy + Math.sin(angle) * pr;

        // Pressure varies: thicker at cluster zones
        var density = clusterDensity(deg);
        var pressure = 1.0
                     + Math.sin(angle * 1.3 + bytes[9] * 0.04) * pressureVar
                     + density * 0.35;

        arcPoints.push({ x: px, y: py, pressure: pressure, angle: angle, deg: deg, r: pr });
    }

    // --- Draw main arc as thick filled shape ---
    if (arcPoints.length > 2) {
        var outerPath = '';
        var innerPts = [];

        for (var pi = 0; pi < arcPoints.length; pi++) {
            var pt = arcPoints[pi];
            var radial = Math.atan2(pt.y - cy, pt.x - cx);
            var halfW = (baseThick * pt.pressure) / 2;
            var ox = pt.x + Math.cos(radial) * halfW;
            var oy = pt.y + Math.sin(radial) * halfW;
            var ix = pt.x - Math.cos(radial) * halfW;
            var iy = pt.y - Math.sin(radial) * halfW;

            if (pi === 0) {
                outerPath = 'M' + ox.toFixed(1) + ',' + oy.toFixed(1);
            } else {
                outerPath += ' L' + ox.toFixed(1) + ',' + oy.toFixed(1);
            }
            innerPts.push({ x: ix, y: iy });
        }

        for (var qi = innerPts.length - 1; qi >= 0; qi--) {
            outerPath += ' L' + innerPts[qi].x.toFixed(1) + ',' + innerPts[qi].y.toFixed(1);
        }
        outerPath += ' Z';

        svg += '<path d="' + outerPath + '" class="heptapod-fill"/>';
    }

    // --- Thick brush strokes concentrated at cluster zones, parallel to arc ---
    // These are tangential arcs that follow the ring, not radial spikes
    for (var bi = 0; bi < 48; bi++) {
        var b0 = bytes[bi % 64] / 255;
        var b1 = bytes[(bi * 7 + 1) % 64] / 255;
        var b2 = bytes[(bi * 7 + 2) % 64] / 255;
        var b3 = bytes[(bi * 7 + 3) % 64] / 255;

        // Place this stroke at a cluster zone
        var cIdx = bi % clusters.length;
        var stDeg = clusters[cIdx].deg + (b0 - 0.5) * clusters[cIdx].spread * 2;
        stDeg = ((stDeg % 360) + 360) % 360;

        // Skip if in gap
        if (isInGap(stDeg)) continue;

        var density = clusterDensity(stDeg);
        if (density < 0.15 && bi > 20) continue; // sparse outside clusters

        var stAngle = (stDeg / 360) * TAU;
        // Tangent direction (perpendicular to radial = parallel to arc)
        var tangentAngle = stAngle + Math.PI / 2;

        // Offset from ring: stay close
        var outward = (bi % 3 !== 0);
        var offset = outward
            ? baseThick * 0.2 + b1 * 10
            : -(baseThick * 0.2 + b1 * 8);
        var brushR = r + offset;
        var bx = cx + Math.cos(stAngle) * brushR;
        var by = cy + Math.sin(stAngle) * brushR;

        // Short brush stroke length — must stay local, never bridge
        var arcLen = 5 + b2 * (density > 0.5 ? 17 : 10);
        // Tiny radial drift
        var drift = (b3 - 0.5) * 6;

        var ex = bx + Math.cos(tangentAngle) * arcLen + Math.cos(stAngle) * drift;
        var ey = by + Math.sin(tangentAngle) * arcLen + Math.sin(stAngle) * drift;

        // Control point for curvature — follows the arc
        var cpx = (bx + ex) / 2 + Math.cos(stAngle) * (drift * 0.6 + (b1 - 0.5) * 8);
        var cpy = (by + ey) / 2 + Math.sin(stAngle) * (drift * 0.6 + (b1 - 0.5) * 8);

        var strokeW = density > 0.5
            ? 2 + b1 * 8    // bold in dense areas
            : 1 + b1 * 3;   // fine elsewhere
        var opacity = density > 0.3
            ? 0.85 + b0 * 0.15
            : 0.7 + b0 * 0.25;

        svg += '<path d="M' + bx.toFixed(1) + ',' + by.toFixed(1) +
               ' Q' + cpx.toFixed(1) + ',' + cpy.toFixed(1) +
               ' ' + ex.toFixed(1) + ',' + ey.toFixed(1) + '"' +
               ' fill="none" class="heptapod-stroke" opacity="' + opacity.toFixed(2) + '"' +
               ' stroke-width="' + strokeW.toFixed(1) + '" stroke-linecap="round"/>';
    }

    // --- Bold endpoint strokes at gap edges (like ink pooling at brush-lift) ---
    var edgeAngles = [
        ((gapStart - 5 + 360) % 360) / 360 * TAU,
        ((gapEnd + 5) % 360) / 360 * TAU
    ];
    for (var ei = 0; ei < 2; ei++) {
        var ea = edgeAngles[ei];
        var tangent = ea + Math.PI / 2;
        for (var ej = 0; ej < 4; ej++) {
            var eb = bytes[(20 + ei * 4 + ej) % 64] / 255;
            var eb2 = bytes[(28 + ei * 4 + ej) % 64] / 255;
            var eOffset = (eb - 0.5) * baseThick * 1.5;
            var eR = r + eOffset;
            var epx = cx + Math.cos(ea) * eR;
            var epy = cy + Math.sin(ea) * eR;
            var eLen = 6 + eb2 * 14;
            var eDir = (ej % 2 === 0) ? 1 : -1;
            var eex = epx + Math.cos(tangent) * eLen * eDir + Math.cos(ea) * (eb - 0.5) * 20;
            var eey = epy + Math.sin(tangent) * eLen * eDir + Math.sin(ea) * (eb - 0.5) * 20;

            svg += '<path d="M' + epx.toFixed(1) + ',' + epy.toFixed(1) +
                   ' L' + eex.toFixed(1) + ',' + eey.toFixed(1) + '"' +
                   ' fill="none" class="heptapod-stroke" opacity="' + (0.9 + eb * 0.1).toFixed(2) + '"' +
                   ' stroke-width="' + (3 + eb2 * 5).toFixed(1) + '" stroke-linecap="round"/>';
        }
    }

    // --- Ink splatters near cluster zones ---
    for (var si = 0; si < 14; si++) {
        var sb0 = bytes[(50 + si) % 64] / 255;
        var sb1 = bytes[(51 + si) % 64] / 255;
        var splatDeg = clusters[si % clusters.length].deg + (sb0 - 0.5) * 60;
        var splatAngle = (splatDeg / 360) * TAU;
        var sDist = r + (sb0 - 0.5) * baseThick * 2.5;
        var sx = cx + Math.cos(splatAngle) * sDist;
        var sy = cy + Math.sin(splatAngle) * sDist;
        var sR = 2 + sb1 * 6;
        var sOp = 0.7 + sb1 * 0.3;

        svg += '<circle cx="' + sx.toFixed(1) + '" cy="' + sy.toFixed(1) +
               '" r="' + sR.toFixed(1) + '" class="heptapod-fill" opacity="' + sOp.toFixed(2) + '"/>';
    }

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="' + size + '" height="' + size + '" class="heptapod-svg">' +
           svg + '</svg>';
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
 * Uses a pre-computed SHA-256 of "Sidharth Sharma".
 */
(async function() {
    // SHA-256 of "Sidharth Sharma"
    var nameHash = await hashText("Sidharth Sharma");
    var el = document.getElementById('name-heptapod');
    if (el) {
        el.innerHTML = heptapodCircle(nameHash, 32);
    }
})();
