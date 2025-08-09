import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Server {
  constructor(private readonly http: HttpClient) {}

  private parseUrl(url: string) {
    console.log({
      urlEn: url.includes('http') ? url : `${environment.apiUrl}${url}`,
      url,
    });

    return url.includes('http') ? url : `${environment.apiUrl}${url}`;
  }

  async get<T>(url: string, params?: any) {
    try {
      const response = await firstValueFrom(
        this.http.get<T>(this.parseUrl(url), {
          params,
          headers: {
            contentType: 'application/json',
          },
        })
      );
      return response;
    } catch (error) {
      throw error as HttpErrorResponse;
    }
  }

  async post<T>(url: string, body: any, params?: any) {
    try {
      const response = await firstValueFrom(
        this.http.post<T>(this.parseUrl(url), body, {
          params,
          headers: {
            contentType: 'application/json',
          },
        })
      );
      return response;
    } catch (error) {
      throw error as HttpErrorResponse;
    }
  }

  async patch<T>(url: string, body: any, params?: any) {
    try {
      const response = await firstValueFrom(
        this.http.patch<T>(this.parseUrl(url), body, {
          params,
          headers: {
            contentType: 'application/json',
          },
        })
      );
      return response;
    } catch (error) {
      throw error as HttpErrorResponse;
    }
  }

  async delete<T>(url: string, params?: any) {
    try {
      const response = await firstValueFrom(
        this.http.delete<T>(this.parseUrl(url), {
          params,
          headers: {
            contentType: 'application/json',
          },
        })
      );
      return response;
    } catch (error) {
      throw error as HttpErrorResponse;
    }
  }
}
