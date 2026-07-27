import Qt5Compat.GraphicalEffects
import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import Quickshell
import Quickshell.Io
import qs.Core

TopPopup {
    id: root

    property int batteryLevel: 0
    property string batteryStatus: "Discharging"
    property string batteryTimeRemaining: "--"
    property string batteryChargingTime: "--"
    property string batPath: ""

    onBatPathChanged: {
        console.log("Battery.batPath changed to: " + batPath);
    }

    implicitWidth: 320
    implicitHeight: 280

    ColumnLayout {
        id: mainLayout

        spacing: Constants.sizeLg

        // Battery percentage with icon and status
        RowLayout {
            Layout.fillWidth: true
            spacing: Constants.sizeLg

            Item {
                Layout.preferredWidth: 80
                Layout.preferredHeight: 80
                Layout.alignment: Qt.AlignVCenter

                Rectangle {
                    anchors.fill: parent
                    radius: Constants.sizeXs
                    color: {
                        if (root.batteryStatus === "Charging")
                            return Theme.green.toString().replace("1)", "0.15)");
                        if (root.batteryLevel < 20)
                            return Theme.red.toString().replace("1)", "0.15)");
                        return Theme.yellow.toString().replace("1)", "0.15)");
                    }
                    border.width: 2
                    border.color: {
                        if (root.batteryStatus === "Charging")
                            return Theme.green;
                        if (root.batteryLevel < 20)
                            return Theme.red;
                        return Theme.yellow;
                    }
                }

                ThemedText {
                    anchors.centerIn: parent
                    text: root.batteryLevel + "%"
                    font.pixelSize: 32
                    font.bold: true
                    color: {
                        if (root.batteryStatus === "Charging")
                            return Theme.green;
                        if (root.batteryLevel < 20)
                            return Theme.red;
                        return Theme.yellow;
                    }
                }
            }

            ColumnLayout {
                Layout.fillWidth: true
                Layout.alignment: Qt.AlignVCenter
                spacing: Constants.sizeSm

                ThemedText {
                    text: {
                        if (root.batteryStatus === "Charging")
                            return "Charging";
                        if (root.batteryStatus === "Full")
                            return "Fully Charged";
                        return "Discharging";
                    }
                    font.pixelSize: Constants.sizeLg
                    font.weight: Font.Bold
                }

                ThemedText {
                    text: "Time: " + root.batteryTimeRemaining
                    color: Theme.purple
                    font.pixelSize: Constants.sizeSm
                    visible: root.batteryTimeRemaining !== "--"
                }


                ThemedText {
                    text: "Charge time: " + root.batteryChargingTime
                    color: Theme.purple
                    font.pixelSize: Constants.sizeSm
                    visible: root.batteryStatus === "Charging" && root.batteryChargingTime !== "--"
                }
            }
        }

        // Progress bar
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 8
            radius: 4
            color: Theme.bgSecondary
            border.width: 1
            border.color: Theme.border

            Rectangle {
                height: parent.height
                width: parent.width * (root.batteryLevel / 100)
                radius: parent.radius
                color: {
                    if (root.batteryStatus === "Charging")
                        return Theme.green;
                    if (root.batteryLevel < 20)
                        return Theme.red;
                    if (root.batteryLevel < 50)
                        return Theme.yellow;
                    return Theme.cyan;
                }

                Behavior on width {
                    NumberAnimation {
                        duration: 300
                        easing.type: Easing.OutCubic
                    }
                }
            }
        }

        // Details section
        ColumnLayout {
            Layout.fillWidth: true
            spacing: Constants.sizeSm

            Rectangle {
                Layout.fillWidth: true
                Layout.preferredHeight: 1
                color: Theme.border
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: Constants.sizeLg

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: Constants.sizeSm

                    ThemedText {
                        text: "Status"
                        font.weight: Font.Bold
                        font.pixelSize: Constants.sizeSm
                        color: Theme.purple
                    }

                    ThemedText {
                        text: root.batteryStatus
                        font.pixelSize: Constants.sizeSm
                    }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: Constants.sizeSm

                    ThemedText {
                        text: "Level"
                        font.weight: Font.Bold
                        font.pixelSize: Constants.sizeSm
                        color: Theme.purple
                    }

                    ThemedText {
                        text: root.batteryLevel + "%"
                        font.pixelSize: Constants.sizeSm
                    }
                }
            }
        }
    }

    // Processes for battery info update
    Timer {
        interval: 2000
        running: root.batPath !== ""
        repeat: true
        onTriggered: {
            console.log("Battery Timer triggered - batPath: " + root.batPath);
            chargingProc.running = true;
            dischargingProc.running = true;
        }
    }

    Process {
        id: chargingProc

        command: ["sh", "-c", "charge_full=$(cat " + root.batPath + "/charge_full 2>/dev/null || echo 0); charge_now=$(cat " + root.batPath + "/charge_now 2>/dev/null || echo 0); current_now=$(cat " + root.batPath + "/current_now 2>/dev/null || echo 0); if [ \"$current_now\" -gt 0 ]; then echo $((($charge_full - $charge_now) * 3600 / $current_now)); else echo 0; fi"]

        stdout: SplitParser {
            onRead: (data) => {
                if (data) {
                    let seconds = parseInt(data.trim()) || 0;
                    if (seconds > 0 && root.batteryStatus === "Charging") {
                        let hours = Math.floor(seconds / 3600);
                        let minutes = Math.floor((seconds % 3600) / 60);
                        root.batteryChargingTime = (hours < 10 ? "0" + hours : hours) + ":" + (minutes < 10 ? "0" + minutes : minutes);
                    } else {
                        root.batteryChargingTime = "--";
                    }
                }
            }
        }
    }

    Process {
        id: dischargingProc

        command: ["sh", "-c", "charge_now=$(cat " + root.batPath + "/charge_now 2>/dev/null || echo 0); current_now=$(cat " + root.batPath + "/current_now 2>/dev/null || echo 0); if [ \"$current_now\" -gt 0 ]; then echo $((charge_now * 3600 / $current_now)); else echo 0; fi"]

        stdout: SplitParser {
            onRead: (data) => {
                console.log("dischargingProc output: " + data);
                if (data) {
                    let seconds = parseInt(data.trim()) || 0;
                    console.log("Calculated seconds: " + seconds + ", status: " + root.batteryStatus);
                    if (seconds > 0 && root.batteryStatus === "Discharging") {
                        let hours = Math.floor(seconds / 3600);
                        let minutes = Math.floor((seconds % 3600) / 60);
                        root.batteryTimeRemaining = (hours < 10 ? "0" + hours : hours) + ":" + (minutes < 10 ? "0" + minutes : minutes);
                        console.log("Set batteryTimeRemaining to: " + root.batteryTimeRemaining);
                    } else if (root.batteryStatus === "Charging") {
                        root.batteryTimeRemaining = "Charging...";
                    } else {
                        root.batteryTimeRemaining = "--";
                    }
                }
            }
        }
    }
}
