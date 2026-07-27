import QtQuick
import QtQuick.Layouts
import Quickshell.Io
import qs.Core
import qs.Modules.Bar.Components

BarButton {
    id: root

    property int brightness: 0
    property var widget

    property color activeColor: Theme.yellow

    isButton: true
    mouseArea.acceptedButtons: Qt.LeftButton
    textColor: activeColor
    text: {
        let icon = "";
        if (root.brightness <= 33)
            icon = "󰃞";
        else if (root.brightness <= 66)
            icon = "󰃟";
        else
            icon = "󰃠";
        return icon + " " + root.brightness + "%";
    }

    function openWidget() {
        if (root.widget)
            root.widget.isOpen = !root.widget.isOpen;
    }

    mouseArea.onClicked: function(mouse) {
        if (mouse.button === Qt.LeftButton)
            root.openWidget();
    }

    Component.onCompleted: {
        brightGetProc.running = true;
    }

    Timer {
        interval: 100
        running: true
        repeat: true
        triggeredOnStart: true
        onTriggered: {
            brightGetProc.running = true;
        }
    }

    onBrightnessChanged: {
        if (root.widget)
            root.widget.brightness = root.brightness;
    }

    Process {
        id: brightGetProc

        command: ["brightnessctl", "-m"]

        stdout: SplitParser {
            onRead: (data) => {
                if (!data)
                    return;

                var parts = data.split(",");
                if (parts.length >= 4) {
                    var pct = parts[3];
                    if (pct.endsWith("%"))
                        pct = pct.substring(0, pct.length - 1);

                    root.brightness = parseInt(pct) || 0;
                }
            }
        }
    }

    Process {
        id: brightSetProc
    }
}
