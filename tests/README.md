# Unit Testing with Jest - Digital Samba MCP Server

This document outlines the unit testing setup for the Digital Samba MCP Server project.

## Overview

We use Jest as our testing framework with TypeScript support via ts-jest. The tests are organized into:

- **Unit tests**: Test individual components in isolation
- **Integration tests**: Test how components work together
- **Mocks**: Reusable mock objects and test data

## Running Tests

```bash
# Run all tests
npm test

# Run with test coverage report
npm run test:coverage

# Run tests in watch mode (for development)
npm run test:watch

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration
```

## Test Structure

- **Unit tests**: Located in `/tests/unit/`
  - Test each module in isolation
  - Use mocks for dependencies
  - Focus on functionality, not implementation details

- **Integration tests**: Located in `/tests/integration/`
  - Test how components work together
  - May use real dependencies or mocks
  - Focus on component interactions

- **Mocks**: Located in `/tests/mocks/`
  - Reusable mock objects and test data
  - Used by both unit and integration tests

## Mocking Approach

- Use Jest's mocking capabilities for simple mocks
- Use the provided mock objects in `/tests/mocks/` for common patterns
- Create custom mock implementations when needed

### Example Mock Usage

```typescript
import { mockApiResponses, mockRequestMeta } from '../mocks/api-responses';

// Use mock API responses
const rooms = mockApiResponses.rooms.list;

// Use mock request objects
const request = mockRequestMeta;
```

## Writing Good Tests

1. **Arrange**: Set up test environment and inputs
2. **Act**: Call the function/method being tested
3. **Assert**: Verify the expected outcome

Example:

```typescript
describe('extractApiKey', () => {
  it('should extract API key from valid Authorization header', () => {
    // Arrange
    const req = {
      headers: {
        authorization: 'Bearer test-api-key'
      }
    };
    
    // Act
    const apiKey = extractApiKey(req as any);
    
    // Assert
    expect(apiKey).toBe('test-api-key');
  });
});
```

## Test Coverage

We aim for high test coverage, but focus on testing critical paths and edge cases rather than hitting arbitrary coverage numbers. Use the coverage report to identify untested code:

```bash
npm run test:coverage
```

This will generate a coverage report in the `/coverage` directory.

## Continuous Integration

Tests are run automatically on pull requests and before deployment to ensure code quality. Make sure all tests pass before submitting a pull request.
