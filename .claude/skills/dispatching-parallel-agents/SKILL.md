---
name: dispatching-parallel-agents
description: Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies
---

# Dispatching Parallel Agents

## Overview

When you have multiple unrelated failures (different test files, different subsystems, different bugs), investigating them sequentially wastes time. Each investigation is independent and can happen in parallel.

**Core principle:** Dispatch one agent per independent problem domain. Let them work concurrently.

## Teams Availability Check

Before dispatching, check if the Teams feature is available. Teams provides coordinated parallel execution with inter-agent communication, shared task lists, and lifecycle management.

```dot
digraph teams_check {
    "2+ independent tasks?" [shape=diamond];
    "TeamCreate tool available?" [shape=diamond];
    "4+ tasks?" [shape=diamond];
    "Team Mode" [shape=box style=filled fillcolor=lightgreen];
    "Simple Parallel Dispatch (Task tool)" [shape=box];
    "Sequential or single agent" [shape=box];

    "2+ independent tasks?" -> "TeamCreate tool available?" [label="yes"];
    "2+ independent tasks?" -> "Sequential or single agent" [label="no"];
    "TeamCreate tool available?" -> "4+ tasks?" [label="yes"];
    "TeamCreate tool available?" -> "Simple Parallel Dispatch (Task tool)" [label="no - fallback"];
    "4+ tasks?" -> "Team Mode" [label="yes"];
    "4+ tasks?" -> "Simple Parallel Dispatch (Task tool)" [label="2-3 tasks, simpler"];
}
```

**How to check:** Attempt to use `TeamCreate`. If it's not in your available tools, fall back to simple parallel dispatch with the `Task` tool.

**When to prefer Team Mode even with 2-3 tasks:**
- Tasks may spawn follow-up work
- Agents need to communicate findings to each other
- You want progress tracking via shared task list
- Tasks have dependency ordering (some must finish before others start)

## When to Use

```dot
digraph when_to_use {
    "Multiple failures?" [shape=diamond];
    "Are they independent?" [shape=diamond];
    "Single agent investigates all" [shape=box];
    "One agent per problem domain" [shape=box];
    "Can they work in parallel?" [shape=diamond];
    "Sequential agents" [shape=box];
    "Parallel dispatch" [shape=box];

    "Multiple failures?" -> "Are they independent?" [label="yes"];
    "Are they independent?" -> "Single agent investigates all" [label="no - related"];
    "Are they independent?" -> "Can they work in parallel?" [label="yes"];
    "Can they work in parallel?" -> "Parallel dispatch" [label="yes"];
    "Can they work in parallel?" -> "Sequential agents" [label="no - shared state"];
}
```

**Use when:**
- 2+ tasks with different root causes or domains
- Multiple subsystems broken independently
- Each problem can be understood without context from others
- No shared state between investigations

**Don't use when:**
- Failures are related (fix one might fix others)
- Need to understand full system state
- Agents would interfere with each other (editing same files)

## Simple Parallel Dispatch (Fallback / 2-3 Tasks)

When Teams isn't available or you have only 2-3 independent tasks:

### 1. Identify Independent Domains

Group failures by what's broken:
- File A tests: Tool approval flow
- File B tests: Batch completion behavior
- File C tests: Abort functionality

### 2. Create Focused Agent Tasks

Each agent gets:
- **Specific scope:** One test file or subsystem
- **Clear goal:** Make these tests pass
- **Constraints:** Don't change other code
- **Expected output:** Summary of what you found and fixed

### 3. Dispatch in Parallel

```
Task("Fix agent-tool-abort.test.ts failures")
Task("Fix batch-completion-behavior.test.ts failures")
Task("Fix tool-approval-race-conditions.test.ts failures")
// All three run concurrently
```

### 4. Review and Integrate

When agents return:
- Read each summary
- Verify fixes don't conflict
- Run full test suite
- Integrate all changes

## Team Mode (4+ Tasks or Need Coordination)

When Teams is available and you have many independent tasks or need inter-agent communication:

### 1. Create Team and Task List

```
TeamCreate(team_name="fix-failures", description="Fix 6 test failures across 4 files")
```

### 2. Create Tasks with Dependencies

