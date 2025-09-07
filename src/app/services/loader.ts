import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { v4 as uuidV4 } from 'uuid';

@Injectable()
export class LoaderService {
  private loadingAreas = new BehaviorSubject<string[]>([]);

  isLoading$ = this.loadingAreas.pipe(map((areas) => areas.length > 0));
  loadingAreas$ = this.loadingAreas.asObservable();

  async loadPromise<T>(promise: Promise<T>, area?: string) {
    const loadingArea = area || uuidV4();
    try {
      this.loadingAreas.next([...this.loadingAreas.value, loadingArea]);
      const res = await promise;
      return res as T;
    } catch (error) {
      throw error;
    } finally {
      this.loadingAreas.next(
        this.loadingAreas.value.filter((v) => v !== loadingArea)
      );
    }
  }
}
