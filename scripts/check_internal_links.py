import subprocess


def run_linkchecker(url_pattern: str = "public/**html"):
    try:
        result = subprocess.run(
            [
                "linkchecker",
                # "--check-extern",  # Check both internal and external links
                "--ignore-url=^mailto:",
                url_pattern,
            ],
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout.splitlines()
    except subprocess.CalledProcessError as e:
        print(f"Error running linkchecker: {e}")
        return []


def main():
    errors = run_linkchecker()

    if errors:
        print(f"Internal link errors found: {errors}")
    else:
        print("No internal link errors found.")


if __name__ == "__main__":
    main()
