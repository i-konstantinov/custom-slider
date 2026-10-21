import {
  afterRenderEffect,
  Component,
  computed,
  DOCUMENT,
  ElementRef,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, Subject } from 'rxjs';
import {
  getAngleFromCartesianToMyCanvas,
  getValueFromPosition,
  updatePosition,
} from '../utils/gauge.utils';

export interface IGaugeOptions {
  min: number;
  max: number;
  value: number;
  /** 1 shows one decimal place, anything else shows whole numbers */
  precision?: number;
  symbol: string;
  startColor: string;
  stopColor: string;
  info: string;
  controlReadingValue?: number;
}

export interface IGaugeOutput {
  value: number;
  color: string;
}

export interface IGaugeFineControl {
  disabled: boolean;
  color: string;
}

export interface IGaugeFineControls {
  minus: IGaugeFineControl;
  plus: IGaugeFineControl;
}

export interface IThermostatHumidityControl {
  limited?: boolean;
  signLabel?: string;
  setPointLabel?: string;
}

export interface IArcSliderDisplayData {
  handleColor: string;
  showWaves: boolean;
  wavesActivityClass: 'active' | 'inactive';
  functionLabel: string;
  functionIconClass: string;
  functionIconSecondaryClass: string;
  functionIconColorClass: string;
  targetPrefixLabel: string;
  targetLabelColor: string;
  valueColorClass: string;
  thermostatHumidityControl?: IThermostatHumidityControl;
}

export interface IArcSliderBaseColors {
  primary: string;
  warn: string;
  accent: string;
}

export type ArcSliderHostView =
  | 'controls-view'
  | 'set-boost-view'
  | 'set-period-view'
  | 'set-sensor-calibration'
  | 'settings-view-hysteresis';

type VisualFrameDiameter = 438 | 338 | 288;

interface IArcGeometry {
  center: number;
  frameRadius: number;
  angle: number;
  coloredArcRadius: number;
  coloredEndAngle: number;
}

interface ISizePreset {
  frameDiameter: number;
  frameSize: 'L' | 'M' | 'S';
  coloredArcRadiusPercentage: number;
  coloredEndAngleOffsetFactor: number;
  coloredArcLineWidth: number;
  crIndicatorRadius: number;
}

const SIZE_PRESETS: Record<VisualFrameDiameter, ISizePreset> = {
  438: {
    frameDiameter: 876,
    frameSize: 'L',
    coloredArcRadiusPercentage: 0.915,
    coloredEndAngleOffsetFactor: 0.0000395,
    coloredArcLineWidth: 34,
    crIndicatorRadius: 18,
  },
  338: {
    frameDiameter: 676,
    frameSize: 'M',
    coloredArcRadiusPercentage: 0.89,
    coloredEndAngleOffsetFactor: 0.000051,
    coloredArcLineWidth: 30,
    crIndicatorRadius: 16,
  },
  288: {
    frameDiameter: 576,
    frameSize: 'S',
    coloredArcRadiusPercentage: 0.87,
    coloredEndAngleOffsetFactor: 0.00006,
    coloredArcLineWidth: 28,
    crIndicatorRadius: 14,
  },
};

/** [window width the view must exceed, frame size to use], checked in order */
const CONTROLS_VIEW_BREAKPOINTS: readonly (readonly [number, VisualFrameDiameter])[] = [
  [1620, 438],
  [1300, 338],
  [1220, 438],
  [1080, 338],
  [700, 438],
  [440, 338],
];

const TOP = 270;
const BOTTOM = 90;
const MAX_CIRCLE_DEGREES = 360;
const FRAME_ARC_LENGTH = 320;
const FRAME_ARC_START = 20;
// The canvas arc angles below are hand-tuned values that go straight into `ctx.arc`
// (radians), so they only make sense together with each preset's end angle factor.
const FRAME_START_ANGLE = 89.975;
const FRAME_END_ANGLE = 19.975;
const COLORED_START_ANGLE = FRAME_START_ANGLE;
const MIN_COLORED_END_ANGLE = 2.02;

