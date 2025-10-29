// Test coverage reporting and monitoring utilities
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

// Coverage data interface
interface CoverageData {
  total: {
    lines: { total: number; covered: number; percentage: number }
    functions: { total: number; covered: number; percentage: number }
    branches: { total: number; covered: number; percentage: number }
    statements: { total: number; covered: number; percentage: number }
  }
  files: Array<{
    path: string
    lines: { total: number; covered: number; percentage: number }
    functions: { total: number; covered: number; percentage: number }
    branches: { total: number; covered: number; percentage: number }
    statements: { total: number; covered: number; percentage: number }
  }>
}

// Test metrics interface
interface TestMetrics {
  total: number
  passed: number
  failed: number
  skipped: number
  duration: number
  startTime: Date
  endTime: Date
  suites: Array<{
    name: string
    total: number
    passed: number
    failed: number
    skipped: number
    duration: number
  }>
}

// Performance metrics interface
interface PerformanceMetrics {
  api: {
    averageResponseTime: number
    minResponseTime: number
    maxResponseTime: number
    requestsPerSecond: number
    errorRate: number
  }
  database: {
    averageQueryTime: number
    minQueryTime: number
    maxQueryTime: number
    queriesPerSecond: number
    connectionPool: {
      active: number
      idle: number
      total: number
    }
  }
  memory: {
    heapUsed: number
    heapTotal: number
    external: number
    rss: number
  }
  cpu: {
    usage: number
    loadAverage: number[]
  }
}

// Security metrics interface
interface SecurityMetrics {
  vulnerabilities: Array<{
    type: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    description: string
    file?: string
    line?: number
  }>
  securityTests: {
    total: number
    passed: number
    failed: number
    skipped: number
  }
  compliance: {
    owasp: boolean
    pci: boolean
    gdpr: boolean
  }
}

// Coverage monitoring class
export class CoverageMonitor {
  private static instance: CoverageMonitor
  private coverageData: CoverageData | null = null
  private testMetrics: TestMetrics | null = null
  private performanceMetrics: PerformanceMetrics | null = null
  private securityMetrics: SecurityMetrics | null = null

  private constructor() {}

  public static getInstance(): CoverageMonitor {
    if (!CoverageMonitor.instance) {
      CoverageMonitor.instance = new CoverageMonitor()
    }
    return CoverageMonitor.instance
  }

  public setCoverageData(data: CoverageData): void {
    this.coverageData = data
  }

  public setTestMetrics(metrics: TestMetrics): void {
    this.testMetrics = metrics
  }

  public setPerformanceMetrics(metrics: PerformanceMetrics): void {
    this.performanceMetrics = metrics
  }

  public setSecurityMetrics(metrics: SecurityMetrics): void {
    this.securityMetrics = metrics
  }

  public generateCoverageReport(): string {
    if (!this.coverageData) {
      throw new Error('No coverage data available')
    }

    const { total, files } = this.coverageData

    let report = '# Test Coverage Report\n\n'
    report += `Generated at: ${new Date().toISOString()}\n\n`

    // Overall coverage
    report += '## Overall Coverage\n\n'
    report += `| Metric | Covered | Total | Percentage |\n`
    report += `|--------|---------|-------|------------|\n`
    report += `| Lines | ${total.lines.covered} | ${total.lines.total} | ${total.lines.percentage.toFixed(2)}% |\n`
    report += `| Functions | ${total.functions.covered} | ${total.functions.total} | ${total.functions.percentage.toFixed(2)}% |\n`
    report += `| Branches | ${total.branches.covered} | ${total.branches.total} | ${total.branches.percentage.toFixed(2)}% |\n`
    report += `| Statements | ${total.statements.covered} | ${total.statements.total} | ${total.statements.percentage.toFixed(2)}% |\n\n`

    // File coverage
    report += '## File Coverage\n\n'
    report += `| File | Lines | Functions | Branches | Statements |\n`
    report += `|------|-------|-----------|----------|------------|\n`

    files.forEach(file => {
      report += `| ${file.path} | ${file.lines.percentage.toFixed(2)}% | ${file.functions.percentage.toFixed(2)}% | ${file.branches.percentage.toFixed(2)}% | ${file.statements.percentage.toFixed(2)}% |\n`
    })

    return report
  }

