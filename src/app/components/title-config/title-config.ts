import { Component, effect, OnInit, signal } from '@angular/core';
import { TitleConfigService } from '../../services/title-config';
import { StaticValuesService } from '../../services/static-values';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatAnchor, MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatAccordion, MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';

import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { UpdateTitleConfigList } from '../update-title-config-list/update-title-config-list';
import { AddTitleConfig } from '../add-title-config/add-title-config';
import { TitleService } from '../../pages/titles/title-service';
import {
  CreateTitleConfig,
  Title,
  TitleConfig,
  TitleConfigType,
} from '../../interfaces';

@Component({
  selector: 'app-title-config',
  imports: [
    SharedModule,
    MatCardModule,
    MatExpansionModule,
    MatIconModule,
    MatButtonModule,
    MatAccordion,
  ],
  templateUrl: './title-config.html',
  styleUrl: './title-config.css',
})
export class TitleConfigComponent implements OnInit {
  constructor(
    private titleService: TitleService,
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

  onClickUpdateList(event: Event, type: string) {
    event.preventDefault();
    event.stopPropagation();
    const data = this.titleConfigsData()?.find((d) => d.type === type);
    const dialog = this.matDialog.open(UpdateTitleConfigList, {
      data: {
        type,
        items: [...(data?.data || [])],
        onClose: () => dialog.close(),
        onSave: async (data: { id: number; position: number }[]) => {
          await this.titleConfigService.reorderTitleConfig(type as any, data);
          this.titleConfigsData.update((configData) => {
            configData =
              configData?.map((configD) => {
                configD.data = configD.data.sort((a, b) => {
                  const aFinalPosition =
                    data.find(({ id }) => id === a.id)?.position || a.position;
                  const bFinalPosition =
                    data.find(({ id }) => id === b.id)?.position || b.position;

                  return aFinalPosition - bFinalPosition;
                });

                return configD;
              }) || [];

            return configData;
          });
          dialog.close();
        },
      },
    });
  }

  titlesWithMinimumDetails = signal<Title[] | null>(null);
  async onClickAddNewItem(event: Event, type: string) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.titlesWithMinimumDetails()) {
      const { items } = await this.titleService.getTitleWithLessDetails({
        status: ['APPROVED'] as any,
      });
      this.titlesWithMinimumDetails.set(items);
    }

    const nextPosition =
      (this.titleConfigsData()
        ?.find((d) => d.type === type)
        ?.data.reduce((a, { position }) => (position > a ? position : a), 0) ||
        0) + 1;

    const existingTitles = this.titleConfigsData()
      ?.find((d) => d.type === type)
      ?.data.map(({ title: { id } }) => id);

    const dialog = this.matDialog.open(AddTitleConfig, {
      data: {
        titles: this.titlesWithMinimumDetails()?.filter(
          ({ id, status }) =>
            !existingTitles?.includes(id) && status === 'APPROVED'
        ),
        type,
        nextPosition,
        onClose: () => dialog.close(),
        onSubmit: async (data: CreateTitleConfig) => {
          const response = await this.titleConfigService.createTitleConfig(
            data
          );

          this.titleConfigsData.update((configData) => {
            configData =
              configData?.map((configD) => {
                if (configD.type === type) {
                  configD.data.push(response);
                }

                configD.data = configD.data.sort(
                  (a, b) => a.position - b.position
                );
                return configD;
              }) || [];

            return configData;
          });

          dialog.close();
        },
      },
    });
  }
}
