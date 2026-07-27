import Quickshell
import qs.Modules.Bar
import qs.Modules.Clipboard
// Color scheme selector removed
import qs.Modules.KeybindsCheatSheet
import qs.Modules.Launcher
import qs.Modules.Notifications
import qs.Modules.Screenshot
// Wallpaper selector removed
import qs.Services.System

ShellRoot {
    NotificationService {
        id: globalNotificationService
    }

    Bar {
        notificationService: globalNotificationService
    }

    Launcher {
    }

    Clipboard {
    }

    Screenshot {
    }

    KeybindsCheatSheet {
    }

    NotificationOverlay {
        notificationService: globalNotificationService
    }

}
