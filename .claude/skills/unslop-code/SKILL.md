---
name: unslop-code
description: Detect and roast AI code slop - redundant, unreadable, or unnecessarily complex code patterns. Focuses on stupid comments, sloppy tests, over-abstraction, and repetitive code that makes codebases painful to maintain.
---

# Unslop Code

Scan code for AI-generated slop and roast it accordingly. No mercy for tutorial comments, vacuous tests, or "enterprise" abstractions for 3-line scripts.

## Workflow

**Step 1: Get the code**
- Uncommitted changes (use `get_local_changes`)
- Specific diff (e.g., D12345678)
- Files/directories user specifies
- Pasted code

If unclear, ask: "Uncommitted changes, diff number, or specific files?"

**Step 2: Scan for slop**
Flag instances with: Pattern name, Location, Severity, Why it's slop

**Step 3: Present the roast**
Summary stats + detailed findings with code snippets

**Step 4: Let user pick fixes**
- Fix all
- Fix by severity
- Interactive selection
- Report only (no changes)

## Slop Patterns

### 🔥🔥🔥 1. COMMENT SLOP (MAXIMUM PRIORITY)

**What:** 99% of AI-generated comments are garbage. Delete them all.

**The Rule:** If the comment just restates what the code does, DELETE IT.

**Crime 1: The Narrator**
```python
# Retrieve all users from the repository
all_users = user_repository.get_all_users()

# Create a list to store active users
active_users = []

# Iterate over every user
for user in all_users:
    # If user is active...
    if user.is_active:
        # ...add them to the active users list
        active_users.append(user)

# Return the list of active users
return active_users
```
**The roast:** You're explaining that `get_all_users()` gets all users. That loops iterate. That if checks conditions. That return returns. Every single comment here is pure noise. DELETE ALL OF THEM.

**Crime 2: The Paraphraser**
```javascript
// Calculate the total price
const total = price * quantity;

// Apply discount to the total
const discounted = total * (1 - discount);

// Return the final amount
return discounted;
```
**The roast:** You've provided English subtitles for code that's already in plain English. "Calculate total" for `price * quantity`? Really? DELETE.

**Crime 3: The Step Counter**
```python
# Step 1: Initialize the connection
conn = db.connect()

# Step 2: Execute the query
result = conn.execute(query)

# Step 3: Process the results
data = process(result)

# Step 4: Close the connection
conn.close()
```
**The roast:** This isn't a recipe. We don't need step-by-step instructions for reading code top to bottom. DELETE.

**Crime 4: The Over-Documenter**
```java
/**
 * Validates the user input.
 *
 * This function takes a user input string and validates it
 * to ensure it meets the requirements. It checks if the input
 * is not null, not empty, and matches the expected format.
 *
 * @param input The input string to validate
 * @return true if valid, false otherwise
 */
public boolean validateInput(String input) {
    if (input == null) return false;
    if (input.isEmpty()) return false;
    return input.matches(PATTERN);
}
```
**The roast:** 8 lines of comments for 4 lines of self-explanatory code. The function is called `validateInput`. We can see what it does. DELETE the essay, keep only the param/return if you must.

**Crime 5: The TODO Graveyard**
```python
def process_data(data):
    # TODO: Add error handling
    # TODO: Implement caching
    # TODO: Add logging
    # TODO: Optimize performance
    # NOTE: This might need refactoring
    # FIXME: Handle edge cases
    return transform(data)
```
**The roast:** 6 TODO comments, zero actual code improvements. Either DO the thing or DELETE the comment. TODOs are not documentation, they're procrastination made visible.

**Crime 6: The Type Announcer**
```typescript
// String variable to store user name
const userName: string = getUser().name;

// Number variable for user age
const userAge: number = getUser().age;

// Boolean flag to check if user is active
const isActive: boolean = getUser().active;
```
**The roast:** You have TypeScript. The types are RIGHT THERE. You don't need comments announcing that a string is a string. DELETE.

**Crime 7: The Import Explainer**
```python
# Import the os module for operating system operations
import os

# Import sys module for system-specific parameters
import sys

# Import json module for JSON parsing and serialization
import json
```
**The roast:** We know what `import os` does. It imports os. This is what happens when AI generates code for people who've never seen Python. DELETE IMMEDIATELY.

