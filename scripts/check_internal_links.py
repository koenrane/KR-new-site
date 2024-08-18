import subprocess
import json
import requests

def run_linkchecker(url):
    result = subprocess.run(
        [
            "linkchecker",
            "--check-intern-only",  # Only check internal links
            "--recursion-level=1",
            "--output=json",
            url
        ],
        capture_output=True,
        text=True
    )
    return json.loads(result.stdout)

def check_links(base_url):
    results = run_linkchecker(base_url)
    internal_errors = []

    for result in results:
        if result.get("valid") == "False":
            internal_errors.append(result)

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
