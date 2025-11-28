# Printing Settings Manager - Redesign Plan

## Overview
Complete redesign of printing settings management interface where superadmin can manage all printing-related entities organized by SizeCategory. Everything is linked to SizeCategory with full CRUD operations.

## Architecture

### Component Hierarchy
```
PrintingSettingsManager (Main Container)
├── SizeCategoryList (Accordion/Expansion Panel View)
│   ├── SizeCategoryCard (Each Category)
│   │   ├── SizeCategoryHeader (Name, Category Type, Actions)
│   │   ├── SizeCategoryDetails (Edit Category Info)
│   │   ├── SizeManager (Manage Sizes)
│   │   ├── BindingTypeManager (Manage Binding Types)
│   │   ├── LaminationTypeManager (Manage Lamination Types)
│   │   └── PaperQualityManager (Manage Paper Qualities)
│   └── AddSizeCategoryButton
└── MarginPercentManager (Global Setting)
```

## Component Structure

### 1. PrintingSettingsManager (Main Component)
**Purpose**: Container component that manages all printing settings
**Location**: `admin/src/app/components/printing-settings-manager/`

**Features**:
- Fetches all size categories with relations
- Manages global state using signals
- Handles add/edit/delete operations
- Only visible to SUPERADMIN

**Signals**:
```typescript
sizeCategories = signal<SizeCategory[]>([]);
selectedCategoryId = signal<number | null>(null);
marginPercent = signal<number | null>(null);
loading = signal<boolean>(false);
```

**Computed**:
```typescript
selectedCategory = computed(() => 
  this.sizeCategories().find(c => c.id === this.selectedCategoryId())
);
```

### 2. SizeCategoryCard Component
**Purpose**: Displays and manages a single size category with all its related entities
**Location**: `admin/src/app/components/printing-settings-manager/size-category-card/`

**Features**:
- Expandable/collapsible card
- Edit category details inline or in dialog
- Tabs/sections for each entity type
- Add buttons for each entity type

**Signals**:
```typescript
category = input.required<SizeCategory>();
isExpanded = signal<boolean>(false);
isEditing = signal<boolean>(false);
```

### 3. SizeManager Component
**Purpose**: Manage sizes within a size category
**Location**: `admin/src/app/components/printing-settings-manager/size-manager/`

**Features**:
- List of sizes for the category
- Add new size (with sizeCategoryId pre-filled)
- Edit existing size
- Delete size (soft delete)
- Table/card view

**Signals**:
```typescript
sizes = signal<Size[]>([]);
sizeCategoryId = input.required<number>();
isAdding = signal<boolean>(false);
editingId = signal<number | null>(null);
```

### 4. BindingTypeManager Component
**Purpose**: Manage binding types within a size category
**Location**: `admin/src/app/components/printing-settings-manager/binding-type-manager/`

**Features**:
- List of binding types for the category
- Add new binding type (with sizeCategoryId pre-filled)
- Edit existing binding type
- Delete binding type

**Signals**:
```typescript
bindingTypes = signal<BookBindings[]>([]);
sizeCategoryId = input.required<number>();
isAdding = signal<boolean>(false);
editingId = signal<number | null>(null);
```

### 5. LaminationTypeManager Component
**Purpose**: Manage lamination types within a size category
**Location**: `admin/src/app/components/printing-settings-manager/lamination-type-manager/`

**Features**:
- List of lamination types for the category
- Add new lamination type (with sizeCategoryId pre-filled)
- Edit existing lamination type
- Delete lamination type

**Signals**:
```typescript
laminationTypes = signal<LaminationType[]>([]);
sizeCategoryId = input.required<number>();
isAdding = signal<boolean>(false);
editingId = signal<number | null>(null);
```

### 6. PaperQualityManager Component
**Purpose**: Manage paper qualities within a size category
**Location**: `admin/src/app/components/printing-settings-manager/paper-quality-manager/`

**Features**:
- List of paper qualities for the category
- Add new paper quality (with sizeCategoryId pre-filled)
- Edit existing paper quality
- Delete paper quality

**Signals**:
```typescript
paperQualities = signal<PaperQuailty[]>([]);
sizeCategoryId = input.required<number>();
isAdding = signal<boolean>(false);
editingId = signal<number | null>(null);
```

## Service Updates

### SettingsService Extensions
Add methods for:
- `createSizeCategory(data: CreateSizeCategoryDto)`
- `updateSizeCategory(id: number, data: UpdateSizeCategoryDto)`
- `deleteSizeCategory(id: number)`
- `createSize(data: CreateSizeDto)` - with sizeCategoryId
- `updateSize(id: number, data: UpdateSizeDto)`
- `deleteSize(id: number)`

### PrintingService Extensions
Add methods for:
- `getSizeCategoriesWithRelations()` - fetch all with relations
- `getSizesByCategoryId(sizeCategoryId: number)`

## Data Flow

### State Management Pattern
1. **Parent Component** (PrintingSettingsManager) holds master state
2. **Child Components** receive data via `input()` signals
3. **Events** bubble up via `output()` for updates
4. **Parent** updates master state, triggers re-render

