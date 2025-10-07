export interface socialMediaGroup {
  type: SocialMediaType;
  url: string;
  publisherId: number;
  name: string;
  autherId: number;
  id: number;
}
export enum SocialMediaType {
  'FACEBOOK' = 'FACEBOOK',
  'TWITTER' = 'TWITTER',
  'INSTAGRAM' = 'INSTAGRAM',
  'LINKEDIN' = 'LINKEDIN',
  'YOUTUBE' = 'YOUTUBE',
  'WEBSITE' = 'WEBSITE',
}