  public generateTestReport(): string {
    if (!this.testMetrics) {
      throw new Error('No test metrics available')
    }

    const { total, passed, failed, skipped, duration, startTime, endTime, suites } = this.testMetrics

    let report = '# Test Report\n\n'
    report += `Generated at: ${new Date().toISOString()}\n\n`

    // Test summary
    report += '## Test Summary\n\n'
    report += `- **Total Tests**: ${total}\n`
    report += `- **Passed**: ${passed}\n`
    report += `- **Failed**: ${failed}\n`
    report += `- **Skipped**: ${skipped}\n`
    report += `- **Duration**: ${duration.toFixed(2)}ms\n`
    report += `- **Start Time**: ${startTime.toISOString()}\n`
    report += `- **End Time**: ${endTime.toISOString()}\n\n`

    // Success rate
    const successRate = (passed / total) * 100
    report += `- **Success Rate**: ${successRate.toFixed(2)}%\n\n`

    // Suite breakdown
    report += '## Suite Breakdown\n\n'
    report += `| Suite | Total | Passed | Failed | Skipped | Duration |\n`
    report += `|-------|-------|--------|--------|---------|----------|\n`

    suites.forEach(suite => {
      report += `| ${suite.name} | ${suite.total} | ${suite.passed} | ${suite.failed} | ${suite.skipped} | ${suite.duration.toFixed(2)}ms |\n`
    })

    return report
  }

  public generatePerformanceReport(): string {
    if (!this.performanceMetrics) {
      throw new Error('No performance metrics available')
    }

    const { api, database, memory, cpu } = this.performanceMetrics

    let report = '# Performance Report\n\n'
    report += `Generated at: ${new Date().toISOString()}\n\n`

    // API performance
    report += '## API Performance\n\n'
    report += `- **Average Response Time**: ${api.averageResponseTime.toFixed(2)}ms\n`
    report += `- **Min Response Time**: ${api.minResponseTime.toFixed(2)}ms\n`
    report += `- **Max Response Time**: ${api.maxResponseTime.toFixed(2)}ms\n`
    report += `- **Requests Per Second**: ${api.requestsPerSecond.toFixed(2)}\n`
    report += `- **Error Rate**: ${api.errorRate.toFixed(2)}%\n\n`

    // Database performance
    report += '## Database Performance\n\n'
    report += `- **Average Query Time**: ${database.averageQueryTime.toFixed(2)}ms\n`
    report += `- **Min Query Time**: ${database.minQueryTime.toFixed(2)}ms\n`
    report += `- **Max Query Time**: ${database.maxQueryTime.toFixed(2)}ms\n`
    report += `- **Queries Per Second**: ${database.queriesPerSecond.toFixed(2)}\n`
    report += `- **Connection Pool**: ${database.connectionPool.active}/${database.connectionPool.total} active\n\n`

    // Memory usage
    report += '## Memory Usage\n\n'
    report += `- **Heap Used**: ${(memory.heapUsed / 1024 / 1024).toFixed(2)}MB\n`
    report += `- **Heap Total**: ${(memory.heapTotal / 1024 / 1024).toFixed(2)}MB\n`
    report += `- **External**: ${(memory.external / 1024 / 1024).toFixed(2)}MB\n`
    report += `- **RSS**: ${(memory.rss / 1024 / 1024).toFixed(2)}MB\n\n`

    // CPU usage
    report += '## CPU Usage\n\n'
    report += `- **Usage**: ${cpu.usage.toFixed(2)}%\n`
    report += `- **Load Average**: ${cpu.loadAverage.map(load => load.toFixed(2)).join(', ')}\n\n`

    return report
  }

