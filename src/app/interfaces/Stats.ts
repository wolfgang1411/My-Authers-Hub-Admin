export interface Stat {
  title: string;
  value: string;
  subtitle?: string;
  smallChartType?: 'bar' | 'spark' | 'line';
  color?: string;
}
