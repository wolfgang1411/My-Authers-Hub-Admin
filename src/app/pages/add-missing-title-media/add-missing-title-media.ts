import { Component, inject, OnInit, signal } from '@angular/core';
import { Title, TitleFilter, TitleMediaType } from 'src/app/interfaces';
import { TitleService } from '../titles/title-service';
import { SharedModule } from 'src/app/modules/shared/shared-module';
import { debounceTime, Subject, takeUntil } from 'rxjs';
import { ListTable } from 'src/app/components/list-table/list-table';
import { MatTableDataSource } from '@angular/material/table';
import { TranslateService } from '@ngx-translate/core';
import { MatIcon } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { downloadFile, selectFile, urlToFile } from 'src/app/common/utils/file';
import Swal from 'sweetalert2';
import { Back } from 'src/app/components/back/back';

@Component({
  selector: 'app-add-missing-title-media',
  imports: [SharedModule, ListTable, MatIcon, MatButtonModule, Back],
  templateUrl: './add-missing-title-media.html',
  styleUrl: './add-missing-title-media.css',
})
export class AddMissingTitleMedia implements OnInit {
  translateService = inject(TranslateService);
  titleService = inject(TitleService);

  titles = signal<Title[] | null>(null);

  filter = signal<TitleFilter>({
    showMissingMediaTitleOnly: true,
    itemsPerPage: 30,
    page: 1,
  });

  lastPage = signal(1);
  displayedColumns = ['name', 'publisher', 'availablemedia', 'missingmedia'];
  dataSource = new MatTableDataSource<any>();

  searchStr = new Subject<string>();
  destroy$ = new Subject<void>();

  getApiFieldName = (column: string): string | null => {
    const columnMap: Record<string, string> = {
      name: 'name',
      bookssold: 'copiesSold', // handled in API as special case
      isbn: 'isbnPrint',
      launchdate: 'launch_date',
      status: 'status',
    };
    return columnMap[column] || null;
  };

  isSortable = (column: string): boolean => {
    return this.getApiFieldName(column) !== null;
  };

  onSortChange(sort: { active: string; direction: 'asc' | 'desc' | '' }) {
    const apiFieldName = this.getApiFieldName(sort.active);
    if (!apiFieldName) return;

    const direction: 'asc' | 'desc' =
      sort.direction === 'asc' || sort.direction === 'desc'
        ? sort.direction
        : 'desc';

    this.filter.update((f) => ({
      ...f,
      orderBy: apiFieldName,
      orderByVal: direction,
      page: 1,
    }));
    this.fetchAndUpdateTitle();
  }

  getMissingMedias(title: Title) {
    const medias = title.media;
    const missingMedias: TitleMediaType[] = [];
    const isInterior = medias?.find(
      ({ type }) => type === TitleMediaType.INTERIOR,
    );
    const isFrontCover = medias?.find(
      ({ type }) => type === TitleMediaType.FRONT_COVER,
    );
    const isFullCover = medias?.find(
      ({ type }) => type === TitleMediaType.FULL_COVER,
    );
    const isManuScript = medias?.find(
      ({ type }) => type === TitleMediaType.MANUSCRIPT,
    );
    const isInsideCover = medias?.find(
      ({ type }) => type === TitleMediaType.INSIDE_COVER,
    );

    if (title.printing && title.printing[0]?.insideCover && !isInsideCover) {
      missingMedias.push(TitleMediaType.INSIDE_COVER);
    }

    if (!isInterior) {
      missingMedias.push(TitleMediaType.INTERIOR);
    }

    if (!isFrontCover) {
      missingMedias.push(TitleMediaType.FRONT_COVER);
    }

    if (!isFullCover) {
      missingMedias.push(TitleMediaType.FULL_COVER);
    }

    if (!isManuScript) {
      missingMedias.push(TitleMediaType.MANUSCRIPT);
    }

    return missingMedias;
  }

  ngOnInit(): void {
    this.fetchAndUpdateTitle();

    this.searchStr
      .pipe(takeUntil(this.destroy$), debounceTime(400))
      .subscribe((value) => {
        this.filter.update((filter) => {
          return {
            ...filter,
            searchStr: value && value.length ? value : undefined,
            page: 1,
          };
        });
        this.fetchAndUpdateTitle();
      });
  }