  public generateSecurityReport(): string {
    if (!this.securityMetrics) {
      throw new Error('No security metrics available')
    }

    const { vulnerabilities, securityTests, compliance } = this.securityMetrics

    let report = '# Security Report\n\n'
    report += `Generated at: ${new Date().toISOString()}\n\n`

    // Security test summary
    report += '## Security Test Summary\n\n'
    report += `- **Total Tests**: ${securityTests.total}\n`
    report += `- **Passed**: ${securityTests.passed}\n`
    report += `- **Failed**: ${securityTests.failed}\n`
    report += `- **Skipped**: ${securityTests.skipped}\n\n`

    // Vulnerabilities
    if (vulnerabilities.length > 0) {
      report += '## Vulnerabilities\n\n'
      report += `| Type | Severity | Description | File | Line |\n`
      report += `|------|----------|-------------|------|------|\n`

      vulnerabilities.forEach(vuln => {
        report += `| ${vuln.type} | ${vuln.severity} | ${vuln.description} | ${vuln.file || 'N/A'} | ${vuln.line || 'N/A'} |\n`
      })
      report += '\n'
    } else {
      report += '## Vulnerabilities\n\nNo vulnerabilities found.\n\n'
    }

    // Compliance
    report += '## Compliance\n\n'
    report += `- **OWASP**: ${compliance.owasp ? '✅' : '❌'}\n`
    report += `- **PCI**: ${compliance.pci ? '✅' : '❌'}\n`
    report += `- **GDPR**: ${compliance.gdpr ? '✅' : '❌'}\n\n`

    return report
  }

  public generateComprehensiveReport(): string {
    let report = '# Comprehensive Test Report\n\n'
    report += `Generated at: ${new Date().toISOString()}\n\n`

    // Coverage report
    if (this.coverageData) {
      report += this.generateCoverageReport()
      report += '\n---\n\n'
    }

    // Test report
    if (this.testMetrics) {
      report += this.generateTestReport()
      report += '\n---\n\n'
    }

    // Performance report
    if (this.performanceMetrics) {
      report += this.generatePerformanceReport()
      report += '\n---\n\n'
    }

    // Security report
    if (this.securityMetrics) {
      report += this.generateSecurityReport()
    }

    return report
  }

  public saveReport(report: string, filename: string, outputDir: string = './test-results'): void {
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true })
    }

    const filepath = join(outputDir, filename)
    writeFileSync(filepath, report, 'utf8')
    console.log(`Report saved to: ${filepath}`)
  }

  public saveAllReports(outputDir: string = './test-results'): void {
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true })
    }

    // Save individual reports
    if (this.coverageData) {
      this.saveReport(this.generateCoverageReport(), 'coverage-report.md', outputDir)
    }

    if (this.testMetrics) {
      this.saveReport(this.generateTestReport(), 'test-report.md', outputDir)
    }

    if (this.performanceMetrics) {
      this.saveReport(this.generatePerformanceReport(), 'performance-report.md', outputDir)
    }

    if (this.securityMetrics) {
      this.saveReport(this.generateSecurityReport(), 'security-report.md', outputDir)
    }

    // Save comprehensive report
    this.saveReport(this.generateComprehensiveReport(), 'comprehensive-report.md', outputDir)
  }

  public getCoverageThresholds(): { lines: number; functions: number; branches: number; statements: number } {
    return {
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    }
  }

  public checkCoverageThresholds(): { passed: boolean; failures: string[] } {
    if (!this.coverageData) {
      return { passed: false, failures: ['No coverage data available'] }
    }

    const thresholds = this.getCoverageThresholds()
    const failures: string[] = []

    if (this.coverageData.total.lines.percentage < thresholds.lines) {
      failures.push(`Lines coverage ${this.coverageData.total.lines.percentage.toFixed(2)}% is below threshold ${thresholds.lines}%`)
    }

    if (this.coverageData.total.functions.percentage < thresholds.functions) {
      failures.push(`Functions coverage ${this.coverageData.total.functions.percentage.toFixed(2)}% is below threshold ${thresholds.functions}%`)
    }

    if (this.coverageData.total.branches.percentage < thresholds.branches) {
      failures.push(`Branches coverage ${this.coverageData.total.branches.percentage.toFixed(2)}% is below threshold ${thresholds.branches}%`)
    }

    if (this.coverageData.total.statements.percentage < thresholds.statements) {
      failures.push(`Statements coverage ${this.coverageData.total.statements.percentage.toFixed(2)}% is below threshold ${thresholds.statements}%`)
    }

    return { passed: failures.length === 0, failures }
  }
}

// Export coverage monitor
export const coverageMonitor = CoverageMonitor.getInstance()

export default {
  CoverageMonitor,
  coverageMonitor,
}