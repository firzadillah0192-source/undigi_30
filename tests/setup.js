import fc from "fast-check";

// Konfigurasi global fast-check: minimal 100 runs per property (Req. desain)
fc.configureGlobal({ numRuns: 100, verbose: true });
