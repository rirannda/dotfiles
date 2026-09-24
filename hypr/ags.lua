local config = "/home/msk/.config/ags"
local scripts = "/home/msk/.config/ags/scripts"
local request = "ags request -i ags-shell toggle "

-- Remove the quickshell exec from hyprland.lua when switching completely.
hl.on("hyprland.start", function()
	hl.exec_cmd("ags run " .. config .. "/app.tsx")
end)

hl.bind("SUPER + A", hl.dsp.exec_cmd(request .. "dashboard"))
hl.bind("SUPER + T", hl.dsp.exec_cmd(request .. "quicksettings"))
hl.bind("ALT + space", hl.dsp.exec_cmd(request .. "chatgpt"))
hl.bind("SUPER + space", hl.dsp.exec_cmd(request .. "launcher"))
hl.bind("SUPER + SHIFT + V", hl.dsp.exec_cmd(request .. "clipboard"))
hl.bind("SUPER + K", hl.dsp.exec_cmd(request .. "cheatsheet"))

hl.bind("SUPER + Print", hl.dsp.exec_cmd(scripts .. "/screenshot.sh full"))
hl.bind("SUPER + SHIFT + Print", hl.dsp.exec_cmd(scripts .. "/screenshot.sh window"))
hl.bind("SUPER + CTRL + Print", hl.dsp.exec_cmd(scripts .. "/screenshot.sh area"))
