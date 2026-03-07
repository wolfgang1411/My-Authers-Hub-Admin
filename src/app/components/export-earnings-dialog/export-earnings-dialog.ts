import {
  Component,
  Inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { TitleService } from '../../pages/titles/title-service';
import { UserService } from '../../services/user';
import { PlatformService } from '../../services/platform';
import { TranslateService } from '@ngx-translate/core';
import {
  SalesType,
  EarningsStatus,
  Title,
  Platform,
  EarningFilter,
} from '../../interfaces';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { Subject, debounceTime } from 'rxjs';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-export-earnings-dialog',
  imports: [
    SharedModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDatepickerModule,
    NgxMatSelectSearchModule,
    FormsModule,
  ],
  templateUrl: './export-earnings-dialog.html',
  styleUrl: './export-earnings-dialog.css',
})
export class ExportEarningsDialog implements OnInit {
  filterForm: FormGroup;

  salesTypes = signal(Object.values(SalesType));
  earningsStatuses = signal(Object.values(EarningsStatus));

  titleSearchStr = signal('');
  today = new Date();

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ExportEarningsDialog>,
    @Inject(MAT_DIALOG_DATA) public data: Inputs,
    public titleService: TitleService,
  ) {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    this.filterForm = this.fb.group({
      itemsPerPage: [100],
      paidBefore: [null],
      paidAfter: [oneMonthAgo],
      createdBefore: [null],
      status: [[]],
      salesType: [[]],
      platforms: [[]],
      platformIds: [[]],
      titleIds: [[]],
      authorIds: [[]],
      publisherIds: [[]],
      showPublisherAuthorEarnings: [false],
    });
  }

  ngOnInit() {}

  onTitleSearchStrChange(searchStr?: string) {
    this.titleService
      .getTitles({
        searchStr,
      })
      .then(({ items }) => {
        this.data.titles = items;
      });
  }

  onExport() {
    const value = this.filterForm.value;
    const cleanFilters: any = {};

    // Clean empty arrays and nulls
    Object.keys(value).forEach((key) => {
      if (
        value[key] !== null &&
        value[key] !== '' &&
        (!Array.isArray(value[key]) || value[key].length > 0)
      ) {
        if (value[key] instanceof Date) {
          cleanFilters[key] = value[key].toISOString();
        } else {
          cleanFilters[key] = value[key];
        }
      }
    });

    this.dialogRef.close(cleanFilters);
  }
}

interface Inputs {
  filter: EarningFilter;
  titles: Title[];
  platforms: Platform[];
}
