import { CommonModule } from '@angular/common';
import { Component, computed, Inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { UpdateTicketType } from '../../interfaces';

interface FieldChange {
  field: string;
  label: string;
  before: string;
  after: string;
}

interface TicketDetailsDialogData {
  ticket: any;
  requestedBy: string;
  createdAt: string;
  status: string;
  changesList: string[];
  onApprove?: (ticket: any) => Promise<void>;
  onReject?: (ticket: any) => Promise<void>;
  isSuperAdmin?: boolean;
}

@Component({
  selector: 'app-ticket-details-dialog',
  imports: [MatButtonModule, CommonModule, MatIconModule],
  templateUrl: './ticket-details-dialog.html',
  styleUrl: './ticket-details-dialog.css',
})
export class TicketDetailsDialog {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: TicketDetailsDialogData,
    private dialogRef: MatDialogRef<TicketDetailsDialog>
  ) {
    this.processChanges();
  }

  changes = signal<FieldChange[]>([]);
  isApproving = signal(false);
  isRejecting = signal(false);
  
  // Computed values for display
  ticketType = computed(() => this.data?.ticket?.type || 'N/A');
  ticketStatus = computed(() => this.data?.ticket?.status || 'N/A');
  requestedBy = computed(() => this.data?.requestedBy || 'N/A');
  createdAt = computed(() => this.data?.createdAt || 'N/A');
  isSuperAdmin = computed(() => this.data?.isSuperAdmin || false);
  isPending = computed(() => this.ticketStatus() === 'PENDING');
  approvedBy = computed(() => {
    const approvedBy = this.data?.ticket?.approvedBy;
    if (!approvedBy) return null;
    return approvedBy.firstName && approvedBy.lastName
      ? `${approvedBy.firstName} ${approvedBy.lastName}`
      : approvedBy.email || 'N/A';
  });
  approvedAt = computed(() => {
    const approvedAt = this.data?.ticket?.approvedAt;
    return approvedAt ? new Date(approvedAt).toLocaleString() : null;
  });

  /**
   * Process changes to show before/after comparison
   */
  private processChanges(): void {
    const ticket = this.data?.ticket;
    if (!ticket) return;

    const ticketData = ticket.data || {};
    const changes: FieldChange[] = [];

    switch (ticket.type) {
      case UpdateTicketType.ADDRESS:
        this.processAddressChanges(ticketData, ticket.addressToUpdate, changes);
        break;
      case UpdateTicketType.BANK:
        this.processBankChanges(ticketData, ticket.bankDetailsToUpdate, changes);
        break;
      case UpdateTicketType.AUTHOR:
        this.processAuthorChanges(ticketData, ticket.authorToUpdate, changes);
        break;
      case UpdateTicketType.PUBLISHER:
        this.processPublisherChanges(ticketData, ticket.publisherToUpdate, changes);
        break;
    }

    this.changes.set(changes);
  }

  private processAddressChanges(
    ticketData: any,
    existingAddress: any,
    changes: FieldChange[]
  ): void {
    if (ticketData.address) {
      changes.push({
        field: 'address',
        label: 'Address',
        before: existingAddress?.address || 'N/A',
        after: ticketData.address,
      });
    }
    if (ticketData.city) {
      changes.push({
        field: 'city',
        label: 'City',
        before: existingAddress?.city || 'N/A',
        after: ticketData.city,
      });
    }
    if (ticketData.state) {
      changes.push({
        field: 'state',
        label: 'State',
        before: existingAddress?.state || 'N/A',
        after: ticketData.state,
      });
    }
    if (ticketData.country) {
      changes.push({
        field: 'country',
        label: 'Country',
        before: existingAddress?.country || 'N/A',
        after: ticketData.country,
      });
    }
    if (ticketData.pincode) {
      changes.push({
        field: 'pincode',
        label: 'Pincode',
        before: existingAddress?.pincode || 'N/A',
        after: ticketData.pincode,
      });
    }
  }

  private processBankChanges(
    ticketData: any,
    existingBank: any,
    changes: FieldChange[]
  ): void {
    if (ticketData.bankName) {
      changes.push({
        field: 'bankName',
        label: 'Bank Name',
        before: existingBank?.name || 'N/A',
        after: ticketData.bankName,
      });
    }
    if (ticketData.accountHolderName) {
      changes.push({
        field: 'accountHolderName',
        label: 'Account Holder Name',
        before: existingBank?.accountHolderName || 'N/A',
        after: ticketData.accountHolderName,
      });
    }
    if (ticketData.accountNo) {
      changes.push({
        field: 'accountNo',
        label: 'Account Number',
        before: existingBank?.accountNo || 'N/A',
        after: ticketData.accountNo,
      });
    }
    if (ticketData.ifsc) {
      changes.push({
        field: 'ifsc',
        label: 'IFSC Code',
        before: existingBank?.ifsc || 'N/A',
        after: ticketData.ifsc,
      });
    }
    if (ticketData.panCardNo) {
      changes.push({
        field: 'panCardNo',
        label: 'PAN Card Number',
        before: existingBank?.panCardNo || 'N/A',
        after: ticketData.panCardNo,
      });
    }
    if (ticketData.accountType) {
      changes.push({
        field: 'accountType',
        label: 'Account Type',
        before: existingBank?.accountType || 'N/A',
        after: ticketData.accountType,
      });
    }
    if (ticketData.gstNumber) {
      changes.push({
        field: 'gstNumber',
        label: 'GST Number',
        before: existingBank?.gstNumber || 'N/A',
        after: ticketData.gstNumber,
      });
    }
  }

  private processAuthorChanges(
    ticketData: any,
    existingAuthor: any,
    changes: FieldChange[]
  ): void {
    // Backend stores with 'author' prefix
    if (ticketData.authorName) {
      const existingName = existingAuthor?.user
        ? `${existingAuthor.user.firstName || ''} ${existingAuthor.user.lastName || ''}`.trim()
        : 'N/A';
      changes.push({
        field: 'authorName',
        label: 'Name',
        before: existingName,
        after: ticketData.authorName,
      });
    }
    if (ticketData.authorEmail) {
      changes.push({
        field: 'authorEmail',
        label: 'Email',
        before: existingAuthor?.user?.email || 'N/A',
        after: ticketData.authorEmail,
      });
    }
    if (ticketData.authorContactNumber) {
      changes.push({
        field: 'authorContactNumber',
        label: 'Phone Number',
        before: existingAuthor?.user?.phoneNumber || 'N/A',
        after: ticketData.authorContactNumber,
      });
    }
    if (ticketData.authorAbout) {
      changes.push({
        field: 'authorAbout',
        label: 'About',
        before: existingAuthor?.about || 'N/A',
        after: ticketData.authorAbout,
      });
    }
    if (ticketData.authorUsername) {
      changes.push({
        field: 'authorUsername',
        label: 'Username',
        before: existingAuthor?.username || 'N/A',
        after: ticketData.authorUsername,
      });
    }
  }

  private processPublisherChanges(
    ticketData: any,
    existingPublisher: any,
    changes: FieldChange[]
  ): void {
    // Backend stores with 'publisher' prefix
    if (ticketData.publisherName) {
      changes.push({
        field: 'publisherName',
        label: 'Publisher Name',
        before: existingPublisher?.name || 'N/A',
        after: ticketData.publisherName,
      });
    }
    if (ticketData.publisherEmail) {
      changes.push({
        field: 'publisherEmail',
        label: 'Email',
        before: existingPublisher?.email || 'N/A',
        after: ticketData.publisherEmail,
      });
    }
    if (ticketData.publisherDesignation) {
      changes.push({
        field: 'publisherDesignation',
        label: 'Designation',
        before: existingPublisher?.designation || 'N/A',
        after: ticketData.publisherDesignation,
      });
    }
    if (ticketData.publisherPocName) {
      changes.push({
        field: 'publisherPocName',
        label: 'POC Name',
        before: existingPublisher?.user?.firstName && existingPublisher?.user?.lastName
          ? `${existingPublisher.user.firstName} ${existingPublisher.user.lastName}`
          : 'N/A',
        after: ticketData.publisherPocName,
      });
    }
    if (ticketData.publisherPocEmail) {
      changes.push({
        field: 'publisherPocEmail',
        label: 'POC Email',
        before: existingPublisher?.user?.email || 'N/A',
        after: ticketData.publisherPocEmail,
      });
    }
    if (ticketData.publisherPocPhoneNumber) {
      changes.push({
        field: 'publisherPocPhoneNumber',
        label: 'POC Phone',
        before: existingPublisher?.user?.phoneNumber || 'N/A',
        after: ticketData.publisherPocPhoneNumber,
      });
    }
  }

  async onApprove(): Promise<void> {
    if (this.data?.onApprove && this.data?.ticket) {
      this.isApproving.set(true);
      try {
        await this.data.onApprove(this.data.ticket);
        this.dialogRef.close();
      } catch (error) {
        console.error('Error approving ticket:', error);
      } finally {
        this.isApproving.set(false);
      }
    }
  }

  async onReject(): Promise<void> {
    if (this.data?.onReject && this.data?.ticket) {
      this.isRejecting.set(true);
      try {
        await this.data.onReject(this.data.ticket);
        this.dialogRef.close();
      } catch (error) {
        console.error('Error rejecting ticket:', error);
      } finally {
        this.isRejecting.set(false);
      }
    }
  }

  close() {
    this.dialogRef.close();
  }
}