**What comments to KEEP (very few):**
- Why a non-obvious approach was chosen
- Business logic that's not clear from code alone
- Warnings about gotchas or edge cases
- Links to specs/tickets for context

**Examples of GOOD comments:**
```python
# Using exponential backoff here because the API rate-limits aggressively
retry_with_backoff()

# Batch size of 500 chosen based on testing - higher causes OOM
for batch in chunks(data, 500):
    process(batch)

# DO NOT change this without updating the mobile client (ticket: T123456)
API_VERSION = "v2"
```

**The roast summary:** AI generates tutorial comments for code that doesn't need explaining. If your comment just translates code to English, you're wasting everyone's time. DELETE THEM ALL. Good code is self-documenting. Comments should explain WHY, not WHAT.

**Severity:** MAXIMUM - this is THE #1 sign of AI slop. Flag every unnecessary comment aggressively.

### 2. VACUOUS TESTS (The Tautology)

**What:** Tests that verify nothing meaningful.

**Crime 1: Testing boolean logic**
```cpp
EXPECT_TRUE(result == OK || result != OK);
```
This passes if the function returns ANYTHING, crashes, or summons demons. You're testing the law of excluded middle.

**Crime 2: The placeholder**
```cpp
EXPECT_TRUE(true);  // TODO: Write actual test
```
You're testing that `true == true`. This can never fail unless reality breaks.

**Crime 3: The imagination simulator**
```cpp
TEST(NetworkTest, TestsAuthority) {
  EXPECT_NO_THROW({
    bool isAuthority = true;  // Simulating what might happen
    if (isAuthority) {
      // Would update state
    }
  });
}
```
You're testing YOUR SIMULATION of what the code might do, not the actual code. This is fanfiction testing.

**Crime 4: The crash dummy**
```cpp
TEST(EdgeCases, HandlesNull) {
  myApi->processData(nullPtr);
  myApi->processData(emptyData);
  // No assertions - just hoping it doesn't crash
}
```
WHERE'S THE ASSERTION? You're calling functions and hoping. This isn't testing, it's Russian roulette.

**Crime 5: The maybe-maybe**
```cpp
EXPECT_TRUE(result == OK || result == ERROR);
```
"It either works or it doesn't" - WOW, SUCH SPECIFICITY. This passes with ANY error code. You're testing that functions return values.

**Crime 6: The setter test**
```cpp
obj.setValue(42);
EXPECT_EQ(obj.getValue(), 42);
```
Congrats, you've verified that C++ assignment works. Unless your setter has logic, this tests the compiler, not your code.

**Crime 7: The coverage padder**
```cpp
TEST(Init, WithParam1) { init(p1); EXPECT_TRUE(true); }
TEST(Init, WithParam2) { init(p2); EXPECT_TRUE(true); }
// ... 15 more identical tests
```
You wrote the same "test" 15 times with different params and zero assertions. This is what happens when engineers optimize for coverage metrics.

**The roast:** Your tests don't test. They gesture vaguely at code and call it a day. Coverage says 95% but actual verification is 0%.

### 3. ABSTRACTION INFLATION

**What:** Creating "enterprise frameworks" for simple scripts.

**Patterns:**
- Interfaces with one implementation
- Service/Repository layers for basic CRUD
- Factory for objects with one variant
- Builder for 2-3 field objects
- DI framework for a 50-line script

**Example:**
```python
# For a simple S3 upload script
class StorageService(ABC):
    @abstractmethod
    def upload(self, file: str) -> bool: pass

class AwsS3StorageService(StorageService):
    def upload(self, file: str) -> bool: ...

class LocalFsStorageService(StorageService):  # Never used
    def upload(self, file: str) -> bool: ...

class StorageServiceFactory:
    def create_storage_service(self) -> StorageService: ...
```

**The roast:** You've built a microservice architecture for what should be `boto3.upload_file()`. This is textbook AI slop - pattern-matching on "production ready" without understanding the problem.

### 4. CONTEXT-BLIND REINVENTION

**What:** Rewriting existing utils instead of using them.

**Example:**
```python
# Codebase already has:
def send_email(user: User, template_id: str): ...

# AI-generated duplicate:
def notify_user_via_email(user: User, template: str):
    import smtplib
    server = smtplib.SMTP('smtp.gmail.com', 587)
    # ... 30 lines of manual SMTP
```

**The roast:** There's literally a `send_email()` function. You reinvented email. This is what happens when the AI doesn't see your codebase and you don't bother to check.

