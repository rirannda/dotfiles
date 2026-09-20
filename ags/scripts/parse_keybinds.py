#!/usr/bin/env python3
"""Parse Hyprland Lua keybind files and emit categorized JSON for AGS."""

from __future__ import annotations

import ast
import json
import os
import re
import sys
from collections import OrderedDict


KEY_NAMES = {
    "space": "Space", "Return": "Enter", "left": "←", "right": "→",
    "up": "↑", "down": "↓", "mouse_down": "Scroll ↓",
    "mouse_up": "Scroll ↑", "mouse:272": "LClick", "mouse:273": "RClick",
    "XF86AudioRaiseVolume": "Vol ↑", "XF86AudioLowerVolume": "Vol ↓",
    "XF86AudioMute": "Mute", "XF86AudioMicMute": "Mic Mute",
    "XF86MonBrightnessUp": "Bri ↑", "XF86MonBrightnessDown": "Bri ↓",
    "XF86AudioPlay": "Play/Pause", "XF86AudioPause": "Play/Pause",
    "XF86AudioNext": "Next", "XF86AudioPrev": "Prev",
}
MOD_NAMES = {"SUPER": "Super", "SHIFT": "Shift", "CTRL": "Ctrl", "ALT": "Alt"}
PANEL_NAMES = {
    "dashboard": "Dashboard", "quicksettings": "Quick Settings",
    "chatgpt": "ChatGPT", "launcher": "Application Launcher",
    "clipboard": "Clipboard", "cheatsheet": "Keyboard Shortcuts",
    "calendar": "Calendar", "media": "Media", "notifications": "Notifications",
}


def quoted(value: str) -> str | None:
    value = value.strip()
    if len(value) >= 2 and value[0] in "\"'" and value[-1] == value[0]:
        try:
            return str(ast.literal_eval(value))
        except (ValueError, SyntaxError):
            return value[1:-1]
    return None


def concat(expr: str, env: dict[str, str]) -> str:
    parts = re.split(r"\s*\.\.\s*", expr.strip())
    result = []
    for part in parts:
        literal = quoted(part)
        if literal is not None:
            result.append(literal)
        else:
            result.append(env.get(part.strip(), part.strip()))
    return "".join(result)


def split_top_level(source: str) -> list[str]:
    parts, start, depth, quote, escape = [], 0, 0, None, False
    for index, char in enumerate(source):
        if quote:
            if escape:
                escape = False
            elif char == "\\":
                escape = True
            elif char == quote:
                quote = None
            continue
        if char in "\"'":
            quote = char
        elif char in "({[":
            depth += 1
        elif char in ")}]":
            depth -= 1
        elif char == "," and depth == 0:
            parts.append(source[start:index].strip())
            start = index + 1
    parts.append(source[start:].strip())
    return parts


def bind_calls(source: str):
    marker = "hl.bind("
    cursor = 0
    while True:
        start = source.find(marker, cursor)
        if start < 0:
            return
        index = start + len(marker)
        depth, quote, escape = 1, None, False
        while index < len(source) and depth:
            char = source[index]
            if quote:
                if escape:
                    escape = False
                elif char == "\\":
                    escape = True
                elif char == quote:
                    quote = None
            elif char in "\"'":
                quote = char
            elif char == "(":
                depth += 1
            elif char == ")":
                depth -= 1
            index += 1
        if depth == 0:
            yield start, split_top_level(source[start + len(marker):index - 1])
        cursor = max(index, start + len(marker))


def key_parts(combo: str) -> list[str]:
    result = []
    for raw in re.split(r"\s*\+\s*", combo.strip()):
        if not raw:
            continue
        value = MOD_NAMES.get(raw.upper(), KEY_NAMES.get(raw, raw.upper() if len(raw) == 1 else raw))
        result.append(value)
    return result


def call_arg(action: str, name: str) -> str:
    match = re.search(rf"{re.escape(name)}\((.*)\)\s*$", action, re.S)
    return match.group(1).strip() if match else ""


