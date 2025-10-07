import { Component, Input, input } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { SocialMediaType } from '../../interfaces/SocialMedia';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-social-media',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './social-media.html',
  styleUrl: './social-media.css',
})
export class SocialMedia {
  @Input() socialMediaGroup!: FormGroup<{
    type: FormControl<SocialMediaType | null>;
    url: FormControl<string | null>;
    name: FormControl<string | null>;
    autherId: FormControl<number | null>;
    publisherId: FormControl<number | null>;
    id: FormControl<number | null>;
  }>;
  @Input() socialMediaArray!: FormArray<socialMediaGroupType>;
  ngOnInit() {}
}
type socialMediaGroupType = FormGroup<{
  type: FormControl<SocialMediaType | null>;
  url: FormControl<string | null>;
  publisherId: FormControl<number | null>;
  name: FormControl<string | null>;
  autherId: FormControl<number | null>;
  id: FormControl<number | null>;
}>;
