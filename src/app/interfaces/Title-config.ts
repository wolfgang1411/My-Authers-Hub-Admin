import { StaticValues, TitleConfigType } from './index';
import { Title } from './Titles';

export interface TitleConfig {
  id: number;
  position: number;
  type: typeof StaticValues.TitleConfigType;
  title: Title;
}

export interface TitleConfigFilter {
  page?: number;
  itemsPerPage?: number;
  type?:
    | typeof StaticValues.TitleConfigType
    | (typeof StaticValues.TitleConfigType)[];
}

export interface CreateTitleConfig {
  type: TitleConfigType;
  titleId: number;
  position: number;
}
