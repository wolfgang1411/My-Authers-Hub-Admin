import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TitleConfig, TitleConfigType } from '../../interfaces';

@Component({
  selector: 'app-update-title-config-list',
  imports: [],
  templateUrl: './update-title-config-list.html',
  styleUrl: './update-title-config-list.css',
})
export class UpdateTitleConfigList {
  data = inject<Inputs>(MAT_DIALOG_DATA);
}

interface Inputs {
  type: TitleConfigType;
  items: TitleConfig[];
  onClose: () => void;
}
