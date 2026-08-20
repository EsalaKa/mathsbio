#!/usr/bin/env python3
"""Fail when an HTML page contains common broken MathsBio MathJax delimiters.

Run from the repository root:
    python scripts/validate_math_delimiters.py
"""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []

for path in ROOT.rglob("*.html"):
    text = path.read_text(encoding="utf-8")

    # The site standard is \(...\) for inline mathematics and \[...\] for display mathematics.
    if "displayMath:[['\\\\[','\\\\)']]" in text or "displayMath: [['\\\\[', '\\\\)']]" in text:
        errors.append((path, "MathJax configuration opens display maths with \\[ but closes it with \\). Use \\]."))

    # Check delimiter counts in page source. Ignore escaped JS configuration literals.
    body = re.sub(r"window\.MathJax\s*=.*?</script>", "", text, flags=re.S)
    inline_open = len(re.findall(r"\\\(", body))
    inline_close = len(re.findall(r"\\\)", body))
    display_open = len(re.findall(r"\\\[", body))
    display_close = len(re.findall(r"\\\]", body))
    if inline_open != inline_close:
        errors.append((path, f"unbalanced inline maths delimiters: {inline_open} opening, {inline_close} closing"))
    if display_open != display_close:
        errors.append((path, f"unbalanced display maths delimiters: {display_open} opening, {display_close} closing"))

if errors:
    print("Math delimiter validation FAILED:\n")
    for path, message in errors:
        print(f"- {path.relative_to(ROOT)}: {message}")
    sys.exit(1)

print("Math delimiter validation passed for all HTML pages.")
