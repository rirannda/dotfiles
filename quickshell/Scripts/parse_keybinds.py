#!/usr/bin/env python3
"""Parse hyprland keybinds.conf and neovim keymaps.lua, output JSON for KeybindsCheatSheet."""

import json
import os
import re
import sys

KEY_MAP = {
    "Return": "Enter",
    "SPACE": "Space",
    "Tab": "Tab",
    "left": "←",
    "right": "→",
    "up": "↑",
    "down": "↓",
    "mouse_down": "Scroll ↓",
    "mouse_up": "Scroll ↑",
    "mouse:272": "LClick",
    "mouse:273": "RClick",
    "XF86AudioRaiseVolume": "Vol ↑",
    "XF86AudioLowerVolume": "Vol ↓",
    "XF86AudioMute": "Mute",
    "XF86AudioMicMute": "Mic Mute",
    "XF86MonBrightnessUp": "Bri ↑",
    "XF86MonBrightnessDown": "Bri ↓",
    "XF86AudioPlay": "Play/Pause",
    "XF86AudioNext": "Next",
    "XF86AudioPrev": "Prev",
    "XF86AudioStop": "Stop",
}

MOD_MAP = {
    "$mainMod": "Super",
    "SUPER": "Super",
    "SHIFT": "Shift",
    "CTRL": "Ctrl",
    "ALT": "Alt",
}

NVIM_KEY_MAP = {
    "<Esc>": "Esc",
    "<C-h>": "Ctrl+H",
    "<C-j>": "Ctrl+J",
    "<C-k>": "Ctrl+K",
    "<C-l>": "Ctrl+L",
    "<C-Up>": "Ctrl+↑",
    "<C-Down>": "Ctrl+↓",
    "<C-Left>": "Ctrl+←",
    "<C-Right>": "Ctrl+→",
    "<S-h>": "Shift+H",
    "<S-l>": "Shift+L",
    "<leader>": "Space",
}


def parse_mods(mod_str):
    parts = re.split(r"[\s]+", mod_str.strip())
    return [MOD_MAP.get(p, p) for p in parts if p]


def parse_key(key_str):
    k = key_str.strip()
    return KEY_MAP.get(k, k.upper() if len(k) == 1 else k)


def parse_keybinds(filepath):
    SECTION_MERGE_HYPR = {
        "Applications": "System",
        "Tools": "System",
        "Quickshell Widgets": "System",
        "Volume": "Media",
        "Brightness": "Media",
        "Media Player": "Media",
        "Window Management": "Windows",
        "Window Groups": "Windows",
        "Navigation": "Windows",
        "Mouse Binds": "Windows",
        "Workspaces": "Workspaces",
    }

    def is_section_header(comment):
        text = comment.strip().lower()
        if not text:
            return False
        if text.startswith("hyprland keybindings"):
            return False
        if text.startswith("this file is sourced"):
            return False
        if text.startswith("extracted from hyprland.conf"):
            return False
        return True

    def describe_hypr_bind(action, arg, raw_line):
        action = action.strip()
        arg = arg.strip()

        if action == "exec":
            if arg.startswith("socat - UNIX-CONNECT:/tmp/quickshell_"):
                name = arg.split("/tmp/quickshell_", 1)[1].strip()
                name = name.replace("\n", " ")
                if name.endswith(" "):
                    name = name.strip()
                return name.replace("_", " ").title()
            if "screenshot.sh" in arg:
                if " full" in arg:
                    return "Screenshot Full"
                if " window" in arg:
                    return "Screenshot Window"
                if " area" in arg:
                    return "Screenshot Area"
                return "Screenshot"
            return arg if arg else "Launch App"

        if action == "workspace":
            return f"Go to Workspace {arg}"

        if action == "movetoworkspace":
            return f"Move to Workspace {arg}"

        if action == "movefocus":
            direction = {
                "l": "Left",
                "r": "Right",
                "u": "Up",
                "d": "Down",
            }.get(arg, arg)
            return f"Focus {direction}"

        if action == "togglefloating":
            return "Toggle Floating"

        if action == "pseudo":
            return "Pseudo Tile"

        if action == "fullscreen":
            return "Toggle Fullscreen"

        if action == "togglespecialworkspace":
            return f"Toggle Special Workspace {arg}"

        if action == "movewindow":
            return "Move Window"

        if action == "resizewindow":
            return "Resize Window"

        if action == "killactive":
            return "Close Active Window"

        if action == "exit":
            return "Exit Hyprland"

        return f"{action} {arg}".strip()

    merged = {}
    section_order = []
    current_target = None

    with open(filepath) as f:
        for line in f:
            line = line.rstrip()

            if not line or line.startswith("$"):
                continue

            if line.startswith("## ") or line.startswith("# "):
                name = line[3:].strip() if line.startswith("## ") else line[2:].strip()
                if not is_section_header(name):
                    continue
                target = SECTION_MERGE_HYPR.get(name, name)
                if target not in merged:
                    merged[target] = []
                    section_order.append(target)

                merged[target].append({"is_subheader": True, "name": name})
                current_target = target
                continue

            m = re.match(r"^bind[a-z]*\s*=\s*(.*?),\s*(.+?),\s*([^,]+?)(?:\s*,\s*(.*))?$", line)
            if not m or not current_target:
                continue

            mods = parse_mods(m.group(1))
            key = parse_key(m.group(2))

            action = m.group(3).strip()
            arg = (m.group(4) or "").strip()
            desc_clean = describe_hypr_bind(action, arg, line)
            keys = mods + [key]

            merged[current_target].append({"keys": keys, "desc": desc_clean})

    sections = [{"section": name, "binds": merged[name]} for name in section_order]
    print(json.dumps(sections))


