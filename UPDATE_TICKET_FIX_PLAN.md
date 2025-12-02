# Update Ticket Fix Plan - Publisher Creating Tickets for Authors/Sub-Publishers

## Current Problem

When a publisher creates an update ticket for an author or sub-publisher:
- ADDRESS tickets: Tries to find address from logged-in user instead of target entity
- BANK tickets: Tries to find bank details from logged-in user instead of target entity
- AUTHOR tickets: Works but needs authorId to be passed
- PUBLISHER tickets: Works but needs publisherId to be passed

## Root Cause

The `create` method in `update-ticket.service.ts` assumes the ticket is for the logged-in user:
```typescript
const addressId = (user?.auther?.address[0] || user?.publisher?.address[0])?.id;
const bankDetailsId = (user?.auther?.bankDetails[0] || user?.publisher?.bankDetails[0])?.id;
```

This fails when:
- Publisher creates ADDRESS ticket for an author
- Publisher creates BANK ticket for an author
- Publisher creates ADDRESS ticket for a sub-publisher
- Publisher creates BANK ticket for a sub-publisher

## Schema Analysis

```prisma
model UpdateTicket {
  id                    Int                @id
  type                  UpdateTicketType
  authorToUpdate        Auther?            @relation(fields: [authorToUpdateId])
  authorToUpdateId      Int?
  publisherToUpdate     Publisher?         @relation(fields: [publisherToUpdateId])
  publisherToUpdateId   Int?
  bankDetailsToUpdate   BankDetails?       @relation(fields: [bankDetailsToUpdateId])
  bankDetailsToUpdateId Int?
  addressToUpdate       Address?           @relation(fields: [addressToUpdateId])
  addressToUpdateId     Int?
  data                  Json
  requestedBy           User               @relation(fields: [requestedById])
  requestedById         Int
}

model Address {
  autherId     Int?
  publisherId  Int?
}

model BankDetails {
  autherId     Int?
  publisherId  Int?
}
```

## Solution Design

### 1. Add Target Entity IDs to DTO

Add optional fields to `CreateUpdateTicketDto`:
- `targetAuthorId?: number` - For ADDRESS/BANK/AUTHOR tickets targeting an author
- `targetPublisherId?: number` - For ADDRESS/BANK/PUBLISHER tickets targeting a publisher

### 2. Update Backend Logic

**For ADDRESS tickets:**
1. If `targetAuthorId` provided → Find author's address
2. If `targetPublisherId` provided → Find publisher's address
3. Otherwise → Find logged-in user's address (current behavior)

**For BANK tickets:**
1. If `targetAuthorId` provided → Find author's bank details
2. If `targetPublisherId` provided → Find publisher's bank details
3. Otherwise → Find logged-in user's bank details (current behavior)

**For AUTHOR tickets:**
1. If `targetAuthorId` provided → Use it
2. If `authorId` provided (existing) → Use it
3. Otherwise → Find logged-in user's author (current behavior)

**For PUBLISHER tickets:**
1. If `targetPublisherId` provided → Use it
2. If `publisherId` provided (existing) → Use it
3. Otherwise → Find logged-in user's publisher (current behavior)

### 3. Update Frontend Logic

**In `add-author.ts` when creating tickets:**
- For ADDRESS tickets → Add `targetAuthorId: this.authorId`
- For BANK tickets → Add `targetAuthorId: this.authorId`
- For AUTHOR tickets → Add `authorId: this.authorId` (already done)

**In `add-publisher.ts` when creating tickets:**
- For ADDRESS tickets → Add `targetPublisherId: this.publisherId`
- For BANK tickets → Add `targetPublisherId: this.publisherId`
- For PUBLISHER tickets → Add `publisherId: this.publisherId` (already done)

## Implementation Steps

### Step 1: Update DTO ✅ (Already done)
- Added `authorId` and `publisherId` fields
- Need to add `targetAuthorId` and `targetPublisherId`

### Step 2: Update Backend Service
- Modify ADDRESS ticket creation to use `targetAuthorId` or `targetPublisherId`
- Modify BANK ticket creation to use `targetAuthorId` or `targetPublisherId`
- Keep fallback to logged-in user for backward compatibility

### Step 3: Update Frontend - add-author.ts
- Pass `targetAuthorId` for ADDRESS and BANK tickets
- Already passing `authorId` for AUTHOR tickets

### Step 4: Update Frontend - add-publisher.ts
- Pass `targetPublisherId` for ADDRESS and BANK tickets
- Already passing `publisherId` for PUBLISHER tickets

## Permission Rules (Keep Existing)

- Publisher can create tickets for their authors (check via publisher-author relationship)
- Publisher can create tickets for their sub-publishers (check via ancestors)
- Author can create tickets for themselves
- Publisher can create tickets for themselves
- Superadmin can create tickets for anyone

## Testing Scenarios

1. **Publisher creates ADDRESS ticket for author** → Should find author's address
2. **Publisher creates BANK ticket for author** → Should find author's bank details
3. **Publisher creates AUTHOR ticket for author** → Should use authorId
4. **Publisher creates ADDRESS ticket for sub-publisher** → Should find sub-publisher's address
5. **Publisher creates BANK ticket for sub-publisher** → Should find sub-publisher's bank details
6. **Publisher creates PUBLISHER ticket for sub-publisher** → Should use publisherId
7. **Author creates tickets for themselves** → Should work as before
8. **Publisher creates tickets for themselves** → Should work as before

## Files to Modify

### Backend:
1. `my-authers-hub/src/update-ticket/dto/create-update-ticket.dto.ts` - Add targetAuthorId, targetPublisherId
2. `my-authers-hub/src/update-ticket/update-ticket.service.ts` - Update create method logic

### Frontend:
1. `My-Authers-Hub-Admin/src/app/pages/add-author/add-author.ts` - Pass targetAuthorId
2. `My-Authers-Hub-Admin/src/app/pages/add-publisher/add-publisher.ts` - Pass targetPublisherId
3. `My-Authers-Hub-Admin/src/app/interfaces/user.ts` - Update UpdateUserWithTicket interface

## Notes

- Don't change how tickets are approved (that logic is correct)
- Don't change permission checking (that logic is correct)
- Only fix how we find the target entity's address/bank details
- Maintain backward compatibility for self-tickets

