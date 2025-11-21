import { Component, computed, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  createOrUpdateCategory,
  TitleCategory,
  TitleCategoryType,
  TitleGenre,
  TitleListItem,
} from '../../interfaces';
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
import Swal from 'sweetalert2';
import { MatAccordion, MatExpansionModule } from '@angular/material/expansion';
import { sign } from 'crypto';

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
    MatAccordion,
    MatExpansionModule,
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
  async ngOnInit() {
    await this.load();
  }

  type = [
    { label: 'Category', value: TitleCategoryType.CATEGORY },
    { label: 'Sub Category', value: TitleCategoryType.SUBCATEGORY },
    { label: 'Trade Category', value: TitleCategoryType.TRADE },
    {
      label: 'Genre',
      value: TitleCategoryType.GENRE,
    },
  ];

  filterType = '';
  searchText = '';

  displayedColumns = ['name', 'parent', 'actions'];
  titleCategoryType = TitleCategoryType;
  lastSelectedTab: TitleCategoryType | 'GENRE' | 'ALL' = 'ALL';
  editItemId: number | null = null;
  parentCategories = signal<TitleCategory[]>([]);
  items = signal<TitleListItem[]>([]);
  genre = signal<TitleGenre[]>([]);
  categoriesWithChildren = computed(() => {
    const cats = this.items().filter(
      (x) => x.type === TitleCategoryType.CATEGORY
    );
    const subs = this.items().filter(
      (x) => x.type === TitleCategoryType.SUBCATEGORY
    );
    return cats.map((cat) => ({
      ...cat,
      children: subs.filter((s) => s.parent?.id === cat.id),
    }));
  });

  trade = computed(() => {
    return this.items().filter((x) => x.type === TitleCategoryType.TRADE);
  });
  subCategory = computed(() => {
    return this.items().filter((x) => x.type === TitleCategoryType.SUBCATEGORY);
  });

  selectTab(type: TitleCategoryType | 'GENRE' | 'ALL') {
    this.lastSelectedTab = type;
    console.log(this.lastSelectedTab, 'selecttabbbb');
  }

  async load() {
    const { items: categories } = await this.titleService.getTitleCategory();
    const { items: genres } = await this.titleService.getGenre();
    this.genre.set(genres);
    const { items: trades } = await this.titleService.getTradeCategory();
    const { items } = await this.titleService.getSubcategory();

    const subcategories: TitleListItem[] = [];

    for (const cat of categories) {
      subcategories.push(
        ...items.map((s) => ({
          id: s.id,
          name: s.name,
          type: TitleCategoryType.SUBCATEGORY,
          parent: s.parent ? { id: s.parent.id, name: s.parent.name } : null,
        }))
      );
    }

    const allItems: TitleListItem[] = [
      ...categories.map((c) => ({
        id: c.id,
        name: c.name,
        type: TitleCategoryType.CATEGORY,
        parent: null,
      })),
      ...subcategories,
      ...genres.map((g) => ({
        id: g.id,
        name: g.name,
        type: TitleCategoryType.GENRE,
        parent: null,
      })),
      ...trades.map((t) => ({
        id: t.id,
        name: t.name,
        type: TitleCategoryType.TRADE,
        parent: null,
      })),
    ];

    this.items.set(allItems);
    this.parentCategories.set(categories);
  }

  editId() {
    return this.editItemId;
  }
  startEdit(item: TitleListItem) {
    this.editItemId = item.id;
    this.form.patchValue({
      name: item.name,
      parentId: item.parent ? item.parent.id : null,
      type: item.type,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async deleteItem(id: number, type: TitleCategoryType | 'GENRE') {
    if (!confirm('Are you sure?')) return;
    await this.titleService.deleteCategory(id);

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

    const dto: createOrUpdateCategory = {
      name: this.form.value.name!,
      parentId: (this.form.value.parentId as number) ?? null,
      type: this.form.value.type!,
      id: this.editItemId ?? undefined,
    };
    const respone = await this.titleService.createOrUpdateCategory(dto);
    if (respone) {
      Swal.fire({
        icon: 'success',
        title: 'success',
        text: this.editItemId
          ? 'Category updated successfully'
          : 'Category created successfully',
        showConfirmButton: false,
        heightAuto: false,
        timer: 1500,
      });
    }
    await this.load();
    this.resetForm();
  }

  visibleItems() {
    let data = [...this.items()];
    if (this.filterType) {
      data = data.filter((x) => x.type === this.filterType);
    }
    if (this.searchText.trim()) {
      const q = this.searchText.toLowerCase();
      data = data.filter((x) => {
        const name = (x.name || '').toLowerCase();
        return name.includes(q);
      });
    }
    return data;
  }
}
