import GLib from "gi://GLib";

// launch.sh supplies the source directory, including when previewing this checkout.
export const configDir = GLib.getenv("AGS_CONFIG_DIR") ||
  GLib.build_filenamev([GLib.get_user_config_dir(), "ags"]);
export const configRoot = GLib.path_get_dirname(configDir);
export const dataDir = GLib.build_filenamev([GLib.get_user_data_dir(), "ags"]);
export const cacheDir = GLib.build_filenamev([GLib.get_user_cache_dir(), "ags"]);
export const matugenConfig = GLib.getenv("MATUGEN_CONFIG_FILE") ||
  GLib.build_filenamev([configRoot, "matugen", "config.toml"]);
export const wallpaperDir = GLib.getenv("AGS_WALLPAPER_DIR") ||
  GLib.build_filenamev([GLib.get_home_dir(), "Wallpapers"]);
export const defaultWallpaper = GLib.build_filenamev([configDir, "wallpapers", "default.jpg"]);
