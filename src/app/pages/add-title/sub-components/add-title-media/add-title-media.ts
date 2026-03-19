import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  inject,
  signal,
  ElementRef,
  QueryList,
  ViewChildren,
  OnInit,
  input,
  computed,
  output,
  viewChildren,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormGroup,
  ReactiveFormsModule,
  FormArray,
  AbstractControl,
  Validators,
} from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import Swal from 'sweetalert2';

import {
  TitleMediaGroup,
  TitleMediaType,
  PublishingType,
  TitleStatus,
} from '../../../../interfaces';
import { getFileToBase64 } from '../../../../common/utils/file';
import { LoaderService } from '../../../../services/loader';
import { TitleService } from '../../../titles/title-service';
import { UserService } from '../../../../services/user';

@Component({
  selector: 'app-add-title-media',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
  ],
  templateUrl: './add-title-media.html',
  styleUrl: './add-title-media.css',
})
export class AddTitleMedia implements OnInit {
  mediaArray = input.required<FormArray<FormGroup<TitleMediaGroup>>>();
  publishingType = input.required<PublishingType | null>();
  titleId = input.required<number>();
  titleStatus = input<TitleStatus | null>(null);
  accessLevel = input<string>('');

  uploadComplete = output<void>();

  fileInputs = viewChildren<ElementRef<HTMLInputElement>>('fileInput');

  translateService = inject(TranslateService);
  private readonly loaderService = inject(LoaderService);
  private readonly titleService = inject(TitleService);
  private readonly userService = inject(UserService);
  isLoading = signal(false);

  PublishingType = PublishingType;
  loggedInUser = this.userService.loggedInUser$;

  ngOnInit(): void {}

  controls = computed(
    () => this.mediaArray().controls as FormGroup<TitleMediaGroup>[],
  );

  isRaisingTicket = computed(() => {
    return (
      (this.titleId() || 0) > 0 &&
      this.titleStatus() === TitleStatus.APPROVED &&
      this.accessLevel() === 'PUBLISHER'
    );
  });

  getDocumentLabel(mediaType?: TitleMediaType): string {
    switch (mediaType) {
      case 'FULL_COVER':
        return 'Upload Full Cover (PDF)';
      case 'INTERIOR':
        return 'Upload Print Interior (PDF)';
      case 'FRONT_COVER':
        return 'Upload Front Cover (JPG/PNG)';
      case 'BACK_COVER':
        return 'Upload Back Cover (Optional)';
      case 'INSIDE_COVER':
        return 'Upload Inside Cover';
      case 'MANUSCRIPT':
        return 'Upload Manuscript (DOCX)';
      default:
        return 'Upload File';
    }
  }

  getAcceptedTypes(mediaType: TitleMediaType | undefined): string {
    if (
      mediaType === 'INTERIOR' ||
      mediaType === 'FULL_COVER' ||
      mediaType === 'INSIDE_COVER'
    )
      return 'application/pdf';
    if (mediaType === 'MANUSCRIPT')
      return '.docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword';
    return 'image/*';
  }

  getHelperText(mediaType: TitleMediaType | string | null): string {
    switch (mediaType) {
      case 'FULL_COVER':
      case 'FullCover':
        return 'PDF, max 20MB';
      case 'INTERIOR':
      case 'PrintInterior':
        return 'PDF, max 10MB';
      case 'FRONT_COVER':
      case 'FrontCover':
        return 'JPG or PNG, max 2MB';
      case 'BACK_COVER':
      case 'BackCover':
        return 'Optional: JPG or PNG, max 2MB';
      case 'MANUSCRIPT':
        return 'DOCX or DOC, max 50MB (Required for ebook types)';
      default:
        return '';
    }
  }

  async onFileSelected(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0);
    if (!file) return;

    const mediaGroup = this.mediaArray().at(index);
    const maxSize = mediaGroup.controls.maxSize.value || 50; // default 50MB
    const fileSizeMB = file.size / (1024 * 1024);

    if (fileSizeMB > maxSize) {
      Swal.fire({
        icon: 'error',
        title: 'File too large',
        text: `Maximum allowed size is ${maxSize}MB. Your file is ${fileSizeMB.toFixed(2)}MB.`,
      });
      input.value = '';
      return;
    }

