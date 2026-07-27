import QtQuick
import QtQuick.Controls as QQC2
import Quickshell
import qs.Core

Rectangle {
    id: root

    property var systemTray: null
    property var discordMenu: null
    property color textColor: Theme.fg
    property color bgColor: Theme.blueDiscord
    property color hoverColor: textColor
    readonly property var trayItem: systemTray ? systemTray.discordTrayItem : null

    width: 26
    height: 26
    color: {
        return bgColor.a === 0 ? Qt.rgba(textColor.r, textColor.g, textColor.b, 0.05) : Qt.tint(bgColor, Qt.rgba(textColor.r, textColor.g, textColor.b, 0.05));
    }
    radius: Constants.sizeLg
    visible: !!root.trayItem

    IconLookup {
        id: iconLookup

        candidateSource: {
            if (!root.trayItem)
                return "";

            try {
                if (root.trayItem.iconName !== undefined && root.trayItem.iconName !== "")
                    return root.trayItem.iconName;

                let icon = root.trayItem.icon;
                if (!icon)
                    return "";

                return icon.toString();
            } catch (e) {
                return "";
            }
        }

        query: root.trayItem && root.trayItem.title ? root.trayItem.title : ""
        fallbackSource: ""
    }

    Image {
        anchors.centerIn: parent
        width: 18
        height: 18
        source: iconLookup.source
        fillMode: Image.PreserveAspectFit
    }

    MouseArea {
        anchors.fill: parent
        hoverEnabled: true
        cursorShape: Qt.PointingHandCursor
        acceptedButtons: Qt.LeftButton | Qt.RightButton

        onClicked: (mouse) => {
            if (!root.trayItem)
                return;

            if (mouse.button === Qt.LeftButton) {
                root.trayItem.activate();
            } else if (mouse.button === Qt.RightButton) {
                if (root.trayItem.menu && root.discordMenu) {
                    root.discordMenu.menuHandle = root.trayItem.menu;
                    root.discordMenu.isOpen = !root.discordMenu.isOpen;
                }
                else if (root.trayItem.secondaryActivate)
                    root.trayItem.secondaryActivate();
            }
        }
    }

    QQC2.ToolTip {
        visible: !!(root.trayItem && root.trayItem.title)
        text: root.trayItem && root.trayItem.title ? root.trayItem.title : "Discord"
        delay: 500
        y: parent.height + 5
        padding: Constants.sizeXs

        contentItem: ThemedText {
            text: parent.text
            font.pixelSize: Constants.sizeSm
        }

        background: Rectangle {
            color: Theme.bg
            border.color: Theme.border
            radius: Constants.sizeXs
        }
    }
}