import {
  Component,
  computed,
  ElementRef,
  input,
  Signal,
  signal,
  viewChild,
} from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { SharedModule } from '../../modules/shared/shared-module';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  BookBindings,
  LaminationType,
  PaperQuailty,
  PrintingFormGroup,
  SizeCategory,
  TitleMediaGroup,
  TitleMediaType,
} from '../../interfaces';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { PrintingService } from '../../services/printing-service';
import { combineLatest, debounceTime } from 'rxjs';
import { getFileToBase64, selectFile } from '../../common/utils/file';
@Component({
  selector: 'app-title-printing',
  imports: [
    MatFormFieldModule,
    MatSelectModule,
    SharedModule,
    ReactiveFormsModule,
    MatInputModule,
    MatIconModule,
    MatCardModule,
  ],
  templateUrl: './title-printing.html',
  styleUrl: './title-printing.css',
})
export class TitlePrinting {
  constructor(private printingService: PrintingService) {}

  bindingType = signal<BookBindings[]>([]);
  laminationTypes = signal<LaminationType[]>([]);
  paperQuality = signal<PaperQuailty[]>([]);
  sizeCategory = signal<SizeCategory[]>([]);
  loadingPrice: boolean = false;

  printingGroup = input.required<FormGroup<PrintingFormGroup>>();
  documentMedia = input.required<FormArray<FormGroup<TitleMediaGroup>>>();

  fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  channalTypes = input<string[]>();

  insideCoverMedia = signal<FormGroup<TitleMediaGroup> | null>(null);

  async ngOnInit() {
    const { items: laminations } =
      await this.printingService.getLaminationType();
    this.laminationTypes.set(laminations);
    const { items: binding } = await this.printingService.getBindingType();
    this.bindingType.set(binding);
    const { items: quality } = await this.printingService.getAllPaperTypes();
    this.paperQuality.set(quality);
    const { items: sizes } = await this.printingService.getSizeCategory();
    this.sizeCategory.set(sizes.sort((a, b) => a.id - b.id));

    this.handleBlackAndWhitePages();

    this.documentMedia().valueChanges.subscribe((controls) => {
      const insideCover = this.documentMedia().controls.find(
        ({ controls: { type } }) => type.value === TitleMediaType.INSIDE_COVER
      );

      this.insideCoverMedia.set(insideCover || null);
    });
  }

  handleBlackAndWhitePages() {
    const colorPagesControl = this.printingGroup()['controls']['colorPages'];
    const totalPagesControl = this.printingGroup()['controls']['totalPages'];
    const blackAndWhitePagesControl =
      this.printingGroup()['controls']['bwPages'];
    combineLatest([
      colorPagesControl.valueChanges,
      totalPagesControl.valueChanges,
    ])
      .pipe(debounceTime(400))
      .subscribe(([colorPages, totalPages]) => {
        blackAndWhitePagesControl.patchValue(
          (Number(totalPages) || 0) - (Number(colorPages) || 0)
        );
      });
  }

  // createDocumentMediaGroup(
  //   mediaType: string,
  //   file: File,
  //   url: string | null = null
  // ): FormGroup {
  //   return new FormGroup<MediaGroup>({
  //     id: new FormControl(1 || 0),
  //     url: new FormControl(
  //       'https://fastly.picsum.photos/id/376/536/354.jpg?hmac=FY3pGZTc81LYCnJOB0PiRX570QylTn7xchj6FZA6TeQ'
  //     ),
  //     type: new FormControl(mediaType as MediaType),
  //     file: new FormControl(new File([], 'test.png')),
  //     mediaType: new FormControl(mediaType as MediaType),
  //     maxSize
  //   });
  // }
  openFileDialog() {
    this.fileInput()?.nativeElement?.click();
  }

  async onInsideCoverUpload(event: Event) {
    const mediaGroup = this.insideCoverMedia();
    const file = (await selectFile(
      mediaGroup?.controls?.allowedFormat?.value?.[0] || 'image/*'
    )) as File;

    if (!mediaGroup || !file) return;

    mediaGroup.patchValue({
      file,
      name: file.name,
      url: await getFileToBase64(file),
    });
  }

  getFilteredLaminationTypes(print: AbstractControl): any[] {
    const bindingTypeId = print.get('bookBindingsId')?.value;
    if (!this.laminationTypes()?.length) return [];
    const bindingTypeName = this.getBindingTypeNameById(bindingTypeId);
    if (bindingTypeName?.toLowerCase() === 'paperback') {
      return this.laminationTypes(); // allow all
    }
    return this.laminationTypes().filter(
      (t) => t.name.toLowerCase() !== 'velvet'
    );
  }
  getLaminationControl(printGroup: AbstractControl): FormControl {
    return printGroup.get('laminationTypeId') as FormControl;
  }
  private getBindingTypeNameById(id: number): string | null {
    if (!id) return null;
    const binding = this.bindingType()?.find((b) => b.id === id);
    return binding ? binding.name : null;
  }

  removeInsideCover(index: number) {
    this.documentMedia().removeAt(index);
  }

  urlFromFile(file: File | null | undefined): string {
    if (!file) return '';
    return URL.createObjectURL(file);
  }
}
