import { Injectable, signal } from '@angular/core';
import { Server } from './server';
import {
  Media,
  UpdateUser,
  UpdateUserWithTicket,
  User,
  UserFilter,
  UserStatus,
  UpdateTicket,
  UpdateTicketFilter,
  Pagination,
} from '../interfaces';
import { Logger } from './logger';
import { LoaderService } from './loader';
import { S3Service } from './s3';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor(
    private server: Server,
    private logger: Logger,
    private loader: LoaderService,
    private s3Upload: S3Service
  ) {}

  private loggedInUser = signal<User | null>(null);
  loggedInUser$ = this.loggedInUser.asReadonly();

  async fetchUsers(filter: UserFilter) {
    try {
      const { status, accessLevel = 'USER', ...rest } = filter || {};
      const normalizedStatus = Array.isArray(status)
        ? status
        : status
          ? [status]
          : undefined;

      return await this.loader.loadPromise(
        this.server.get<Pagination<User>>('users', {
          ...rest,
          status: normalizedStatus,
          accessLevel,
        })
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async fetchUser(id: number) {
    try {
      return await this.loader.loadPromise(this.server.get<User>(`users/${id}`));
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async getUserById(userId: number) {
    try {
      return await this.loader.loadPromise(
        this.server.get<UpdateUser>(`users/${userId}`)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  setLoggedInUser(user?: Partial<User>) {
    const temp = {
      ...this.loggedInUser(),
      ...user,
    };
    this.loggedInUser.set(temp as User);
  }

  async createOrUpdateUser(data: UpdateUser) {
    try {
      const url = data.id ? `users/${data.id}` : 'users';
      const method = data.id ? 'patch' : 'post';
      return await this.server[method]<User>(url, data);
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
  async raisingTicket(data: UpdateUserWithTicket) {
    try {
      return await this.loader.loadPromise(
        this.server.post<UpdateUserWithTicket>('update-ticket', data)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
  // removeMyProfileImage(id: number) {
  //   return new Promise((resolve, reject) => {
  //     // this.loader.onNamedLoadChange.emit({
  //     //   name: 'remove-user-img',
  //     //   type: 'add',
  //     // });
  //     this.server
  //       .del(`usermedia/${id}`)
  //       .then(() => {
  //         this.onUserUpdated.emit({
  //           ...(this.user as User),
  //           userMedia: undefined,
  //         });
  //         this.user = {
  //           ...(this.user as User),
  //           userMedia: undefined,
  //         };
  //         resolve(true);
  //       })
  //       .catch((error) => {
  //         this.logger.logError(error);
  //       });
  //     // .finally(() => {
  //     //   this.loader.onNamedLoadChange.emit({
  //     //     name: 'remove-user-img',
  //     //     type: 'remove',
  //     //   });
  //     // });
  //   });
  // }
  uploadProfileImage(file: File): Promise<{ id: number; url: string }> {
    return new Promise(async (resolve, reject) => {
      try {
        const { name } = await this.s3Upload.uploadMedia(file);
        const media = await this.server.post<Media>(`users/profile-image`, {
          filename: name,
          mime: file.type,
        });
        resolve(media);
      } catch (error) {
        this.logger.logError(error);
        reject(error);
      }
    });
  }
  async updateMyImage(file: File) {
    try {
      const media = await this.uploadProfileImage(file);
      const temp = {
        ...this.loggedInUser(),
        ...media,
      };
      this.loggedInUser.set(temp as User);
      return media;
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async updateStatus(id: number, status: UserStatus) {
    try {
      return await this.loader.loadPromise(
        this.server.patch<User>(`users/${id}/status`, { status })
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async getUpdateTickets(filter?: UpdateTicketFilter): Promise<Pagination<UpdateTicket>> {
    try {
      return await this.loader.loadPromise(
        this.server.get<Pagination<UpdateTicket>>('update-ticket', filter)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async getUpdateTicket(id: number): Promise<UpdateTicket> {
    try {
      return await this.loader.loadPromise(
        this.server.get<UpdateTicket>(`update-ticket/${id}`)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async approveUpdateTicket(id: number): Promise<UpdateTicket> {
    try {
      return await this.loader.loadPromise(
        this.server.get<UpdateTicket>(`update-ticket/${id}/approve`)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async rejectUpdateTicket(id: number): Promise<UpdateTicket> {
    try {
      return await this.loader.loadPromise(
        this.server.get<UpdateTicket>(`update-ticket/${id}/reject`)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
}
