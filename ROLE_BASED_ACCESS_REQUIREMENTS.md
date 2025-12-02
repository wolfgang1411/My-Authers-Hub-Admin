# Role-Based Access Control Requirements
## Authors & Publisher Listing Pages

## Current Issues Identified

### Authors Listing Page (`authors.html`)
1. **Edit Button**: Currently visible to all users regardless of role
2. **Raise Ticket Button**: Currently visible to all users for Active authors
3. **Approve/Reject Buttons**: Currently visible to all users for Pending authors
4. **Missing Role-Based Logic**: No distinction between SUPERADMIN and PUBLISHER access

### Publisher Listing Page (`publisher.html`)
1. **Edit Button**: Currently visible to all users regardless of role
2. **Raise Ticket Button**: Only shown to non-SUPERADMIN for Active publishers (partially correct)
3. **Approve/Reject Buttons**: Only shown to SUPERADMIN (correct)
4. **Deactivate Button**: Only shown to SUPERADMIN (correct)

---

## Required Functionality by Role

### SUPERADMIN Access

#### Authors Listing Page
**Visible Buttons:**
- ✅ **View** (visibility icon) - Always visible
- ✅ **Edit** - Always visible (can edit directly without raising ticket)
- ✅ **Reset Password** - Always visible (except for Rejected authors)
- ✅ **Deactivate** - Visible for Active/Pending authors (not Deactivated/Rejected)
- ✅ **Activate** - Visible for Deactivated authors
- ✅ **Approve** - Visible for Pending authors
- ✅ **Reject** - Visible for Pending authors
- ❌ **Raise Ticket** - NOT visible (superadmin can edit directly)

**Actions:**
- Can create new authors
- Can invite authors
- Can edit author details directly (no ticket required)
- Can approve/reject pending authors
- Can deactivate/activate authors
- Can reset passwords

#### Publisher Listing Page
**Visible Buttons:**
- ✅ **View** (visibility icon) - Always visible
- ✅ **Edit** - Always visible (can edit directly without raising ticket)
- ✅ **Reset Password** - Always visible
- ✅ **Deactivate** - Visible for Active/Pending publishers (not Deactivated)
- ✅ **Activate** - Visible for Deactivated publishers
- ✅ **Approve** - Visible for Pending publishers (opens distribution dialog)
- ✅ **Reject** - Visible for Pending publishers
- ❌ **Raise Ticket** - NOT visible (superadmin can edit directly)

**Actions:**
- Can create new publishers
- Can invite publishers
- Can edit publisher details directly (no ticket required)
- Can approve/reject pending publishers
- Can deactivate/activate publishers
- Can reset passwords

---

### PUBLISHER Access

#### Authors Listing Page
**Visible Buttons:**
- ✅ **View** (visibility icon) - Always visible
- ✅ **Edit** - Visible for Pending authors (can edit before approval)
- ❌ **Edit** - NOT visible for Active authors (must raise ticket)
- ✅ **Raise Ticket** - Visible for Active authors (to update details)
- ✅ **Reset Password** - Visible (except for Rejected authors)
- ✅ **Deactivate** - Visible for Active/Pending authors (not Deactivated/Rejected)
- ✅ **Activate** - Visible for Deactivated authors
- ✅ **Approve** - Visible for Pending authors (publisher can approve authors)
- ✅ **Reject** - Visible for Pending authors

**Actions:**
- Can create new authors
- Can invite authors
- Can edit Pending authors directly (before approval)
- **Cannot edit Active authors directly** - must raise ticket to update
- Can approve/reject pending authors
- Can deactivate/activate authors
- Can reset passwords

**Key Rule:** Once an author is approved (Active), publisher must raise a ticket to update their details.

#### Publisher Listing Page
**Visible Buttons:**
- ✅ **View** (visibility icon) - Always visible (for sub-publishers)
- ✅ **Edit** - Visible for Pending sub-publishers (can edit before approval)
- ❌ **Edit** - NOT visible for Active sub-publishers (must raise ticket)
- ✅ **Raise Ticket** - Visible for Active sub-publishers (to update details)
- ✅ **Reset Password** - Visible
- ✅ **Deactivate** - Visible for Active/Pending sub-publishers (not Deactivated)
- ✅ **Activate** - Visible for Deactivated sub-publishers
- ❌ **Approve** - NOT visible (only superadmin can approve publishers)
- ❌ **Reject** - NOT visible (only superadmin can reject publishers)

