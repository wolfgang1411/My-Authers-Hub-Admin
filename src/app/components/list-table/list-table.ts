import {
  AfterViewInit,
  Component,
  computed,
  Input,
  Signal,
  signal,
  TemplateRef,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatMenuTrigger } from '@angular/material/menu';
@Component({
  selector: 'app-list-table',
  imports: [
    SharedModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatSortModule,
    MatIconModule,
  ],
  templateUrl: './list-table.html',
  styleUrl: './list-table.css',
})
export class ListTable implements AfterViewInit {
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
