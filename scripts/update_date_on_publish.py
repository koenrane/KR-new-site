import os
from datetime import datetime
import yaml
import glob


def update_publish_date():
    # Find all markdown files in the content directory
    md_files = glob.glob("content/*.md")

    for file_path in md_files:
        # Read the file
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Split frontmatter and content
        parts = content.split("---", 2)
        if len(parts) < 3:
            print(f"Skipping {file_path}: No valid frontmatter found")
            continue

        # Parse YAML frontmatter
        try:
            metadata = yaml.safe_load(parts[1])
            if not metadata:
                metadata = {}
        except yaml.YAMLError as e:
            print(f"Error parsing YAML in {file_path}: {str(e)}")
            raise  # Add this line to raise the YAML parsing error

        # Check if date_published exists and is empty or missing
        if "date_published" not in metadata or not metadata["date_published"]:
            # Set current date in MM/DD/YYYY format
            current_date = datetime.now().strftime("%m/%d/%Y")
            metadata["date_published"] = current_date

            # Write back to file
            with open(file_path, "w", encoding="utf-8") as f:
                f.write("---\n")
                f.write(yaml.dump(metadata, sort_keys=False, allow_unicode=True))
                f.write("---\n")
                f.write(parts[2])
            print(f"Updated {file_path} with publish date: {current_date}")


if __name__ == "__main__":
    update_publish_date()
