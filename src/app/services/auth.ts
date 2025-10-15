import { Injectable, signal } from '@angular/core';
import { Server } from '../services/server';
import { AuthResponse, LoginWithEmail, TokeInfo, User } from '../interfaces';
import storage from '../common/util.ts/storage';
import { jwtDecode } from 'jwt-decode';
import md5 from 'md5';
import { Logger } from './logger';
import { LoaderService } from './loader';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(
    private server: Server,
    private logger: Logger,
    private loader: LoaderService
  ) {}

  isUserAuthenticated = signal<boolean | null>(null);
  isUserAuthenticated$ = this.isUserAuthenticated.asReadonly();

  private accessToken?: string;
  private tokenInfo?: TokeInfo;

  private refreshTokenTimeout?: any;

  getAuthToken(): AuthResponse {
    const accessToken = storage.getItem('authToken') as AuthResponse | null;
    return (
      accessToken ||
      ({
        access_token: this.accessToken,
        refresh_token: '',
        expires_in: 0,
        type: 'Bearer',
      } as AuthResponse)
    );
  }

  decodeToken(token: string) {
    try {
      const tokenInfo = jwtDecode<TokeInfo>(token);
      return tokenInfo;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  async loginWithEmail(data: LoginWithEmail) {
    try {
      const response = await this.loader.loadPromise(
        this.server.post<AuthResponse>('auth/token', {
          username: data.username,
          password: md5(data.password),
          grant_type: 'password',
          client_id: 'web',
        })
      );
      return response;
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  setAuthToken(data?: AuthResponse) {
    if (!data) {
      storage.removeItem('authToken');
      this.isUserAuthenticated.set(false);
      return null;
    }

    const tokenInfo = this.decodeToken(data.access_token);

    if (!tokenInfo) {
      storage.removeItem('authToken');
      this.isUserAuthenticated.set(false);
      return null;
    }

    if (tokenInfo.exp < Date.now() / 1000) {
      storage.removeItem('authToken');
      this.isUserAuthenticated.set(false);
      return null;
    }

    this.accessToken = data.access_token;
    this.tokenInfo = tokenInfo;
    storage.setItem('authToken', data);
    this.isUserAuthenticated.set(true);
    this.refreshToken(data.access_token, data.refresh_token);
    return this.tokenInfo.sub;
  }

  private refreshToken(token: string, refreshToken: string) {
    try {
      if (this.refreshTokenTimeout) {
        clearTimeout(this.refreshTokenTimeout);
      }

      const tokenInfo = jwtDecode<TokeInfo>(token);
      const timeout = tokenInfo.exp * 1000 - Date.now() - 60000;

      this.refreshTokenTimeout = setTimeout(async () => {
        try {
          const response = await this.loader.loadPromise(
            this.server.post<AuthResponse>('auth/token', {
              refresh_token: refreshToken,
              grant_type: 'refresh_token',
              client_id: 'web',
            })
          );
          this.setAuthToken(response);
        } catch (error) {
          this.setAuthToken();
        }
      }, timeout);
    } catch (error) {
      throw error;
    }
  }

  async changePassword(oldPassword: string, newPassword: string) {
    try {
      return await this.loader.loadPromise(
        this.server.post('auth/password-change', {
          oldPassword: md5(oldPassword),
          newPassword: md5(newPassword),
          confirmPassword: md5(newPassword),
          requestType: 'UPDATE',
        })
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
  logout() {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem('authToken');
    this.isUserAuthenticated.set(false);
    this.accessToken = undefined;
    this.tokenInfo = undefined;
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
      this.refreshTokenTimeout = undefined;
    }
    window.location.href = '/login';
  }

  async whoAmI() {
    try {
      return await this.server.get<User>('auth/whoami');
    } catch (error) {
      throw error;
    }
  }
}
