import QtQuick
import Quickshell.Io
import qs.Core

BarButton {
    id: root

    property bool wifiEnabled: false
    property bool btEnabled: false
    property int wifiSignal: -1

    function wifiIcon() {
        if (!root.wifiEnabled)
            return "󰤭";

        if (root.wifiSignal < 0)
            return "󰤯";
        if (root.wifiSignal < 25)
            return "󰤟";
        if (root.wifiSignal < 50)
            return "󰤢";
        if (root.wifiSignal < 75)
            return "󰤥";
        return "󰤨";
    }

    function btIcon() {
        return root.btEnabled ? "󰂯" : "󰂲";
    }

    text: root.wifiIcon() + " " + root.btIcon()
    textColor: (root.wifiEnabled || root.btEnabled) ? Theme.cyan : Theme.muted
    fontSize: Constants.sizeLg

    Component.onCompleted: {
        wifiStateProc.running = true;
        wifiSignalProc.running = true;
        btStateProc.running = true;
    }

    Timer {
        interval: 2000
        running: true
        repeat: true
        triggeredOnStart: true
        onTriggered: {
            wifiStateProc.running = true;
            wifiSignalProc.running = true;
            btStateProc.running = true;
        }
    }

    Process {
        id: wifiStateProc

        command: ["nmcli", "radio", "wifi"]

        stdout: SplitParser {
            onRead: (data) => {
                if (!data)
                    return;

                root.wifiEnabled = data.trim() === "enabled";
                if (!root.wifiEnabled)
                    root.wifiSignal = -1;
            }
        }
    }

    Process {
        id: wifiSignalProc

        command: ["sh", "-c", "nmcli -t -f IN-USE,SIGNAL device wifi list 2>/dev/null | awk -F: '$1==\"*\"{print $2; found=1; exit} END{if(!found) print \"\"}'"]

        stdout: SplitParser {
            onRead: (data) => {
                if (!root.wifiEnabled)
                    return;

                var raw = data ? data.trim() : "";
                root.wifiSignal = raw === "" ? -1 : (parseInt(raw) || -1);
            }
        }
    }

    Process {
        id: btStateProc

        command: ["bluetoothctl", "show"]

        stdout: SplitParser {
            onRead: (data) => {
                if (!data)
                    return;

                var cleanData = data.replace(/\u001b\[[0-9;]*m/g, "");
                if (cleanData.includes("Powered: yes"))
                    root.btEnabled = true;
                else if (cleanData.includes("Powered: no"))
                    root.btEnabled = false;
            }
        }
    }
}
