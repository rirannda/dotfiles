import QtQuick
import QtQuick.Layouts
import Quickshell.Io
import qs.Core

BarButton {
    id: root

    property int batteryLevel: 0
    property string batteryStatus: "Discharging"
    property bool hasBattery: false
    property string batPath: ""
    property string batteryTimeRemaining: "--"
    property var notificationService
    property var widget
    property string _prevStatus: ""
    property int _prevLevel: -1
    property color activeColor: {
        if (root.batteryStatus === "Charging")
            return Theme.green;

        if (root.batteryLevel < 20)
            return Theme.red;

        return Theme.yellow;
    }

    textColor: activeColor

    isButton: true
    mouseArea.acceptedButtons: Qt.LeftButton
    mouseArea.onClicked: {
        if (root.widget)
            root.widget.isOpen = !root.widget.isOpen;
    }
    onBatteryLevelChanged: {
        if (root.widget)
            root.widget.batteryLevel = root.batteryLevel;
        if (batteryLevel <= 0 || batteryLevel === _prevLevel)
            return ;

        if (_prevLevel !== -1 && batteryStatus === "Discharging") {
            let threshold = 0;
            if (batteryLevel <= 5 && _prevLevel > 5)
                threshold = 5;
            else if (batteryLevel <= 10 && _prevLevel > 10)
                threshold = 10;
            else if (batteryLevel <= 20 && _prevLevel > 20)
                threshold = 20;
            if (threshold > 0 && notificationService)
                notificationService.notify("Low Battery", "Battery level: " + batteryLevel + "%", Constants.iconPath + "battery-caution.svg");

        }
        _prevLevel = batteryLevel;
    }
    onBatteryStatusChanged: {
        if (root.widget)
            root.widget.batteryStatus = root.batteryStatus;
        if (batteryStatus === "" || batteryStatus === _prevStatus)
            return ;

        if (_prevStatus !== "") {
            let summary = "Battery";
            let body = "";
            let icon = "";
            if (batteryStatus === "Charging") {
                summary = "Battery";
                body = "Charger connected";
                icon = Constants.iconPath + "battery-good-charging.svg";
            } else if (batteryStatus === "Discharging") {
                summary = "Battery";
                body = "Charger disconnected";
                icon = Constants.iconPath + "battery-good.svg";
            } else if (batteryStatus === "Full") {
                summary = "Battery";
                body = "Battery fully charged";
                icon = Constants.iconPath + "battery-full.svg";
            }
            if (body !== "" && notificationService)
                notificationService.notify(summary, body, icon);

        }
        _prevStatus = batteryStatus;
    }
    onBatteryTimeRemainingChanged: {
        if (root.widget)
            root.widget.batteryTimeRemaining = root.batteryTimeRemaining;
    }
    visible: hasBattery && batPath !== ""
    implicitWidth: mainRow.implicitWidth + 24
    Component.onCompleted: {
        findBattery.running = true;
        // Connect widget with battery info
        if (root.widget) {
            root.widget.batteryLevel = root.batteryLevel;
            root.widget.batteryStatus = root.batteryStatus;
            root.widget.batteryTimeRemaining = root.batteryTimeRemaining;
        }
    }
    text: ""

    Process {
        id: findBattery

        command: ["sh", "-c", "ls /sys/class/power_supply/ | grep -E 'BAT|battery' | head -n 1"]

        stdout: SplitParser {
            onRead: (data) => {
                if (data && data.trim() !== "") {
                    root.batPath = "/sys/class/power_supply/" + data.trim();
                    if (root.widget)
                        root.widget.batPath = root.batPath;
                    updateTimer.start();
                    udevMonitor.running = true;
                }
            }
        }

    }

    Process {
        id: udevMonitor

        running: false
        command: ["stdbuf", "-oL", "udevadm", "monitor", "-k", "-s", "power_supply"]

        stdout: SplitParser {
            onRead: (data) => {
                if (data && root.batPath !== "") {
                    batLevelProc.running = true;
                    batStatusProc.running = true;
                }
            }
        }

    }

    Timer {
        id: updateTimer

        interval: 2000
        running: false
        repeat: true
        triggeredOnStart: true
        onTriggered: {
            if (root.batPath !== "") {
                batLevelProc.running = true;
                batStatusProc.running = true;
                batEnergyProc.running = true;
            }
        }
    }

    Process {
        id: batLevelProc

        command: ["cat", root.batPath + "/capacity"]

        stdout: SplitParser {
            onRead: (data) => {
                if (data) {
                    root.batteryLevel = parseInt(data.trim()) || 0;
                    root.hasBattery = true;
                }
            }
        }

    }

    Process {
        id: batStatusProc

        command: ["cat", root.batPath + "/status"]

        stdout: SplitParser {
            onRead: (data) => {
                if (data)
                    root.batteryStatus = data.trim();

            }
        }

    }

    Process {
        id: batEnergyProc

        command: ["cat", root.batPath + "/energy_now"]

        stdout: SplitParser {
            onRead: (data) => {
                if (data && root.batPath !== "")
                    batPowerProc.running = true;

            }
        }

    }

    Process {
        id: batPowerProc

        command: ["sh", "-c", "charge_now=$(cat " + root.batPath + "/charge_now 2>/dev/null || echo 0); current_now=$(cat " + root.batPath + "/current_now 2>/dev/null || echo 0); if [ \\\"$current_now\\\" -gt 0 ]; then echo $((charge_now * 3600 / $current_now)); else echo 0; fi"]
        stdout: SplitParser {
            onRead: (data) => {
                if (data) {
                    let seconds = parseInt(data.trim()) || 0;
                    if (seconds > 0 && root.batteryStatus === "Discharging") {
                        let hours = Math.floor(seconds / 3600);
                        let minutes = Math.floor((seconds % 3600) / 60);
                        root.batteryTimeRemaining = (hours < 10 ? "0" + hours : hours) + ":" + (minutes < 10 ? "0" + minutes : minutes);
                    } else if (root.batteryStatus === "Charging") {
                        root.batteryTimeRemaining = "Charging...";
                    } else {
                        root.batteryTimeRemaining = "--";
                    }
                }
            }
        }

    }

    RowLayout {
        id: mainRow

        anchors.centerIn: parent
        spacing: Constants.sizeXs

        ThemedText {
            id: batIcon

            text: {
                if (root.batteryStatus === "Charging")
                    return "󰂄";

                if (root.batteryLevel >= 90)
                    return "󰁹";

                if (root.batteryLevel >= 70)
                    return "󰂁";

                if (root.batteryLevel >= 50)
                    return "󰁾";

                if (root.batteryLevel >= 30)
                    return "󰁼";

                if (root.batteryLevel >= 10)
                    return "󰁺";

                return "󰂃";
            }
            color: root.activeColor

            SequentialAnimation on opacity {
                id: breathAnim

                loops: Animation.Infinite
                running: root.batteryStatus === "Charging"
                onRunningChanged: {
                    if (!running)
                        batIcon.opacity = 1;

                }

                NumberAnimation {
                    to: 0.4
                    duration: 1000
                    easing.type: Easing.InOutSine
                }

                NumberAnimation {
                    to: 1
                    duration: 1000
                    easing.type: Easing.InOutSine
                }

            }

        }

        ColumnLayout {
            spacing: 0
            ThemedText {
                text: root.batteryLevel + "%"
                color: root.activeColor
                font.bold: true
                visible: root.batteryLevel > 0
            }
            ThemedText {
                text: " (" + root.batteryTimeRemaining + ")"
                color: root.activeColor
                font.pixelSize: 10
                visible: root.batteryLevel > 0 && root.batteryTimeRemaining !== "--"
            }
        }

    }

    Behavior on activeColor {
        ColorAnimation {
            duration: Constants.animSlow
            easing.type: Easing.OutQuint
        }

    }

}
