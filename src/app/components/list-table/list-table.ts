import { Component, Input, OnInit, TemplateRef } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatIconButton } from '@angular/material/button';
@Component({
  selector: 'app-list-table',
  imports: [SharedModule, MatFormFieldModule, MatInputModule, MatTableModule],
  templateUrl: './list-table.html',
  styleUrl: './list-table.css',
})
export class ListTable implements OnInit {
  data = [];
  @Input() displayedColumns!: string[];
  @Input() dataSource!: MatTableDataSource<any>;
  @Input() actionTemplate!: TemplateRef<any>;

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }
  ngOnInit() {
    if (this.dataSource.data.length > 0 && this.displayedColumns.length === 0) {
      this.displayedColumns = Object.keys(this.dataSource.data[0]);
    }
  }
}
