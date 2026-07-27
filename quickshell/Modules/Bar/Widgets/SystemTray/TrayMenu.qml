import QtQuick
import QtQuick.Layouts
import Quickshell
import qs.Core

Item {
    id: menuRoot

    property var menuHandle: null
    property bool isOpen: false

    Layout.fillWidth: true
    Layout.preferredHeight: isOpen ? (mainLayout.implicitHeight + 16) : 0
    opacity: isOpen ? 1 : 0
    visible: isOpen || opacity > 0
    clip: true

    QsMenuOpener {
        id: opener

        menu: menuRoot.menuHandle
    }

    Rectangle {
        anchors.fill: parent
        color: "transparent"

        ColumnLayout {
            id: mainLayout

            anchors.fill: parent
            spacing: 4

            Repeater {
                model: opener.children

                delegate: Rectangle {
                    id: itemRoot

                    Layout.fillWidth: true
                    Layout.preferredHeight: modelData.isSeparator ? 1 : 32
                    color: itemMouseArea.containsMouse ? Theme.selected : "transparent"
                    radius: Constants.sizeXs
                    visible: (modelData.text !== "" || modelData.isSeparator)

                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 5
                        spacing: 8
                        visible: !modelData.isSeparator

                        IconLookup {
                            id: menuIconLookup

                            candidateSource: modelData.icon ? modelData.icon : ""
                            query: modelData.text ? modelData.text : ""
                            // For menu items in the system tray, prefer no icon over a generic fallback
                            fallbackSource: ""
                        }

                        Image {
                            width: Constants.sizeLg
                            height: Constants.sizeLg
                            source: menuIconLookup.source
                            visible: menuIconLookup.source !== ""
                            fillMode: Image.PreserveAspectFit
                            sourceSize: Qt.size(Constants.sizeLg, Constants.sizeLg)
                        }

                        ThemedText {
                            text: ""
                            visible: modelData.checkState === Qt.Checked
                            color: Theme.green
                            font.pixelSize: Constants.sizeXs
                        }

                        ThemedText {
                            Layout.fillWidth: true
                            text: modelData.text
                            color: modelData.enabled ? Theme.fg : Theme.muted
                            font.pixelSize: Constants.sizeSm
                        }

                        ThemedText {
                            text: "󰅂"
                            visible: modelData.hasChildren
                            color: Theme.muted
                            font.pixelSize: Constants.sizeXs
                        }

                    }

                    Rectangle {
                        anchors.fill: parent
                        color: Theme.border
                        visible: modelData.isSeparator
                    }

                    MouseArea {
                        id: itemMouseArea

                        anchors.fill: parent
                        hoverEnabled: true
                        visible: !modelData.isSeparator && modelData.enabled
                        onClicked: {
                            if (modelData.hasChildren) {
                                menuRoot.menuHandle = modelData;
                            } else {
                                if (typeof modelData.triggered === "function")
                                    modelData.triggered();

                                menuRoot.isOpen = false;
                            }
                        }
                    }

                }

            }

        }

    }

    Behavior on Layout.preferredHeight {
        NumberAnimation {
            duration: Constants.animSlow
            easing.type: Easing.OutQuint
        }

    }

    Behavior on opacity {
        NumberAnimation {
            duration: Constants.animSlow
            easing.type: Easing.OutQuint
        }

    }

}