  setDataSource(titles: Title[]) {
    const data =
      titles?.map((title) => {
        const { name, publisher, media } = title;
        return {
          id: title.id,
          name,
          publisher: publisher.name,
          availablemedia: media || [],
          missingmedia: this.getMissingMedias(title),
        };
      }) || [];
    this.dataSource.data = data;
  }
  async fetchAndUpdateTitle() {
    try {
      const { items, itemsPerPage, page, totalCount } =
        await this.titleService.getTitleWithLessDetails(this.filter());

      this.titles.set(items);
      this.setDataSource(items);
      this.lastPage.set(Math.ceil(totalCount / itemsPerPage));
    } catch (error) {
      throw error;
    }
  }

  getIconByMedia(mediaType: TitleMediaType): string {
    switch (mediaType) {
      case TitleMediaType.FULL_COVER:
        return 'menu_book';

      case TitleMediaType.FRONT_COVER:
        return 'book';

      case TitleMediaType.INTERIOR:
        return 'article';

      case TitleMediaType.INSIDE_COVER:
        return 'description';

      case TitleMediaType.MANUSCRIPT:
        return 'history_edu';

      default:
        return 'help_outline'; // safe fallback
    }
  }

  getPageNumbers(): number[] {
    const currentPage = this.filter().page || 1;
    const totalPages = this.lastPage();
    const pages: number[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push(-1);
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push(-1);
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push(-1);
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push(-1);
        pages.push(totalPages);
      }
    }

    return pages;
  }

  onItemsPerPageChange(val: number) {
    this.filter.update((f) => ({
      ...f,
      itemsPerPage: val,
      page: 1,
    }));
    this.fetchAndUpdateTitle();
  }

  goToPage(page: number) {
    this.filter.update((f) => ({
      ...f,
      page,
    }));
    this.fetchAndUpdateTitle();
  }

  nextPage() {
    this.filter.update((f) => ({
      ...f,
      page: (f?.page || 1) + 1,
    }));
    this.fetchAndUpdateTitle();
  }

  prevPage() {
    this.filter.update((f) => ({
      ...f,
      page: (f?.page || 1) - 1,
    }));
    this.fetchAndUpdateTitle();
  }

  getExtensionFromBlob(blob: Blob): string {
    if (!blob || !blob.type) {
      return '';
    }

    const mimeToExt: Record<string, string> = {
      'application/pdf': '.pdf',
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'image/svg+xml': '.svg',
      'text/plain': '.txt',
      'application/json': '.json',
    };

    return mimeToExt[blob.type] ?? '';
  }

  async downloadMedia(titleId: number, mediaType: TitleMediaType) {
    const title = this.titles()?.find(
      ({ id }) => id.toString() === titleId.toString(),
    );
    console.log({ title });
    if (!title) return;
    const media = title.media?.find(({ type }) => type === mediaType);
    console.log({ media });
    if (!media) return;
    const { url } = await this.titleService.getMediaUrl(media.id);
    const file = await urlToFile(url, 'test');
    const name = `${title.name}-${mediaType.toLowerCase().replace(' ', '')}.${this.getExtensionFromBlob(file)}`;
    downloadFile(file, name);
  }

  getAcceptedFileTypes(type: TitleMediaType): string {
    switch (type) {
      case TitleMediaType.FULL_COVER:
        return 'application/pdf';
      case TitleMediaType.FRONT_COVER:
        return 'image/*';
      case TitleMediaType.INTERIOR:
        return 'application/pdf';
      case TitleMediaType.INSIDE_COVER:
        return 'image/*';
      case TitleMediaType.MANUSCRIPT:
        return '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      default:
        return 'image/*,application/pdf';
    }
  }

  async uploadMedia(titleId: number, mediaType: TitleMediaType) {
    const file = await selectFile(this.getAcceptedFileTypes(mediaType));
    const { value } = await Swal.fire({
      icon: 'warning',
      title: 'Warning',
      html: 'Are you sure you want to upload this media?',
      showCancelButton: true,
      confirmButtonText: 'Yes',
      cancelButtonText: 'No',
    });
    if (!value) return;
    const media = await this.titleService.uploadMedia(titleId, {
      file: file as File,
      type: mediaType,
    });
    this.titles.update((titles) => {
      if (titles) {
        titles = titles.map((title) => {
          if (title.id === titleId) {
            return {
              ...title,
              media: [...(title.media || []), media],
            };
          }
          return title;
        }) as any;
      }

      return titles;
    });
    this.setDataSource(this.titles() || []);
    Swal.fire({
      icon: 'success',
      title: 'Media uploaded successfully',
    });
  }
}
