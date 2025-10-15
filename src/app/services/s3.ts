import { Injectable } from '@angular/core';
import { Server } from './server';
import { Logger } from './logger';
import { LoaderService } from './loader';

@Injectable({
  providedIn: 'root',
})
export class S3Service {
  constructor(
    private server: Server,
    private logger: Logger,
    private loader: LoaderService
  ) {}

  uploadMedia(file: File): Promise<{
    name: string;
  }> {
    return new Promise((resolve, reject) => {
      this.getS3Url(file.name, file.type)
        .then((response) => {
          this.putS3Object(response.url, file)
            .then(() => {
              resolve({
                name: response.key,
              });
            })
            .catch((error) => {
              reject(error);
            });
        })
        .catch((error) => {
          reject(error);
        });
    });
  }
  async getS3Url(filename: string, mime: string) {
    try {
      return await this.loader.loadPromise(
        this.server.get<{ url: string; key: string; expiresAt: string }>(
          's3SignedUrl',
          {
            filename,
            mime,
          }
        ),
        'get-s3-url'
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async putS3Object(url: string, file: File) {
    try {
      return await this.server.put(url, file);
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
}
