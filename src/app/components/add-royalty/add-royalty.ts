import { Component, effect, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import {
  Author,
  AuthorFilter,
  CreateRoyalty,
  PublisherFilter,
  Publishers,
  Title,
} from '../../interfaces';
import { TitleService } from '../../pages/titles/title-service';
import { MatIconModule } from '@angular/material/icon';
import { AuthorsService } from '../../pages/authors/authors-service';
import { PublisherService } from '../../pages/publisher/publisher-service';

@Component({
  selector: 'app-add-royalty',
  imports: [
    SharedModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDialogContent,
    MatDialogActions,
    MatButtonModule,
    MatDialogTitle,
    MatIconModule,
  ],
  templateUrl: './add-royalty.html',
  styleUrl: './add-royalty.css',
})
export class AddRoyalty {
  constructor(
    private titleService: TitleService,
    private authorService: AuthorsService,
    private publisherService: PublisherService
  ) {
    effect(async () => {
      const { items: titleList } = await this.titleService.getTitles();
      this.titleList.set(titleList);
    });
  }
  data = inject<Inputs>(MAT_DIALOG_DATA);
  titleList = signal<Title[] | null>(null);
  authorList = signal<Author[] | null>(null);
  publisherList = signal<Publishers[] | null>(null);
  authorOrPublisherRequired: ValidatorFn = (
    control: AbstractControl
  ): ValidationErrors | null => {
    const authorId = control.get('authorId')?.value;
    const publisherId = control.get('publisherId')?.value;
    if (!authorId && !publisherId) {
      return { authorOrPublisherRequired: true };
    }
    if (authorId && publisherId) {
      return { onlyOneAllowed: true };
    }
    return null;
  };

  addRoyaltyForm = new FormGroup({
    royalties: new FormArray([
      new FormGroup(
        {
          titleId: new FormControl<number | null>(null, [Validators.required]),
          authorId: new FormControl<number | null>(null),
          publisherId: new FormControl<number | null>(null),
          print_mah: new FormControl<number | null>(null, [
            Validators.required,
          ]),
          print_third_party: new FormControl<number | null>(null, [
            Validators.required,
          ]),
          prime: new FormControl<number | null>(null, [Validators.required]),
          ebook_mah: new FormControl<number | null>(null, [
            Validators.required,
          ]),
          ebook_third_party: new FormControl<number | null>(null, [
            Validators.required,
          ]),
        },
        { validators: this.authorOrPublisherRequired }
      ),
    ]),
  });
  async ngOnInit() {}

  get royaltiesArray(): FormArray {
    return this.addRoyaltyForm.get('royalties') as FormArray;
  }
  async getAuthorPublisherList(titleId: number) {
    const authorFilter: AuthorFilter = { titleId };
    const publisherFilter: PublisherFilter = {};

    const [{ items: authors }, { items: publishers }] = await Promise.all([
      this.authorService.getAuthors(authorFilter),
      this.publisherService.getPublishers(publisherFilter),
    ]);

    this.authorList.set(authors);
    this.publisherList.set(publishers);
  }

  addRoyalty() {
    const newRoyalty = new FormGroup(
      {
        titleId: new FormControl<number | null>(null, [Validators.required]),
        authorId: new FormControl<number | null>(null),
        publisherId: new FormControl<number | null>(null),
        print_mah: new FormControl<number | null>(null, [Validators.required]),
        print_third_party: new FormControl<number | null>(null, [
          Validators.required,
        ]),
        prime: new FormControl<number | null>(null, [Validators.required]),
        ebook_mah: new FormControl<number | null>(null, [Validators.required]),
        ebook_third_party: new FormControl<number | null>(null, [
          Validators.required,
        ]),
      },
      { validators: this.authorOrPublisherRequired }
    );

    this.royaltiesArray.push(newRoyalty);
  }
  onSubmit() {
    if (this.addRoyaltyForm.valid) {
      const addFormData = this.addRoyaltyForm.get('royalties')?.value;
      this.data.onSubmit(addFormData as CreateRoyalty[]);
    }
  }
}
interface Inputs {
  onSubmit: (royaltiesArray: CreateRoyalty[]) => void;
  onClose: () => void;
}
