import pytest
from bs4 import BeautifulSoup
from pathlib import Path
import sys
sys.path.append(str(Path(__file__).parent.parent))

from .. import built_site_checks 

from built_site_checks import (
    check_localhost_links,
    check_invalid_anchors,
    check_problematic_paragraphs,
    parse_html_file,
    check_file_for_issues,
)

@pytest.fixture
def sample_html():
    return """
    <html>
    <body>
        <a href="http://localhost:8000">Localhost Link</a>
        <a href="https://turntrout.com">Turntrout Link</a>
        <a href="https://turntrout.com#invalid-anchor">Turntrout Link with Anchor</a>
        <a href="#valid-anchor">Valid Anchor</a>
        <a href="#invalid-anchor">Invalid Anchor</a>
        <div id="valid-anchor">Valid Anchor Content</div>
        <p>Normal paragraph</p>
        <p>Table: This is a table description</p>
        <p>Figure: This is a figure caption</p>
        <p>Code: This is a code snippet</p>
    </body>
    </html>
    """

@pytest.fixture
def sample_soup(sample_html):
    return BeautifulSoup(sample_html, 'html.parser')

def test_check_localhost_links(sample_soup):
    result = check_localhost_links(sample_soup)
    assert result == ['http://localhost:8000']

def test_check_invalid_anchors(sample_soup):
    result = check_invalid_anchors(sample_soup)
    assert set(result) == {'#invalid-anchor', 'https://turntrout.com#invalid-anchor'}

def test_check_problematic_paragraphs(sample_soup):
    result = check_problematic_paragraphs(sample_soup)
    assert len(result) == 3
    assert 'Table: This is a table description' in result
    assert 'Figure: This is a figure caption' in result
    assert 'Code: This is a code snippet' in result
    assert "Normal paragraph" not in result

def test_parse_html_file(tmp_path):
    file_path = tmp_path / "test.html"
    file_path.write_text("<html><body><p>Test</p></body></html>")
    result = parse_html_file(file_path)
    assert isinstance(result, BeautifulSoup)
    assert result.find('p').text == 'Test'

def test_check_file_for_issues(tmp_path):
    file_path = tmp_path / "test.html"
    file_path.write_text("""
    <html>
    <body>
        <a href="https://localhost:8000">Localhost Link</a>
        <a href="#invalid-anchor">Invalid Anchor</a>
        <p>Table: Test table</p>
    </body>
    </html>
    """)
    localhost_links, invalid_anchors, problematic_paragraphs = check_file_for_issues(file_path)
    assert localhost_links == ['https://localhost:8000']
    assert invalid_anchors == ['#invalid-anchor']
    assert problematic_paragraphs == ['Table: Test table']
