import { PlatForm } from './StaticValue';

export type StatsResponseMap = {
  WEEKLY: StatsWeekly;
  MONTHLY: StatsMonthly;
  YEARLY: StatsYearly;
};

export type DashbordStateType = 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export type StatsWeekly = Record<Day, Record<PlatForm, DashboardStat>>;

export type StatsMonthly = Record<string, Record<PlatForm, DashboardStat>>;

export type StatsYearly = Record<Month, Record<PlatForm, DashboardStat>>;

export interface DashboardStat {
  amount: number;
  count: number;
}

export type Day =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export type Month =
  | 'Jan'
  | 'Feb'
  | 'Mar'
  | 'Apr'
  | 'May'
  | 'Jun'
  | 'Jul'
  | 'Aug'
  | 'Sep'
  | 'Oct'
  | 'Nov'
  | 'Dev';
