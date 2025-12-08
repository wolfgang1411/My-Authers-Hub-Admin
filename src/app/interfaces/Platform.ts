export enum PlatformStatus {
  ACTIVE = 'ACTIVE',
  DEACTIVE = 'DEACTIVE',
  DELETED = 'DELETED',
}

export interface Platform {
  id: number;
  name: string;
  marginPercent: number;
  extraFlatMargin?: number;
  isEbookPlatform: boolean;
  isSuperAdminPricingOnly?: boolean;
  status: PlatformStatus;
  createdAt: string;
  isInventoryPlatform?: boolean;
  isOtherPlatform?: boolean;
  updatedAt: string;
}

export interface PlatformFilter {
  isInventoryPlatform?: boolean;
}
