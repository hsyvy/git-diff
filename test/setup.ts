/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-var-requires */
import { mockVscode } from './helpers/mock-vscode';

// Ensure the mock is used when vscode is imported
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request: string, parent: any, isMain: boolean) {
    if (request === 'vscode') {
        // Return a fake path that will be intercepted by _load
        return 'vscode';
    }
    return originalResolveFilename(request, parent, isMain);
};

const originalLoad = Module._load;
Module._load = function (request: string, parent: any, isMain: boolean) {
    if (request === 'vscode') {
        return mockVscode;
    }
    return originalLoad(request, parent, isMain);
};

// Create a fake cache entry to avoid resolution errors
const fakeVscodeModule = {
    exports: mockVscode,
    id: 'vscode',
    filename: 'vscode',
    loaded: true,
    parent: null,
    children: [],
    paths: []
};

Module._cache['vscode'] = fakeVscodeModule;