
export function updatePosition(value: number, minScale: number, maxScale: number): number {
    const pos = (value / getArcRangeValue(minScale, maxScale));
    // because we may have value in temperature scala beginning > 0 and < 0 we must add tempOffset !!!
    const offset = ((-1 * minScale) / getArcRangeValue(minScale, maxScale));
    return pos + offset;
}

export function getValueFromPosition(angle: number, arcLength: number, minScale: number, maxScale: number): number {
    let percent = angle / arcLength;
    let temp = percent * getArcRangeValue(minScale, maxScale);
    return minScale + temp;
}
function getArcRangeValue(minScale: number, maxScale: number): number {
    let allScale: number;
    if (minScale >= 0) {
        allScale = maxScale - minScale;
    } else {
        allScale = maxScale + (minScale * -1);
    }
    return allScale;
}


export function getAngleFromCartesianToMyCanvas(
    data: {
        x: number, y: number, a: number, b: number
    },
    TOP: number,
    MAX_CIRCLE_DEGREES: number
): number {
    let angle = getAngleInCartesianCoordinateSystem(data.x, data.y, data.a, data.b, MAX_CIRCLE_DEGREES);

    if (angle + TOP < MAX_CIRCLE_DEGREES) {
        angle += TOP;
    } else {
        angle = (angle + TOP) - MAX_CIRCLE_DEGREES;
    }

    return angle;
}
function getAngleInCartesianCoordinateSystem(x: number, y: number, a: number, b: number, MAX_CIRCLE_DEGREES: number): number {
    let angle = toDegrees(Math.atan2(y - b, x - a));
    if (angle < 0) {
        angle += MAX_CIRCLE_DEGREES;
    }
    return angle;
}
function toDegrees(radians: number): number {
    return radians * 180 / Math.PI;
};
