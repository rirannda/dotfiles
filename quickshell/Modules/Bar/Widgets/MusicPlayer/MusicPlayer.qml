import Qt5Compat.GraphicalEffects
import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import Quickshell
import Quickshell.Services.Mpris
import qs.Core

TopPopup {
    id: root

    property var managedPlayers: []
    property var activePlayer: null
    property real position: 0
    property string currentTrackId: ""

    function isSupportedPlayer(p) {
        let id = (p && p.identity ? p.identity : "").toLowerCase();
        return id.includes("spotify")
            || id.includes("youtube")
            || id.includes("music")
            || id.includes("chrome")
            || id.includes("chromium")
            || id.includes("brave")
            || id.includes("firefox")
            || id.includes("edge");
    }

    function updatePlayer() {
        let players = managedPlayers;
        let selected = null;
        let playing = null;
        for (let i = 0; i < players.length; i++) {
            let p = players[i];
            if (!p)
                continue;

            if (isSupportedPlayer(p)) {
                let isPlaying = (p.playbackState === 1 || p.playbackState === Mpris.Playing || String(p.playbackState).toLowerCase().includes("playing"));
                if (isPlaying) {
                    playing = p;
                    break;
                }
                if (!selected)
                    selected = p;

            }
        }
        let newPlayer = playing || selected || (players.length > 0 ? players[0] : null);
        if (root.activePlayer !== newPlayer)
            root.activePlayer = newPlayer;

    }

    function registerPlayer(p) {
        let list = managedPlayers;
        if (list.indexOf(p) === -1) {
            list.push(p);
            managedPlayers = list;
            updatePlayer();
        }
    }

    function unregisterPlayer(p) {
        let list = managedPlayers;
        let index = list.indexOf(p);
        if (index !== -1) {
            list.splice(index, 1);
            managedPlayers = list;
            updatePlayer();
        }
    }

    implicitWidth: 360

    Instantiator {
        model: Mpris.players

        delegate: QtObject {
            property var p: modelData
            property var state: p.playbackState
            property var title: p.trackTitle

            onStateChanged: root.updatePlayer()
            onTitleChanged: root.updatePlayer()
            Component.onCompleted: root.registerPlayer(p)
            Component.onDestruction: root.unregisterPlayer(p)
        }

    }

    RowLayout {
        id: rowLayout

        spacing: Constants.sizeLg
        visible: root.activePlayer !== null
        Layout.fillWidth: true

        Item {
            Layout.preferredWidth: 100
            Layout.preferredHeight: 100
            Layout.alignment: Qt.AlignVCenter

            Rectangle {
                id: albumArtContainer

                anchors.fill: parent
                radius: Constants.sizeXs
                color: Theme.bgSecondary
                border.width: 1
                border.color: Theme.border
            }

            Image {
                id: albumArt

                anchors.fill: albumArtContainer
                anchors.margins: 1
                source: root.activePlayer ? (root.activePlayer.trackArtUrl || "") : ""
                fillMode: Image.PreserveAspectCrop
                asynchronous: true
                opacity: status === Image.Ready ? 1 : 0
                visible: false

                Behavior on opacity {
                    NumberAnimation {
                        duration: 400
                        easing.type: Easing.OutCubic
                    }

                }

            }

            Rectangle {
                id: albumArtMask

                anchors.fill: albumArtContainer
                radius: albumArtContainer.radius
                color: "white"
                visible: false
            }

            OpacityMask {
                anchors.fill: albumArtContainer
                source: albumArt
                maskSource: albumArtMask
            }

            ThemedText {
                anchors.centerIn: parent
                text: ""
                color: Theme.purple
                font.pixelSize: 28
                visible: albumArt.status !== Image.Ready
            }

        }

        ColumnLayout {
            Layout.fillWidth: true
            Layout.alignment: Qt.AlignVCenter
            spacing: Constants.sizeLg

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 0

                Item {
                    id: titleClip

                    readonly property string titleText: root.activePlayer ? (root.activePlayer.trackTitle || "Not Playing") : ""
                    property bool scrolling: false

                    Layout.fillWidth: true
                    Layout.preferredHeight: titleTextItem.implicitHeight
                    clip: true

                    ThemedText {
                        id: titleMetrics

                        visible: false
                        text: titleClip.titleText
                        font.pixelSize: Constants.sizeLg
                        font.weight: Font.Bold

                        onImplicitWidthChanged: {
                            titleClip.scrolling = (implicitWidth > titleClip.width)
                        }

                        Component.onCompleted: {
                            titleClip.scrolling = (implicitWidth > titleClip.width)
                        }
                    }

                    ThemedText {
                        id: titleTextItem

                        text: titleClip.scrolling ? (titleClip.titleText + "      " + titleClip.titleText) : titleClip.titleText
                        font.pixelSize: Constants.sizeLg
                        font.weight: Font.Bold
                        elide: !titleClip.scrolling ? Text.ElideRight : Text.ElideNone
                        x: 0

                        Connections {
                            target: titleClip
                            function onScrollingChanged() {
                                if (!titleClip.scrolling) {
                                    titleTextItem.x = 0
                                }
                            }
                        }

                        NumberAnimation on x {
                            running: titleClip.scrolling
                            from: 0
                            to: -(titleTextItem.implicitWidth / 2)
                            duration: Math.max(3000, (titleTextItem.implicitWidth / 2) * 50)
                            easing.type: Easing.Linear
                            loops: Animation.Infinite
                        }
                    }
                }

                Item {
                    id: artistClip

                    readonly property string artistText: root.activePlayer ? (root.activePlayer.trackArtist || "Unknown Artist") : ""
                    property bool scrolling: false

                    Layout.fillWidth: true
                    Layout.preferredHeight: artistTextItem.implicitHeight
                    clip: true

                    ThemedText {
                        id: artistMetrics

                        visible: false
                        text: artistClip.artistText
                        color: Theme.purple
                        font.pixelSize: Constants.sizeSm
                        font.weight: Font.Medium

                        onImplicitWidthChanged: {
                            artistClip.scrolling = (implicitWidth > artistClip.width)
                        }

                        Component.onCompleted: {
                            artistClip.scrolling = (implicitWidth > artistClip.width)
                        }
                    }

                    ThemedText {
                        id: artistTextItem

                        text: artistClip.scrolling ? (artistClip.artistText + "      " + artistClip.artistText) : artistClip.artistText
                        color: Theme.purple
                        font.pixelSize: Constants.sizeSm
                        font.weight: Font.Medium
                        elide: !artistClip.scrolling ? Text.ElideRight : Text.ElideNone
                        x: 0

                        Connections {
                            target: artistClip
                            function onScrollingChanged() {
                                if (!artistClip.scrolling) {
                                    artistTextItem.x = 0
                                }
                            }
                        }

                        NumberAnimation on x {
                            running: artistClip.scrolling
                            from: 0
                            to: -(artistTextItem.implicitWidth / 2)
                            duration: Math.max(3000, (artistTextItem.implicitWidth / 2) * 50)
                            easing.type: Easing.Linear
                            loops: Animation.Infinite
                        }
                    }
                }

            }

            RowLayout {
                Layout.fillWidth: true
                spacing: Constants.sizeXs

                IconButton {
                    icon: "󰒮"
                    iconSize: Constants.sizeXl
                    iconColor: (root.activePlayer && root.activePlayer.canGoPrevious) ? Theme.fg : Theme.muted
                    onClicked: {
                        if (root.activePlayer)
                            root.activePlayer.previous();

                    }
                }

                IconButton {
                    id: playButton

                    property bool isPlaying: root.activePlayer && (root.activePlayer.playbackState === 1 || root.activePlayer.playbackState === Mpris.Playing || String(root.activePlayer.playbackState).toLowerCase().includes("playing"))

                    icon: (root.activePlayer && playButton.isPlaying) ? "󰏤" : "󰐊"
                    iconSize: Constants.sizeXl
                    iconColor: Theme.bg
                    bgColor: Theme.purple
                    onClicked: {
                        if (root.activePlayer)
                            root.activePlayer.togglePlaying();

                    }
                }

                IconButton {
                    icon: "󰒭"
                    iconSize: Constants.sizeXl
                    iconColor: (root.activePlayer && root.activePlayer.canGoNext) ? Theme.fg : Theme.muted
                    onClicked: {
                        if (root.activePlayer)
                            root.activePlayer.next();

                    }
                }

            }

        }

    }

}
