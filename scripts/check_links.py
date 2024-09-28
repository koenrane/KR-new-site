import os
import sys
import utils as script_utils
from pathlib import Path
from bs4 import BeautifulSoup

def check_file_for_localhost_links(file_path: Path) -> list[str]:
    """
    Check a single HTML file for localhost links.
    
    Args:
    file_path (Path): Path to the HTML file to check.
    
    Returns:
    list: A list of localhost links found in the file.
    """
    with open(file_path, 'r', encoding='utf-8') as file:
        content = file.read()
        # Parse the HTML content
        soup = BeautifulSoup(content, 'html.parser')
        # Find all anchor tags with href attribute
        links = soup.find_all('a', href=True)
        
        localhost_links = []
        for link in links:
            href = link['href']
            # Check if the href starts with localhost or http(s)://localhost
            if href.startswith('localhost:') or href.startswith('http://localhost') or href.startswith('https://localhost'):
                localhost_links.append(href)
        
        return localhost_links

def main() -> None:
    """
    Main function to check all HTML files in the public directory for localhost links.
    """
    # Get the path to the public directory
    public_dir: Path = Path(script_utils.get_git_root(), 'public')
    localhost_links_found: bool = False

    # Walk through all files in the public directory
    for root, dirs, files in os.walk(public_dir):
        for file in files:
            if file.endswith('.html'):
                file_path = os.path.join(root, file)
                localhost_links = check_file_for_localhost_links(file_path)
                if localhost_links:
                    print(f"Found localhost links in {file_path}:")
                    for link in localhost_links:
                        print(f"  - {link}")
                    localhost_links_found = True

    if localhost_links_found:
        sys.exit(1)

if __name__ == "__main__":
    main()