**Actions:**
- Can create new sub-publishers
- Can invite sub-publishers
- Can edit Pending sub-publishers directly (before approval)
- **Cannot edit Active sub-publishers directly** - must raise ticket to update
- Can deactivate/activate sub-publishers
- Can reset passwords
- **Cannot approve/reject publishers** (only superadmin can do this)

**Key Rules:**
1. Publisher can only see/manage their sub-publishers (hierarchy-based)
2. Once a sub-publisher is approved (Active), publisher must raise a ticket to update their details
3. Only superadmin can approve/reject publishers

---

## Status-Based Button Visibility Logic

### Author Status Flow
```
Pending → (Approve) → Active → (Raise Ticket to Update) → Updated via Ticket
Pending → (Reject) → Rejected
Active → (Deactivate) → Deactivated → (Activate) → Active
```

### Publisher Status Flow
```
Pending → (Superadmin Approve) → Active → (Raise Ticket to Update) → Updated via Ticket
Pending → (Superadmin Reject) → Rejected
Active → (Deactivate) → Deactivated → (Activate) → Active
```

---

## Implementation Checklist

### Authors Listing Page (`authors.html` & `authors.ts`)

#### For SUPERADMIN:
- [ ] Show Edit button for ALL statuses (Pending, Active, Deactivated)
- [ ] Hide Raise Ticket button completely
- [ ] Show Approve/Reject buttons for Pending authors
- [ ] Show Deactivate button for Active/Pending authors
- [ ] Show Activate button for Deactivated authors

#### For PUBLISHER:
- [ ] Show Edit button ONLY for Pending authors
- [ ] Hide Edit button for Active authors
- [ ] Show Raise Ticket button for Active authors
- [ ] Show Approve/Reject buttons for Pending authors
- [ ] Show Deactivate button for Active/Pending authors
- [ ] Show Activate button for Deactivated authors

### Publisher Listing Page (`publisher.html` & `publisher.ts`)

#### For SUPERADMIN:
- [ ] Show Edit button for ALL statuses (Pending, Active, Deactivated)
- [ ] Hide Raise Ticket button completely
- [ ] Show Approve/Reject buttons for Pending publishers
- [ ] Show Deactivate button for Active/Pending publishers
- [ ] Show Activate button for Deactivated publishers

#### For PUBLISHER:
- [ ] Show Edit button ONLY for Pending sub-publishers
- [ ] Hide Edit button for Active sub-publishers
- [ ] Show Raise Ticket button for Active sub-publishers
- [ ] Hide Approve/Reject buttons (only superadmin can approve/reject)
- [ ] Show Deactivate button for Active/Pending sub-publishers
- [ ] Show Activate button for Deactivated sub-publishers

---

## Code Changes Required

### 1. Authors Listing Template (`authors.html`)
**Current Issue (Line 124-131):**
```html
<button
  class="!bg-primary"
  mat-icon-button
  [title]="'edit' | translate"
  [routerLink]="['/author', element.id]"
>
  <mat-icon class="!text-white">edit</mat-icon>
</button>
```
**Fix:** Add role and status-based conditions

**Current Issue (Line 178-187):**
```html
@if(element.status === AuthorStatus.Active) {
  <button
    class="!bg-primary"
    mat-icon-button
    [routerLink]="['/author', element.id]"
    [title]="'raiseaticket' | translate"
  >
    <mat-icon class="!text-white">support_agent</mat-icon>
  </button>
}
```
**Fix:** Only show for PUBLISHER role, hide for SUPERADMIN

**Current Issue (Line 151-167):**
```html
@if(element.status === AuthorStatus.Pending) {
  <button ... (click)="approveAuthor(element.id)">...</button>
  <button ... (click)="rejectAuthor(element.id)">...</button>
}
```
**Fix:** Show for both SUPERADMIN and PUBLISHER (publisher can approve authors)

