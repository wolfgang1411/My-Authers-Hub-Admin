import { Component, signal } from '@angular/core';
import { SharedModule } from '../../modules/shared/shared-module';
import { ListTable } from '../../components/list-table/list-table';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { RouterModule } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatTableDataSource } from '@angular/material/table';
import { IsbnService } from '../../services/isbn-service';
import { debounceTime, Subject } from 'rxjs';
import { createIsbn, ISBN, ISBNFilter } from '../../interfaces';
import { Logger } from '../../services/logger';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CreateIsbn } from '../../components/create-isbn/create-isbn';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-isbn-list',
  imports: [
    SharedModule,
    ListTable,
    AngularSvgIconModule,
    RouterModule,
    MatButton,
    MatIconModule,
    MatDialogModule,
  ],
  templateUrl: './isbn-list.html',
  styleUrl: './isbn-list.css',
})
export class ISBNList {
  constructor(
    private isbnService: IsbnService,
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
  filter: ISBNFilter = {
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
      this.updateISBNList();
    });

  lastPage = signal(1);
  isbnList = signal<ISBN[]>([]);
  ngOnInit(): void {
    this.updateISBNList();
  }

  async createIsbn() {
    const dialogRef = this.dialog.open(CreateIsbn, {
      data: {
        onSubmit: async (createIsbn: createIsbn) => {
          const response = await this.isbnService.createIsbn(createIsbn);
          if (response) {
            dialogRef.close();
            Swal.fire({
              title: 'success',
              text: 'The ISBN number is verified and has been created successfully!',
              icon: 'success',
              heightAuto: false,
            });
            this.updateISBNList();
          }
        },
        onClose: () => {
          dialogRef.close();
        },
      },
    });
  }
  async updateISBNList() {
    const isbnList = await this.isbnService.getAllISBN(this.filter);
    this.isbnList.set(isbnList.items);
    this.lastPage.set(Math.ceil(isbnList.totalCount / isbnList.itemsPerPage));
    this.dataSource.data = isbnList.items.map((isbn, index) => {
      return {
        serial: index + 1,
        id: isbn.id,
        isbnnumber: isbn.isbnNumber,
        isbntype: isbn.type,
        title: isbn.title && isbn.title.length ? isbn.title[0].name : 'N/A',
        createdby: isbn.admin
          ? isbn.admin.firstName + ' ' + isbn.admin.lastName
          : 'N/A',
      };
    });
  }
  downloadBarCode(isbnNumber: string) {
    console.log(isbnNumber, 'isbnNumber');
    const downloadFile = (file: Blob, name: string) => {
      const blobUrl = URL.createObjectURL(file);
      fetch(blobUrl)
        .then((resp) => resp.blob())
        .then((blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        })
        .catch((error) => {
          this.logger.logError(error);
        });
    };
    this.isbnService.downloadBarCode(isbnNumber).then((response: any) => {
      downloadFile(response.body, 'filename');
    });
  }
}
