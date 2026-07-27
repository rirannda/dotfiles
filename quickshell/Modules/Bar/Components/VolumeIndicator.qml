import QtQuick
import QtQuick.Layouts
import Quickshell.Io
import qs.Core

BarButton {
    id: root

    property int volume: 0
    property bool muted: false
    property var widget

    property color activeColor: Theme.cyan

    isButton: true
    mouseArea.acceptedButtons: Qt.LeftButton | Qt.RightButton
    textColor: muted ? Theme.muted : activeColor
    text: muted ? "󰝟 " + volume + "%" : "󰕾 " + volume + "%"

    function toggleMute() {
        volSetProc.command = ["pamixer", "--toggle-mute"];
        volSetProc.running = true;
        muteGetProc.running = true;
        volGetProc.running = true;
    }

    function openWidget() {
        if (root.widget)
            root.widget.isOpen = !root.widget.isOpen;
    }

    mouseArea.onClicked: function(mouse) {
        if (mouse.button === Qt.LeftButton)
            root.openWidget();
        else if (mouse.button === Qt.RightButton)
            root.toggleMute();
    }

    Component.onCompleted: {
        volGetProc.running = true;
        muteGetProc.running = true;
    }

    Timer {
        interval: 100
        running: true
        repeat: true
        triggeredOnStart: true
        onTriggered: {
            volGetProc.running = true;
            muteGetProc.running = true;
        }
    }

    onVolumeChanged: {
        if (root.widget)
            root.widget.volume = root.volume;
    }

    onMutedChanged: {
        if (root.widget)
            root.widget.muted = root.muted;
    }

    Process {
        id: volGetProc

        command: ["pamixer", "--get-volume"]

        stdout: SplitParser {
            onRead: (data) => {
                if (data && data.trim() !== "")
                    root.volume = parseInt(data.trim()) || 0;
            }
        }
    }

    Process {
        id: muteGetProc

        command: ["pamixer", "--get-mute"]

        stdout: SplitParser {
            onRead: (data) => {
                if (data)
                    root.muted = (data.trim() === "true");
            }
        }
    }

    Process {
        id: volSetProc
    }
}