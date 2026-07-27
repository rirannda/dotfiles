import QtQuick
import QtQuick.Layouts
import Quickshell
import qs.Core
import qs.Modules.Bar.Components
import qs.Modules.Bar.Widgets.Battery
import qs.Modules.Bar.Widgets.Brightness
import qs.Modules.Bar.Widgets.Calendar
import qs.Modules.Bar.Widgets.Dashboard
// Keyboard layout widget removed
import qs.Modules.Bar.Widgets.MusicPlayer
import qs.Modules.Bar.Widgets.NotificationCenter
import qs.Modules.Bar.Widgets.PowerMenu
import qs.Modules.Bar.Widgets.Volume
import qs.Modules.Bar.Widgets.QuickSettings
import qs.Modules.Bar.Widgets.SystemTray
import qs.Modules.Bar.Widgets.ActiveWindow

PanelWindow {
    id: mainBar

    required property var notificationService

    implicitHeight: 48
    color: "transparent"

    anchors {
        top: true
        left: true
        right: true
    }

    margins {
        top: 8
        bottom: 0
        left: 8
        right: 8
    }

    Rectangle {
        anchors.fill: parent
        color: Theme.bg
        radius: 22

        RowLayout {
            anchors.left: parent.left
            anchors.top: parent.top
            anchors.bottom: parent.bottom
            spacing: Constants.sizeXs
            anchors.leftMargin: 8

            ArchButton {
                id: archButton
            }

            Workspaces {
            }

            ActiveWindow {
                id: activeWindow
            }

        }

        RowLayout {
            anchors.centerIn: parent
            spacing: Constants.sizeXs

            MusicStatusButton {
                id: musicStatusButton
            }
        }

        RowLayout {
            anchors.right: parent.right
            anchors.top: parent.top
            anchors.bottom: parent.bottom
            spacing: Constants.sizeXs
            anchors.rightMargin: 8

            BrightnessIndicator {
                id: brightnessIndicator
            }

            VolumeIndicator {
                id: volumeIndicator
            }

            BatteryIndicator {
                id: batteryIndicator
                notificationService: mainBar.notificationService
            }

            ClockButton {
                id: clockButton
            }

            QuickSettingsButton {
                id: quickSettingsButton
            }

            NotificationsButton {
                id: notificationsButton
                notificationService: mainBar.notificationService
            }

            DiscordTrayButton {
                id: discordTrayButton
                systemTray: systemTray
            }

            SystemTrayButton {
                id: systemTrayButton
            }

            PowerButton {
                id: powerButton
            }

        }

    }

    Battery {
        id: battery

        popupId: "battery"
        anchor.window: mainBar
        anchor.rect.x: mainBar.width - implicitWidth - 8
        anchor.rect.y: mainBar.height
    }
    

    Brightness {
        id: brightness

        popupId: "brightness"
        anchor.window: mainBar
        anchor.rect.x: mainBar.width - implicitWidth - 280
        anchor.rect.y: mainBar.height
    }

    Volume {
        id: volume

        popupId: "volume"
        anchor.window: mainBar
        anchor.rect.x: mainBar.width - implicitWidth - 190
        anchor.rect.y: mainBar.height
    }

    // Update notification anchor when these popups open/close
    Connections {
        target: battery

        function onIsOpenChanged() {
            if (!notificationService)
                return;

            if (battery.isOpen)
                notificationService.setAnchor(battery);
            else if (notificationService.anchorPopup === battery)
                notificationService.clearAnchor();
        }
    }

    Connections {
        target: volume

        function onIsOpenChanged() {
            if (!notificationService)
                return;

            if (volume.isOpen)
                notificationService.setAnchor(volume);
            else if (notificationService.anchorPopup === volume)
                notificationService.clearAnchor();
        }
    }

    // Brightness may not exist in some configs; guard access

    Dashboard {
        id: dashboard

        popupId: "dashboard"
        anchor.window: mainBar
        anchor.rect.x: (mainBar.width / 2) - (implicitWidth / 2)
        anchor.rect.y: mainBar.height
    }

    MusicPlayer {
        id: musicPlayer

        popupId: "musicPlayer"
        anchor.window: mainBar
        anchor.rect.x: (mainBar.width / 2) - (implicitWidth / 2)
        anchor.rect.y: mainBar.height
    }

    Calendar {
        id: calendar

        popupId: "calendar"
        anchor.window: mainBar
        anchor.rect.x: mainBar.width - implicitWidth - 190
        anchor.rect.y: mainBar.height
    }

    // KeyboardLayout module removed

    QuickSettings {
        id: quickSettings

        popupId: "quickSettings"
        anchor.window: mainBar
        anchor.rect.x: mainBar.width - implicitWidth - 15
        anchor.rect.y: mainBar.height
    }

    NotificationCenter {
        id: notificationCenter

        notificationService: mainBar.notificationService
        popupId: "notificationCenter"
        anchor.window: mainBar
        anchor.rect.x: mainBar.width - implicitWidth - 15
        anchor.rect.y: mainBar.height
    }

    SystemTray {
        id: systemTray

        popupId: "systemTray"
        anchor.window: mainBar
        anchor.rect.x: mainBar.width - implicitWidth - 15
        anchor.rect.y: mainBar.height
    }

    DiscordTrayMenu {
        id: discordTrayMenu

        popupId: "discordTrayMenu"
        anchor.window: mainBar
        anchor.rect.x: mainBar.width - implicitWidth - 15
        anchor.rect.y: mainBar.height
    }

    PowerMenu {
        id: powerMenu

        popupId: "powerMenu"
        anchor.window: mainBar
        anchor.rect.x: mainBar.width - implicitWidth - 15
        anchor.rect.y: mainBar.height
    }

    Component.onCompleted: {
        // assign widget references after all ids exist
        if (typeof archButton !== 'undefined') archButton.widget = dashboard;
        if (typeof musicStatusButton !== 'undefined') musicStatusButton.widget = musicPlayer;
        if (typeof brightnessIndicator !== 'undefined' && typeof brightness !== 'undefined') brightnessIndicator.widget = brightness;
        if (typeof volumeIndicator !== 'undefined' && typeof volume !== 'undefined') volumeIndicator.widget = volume;
        if (typeof batteryIndicator !== 'undefined' && typeof battery !== 'undefined') batteryIndicator.widget = battery;
        if (typeof clockButton !== 'undefined') clockButton.widget = calendar;
        if (typeof quickSettingsButton !== 'undefined') quickSettingsButton.widget = quickSettings;
        if (typeof notificationsButton !== 'undefined') notificationsButton.widget = notificationCenter;
        if (typeof discordTrayButton !== 'undefined') discordTrayButton.discordMenu = discordTrayMenu;
        if (typeof systemTrayButton !== 'undefined') systemTrayButton.widget = systemTray;
        if (typeof powerButton !== 'undefined') powerButton.widget = powerMenu;
    }

}