def describe(action: str, env: dict[str, str]) -> tuple[str, str]:
    if "hl.dsp.exec_cmd" in action:
        command = concat(call_arg(action, "hl.dsp.exec_cmd"), env)
        panel = re.search(r"ags request .*? toggle\s+(\w+)$", command)
        if panel:
            name = PANEL_NAMES.get(panel.group(1), panel.group(1).replace("_", " ").title())
            return "AGS", name
        quickshell = re.search(r"quickshell_(\w+)", command)
        if quickshell:
            return "Shell", f"QuickShell {quickshell.group(1).replace('_', ' ').title()}"
        if "screenshot" in command:
            mode = command.rsplit(" ", 1)[-1].title()
            return "Screenshots", f"Screenshot {mode}"
        executable = os.path.basename(command.split()[0]) if command else "Command"
        labels = {
            "kitty": "Terminal", "Thunar": "File Manager", "wofi": "Application Launcher",
            "hyprlock": "Lock Screen", "brave-origin": "Brave", "discord": "Discord",
            "deepin-calculator": "Calculator", "rog-control-center": "ROG Control Center",
        }
        return "Applications", labels.get(executable, command or "Run Command")

    if "hl.dsp.window.close" in action:
        return "Windows", "Close Active Window"
    if "hl.dsp.window.float" in action:
        return "Windows", "Toggle Floating"
    if "hl.dsp.window.pseudo" in action:
        return "Windows", "Toggle Pseudo Tile"
    if "hl.dsp.window.fullscreen" in action:
        return "Windows", "Toggle Fullscreen"
    if "hl.dsp.window.drag" in action:
        return "Windows", "Move Window"
    if "hl.dsp.window.resize" in action:
        return "Windows", "Resize Window"
    if "hl.dsp.window.move" in action:
        workspace = re.search(r"workspace\s*=\s*([^,}]+)", action)
        target = concat(workspace.group(1), env) if workspace else "Workspace"
        return "Workspaces", f"Move Window to Workspace {target}"
    if "hl.dsp.workspace.toggle_special" in action:
        target = concat(call_arg(action, "hl.dsp.workspace.toggle_special"), env)
        return "Workspaces", f"Toggle Special Workspace {target}"
    if "hl.dsp.focus" in action:
        workspace = re.search(r"workspace\s*=\s*([^,}]+)", action)
        if workspace:
            return "Workspaces", f"Go to Workspace {concat(workspace.group(1), env)}"
        direction = re.search(r"direction\s*=\s*([^,}]+)", action)
        target = concat(direction.group(1), env).title() if direction else "Direction"
        return "Windows", f"Focus {target}"
    if "hl.dsp.layout" in action:
        return "Windows", f"Layout {concat(call_arg(action, 'hl.dsp.layout'), env)}"
    if "hl.dsp.exit" in action:
        return "System", "Exit Hyprland"
    return "Other", re.sub(r"\s+", " ", action).strip()


def parse_file(path: str):
    with open(path, encoding="utf-8") as file:
        source = file.read()
    env = {
        name: value
        for name, quote, value in re.findall(r"local\s+(\w+)\s*=\s*([\"'])(.*?)\2", source)
    }
    for _, args in bind_calls(source):
        if len(args) < 2:
            continue
        key_expr, action = args[0], args[1]
        expanded = range(1, 11) if re.search(r"\bkey\b", key_expr) else [None]
        for number in expanded:
            local_env = dict(env)
            if number is not None:
                local_env.update(i=str(number), key=str(number % 10))
            combo = concat(key_expr, local_env)
            if combo.startswith("switch:"):
                continue
            keys = key_parts(combo)
            if not keys:
                continue
            section, desc = describe(action, local_env)
            yield section, keys, desc


def main():
    paths = sys.argv[1:] or [
        os.path.expanduser("~/.config/hypr/keybinds.lua"),
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "hyprland-ags.lua"),
    ]
    rows: OrderedDict[str, tuple[str, list[str], str]] = OrderedDict()
    for path in paths:
        if not os.path.isfile(path):
            continue
        for section, keys, desc in parse_file(path):
            rows["\x1f".join(keys)] = (section, keys, desc)

    sections: OrderedDict[str, list[dict]] = OrderedDict()
    for section, keys, desc in rows.values():
        sections.setdefault(section, []).append({"keys": keys, "desc": desc})
    print(json.dumps(
        [{"section": section, "binds": binds} for section, binds in sections.items()],
        ensure_ascii=False,
    ))


if __name__ == "__main__":
    main()
