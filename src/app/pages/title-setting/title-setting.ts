import { Component, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TitleCategory, TitleCategoryType } from '../../interfaces';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { TitleService } from '../titles/title-service';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatOptionModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-title-setting',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    FormsModule,
    MatTableModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    CommonModule,
    MatOptionModule,
    MatCardModule,
  ],
  templateUrl: './title-setting.html',
  styleUrl: './title-setting.css',
})
export class TitleSetting {
  constructor(private titleService: TitleService) {}

  form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),

    parentId: new FormControl<number | null>(null),

    type: new FormControl<TitleCategoryType>(TitleCategoryType.CATEGORY, {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  // -------------------------
  // DROPDOWN TYPE LIST
  // -------------------------
  type = [
    { label: 'Category', value: TitleCategoryType.CATEGORY },
    { label: 'Sub Category', value: TitleCategoryType.SUBCATEGORY },
    { label: 'Trade Category', value: TitleCategoryType.TRADE },
  ];

  // -------------------------
  // STATE VARIABLES
  // -------------------------
  filterType = '';
  searchText = '';

  displayedColumns = ['name', 'description', 'actions'];

  editItemId: number | null = null;

  // SIGNALS
  parentCategories = signal<TitleCategory[]>([]);
  items = signal<TitleCategory[]>([]);

  // -------------------------
  // ON INIT
  // -------------------------
  async ngOnInit() {
    await this.load();
  }

  // -------------------------
  // LOAD ALL CATEGORY DATA
  // -------------------------
  async load() {
    const { items } = await this.titleService.getTitleCategory();

    // Signals update cleanly (no ExpressionChanged error)
    this.items.set(items);

    // Only parent categories allowed
    this.parentCategories.set(
      items.filter((x) => x.type === TitleCategoryType.CATEGORY)
    );
  }

  // -------------------------
  // HELPERS
  // -------------------------
  editId() {
    return this.editItemId;
  }

  // -------------------------
  // EDIT ITEM
  // -------------------------
  startEdit(item: TitleCategory) {
    this.editItemId = item.id;

    this.form.patchValue({
      name: item.name,
      parentId: item.parent ? item.parent.id : null,
      type: item.type,
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async deleteItem(id: number) {
    if (!confirm('Are you sure?')) return;

    // await this.titleService.delete(id);
    this.load();
  }

  resetForm() {
    this.editItemId = null;

    this.form.reset({
      name: '',
      parentId: null,
      type: TitleCategoryType.CATEGORY,
    });
  }

  async onSubmit() {
    if (this.form.invalid) return;

    const dto = {
      name: this.form.value.name!,
      parentId: this.form.value.parentId!,
      type: this.form.value.type!,
    };

    if (this.editItemId) {
      // UPDATE
      // await this.titleService.update(this.editItemId, dto);
    } else {
      // CREATE
      // await this.titleService.create(dto);
    }

    this.load();
    this.resetForm();
  }

  visibleItems() {
    let data = [...this.items()];
    if (this.filterType) {
      data = data.filter((x) => x.type === this.filterType);
    }
    if (this.searchText.trim()) {
      const q = this.searchText.toLowerCase();
      data = data.filter(
        (x) =>
          x.name.toLowerCase().includes(q) ||
          (x.name || '').toLowerCase().includes(q)
      );
    }
    return data;
  }
}