```
TaskCreate(subject="Fix abort tests", description="Fix 3 failures in agent-tool-abort.test.ts...")
TaskCreate(subject="Fix batch tests", description="Fix 2 failures in batch-completion.test.ts...")
TaskCreate(subject="Fix race conditions", description="Fix 1 failure in tool-approval.test.ts...")
TaskCreate(subject="Integration verification", description="Run full suite after all fixes land")

// Task 4 depends on 1-3 completing
TaskUpdate(taskId="4", addBlockedBy=["1", "2", "3"])
```

### 3. Spawn Teammates

```
Task(name="fixer-1", team_name="fix-failures", subagent_type="general-purpose",
     prompt="You are a teammate. Check TaskList, claim an available task, fix it, mark complete.")
Task(name="fixer-2", team_name="fix-failures", subagent_type="general-purpose",
     prompt="You are a teammate. Check TaskList, claim an available task, fix it, mark complete.")
Task(name="fixer-3", team_name="fix-failures", subagent_type="general-purpose",
     prompt="You are a teammate. Check TaskList, claim an available task, fix it, mark complete.")
```

### 4. Monitor and Coordinate

As team lead:
- Messages from teammates arrive automatically
- Use `SendMessage` to answer questions or provide context
- Use `TaskList` to check progress
- When blocked tasks unblock (dependencies complete), assign or let teammates claim them

### 5. Shutdown and Cleanup

When all tasks are complete:
```
SendMessage(type="shutdown_request", recipient="fixer-1", content="All done")
SendMessage(type="shutdown_request", recipient="fixer-2", content="All done")
SendMessage(type="shutdown_request", recipient="fixer-3", content="All done")
// After all acknowledge:
TeamDelete()
```

## Team Mode Advantages Over Simple Dispatch

| Feature | Simple Dispatch | Team Mode |
|---|---|---|
| Communication | None (fire-and-forget) | DMs, broadcasts |
| Progress tracking | Wait for all to return | Live task list |
| Dependencies | None | `blocks`/`blockedBy` |
| Follow-up work | Manual re-dispatch | Teammate claims next task |
| Error handling | Read final report | Teammate messages you mid-task |
| Lifecycle | Implicit (agent exits) | Explicit shutdown protocol |

## Agent Prompt Structure

Good agent prompts are:
1. **Focused** - One clear problem domain
2. **Self-contained** - All context needed to understand the problem
3. **Specific about output** - What should the agent return?

```markdown
Fix the 3 failing tests in src/agents/agent-tool-abort.test.ts:

1. "should abort tool with partial output capture" - expects 'interrupted at' in message
2. "should handle mixed completed and aborted tools" - fast tool aborted instead of completed
3. "should properly track pendingToolCount" - expects 3 results but gets 0

These are timing/race condition issues. Your task:

1. Read the test file and understand what each test verifies
2. Identify root cause - timing issues or actual bugs?
3. Fix by:
   - Replacing arbitrary timeouts with event-based waiting
   - Fixing bugs in abort implementation if found
   - Adjusting test expectations if testing changed behavior

Do NOT just increase timeouts - find the real issue.

Return: Summary of what you found and what you fixed.
```

## Common Mistakes

**❌ Too broad:** "Fix all the tests" - agent gets lost
**✅ Specific:** "Fix agent-tool-abort.test.ts" - focused scope

**❌ No context:** "Fix the race condition" - agent doesn't know where
**✅ Context:** Paste the error messages and test names

**❌ No constraints:** Agent might refactor everything
**✅ Constraints:** "Do NOT change production code" or "Fix tests only"

**❌ Vague output:** "Fix it" - you don't know what changed
**✅ Specific:** "Return summary of root cause and changes"

**❌ Too many teammates:** Spawning 8 agents for 4 tasks
**✅ Right-sized:** Match teammate count to task count (max 4-5 teammates)

## When NOT to Use

**Related failures:** Fixing one might fix others - investigate together first
**Need full context:** Understanding requires seeing entire system
**Exploratory debugging:** You don't know what's broken yet
**Shared state:** Agents would interfere (editing same files, using same resources)

## Verification

After agents return (either mode):
1. **Review each summary** - Understand what changed
2. **Check for conflicts** - Did agents edit same code?
3. **Run full suite** - Verify all fixes work together
4. **Spot check** - Agents can make systematic errors
