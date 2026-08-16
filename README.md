# backlog

An attempt at the simplest agent-friendly task/increment workflow that can work:

- Increments are scoped, designed, planned on the filesystem
- Each increment is spawned from a template, then tracked in a single file
- Increment files are self-contained, workflow instructions live in the increment file
- Tailor the increment template to your needs and preferences

Heavily inspired by [how we ship with AI](https://blog.umans.ai/blog/how-we-ship-with-ai/).

---

# Bootstrap your repo

From this repo:

- Copy the skeleton in `bootstrap/backlog/` into your repo at `backlog/`
- Then `backlog/AGENTS.backlog.md` (your repo) will contain lines for your `AGENTS.md`. Copy them and delete the file

From the bootstrap script:

- `curl -sfL https://raw.githubusercontent.com/tiernacity/backlog/main/bootstrap.sh | sh`
- The script will:
  - refuse to modify a pre-existing `backlog/` directory
  - seed a `backlog/` directory with the contents of `bootstrap/backlog/` in this repo
  - copies `AGENTS.md` content into `AGENTS.backlog.md`
  - instructs you to move the `AGENTS.md` content, and tailor your increment template/workflow

---

# How it works

- New increments are created by cloning `backlog/increment-template.md`
- Increments transition between states by moving the file:
  - maybe-later: parked
  - todo: scoped, committed
  - in-progress: designed, planned and being implemented
  - done: completed

Inspect `AGENTS.md` and `backlog/increment-template.md` to understand the workflow
