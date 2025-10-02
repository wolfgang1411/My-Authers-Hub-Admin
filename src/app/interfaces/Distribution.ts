export interface Distribution {
  distributionType: DistributionType;
  amount: number;
}

export enum DistributionType {
  'National' = 'National',
  'Hardbound_National' = 'Hardbound_National',
  'Global' = 'Global',
  'National_Prime' = 'National_Prime',
  'Audiobook' = 'Audiobook',
}
