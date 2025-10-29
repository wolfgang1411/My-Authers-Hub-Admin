import {
  Component,
  effect,
  Input,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatFormField, MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-details-list-table',
  imports: [
    SharedModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatSortModule,
  ],
  templateUrl: './details-list-table.html',
  styleUrl: './details-list-table.css',
})
export class DetailsListTable {
  constructor() {}
  data = [];
  @Input() displayedColumns!: string[];
  @Input() dataSource!: MatTableDataSource<any>;
  @Input() actionTemplate!: TemplateRef<any>;
  @Input() cellTemplate?: TemplateRef<any>;

  @ViewChild(MatSort) sort!: MatSort;

  ngAfterViewInit() {
    setTimeout(() => {
      if (this.dataSource && this.sort) {
        console.log(this.dataSource, 'datasourceeeee');
        this.dataSource.sort = this.sort;
      }
    });
  }

  ngOnInit() {
    if (
      this.dataSource?.data?.length > 0 &&
      this.displayedColumns?.length === 0
    ) {
      this.displayedColumns = Object.keys(this.dataSource.data[0]);
    }
  }
}
