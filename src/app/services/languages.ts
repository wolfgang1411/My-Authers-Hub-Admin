import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import LanguagesJson from '../../../public/data/languages.json';

interface LanguagesResponse {
  languages: string[];
}

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private languages = signal<null | string[]>(null);
  languages$ = this.languages.asReadonly();

  constructor(private http: HttpClient) { }

  async fetchAndUpdateLanguages() {
    this.languages.set(LanguagesJson);
  }
}
