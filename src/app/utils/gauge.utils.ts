interface IThemeColors {
    primary: string;
    warn: string;
}

export interface ITheme {
    app: string;
    colors: IThemeColors & {
        secondOrder?: IThemeColors;
        thirdOrder?: IThemeColors;
    };
}

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


export function getGaugeColors(relayType: string, currentTheme: ITheme | undefined): string[] {
    let start = "#3E6BDB";
    let stop = "#E35449";
    if (currentTheme) {
        if (currentTheme.app == "prosmart" || currentTheme.app == "cordivari") {
            start = currentTheme.colors.primary;
            stop = currentTheme.colors.warn;
        }
        else if (currentTheme.app == 'i-gate-wifi') {
            start = relayType == "HUMIDISTAT" ? currentTheme.colors.secondOrder!.primary : currentTheme.colors.secondOrder!.warn;
            stop = relayType == "HUMIDISTAT" ? currentTheme.colors.secondOrder!.primary : currentTheme.colors.secondOrder!.warn;
        }
        else if (currentTheme.app == "vobeli") {
            start = currentTheme.colors.primary;
            stop = currentTheme.colors.secondOrder!.primary;
        }
        else {
            // if this.currentApp == "computherm" || "lockifi" || "ferroli" || "iceberg" || "vesta"
            start = currentTheme.colors.thirdOrder!.primary;
            stop = currentTheme.colors.warn;
        }
    }

    return [start, stop];
}

export function getFineControlsColor(disabled: boolean, relayType: string, currentTheme: ITheme|undefined): string {
    let result = "#d4d4d4";

    if (disabled == false && currentTheme != undefined) {
        if (currentTheme.app == "i-gate-wifi") {
            result = relayType == "HUMIDISTAT" ? currentTheme.colors.secondOrder!.primary : currentTheme.colors.secondOrder!.warn;
        }
        else if (currentTheme.app == "prosmart" || currentTheme.app == "cordivari") {
            result = relayType == "HUMIDISTAT" ? currentTheme.colors.primary : currentTheme.colors.warn;
        }
        else if (currentTheme.app == "vobeli") {
            result = currentTheme.colors.secondOrder!.primary;
        }
        else {
            // computherm, lockifi, ferroli, iceberg, vesta
            result = relayType == "HUMIDISTAT" ? currentTheme!.colors.thirdOrder!.primary : currentTheme.colors.warn;
        }
    }

    return result;
}

export function getArcHandleColor(relayType: string, currentTheme: ITheme|undefined): string {
    let result = "#d4d4d4";
//this.relay.type == 'HUMIDISTAT' ? this.options.startColor : this.options.stopColor; //LOG DELETE
    if (currentTheme) {
        if (currentTheme.app == "prosmart" || currentTheme.app == "cordivari") {
            result = relayType == 'HUMIDISTAT' ? currentTheme.colors.primary : currentTheme.colors.warn;
        }
        else if (currentTheme.app == 'i-gate-wifi') {
            result = relayType == 'HUMIDISTAT' ? currentTheme.colors.secondOrder!.primary : currentTheme.colors.secondOrder!.warn;
        }
        else if (currentTheme.app == "vobeli") {
            result = currentTheme.colors.primary;
        }
        else {
            // if this.currentApp == "computherm" || "lockifi" || "ferroli" || "iceberg" || "vesta"
            result = relayType == 'HUMIDISTAT' ? currentTheme.colors.thirdOrder!.primary : currentTheme.colors.warn;
        }
    }
    return result;
}