import { FormControl } from '@angular/forms';
import { TitleMediaType } from './StaticValue';

export interface Media {
  id: number;
  name: string;
  url: string;
  type: string;
  file?: File; // Optional - not present when prefilling from API
  noOfPages?: number;
  mediaType?: TitleMediaType;
}

export interface TitleMediaGroup {
  id: FormControl<number | null>;
  url: FormControl<string | null | undefined>;
  type: FormControl<TitleMediaType>;
  file: FormControl<File | null | undefined>;
  mediaType: FormControl<TitleMediaType>;
  maxSize: FormControl<number | null>;
  name: FormControl<string | null>;
  noOfPages: FormControl<number | null>;
  allowedFormat: FormControl<string[]>;
  size: FormControl<number | null>;
}
