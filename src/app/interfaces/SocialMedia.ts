import { FormControl } from '@angular/forms';
import { SocialMediaType } from './index';

export interface socialMediaGroup {
  type: SocialMediaType;
  url: string;
  publisherId: number;
  name: string;
  autherId: number;
  id: number;
}
export interface SocialMediaGroupType {
  type: FormControl<SocialMediaType | null>;
  url: FormControl<string | null>;
  publisherId: FormControl<number | null>;
  name: FormControl<string | null>;
  autherId: FormControl<number | null>;
  id: FormControl<number | null>;
}
