# 2026-11-01: the importer, put back after a merge

The merge of `main` into `ccr-52288f25-6a2ans` (`898c834`, then PR #5) mixed
the two sides of `Scripts/midular_import.lua`: the importer's new code (the
gmem hand-over, finding the Midular to load into, the fallback file) was
mostly gone, and what was left did not load (`<eof> expected near 'end'` at
line 406). The README lost how the import works now, and the Granular page
lost its new defaults (16 grains became 4 again, and so on). Both test suites
failed on `main`.

## The mend

The merge done again from its two sides, `df3289a` (the importer) and
`a5dfa45` (Apple's writing guidelines, 2026-10-14):

- The importer's code as the branch had it, its messages worded as `main`
  worded the old ones; its new messages ("more than one Midular", "waiting
  for Midular") and the header's "In Project" to the same rules.
- The Granular page: the branch's defaults with `main`'s labels and units.
- The README: the branch's account of the import.

102 and 38 checks pass, as they did on the branch before the merge.

## Lesson

After merging `main` into a branch, diff the result against the branch
before the merge (`git diff <branch-before> <merge>`): anything there that
`main` did not mean to bring is a revert. And run the tests on the merge.