def expand_nvim_key(raw_key):
    """Convert a neovim key like '<leader>gg' or '<C-h>' into UI key parts."""
    keys = []
    i = 0
    s = raw_key.strip().strip('"').strip("'")

    while i < len(s):
        if s[i] == "<":
            end = s.find(">", i)
            if end != -1:
                token = s[i : end + 1]
                mapped = str(NVIM_KEY_MAP.get(token, token.strip("<>")))
                if "+" in mapped:
                    parts = mapped.split("+")
                    keys.extend(parts)
                else:
                    keys.append(mapped)
                i = end + 1
            else:
                keys.append(s[i])
                i += 1
        else:
            keys.append(s[i])
            i += 1

    return keys


def parse_nvim_keymaps(filepath):
    """Parse neovim keymaps.lua and return sections with binds."""
    SECTION_MERGE = {
        "General Keymaps": "General",
        "Save File": "General",
        "Search Centering": "General",
        "Window Navigation": "Navigation",
        "Resize Windows": "Navigation",
        "Buffer Navigation": "Navigation",
        "Plugins": "Plugins",
        "Telescope": "Plugins",
        "Match": "Plugins",
        "Trouble": "Plugins",
        "Markdown Render": "Plugins",
        "Spelling": "Editing",
        "Better Indenting": "Editing",
        "Move Lines": "Editing",
        "Paste without losing registry": "Editing",
    }

    merged = {}
    section_order = []
    current_section_name = None

    with open(filepath) as f:
        for line in f:
            line = line.rstrip()

            if not line:
                continue

            # Section comment like "-- General Keymaps"
            section_match = re.match(r"^--\s+(.+)$", line)
            if section_match:
                name = section_match.group(1).strip()
                if any(kw in name.lower() for kw in ["only when", "lsp is attached"]):
                    continue

                target = SECTION_MERGE.get(name, name)
                if target not in merged:
                    merged[target] = []
                    section_order.append(target)

                merged[target].append({"is_subheader": True, "name": name})
                current_section_name = target
                continue

            # keymap.set("n", "<key>", ..., { desc = "..." })
            km_match = re.match(
                r'keymap\.set\(\s*(?:\{[^}]*\}|"[^"]*")\s*,\s*"([^"]+)"\s*,.*desc\s*=\s*"([^"]+)"',
                line,
            )
            if km_match and current_section_name:
                raw_key = km_match.group(1)
                desc = km_match.group(2)
                keys = expand_nvim_key(raw_key)
                merged[current_section_name].append({"keys": keys, "desc": desc})
                continue

    # Parse LSP section from inside autocmd
    lsp_binds = []
    in_lsp = False
    with open(filepath) as f:
        for line in f:
            line = line.rstrip()
            if "LspAttach" in line:
                in_lsp = True
                continue
            if in_lsp:
                km_match = re.match(
                    r'\s*keymap\.set\(\s*(?:\{[^}]*\}|"[^"]*")\s*,\s*"([^"]+)"\s*,.*desc\s*=\s*"([^"]+)"',
                    line,
                )
                if km_match:
                    raw_key = km_match.group(1)
                    desc = km_match.group(2)
                    keys = expand_nvim_key(raw_key)
                    lsp_binds.append({"keys": keys, "desc": desc})

    if lsp_binds:
        merged["LSP"] = [{"is_subheader": True, "name": "LSP Keymaps"}] + lsp_binds
        section_order.append("LSP")

    # Parse plugin keybinds from lazy.nvim plugin specs
    plugins_dir = os.path.join(os.path.dirname(os.path.dirname(filepath)), "plugins")
    if os.path.isdir(plugins_dir):
        plugin_target = "Plugins"
        if plugin_target not in merged:
            merged[plugin_target] = []
            section_order.append(plugin_target)
        for pfile in sorted(os.listdir(plugins_dir)):
            if not pfile.endswith(".lua"):
                continue

            plugin_name = pfile[:-4].replace("-", " ").title()
            added_subheader = False

            ppath = os.path.join(plugins_dir, pfile)
            with open(ppath) as pf:
                for pline in pf:
                    pline = pline.rstrip()
                    # Match lazy.nvim key specs: { "<key>", "<cmd>...", desc = "..." }
                    pm = re.match(
                        r'\s*\{\s*"([^"]+)"\s*,\s*"[^"]*"\s*,\s*desc\s*=\s*"([^"]+)"',
                        pline,
                    )
                    if pm:
                        raw_key = pm.group(1)
                        desc = pm.group(2)
                        keys = expand_nvim_key(raw_key)
                        # Avoid duplicates already in Plugins from keymaps.lua
                        if not any(
                            b.get("desc") == desc for b in merged[plugin_target]
                        ):
                            if not added_subheader:
                                merged[plugin_target].append(
                                    {"is_subheader": True, "name": plugin_name}
                                )
                                added_subheader = True
                            merged[plugin_target].append({"keys": keys, "desc": desc})

    sections = [{"section": name, "binds": merged[name]} for name in section_order]
    print(json.dumps(sections))


if __name__ == "__main__":
    if "--nvim" in sys.argv:
        nvim_conf = os.path.expanduser("~/.config/nvim/lua/config/keymaps.lua")
        for i, arg in enumerate(sys.argv):
            if arg == "--nvim" and i + 1 < len(sys.argv):
                nvim_conf = sys.argv[i + 1]
                break
        parse_nvim_keymaps(nvim_conf)
    else:
        conf = os.path.expanduser("~/.config/hypr/keybinds.conf")
        if len(sys.argv) > 1:
            conf = sys.argv[1]
        parse_keybinds(conf)
