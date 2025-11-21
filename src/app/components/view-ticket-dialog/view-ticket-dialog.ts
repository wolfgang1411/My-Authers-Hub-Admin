import { Component, inject, OnInit } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { SharedModule } from '../../modules/shared/shared-module';
import { TranslateService } from '@ngx-translate/core';
import {
  TitleUpdateTicket,
  TitlePrintingUpdateTicket,
  PricingUpdateTicket,
  RoyaltyUpdateTicket,
  TitleMediaUpdateTicket,
  TitleDistributionUpdateTicket,
  Title,
} from '../../interfaces/Titles';
import { format } from 'date-fns';

type TicketType =
  | TitleUpdateTicket
  | TitlePrintingUpdateTicket
  | PricingUpdateTicket
  | RoyaltyUpdateTicket
  | TitleMediaUpdateTicket
  | TitleDistributionUpdateTicket;

interface TicketDialogData {
  ticket: TicketType;
  ticketType:
    | 'title'
    | 'printing'
    | 'pricing'
    | 'royalty'
    | 'media'
    | 'distribution';
}

interface ChangeField {
  label: string;
  oldValue: string | number | boolean | null | undefined;
  newValue: string | number | boolean | null | undefined;
}

@Component({
  selector: 'app-view-ticket-dialog',
  imports: [
    SharedModule,
    MatDialogContent,
    MatDialogActions,
    MatDialogTitle,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
  ],
  templateUrl: './view-ticket-dialog.html',
  styleUrl: './view-ticket-dialog.css',
})
export class ViewTicketDialog implements OnInit {
  readonly dialogRef = inject<MatDialogRef<ViewTicketDialog>>(MatDialogRef);
  readonly data = inject<TicketDialogData>(MAT_DIALOG_DATA);
  private translateService = inject(TranslateService);

  changes: ChangeField[] = [];
  title: Title | undefined;

  ngOnInit(): void {
    this.title = (this.data.ticket as any).title;
    this.processChanges();
  }

  private processChanges(): void {
    switch (this.data.ticketType) {
      case 'title':
        this.processTitleChanges(this.data.ticket as TitleUpdateTicket);
        break;
      case 'printing':
        this.processPrintingChanges(
          this.data.ticket as TitlePrintingUpdateTicket
        );
        break;
      case 'pricing':
        this.processPricingChanges(this.data.ticket as PricingUpdateTicket);
        break;
      case 'royalty':
        this.processRoyaltyChanges(this.data.ticket as RoyaltyUpdateTicket);
        break;
      case 'media':
        this.processMediaChanges(this.data.ticket as TitleMediaUpdateTicket);
        break;
      case 'distribution':
        this.processDistributionChanges(
          this.data.ticket as TitleDistributionUpdateTicket
        );
        break;
    }
  }

