import { Component, signal } from '@angular/core';
import { SharedModule } from '../../modules/shared/shared-module';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { RouterModule } from '@angular/router';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { LayoutModule } from '@angular/cdk/layout';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { RoyaltyService } from '../../services/royalty-service';
import {
  CreateRoyalty,
  RoyalFormGroupAmountField,
  Royalty,
  RoyaltyFilter,
} from '../../interfaces';
import { debounceTime, Subject } from 'rxjs';
import { AuthorsService } from '../authors/authors-service';
import { PublisherService } from '../publisher/publisher-service';
import { AddRoyalty } from '../../components/add-royalty/add-royalty';
import Swal from 'sweetalert2';
import { RoyaltyTable } from '../../components/royalty-table/royalty-table';

@Component({
  selector: 'app-royalties',
  imports: [
    LayoutModule,
    SharedModule,
    AngularSvgIconModule,
    RouterModule,
    MatButton,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    SharedModule,
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    RoyaltyTable,
  ],
  templateUrl: './royalties.html',
  styleUrl: './royalties.css',
})
export class Royalties {
  constructor(
    private royaltyService: RoyaltyService,

    private dialog: MatDialog
  ) {}

  filter: RoyaltyFilter = {
    page: 1,
    itemsPerPage: 30,
    searchStr: '',
  };

  searchStr = new Subject<string>();
  searchStr$ = this.searchStr
    .asObservable()
    .pipe(debounceTime(800))
    .subscribe((value) => {
      this.filter.searchStr = value;
      this.filter.page = 1;
      this.updateRoyaltyList();
    });

  lastPage = signal(1);
  royaltyList = signal<Royalty[]>([]);
  ngOnInit(): void {
    this.updateRoyaltyList();
  }

  async updateRoyaltyList() {
    const { items: royaltyList } = await this.royaltyService.getRoyalties(
      this.filter
    );
    this.royaltyList.set(royaltyList);
  }
  addRoyalty() {
    const dialog = this.dialog.open(AddRoyalty, {
      data: {
        onSubmit: async (royaltyArray: CreateRoyalty[]) => {
          if (royaltyArray.length) {
            const response = await this.royaltyService.createRoyalties(
              royaltyArray
            );
            if (response) {
              dialog.close();
              Swal.fire({
                title: 'success',
                text: 'The Royalties have been created successfully!',
                icon: 'success',
                heightAuto: false,
              });
              this.updateRoyaltyList();
            }
          }
        },
        onClose: () => {
          dialog.close();
        },
      },
    });
  }
}
