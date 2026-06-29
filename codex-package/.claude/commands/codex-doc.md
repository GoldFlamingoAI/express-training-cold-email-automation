Generate structured markdown documentation for the component or file specified by the user.

Read the source file first. Then produce documentation that includes:
- Purpose — what this component does and why it exists
- Inputs and outputs (or props, args, parameters)
- Key dependencies
- Usage example
- Any gotchas or non-obvious behavior

Write it as if explaining to a developer joining the project for the first time.

Save the output as a .md file in the same directory as the source file, named
after the component (e.g. `auth.md` for `auth.py`). Confirm the file path to
the user when done.
