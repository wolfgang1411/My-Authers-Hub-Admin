import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import { v4 as uuidV4 } from 'uuid';

@Injectable()
export class LoaderService {
  private loadingAreas = new BehaviorSubject<string[]>([]);

  isLoading$ = this.loadingAreas.pipe(map((areas) => areas.length > 0));
  loadingAreas$ = this.loadingAreas.asObservable();

  private privateLoadingAreas = new BehaviorSubject<string[]>([]);
  privateLoadingAreas$ = this.privateLoadingAreas.asObservable();

  async loadPromise<T>(promise: Promise<T>, area?: string, isPrivate = false) {
    const loadingArea = area || uuidV4();

    try {
      this[isPrivate ? 'privateLoadingAreas' : 'loadingAreas'].next([
        ...this[isPrivate ? 'privateLoadingAreas' : 'loadingAreas'].value,
        loadingArea,
      ]);

      const res = await promise;
      return res as T;
    } catch (error) {
      throw error;
    } finally {
      this[isPrivate ? 'privateLoadingAreas' : 'loadingAreas'].next(
        this[isPrivate ? 'privateLoadingAreas' : 'loadingAreas'].value.filter(
          (v) => v !== loadingArea
        )
      );
    }
  }

  isAreaLoading$ = (name: string) =>
    combineLatest([this.loadingAreas$, this.privateLoadingAreas$]).pipe(
      map(
        ([areas, privateAreas]) =>
          areas.includes(name) || privateAreas.includes(name)
      )
    );
}
