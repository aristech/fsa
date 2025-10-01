# AI Data Validation System

## Overview
The AI assistant now includes a robust data validation system to prevent database errors and ensure accurate data references. This system uses symbols to identify specific data types and validates their existence before creating or updating records.

## Symbol System

### Personnel References
- **Symbol**: `@`
- **Examples**:
  - `@John Doe` - Find personnel by name
  - `@EMP001` - Find personnel by employee ID
  - `@507f1f77bcf86cd799439011` - Direct ObjectId reference

### Work Order References
- **Symbol**: `#`
- **Examples**:
  - `#WO-001` - Find work order by number
  - `#Garden Care` - Find work order by title
  - `#507f1f77bcf86cd799439011` - Direct ObjectId reference

### Task References
- **Symbol**: `/`
- **Examples**:
  - `/Plant Watering` - Find task by title
  - `/Maintenance` - Find task by title
  - `/507f1f77bcf86cd799439011` - Direct ObjectId reference

### Project References
- **Symbol**: `+`
- **Examples**:
  - `+Garden Project` - Find project by title
  - `+Maintenance` - Find project by title
  - `+507f1f77bcf86cd799439011` - Direct ObjectId reference

### Client References
- **Symbol**: `&`
- **Examples**:
  - `&Acme Corp` - Find client by name
  - `&John Smith` - Find client by name
  - `&507f1f77bcf86cd799439011` - Direct ObjectId reference

## How It Works

### 1. Loose Language Detection
When you mention personnel, work orders, tasks, projects, or clients without symbols, the AI will:
- Detect the loose language
- Request validation using symbols
- Provide suggestions for available data

### 2. Validation Process
The AI uses two tools to validate data:
- **`validate_references`**: Checks if specific references exist
- **`lookup_data`**: Searches for available options

### 3. Confirmation Flow
Before creating or updating records, the AI will:
- Validate all references
- Show you what data was found
- Ask for confirmation if data is ambiguous
- Prevent database errors by ensuring data exists

## Examples

### ❌ Loose Language (Will be rejected)
```
"Create a task for John Doe to water plants in the garden project"
```

### ✅ Proper Symbol Usage
```
"Create a task for @John Doe to water plants in +Garden Project"
```

### 🔍 Validation Request
```
"Create a task for John Doe"
→ AI: "I need to validate @John Doe first. Let me check if this personnel exists..."
```

## Benefits

1. **Prevents Database Errors**: No more CastError exceptions from invalid ObjectIds
2. **Data Accuracy**: Ensures references point to existing records
3. **User Guidance**: Provides suggestions when data is not found
4. **Consistent Experience**: Standardized way to reference data across the system

## AI Behavior

The AI will now:
- Always validate references before database operations
- Provide helpful suggestions when data is not found
- Use the validation tools to confirm data existence
- Guide users to use proper symbols for data references
- Prevent creation of records with invalid references

## Error Prevention

This system prevents common errors like:
- `CastError: Cast to ObjectId failed for value "Tsili"`
- Invalid personnel assignments
- Non-existent work order references
- Missing project associations
- Invalid client references

## Getting Help

If you're unsure about available data, ask the AI:
- "Show me available personnel"
- "What work orders do I have?"
- "List my projects"
- "Find clients matching 'Acme'"

The AI will use the `lookup_data` tool to show you available options with proper symbol formatting.
