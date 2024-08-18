import subprocess
import json
import requests

def run_linkchecker(url):
    try:
        result = subprocess.run(
            [
                "linkchecker",
                "--check-extern",  # Check both internal and external links
                "--recursion-level=1",
                "--no-status",
                "--ignore-url=^mailto:",
                "--output=csv",
                url
            ],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.splitlines()
    except subprocess.CalledProcessError as e:
        print(f"Error running linkchecker: {e}")
        return []

def check_links(base_url):
    results = run_linkchecker(base_url)
    internal_errors = []

    for line in results[1:]:  # Skip the header line
        parts = line.split(';')
        if len(parts) >= 8 and parts[0] != "Valid":
            url = parts[1]
            parent_url = parts[2]
            error_message = parts[7]
            if url.startswith(base_url):
                internal_errors.append({
                    "url": url,
                    "parent_url": parent_url,
                    "info": error_message
                })

    return internal_errors

def check_important_pages(base_url):
    important_pages = [
        "/search",
        "/faq",
        "/installation",
    ]
    errors = []

    for page in important_pages:
        response = requests.get(f"{base_url}{page}")
        if response.status_code != 200:
            errors.append(f"{page}: HTTP {response.status_code}")

    return errors

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

    print("\nChecking important documentation pages:")
    important_page_errors = check_important_pages(base_url)
    if important_page_errors:
        print("Errors in important pages:")
        for error in important_page_errors:
            print(f"- {error}")
    else:
        print("All important pages are accessible.")

if __name__ == "__main__":
    main()