    try {
      const base64 = await getFileToBase64(file);
      mediaGroup.patchValue({
        url: base64,
        file: file,
        name: file.name,
        size: Number(fileSizeMB.toFixed(2)),
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to process file.',
      });
    }
  }

  triggerUpload(index: number) {
    const input = this.fileInputs().at(index);
    if (input) {
      input.nativeElement.click();
    }
  }

  removeFile(index: number) {
    this.mediaArray().at(index).patchValue({
      file: null,
      url: null,
      name: null,
      size: 0,
    });
    // Reset file input value
    const input = this.fileInputs().at(index);
    if (input) {
      input.nativeElement.value = '';
    }
  }

  isRequired(control: AbstractControl | null, type?: TitleMediaType): boolean {
    if (!control) return false;

    // Check if it's Manuscript or Full Cover for Super Admin
    if (this.loggedInUser()?.accessLevel === 'SUPERADMIN') {
      if (type === 'MANUSCRIPT' || type === 'FULL_COVER') {
        return false;
      }
    }

    if (!control.validator) return false;
    const validator = control.validator({} as any);
    return !!(validator && validator['required']);
  }

  async onMediaUpload() {
    if (!this.mediaArray().valid) {
      this.mediaArray().markAllAsTouched();
      return;
    }

    if (!this.titleId() || this.titleId() <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Title ID is required. Please save title details first.',
      });
      return;
    }

    try {
      this.isLoading.set(true);
      const mediaToUpload = this.mediaArray()
        .value.filter(({ file, type }) => !!file && !!type)
        .map(({ file, type }) => ({
          file: file as File,
          type: type as TitleMediaType,
        }));

      if (mediaToUpload.length === 0) {
        this.uploadComplete.emit();
        return;
      }

      const isRaisingTicket = this.isRaisingTicket();
      const results = await this.uploadMediaWithProgress(
        mediaToUpload,
        isRaisingTicket,
      );

      if (isRaisingTicket) {
        Swal.fire({
          icon: 'success',
          title: 'Request Sent',
          text: 'Media update request has been sent for approval.',
        });
      }

      if (results && results.length > 0) {
        // Update form with uploaded data
        results.forEach((uploaded: any) => {
          const control = this.mediaArray().controls.find(
            (c) => c.controls.type.value === uploaded.type,
          );
          if (control) {
            const hasId = uploaded.id || control.controls.id.value;
            if (hasId) {
              control.controls.file.removeValidators(Validators.required);
              control.controls.url.removeValidators(Validators.required);
              control.controls.file.updateValueAndValidity();
              control.controls.url.updateValueAndValidity();
            }

            control.patchValue({
              id: hasId,
              url: uploaded.url || control.controls.url.value,
              name: uploaded.name || control.controls.name.value,
              file: null, // Clear to prevent re-upload
              noOfPages: uploaded.noOfPages || control.controls.noOfPages.value,
            });
          }
        });
        this.mediaArray().updateValueAndValidity();
      }
      this.uploadComplete.emit();
    } catch (error) {
      console.error('Error uploading media:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async uploadMediaWithProgress(
    mediaToUpload: { file: File; type: TitleMediaType }[],
    isUpdateTicket: boolean = false,
  ): Promise<any[]> {
    const totalFiles = mediaToUpload.length;
    const results: any[] = [];

    this.loaderService.setLoadingMessage(
      `Uploading 0 out of ${totalFiles} files`,
    );

    for (let i = 0; i < totalFiles; i++) {
      const current = i + 1;
      this.loaderService.setLoadingMessage(
        `Uploading ${current} out of ${totalFiles} files`,
      );

      let result;
      if (isUpdateTicket) {
        result = await this.titleService.uploadMediaForUpdateTicket(
          this.titleId(),
          mediaToUpload[i],
        );
      } else {
        result = await this.titleService.uploadMedia(
          this.titleId(),
          mediaToUpload[i],
        );
      }
      results.push(result);
    }

    this.loaderService.setLoadingMessage(null);
    return results;
  }
}
