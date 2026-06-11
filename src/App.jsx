import { useState } from "react";
import ChordTable from "./components/ChordTable.jsx";
import ReactPiano from "./components/ReactPiano.jsx";
import "./App.css";
const testAnalyses = [
  {
    title: "Chord Analysis Guesses",
    rows: [
      {
        label: "Root included",
        guess1: {
          main: "",
          sup: "",
          slash: "",
        },
        guess2: {
          main: "",
          sup: "",
          slash: "",
        },
      },
      {
        label: "Root implied",
        guess1: {
          main: "",
          sup: "",
          slash: "",
        },
        guess2: {
          main: "",
          sup: "",
          slash: "",
        },
      },
    ],
  },

  {
    title: "Past Analyses",
    rows: [
      {
        label: "Root included",
        guess1: {
          main: "",
          sup: "",
          slash: "",
        },
        guess2: {
          main: "",
          sup: "",
          slash: "",
        },
      },
      {
        label: "Root implied",
        guess1: {
          main: "",
          sup: "",
          slash: "",
        },
        guess2: {
          main: "",
          sup: "",
          slash: "",
        },
      },
    ],
  },
  {
    title: "",
    rows: [
      {
        label: "Root included",
        guess1: {
          main: "",
          sup: "",
          slash: "",
        },
        guess2: {
          main: "",
          sup: "",
          slash: "",
        },
      },
      {
        label: "Root implied",
        guess1: {
          main: "",
          sup: "",
          slash: "",
        },
        guess2: {
          main: "",
          sup: "",
          slash: "",
        },
      },
    ],
  },
  {
    title: "",
    rows: [
      {
        label: "Root included",
        guess1: {
          main: "",
          sup: "",
          slash: "",
        },
        guess2: {
          main: "",
          sup: "",
          slash: "",
        },
      },
      {
        label: "Root implied",
        guess1: {
          main: "",
          sup: "",
          slash: "",
        },
        guess2: {
          main: "",
          sup: "",
          slash: "",
        },
      },
    ],
  },
];
const TITLES = ["Chord Analysis Guesses", "Past Analyses", "", ""];
function convertData(data) {
  const info0 = data?.["Chords with roots"]?.[0];
  const info1 = data?.["Chords with roots"]?.[1];
  const info2 = data?.["Chords without roots"]?.[0];
  const info3 = data?.["Chords without roots"]?.[1];

  const rows = [
    {
      label: "Root included",
      guess1:
        info0 !== undefined
          ? {
              main: info0.root.replaceAll("b", "♭") + info0.quality,
              sup: info0.extensions.join(",").replaceAll("b", "♭"),
              slash:
                info0.bass === info0.root
                  ? ""
                  : "/" + info0.bass.replaceAll("b", "♭"),
            }
          : {
              main: "",
              sup: "",
              slash: "",
            },
      guess2:
        info1 !== undefined
          ? {
              main: info1.root.replaceAll("b", "♭") + info1.quality,
              sup: info1.extensions.join(",").replaceAll("b", "♭"),
              slash:
                info1.bass === info1.root
                  ? ""
                  : "/" + info1.bass.replaceAll("b", "♭"),
            }
          : {
              main: "",
              sup: "",
              slash: "",
            },
    },
    {
      label: "Root implied",
      guess1:
        info2 !== undefined
          ? {
              main: info2.root.replaceAll("b", "♭") + info2.quality,
              sup: info2.extensions.join(",").replaceAll("b", "♭"),
              slash: "",
            }
          : {
              main: "",
              sup: "",
              slash: "",
            },
      guess2:
        info3 !== undefined
          ? {
              main: info3.root.replaceAll("b", "♭") + info3.quality,
              sup: info3.extensions.join(",").replaceAll("b", "♭"),
              slash: "",
            }
          : {
              main: "",
              sup: "",
              slash: "",
            },
    },
  ];
  return rows;
}
const noteToPitchClass = {
  C: 0,
  "D♭": 1,
  D: 2,
  "E♭": 3,
  E: 4,
  F: 5,
  "F#": 6,
  G: 7,
  "G#": 8,
  A: 9,
  "B♭": 10,
  B: 11,
};
function App() {
  const [analyses, setAnalyses] = useState(testAnalyses);
  const [playRoot, setPlayRoot] = useState(false);
  const [impliedRoot, setImpliedRoot] = useState(undefined);
  function updateAnalyses(newAnalysis) {
    const converted = convertData(newAnalysis);
    setAnalyses((prev) => [
      { title: "Chord Analysis Guesses", rows: converted },
      ...prev.slice(0, -1),
    ]);

    // Read from newAnalysis directly, not from stale analyses state
    let newRoot = undefined;
    const chordMain = converted[1]?.guess1?.main;
    if (chordMain) {
      const newRootName =
        chordMain[1] === "♭" || chordMain[1] === "#"
          ? chordMain.slice(0, 2)
          : chordMain[0];
      newRoot = noteToPitchClass[newRootName] + 48;
    }

    setImpliedRoot(newRoot);
  }

  return (
    <div>
      <div className="analysis-grid">
        {analyses.map((analysis, i) => (
          <ChordTable
            key={i}
            title={TITLES[i]}
            analysis={analysis}
            id={`analysis${i}`}
          />
        ))}
        <div id="piano-container">
          <ReactPiano
            onChordUpdate={updateAnalyses}
            playRoot={playRoot}
            impliedRoot={impliedRoot}
          />
          <button onClick={() => setPlayRoot(!playRoot)}>
            {playRoot ? "Don't play implied root" : "Play implied root"}
          </button>
        </div>
      </div>
    </div>
  );
}
export default App;
