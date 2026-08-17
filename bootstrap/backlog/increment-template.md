# <Increment Title>

---

This is a self-describing backlog increment, and contains information about
both the workflow and the increment.

Blockquotes that begin `> Instruction: ` have instructions about the _workflow_.
Some instruction blocks may be deleted once fulfilled. Act as instructed.

> Instruction: workflow
>
> Increments can move between these states:
> `maybe-later <-> todo -> in-progress -> done`
>
> `backlog/` has a sub-directory for each state:
> - You MUST transition an increment between states by moving the file
> - You MUST then act on lifecycle instructions in the file
> - You SHOULD prefer history-preserving commands such as `git mv`
> - You SHOULD then commit the file

> Instruction: new increments
>
> To instantiate a new increment, copy this template file into `backlog/todo` or
> `backlog/maybe-later`. The filename MUST conform to `<code>-<descriptive-slug>.md`,
> where `<code>` MUST be generated using `od -An -N3 -tx1 /dev/urandom | tr -d ' \n'`
>
> Example `backlog/todo/4c9f2a-add-auth-export.md`
>
> You MAY delete this block, after creating the new file

---

> Instruction: on entry to `todo` or `maybe-later`
>
> You are scoping and analysing the increment:
> - You MUST set the increment title at the top of the file
> - You MUST complete all the sub-sections under "Scope"
> - You SHOULD NOT complete "Implementation Plan", unless instructed to do so
> - IF the increment is `maybe-later`, you MAY leave a partially-complete "Scope" section

## Scope

### Goal

TODO: What are we trying to achieve? Written as a statement, not a checklist.

### Context

TODO: What exists today, the constraints, and why now. Link or reference related work.

### Done When

- [ ] TODO: What must be true to consider this complete?

### Uncertainties

- [ ] TODO: What might we be wrong about? Things to confirm before or during the work.

### Notes and analysis

TODO: Anything useful for the future implementation phase.

---

> Instruction: on entry to `in-progress`
>
> You are designing, planning and then implementing the increment:
> - You MUST get approval of "Done When" criteria (above) BEFORE moving to `in-progress`
> - You MUST capture an "Implementation Plan" in the sub-sections below, in detail
> - You SHOULD record enough context that implementation can proceed in multiple sessions
> - You MAY plan multiple phases. Add sections as required
> - You MUST NOT complete the "Increment Close" section

## Implementation Plan

### Phase 1

- [ ] TODO: implementation steps and detailed designs

### Tests

- [ ] TODO: Automated tests that must be created and/or passing
- [ ] TODO: Manual tests and verification

---

> Instruction: on entry to `done`
>
> You are closing the increment:
> - You MUST get approval BEFORE moving to `done`
> - You MUST ensure "Done When" criteria are met BEFORE moving to `done`
> - You MUST ensure "Tests" are passing and verified BEFORE moving to `done`
> - You MUST then complete all the sub-sections under "Increment Close"
> - Once complete, summarise the opportunities for improvement from "Reflection"

## Increment Close

### Documents Updated

- TODO: list the product documents that were updated after the increment
- TODO: list the design documents that were updated after the increment

### Reflection

Reflections on the increment, sources of friction and potential future process improvement:

- TODO: **Manual work** — anything done by-hand that could have been automated or handled by an agent
- TODO: **Code, architecture, refactoring** — anything that would assist smooth future development, improve code simplicity or aid comprehension. Candidates for code refactor
- TODO: **Tech choices** — is a dependency or tool causing problems? Is there anything worth adopting or replacing?
- TODO: **Increment file/template** — friction or confusion in the backlog increment workflow
