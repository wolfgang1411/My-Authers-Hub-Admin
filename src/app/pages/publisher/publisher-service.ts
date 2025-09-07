import { Injectable } from '@angular/core';
import { Server } from '../../services/server';
import { PublisherFilter, Publishers } from '../../interfaces/Publishers';
import { Pagination } from '../../interfaces';
import { Invite } from '../../interfaces/Invite';

@Injectable({
  providedIn: 'root',
})
export class PublisherService {
  constructor(private server: Server) {}

  async getPublishers(filter?: PublisherFilter) {
    try {
      return await this.server.get<Pagination<Publishers>>(
        'publishers',
        filter
      );
    } catch (error) {
      console.error('Error fetching publishers:', error);
      throw error;
    }
  }
  // Initialization logic can gp here if needed
  async getPublisherById(id: number) {
    try {
      return await this.server.get<Publishers>(`publishers/${id}`);
    } catch (error) {
      console.error(`Error fetching publisher with id ${id}:`, error);
      throw error;
    }
  }

  async createPublisher(publisherData: Publishers): Promise<Publishers> {
    try {
    return await this.server[publisherData.id ? 'patch' : 'post'](
        publisherData.id ? `publishers/${publisherData.id}` : 'publishers',
        { ...publisherData }
      );
    } catch (error) {
      throw error;
    }
  }
  async sendInviteLink(invite: Invite){
    try {
     return await this.server.post('invite', invite)
    }
    catch(error)
    {
  throw error
    }

  }
}