  private processTitleChanges(ticket: TitleUpdateTicket): void {
    if (!this.title) return;

    const fields: ChangeField[] = [];

    if (ticket.name !== undefined) {
      fields.push({
        label: this.translateService.instant('name') || 'Name',
        oldValue: this.title.name,
        newValue: ticket.name,
      });
    }

    if (ticket.subTitle !== undefined) {
      fields.push({
        label: this.translateService.instant('subtitle') || 'Subtitle',
        oldValue: this.title.subTitle,
        newValue: ticket.subTitle,
      });
    }

    if (ticket.isbnPrint !== undefined) {
      fields.push({
        label: this.translateService.instant('isbnprint') || 'ISBN Print',
        oldValue: this.title.isbnPrint,
        newValue: ticket.isbnPrint,
      });
    }

    if (ticket.isbnEbook !== undefined) {
      fields.push({
        label: this.translateService.instant('isbnebook') || 'ISBN Ebook',
        oldValue: this.title.isbnEbook,
        newValue: ticket.isbnEbook,
      });
    }

    if (ticket.subject !== undefined) {
      fields.push({
        label: this.translateService.instant('subject') || 'Subject',
        oldValue: this.title.subject,
        newValue: ticket.subject,
      });
    }

    if (ticket.language !== undefined) {
      fields.push({
        label: this.translateService.instant('language') || 'Language',
        oldValue: this.title.language,
        newValue: ticket.language,
      });
    }

    if (ticket.longDescription !== undefined) {
      fields.push({
        label:
          this.translateService.instant('longdescription') ||
          'Long Description',
        oldValue: this.title.longDescription,
        newValue: ticket.longDescription,
      });
    }

    if (ticket.shortDescription !== undefined) {
      fields.push({
        label:
          this.translateService.instant('shortdescription') ||
          'Short Description',
        oldValue: this.title.shortDescription,
        newValue: ticket.shortDescription,
      });
    }

    if (ticket.edition !== undefined) {
      fields.push({
        label: this.translateService.instant('edition') || 'Edition',
        oldValue: this.title.edition,
        newValue: ticket.edition,
      });
    }

    if (ticket.keywords !== undefined) {
      fields.push({
        label: this.translateService.instant('keywords') || 'Keywords',
        oldValue: this.title.keywords,
        newValue: ticket.keywords,
      });
    }

    if (ticket.printingOnly !== undefined) {
      fields.push({
        label: this.translateService.instant('printingonly') || 'Printing Only',
        oldValue: this.title.printingOnly,
        newValue: ticket.printingOnly,
      });
    }

    if (ticket.publishingType !== undefined) {
      fields.push({
        label:
          this.translateService.instant('publishingtype') || 'Publishing Type',
        oldValue: this.title.publishingType,
        newValue: ticket.publishingType,
      });
    }

    if (ticket.categoryId !== undefined) {
      fields.push({
        label: this.translateService.instant('category') || 'Category',
        oldValue: this.title.category?.name,
        newValue: ticket.categoryId,
      });
    }

    if (ticket.subCategoryId !== undefined) {
      fields.push({
        label: this.translateService.instant('subcategory') || 'Subcategory',
        oldValue: this.title.subCategory?.name,
        newValue: ticket.subCategoryId,
      });
    }

    if (ticket.tradeCategoryId !== undefined) {
      fields.push({
        label:
          this.translateService.instant('tradecategory') || 'Trade Category',
        oldValue: this.title.tradeCategory?.name,
        newValue: ticket.tradeCategoryId,
      });
    }

    if (ticket.genreId !== undefined) {
      fields.push({
        label: this.translateService.instant('genre') || 'Genre',
        oldValue: this.title.genre?.name,
        newValue: ticket.genreId,
      });
    }

    if (
      ticket.authorIds &&
      Array.isArray(ticket.authorIds) &&
      ticket.authorIds.length > 0
    ) {
      const oldAuthors = this.title.authors
        ?.map((a) => a.author?.user?.fullName || a.author?.username)
        .join(', ');
      const newAuthors = ticket.authorIds
        .map((a: any) => a.displayName || a.name || a)
        .join(', ');
      fields.push({
        label: this.translateService.instant('authors') || 'Authors',
        oldValue: oldAuthors,
        newValue: newAuthors,
      });
    }

    this.changes = fields;
  }

