import QtQuick
import QtQuick.Controls as QQC2
import QtQuick.Layouts
import Quickshell
import Quickshell.Services.SystemTray
import qs.Core

Rectangle {
    id: itemRoot

    property var trayItem: null
    property bool showTooltip: true
    readonly property string fallbackQuery: itemRoot.trayItem && itemRoot.trayItem.title ? itemRoot.trayItem.title : ""

    signal clicked(var mouse)

    width: 24
    height: 24
    color: "transparent"

    IconLookup {
        id: iconLookup

        candidateSource: {
            if (!itemRoot.trayItem)
                return "";

            try {
                if (itemRoot.trayItem.iconName !== undefined && itemRoot.trayItem.iconName !== "")
                    return itemRoot.trayItem.iconName;

                let icon = itemRoot.trayItem.icon;
                if (!icon)
                    return "";

                return icon.toString();
            } catch (e) {
                return "";
            }
        }

        query: itemRoot.fallbackQuery
        // For system tray items, avoid using a generic fallback icon; show no icon instead
        fallbackSource: ""
    }

    Image {
        id: iconImage

        anchors.centerIn: parent
        width: 24
        height: 24
        source: iconLookup.source
        fillMode: Image.PreserveAspectFit
    }

    MouseArea {
        id: mouseArea

        anchors.fill: parent
        hoverEnabled: true
        cursorShape: Qt.PointingHandCursor
        acceptedButtons: Qt.LeftButton | Qt.RightButton
        onClicked: (mouse) => {
            if (!itemRoot.trayItem)
                return ;

            if (mouse.button === Qt.LeftButton)
                itemRoot.trayItem.activate();

            itemRoot.clicked(mouse);
        }
    }

    QQC2.ToolTip {
        id: toolTip

        visible: !!(mouseArea.containsMouse && itemRoot.showTooltip && itemRoot.trayItem && itemRoot.trayItem.title)
        text: (itemRoot.trayItem && itemRoot.trayItem.title) ? itemRoot.trayItem.title : ""
        delay: 500
        y: parent.height + 5
        padding: Constants.sizeXs

        contentItem: ThemedText {
            text: toolTip.text
            font.pixelSize: Constants.sizeSm
        }

        background: Rectangle {
            color: Theme.bg
            border.color: Theme.border
            radius: Constants.sizeXs
        }

    }

}
