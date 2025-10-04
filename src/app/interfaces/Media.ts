import { FormControl } from '@angular/forms';
import { TitleMediaType } from './Titles';

export interface Media {
  id: number;
  url: string;
  type: string;
  file: File;
  mediaType: MediaType;
}

export type MediaType =
  | 'FullCover'
  | 'PrintInterior'
  | 'FrontCover'
  | 'BackCover'
  | 'InsideCover';

export interface TitleMediaGroup {
  id: FormControl<number | null>;
  url: FormControl<string | null | undefined>;
  type: FormControl<TitleMediaType | null | undefined>;
  file: FormControl<File | null | undefined>;
  mediaType: FormControl<TitleMediaType>;
  maxSize: FormControl<number | null>;
}
