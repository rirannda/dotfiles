import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import Quickshell
import Quickshell.Services.SystemTray
import qs.Core

TopPopup {
    id: root

    property var currentTrayItem: null
    property var discordTrayItem: null

    function traySearchText(trayItem) {
        if (!trayItem)
            return "";

        let parts = [];
        try {
            if (trayItem.title)
                parts.push(trayItem.title);
            if (trayItem.iconName)
                parts.push(trayItem.iconName);
            if (trayItem.icon)
                parts.push(trayItem.icon.toString());

            for (let key in trayItem) {
                try {
                    let value = trayItem[key];
                    if (typeof value === "string" && value !== "")
                        parts.push(value);
                } catch (e) {
                }
            }
        } catch (e) {
        }

        return parts.join(" ").toLowerCase();
    }

    function isDiscordTrayItem(trayItem) {
        let text = traySearchText(trayItem);
        return text.indexOf("discord") !== -1 || text.indexOf("discordapp") !== -1 || text.indexOf("discord-canary") !== -1;
    }

    function trayItemCount(items) {
        if (!items)
            return 0;

        if (typeof items.count === "number")
            return items.count;

        if (typeof items.length === "number")
            return items.length;

        return 0;
    }

    function trayItemAt(items, index) {
        if (!items)
            return null;

        if (typeof items.get === "function")
            return items.get(index);

        return items[index];
    }

    function syncDiscordTrayItem() {
        let found = null;

        for (let i = 0; i < trayRepeater.count; i++) {
            let trayItemDelegate = typeof trayRepeater.itemAt === "function" ? trayRepeater.itemAt(i) : null;
            if (trayItemDelegate && trayItemDelegate.trayItem && isDiscordTrayItem(trayItemDelegate.trayItem)) {
                found = trayItemDelegate.trayItem;
                break;
            }
        }

        discordTrayItem = found;
    }

    function openMenu(trayItem) {
        if (!trayItem || !trayItem.menu)
            return ;

        if (currentTrayItem === trayItem && trayMenu.isOpen) {
            trayMenu.isOpen = false;
            currentTrayItem = null;
        } else {
            trayMenu.menuHandle = trayItem.menu;
            trayMenu.isOpen = true;
            currentTrayItem = trayItem;
        }
    }

    implicitWidth: 180 + (root.contentPadding * 2)
    Component.onCompleted: syncDiscordTrayItem()

    Timer {
        interval: 1000
        running: true
        repeat: true
        triggeredOnStart: true
        onTriggered: root.syncDiscordTrayItem()
    }

    onIsOpenChanged: {
        if (!isOpen) {
            trayMenu.isOpen = false;
            currentTrayItem = null;
        }
    }

    ColumnLayout {
        spacing: Constants.sizeXs

        GridLayout {
            id: gridLayout

            columns: Math.max(1, Math.min(trayRepeater.count, 6))
            columnSpacing: Constants.sizeLg
            rowSpacing: Constants.sizeLg

            Repeater {
                id: trayRepeater

                model: SystemTray.items

                delegate: TrayItem {
                    trayItem: modelData
                    visible: !root.isDiscordTrayItem(modelData)
                    Component.onCompleted: {
                        if (root.isDiscordTrayItem(modelData))
                            root.syncDiscordTrayItem();
                    }
                    onClicked: (mouse) => {
                        if (mouse.button === Qt.LeftButton) {
                            root.isOpen = false;
                        } else if (mouse.button === Qt.RightButton) {
                            if (modelData.menu)
                                root.openMenu(modelData);
                            else if (modelData.secondaryActivate)
                                modelData.secondaryActivate();
                        }
                    }
                }

            }

        }

        TrayMenu {
            id: trayMenu

            isOpen: false
            onIsOpenChanged: {
                if (!isOpen) {
                    trayMenu.menuHandle = null;
                    root.currentTrayItem = null;
                }
            }
        }

    }

}
