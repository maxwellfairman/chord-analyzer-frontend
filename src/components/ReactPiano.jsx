import { useCallback, useEffect, useRef, useState } from "react";
import { Piano, KeyboardShortcuts, MidiNumbers } from "react-piano";
import "react-piano/dist/styles.css";
import "./pianostyle.css";
import * as Tone from "tone";

const firstNote = MidiNumbers.fromNote("c2");
const lastNote = MidiNumbers.fromNote("c7");
const firstKeyNote = MidiNumbers.fromNote("c4");
const lastKeyNote = MidiNumbers.fromNote("f6");
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

//console.log(keyboardShortcuts);

export default function ReactPiano({ onChordUpdate, playRoot, impliedRoot }) {
  const [activeNotes, setActiveNotes] = useState([]);
  const keyboardShortcuts = KeyboardShortcuts.create({
    firstNote: firstKeyNote,
    lastNote: lastKeyNote,
    keyboardConfig: KeyboardShortcuts.HOME_ROW,
  });
  //console.log(keyboardShortcuts);
  //ref updates regularly while state only updates with new renders, can use if data does not need to be rendered
  const notesRef = useRef(new Set());

  const synthRef = useRef(null);
  const bassSynthRef = useRef(null);
  const lastBassRef = useRef(null);
  const audioReadyRef = useRef(false);

  const debounceRef = useRef(null);
  const lastChordKeyRef = useRef("");
  const playRootRef = useRef(playRoot);
  const abortRef = useRef(null);
  useEffect(() => {
    playRootRef.current = playRoot;
  }, [playRoot]);
  const impliedRootRef = useRef(impliedRoot);

  useEffect(() => {
    impliedRootRef.current = impliedRoot;
  }, [impliedRoot]); //only runs when impliedRoot changes
  // ─── Audio Init ───────────────────────────────────────────
  const initAudio = useRef(false);

  const ensureAudio = async () => {
    if (initAudio.current) return;
    console.log("ensure is running");
    await Tone.start();
    await Tone.context.resume();

    const poly = new Tone.PolySynth(Tone.Synth).toDestination();
    poly.maxPolyphony = 16;
    poly.set({ volume: -6 });

    synthRef.current = poly;

    bassSynthRef.current = new Tone.Synth({
      volume: -1,
    }).toDestination();
    //console.log(bassSynthRef.current);
    initAudio.current = true;

    console.log("AUDIO READY", {
      bass: !!bassSynthRef.current,
      poly: !!synthRef.current,
    });
  };
  const syncState = () => {
    setActiveNotes(Array.from(notesRef.current));
  };
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
          if (!playRootRef.current) return;
          let root = undefined;
          const chordMain = data?.["Chords without roots"]?.[0];
          if (chordMain) {
            const rootName =
              chordMain.root[1] === "b"
                ? chordMain.root.slice(0, 2).replace("b", "♭")
                : chordMain.root[0];
            root = noteToPitchClass[rootName] + 48;
          }
          console.log(root);

          //only play root when button is toggled
          console.log(!playRootRef.current);
          console.log(!bassSynthRef.current);
          const bass = bassSynthRef.current;
          if (
            !playRootRef.current ||
            root === undefined ||
            !bass ||
            bass === lastBassRef.current
          ) {
            console.log("should be leaving this function");
            return;
          }
          lastBassRef.current = bass;
          console.log("return didn't work");
          const note = Tone.Frequency(root, "midi").toNote();
          bass.triggerAttackRelease(note, "0.7");
        })
        .catch(console.error);
    }, 80);
  };
  // ─── Note On ──────────────────────────────────────────────
  const playNote = useCallback(async (midiNumber) => {
    await ensureAudio();
    if (notesRef.current.has(midiNumber)) return;
    notesRef.current.add(midiNumber);
    const note = MidiNumbers.getAttributes(midiNumber).note;
    synthRef.current.triggerAttack(note);
    syncState();
    scheduleAnalysis();
  }, []); // empty deps — all state accessed via refs

  const stopNote = useCallback(async (midiNumber) => {
    await ensureAudio();
    notesRef.current.delete(midiNumber);
    const note = MidiNumbers.getAttributes(midiNumber).note;
    synthRef.current.triggerRelease(note);
    syncState();
    scheduleAnalysis();
  }, []);
  useEffect(() => {
    let midiAccess;

    const setupMidi = async () => {
      if (!navigator.requestMIDIAccess) {
        console.log("Web MIDI not supported");
        return;
      }

      try {
        midiAccess = await navigator.requestMIDIAccess();

        const handleMidiMessage = async (event) => {
          await ensureAudio();

          const [status, note, velocity] = event.data;
          const command = status & 0xf0;

          if (command === 0x90 && velocity > 0) {
            playNote(note);
          }

          if (command === 0x80 || (command === 0x90 && velocity === 0)) {
            stopNote(note);
          }
        };

        for (const input of midiAccess.inputs.values()) {
          input.onmidimessage = handleMidiMessage;
        }

        console.log(
          "Connected MIDI devices:",
          [...midiAccess.inputs.values()].map((i) => i.name),
        );
      } catch (err) {
        console.error("MIDI setup failed:", err);
      }
    };

    setupMidi();

    return () => {
      if (midiAccess) {
        for (const input of midiAccess.inputs.values()) {
          input.onmidimessage = null;
        }
      }
    };
  }, []);

  // ─── Sync UI ──────────────────────────────────────────────

  // ─── Chord Analysis ───────────────────────────────────────

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
