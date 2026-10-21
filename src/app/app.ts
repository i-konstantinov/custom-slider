import { Component, signal } from '@angular/core';
import { ArcSlider, IArcSliderBaseColors, IArcSliderDisplayData, IGaugeFineControls, IGaugeOptions } from './arc-slider/arc-slider.component';

@Component({
  imports: [ArcSlider],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('custom-slider');
  fineControls: IGaugeFineControls = {
    minus: {
      color: 'accent',
      disabled: false,
    },
    plus: {
      color: 'accent',
      disabled: false,
    },
  };
  displayData: IArcSliderDisplayData = {
    handleColor: '#a5a5a5',
    showWaves: true,
    wavesActivityClass: 'active',
    functionLabel: 'Function',
    functionIconClass: 'function-icon',
    functionIconSecondaryClass: 'function-icon-secondary',
    functionIconColorClass: 'function-icon-color',
    targetPrefixLabel: 'Target',
    targetLabelColor: 'accent',
    valueColorClass: 'primary-color',
    thermostatHumidityControl: undefined,
  };
  options: IGaugeOptions = {
    min: 0,
    max: 100,
    value: 35,
    precision: 0,
    symbol: '°C',
    startColor: '#1976d2',
    stopColor: '#d32f2f',
    info: 'Temperature',
    controlReadingValue: 35,
  };
  baseColors: IArcSliderBaseColors = {
    primary: '#1976d2',
    warn: '#d32f2f',
    accent: '#dbdbdb',
  };
}
