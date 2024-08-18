import subprocess
import json
import requests


def run_linkchecker(url):
    try:
        result = subprocess.run(
            [
                "linkchecker",
                # "--check-extern",  # Check both internal and external links
                "--recursion-level=1",
                "--no-status",
                "--ignore-url=^mailto:",
                "--output=csv",
                url,
            ],
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout.splitlines()
    except subprocess.CalledProcessError as e:
        print(f"Error running linkchecker: {e}")
        return []


def check_links(base_url):
    results = run_linkchecker(base_url)
    internal_errors = []
    print(results)

    for line in results[1:]:  # Skip the header line
        parts = line.split(";")
        if len(parts) >= 8 and parts[0] != "Valid":
            url = parts[1]
            parent_url = parts[2]
            error_message = parts[7]
            if url.startswith(base_url):
                internal_errors.append(
                    {
                        "url": url,
                        "parent_url": parent_url,
                        "info": error_message,
                    }
                )

    return internal_errors


def main():
    base_url = "http://localhost:8080"  # Replace with your local development server URL

    print(f"Checking internal links for {base_url}")
    errors = check_links(base_url)

    if errors:
        print("Internal link errors found:")
        for error in errors:
            print(f"- {error['url']}: {error['info']}")
    else:
        print("No internal link errors found.")


if __name__ == "__main__":
    main()
