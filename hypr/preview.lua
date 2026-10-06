-- Temporary overlay for the currently running compositor; no autostart or monitor changes.
local source = debug.getinfo(1, "S").source:gsub("^@", "")
local hypr_dir = assert(source:match("^(.*)/[^/]+$"))
local colors = dofile(hypr_dir .. "/colors/colors.lua")
hl.config({ general = { col = {
    active_border = colors.active_border,
    inactive_border = colors.inactive_border,
} } })
local request = "ags request -i ags-preview "
local binds = {
    { "SUPER + A", "RightSidebar" },
    { "SUPER + N", "RightSidebar" },
    { "SUPER + T", "settings" },
    { "SUPER + SHIFT + space", "toggle" },
    { "SUPER + M", "music-popup" },
    { "SUPER + SHIFT + P", "toggle-powermenu" },
    { "SUPER + SHIFT + V", "clipboard" },
}
for _, bind in ipairs(binds) do
    hl.unbind(bind[1])
    hl.bind(bind[1], hl.dsp.exec_cmd(request .. bind[2]))
end
hl.unbind("SUPER + SHIFT + M")
hl.bind("SUPER + SHIFT + M", hl.dsp.exit())
