export default [
  {
    ignores: ['node_modules/**', 'deploy/**', '*.json', 'css/**', 'icons/**']
  },
  {
    files: ['js/**/*.js', 'sw.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        Promise: 'readonly',
        Map: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // IndexedDB
        indexedDB: 'readonly',
        // Web Audio & Speech
        SpeechSynthesis: 'readonly',
        speechSynthesis: 'readonly',
        SpeechSynthesisUtterance: 'readonly',
        Audio: 'readonly',
        // Navigation & Web APIs
        navigator: 'readonly',
        alert: 'readonly',
        requestAnimationFrame: 'readonly',
        // File APIs
        Blob: 'readonly',
        File: 'readonly',
        Event: 'readonly',
        // Service Worker globals
        self: 'readonly',
        caches: 'readonly',
        clients: 'readonly',
        skipWaiting: 'readonly',
        importScripts: 'readonly'
      }
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': 'warn',
      'no-redeclare': 'error',
      'no-duplicate-imports': 'warn',
      'no-func-assign': 'error',
      'no-const-assign': 'error',
      'no-var': 'warn',
      'semi': ['warn', 'always'],
      'eqeqeq': ['warn', 'always']
    }
  }
];
