import subprocess
import json

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
