import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import Quickshell
import Quickshell.Services.SystemTray
import qs.Core

TopPopup {
    id: root

    property var menuHandle: null

    implicitWidth: 180 + (root.contentPadding * 2)
    implicitHeight: mainLayout.implicitHeight + (Constants.sizeLg * 2)
    preferredHeight: implicitHeight
    onIsOpenChanged: {
        if (!isOpen)
            menuHandle = null;
    }

    ColumnLayout {
        id: mainLayout

        spacing: 4

        QsMenuOpener {
            id: opener

            menu: root.menuHandle
        }

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
                        Layout.fillWidth: true
                        text: modelData.text
                        color: modelData.enabled ? Theme.fg : Theme.muted
                        font.pixelSize: Constants.sizeSm
                    }

                    ThemedText {
                        text: ""
                        visible: modelData.checkState === Qt.Checked
                        color: Theme.green
                        font.pixelSize: Constants.sizeXs
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
                            root.menuHandle = modelData;
                        } else {
                            if (typeof modelData.triggered === "function")
                                modelData.triggered();

                            root.isOpen = false;
                        }
                    }
                }

            }

        }

    }

}