import { Injectable } from '@angular/core';
import { Server } from './server';
import { Logger } from './logger';
import { LoaderService } from './loader';
import { socialMediaGroup } from '../interfaces/SocialMedia';

@Injectable({
  providedIn: 'root',
})
export class SocialMediaService {
  constructor(
    private server: Server,
    private logger: Logger,
    private loader: LoaderService
  ) {}
  async createOrUpdateSocialMediaLinks(socialMediaLinks: socialMediaGroup[]) {
    try {
      await Promise.all(
        socialMediaLinks.map(async (socialMedia) => {
          return this.loader.loadPromise(
            this.server[socialMedia.id ? 'patch' : 'post'](
              socialMedia.id
                ? `social-media/${socialMedia.id}`
                : 'social-media',
              {
                ...socialMedia,
              }
            )
          );
        })
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
}
