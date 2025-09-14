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
