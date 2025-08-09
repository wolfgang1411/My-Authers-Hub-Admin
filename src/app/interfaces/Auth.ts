import { AccessLevel } from './index';

export type LoginWithEmail = {
  username: string;
  password: string;
};

export type AuthResponse = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  type: 'Bearer';
};

export type TokeInfo = {
  accessLevel: AccessLevel;
  email: string;
  exp: number;
  iat: number;
  sub: number;
  username: string;
};
