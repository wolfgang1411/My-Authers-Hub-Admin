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
        }),
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
        }),
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
        }),
      );
      return response;
    } catch (error) {
      throw error as HttpErrorResponse;
    }
  }

  async delete<T>(url: string, body?: any, params?: any) {
    try {
      const options: any = {
        params,
      };

      // For DELETE with body, use request method
      if (body) {
        const response = await firstValueFrom(
          this.http.request<T>('DELETE', this.parseUrl(url), {
            body,
            params,
            headers: {
              'Content-Type': 'application/json',
            },
          }),
        );
        return response;
      }
      const response = await firstValueFrom(
        this.http.delete<T>(this.parseUrl(url), options),
      );
      return response;
    } catch (error) {
      throw error as HttpErrorResponse;
    }
  }

  async put(url: string, file: File) {
    try {
      url = url.includes('http') ? url : `${environment.apiUrl}${url}`;
      return await firstValueFrom(this.http.put(url, file));
    } catch (error) {
      throw error;
    }
  }

  getDocument(url: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      firstValueFrom(
        this.http.get(`${environment.apiUrl}${url}`, {
          params,
          headers: {
            contentType: 'application/json',
          },
          responseType: 'blob',
          observe: 'response',
        }),
      )
        .then((response) => {
          resolve(response);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }
}
