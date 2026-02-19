---
name: grill
description: Quiz engineers on AI-generated code to deepen understanding. Uses adaptive difficulty and Socratic teaching to build debugging skills. Use after writing code when the user says "grill me", "challenge me", "quiz me on these changes", or wants to verify they understand what was generated.
---

# Grill

Turn Claude into a demanding teacher that grills you on code changes to ensure deep understanding before moving forward. Uses research-backed adaptive difficulty and Socratic teaching methods.

## When to Use

Invoke this skill when you want to:
- Verify you understand code Claude just wrote
- Test your knowledge before submitting a diff
- Learn by being challenged on implementation details
- Level up your prompting by making Claude your reviewer

## Why This Matters

Research shows a 17% learning deficit when engineers delegate coding to AI without engaging deeply with the output. Debugging skills erode the most with AI use. This skill interrupts the "delegation loop" by forcing active engagement with generated code.

## Workflow

### Step 1: Identify the Code to Challenge On

Ask the user what code they want to be challenged on.

**Default**: Uncommitted changes (`sl diff` or `git diff`)

**Options to offer**:
1. Uncommitted changes (default)
2. The last code block Claude wrote
3. A specific file or function the user names
4. The current commit (`sl show .` or `git show HEAD`)

Run the appropriate command to retrieve the code.

**IMPORTANT:** When running `sl` or `git` commands to retrieve code for grilling, you MUST disable both pager and color output to prevent ANSI escape codes from corrupting the diff content:
- **Sapling:** Use `--pager=off --color=never` flags
- **Git:** Use `--no-pager --no-color` flags

Without these flags, users with custom pagers (like delta) or color settings (`color.diff=always`) will produce output with ANSI codes that Claude cannot parse correctly.

```bash
# For uncommitted changes
sl --pager=off --color=never diff || git --no-pager --no-color diff

# For current commit
sl --pager=off --color=never show . || git --no-pager --no-color show HEAD
```

### Step 2: Adaptive Difficulty System

**Do NOT ask the user to choose difficulty.** Instead, start at Level 2 (Conceptual) and adapt based on responses.

| Level | Name | Question Style | When to Use |
|-------|------|----------------|-------------|
| 1 | **Foundational** | "What does this function do?" | After incorrect answers or "I don't know" |
| 2 | **Conceptual** | "Why was this approach chosen?" | Default starting level |
| 3 | **Application** | "What would happen if X changed?" | After correct, articulate answers |
| 4 | **Debugging** | "What could cause this to fail?" | After demonstrating understanding |
| 5 | **Modification** | "How would you extend this to handle Z?" | For engineers acing the quiz |

**Progression rules**:
- **Correct + articulate** → Jump up 1-2 levels
- **Correct + hesitant** → Stay at current level, probe deeper on same concept
- **Incorrect** → Enter Learning Mode (see Step 4), then retry at same or lower level
- **"I don't know"** → Provide scaffolded hints before moving to Learning Mode

### Step 2b: Analyze the Code Before Generating Questions

**BEFORE generating any questions**, perform a structured analysis of the code. This prevents questions with impossible premises.

#### 1. Extract Constants and Constraints

List every constant, limit, threshold, and sample size defined in the code. Include:
- Named constants (e.g., `MAX_RETRIES = 3`, `BATCH_SIZE = 10`)
- Magic numbers in conditions or loops
- Configuration values passed as parameters
- Default argument values

#### 2. Trace Data Flow

Map the transformations between input and output:
- What enters each function?
- What filtering, sampling, or truncation happens? (e.g., `items[:MAX_ITEMS]` silently caps the data)
- What leaves each function?
- Where does data narrow or expand?

#### 3. Identify Per-Iteration Constraints

For each loop, note:
- How many iterations are possible given the constraints above?
- Are there early exits, breaks, or sampling that limit iterations?
- Do loop variables carry state that affects later iterations?

#### 4. Note Intentional Design Patterns

Read comments and docstrings. If the code documents a deliberate design choice (e.g., "fire-and-forget," "silently truncate," "intentionally swallow exceptions"), treat it as a design trade-off to explore, not a bug to report.

#### 5. Plan All Questions as a Set

Before presenting the first question, plan the complete question set. This ensures:
- No duplicate angles across questions
- Good coverage of the code's key aspects
- Proper difficulty progression
- Coherent question sequence that builds understanding

### Step 3: Generate Questions

Based on the code and the analysis from Step 2b, generate an adaptive number of questions:

- **Simple changes** (< 50 lines): 3-5 questions
- **Medium changes** (50-200 lines): 5-7 questions
- **Large changes** (> 200 lines): 7-10 questions

**Minimum**: 3 questions | **Maximum**: 10 questions | **At least 2 must be debugging-focused**

#### Pre-Question Validation

For EACH question before including it in the set:
1. **State the premise**: What assumption does this question make about the code?
2. **Verify against constraints**: Is this premise possible given the constants, data flow, and loop constraints identified in Step 2b?
3. **Drop if invalid**: If the premise violates a constraint (e.g., asking about 50 items when the code caps at 10), do NOT include that question. Generate a replacement grounded in actual constraints.

