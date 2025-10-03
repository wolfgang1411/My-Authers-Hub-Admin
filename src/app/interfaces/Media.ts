import { FormControl } from '@angular/forms';

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

export interface MediaGroup {
  id: FormControl<number | null>;
  url: FormControl<string | null | undefined>;
  type: FormControl<MediaType | null | undefined>;
  file: FormControl<File | null | undefined>;
  mediaType: FormControl<MediaType | null>;
}
