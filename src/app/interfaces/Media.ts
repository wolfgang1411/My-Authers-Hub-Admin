import { FormControl } from '@angular/forms';
import { TitleMediaType } from './Titles';

export interface Media {
  id: number;
  name: string;
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
  type: FormControl<TitleMediaType>;
  file: FormControl<File | null | undefined>;
  mediaType: FormControl<TitleMediaType>;
  maxSize: FormControl<number | null>;
  name: FormControl<string | null>;
  allowedFormat: FormControl<string[]>;
  size: FormControl<number | null>;
}
