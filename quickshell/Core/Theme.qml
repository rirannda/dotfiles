import QtQuick
import Quickshell
import Quickshell.Io
pragma Singleton

QtObject {
    id: root
    property var themes: [{
        "name": "Default",
        "dark": {
            "name": "Default",
            "bg": '#d00b0710',
            "bgSecondary": '#e01b1b24',
            "bgTertiary": '#374162',
            "fg": '#e0e0e0',
            "muted": '#484d69',
            "cyan": '#72cbff',
            "purple": '#a77ef5',
            "red": '#e52e4f',
            "yellow": '#f0a32f',
            "blue": '#4e7aff',
            "green": '#86c93f'
        },
        "light": {
            "name": "Default Light",
            "bg": '#e8dbff',
            "bgSecondary": '#ede6fb',
            "fg": '#1e1a2e',
            "muted": '#6b6489',
            "cyan": '#1e8fbc',
            "purple": '#7040e8',
            "red": '#c41840',
            "yellow": '#a67a0a',
            "blue": '#3f52c4',
            "green": '#4a9a28'
        }
    }]
    property string currentScheme: "Default"
    property color bg: themes[0].dark.bg
    property color bgSecondary: themes[0].dark.bgSecondary
    property color fg: themes[0].dark.fg
    property color gray: '#8A8ABF'
    property color selected: '#4c455d'
    property color muted: themes[0].dark.muted
    property color border: Qt.rgba(1, 1, 1, 0.05)
    property color cyan: themes[0].dark.cyan
    property color purple: themes[0].dark.purple
    property color red: themes[0].dark.red
    property color yellow: themes[0].dark.yellow
    property color blue: themes[0].dark.blue
    property color blueArch: "#08c"
    property color blueDiscord: "#5865f2"
    property color green: themes[0].dark.green
    property bool _wasDark: true
    property Process saver
    property Process loader
    property Process kittyProc
    property Process gtkProc
    property Process nvimProc
    property Process yaziProc

    function applyScheme(scheme) {
        currentScheme = scheme.name;
        bg = scheme.bg;
        bgSecondary = scheme.bgSecondary;
        fg = scheme.fg;
        muted = scheme.muted;
        cyan = scheme.cyan;
        purple = scheme.purple;
        red = scheme.red;
        yellow = scheme.yellow;
        blue = scheme.blue;
        green = scheme.green;
        let brightness = bg.r * 0.299 + bg.g * 0.587 + bg.b * 0.114;
        border = brightness > 0.5 ? Qt.rgba(0, 0, 0, 0.1) : Qt.rgba(1, 1, 1, 0.05);
        saveScheme();
        applyKittyTheme();
        applyGtkMode();
        applyNvimTheme(scheme.name);
        applyYaziTheme();
    }

    function applyKittyTheme() {
        let home = Quickshell.env("HOME");
        let c0 = muted;
        let c7 = fg;
        let c8 = muted;
        let c15 = fg;
        let theme = "" + "foreground              " + fg + "\n" + "background              " + bg + "\n" + "selection_foreground    " + bg + "\n" + "selection_background    " + purple + "\n" + "cursor                  " + fg + "\n" + "cursor_text_color       " + bg + "\n" + "url_color               " + blue + "\n" + "active_border_color     " + purple + "\n" + "inactive_border_color   " + muted + "\n" + "bell_border_color       " + yellow + "\n" + "active_tab_foreground   " + bg + "\n" + "active_tab_background   " + purple + "\n" + "inactive_tab_foreground " + fg + "\n" + "inactive_tab_background " + bg + "\n" + "tab_bar_background      " + bg + "\n" + "color0  " + c0 + "\n" + "color8  " + c8 + "\n" + "color1  " + red + "\n" + "color9  " + red + "\n" + "color2  " + green + "\n" + "color10 " + green + "\n" + "color3  " + yellow + "\n" + "color11 " + yellow + "\n" + "color4  " + blue + "\n" + "color12 " + blue + "\n" + "color5  " + purple + "\n" + "color13 " + purple + "\n" + "color6  " + cyan + "\n" + "color14 " + cyan + "\n" + "color7  " + c7 + "\n" + "color15 " + c15 + "\n" + "color16 " + bgSecondary + "\n";
        kittyProc.running = false;
        kittyProc.command = ["bash", "-c", "echo '" + theme + "' > '" + home + "/.config/kitty/theme.conf' && kill -SIGUSR1 $(pidof kitty) 2>/dev/null || true"];
        kittyProc.running = true;
    }

    function applyGtkMode() {
        let brightness = bg.r * 0.299 + bg.g * 0.587 + bg.b * 0.114;
        let isDark = brightness <= 0.5;
        let modeChanged = (isDark !== _wasDark);
        _wasDark = isDark;
        let darkVal = isDark ? "1" : "0";
        let gsVal = isDark ? "prefer-dark" : "prefer-light";
        let gtkThemeName = isDark ? "catppuccin-mocha-mauve-standard+default" : "catppuccin-latte-mauve-standard+default";
        let home = Quickshell.env("HOME");
        let themeDir = "/usr/share/themes/" + gtkThemeName + "/gtk-4.0";
        let configDir = home + "/.config/gtk-4.0";
        let bashCmd = "sed -i 's/gtk-application-prefer-dark-theme=.*/gtk-application-prefer-dark-theme=" + darkVal + "/' '" + home + "/.config/gtk-3.0/settings.ini' '" + configDir + "/settings.ini' 2>/dev/null; " + "sed -i 's/^gtk-theme-name=.*/gtk-theme-name=" + gtkThemeName + "/' '" + home + "/.config/gtk-3.0/settings.ini' '" + configDir + "/settings.ini' 2>/dev/null; " + "gsettings set org.gnome.desktop.interface color-scheme '" + gsVal + "'; " + "gsettings set org.gnome.desktop.interface gtk-theme '" + gtkThemeName + "'; " + "rm -rf '" + configDir + "/assets' '" + configDir + "/gtk.css' '" + configDir + "/gtk-dark.css'; " + "ln -sf '" + themeDir + "/assets' '" + configDir + "/assets'; " + "ln -sf '" + themeDir + "/gtk.css' '" + configDir + "/gtk.css'; " + "ln -sf '" + themeDir + "/gtk-dark.css' '" + configDir + "/gtk-dark.css'" + (modeChanged ? "; killall -q nautilus || true" : "");
        gtkProc.running = false;
        gtkProc.command = ["bash", "-c", bashCmd];
        gtkProc.running = true;
    }

    function sanitizeColor(c) {
        let s = String(c);
        if (s.startsWith("#") && s.length > 7)
            return "#" + s.substring(s.length - 6);

        return s;
    }

    function applyNvimTheme(schemeName) {
        let nvimTheme = "";
        let background = "dark";
        switch (schemeName) {
        case "Default":
            nvimTheme = "default";
            break;
        case "Default Light":
            nvimTheme = "default";
            background = "light";
            break;
        /*
        case "Tokyo Night":
            nvimTheme = "tokyonight-night";
            break;
        case "Tokyo Night Day":
            nvimTheme = "tokyonight-day";
            background = "light";
            break;
        case "Catppuccin Mocha":
            nvimTheme = "catppuccin-mocha";
            break;
        case "Catppuccin Latte":
            nvimTheme = "catppuccin-latte";
            background = "light";
            break;
        case "Gruvbox Dark":
            nvimTheme = "gruvbox";
            break;
        case "Gruvbox Light":
            nvimTheme = "gruvbox";
            background = "light";
            break;
        case "Rose Pine":
            nvimTheme = "rose-pine-main";
            break;
        case "Rose Pine Dawn":
            nvimTheme = "rose-pine-dawn";
            background = "light";
            break;
        case "Kanagawa":
            nvimTheme = "kanagawa-wave";
            break;
        case "Kanagawa Lotus":
            nvimTheme = "kanagawa-lotus";
            background = "light";
            break;
        */
        default:
            nvimTheme = "default";
            break;
        }
        let qs_colors = "vim.g.qs_colors = {\n" + "  bg = \"" + sanitizeColor(bg) + "\",\n" + "  bgSecondary = \"" + sanitizeColor(bgSecondary) + "\",\n" + "  fg = \"" + sanitizeColor(fg) + "\",\n" + "  muted = \"" + sanitizeColor(muted) + "\",\n" + "  cyan = \"" + sanitizeColor(cyan) + "\",\n" + "  purple = \"" + sanitizeColor(purple) + "\",\n" + "  red = \"" + sanitizeColor(red) + "\",\n" + "  yellow = \"" + sanitizeColor(yellow) + "\",\n" + "  blue = \"" + sanitizeColor(blue) + "\",\n" + "  green = \"" + sanitizeColor(green) + "\"\n" + "}\n";
        let styleVar = "";
        if (nvimTheme.startsWith("tokyonight-")) {
            let style = nvimTheme.replace("tokyonight-", "");
            styleVar = "vim.g.tokyonight_style = \"" + style + "\"\n";
        }
        let luaContent = "vim.opt.background = \"" + background + "\"\n" + qs_colors + styleVar + "pcall(vim.cmd.colorscheme, \"" + nvimTheme + "\")";
        let home = Quickshell.env("HOME");
        nvimProc.running = false;
        nvimProc.command = ["bash", "-c", "mkdir -p '" + home + "/.cache/quickshell' && echo '" + luaContent + "' > '" + home + "/.cache/quickshell/nvim_theme.lua'"];
        nvimProc.running = true;
    }

    function applyYaziTheme() {
        let home = Quickshell.env("HOME");
        let toml = "[manager]\n" + "cwd = { fg = \"cyan\" }\n" + "hovered = { fg = \"" + sanitizeColor(bg) + "\", bg = \"blue\" }\n" + "tab_active = { fg = \"" + sanitizeColor(bg) + "\", bg = \"blue\" }\n" + "tab_inactive = { fg = \"" + sanitizeColor(fg) + "\", bg = \"16\" }\n" + "border_style = { fg = \"bright-black\" }\n\n" + "[mode]\n" + "normal_main = { fg = \"" + sanitizeColor(bg) + "\", bg = \"blue\", bold = true }\n" + "normal_alt = { fg = \"blue\", bg = \"16\" }\n" + "select_main = { fg = \"" + sanitizeColor(bg) + "\", bg = \"green\", bold = true }\n" + "select_alt = { fg = \"green\", bg = \"16\" }\n" + "unset_main = { fg = \"" + sanitizeColor(bg) + "\", bg = \"magenta\", bold = true }\n" + "unset_alt = { fg = \"magenta\", bg = \"16\" }\n\n" + "[status]\n" + "separator_open  = \"\"\n" + "separator_close = \"\"\n" + "separator_style = { fg = \"16\", bg = \"16\" }\n" + "mode_normal = { fg = \"" + sanitizeColor(bg) + "\", bg = \"blue\", bold = true }\n" + "mode_select = { fg = \"" + sanitizeColor(bg) + "\", bg = \"green\", bold = true }\n" + "mode_unset  = { fg = \"" + sanitizeColor(bg) + "\", bg = \"magenta\", bold = true }\n" + "progress_label = { fg = \"" + sanitizeColor(fg) + "\", bold = true }\n" + "progress_normal = { fg = \"blue\", bg = \"16\" }\n" + "progress_error = { fg = \"red\", bg = \"16\" }\n" + "permissions_t = { fg = \"blue\" }\n" + "permissions_r = { fg = \"yellow\" }\n" + "permissions_w = { fg = \"red\" }\n" + "permissions_x = { fg = \"green\" }\n" + "permissions_s = { fg = \"bright-black\" }\n";
        yaziProc.running = false;
        yaziProc.command = ["bash", "-c", "mkdir -p '" + home + "/.config/yazi' && echo '" + toml + "' > '" + home + "/.config/yazi/theme.toml' && ya emit reload"];
        yaziProc.running = true;
    }

    function saveScheme() {
        let obj = {
            "name": currentScheme,
            "bg": "" + bg,
            "bgSecondary": "" + bgSecondary,
            "fg": "" + fg,
            "muted": "" + muted,
            "cyan": "" + cyan,
            "purple": "" + purple,
            "red": "" + red,
            "yellow": "" + yellow,
            "blue": "" + blue,
            "green": "" + green
        };
        let json = JSON.stringify(obj);
        let home = Quickshell.env("HOME");
        saver.running = false;
        saver.command = ["bash", "-c", "mkdir -p '" + home + "/.cache/quickshell' && echo '" + json + "' > '" + home + "/.cache/quickshell/colorscheme.json'"];
        saver.running = true;
    }

    function loadScheme() {
        loader.running = false;
        loader.running = true;
    }

    Component.onCompleted: loadScheme()

    saver: Process {
    }

    loader: Process {
        command: ["cat", Quickshell.env("HOME") + "/.cache/quickshell/colorscheme.json"]
        onExited: function(exitCode) {
            if (exitCode === 0) {
                try {
                    let colors = JSON.parse(loaderOutput.text);
                    if (colors.name)
                        root.currentScheme = colors.name;

                    if (colors.bg)
                        root.bg = colors.bg;

                    if (colors.bgSecondary)
                        root.bgSecondary = colors.bgSecondary;

                    if (colors.fg)
                        root.fg = colors.fg;

                    if (colors.muted)
                        root.muted = colors.muted;

                    if (colors.cyan)
                        root.cyan = colors.cyan;

                    if (colors.purple)
                        root.purple = colors.purple;

                    if (colors.red)
                        root.red = colors.red;

                    if (colors.yellow)
                        root.yellow = colors.yellow;

                    if (colors.blue)
                        root.blue = colors.blue;

                    if (colors.green)
                        root.green = colors.green;

                    let brightness = root.bg.r * 0.299 + root.bg.g * 0.587 + root.bg.b * 0.114;
                    root.border = brightness > 0.5 ? Qt.rgba(0, 0, 0, 0.1) : Qt.rgba(1, 1, 1, 0.05);
                    root.applyKittyTheme();
                    root.applyGtkMode();
                    root.applyNvimTheme(root.currentScheme);
                    root.applyYaziTheme();
                } catch (e) {
                    console.log("Colors: Error parsing config, using default");
                    root.applyScheme(root.themes[0].dark);
                }
            } else {
                console.log("Colors: No config found, using default");
                root.applyScheme(root.themes[0].dark);
            }
        }

        stdout: StdioCollector {
            id: loaderOutput
        }

    }

    kittyProc: Process {
    }

    gtkProc: Process {
    }

    nvimProc: Process {
    }

    yaziProc: Process {
    }

}
