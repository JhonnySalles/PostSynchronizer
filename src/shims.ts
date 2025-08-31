import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

if (typeof BigInt === 'undefined') {
  global.BigInt = require('big-integer');
}

if (typeof Buffer === 'undefined') {
  global.Buffer = require('buffer').Buffer;
}

if (typeof process === 'undefined') {
  global.process = require('process');
} else {
  const bProcess = require('process');
  for (const p in bProcess) {
    if (!(p in process)) {
      process[p] = bProcess[p];
    }
  }
}