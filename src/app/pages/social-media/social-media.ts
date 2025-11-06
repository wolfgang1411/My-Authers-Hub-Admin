import { Component, computed, Input, input } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { SocialMediaType } from '../../interfaces';
import { SocialMediaGroupType } from '../../interfaces/SocialMedia';
import { MatSelectModule } from '@angular/material/select';
import { StaticValuesService } from '../../services/static-values';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule, MatIconButton } from '@angular/material/button';

@Component({
  selector: 'app-social-media',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    SharedModule,
    MatIconModule,
    MatButtonModule,
    MatIconButton,
  ],
  templateUrl: './social-media.html',
  styleUrl: './social-media.css',
})
export class SocialMedia {
  constructor(private staticValueService: StaticValuesService) {}
  @Input() socialMediaGroup!: FormGroup<SocialMediaGroupType>;
  @Input() socialMediaArray!: FormArray<socialMediaGroupType>;
  @Input() index!: number;
  socialMediaType = computed(() => {
    return Object.keys(
      this.staticValueService.staticValues()?.SocialMediaType || {}
    ) as SocialMediaType[];
  });

  ngOnInit() {}
  isSocialMediaTypeSelected(mediaType: string | undefined): boolean {
    const controls = this.socialMediaArray.controls;
    for (const control of controls) {
      if (control.value.type === mediaType) {
        return true;
      }
    }
    return false;
  }
  selectSocialMediaType(
    mediaType: SocialMediaType | null | undefined,
    index: number
  ) {
    if (mediaType !== undefined) {
      this.socialMediaArray.at(index).patchValue({
        id: undefined,
        type: mediaType,
      });
    } else {
      this.socialMediaArray.at(index).patchValue({
        id: undefined,
        type: undefined,
      });
    }
    return mediaType;
  }
  socialMediaOptions = [
    {
      value: 'FACEBOOK',
      label: 'Facebook',
      icon: 'facebook',
      color: '#1877F2',
    },
    {
      value: 'TWITTER',
      label: 'Twitter',
      icon: 'alternate_email',
      color: '#1DA1F2',
    },
    {
      value: 'INSTAGRAM',
      label: 'Instagram',
      icon: 'photo_camera',
      color: '#E4405F',
    },
    { value: 'LINKEDIN', label: 'LinkedIn', icon: 'work', color: '#0077B5' },
    {
      value: 'YOUTUBE',
      label: 'YouTube',
      icon: 'smart_display',
      color: '#FF0000',
    },
    { value: 'WEBSITE', label: 'Website', icon: 'language', color: '#6C63FF' },
  ];

  getIcon(type: string | null | undefined) {
    const item = this.socialMediaOptions.find((o) => o.value === type);
    return item ? item.icon : 'public';
  }

  getPlatformColor(type: string | null | undefined) {
    const item = this.socialMediaOptions.find((o) => o.value === type);
    return item ? item.color : '#6B7280';
  }
}
type socialMediaGroupType = FormGroup<{
  type: FormControl<SocialMediaType | null>;
  url: FormControl<string | null>;
  publisherId: FormControl<number | null>;
  name: FormControl<string | null>;
  autherId: FormControl<number | null>;
  id: FormControl<number | null>;
}>;
