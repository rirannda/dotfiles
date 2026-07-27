import QtQuick
import QtQuick.Layouts
import Quickshell.Io
import qs.Core

Item {
    id: root

    property string windowTitle: ""
    property bool gotTitleThisPoll: false
    readonly property int maxChars: 35
    readonly property string displayTitle: {
        if (windowTitle.length > maxChars) {
            return windowTitle.substring(0, maxChars - 1) + "…";
        }
        return windowTitle;
    }

    implicitHeight: 32
    implicitWidth: titleText.implicitWidth + (Constants.sizeLg * 2)

    Component.onCompleted: {
        root.windowTitle = "Hyprland";
        getWindowProc.running = true;
    }

    ThemedText {
        id: titleText

        anchors.centerIn: parent
        text: displayTitle
        color: Theme.fg
        font.pixelSize: Constants.sizeMd
        elide: Text.ElideRight
        maximumLineCount: 1
    }

    Timer {
        interval: 500
        running: true
        repeat: true
        triggeredOnStart: true
        onTriggered: {
            root.gotTitleThisPoll = false;
            getWindowProc.running = true;
        }
    }

    Process {
        id: getWindowProc

        command: ["hyprctl", "activewindow"]

        onExited: function(exitCode) {
            if (!root.gotTitleThisPoll)
                root.windowTitle = "Hyprland";
        }

        stdout: SplitParser {
            onRead: (data) => {
                if (!data)
                    return;

                var line = data.trim();
                if (line.startsWith("title:")) {
                    var title = line.substring(6).trim();
                    root.gotTitleThisPoll = true;
                    root.windowTitle = title ? title : "Hyprland";
                }
            }
        }
    }
}
