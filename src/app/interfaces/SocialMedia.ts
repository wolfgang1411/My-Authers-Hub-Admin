import { SocialMediaType } from './index';

export interface socialMediaGroup {
  type: SocialMediaType;
  url: string;
  publisherId: number;
  name: string;
  autherId: number;
  id: number;
}
