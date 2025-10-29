// Security tests
import { testSQLInjection, testXSS, testAuthBypass } from '../utils/test-helpers'

describe('Security Tests', () => {
  describe('SQL Injection Protection', () => {
    test('should prevent SQL injection attacks', async () => {
      const results = await testSQLInjection('/api/test', 'GET')
      
      results.forEach(result => {
        expect(result.vulnerable).toBe(false)
      })
    })
  })

  describe('XSS Protection', () => {
    test('should prevent XSS attacks', async () => {
      const results = await testXSS('/api/test', 'POST')
      
      results.forEach(result => {
        expect(result.vulnerable).toBe(false)
      })
    })
  })

  describe('Authentication Bypass', () => {
    test('should prevent authentication bypass', async () => {
      const results = await testAuthBypass('/api/admin/users', 'GET')
      
      results.forEach(result => {
        expect(result.bypassed).toBe(false)
      })
    })
  })
})