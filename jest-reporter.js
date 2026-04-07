/**
 * Jest Custom Reporter — PostSynchronizer
 * Exibe output colorido no console com resumo final de todos os testes.
 */

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
};

class JestReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options;
    this._results = [];
  }

  onTestResult(test, testResult) {
    const suiteName = testResult.testFilePath.replace(process.cwd(), '').replace(/\\/g, '/').replace(/^\//, '');

    testResult.testResults.forEach(result => {
      const passed = result.status === 'passed';
      const icon = passed ? '✅ ' : '❌ ';
      const statusColor = passed ? COLORS.green : COLORS.red;
      const status = passed ? 'SUCCESS' : 'FAILED';
      const duration = result.duration ? `${COLORS.gray}(${result.duration}ms)${COLORS.reset}` : '';

      const fullName = `${COLORS.gray}${testResult.testResults.length > 1 ? result.ancestorTitles.join(' › ') + ' › ' : ''}${COLORS.reset}${result.title}`;

      console.log(`  ${icon} ${statusColor}[${status}]${COLORS.reset} ${fullName} ${duration}`);

      this._results.push({ title: result.title, passed, suite: suiteName });
    });

    if (testResult.testResults.length > 0) {
      console.log('');
    }
  }

  onRunStart() {
    console.log(`\n${COLORS.cyan}${COLORS.bright}${'═'.repeat(60)}${COLORS.reset}`);
    console.log(`${COLORS.cyan}${COLORS.bright}  🧪 Iniciando Suíte de Testes — PostSynchronizer${COLORS.reset}`);
    console.log(`${COLORS.cyan}${COLORS.bright}${'═'.repeat(60)}${COLORS.reset}\n`);
  }

  onRunComplete(contexts, results) {
    const passed = this._results.filter(r => r.passed).length;
    const failed = this._results.filter(r => !r.passed).length;
    const total = this._results.length;

    console.log(`\n${COLORS.bright}${'─'.repeat(60)}${COLORS.reset}`);
    console.log(`${COLORS.bright}  📋 RESUMO FINAL DOS TESTES${COLORS.reset}`);
    console.log(`${COLORS.bright}${'─'.repeat(60)}${COLORS.reset}\n`);

    this._results.forEach(r => {
      const icon = r.passed ? `${COLORS.green}●${COLORS.reset}` : `${COLORS.red}●${COLORS.reset}`;
      const label = r.passed ? `${COLORS.green}SUCCESS${COLORS.reset}` : `${COLORS.red}FAILED${COLORS.reset}`;
      console.log(`  ${icon} [${label}] ${r.title}`);
    });

    console.log(`\n${COLORS.bright}${'─'.repeat(60)}${COLORS.reset}`);

    const suitesTotal = results.numTotalTestSuites;
    const suitesPassed = results.numPassedTestSuites;
    const suitesFailed = results.numFailedTestSuites;

    console.log(
      `  Suítes : ${COLORS.green}${suitesPassed} passaram${COLORS.reset} | ${COLORS.red}${suitesFailed} falharam${COLORS.reset} | ${suitesTotal} total`,
    );
    console.log(
      `  Testes : ${COLORS.green}${passed} passaram${COLORS.reset} | ${COLORS.red}${failed} falharam${COLORS.reset} | ${total} total`,
    );
    console.log(`  Tempo  : ${results.testResults.reduce((acc, r) => acc + (r.perfStats?.runtime || 0), 0)}ms`);

    const allPassed = failed === 0 && suitesFailed === 0;
    console.log(
      `\n  ${
        allPassed
          ? `${COLORS.green}${COLORS.bright}✅ Todos os testes passaram!${COLORS.reset}`
          : `${COLORS.red}${COLORS.bright}❌ ${failed} teste(s) falharam.${COLORS.reset}`
      }`,
    );
    console.log(`${COLORS.bright}${'─'.repeat(60)}${COLORS.reset}\n`);
  }
}

module.exports = JestReporter;