const HANDLE_RADIUS = 32;
const HANDLE_LINE_WIDTH = 16;
const HANDLE_OFFSET = 40;

const CR_INDICATOR_OFFSET = 38;
const CR_INDICATOR_LINE_WIDTH = 4;
const CR_INDICATOR_COLOR = '#f2f2f2';

const OUTPUT_COLOR = '#808080';
const FINE_CONTROLS_DEBOUNCE_MS = 1200;
const SMALL_MODAL_MAX_WIDTH = 540;

const toRadians = (degrees: number) => degrees * (Math.PI / 180);

function getVisualFrameDiameter(
  hostView: ArcSliderHostView,
  windowWidth: number,
): VisualFrameDiameter {
  switch (hostView) {
    case 'controls-view':
      return CONTROLS_VIEW_BREAKPOINTS.find(([minWidth]) => windowWidth > minWidth)?.[1] ?? 288;
    case 'set-boost-view':
    case 'set-period-view':
    case 'set-sensor-calibration':
      return windowWidth < 480 ? 288 : windowWidth < 600 ? 338 : 438;
    case 'settings-view-hysteresis':
      return 288;
  }
}

@Component({
  selector: 'app-arc-slider',
  templateUrl: './arc-slider.component.html',
  styleUrl: './arc-slider.component.scss',
  host: {
    '(window:resize)': 'onResize()',
  },
})
export class ArcSlider {
  private readonly document = inject(DOCUMENT);

  readonly modeBtnsColor = input('');
  readonly fineControls = input.required<IGaugeFineControls>();
  readonly gaugeInfo = input.required<IArcSliderDisplayData>();
  readonly options = input.required<IGaugeOptions>();
  readonly isActive = input(true);
  readonly boostOn = input(false);
  readonly hostView = input.required<ArcSliderHostView>();
  readonly gaugeId = input(1);
  readonly relayMode = input<string | null>();
  readonly relayType = input('THERMOSTAT');
  readonly baseColors = input.required<IArcSliderBaseColors>();
  readonly until = input<string | null>(null);
  readonly waitingForCmdResponse = input(false);

  readonly arcSliderOutput = output<IGaugeOutput>();
  readonly powerBtnEvent = output<void>();
  readonly changeModeEvent = output<string>();

  private readonly backgroundCanvas =
    viewChild.required<ElementRef<HTMLCanvasElement>>('backgroundCanvas');
  private readonly mainCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('mainCanvas');

  protected readonly scaleFactor = 0.5;
  protected readonly windowWidth = signal(this.document.defaultView?.innerWidth ?? 0);

  private readonly dragging = signal(false);
  private readonly usingFineControls = signal(false);
  private readonly interacting = computed(() => this.dragging() || this.usingFineControls());
  private readonly fineControlValue$ = new Subject<number>();

  private readonly minScale = computed(() => this.options().min);
  private readonly maxScale = computed(() => this.options().max);
  private readonly precision = computed(() => (this.options().precision === 1 ? 1 : 0));
  private readonly isModal = computed(
    () => this.hostView() === 'set-boost-view' || this.hostView() === 'set-period-view',
  );

  /**
   * Follows `options().value`, except while the user is dragging or using the fine
   * controls, so the parent's echo of an earlier value can't make the handle jump.
   */
  private readonly gaugeValue = linkedSignal<IGaugeOptions, number>({
    source: this.options,
    computation: (options, previous) =>
      previous && untracked(this.interacting) ? previous.value : options.value,
  });

  protected readonly precisedValue = computed(() =>
    Number(this.gaugeValue().toFixed(this.precision())),
  );
  protected readonly minusDisabled = computed(
    () => this.fineControls().minus.disabled || this.precisedValue() <= this.minScale(),
  );
  protected readonly plusDisabled = computed(
    () => this.fineControls().plus.disabled || this.precisedValue() >= this.maxScale(),
  );

