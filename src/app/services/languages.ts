import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private languages = signal<null | string[]>(null);
  languages$ = this.languages.asReadonly();

  fetchAndUpdateLanguages() {
    this.languages.set([
      'English',
      'Hindi',
      'Spanish',
      'French',
      'German',
      'Chinese',
      'Japanese',
      'Arabic',
      'Russian',
      'Portuguese',
    ]);
  }
}
