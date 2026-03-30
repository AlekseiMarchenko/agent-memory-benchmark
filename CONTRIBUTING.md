# Contributing to Agent Memory Benchmark

## Adding a New Adapter

1. Create a file in `contrib/your-provider.ts`
2. Implement the `MemoryAdapter` interface (5 methods)
3. Test it: `npx tsx src/cli.ts --provider ./contrib/your-provider.ts --api-key YOUR_KEY`
4. Submit a PR with your results

## Adding Test Cases

1. Find the relevant category file in `src/categories/`
2. Add your test case following the existing pattern
3. Run the in-memory baseline to verify: `npx tsx src/cli.ts --provider in-memory --verbose`
4. Submit a PR

## Reporting Issues

If you believe a test case is unfair or incorrectly scored, open an issue with:
- Your provider name and version
- The test ID that failed
- What your provider returned vs what was expected
- Why you think the expected result should change