### 5. CHATBOT BLEED

**What:** Conversational language in code.

**Patterns:**
- "I hope this helps!"
- "Certainly! Here's the implementation"
- "Let me know if you need anything else"
- "As of my last update..."

**Example:**
```python
def process_data(data):
    """
    Process the data and return results.
    I hope this helps! Let me know if you need anything else.
    """
    return data.process()
```

**The roast:** This is production code, not a chatbot conversation. If I wanted friendly banter I'd talk to the AI directly. DELETE this immediately.

### 6. CORPORATE JARGON IN CODE

**What:** Marketing speak in technical code.

**Examples:**
```python
def leverage_caching_mechanism_to_enhance_performance():
    """Utilizes sophisticated paradigm to facilitate optimization."""
    ...

# Better:
def cache_results():
    """Cache results for faster lookups."""
    ...
```

**The roast:** "Leverage" means "use". "Facilitate" means "enable". "Utilize" means "use". Stop writing like a management consultant. You're a programmer.

### 7. DUPLICATION DRIFT

**What:** Same types/functions defined multiple times.

**Example:**
```typescript
// file1.ts
interface User { id: string; name: string; email: string; }

// file2.ts
interface UserDto { id: string; name: string; email: string; }

// file3.ts - abandoned approach
interface UserModel { userId: string; userName: string; userEmail: string; }
```

**The roast:** Three nearly-identical User types. The third one is unused. This is what happens when AI generates code without seeing your types.

### 8. INCONSISTENT PARADIGM MASH

**What:** Mixing patterns randomly in the same file.

**Example:**
```javascript
async function getUserData(id) {
  return await db.query('SELECT * ...', [id]);
}

function getOrderData(id, callback) {  // Wait, callbacks?
  db.query('SELECT * ...', [id], callback);
}

const user = await User.findByPk(id);  // ORM
const orders = await db.raw('SELECT * ...');  // Raw SQL
```

**The roast:** Pick a pattern. You've got async/await next to callbacks, ORM next to raw SQL. This looks like you copy-pasted from three different tutorials.

### 9. SPEC BLEED

**What:** Prompt vocabulary leaking into code names.

**Example:**
```python
def implement_business_requirement_3_2():
    ...

class UltimateTierFeatureFlagV2AsRequested:
    ...

FEATURE_FLAG_FOR_NEW_PAYMENT_FLOW_FROM_TICKET_T123456 = True
```

**The roast:** Your variable names read like ticket descriptions. "AsRequested"? "requirement_3_2"? This is what happens when you paste tickets directly into prompts.

### 10. SLEEP-BASED TEST WAITS

**What:** Fixed sleeps instead of proper waiting.

**Example:**
```javascript
it("waits for job", async () => {
  startJob();
  await new Promise(r => setTimeout(r, 5000));  // Sleep 5s
  expect(await jobStatus()).toBe("done");
});
```

**The roast:** Fixed 5-second sleep. If the job finishes in 1s, you waste 4s. If it takes 6s, test fails. You need `waitForCondition()`, not prayers and timeouts.

## Detection Guidelines

**Signal Strength:**

**MAXIMUM SLOP (Definitely AI):**
- Conversational patterns in comments ("I hope this helps!")
- 10+ narrated/paraphrasing comments
- 5+ patterns across multiple categories
- Abstraction inflation + narrated code + vacuous tests

**Strong Signal (Very likely AI):**
- 5+ unnecessary comments
- 3-4 slop patterns
- Context-blind reinvention
- Multiple vacuous test patterns

**Moderate:**
- 2-3 unnecessary comments
- 1-2 patterns
- Could be junior dev, could be AI

