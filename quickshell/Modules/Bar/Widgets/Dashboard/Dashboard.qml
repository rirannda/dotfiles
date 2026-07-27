import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import qs.Core
import qs.Modules.Bar.Widgets.Dashboard.Widgets
import qs.Modules.Bar.Widgets.QuickSettings

TopPopup {
    id: root

    Component.onCompleted: {
        if (root.popupId !== "")
            socketCleanup.running = true;
    }

    ColumnLayout {
        id: mainLayout

        spacing: Constants.sizeLg

        RowLayout {
            Layout.fillWidth: true
            spacing: Constants.sizeLg
            Layout.preferredHeight: Math.max(userCard.implicitHeight, updatesCard.implicitHeight)

            UserCard {
                id: userCard

                Layout.fillWidth: true
                Layout.fillHeight: true
            }

            UpdatesCard {
                id: updatesCard

                Layout.fillWidth: true
                Layout.preferredHeight: Math.max(userCard.implicitHeight, implicitHeight)
            }

        }

        ResourcesCard {
            Layout.alignment: Qt.AlignHCenter
        }

    }

    SocketServer {
        id: server

        path: "/tmp/quickshell_" + root.popupId
        active: false

        handler: Component {
            Socket {
                onConnectedChanged: {
                    if (connected) {
                        root.isOpen = !root.isOpen;
                        connected = false;
                    }
                }
            }

        }

    }

    Process {
        id: socketCleanup

        command: ["rm", "-f", "/tmp/quickshell_" + root.popupId]
        onExited: function(exitCode) {
            if (root.popupId !== "")
                server.active = true;
        }
    }

}
