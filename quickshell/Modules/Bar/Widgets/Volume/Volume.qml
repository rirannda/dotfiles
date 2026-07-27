import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import Quickshell.Io
import qs.Core
import qs.Modules.Bar.Widgets.QuickSettings

TopPopup {
    id: root

    property int volume: 0
    property bool muted: false

    implicitWidth: 320
    implicitHeight: volumeCol.implicitHeight + (Constants.sizeLg * 2)

    ColumnLayout {
        id: volumeCol

        anchors.fill: parent
        spacing: Constants.sizeLg

        ThemedText {
            text: muted ? "Muted" : "Volume"
            font.pixelSize: Constants.sizeLg
            font.weight: Font.Bold
        }

        VolumeSlider {
            Layout.fillWidth: true
            volume: root.volume
            muted: root.muted
            onMoved: function(val) {
                volSetProc.command = ["pamixer", "--set-volume", val.toString()];
                volSetProc.running = true;
                root.volume = (val !== undefined && val !== null) ? val : root.volume;
            }
        }
    }

    Timer {
        interval: 2000
        running: true
        repeat: true
        triggeredOnStart: true
        onTriggered: {
            volGetProc.running = true;
            muteGetProc.running = true;
        }
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