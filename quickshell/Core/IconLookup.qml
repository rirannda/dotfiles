import QtQuick
import Quickshell
import Quickshell.Io
import qs.Core

QtObject {
    id: root

    property string candidateSource: ""
    property string query: ""
    property string fallbackSource: Constants.fallbackIcon
    property string resolvedSource: fallbackSource
    property string outputText: ""
    property string source: resolvedSource
    property Process lookupProc: Process {
        stdout: SplitParser {
            onRead: (data) => {
                if (data)
                    root.outputText += data.toString();
            }
        }

        onExited: function(exitCode) {
            if (exitCode === 0) {
                let resolved = root.outputText.trim();
                root.resolvedSource = resolved !== "" ? resolved : root.fallbackSource;
            } else {
                root.resolvedSource = root.fallbackSource;
            }
        }
    }

    function isDirectSource(value) {
        return value.startsWith("/") || value.startsWith("file://") || value.startsWith("qrc:") || (value.startsWith("image://") && !value.startsWith("image://icon/"))
    }

    function refresh() {
        outputText = "";

        if (!candidateSource && !query) {
            resolvedSource = fallbackSource;
            return;
        }

        if (candidateSource && isDirectSource(candidateSource)) {
            resolvedSource = candidateSource;
            return;
        }

        resolvedSource = fallbackSource;
        lookupProc.command = ["python3", Quickshell.shellDir + "/Scripts/icon_lookup.py", candidateSource, query];
        lookupProc.running = false;
        lookupProc.running = true;
    }

    onCandidateSourceChanged: refresh()
    onQueryChanged: refresh()
    onFallbackSourceChanged: {
        if (resolvedSource === "" || resolvedSource === fallbackSource)
            resolvedSource = fallbackSource;
    }

    Component.onCompleted: refresh()
}