**Strongest Individual Signals:**
1. 🔥🔥🔥 Comments that narrate obvious code (PRIORITY #1)
2. "I hope this helps!" in comments
3. Abstraction inflation for simple tasks
4. `EXPECT_TRUE(true)` or tautological assertions
5. Testing simulated behavior instead of actual code

## Output Format

```
═══════════════════════════════════════
  AI SLOP DETECTION REPORT
═══════════════════════════════════════

Source: [where the code came from]
Total slop found: [X] patterns
Signal: [MAXIMUM / STRONG / MODERATE / WEAK]

Slop Breakdown:
  💀 Comment Slop:           [count] ← PRIORITY
  Vacuous Tests:             [count]
  Abstraction Inflation:     [count]
  Duplication:               [count]
  Other Slop:                [count]

Verdict: [one-line summary]
```

### Detailed Findings

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[#] Pattern: [name]
Severity: [MAXIMUM / Strong / Moderate]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Location: [file:line]

🔴 Slop Found:
────────────────────────────────────────
[code snippet]
────────────────────────────────────────

💀 The Roast:
[Brutal but educational explanation]

✅ Fix:
────────────────────────────────────────
[Better version OR just DELETE]
────────────────────────────────────────
```

### Example

```
═══════════════════════════════════════
  AI SLOP DETECTION REPORT
═══════════════════════════════════════

Source: Uncommitted changes
Total slop found: 14 patterns
Signal: MAXIMUM

Slop Breakdown:
  💀 Comment Slop:           9 ← DELETE ALL
  Vacuous Tests:             2
  Abstraction Inflation:     2
  Chatbot Bleed:             1

Verdict: Peak AI slop - narrated like a tutorial, tested like a joke.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[1] Pattern: Comment Slop (Narrator)
Severity: MAXIMUM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Location: user_service.py:23-35

🔴 Slop Found:
────────────────────────────────────────
# Retrieve all users from the repository
all_users = user_repository.get_all_users()

# Create a list to store active users
active_users = []

# Iterate over every user
for user in all_users:
    # If user is active...
    if user.is_active:
        # ...add them to the active users list
        active_users.append(user)
────────────────────────────────────────

💀 The Roast:
You're explaining that `get_all_users()` gets all users. That loops iterate. That if checks conditions. This is what happens when AI writes code for people learning their first for loop. EVERY COMMENT HERE IS NOISE.

✅ Fix:
────────────────────────────────────────
active_users = [u for u in user_repository.get_all_users() if u.is_active]

# Or if you prefer verbose:
all_users = user_repository.get_all_users()
active_users = [u for u in all_users if u.is_active]

# ZERO COMMENTS NEEDED
────────────────────────────────────────

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[2] Pattern: Vacuous Test (Tautology)
Severity: MAXIMUM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Location: test_processor.cpp:45

🔴 Slop Found:
────────────────────────────────────────
TEST(Processor, HandlesResult) {
  auto result = process();
  EXPECT_TRUE(result == OK || result != OK);
}
────────────────────────────────────────

💀 The Roast:
This test passes if the function returns ANYTHING. It could return `ERROR_ALIEN_INVASION` and this would pass. You're testing the law of excluded middle. This is the testing equivalent of "the patient is either alive or not alive" - technically true, medically useless.

✅ Fix:
────────────────────────────────────────
TEST(Processor, ReturnsOkOnValidInput) {
  auto result = process(validInput);
  EXPECT_EQ(result, OK);
}

TEST(Processor, ReturnsErrorOnInvalidInput) {
  auto result = process(invalidInput);
  EXPECT_EQ(result, ERROR_INVALID_INPUT);
}
────────────────────────────────────────
```

## User Options

After showing the report:

```
Found [X] slop patterns. What now?

1. Delete all comment slop (recommended)
2. Fix all MAXIMUM severity patterns
3. Fix all patterns
4. Let me pick which to fix
5. Just show me the report (no edits)

Pick (1-5): _
```

## What This Skill Does NOT Check

This skill focuses ONLY on slop (redundant/unreadable/complex code). It does NOT check:
- Security vulnerabilities
- Performance issues
- Algorithmic correctness
- General bad practices

If you want security review, use other tools. This is for catching AI-generated garbage that makes code painful to read and maintain.

## Quick Ref: Top Slop Signals

Priority order:
1. 🔥🔥🔥 Comments narrating obvious code (DELETE THESE FIRST)
2. "I hope this helps!" (instant giveaway)
3. `EXPECT_TRUE(true)` or tautologies
4. Abstraction for simple scripts
5. Reinventing existing utils
6. Same test 10+ times with different params
7. Corporate jargon ("leverage", "utilize")
8. Spec bleed in names ("requirement_3_2")

## The Mission

Code slop wastes time. Narrated comments are noise. Vacuous tests give false confidence. Over-abstraction makes simple things complex. AI generates this slop because it pattern-matches on "production code" without understanding context.

This skill roasts it mercilessly and helps you delete it.

**Be brutal. Be specific. Delete the slop. Especially the comments.**
