# Date Filtering Examples for build_list

The `build_list` tool now supports date range filtering using the `minTime` and `maxTime` parameters.

## Example Usage

### Filter builds from the last week
```json
{
  "tool": "build_list",
  "arguments": {
    "minTime": "2024-01-08T00:00:00Z",
    "maxTime": "2024-01-15T00:00:00Z"
  }
}
```

### Get all failed builds in January 2024
```json
{
  "tool": "build_list",
  "arguments": {
    "minTime": "2024-01-01",
    "maxTime": "2024-01-31T23:59:59Z",
    "result": "Failed"
  }
}
```

### Combine with other filters
```json
{
  "tool": "build_list",
  "arguments": {
    "definitionNameFilter": "preflight",
    "status": "Completed",
    "minTime": "2024-01-15T09:00:00Z",
    "maxTime": "2024-01-15T17:00:00Z",
    "limit": 20
  }
}
```

## Date Format Support

The tool accepts any date string that can be parsed by JavaScript's `Date` constructor:
- ISO 8601: `"2024-01-15T10:30:00Z"`
- Date only: `"2024-01-15"` (assumes 00:00:00 UTC)
- With timezone: `"2024-01-15T10:30:00-08:00"`

## Error Handling

If an invalid date is provided:
```json
{
  "error": {
    "type": "validation_error",
    "message": "Invalid minTime format: \"invalid-date\". Please use ISO 8601 format (e.g., \"2024-01-01T00:00:00Z\") or standard date strings (e.g., \"2024-01-01\").",
    "details": "The date string could not be parsed."
  }
}
```

If minTime is after maxTime:
```json
{
  "error": {
    "type": "validation_error", 
    "message": "Invalid date range: minTime must be before or equal to maxTime.",
    "details": "minTime (2024-02-01T00:00:00.000Z) is after maxTime (2024-01-01T00:00:00.000Z). Please swap the values."
  }
}
```