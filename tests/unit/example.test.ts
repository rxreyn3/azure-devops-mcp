import { describe, it, expect } from 'vitest'

describe('Testing Infrastructure', () => {
  it('should be properly configured', () => {
    expect(true).toBe(true)
  })

  it('should have access to test utilities', () => {
    expect(process.env.AZURE_DEVOPS_ORG_URL).toBe('https://dev.azure.com/test-org')
    expect(process.env.AZURE_DEVOPS_TOKEN).toBe('test-token')
  })
})