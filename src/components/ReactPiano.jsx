import { useEffect, useRef, useState } from "react";
import { Piano, KeyboardShortcuts, MidiNumbers } from "react-piano";
import "react-piano/dist/styles.css";
import * as Tone from "tone";

const firstNote = MidiNumbers.fromNote("c4");
const lastNote = MidiNumbers.fromNote("f6");
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

const keyboardShortcuts = KeyboardShortcuts.create({
  firstNote,
  lastNote,
  keyboardConfig: KeyboardShortcuts.HOME_ROW,
});

export default function ReactPiano({ onChordUpdate, playRoot, impliedRoot }) {
  const [activeNotes, setActiveNotes] = useState([]);

  //ref updates regularly while state only updates with new renders, can use if data does not need to be rendered
  const notesRef = useRef(new Set());

  const synthRef = useRef(null);
  const bassSynthRef = useRef(null);
  const audioReadyRef = useRef(false);

  const debounceRef = useRef(null);
  const lastChordKeyRef = useRef("");

  const impliedRootRef = useRef(impliedRoot);
  useEffect(() => {
    impliedRootRef.current = impliedRoot;
  }, [impliedRoot]); //only runs when impliedRoot changes
  // ─── Audio Init ───────────────────────────────────────────
  const initAudio = async () => {
    if (audioReadyRef.current) return;
    //if audio has been initiated already, skip
    await Tone.start();
    //wait for tone.js to start
    // FIX: maxPolyphony must be set as a property, not passed as a voice option
    const poly = new Tone.PolySynth(Tone.Synth).toDestination();
    //todestination means to send audio to speakers (final output)
    poly.maxPolyphony = 16;
    //allows many notes to be played at once
    poly.set({ volume: -6 });
    synthRef.current = poly;

    bassSynthRef.current = new Tone.Synth({ volume: -4 }).toDestination();

    audioReadyRef.current = true;
  };

  // ─── Note On ──────────────────────────────────────────────
  const playNote = async (midiNumber) => {
    await initAudio();

    if (notesRef.current.has(midiNumber)) return;
    notesRef.current.add(midiNumber);

    const note = MidiNumbers.getAttributes(midiNumber).note;
    synthRef.current.triggerAttack(note);
    //start note
    syncState();
    scheduleAnalysis();
  };

  // ─── Note Off ─────────────────────────────────────────────
  const stopNote = async (midiNumber) => {
    await initAudio();

    notesRef.current.delete(midiNumber);

    const note = MidiNumbers.getAttributes(midiNumber).note;
    synthRef.current.triggerRelease(note);
    //end note
    syncState();
    scheduleAnalysis();
  };

  // ─── Sync UI ──────────────────────────────────────────────
  const syncState = () => {
    setActiveNotes(Array.from(notesRef.current));
  };

  // ─── Chord Analysis ───────────────────────────────────────
  const scheduleAnalysis = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const snapshot = Array.from(notesRef.current).sort((a, b) => a - b);

    if (snapshot.length < 2) return;
    //if less than two notes playing, skip
    const key = snapshot.join("-");
    //use a consistent key to check whether the chord is already held down, ordering notes from lowest to highest
    if (key === lastChordKeyRef.current) return;
    lastChordKeyRef.current = key;

    debounceRef.current = setTimeout(() => {
      fetch("https://chord-analyzer-backend.onrender.com/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: snapshot }),
      }) //send request to the fastAPI
        .then((res) => res.json())
        .then((data) => {
          onChordUpdate?.(data);

          let root = undefined;
          const chordMain = data?.["Chords without roots"]?.[0];
          if (chordMain) {
            const rootName =
              chordMain.root[1] === "b"
                ? chordMain.root.slice(0, 2).replace("b", "♭")
                : chordMain.root[0];
            root = noteToPitchClass[rootName] + 48;
          }
          //only play root when button is toggled
          if (playRoot && root !== undefined && bassSynthRef.current) {
            const note = MidiNumbers.getAttributes(root).note;
            bassSynthRef.current.triggerAttackRelease(note, "0.5");
          }
        })
        .catch(console.error);
    }, 80);
  };

  // ─── Cleanup ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      synthRef.current?.dispose();
      bassSynthRef.current?.dispose();
    };
  }, []);

  // ─── Render ───────────────────────────────────────────────
  return (
    <div>
      <Piano
        noteRange={{ first: firstNote, last: lastNote }}
        playNote={playNote}
        stopNote={stopNote}
        activeNotes={activeNotes}
        width={600}
        keyboardShortcuts={keyboardShortcuts}
      />
    </div>
  );
}
