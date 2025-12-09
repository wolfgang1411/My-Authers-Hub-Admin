import {
  AfterViewInit,
  Component,
  Input,
  Output,
  EventEmitter,
  TemplateRef,
  ViewChild,
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
  @Input() editIsbnTemplate!: TemplateRef<any>;
  @Input() isSortable?: (column: string) => boolean;
  @Output() sortChange = new EventEmitter<{
    active: string;
    direction: 'asc' | 'desc' | '';
  }>();
  @ViewChild(MatSort) sort!: MatSort;

  ngAfterViewInit() {
    setTimeout(() => {
      if (this.dataSource && this.sort) {
        // Subscribe to sort changes BEFORE setting dataSource.sort
        // This ensures we can intercept and handle the event
        this.sort.sortChange.subscribe((event) => {
          if (this.isSortable && !this.isSortable(event.active)) {
            // Reset sort if column is not sortable
            this.sort.sort({ id: '', start: 'asc', disableClear: false });
            return;
          }
          
          // Emit sort change to parent for API sorting
          this.sortChange.emit(event);
        });
        
        // Set sort to enable sort events and UI
        this.dataSource.sort = this.sort;
        
        // Override sortData to prevent client-side sorting
        // The parent component will handle sorting via API
        this.dataSource.sortData = (data: any[], sort: any) => {
          // Don't sort client-side - return data as-is
          // Parent will fetch sorted data from API and update dataSource
          return data;
        };
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
