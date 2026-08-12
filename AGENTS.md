## Dependencies vs hand-crafted code

- Prefer a well-tested, actively-supported dependency over hand-crafted code
- If no dependency is a good fit, building our own is an allowable choice
- New deps MUST respect the repo's `min-release-age=` supply-chain protection

## Code comments

- Code comments MUST be concise
- Code comments MUST ONLY be added if necessary for clarity or to avoid future regressions
- Code comments MUST ONLY describe the code that's implemented
- Code comments MUST NOT record historical designs, decisions or changes
- Code comments MUST NOT reference github issues or PRs
- Code comments SHOULD avoid jargon, unless it is necessary and has been defined
- Historic code comments that do not follow these rules MAY be updated
