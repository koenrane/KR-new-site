import os
import proselint
import re


def lint_markdown_files(directory):
    """Runs proselint on all Markdown files in the specified directory."""

    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(".md"):
                filepath = os.path.join(root, file)
                with open(filepath, "r") as md_file:
                    output = proselint.tools.lint(md_file.read())

                # Process proselint output
                suggestions = re.findall(r"line (\d+): (.+) \[(.+)\]", output)
                for line_num, suggestion, error_code in suggestions:
                    with open(filepath, "r") as md_file:
                        lines = md_file.readlines()

                    context = "".join(lines[max(0, int(line_num) - 3) : int(line_num)])

                    response = input(
                        f"\nFile: {filepath}\nLine {line_num}:\nContext:\n{context}\nSuggestion: {suggestion}\nApply fix? (y/n/q): "
                    )
                    if response.lower() == "y":
                        lines[int(line_num) - 1] = proselint_fix(
                            lines[int(line_num) - 1], suggestion
                        )
                        with open(filepath, "w") as md_file:
                            md_file.writelines(lines)
                    elif response.lower() == "q":
                        return  # Quit if the user enters 'q'


def proselint_fix(line, suggestion):
    """Crudely applies suggested fixes from proselint. Could be improved based on specific error codes."""
    return line.replace(suggestion.split("[")[0], "").strip() + "\n"


if __name__ == "__main__":
    directory = input("Enter the directory to check for Markdown files: ")
    lint_markdown_files(directory)