#### Confidence Check

Rate your confidence in each question's accuracy (high / medium / low). If confidence is low — for example, the question depends on external API behavior not visible in the code, or on runtime values you can't determine — either rephrase the question to acknowledge the uncertainty, or replace it with a question grounded in what IS visible.

**Question categories in priority order**:

#### 1. Debugging Scenarios (HIGHEST PRIORITY - always include 2+)

Research shows debugging skills have the largest gap when delegating to AI. Prioritize these:

- "If you saw `[specific error message]`, where would you look first?"
- "What could cause `[function]` to fail silently?"
- "How would you verify `[edge case]` is handled correctly?"
- "What would happen if `[input]` was null/empty/malformed?"
- "If this code hung in production, what would you check?"

#### 2. Conceptual Understanding (HIGH PRIORITY)

- "Why was this pattern/approach used instead of alternatives?"
- "What problem does this abstraction solve?"
- "How does this integrate with the existing code?"
- "What tradeoffs were made in this design?"

#### 3. Code Reading (MODERATE PRIORITY)

- "What does this function do step by step?"
- "Trace the execution path when input is X"
- "What is the return value when Y condition is true?"

#### 4. Modification Challenges (Level 5 only)

- "How would you extend this to handle [new requirement]?"
- "What would need to change to support [feature]?"
- "If we needed to scale this 10x, what would break first?"

### Step 4: Conduct the Quiz with Learning Mode

Present questions from the planned set **one at a time**. After each answer, evaluate and respond appropriately:

#### For Correct Answers
1. Acknowledge what was right
2. If articulate → increase difficulty
3. If hesitant → probe deeper: "Can you elaborate on why?"

#### For Partially Correct Answers
1. Acknowledge the correct parts
2. Ask a follow-up to fill the gap: "You're on the right track. What about [missing piece]?"
3. Stay at current level

#### For Incorrect Answers - Enter Learning Mode

**Do NOT just explain the answer.** Use scaffolded teaching:

1. **Acknowledge**: "That's not quite right, but let's work through it together."

2. **Scaffold with hints** (up to 3 before explaining):
   - Hint 1: Point to relevant code location: "Take a look at line X. What do you notice?"
   - Hint 2: Narrow the focus: "Think about what happens when [condition]..."
   - Hint 3: Give a strong nudge: "The key is in how [concept] works here..."

3. **Explain** (if still struggling): Provide the concept/context needed, not just the answer

4. **Verify understanding**: Ask a simpler related question to test the new knowledge

5. **Continue**: Resume the quiz or iterate if still struggling

#### For "I Don't Know" Responses

1. **Normalize it**: "That's fine - let's figure it out together."
2. **Start scaffolding**: Provide hints as above
3. **Build understanding incrementally**

### Learning Mode Example

```
Claude: "What could cause the `fetch_user_data` function to hang indefinitely?"

User: "Maybe a network error?"

Claude: "You're thinking about failures, which is good, but a network error
would typically throw an exception, not hang. Let me give you a hint: look
at line 47 where we acquire the connection. What happens if we never release it?"

User: "Oh, is it a deadlock? Like if something else is holding the connection?"

Claude: "Exactly! The connection pool has a max size of 10. If all connections
are in use and not released, new requests will wait forever. Now, a follow-up:
where in this code should we add a timeout or connection release to prevent this?"

User: "We need a try/finally block to ensure the connection is released?"

Claude: "Perfect. You've identified both the bug and the fix. Let's continue -
next question will be at Level 4..."
```

### Step 5: Summarize and Conclude

After all questions, provide a summary:

1. **Strengths**: What the user demonstrated good understanding of
2. **Debugging capability**: Specifically note how they handled failure scenario questions
3. **Areas to review**: Concepts that need more attention, with specific recommendations
4. **Growth observed**: If they improved during the session, acknowledge it

**Do not gate or block** the user from proceeding. This is learning-focused, not pass/fail.

Example conclusion:
```
## Summary

**Strengths:**
- Solid understanding of the overall data flow
- Good instincts on error handling patterns
- Correctly identified the connection pool issue after scaffolding

**Debugging skills:**
- Initially struggled with failure scenarios but improved after hints
- Successfully traced the deadlock condition

**Consider reviewing:**
- Thread safety patterns - review `ConnectionPool` implementation
- The caching mechanism in `fetch_data()` - cache invalidation timing was unclear

**Progress:** You started at Level 2 and worked up to Level 4. Nice improvement!

Ready to continue with your work.
```

## Tips for Effective Challenges

- **Prioritize debugging questions** - this is where AI delegation hurts most
- Focus on **intent and reasoning**, not syntax
- Ask about **tradeoffs**, not just what the code does
- Connect questions to **real scenarios** the code might encounter
- **Errors are learning opportunities** - don't rush past wrong answers
- **Scaffold before explaining** - let the user discover insights
- Adapt difficulty dynamically - the goal is learning, not testing
