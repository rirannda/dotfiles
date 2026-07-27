#!/usr/bin/env python3

import configparser
import os
import re
import sys
from pathlib import Path

ICON_DIRS = [
    Path("/usr/share/icons"),
    Path("/usr/share/pixmaps"),
    Path(os.path.expanduser("~/.local/share/icons")),
]

DESKTOP_DIRS = [
    Path("/usr/share/applications"),
    Path(os.path.expanduser("~/.local/share/applications")),
    Path("/var/lib/flatpak/exports/share/applications"),
    Path(os.path.expanduser("~/.local/share/flatpak/exports/share/applications")),
]

ICON_EXTS = [".svg", ".png", ".xpm", ".ico", ".jpg", ".jpeg", ".webp"]


def normalize(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", text.lower())


def expand_candidate(value: str) -> str:
    if not value:
        return ""

    text = value.strip().strip('"').strip("'")
    if text.startswith("file://"):
        return text[7:]

    if text.startswith("image://icon/"):
        text = text[len("image://icon/"):]
        text = text.split("?", 1)[0]

    return os.path.expanduser(text)


def find_icon_file(name: str) -> str:
    candidate = Path(name)
    stems = []

    if candidate.suffix:
        stems.append(candidate.stem)
    else:
        stems.append(candidate.name)

    if candidate.name.endswith("-symbolic"):
        stems.append(candidate.name.replace("-symbolic", ""))

    for root in ICON_DIRS:
        if not root.exists():
            continue

        for stem in stems:
            for ext in ICON_EXTS:
                for relative in [
                    f"**/{stem}{ext}",
                    f"**/{stem}-symbolic{ext}",
                    f"**/{stem}.symbolic{ext}",
                ]:
                    matches = sorted(root.glob(relative))
                    if matches:
                        return str(matches[0])

    if candidate.is_file():
        return str(candidate)

    return ""


def read_desktop_entry(path: Path):
    try:
        config = configparser.ConfigParser(interpolation=None)
        config.read(path)
        if "Desktop Entry" not in config:
            return None

        entry = config["Desktop Entry"]
        if entry.get("NoDisplay", "false").lower() == "true":
            return None
        if entry.get("Hidden", "false").lower() == "true":
            return None

        return entry
    except Exception:
        return None


def entry_matches(entry, query: str, desktop_name: str) -> bool:
    if not query:
        return False

    normalized_query = normalize(query)
    if not normalized_query:
        return False

    fields = [
        entry.get("Name", ""),
        entry.get("GenericName", ""),
        entry.get("Comment", ""),
        entry.get("Exec", ""),
        entry.get("TryExec", ""),
        desktop_name,
    ]
    fields.extend(entry.get("Keywords", "").split(";"))

    for field in fields:
        if not field:
            continue

        normalized_field = normalize(field)
        if normalized_query == normalized_field or normalized_query in normalized_field or (len(normalized_field) >= 3 and normalized_field in normalized_query):
            return True

    return False


def icon_from_desktop(query: str) -> str:
    if not query:
        return ""

    for directory in DESKTOP_DIRS:
        if not directory.exists():
            continue

        for desktop_path in sorted(directory.glob("*.desktop")):
            entry = read_desktop_entry(desktop_path)
            if entry is None:
                continue

            if not entry_matches(entry, query, desktop_path.stem):
                continue

            icon = entry.get("Icon", "").strip()
            resolved = expand_candidate(icon)
            if resolved:
                if Path(resolved).is_file():
                    return resolved

                file_icon = find_icon_file(resolved)
                if file_icon:
                    return file_icon

            if icon:
                file_icon = find_icon_file(icon)
                if file_icon:
                    return file_icon

    return ""


def main() -> int:
    primary = expand_candidate(sys.argv[1] if len(sys.argv) > 1 else "")
    query = (sys.argv[2] if len(sys.argv) > 2 else "").strip()

    if primary:
        path = Path(primary)
        if path.is_file():
            print(str(path))
            return 0

        icon_path = find_icon_file(primary)
        if icon_path:
            print(icon_path)
            return 0

    if query:
        icon_path = icon_from_desktop(query)
        if icon_path:
            print(icon_path)
            return 0

    if primary:
        icon_path = find_icon_file(primary)
        if icon_path:
            print(icon_path)
            return 0

    return 0


if __name__ == "__main__":
    raise SystemExit(main())