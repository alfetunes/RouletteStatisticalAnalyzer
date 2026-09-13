// Visual roulette wheel: renders an SVG wheel in true physical pocket order
// and animates it to a result that has ALREADY been generated. The ball's
// visual stopping point never determines the outcome — it only visualizes
// a result computed beforehand by js/random.js (spec §8-9).

import { getColor } from './roulette.js';

// Real physical wheel pocket order (clockwise), not numeric order.
const EUROPEAN_WHEEL_ORDER = [
    '0', '32', '15', '19', '4', '21', '2', '25', '17', '34', '6', '27', '13', '36', '11',
    '30', '8', '23', '10', '5', '24', '16', '33', '1', '20', '14', '31', '9', '22', '18',
    '29', '7', '28', '12', '35', '3', '26',
];

const AMERICAN_WHEEL_ORDER = [
    '0', '28', '9', '26', '30', '11', '7', '20', '32', '17', '5', '22', '34', '15', '3',
    '24', '36', '13', '1', '00', '27', '10', '25', '29', '12', '8', '19', '31', '18', '6',
    '21', '33', '16', '4', '23', '35', '14', '2',
];

function getWheelOrder(rouletteType) {
    return rouletteType === 'american' ? AMERICAN_WHEEL_ORDER : EUROPEAN_WHEEL_ORDER;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function pocketFillColor(pocket) {
    const color = getColor(pocket);
    if (color === 'red') return '#b3122c';
    if (color === 'black') return '#181818';
    return '#146b3a';
}

function buildWheelSvg(rouletteType) {
    const order = getWheelOrder(rouletteType);
    const count = order.length;
    const size = 320;
    const center = size / 2;
    const outerRadius = center - 6;
    const innerRadius = outerRadius * 0.55;
    const anglePer = 360 / count;

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.setAttribute('class', 'roulette-wheel__svg');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `${rouletteType === 'american' ? 'American' : 'European'} roulette wheel`);

    // Centering uses an SVG attribute transform on a static outer group.
    // Rotation is later applied via CSS `style.transform` on the inner
    // wheelGroup — CSS transform fully replaces any attribute transform on
    // the SAME element (they don't compose), so the translate and the
    // rotation must live on two different <g> elements.
    const centerGroup = document.createElementNS(SVG_NS, 'g');
    centerGroup.setAttribute('transform', `translate(${center} ${center})`);

    const wheelGroup = document.createElementNS(SVG_NS, 'g');
    wheelGroup.setAttribute('class', 'roulette-wheel__rotor');
    // Rotation happens entirely within centerGroup's local space, so the
    // pivot is that space's origin, not the wheel's bounding-box center.
    wheelGroup.style.transformOrigin = '0px 0px';
    centerGroup.appendChild(wheelGroup);

    order.forEach((pocket, i) => {
        const startAngle = i * anglePer - 90 - anglePer / 2;
        const endAngle = startAngle + anglePer;
        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', wedgePath(outerRadius, innerRadius, startAngle, endAngle));
        path.setAttribute('fill', pocketFillColor(pocket));
        path.setAttribute('stroke', '#0a0a0a');
        path.setAttribute('stroke-width', '0.5');
        wheelGroup.appendChild(path);

        const labelAngle = startAngle + anglePer / 2;
        const labelRadius = (outerRadius + innerRadius) / 2;
        const rad = (labelAngle * Math.PI) / 180;
        const lx = labelRadius * Math.cos(rad);
        const ly = labelRadius * Math.sin(rad);
        const text = document.createElementNS(SVG_NS, 'text');
        text.setAttribute('x', String(lx));
        text.setAttribute('y', String(ly));
        text.setAttribute('fill', '#f2f0ea');
        text.setAttribute('font-size', pocket.length > 1 ? '9' : '10');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('transform', `rotate(${labelAngle + 90} ${lx} ${ly})`);
        text.textContent = pocket;
        wheelGroup.appendChild(text);
    });

    const hub = document.createElementNS(SVG_NS, 'circle');
    hub.setAttribute('r', String(innerRadius * 0.7));
    hub.setAttribute('fill', '#2a2115');
    hub.setAttribute('stroke', '#d4af37');
    hub.setAttribute('stroke-width', '2');
    wheelGroup.appendChild(hub);

    svg.appendChild(centerGroup);

    // A visible track the ball rides on, so its motion around the wheel
    // (independent of the wheel's own rotation) actually reads as "rolling".
    const ballTrackRadius = outerRadius - 10;
    const track = document.createElementNS(SVG_NS, 'circle');
    track.setAttribute('cx', String(center));
    track.setAttribute('cy', String(center));
    track.setAttribute('r', String(ballTrackRadius));
    track.setAttribute('fill', 'none');
    track.setAttribute('stroke', 'rgba(242, 240, 234, 0.25)');
    track.setAttribute('stroke-width', '1');
    svg.appendChild(track);

    const ballDefs = document.createElementNS(SVG_NS, 'defs');
    const ballGradientId = `ball-gradient-${Math.random().toString(36).slice(2)}`;
    ballDefs.innerHTML = `
        <radialGradient id="${ballGradientId}" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="55%" stop-color="#f2f0ea" />
            <stop offset="100%" stop-color="#b9b6ad" />
        </radialGradient>
    `;
    svg.appendChild(ballDefs);

    const ball = document.createElementNS(SVG_NS, 'circle');
    ball.setAttribute('class', 'roulette-wheel__ball');
    ball.setAttribute('r', '6');
    ball.setAttribute('fill', `url(#${ballGradientId})`);
    ball.setAttribute('cx', String(center + ballTrackRadius));
    ball.setAttribute('cy', String(center));
    svg.appendChild(ball);

    const pointer = document.createElementNS(SVG_NS, 'polygon');
    pointer.setAttribute('points', `${center - 8},4 ${center + 8},4 ${center},20`);
    pointer.setAttribute('fill', '#d4af37');
    svg.appendChild(pointer);

    return { svg, wheelGroup, ball, anglePer, order, ballTrackRadius, center };
}