  private readonly preset = computed(
    () => SIZE_PRESETS[getVisualFrameDiameter(this.hostView(), this.windowWidth())],
  );
  protected readonly frameDiameter = computed(() => this.preset().frameDiameter);
  protected readonly scalledDiameter = computed(() => this.frameDiameter() * this.scaleFactor);
  protected readonly frameSize = computed(() => this.preset().frameSize);

  private readonly geometry = computed((): IArcGeometry => {
    const { frameDiameter, coloredArcRadiusPercentage, coloredEndAngleOffsetFactor } =
      this.preset();
    const frameRadius = frameDiameter / 2;
    const position = updatePosition(this.gaugeValue(), this.minScale(), this.maxScale());
    const angle = BOTTOM + FRAME_ARC_START + position * FRAME_ARC_LENGTH;

    return {
      center: frameRadius,
      frameRadius,
      angle,
      coloredArcRadius: frameRadius * coloredArcRadiusPercentage,
      coloredEndAngle: Math.max(
        angle * frameRadius * coloredEndAngleOffsetFactor,
        MIN_COLORED_END_ANGLE,
      ),
    };
  });

  constructor() {
    this.fineControlValue$
      .pipe(debounceTime(FINE_CONTROLS_DEBOUNCE_MS), takeUntilDestroyed())
      .subscribe((value) => {
        this.usingFineControls.set(false);
        this.emitValue(value);
      });

    // Resizing a canvas clears it, so both layers are redrawn whenever the preset changes.
    afterRenderEffect(() => this.drawBackground());
    afterRenderEffect(() => this.drawArc());
  }

  protected onResize(): void {
    this.windowWidth.set(this.document.defaultView?.innerWidth ?? 0);
  }

  protected onPointerDown(event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.hostView() === 'controls-view' && !this.isActive()) {
      this.requestManualMode();
      return;
    }
    if (this.usingFineControls()) {
      return;
    }

