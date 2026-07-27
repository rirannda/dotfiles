import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import Quickshell.Io
import qs.Core
import qs.Modules.Bar.Widgets.QuickSettings

TopPopup {
    id: root

    property int brightness: 0

    implicitWidth: 320
    implicitHeight: brightnessCol.implicitHeight + (Constants.sizeLg * 2)

    ColumnLayout {
        id: brightnessCol

        anchors.fill: parent
        spacing: Constants.sizeLg

        ThemedText {
            text: "Brightness"
            font.pixelSize: Constants.sizeLg
            font.weight: Font.Bold
        }

        BrightnessSlider {
            Layout.fillWidth: true
            brightness: root.brightness
            onBrightnessChanged: function(val) {
                root.brightness = (val !== undefined && val !== null) ? val : root.brightness;
            }
        }
    }
}
