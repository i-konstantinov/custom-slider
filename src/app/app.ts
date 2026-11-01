import { Component, computed, signal } from '@angular/core';
import { ArcSlider, IArcSliderBaseColors, IArcSliderDisplayData, IGaugeOptions } from './arc-slider/arc-slider.component';

@Component({
  imports: [ArcSlider],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly isActive = signal(true);
  displayData: IArcSliderDisplayData = {
    handleColor: '#a5a5a5',
    functionLabel: 'Function',
    functionIconClass: 'function-icon',
    functionIconSecondaryClass: 'function-icon-secondary',
    functionIconColorClass: 'function-icon-color',
    targetPrefixLabel: 'Target',
    targetLabelColor: 'accent',
    valueColorClass: 'primary-color',
  };
  // The slider's `options` input is signal based, so changes are published as a new object.
  protected readonly options = signal<IGaugeOptions>({
    min: 0,
    max: 100,
    value: 50,
    precision: 1,
    // symbol: '°C',
    symbol: '%',
    startColor: '#1976d2',
    stopColor: '#d32f2f',
    info: 'Temperature',
    controlReadingValue: 50,
  });
  protected readonly warmColors = ['#d32f2f', '#e64a19', '#f57c00', '#ffa000', '#fbc02d'];
  protected readonly coldColors = ['#1976d2', '#0288d1', '#0097a7', '#3949ab', '#5e35b1'];
  protected readonly selectedStartColor = computed(() => this.options().startColor);
  protected readonly selectedStopColor = computed(() => this.options().stopColor);
  protected readonly controlReadingStep = computed(() => (this.options().precision === 1 ? 0.1 : 1));
  baseColors: IArcSliderBaseColors = {
    primary: '#1976d2',
    warn: '#d32f2f',
    accent: '#dbdbdb',
  };

  protected onPowerBtn(): void {
    this.isActive.update((active) => !active);
  }

  /** Creates new options with the given start and/or stop color. */
  protected updateColors(colors: Partial<Pick<IGaugeOptions, 'startColor' | 'stopColor'>>): void {
    this.options.update((options) => ({ ...options, ...colors }));
  }

  /** Reads the number field and stores it, clamped to `min`..`max`, as `controlReadingValue`. */
  protected onControlReadingChange(event: Event): void {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    if (Number.isNaN(value)) {
      return;
    }
    this.options.update((options) => ({
      ...options,
      controlReadingValue: Math.min(options.max, Math.max(options.min, value)),
    }));
  }

  /** Reads the radio group, whose values are `0` or `1`, and stores it as `precision`. */
  protected onPrecisionChange(event: Event): void {
    const precision = Number((event.target as HTMLInputElement).value);
    this.options.update((options) => ({ ...options, precision }));
  }
}