### Update Flow
```
User Action → Child Component → output() event → 
Parent Component → Service Call → 
Update Signal → All Components Re-render
```

## UI/UX Design

### Layout
- **Accordion/Expansion Panels**: One per SizeCategory
- **Tabs within each panel**: 
  - Category Details
  - Sizes
  - Binding Types
  - Lamination Types
  - Paper Qualities
- **Action Buttons**: 
  - Add Category (top level)
  - Add Entity (within each section)
  - Edit/Delete (inline or in dialog)

### Visual Hierarchy
```
┌─────────────────────────────────────┐
│  Printing Settings Manager          │
│  [+ Add Size Category]              │
├─────────────────────────────────────┤
│  ▼ Category A (A)                   │
│    ├─ Details: [Edit]               │
│    ├─ Sizes: [Add] [List]            │
│    ├─ Binding Types: [Add] [List]   │
│    ├─ Lamination: [Add] [List]      │
│    └─ Paper Quality: [Add] [List]   │
├─────────────────────────────────────┤
│  ▶ Category B (B)                   │
└─────────────────────────────────────┘
```

## Angular Best Practices

### 1. Signals Usage
- ✅ Use `signal()` for all state
- ✅ Use `computed()` for derived state
- ✅ Use `effect()` for side effects (logging, etc.)
- ✅ Use `input()` and `output()` for component communication
- ✅ Use `update()` or `set()` instead of `mutate()`

### 2. Component Design
- ✅ Standalone components
- ✅ OnPush change detection
- ✅ Reactive forms
- ✅ Small, focused components
- ✅ Single responsibility principle

### 3. Template Best Practices
- ✅ Native control flow (`@if`, `@for`, `@switch`)
- ✅ Signal-based bindings
- ✅ Avoid complex logic in templates
- ✅ Use `@for` with `track` function

### 4. Service Design
- ✅ `providedIn: 'root'` for singleton services
- ✅ Use `inject()` function
- ✅ Single responsibility
- ✅ Error handling with try/catch

## Implementation Steps

### Phase 1: Core Infrastructure
1. ✅ Create design plan
2. Update SettingsService with new methods
3. Update PrintingService with new methods
4. Create interfaces/types for all entities

### Phase 2: Main Components
5. Create PrintingSettingsManager component
6. Create SizeCategoryCard component
7. Create dialog components for add/edit

### Phase 3: Entity Managers
8. Create SizeManager component
9. Create BindingTypeManager component
10. Create LaminationTypeManager component
11. Create PaperQualityManager component

### Phase 4: Integration
12. Update settings page to use new manager
13. Test all CRUD operations
14. Add error handling and loading states
15. Add confirmation dialogs for delete

## API Endpoints Reference

### Size Category
- `GET /size-category` - List all
- `POST /size-category` - Create
- `PATCH /size-category/:id` - Update
- `DELETE /size-category/:id` - Delete
- `GET /size-category/:id` - Get one

### Size
- `GET /size` - List all (filter by sizeCategoryId)
- `POST /size` - Create (with sizeCategoryId)
- `PATCH /size/:id` - Update
- `DELETE /size/:id` - Delete

### Binding Type
- `GET /book-bindings` - List all (filter by sizeCategoryId)
- `POST /book-bindings` - Create (with sizeCategoryId)
- `PATCH /book-bindings/:id` - Update
- `DELETE /book-bindings/:id` - Delete

### Lamination Type
- `GET /lamination` - List all (filter by sizeCategoryId)
- `POST /lamination` - Create (with sizeCategoryId)
- `PATCH /lamination/:id` - Update
- `DELETE /lamination/:id` - Delete

### Paper Quality
- `GET /paper-quality` - List all (filter by sizeCategoryId)
- `POST /paper-quality` - Create (with sizeCategoryId)
- `PATCH /paper-quality/:id` - Update
- `DELETE /paper-quality/:id` - Delete

## Data Models

### SizeCategory
```typescript
{
  id: number;
  name: string;
  category: 'A' | 'B' | 'C';
  packetPrice: number;
  weightMultiplayer: number;
  insideCoverPrice: number;
  sizes: Size[];
  bindingTypes: BookBindings[];
  laminationTypes: LaminationType[];
  paperQualities: PaperQuailty[];
}
```

### Size
```typescript
{
  id: number;
  size: string; // e.g., "8.5*11"
  width: number;
  length: number;
  sizeCategoryId: number;
}
```

### BookBindings
```typescript
{
  id: number;
  name: string;
  price: number;
  sizeCategoryId: number;
}
```

### LaminationType
```typescript
{
  id: number;
  name: string;
  price: number;
  sizeCategoryId: number;
}
```

### PaperQuailty
```typescript
{
  id: number;
  name: string;
  colorPrice: number;
  blackAndWhitePrice: number;
  sizeCategoryId: number;
}
```

## Security
- All operations require SUPERADMIN access level
- Check access level in component guards
- Hide UI elements for non-superadmin users

## Testing Considerations
- Unit tests for each component
- Test signal updates and computed values
- Test form validations
- Test API error handling
- Test access level restrictions


