import { Component, computed, effect, OnInit, signal } from '@angular/core';
import { TitleConfigService } from '../../services/title-config';
import { StaticValuesService } from '../../services/static-values';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatAnchor } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { TitleConfig, StaticValues, TitleConfigType } from '../../interfaces';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { UpdateTitleConfigList } from '../update-title-config-list/update-title-config-list';

@Component({
  selector: 'app-title-config',
  imports: [
    SharedModule,
    MatAnchor,
    MatCardModule,
    MatExpansionModule,
    MatIconModule,
  ],
  templateUrl: './title-config.html',
  styleUrl: './title-config.css',
})
export class TitleConfigComponent implements OnInit {
  constructor(
    private titleConfigService: TitleConfigService,
    private staticValueService: StaticValuesService,
    private translateService: TranslateService,
    private matDialog: MatDialog
  ) {
    this.staticValueService.staticValues()?.TitleConfigType;

    effect(() => {
      const titleConfigTypes =
        this.staticValueService.staticValues()?.TitleConfigType;
      if (titleConfigTypes) {
        this.fetchAndUpdateConfigData(titleConfigTypes);
      }
    });
  }

  async fetchAndUpdateConfigData(configTypes: typeof TitleConfigType) {
    const data = await Promise.all(
      Object.keys(configTypes).map(async (type) => {
        const { items } = await this.titleConfigService.fetchTitleConfigs({
          type: type as any,
        });

        return {
          type,
          data: items,
        };
      })
    );

    this.titleConfigsData.set(data);
  }

  titleConfigsData = signal<{ type: string; data: TitleConfig[] }[] | null>(
    null
  );

  ngOnInit() {}

  async onClickDeleteConfigItem(titleConfg: TitleConfig) {
    const { value } = await Swal.fire({
      icon: 'warning',
      title: this.translateService.instant('titleconfigdeletewarningtitle'),
      html: this.translateService.instant('titleconfigdeletewarningcontent', {
        title: titleConfg.title.name,
        type: this.translateService.instant(titleConfg.type as any),
      }),
      showConfirmButton: true,
      showCancelButton: true,
      confirmButtonText: this.translateService.instant('yes'),
      cancelButtonText: this.translateService.instant('no'),
      customClass: {
        confirmButton: '!bg-red-500',
        cancelButton: '!bg-primary',
      },
    });

    if (!value) return;

    await this.titleConfigService.deleteTitlConfig(titleConfg.id);

    this.titleConfigsData.update((configData) => {
      configData =
        configData?.map(({ type, data }) => {
          return {
            type,
            data:
              type === (titleConfg.type as any)
                ? data.filter((d) => d.id !== titleConfg.id)
                : data,
          };
        }) || [];

      return configData;
    });
  }

  onClickUpdateList(type: string) {
    const data = this.titleConfigsData()?.find((d) => d.type === type);
    const dialog = this.matDialog.open(UpdateTitleConfigList, {
      data: {
        type,
        items: data?.data,
        onClose: () => dialog.close(),
      },
    });
  }
}
