import {
  Component,
  computed,
  effect,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Validators } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SharedModule } from '../../modules/shared/shared-module';
import { SettingsService } from '../../services/settings';
import { PrintingService } from '../../services/printing-service';
import { UserService } from '../../services/user';
import {
  SizeCategory,
  CreateSizeCategory,
  UpdateSizeCategory,
} from '../../interfaces';
import { SizeManager } from './size-manager/size-manager';
import { BindingTypeManager } from './binding-type-manager/binding-type-manager';
import { LaminationTypeManager } from './lamination-type-manager/lamination-type-manager';
import { PaperQualityManager } from './paper-quality-manager/paper-quality-manager';
import { AddUpdateSizeCategory } from '../add-update-size-category/add-update-size-category';
import { InviteDialog } from '../invite-dialog/invite-dialog';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-printing-settings-manager',
  imports: [
    CommonModule,
    MatExpansionModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatTableModule,
    MatChipsModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    SharedModule,
    SizeManager,
    BindingTypeManager,
    LaminationTypeManager,
    PaperQualityManager,
  ],
  templateUrl: './printing-settings-manager.html',
  styleUrl: './printing-settings-manager.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintingSettingsManager implements OnInit {
  sizeCategories = signal<SizeCategory[]>([]);
  loading = signal<boolean>(false);
  selectedCategoryId = signal<number | null>(null);
  marginPercent = signal<number | null>(null);

  selectedCategory = computed(() => {
    const id = this.selectedCategoryId();
    if (!id) return null;
    return this.sizeCategories().find((c) => c.id === id) || null;
  });

  isSuperAdmin = computed(() => {
    return this.userService.loggedInUser$()?.accessLevel === 'SUPERADMIN';
  });


  constructor(
    private settingsService: SettingsService,
    private printingService: PrintingService,
    private userService: UserService,
    private dialog: MatDialog,
    private translateService: TranslateService
  ) {
    // Check access level
    effect(() => {
      const user = this.userService.loggedInUser$();
      if (user && user.accessLevel !== 'SUPERADMIN') {
        // Redirect or hide component
      }
    });
  }

  async ngOnInit() {
    await this.loadData();
    await this.loadMarginPercent();
  }

  async loadData() {
    this.loading.set(true);
    try {
      const response = await this.settingsService.getSizeCategories({ itemsPerPage: 200 });
      this.sizeCategories.set(response.items);
    } catch (error) {
      console.error('Error loading size categories:', error);
      await Swal.fire({
        icon: 'error',
        title: await firstValueFrom(this.translateService.get('error')),
        text: await firstValueFrom(this.translateService.get('errorloadingdata')),
      });
    } finally {
      this.loading.set(false);
    }
  }

  async loadMarginPercent() {
    try {
      const response = await this.settingsService.fetchMarginPercent();
      this.marginPercent.set(Number(response.val));
    } catch (error) {
      console.error('Error loading margin percent:', error);
    }
  }

  updateMarginPercent() {
    const dialogRef = this.dialog.open(InviteDialog, {
      data: {
        heading: 'Manage margin percent',
        defaultValue: this.marginPercent()?.toString() || '18',
        placeholder: 'enterpercent',
        validators: [Validators.required, Validators.min(0)],
        type: 'number',
        onClose: () => dialogRef.close(),
        onSave: async (val: string) => {
          try {
            await this.settingsService.updateMarginPercent(val);
            this.marginPercent.set(Number(val));
            dialogRef.close();
            await Swal.fire({
              icon: 'success',
              title: await firstValueFrom(this.translateService.get('success')),
              text: await firstValueFrom(this.translateService.get('updatedsuccessfully')),
            });
          } catch (error) {
            console.error('Error updating margin percent:', error);
            await Swal.fire({
              icon: 'error',
              title: await firstValueFrom(this.translateService.get('error')),
              text: await firstValueFrom(this.translateService.get('errorupdating')),
            });
          }
        },
      },
    });
  }


  startAddingCategory() {
    const dialogRef = this.dialog.open(AddUpdateSizeCategory, {
      data: {
        onClose: () => dialogRef.close(),
        onSubmit: async (data: CreateSizeCategory) => {
          try {
            const newCategory = await this.settingsService.createSizeCategory(data);
            this.sizeCategories.update((categories) => [...categories, newCategory]);
            dialogRef.close();
            await Swal.fire({
              icon: 'success',
              title: await firstValueFrom(this.translateService.get('success')),
              text: await firstValueFrom(this.translateService.get('categorycreated')),
            });
          } catch (error) {
            console.error('Error creating category:', error);
            await Swal.fire({
              icon: 'error',
              title: await firstValueFrom(this.translateService.get('error')),
              text: await firstValueFrom(this.translateService.get('errorcreatingcategory')),
            });
          }
        },
      },
    });
  }


  updateCategory(category: SizeCategory) {
    const dialogRef = this.dialog.open(AddUpdateSizeCategory, {
      data: {
        defaultValue: category,
        onClose: () => dialogRef.close(),
        onSubmit: async (data: UpdateSizeCategory) => {
          try {
            const updated = await this.settingsService.updateSizeCategory(category.id, data);
            this.sizeCategories.update((categories) =>
              categories.map((c) => (c.id === category.id ? updated : c))
            );
            dialogRef.close();
            await Swal.fire({
              icon: 'success',
              title: await firstValueFrom(this.translateService.get('success')),
              text: await firstValueFrom(this.translateService.get('categoryupdated')),
            });
          } catch (error) {
            console.error('Error updating category:', error);
            await Swal.fire({
              icon: 'error',
              title: await firstValueFrom(this.translateService.get('error')),
              text: await firstValueFrom(this.translateService.get('errorupdatingcategory')),
            });
          }
        },
      },
    });
  }

  async deleteCategory(category: SizeCategory) {
    const { isConfirmed } = await Swal.fire({
      icon: 'warning',
      title: await firstValueFrom(this.translateService.get('deletecategory')),
      text: await firstValueFrom(this.translateService.get('areyousuredelete')),
      showCancelButton: true,
      confirmButtonText: await firstValueFrom(this.translateService.get('delete')),
      cancelButtonText: await firstValueFrom(this.translateService.get('cancel')),
    });

    if (isConfirmed) {
      try {
        await this.settingsService.deleteSizeCategory(category.id);
        this.sizeCategories.update((categories) =>
          categories.filter((c) => c.id !== category.id)
        );
        await Swal.fire({
          icon: 'success',
          title: await firstValueFrom(this.translateService.get('success')),
          text: await firstValueFrom(this.translateService.get('categorydeleted')),
        });
      } catch (error) {
        console.error('Error deleting category:', error);
        await Swal.fire({
          icon: 'error',
          title: await firstValueFrom(this.translateService.get('error')),
          text: await firstValueFrom(this.translateService.get('errordeletingcategory')),
        });
      }
    }
  }

  onCategoryUpdated(category: SizeCategory) {
    this.sizeCategories.update((categories) =>
      categories.map((c) => (c.id === category.id ? category : c))
    );
  }

  onEntityUpdated(categoryId: number) {
    // Reload the specific category to get updated relations
    this.loadData();
  }
}

