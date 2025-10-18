import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { TitleConfig, TitleConfigType } from '../../interfaces';
import { ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../../modules/shared/shared-module';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-update-title-config-list',
  imports: [
    SharedModule,
    ReactiveFormsModule,
    DragDropModule,
    MatDialogModule,
    MatButtonModule,
  ],
  templateUrl: './update-title-config-list.html',
  styleUrl: './update-title-config-list.css',
})
export class UpdateTitleConfigList {
  data = inject<Inputs>(MAT_DIALOG_DATA);

  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.data.items, event.previousIndex, event.currentIndex);
  }

  onClickConfirmReorder() {
    const postionsToUpdate = this.data.items.map(({ id }, index) => ({
      id,
      position: index + 1,
    }));
    this.data.onSave(postionsToUpdate);
  }
}

interface Inputs {
  type: TitleConfigType;
  items: TitleConfig[];
  onClose: () => void;
  onSave: (data: { id: number; position: number }[]) => void;
}
