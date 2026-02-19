---
name: sharing-skills
description: Use when you've developed a broadly useful skill and want to contribute it to the claude-templates marketplace via Phabricator diff - guides process of committing, submitting, and creating diff to contribute skills
---

# Sharing Skills

## Overview

Contribute skills to the claude-templates marketplace in fbsource.

**Workflow:** Create skill → Commit → Submit diff → Get review

## When to Share

**Share when:**
- Skill applies broadly (not project-specific)
- Pattern/technique others would benefit from
- Well-tested and documented
- Follows writing-skills guidelines

**Keep personal when:**
- Project-specific or organization-specific
- Experimental or unstable
- Contains sensitive information
- Too narrow/niche for general use

## Prerequisites

- Access to fbsource repository
- Skill has been tested using writing-skills TDD process
- Working directory in the plugin location

## Plugin Location

Skills should be added to:
```
fbcode/claude-templates/components/plugins/<your-plugin-name>/skills/<skill-name>/SKILL.md
```

Or for the 10x-engineer plugin:
```
fbcode/claude-templates/components/plugins/10x-engineer/skills/<skill-name>/SKILL.md
```

## Sharing Workflow

### 1. Ensure You're on Latest

```bash
# Pull latest changes
arc pull

# Check current status
sl ssl
```

### 2. Create or Edit Skill

```bash
# Work on your skill in the skills directory
# Skill should be in skills/<skill-name>/SKILL.md
```

### 3. Commit Changes

```bash
# Check what files changed
sl status

# Commit with proper Meta format
sl commit -m "[claude-templates] Add <skill-name> skill

Summary:
Brief description of what this skill does and why it's useful.

Test Plan:
- Tested with Claude Code in multiple scenarios
- Verified skill guidance is followed correctly
- Tested edge cases: <list them>"
```

### 4. Submit Diff for Review

```bash
# Submit as draft first
jf submit --draft

# Add reviewers including #3pai for marketplace changes
jf template --add-reviewers "#3pai"
```

### 5. Publish When Ready

```bash
# Publish for review
jf action --publish

# Or submit directly (publishes automatically)
jf submit
```

## Complete Example

Here's a complete example of sharing a skill called "async-patterns":

```bash
# 1. Pull latest
arc pull

# 2. Create/edit the skill
# (Work on skills/async-patterns/SKILL.md)

# 3. Commit
sl commit -m "[claude-templates] Add async-patterns skill

Summary:
Patterns for handling asynchronous operations in tests and application code.

Test Plan:
- Tested with multiple application scenarios
- Agents successfully apply patterns to new code"

# 4. Submit as draft
jf submit --draft

# 5. Add marketplace reviewers
jf template --add-reviewers "#3pai"

# 6. Publish
jf action --publish
```

## After Diff is Landed

Once your diff is landed:

1. The skill will be available in the marketplace
2. Users can install via `/plugin install <plugin-name>`
3. Pull latest to sync:
```bash
arc pull
```

## Troubleshooting

**"No changes to commit"**
- Check `sl status` to see if files are tracked
- Make sure you saved your changes

**Diff build failures**
- Check Sandcastle signals in Phabricator
- Fix any lint/test failures
- Update diff: `sl amend && jf submit -u`

**Reviewer requests changes**
- Make requested changes
- `sl amend` to update commit
- `jf submit -u` to update diff

## Multi-Skill Contributions

**Do NOT batch multiple unrelated skills in one diff.**

Each skill should:
- Have its own commit (or be closely related in a stack)
- Be independently reviewable
- Have a clear purpose

**Why?** Individual skills can be reviewed, iterated, and landed independently.

## Diff Stack for Related Skills

If skills are related, use a diff stack:

```bash
# Create first skill commit
sl commit -m "[claude-templates] Add skill-a

Summary: First skill in the series

Test Plan: Tested in isolation"

# Create second skill commit
sl commit -m "[claude-templates] Add skill-b

Summary: Builds on skill-a

Test Plan: Tested with skill-a"

# Submit entire stack
jf submit -u -r "BASE::"
```

## Related Skills

- **writing-skills** - REQUIRED: How to create well-tested skills before sharing
- **source-control-at-meta:creating-or-updating-diffs** - Detailed diff workflow