### 2. Publisher Listing Template (`publisher.html`)
**Current Issue (Line 114-121):**
```html
<button
  class="!bg-primary"
  mat-icon-button
  [title]="'edit' | translate"
  [routerLink]="['/publisher', element.id]"
>
  <mat-icon class="!text-white">edit</mat-icon>
</button>
```
**Fix:** Add role and status-based conditions

**Current Issue (Line 131-140):**
```html
@if(element.status === PublisherStatus.Active &&
loggedInUser()?.accessLevel !== 'SUPERADMIN') {
  <button ... [title]="'raiseaticket' | translate">...</button>
}
```
**Fix:** This is correct, but need to ensure Edit button is hidden for Active when PUBLISHER

**Current Issue (Line 151-167):**
```html
@if (loggedInUser()?.accessLevel === 'SUPERADMIN') {
  @if(element.status === PublisherStatus.Pending) {
    <button ... (click)="openDistributionDialog(element.id)">...</button>
    <button ... (click)="rejectPublisher(element.id)">...</button>
  }
}
```
**Fix:** This is correct - only superadmin can approve/reject publishers

---

## Summary of Key Rules

1. **SUPERADMIN:**
   - Can edit both authors and publishers directly (no ticket needed)
   - Can approve/reject both authors and publishers
   - Never sees "Raise Ticket" button

2. **PUBLISHER:**
   - Can edit Pending authors/sub-publishers directly
   - **Cannot edit Active authors/sub-publishers directly** - must raise ticket
   - Can approve/reject authors (but NOT publishers)
   - Can deactivate both authors and sub-publishers
   - Can create both authors and sub-publishers

3. **Status-Based Logic:**
   - **Pending**: Can be edited directly by both roles
   - **Active**: 
     - SUPERADMIN: Can edit directly
     - PUBLISHER: Must raise ticket to update
   - **Deactivated**: Can be activated by both roles
   - **Rejected**: Limited actions available

---

## Testing Scenarios

### Test Case 1: SUPERADMIN - Author Listing
1. Login as SUPERADMIN
2. Navigate to Authors listing
3. **Verify:** Edit button visible for all statuses
4. **Verify:** Raise Ticket button NOT visible
5. **Verify:** Approve/Reject visible for Pending authors
6. **Verify:** Deactivate visible for Active authors

### Test Case 2: PUBLISHER - Author Listing
1. Login as PUBLISHER
2. Navigate to Authors listing
3. **Verify:** Edit button visible ONLY for Pending authors
4. **Verify:** Edit button NOT visible for Active authors
5. **Verify:** Raise Ticket button visible for Active authors
6. **Verify:** Approve/Reject visible for Pending authors
7. **Verify:** Deactivate visible for Active authors

### Test Case 3: SUPERADMIN - Publisher Listing
1. Login as SUPERADMIN
2. Navigate to Publisher listing
3. **Verify:** Edit button visible for all statuses
4. **Verify:** Raise Ticket button NOT visible
5. **Verify:** Approve/Reject visible for Pending publishers
6. **Verify:** Deactivate visible for Active publishers

### Test Case 4: PUBLISHER - Publisher Listing
1. Login as PUBLISHER
2. Navigate to Publisher listing
3. **Verify:** Edit button visible ONLY for Pending sub-publishers
4. **Verify:** Edit button NOT visible for Active sub-publishers
5. **Verify:** Raise Ticket button visible for Active sub-publishers
6. **Verify:** Approve/Reject buttons NOT visible (superadmin only)
7. **Verify:** Deactivate visible for Active sub-publishers

---

## Notes

- The "Raise Ticket" functionality should navigate to the edit page with a flag indicating it's a ticket request
- The edit page should handle the ticket creation logic when accessed via "Raise Ticket" button
- Publisher can only see/manage their sub-publishers (hierarchy-based filtering already implemented in `fetchPublishers`)
- All role checks should use `loggedInUser()?.accessLevel === 'SUPERADMIN'` or `loggedInUser()?.accessLevel === 'PUBLISHER'`