    this.mainCanvas().nativeElement.setPointerCapture(event.pointerId);
    this.dragging.set(true);
    this.moveHandleTo(event);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (this.dragging()) {
      event.preventDefault();
      this.moveHandleTo(event);
    }
  }

  protected onPointerUp(): void {
    if (this.dragging()) {
      this.dragging.set(false);
      this.emitValue(this.precisedValue());
    }
  }

  protected onControlBtn(btn: 'minus' | 'plus'): void {
    if (this.hostView() === 'controls-view' && !this.isActive()) {
      this.requestManualMode();
      return;
    }
    if (btn === 'minus' ? this.minusDisabled() : this.plusDisabled()) {
      return;
    }

    const step = this.precision() === 1 ? 0.1 : 1;
    this.usingFineControls.set(true);
    this.setValue(this.precisedValue() + (btn === 'minus' ? -step : step));
    this.fineControlValue$.next(this.precisedValue());
  }

  protected onPowerBtn(): void {
    this.powerBtnEvent.emit();
  }

  protected onModeBtn(mode: string): void {
    this.changeModeEvent.emit(mode);
  }

  private requestManualMode(): void {
    if (this.relayMode() === 'SCHEDULE') {
      this.changeModeEvent.emit('MANUAL');
    }
  }

  private emitValue(value: number): void {
    this.arcSliderOutput.emit({ value, color: OUTPUT_COLOR });
  }

  private setValue(value: number): void {
    this.gaugeValue.set(Math.min(Math.max(value, this.minScale()), this.maxScale()));
  }

  private moveHandleTo(event: PointerEvent): void {
    const canvas = this.mainCanvas().nativeElement;
    const rect = canvas.getBoundingClientRect();
    // The canvas is displayed scaled down, so convert from screen to canvas pixels
    const ratio = rect.width ? canvas.width / rect.width : 1;
    let x = (event.clientX - rect.left) * ratio;
    let y = (event.clientY - rect.top) * ratio;
    const center = this.geometry().center;

    if (this.isModal() && this.windowWidth() < SMALL_MODAL_MAX_WIDTH) {
      y *= 0.75;
      x += (center - x) * 0.37;
    }

    const angle =
      getAngleFromCartesianToMyCanvas({ x, y, a: center, b: center }, TOP, MAX_CIRCLE_DEGREES) -
      FRAME_ARC_START;
    this.setValue(getValueFromPosition(angle, FRAME_ARC_LENGTH, this.minScale(), this.maxScale()));
  }

  private drawBackground(): void {
    const ctx = this.backgroundCanvas().nativeElement.getContext('2d');
    const { frameDiameter, coloredArcLineWidth } = this.preset();
    const { center, coloredArcRadius } = this.geometry();
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, frameDiameter, frameDiameter);
    ctx.beginPath();
    ctx.arc(center, center, coloredArcRadius, FRAME_START_ANGLE, FRAME_END_ANGLE);
    ctx.strokeStyle = this.baseColors().accent;
    ctx.lineWidth = coloredArcLineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  private drawArc(): void {
    const ctx = this.mainCanvas().nativeElement.getContext('2d');
    const { frameDiameter } = this.preset();
    const isActive = this.isActive();
    const { startColor, stopColor, controlReadingValue } = this.options();
    const handleColor = this.gaugeInfo().handleColor;
    const geometry = this.geometry();
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, frameDiameter, frameDiameter);
    if (!isActive) {
      return;
    }

    this.drawColoredArc(ctx, geometry, startColor, stopColor);
    this.drawHandle(ctx, geometry, handleColor);
    if (controlReadingValue !== undefined) {
      this.drawControlReadingIndicator(ctx, geometry, controlReadingValue);
    }
  }

  private drawColoredArc(
    ctx: CanvasRenderingContext2D,
    { center, coloredArcRadius, coloredEndAngle }: IArcGeometry,
    startColor: string,
    stopColor: string,
  ): void {
    const gradient = ctx.createConicGradient(FRAME_ARC_START, center, center);
    gradient.addColorStop(0, startColor);
    gradient.addColorStop(1, stopColor);

    ctx.beginPath();
    ctx.arc(center, center, coloredArcRadius, COLORED_START_ANGLE, coloredEndAngle);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = this.preset().coloredArcLineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  private drawHandle(
    ctx: CanvasRenderingContext2D,
    { center, frameRadius, angle }: IArcGeometry,
    handleColor: string,
  ): void {
    const distance = frameRadius - HANDLE_OFFSET;

    ctx.beginPath();
    ctx.arc(
      center + distance * Math.cos(toRadians(angle)),
      center + distance * Math.sin(toRadians(angle)),
      HANDLE_RADIUS,
      0,
      2 * Math.PI,
    );
    ctx.lineWidth = HANDLE_LINE_WIDTH;
    ctx.strokeStyle = handleColor;
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.stroke();
  }

  private drawControlReadingIndicator(
    ctx: CanvasRenderingContext2D,
    { center, frameRadius }: IArcGeometry,
    controlReading: number,
  ): void {
    const min = this.minScale();
    const max = this.maxScale();
    if (controlReading < min || controlReading > max) {
      return;
    }

    const position = updatePosition(controlReading, min, max);
    const angle = BOTTOM + FRAME_ARC_START + position * FRAME_ARC_LENGTH;
    const distance = frameRadius - CR_INDICATOR_OFFSET;

    ctx.beginPath();
    ctx.arc(
      center + distance * Math.cos(toRadians(angle)),
      center + distance * Math.sin(toRadians(angle)),
      this.preset().crIndicatorRadius,
      0,
      2 * Math.PI,
    );
    ctx.lineWidth = CR_INDICATOR_LINE_WIDTH;
    ctx.strokeStyle = CR_INDICATOR_COLOR;
    ctx.stroke();
  }
}
