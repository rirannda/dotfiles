-- Paths follow this module, so the same files work in a checkout or ~/.config.
local source = debug.getinfo(1, "S").source:gsub("^@", "")
local hypr_dir = assert(source:match("^(.*)/[^/]+$"), "cannot locate ags.lua")
local root = hypr_dir .. "/.."
local scripts = root .. "/ags/scripts"
local function quote(value)
	return "'" .. value:gsub("'", "'\\''") .. "'"
end
local request = "ags request -i ags-shell "
hl.env("AGS_HYPR_CONFIG_DIR", hypr_dir)

local colors = dofile(hypr_dir .. "/colors/colors.lua")
hl.config({
	general = { col = {
		active_border = colors.active_border,
		inactive_border = colors.inactive_border,
	} },
})

hl.on("hyprland.start", function()
	hl.exec_cmd(quote(scripts .. "/launch.sh"))
	hl.exec_cmd(quote(hypr_dir .. "/scripts/wallpaper-monitor.sh"))
end)

hl.bind("SUPER + A", hl.dsp.exec_cmd(request .. "RightSidebar"))
hl.bind("SUPER + T", hl.dsp.exec_cmd(request .. "settings"))
hl.bind("SUPER + SHIFT + space", hl.dsp.exec_cmd(request .. "toggle"))
hl.bind("SUPER + M", hl.dsp.exec_cmd(request .. "music-popup"))
hl.bind("SUPER + SHIFT + P", hl.dsp.exec_cmd(request .. "toggle-powermenu"))
hl.unbind("SUPER + SHIFT + V")
hl.bind("SUPER + SHIFT + V", hl.dsp.exec_cmd(request .. "clipboard"))
hl.bind("SUPER + CTRL + R", hl.dsp.exec_cmd(quote(scripts .. "/restart.sh")))

hl.bind("SUPER + Print", hl.dsp.exec_cmd(quote(scripts .. "/screenshot.sh") .. " full"))
hl.bind("SUPER + SHIFT + Print", hl.dsp.exec_cmd(quote(scripts .. "/screenshot.sh") .. " window"))
hl.bind("SUPER + CTRL + Print", hl.dsp.exec_cmd(quote(scripts .. "/screenshot.sh") .. " area"))

-- Replace the existing raise-volume bind; Preferences is the only saved limit.
hl.bind("XF86AudioRaiseVolume", hl.dsp.exec_cmd(quote(scripts .. "/volume.sh")), { locked = true, repeating = true })
