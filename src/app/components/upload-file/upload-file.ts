import { Component, ElementRef, ViewChild } from '@angular/core';
import { DragNDrop } from '../../directives/drag-n-drop';
import { Progress } from '../../components/progress/progress';
import { Uploadfile } from '../../interfaces';
@Component({
  selector: 'app-upload-file',
  imports: [DragNDrop, Progress],
  templateUrl: './upload-file.html',
  styleUrl: './upload-file.css',
})
export class UploadFile {
  @ViewChild('fileDropRef', { static: false })
  fileDropEl!: ElementRef<HTMLInputElement>;
  files: Uploadfile[] = [];

  // 🔹 When files are dropped
  onFileDropped(event: FileList | File[]): void {
    this.prepareFilesList(Array.from(event));
  }
  fileBrowseHandler(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files) {
      this.prepareFilesList(Array.from(input.files));
    }
  }
  deleteFile(index: number): void {
    if (this.files[index].progress < 100) {
      console.log('Upload in progress.');
      return;
    }
    this.files.splice(index, 1);
  }
  uploadFilesSimulator(index: number): void {
    setTimeout(() => {
      if (index >= this.files.length) {
        return;
      }
      const progressInterval = setInterval(() => {
        if (this.files[index].progress >= 100) {
          clearInterval(progressInterval);
          this.uploadFilesSimulator(index + 1);
        } else {
          this.files[index].progress += 5;
        }
      }, 200);
    }, 1000);
  }

  /**
   * Convert Files list to normal array list
   * @param files (Files List)
   */
  prepareFilesList(files: File[]): void {
    for (const file of files) {
      const uploadFile: Uploadfile = {
        file,
        progress: 0,
      };
      this.files.push(uploadFile);
    }

    // Reset file input
    if (this.fileDropEl) {
      this.fileDropEl.nativeElement.value = '';
    }

    // Start uploading first file
    this.uploadFilesSimulator(0);
  }

  // 🔹 Format file size
  formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}
