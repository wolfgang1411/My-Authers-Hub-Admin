import {
  Component,
  effect,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  Renderer2,
  signal,
  ViewChild,
} from '@angular/core';

import { Media } from '../../interfaces';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SafeUrlPipe } from 'src/app/pipes/safe-url-pipe';
@Component({
  selector: 'app-upload-file',
  imports: [
    AngularSvgIconModule,
    MatIconModule,
    CommonModule,
    MatProgressSpinnerModule,
    SafeUrlPipe,
  ],
  templateUrl: './upload-file.html',
  styleUrl: './upload-file.css',
})
export class UploadFile {
  @Input() set prefillMedia(media: Media | null) {
    this._prefillMedia.set(media);
  }
  private _prefillMedia = signal<Media | null>(null);

  previewUrl = signal<string | null>(null);
  isLoading = signal(false);

  @Output() mediaAdded = new EventEmitter<Media>();
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor() {
    effect(() => {
      const media = this._prefillMedia();
      if (media?.url) {
        this.previewUrl.set(media.url);
        console.log('Prefilled preview:', media.url);
        // Emit the prefilled media back to parent so form control is set
        // Only emit if media has an id (meaning it's from API, not a new upload)
        if (media.id && media.id > 0) {
          this.mediaAdded.emit(media);
        }
      } else if (media === null) {
        // Clear preview when media is set to null
        this.previewUrl.set(null);
      }
    });
  }

  onClickUpdateImage() {
    this.fileInput.nativeElement.click();
  }

  onUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.isLoading.set(true);

    const reader = new FileReader();
    reader.onload = () => {
      this.previewUrl.set(reader.result as string);
      this.isLoading.set(false);

      this.mediaAdded.emit({
        id: 0,
        name: file.name,
        type: file.type,
        url: '',
        file,
      });
    };
    reader.readAsDataURL(file);
  }
}