function wedgePath(outerR, innerR, startDeg, endDeg) {
    const toXY = (r, deg) => {
        const rad = (deg * Math.PI) / 180;
        return [r * Math.cos(rad), r * Math.sin(rad)];
    };
    const [x1, y1] = toXY(outerR, startDeg);
    const [x2, y2] = toXY(outerR, endDeg);
    const [x3, y3] = toXY(innerR, endDeg);
    const [x4, y4] = toXY(innerR, startDeg);
    return `M ${x1} ${y1} A ${outerR} ${outerR} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 0 0 ${x4} ${y4} Z`;
}

/**
 * Creates a roulette wheel bound to a container element.
 * @param {HTMLElement} container
 * @param {'european'|'american'} rouletteType
 */
export function createRouletteWheel(container, rouletteType) {
    let state = buildWheelSvg(rouletteType);
    let wheelRotation = 0;
    let ballRotation = 0;
    let pendingCompletionTimer = null;
    container.innerHTML = '';
    container.appendChild(state.svg);

    function cancelPendingCompletion() {
        if (pendingCompletionTimer !== null) {
            window.clearTimeout(pendingCompletionTimer);
            pendingCompletionTimer = null;
        }
    }

    function setRouletteType(newType) {
        cancelPendingCompletion();
        rouletteType = newType;
        wheelRotation = 0;
        ballRotation = 0;
        state = buildWheelSvg(rouletteType);
        container.innerHTML = '';
        container.appendChild(state.svg);
    }

    function normalizeMod(deg) {
        return ((deg % 360) + 360) % 360;
    }

    /**
     * Animates the wheel/ball to land on `result`, which must already be a
     * known, previously generated outcome. Calls onComplete() once the
     * animation finishes (not before).
     */
    function spinToResult(result, onComplete) {
        cancelPendingCompletion();
        const index = state.order.indexOf(String(result));
        if (index === -1) {
            onComplete?.();
            return;
        }

        // Vary rotation count/duration each spin so spins don't look identical.
        const extraTurns = 4 + Math.floor(Math.random() * 4); // 4-7 full turns
        const wheelDurationMs = 3800 + Math.floor(Math.random() * 1800); // 3.8s-5.6s
        // The ball keeps rolling a little after the wheel settles, like a real one.
        const ballDurationMs = wheelDurationMs + 500 + Math.floor(Math.random() * 500);

        const targetPocketAngle = index * state.anglePer;
        wheelRotation += extraTurns * 360 + ((360 - (wheelRotation % 360) - targetPocketAngle + 360) % 360);

        // The ball must end up at the same absolute angle as the pointer
        // (-90deg / 270deg), which is exactly where the winning pocket comes
        // to rest — otherwise the ball visually lands nowhere near the result.
        const targetBallAngle = 270;
        const deltaNeeded = normalizeMod(normalizeMod(ballRotation) - targetBallAngle);
        const extraBallTurns = extraTurns + 3 + Math.floor(Math.random() * 2);
        ballRotation -= extraBallTurns * 360 + deltaNeeded;

        state.wheelGroup.style.transition = `transform ${wheelDurationMs}ms cubic-bezier(0.15, 0.85, 0.25, 1)`;
        state.wheelGroup.style.transform = `rotate(${wheelRotation}deg)`;

        state.ball.style.transformOrigin = `${state.center}px ${state.center}px`;
        state.ball.style.transition = `transform ${ballDurationMs}ms cubic-bezier(0.12, 0.65, 0.18, 1)`;
        state.ball.style.transform = `rotate(${ballRotation}deg)`;

        pendingCompletionTimer = window.setTimeout(() => {
            pendingCompletionTimer = null;
            onComplete?.();
        }, Math.max(wheelDurationMs, ballDurationMs) + 60);
    }

    function destroy() {
        cancelPendingCompletion();
        container.innerHTML = '';
    }

    return { setRouletteType, spinToResult, destroy };
}

export { getWheelOrder };
