import { Component, effect, OnInit, signal, Signal } from '@angular/core';
import { UserService } from '../../services/user';
import {
  BookBindings,
  LaminationType,
  PaperQuailty,
  Size,
  SizeCategory,
  User,
} from '../../interfaces';
import { Router } from '@angular/router';
import { SettingsService } from '../../services/settings';
import { PrintingService } from '../../services/printing-service';
import { PrintingCalculator } from '../../components/printing-calculator/printing-calculator';
import { PrintingSettingsManager } from '../../components/printing-settings-manager/printing-settings-manager';
import { MatTabsModule } from '@angular/material/tabs';
import { SharedModule } from '../../modules/shared/shared-module';
import { TitleConfigComponent } from '../../components/title-config/title-config';
import { TitleSetting } from '../title-setting/title-setting';

@Component({
  selector: 'app-settings',
  imports: [
    PrintingCalculator,
    PrintingSettingsManager,
    MatTabsModule,
    SharedModule,
    TitleConfigComponent,
    TitleSetting,
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings implements OnInit {
  constructor(
    private userService: UserService,
    private router: Router,
    private settingService: SettingsService,
    private printService: PrintingService
  ) {
    this.user = this.userService.loggedInUser$;

    effect(() => {
      const user = this.user();
      if (user && user.accessLevel !== 'SUPERADMIN') {
        this.router.navigateByUrl('/');
      }
    });
  }

  user!: Signal<User | null>;

  async ngOnInit() {
    await this.fetchInitialData();
  }

  bindingTypes = signal<BookBindings[]>([]);
  paperQualityTypes = signal<PaperQuailty[]>([]);
  sizeTypes = signal<Size[]>([]);
  laminationTypes = signal<LaminationType[]>([]);
  marginPercent = signal<number | null>(null);

  async fetchInitialData() {
    const { items: bindingTypes } = await this.printService.getBindingType({
      itemsPerPage: 200,
    });
    const { items: paperQuality } = await this.printService.getAllPaperTypes({
      itemsPerPage: 200,
    });
    const { items: sizes } = await this.printService.getSizeCategory({
      itemsPerPage: 200,
    });
    const { items: laminations } = await this.printService.getLaminationType({
      itemsPerPage: 200,
    });
    const { val: marginPercent } =
      await this.settingService.fetchMarginPercent();

    this.bindingTypes.set(bindingTypes);
    this.paperQualityTypes.set(paperQuality);
    this.sizeTypes.set(sizes);
    this.laminationTypes.set(laminations);
    this.marginPercent.set(Number(marginPercent));
  }

  onPaperQualityTypesUpdae({
    data,
    isNew,
  }: {
    data: PaperQuailty;
    isNew: boolean;
  }) {
    this.paperQualityTypes.update((d) => {
      if (isNew) {
        d.push(data);
      } else {
        d = d.map((q) => (q.id === data.id ? data : q));
      }

      return d;
    });
  }

  onBindingTypesUpdate({
    data,
    isNew,
  }: {
    data: BookBindings;
    isNew: boolean;
  }) {
    this.bindingTypes.update((d) => {
      if (isNew) {
        d.push(data);
      } else {
        d = d.map((q) => (q.id === data.id ? data : q));
      }

      return d;
    });
  }

  onLaminationTypesUpdate({
    data,
    isNew,
  }: {
    data: LaminationType;
    isNew: boolean;
  }) {
    this.laminationTypes.update((d) => {
      if (isNew) {
        d.push(data);
      } else {
        d = d.map((q) => (q.id === data.id ? data : q));
      }

      return d;
    });
  }
  onSizeTypesUpdate({ data, isNew }: { data: SizeCategory; isNew: boolean }) {
    // When a size category is updated, we need to refresh the sizes
    // since the category data is nested in each size
    this.fetchInitialData();
  }

  onMarginPercentUpdate(value: number) {
    this.marginPercent.set(value);
  }
}
