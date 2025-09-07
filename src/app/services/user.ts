import { Injectable, signal } from '@angular/core';
import { Server } from './server';
import { UpdateUser, User } from '../interfaces';
import { Logger } from './logger';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor(private server: Server, private logger: Logger) {}

  private loggedInUser = signal<User | null>(null);
  loggedInUser$ = this.loggedInUser.asReadonly();

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
}
