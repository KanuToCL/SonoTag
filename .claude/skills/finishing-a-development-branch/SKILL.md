---
name: finishing-a-development-branch
description: Use when implementation is complete, all tests pass, and you need to decide how to integrate the work - guides completion of development work by presenting structured options for submitting diffs or cleanup
---

# Finishing Development Work

## Overview

Guide completion of development work by presenting clear options and handling chosen workflow.

**Core principle:** Verify tests → Present options → Execute choice → Clean up.

**Announce at start:** "I'm using the finishing-a-development-branch skill to complete this work."

## The Process

### Step 1: Verify Tests

**Before presenting options, verify tests pass:**

```bash
# Run project's test suite based on language:
# - Hack (www/): t TestClassName
# - JS/TS: jest or jest-e2e
# - Python/Rust/C++/Go: buck2 test //path:target
```

**If tests fail:**
```
Tests failing (<N> failures). Must fix before completing:

[Show failures]

Cannot proceed with diff submission until tests pass.
```

Stop. Don't proceed to Step 2.

**If tests pass:** Continue to Step 2.

### Step 2: Check Current Commit Status

```bash
# Check if current commit has a linked diff
sl log -r . -T "{desc|firstline}\n{phabdiff}\n"

# Check for uncommitted changes
sl status
```

### Step 3: Present Options

Present exactly these 4 options:

```
Implementation complete. What would you like to do?

1. Submit as draft diff (jf submit --draft)
2. Publish diff for review (jf submit or jf action --publish)
3. Keep changes as-is (I'll handle it later)
4. Discard this work

Which option?
```

**Don't add explanation** - keep options concise.

### Step 4: Execute Choice

#### Option 1: Submit as Draft Diff

```bash
# If there are uncommitted changes, commit first
sl status
# If changes exist:
sl commit -m "[Category] <title>

Summary: <description>

Test Plan: <test plan>"

# Submit as draft
jf submit --draft
```

Report: "Draft diff submitted. You can publish when ready with `jf action --publish`."

#### Option 2: Publish Diff for Review

```bash
# If there are uncommitted changes, commit first
sl status
# If changes exist:
sl commit -m "[Category] <title>

Summary: <description>

Test Plan: <test plan>"

# Submit and publish
jf submit
```

Or if diff already exists as draft:
```bash
jf action --publish
```

Report: "Diff published for review. Check Phabricator for status."

#### Option 3: Keep As-Is

Report: "Keeping changes as-is. You can submit later with `jf submit --draft`."

**Don't modify anything.**

#### Option 4: Discard

**Confirm first:**
```
This will permanently discard:
- Uncommitted changes
- Current commit: <commit summary>

Type 'discard' to confirm.
```

Wait for exact confirmation.

If confirmed:
```bash
# Discard uncommitted changes
sl revert --all

# If you want to hide the current commit
sl hide .
```

## Quick Reference

| Option | Commit | Submit | Publish |
|--------|--------|--------|---------|
| 1. Draft diff | ✓ (if needed) | ✓ | - |
| 2. Publish | ✓ (if needed) | ✓ | ✓ |
| 3. Keep as-is | - | - | - |
| 4. Discard | - | - | - |

## Common Mistakes

**Skipping test verification**
- **Problem:** Submit broken code, create failing diff
- **Fix:** Always verify tests before offering options

**Open-ended questions**
- **Problem:** "What should I do next?" → ambiguous
- **Fix:** Present exactly 4 structured options

**Submitting without proper commit message**
- **Problem:** Diff gets rejected or needs updates
- **Fix:** Ensure commit message has Title, Summary, Test Plan

**No confirmation for discard**
- **Problem:** Accidentally delete work
- **Fix:** Require typed "discard" confirmation

## Red Flags

**Never:**
- Proceed with failing tests
- Submit without verifying tests on result
- Delete work without confirmation
- Use `jf submit` without checking if changes are committed

**Always:**
- Verify tests before offering options
- Present exactly 4 options
- Get typed confirmation for Option 4
- Use `--draft` flag for initial submissions

## Integration

**Called by:**
- **subagent-driven-development** (Step 7) - After all tasks complete
- **executing-plans** (Step 5) - After all batches complete

**Related skills:**
- **source-control-at-meta:creating-or-updating-diffs** - Detailed diff creation workflow
