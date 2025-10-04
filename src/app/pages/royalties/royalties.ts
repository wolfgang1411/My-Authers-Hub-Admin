import { Component, signal } from '@angular/core';
import { SharedModule } from '../../modules/shared/shared-module';
import { ListTable } from '../../components/list-table/list-table';
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
import { Logger } from '../../services/logger';
import { Royalty, RoyaltyFilter } from '../../interfaces';
import { MatTableDataSource } from '@angular/material/table';
import { debounceTime, Subject } from 'rxjs';

@Component({
  selector: 'app-royalties',
  imports: [
    LayoutModule,
    SharedModule,
    ListTable,
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
  ],
  templateUrl: './royalties.html',
  styleUrl: './royalties.css',
})
export class Royalties {
  constructor(
    private royaltyService: RoyaltyService,
    private logger: Logger,
    private dialog: MatDialog
  ) {}
  displayedColumns: string[] = [
    'serial',
    'isbnnumber',
    'isbntype',
    'title',
    'createdby',
    'actions',
  ];
  filter: RoyaltyFilter = {
    page: 1,
    itemsPerPage: 30,
    searchStr: '',
  };

  dataSource = new MatTableDataSource<any>();
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
    const royaltyResponse = await this.royaltyService.getRoyalties(this.filter);
    this.royaltyList.set(royaltyResponse.items);
    this.lastPage.set(
      Math.ceil(royaltyResponse.totalCount / royaltyResponse.itemsPerPage)
    );
    this.dataSource.data = royaltyResponse.items.map((royalty, index) => {
      return {
        serial: index + 1,
      };
    });
  }
}