  private processPrintingChanges(ticket: TitlePrintingUpdateTicket): void {
    if (!this.title?.printing?.[0]) return;

    const printing = this.title.printing[0];
    const fields: ChangeField[] = [];

    if (ticket.bindingTypeId !== undefined) {
      fields.push({
        label: this.translateService.instant('bindingtype') || 'Binding Type',
        oldValue: printing.bindingType?.name,
        newValue: ticket.bindingTypeId,
      });
    }

    if (ticket.colorPages !== undefined) {
      fields.push({
        label: this.translateService.instant('colorpages') || 'Color Pages',
        oldValue: printing.colorPages,
        newValue: ticket.colorPages,
      });
    }

    if (ticket.isColorPagesRandom !== undefined) {
      fields.push({
        label:
          this.translateService.instant('colorpagesrandom') ||
          'Color Pages Random',
        oldValue: printing.isColorPagesRandom,
        newValue: ticket.isColorPagesRandom,
      });
    }

    if (ticket.insideCover !== undefined) {
      fields.push({
        label: this.translateService.instant('insidecover') || 'Inside Cover',
        oldValue: printing.insideCover,
        newValue: ticket.insideCover,
      });
    }

    if (ticket.laminationTypeId !== undefined) {
      fields.push({
        label:
          this.translateService.instant('laminationtype') || 'Lamination Type',
        oldValue: printing.laminationType?.name,
        newValue: ticket.laminationTypeId,
      });
    }

    if (ticket.paperType !== undefined) {
      fields.push({
        label: this.translateService.instant('papertype') || 'Paper Type',
        oldValue: printing.paperType,
        newValue: ticket.paperType,
      });
    }

    if (ticket.paperQuailtyId !== undefined) {
      fields.push({
        label: this.translateService.instant('paperquality') || 'Paper Quality',
        oldValue: printing.paperQuailty?.name,
        newValue: ticket.paperQuailtyId,
      });
    }

    if (ticket.sizeCategoryId !== undefined) {
      fields.push({
        label: this.translateService.instant('sizecategory') || 'Size Category',
        oldValue: printing.sizeCategory?.size,
        newValue: ticket.sizeCategoryId,
      });
    }

    if (ticket.customPrintCost !== undefined) {
      fields.push({
        label:
          this.translateService.instant('customprintcost') ||
          'Custom Print Cost',
        oldValue: printing.customPrintCost,
        newValue: ticket.customPrintCost,
      });
    }

    if (ticket.customDeliveryCharges !== undefined) {
      fields.push({
        label:
          this.translateService.instant('customdeliverycharges') ||
          'Custom Delivery Charges',
        oldValue: printing.customDeliveryCharges,
        newValue: ticket.customDeliveryCharges,
      });
    }

    this.changes = fields;
  }

  private processPricingChanges(ticket: PricingUpdateTicket): void {
    // Pricing changes are complex - show platform-by-platform comparison
    this.changes = [];
    // This will be handled in the template with a special section
  }

  private processRoyaltyChanges(ticket: RoyaltyUpdateTicket): void {
    // Royalty changes are complex - show royalty-by-royalty comparison
    this.changes = [];
    // This will be handled in the template with a special section
  }

  private processMediaChanges(ticket: TitleMediaUpdateTicket): void {
    const fields: ChangeField[] = [];

    fields.push({
      label: this.translateService.instant('name') || 'Name',
      oldValue: null,
      newValue: ticket.name,
    });

    fields.push({
      label: this.translateService.instant('type') || 'Type',
      oldValue: null,
      newValue: ticket.type,
    });

    fields.push({
      label: this.translateService.instant('noofpages') || 'No. of Pages',
      oldValue: null,
      newValue: ticket.noOfPages,
    });

    this.changes = fields;
  }

  private processDistributionChanges(
    ticket: TitleDistributionUpdateTicket
  ): void {
    const oldDistributions = this.title?.distribution
      ?.map((d) => d.type)
      .join(', ');
    const newDistributions = ticket.distributions?.join(', ');

    this.changes = [
      {
        label:
          this.translateService.instant('distributions') || 'Distributions',
        oldValue: oldDistributions || 'N/A',
        newValue: newDistributions || 'N/A',
      },
    ];
  }

  formatValue(value: any): string {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  }

  hasChanges(): boolean {
    return this.changes.length > 0;
  }

  onClose(): void {
    this.dialogRef.close();
  }

  getTicketInfo(): {
    title: string;
    publisher: string;
    requestedBy: string;
    createdAt: string;
    status: string;
  } {
    const ticket = this.data.ticket as any;
    return {
      title: ticket.title?.name || 'N/A',
      publisher:
        ticket.title?.publisher?.name ||
        ticket.title?.publisherDisplay ||
        'N/A',
      requestedBy:
        ticket.user?.firstName && ticket.user?.lastName
          ? `${ticket.user.firstName} ${ticket.user.lastName}`
          : ticket.user?.email || 'N/A',
      createdAt: ticket.createdAt
        ? format(new Date(ticket.createdAt), 'dd-MM-yyyy HH:mm')
        : 'N/A',
      status: ticket.status,
    };
  }

  getPricingData(): any[] | null {
    if (this.data.ticketType === 'pricing') {
      return (this.data.ticket as any).data || null;
    }
    return null;
  }

  getRoyaltyData(): any[] | null {
    if (this.data.ticketType === 'royalty') {
      return (this.data.ticket as any).data || null;
    }
    return null;
  }
}
