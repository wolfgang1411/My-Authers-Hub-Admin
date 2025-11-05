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

@Component({
  selector: 'app-social-media',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    SharedModule,
    MatIconModule,
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
    { value: 'FACEBOOK', label: 'Facebook', icon: 'facebook' },
    { value: 'TWITTER', label: 'Twitter', icon: 'alternate_email' },
    { value: 'INSTAGRAM', label: 'Instagram', icon: 'photo_camera' },
    { value: 'LINKEDIN', label: 'LinkedIn', icon: 'business_center' },
    { value: 'YOUTUBE', label: 'YouTube', icon: 'subscriptions' },
    { value: 'WEBSITE', label: 'Website', icon: 'public' },
  ];

  getIcon(type: string | null | undefined) {
    const f = this.socialMediaOptions.find((o) => o.value === type);
    return f?.icon ?? 'share';
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
