import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  Users,
  PenTool,
  Radio,
  Disc,
  X,
  Loader2,
  BookOpen,
  CheckCircle,
  ShieldCheck,
  Maximize2,
  Minimize2,
  Square,
  Circle,
  Minus,
  ArrowRight,
  Highlighter,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Download,
  Sun,
  Moon,
  Type,
  LogOut,
  UserPlus,
  UserCheck,
  Hand,
  RotateCcw
} from "lucide-react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
} from "@livekit/components-react";
import { Track, RoomEvent } from "livekit-client";
import {
  startLiveClass,
  joinLiveClass,
  endLiveClass,
  getLiveClassById,
  uploadRecordingVideo,
  getJoinRequests,
  admitStudent,
  admitAllStudents,
  rejectStudent,
  resetLiveClassTimer
} from "../services/liveClassApi";

// Curated Palette for Professional Digital Classroom Board
const WHITEBOARD_COLORS = [
  { name: "Royal Blue", value: "#2563eb" },
  { name: "Purple", value: "#7c3aed" },
  { name: "Crimson", value: "#dc2626" },
  { name: "Emerald", value: "#16a34a" },
  { name: "Orange", value: "#ea580c" },
  { name: "Amber", value: "#eab308" },
  { name: "Dark Slate", value: "#0f172a" },
  { name: "Pure White", value: "#ffffff" }
];

const STROKE_WIDTHS = [
  { label: "Fine", width: 2, dotSize: 3 },
  { label: "Medium", width: 4, dotSize: 5 },
  { label: "Bold", width: 8, dotSize: 7 },
  { label: "Marker", width: 16, dotSize: 10 }
];

// Helper to accurately resolve participant role from LiveKit metadata, identity, or names
const getParticipantRole = (p) => {
  if (!p) return "Student";
  try {
    if (p.metadata) {
      const meta = typeof p.metadata === "string" ? JSON.parse(p.metadata) : p.metadata;
      if (meta.roleLabel) return meta.roleLabel;
      if (meta.role === "academic" || meta.isAcademic) return "Academic Manager";
      if (meta.role === "admin" || meta.isAdmin) return "Administrator";
      if (meta.role === "teacher" || meta.isTeacher) return "Instructor (Host)";
      if (meta.role === "student") return "Student";
    }
  } catch (_) {}

  const id = (p.identity || "").toLowerCase();
  if (id.startsWith("academic_")) return "Academic Manager";
  if (id.startsWith("admin_")) return "Administrator";
  if (id.startsWith("tutor_") || id.startsWith("teacher_")) return "Instructor (Host)";

  const name = (p.name || "").toLowerCase();
  if (name.includes("academic") || name.includes("manager")) return "Academic Manager";
  if (name.includes("admin")) return "Administrator";
  if (name.includes("instructor") || name.includes("tutor")) return "Instructor (Host)";

  return p.isHost ? "Instructor (Host)" : "Student";
};

// Inner Studio Component with room context
const LiveStudioStage = ({
  liveClass,
  isTeacher,
  userRole = "teacher",
  roleTitle = "Tutor",
  hostBadge = "Instructor (Host)",
  userDisplayName = "",
  onEndClass
}) => {
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const [activeTab, setActiveTab] = useState(() => {
    return (liveClass?.id && sessionStorage.getItem(`isml_active_tab_${liveClass.id}`)) || "stage";
  });
  const [showAttendees, setShowAttendees] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(() => {
    const saved = liveClass?.id && sessionStorage.getItem(`isml_class_start_${liveClass.id}`);
    if (saved) {
      const diff = Math.floor((Date.now() - parseInt(saved, 10)) / 1000);
      if (diff >= 0 && diff < 3600) return diff;
    }
    if (liveClass?.actual_start) {
      const diff = Math.floor((Date.now() - new Date(liveClass.actual_start).getTime()) / 1000);
      if (diff >= 0 && diff < 3600) return diff;
    }
    return 0;
  });
  const [showEndModal, setShowEndModal] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [topicsCovered, setTopicsCovered] = useState("");

  // Hand Raise State & Audio Chime
  const [raisedHands, setRaisedHands] = useState(() => {
    try {
      const saved = liveClass?.id && sessionStorage.getItem(`isml_raised_hands_${liveClass.id}`);
      return saved ? JSON.parse(saved) : {};
    } catch (_) {
      return {};
    }
  });

  useEffect(() => {
    if (liveClass?.id) {
      sessionStorage.setItem(`isml_active_tab_${liveClass.id}`, activeTab);
    }
  }, [activeTab, liveClass?.id]);



  useEffect(() => {
    if (liveClass?.id) {
      try {
        sessionStorage.setItem(`isml_raised_hands_${liveClass.id}`, JSON.stringify(raisedHands));
      } catch (_) {}
    }
  }, [raisedHands, liveClass?.id]);

  // Suppress harmless WebRTC teardown errors on page reload/navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        if (room && room.state === "connected") {
          room.disconnect();
        }
      } catch (_) {}
    };

    const handleUnhandledRejection = (event) => {
      const reasonStr = event?.reason?.message || String(event?.reason || "");
      if (
        reasonStr.includes("PC manager is closed") ||
        reasonStr.includes("UnexpectedConnectionState") ||
        reasonStr.includes("could not establish data channel") ||
        reasonStr.includes("data transport is not ready") ||
        reasonStr.includes("closed")
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, [room]);

  const playHandRaiseChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {}
  };

  const handleLowerHand = async (studentId) => {
    setRaisedHands((prev) => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
    if (room && room.state === "connected" && room.localParticipant) {
      try {
        const payload = JSON.stringify({
          type: "LOWER_HAND_BY_TUTOR",
          targetStudentId: studentId
        });
        await room.localParticipant.publishData(new TextEncoder().encode(payload), { reliable: true }).catch(() => {});
      } catch (e) {}
    }
  };

  const handleLowerAllHands = async () => {
    setRaisedHands({});
    if (room && room.state === "connected" && room.localParticipant) {
      try {
        const payload = JSON.stringify({
          type: "LOWER_HAND_BY_TUTOR",
          targetStudentId: "ALL"
        });
        await room.localParticipant.publishData(new TextEncoder().encode(payload), { reliable: true }).catch(() => {});
      } catch (e) {}
    }
  };

  // Admissions & Inspection Control State
  const isAcademic = userRole === "academic" || userRole === "admin";
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showAdmissionsModal, setShowAdmissionsModal] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const handleLeaveInspection = () => {
    try {
      room.disconnect();
    } catch (e) {}
    window.location.href = "/academic/live-classes";
  };

  // Poll for student admissions (tutor view)
  useEffect(() => {
    if (isAcademic || !liveClass?.id) return;

    const fetchRequests = async () => {
      try {
        const res = await getJoinRequests(liveClass.id);
        setPendingRequests(res.requests || []);
      } catch (e) {}
    };

    fetchRequests();
    const interval = setInterval(fetchRequests, 3000);
    return () => clearInterval(interval);
  }, [liveClass?.id, isAcademic]);

  const handleAdmit = async (studentId) => {
    setActionLoadingId(studentId);
    try {
      await admitStudent(liveClass.id, studentId);
      setPendingRequests((prev) => prev.filter((r) => r.studentId !== studentId));
      if (room && room.state === "connected" && room.localParticipant) {
        try {
          const payload = new TextEncoder().encode(JSON.stringify({ type: "ADMITTED", studentId }));
          room.localParticipant.publishData(payload, { reliable: true }).catch(() => {});
        } catch (e) {}
      }
    } catch (err) {
      console.error("Failed to admit student:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAdmitAll = async () => {
    setActionLoadingId("ALL");
    try {
      await admitAllStudents(liveClass.id);
      setPendingRequests([]);
      if (room && room.state === "connected" && room.localParticipant) {
        try {
          const payload = new TextEncoder().encode(JSON.stringify({ type: "ADMIT_ALL" }));
          room.localParticipant.publishData(payload, { reliable: true }).catch(() => {});
        } catch (e) {}
      }
    } catch (err) {
      console.error("Failed to admit all:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (studentId) => {
    setActionLoadingId(studentId);
    try {
      await rejectStudent(liveClass.id, studentId);
      setPendingRequests((prev) => prev.filter((r) => r.studentId !== studentId));
      if (room && room.state === "connected" && room.localParticipant) {
        try {
          const payload = new TextEncoder().encode(JSON.stringify({ type: "REJECTED", studentId }));
          room.localParticipant.publishData(payload, { reliable: true }).catch(() => {});
        } catch (e) {}
      }
    } catch (err) {
      console.error("Failed to reject student:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Audio Speaking Activity State
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Whiteboard State
  const canvasRef = useRef(null);
  const boardContainerRef = useRef(null);
  const historyRef = useRef([]);
  const redoRef = useRef([]);
  const pointsRef = useRef([]);
  const [activeTool, setActiveTool] = useState("pen"); // "pen" | "highlighter" | "eraser" | "line" | "arrow" | "rect" | "circle" | "text"
  const [drawColor, setDrawColor] = useState("#2563eb");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [boardTheme, setBoardTheme] = useState("light"); // "light" (Paper Grid) | "dark" (Blackboard)
  const [isDrawing, setIsDrawing] = useState(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const snapshotRef = useRef(null);

  // Compositor & Recorder Refs
  const compositorCanvasRef = useRef(null);
  const cameraVideoElRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const compTimerRef = useRef(null);
  const remoteVideoElsRef = useRef({});

  // All Video Tracks
  const tracks = useTracks([Track.Source.Camera]);

  // Manual or automatic session timer restart
  const handleRestartTimer = async () => {
    const nowMs = Date.now();
    if (liveClass?.id) {
      sessionStorage.setItem(`isml_class_start_${liveClass.id}`, nowMs.toString());
      try {
        await resetLiveClassTimer(liveClass.id);
      } catch (_) {}
      try {
        if (room) {
          const payload = new TextEncoder().encode(JSON.stringify({ type: "TIMER_RESET", startMs: nowMs }));
          room.localParticipant.publishData(payload, { reliable: true });
        }
      } catch (_) {}
    }
    setElapsedSeconds(0);
  };

  // Resilient Timer - Continues seamlessly across refreshes, resets if stale (>60 mins)
  useEffect(() => {
    let startMs = null;
    const saved = liveClass?.id && sessionStorage.getItem(`isml_class_start_${liveClass.id}`);
    if (saved) {
      const parsed = parseInt(saved, 10);
      const diffSecs = Math.floor((Date.now() - parsed) / 1000);
      if (diffSecs >= 0 && diffSecs < 3600) {
        startMs = parsed;
      }
    }

    if (!startMs && liveClass?.actual_start) {
      const parsed = new Date(liveClass.actual_start).getTime();
      const diffSecs = Math.floor((Date.now() - parsed) / 1000);
      if (diffSecs >= 0 && diffSecs < 3600) {
        startMs = parsed;
      }
    }

    if (!startMs) {
      startMs = Date.now();
      if (liveClass?.id) {
        sessionStorage.setItem(`isml_class_start_${liveClass.id}`, startMs.toString());
      }
    }

    const calcElapsed = () => {
      const currentStart = (liveClass?.id && sessionStorage.getItem(`isml_class_start_${liveClass.id}`))
        ? parseInt(sessionStorage.getItem(`isml_class_start_${liveClass.id}`), 10)
        : startMs;
      const secs = Math.max(0, Math.floor((Date.now() - currentStart) / 1000));
      setElapsedSeconds(secs);
    };

    calcElapsed();
    const timer = setInterval(calcElapsed, 1000);
    return () => clearInterval(timer);
  }, [liveClass?.id, liveClass?.actual_start]);

  // Format Elapsed Time
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Audio Pipeline Refs
  const audioDestRef = useRef(null);
  const masterGainRef = useRef(null);
  const remoteGainRef = useRef(null);
  const directMicStreamRef = useRef(null);
  const micConnectedRef = useRef(false);
  const remoteAudioNodesRef = useRef(new Map()); // trackKey -> { source, stream, track, participantId }

  // Attach a remote participant audio track (Students & Academic Managers) to recording audio bus
  const attachRemoteAudioTrack = (track, participant) => {
    if (!track || !track.mediaStreamTrack || !audioContextRef.current || !remoteGainRef.current) {
      return;
    }
    const trackKey = track.sid || track.mediaStreamTrack.id || `${participant?.identity}_audio`;
    if (remoteAudioNodesRef.current.has(trackKey)) {
      return;
    }

    try {
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const mediaStream = new MediaStream([track.mediaStreamTrack]);
      const sourceNode = ctx.createMediaStreamSource(mediaStream);
      sourceNode.connect(remoteGainRef.current);

      remoteAudioNodesRef.current.set(trackKey, {
        source: sourceNode,
        stream: mediaStream,
        track,
        participantId: participant?.identity
      });

      console.log(`[AudioMixer] Connected attendee audio track [${trackKey}] (${participant?.name || participant?.identity}) to recording bus.`);
    } catch (err) {
      console.warn(`[AudioMixer] Failed to attach remote audio track:`, err.message);
    }
  };

  const detachRemoteAudioTrack = (track, participant) => {
    const trackKey = track?.sid || track?.mediaStreamTrack?.id || `${participant?.identity}_audio`;
    const entry = remoteAudioNodesRef.current.get(trackKey);
    if (entry) {
      try {
        entry.source.disconnect();
      } catch (_) {}
      remoteAudioNodesRef.current.delete(trackKey);
      console.log(`[AudioMixer] Detached attendee audio track [${trackKey}].`);
    }
  };

  // 1. Initialize Web Audio Pipeline & Audio Destination Node (Guarantees Audio Track Exists)
  useEffect(() => {
    let isCancelled = false;

    async function initAudioEngine() {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!audioContextRef.current) {
          const ctx = new AudioContextClass();
          audioContextRef.current = ctx;

          // Create permanent audio destination node for MediaRecorder
          const dest = ctx.createMediaStreamDestination();
          audioDestRef.current = dest;

          // Master gain node for Tutor microphone
          const gain = ctx.createGain();
          gain.gain.value = isMicrophoneEnabled ? 1.0 : 0.0;
          gain.connect(dest);
          masterGainRef.current = gain;

          // Dedicated remote attendee audio mixer gain node (mixes student & manager speech into recording)
          const remoteGain = ctx.createGain();
          remoteGain.gain.value = 1.0;
          remoteGain.connect(dest);
          remoteGainRef.current = remoteGain;

          // Connect microphone directly via getUserMedia for pristine audio
          try {
            const micStream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                channelCount: 2
              }
            });

            if (!isCancelled) {
              // Ensure mic is muted/disabled by default until teacher turns it on
              micStream.getAudioTracks().forEach((t) => {
                t.enabled = false;
              });
              directMicStreamRef.current = micStream;
              const micSource = ctx.createMediaStreamSource(micStream);
              micSource.connect(gain);
              gain.gain.value = 0.0;
              micConnectedRef.current = true;
              console.log("Direct Microphone pipeline connected (DEFAULT MUTED/OFF)");
            }
          } catch (micErr) {
            console.warn("Direct microphone capture note:", micErr.message);
          }
        }

        if (audioContextRef.current && audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume();
        }
      } catch (e) {
        console.warn("Audio engine setup note:", e.message);
      }
    }

    initAudioEngine();

    return () => {
      isCancelled = true;
      if (directMicStreamRef.current) {
        directMicStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      remoteAudioNodesRef.current.forEach((val) => {
        try {
          val.source.disconnect();
        } catch (_) {}
      });
      remoteAudioNodesRef.current.clear();
    };
  }, []);

  // 1b. Real-time Remote Audio Pipeline (Student & Attendee Mics -> Recording Bus)
  useEffect(() => {
    if (!room) return;

    const syncExistingTracks = () => {
      try {
        room.remoteParticipants.forEach((p) => {
          p.trackPublications.forEach((pub) => {
            if (pub.track && (pub.kind === Track.Kind.Audio || pub.track.kind === "audio")) {
              attachRemoteAudioTrack(pub.track, p);
            }
          });
        });
      } catch (e) {
        console.warn("[AudioMixer] Sync tracks note:", e.message);
      }
    };

    syncExistingTracks();

    const onTrackSubscribed = (track, publication, participant) => {
      if (track.kind === Track.Kind.Audio || track.kind === "audio") {
        attachRemoteAudioTrack(track, participant);
      }
    };

    const onTrackUnsubscribed = (track, publication, participant) => {
      if (track.kind === Track.Kind.Audio || track.kind === "audio") {
        detachRemoteAudioTrack(track, participant);
      }
    };

    const onParticipantDisconnected = (participant) => {
      remoteAudioNodesRef.current.forEach((val, key) => {
        if (val.participantId === participant.identity) {
          try {
            val.source.disconnect();
          } catch (_) {}
          remoteAudioNodesRef.current.delete(key);
        }
      });
    };

    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed);
    room.on(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);

    const syncInterval = setInterval(syncExistingTracks, 2000);

    return () => {
      clearInterval(syncInterval);
      room.off(RoomEvent.TrackSubscribed, onTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed);
      room.off(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
    };
  }, [room]);

  // Sync mic mute/unmute state with audio gain
  useEffect(() => {
    if (masterGainRef.current && audioContextRef.current) {
      const now = audioContextRef.current.currentTime;
      masterGainRef.current.gain.setValueAtTime(isMicrophoneEnabled ? 1.0 : 0.0, now);
      console.log(`Audio recording mixer gain: ${isMicrophoneEnabled ? "1.0 (ACTIVE)" : "0.0 (MUTED)"}`);
    }
    if (directMicStreamRef.current) {
      directMicStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = isMicrophoneEnabled;
      });
    }
  }, [isMicrophoneEnabled]);

  // Audio Activity Detection for speaking animations
  useEffect(() => {
    if (!localParticipant) return;

    const handleSpeaking = (speaking) => {
      setIsSpeaking(speaking);
    };
    localParticipant.on("isSpeakingChanged", handleSpeaking);

    let audioInterval = null;
    try {
      const micPub = localParticipant.getTrackPublication(Track.Source.Microphone);
      const audioTrack = micPub?.track?.mediaStreamTrack;

      if (audioTrack && isMicrophoneEnabled && audioContextRef.current) {
        const source = audioContextRef.current.createMediaStreamSource(new MediaStream([audioTrack]));
        const analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        audioInterval = setInterval(() => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setIsSpeaking(avg > 14);
        }, 120);
      }
    } catch (e) {
      console.log("Audio analyser note:", e.message);
    }

    return () => {
      localParticipant.off("isSpeakingChanged", handleSpeaking);
      if (audioInterval) clearInterval(audioInterval);
    };
  }, [localParticipant, isMicrophoneEnabled]);

  // 2. Safe Media Toggle Handlers

  const handleToggleMicrophone = async () => {
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch (err) {
      console.warn("Microphone toggle note:", err.message);
    }
  };

  const handleToggleCamera = async () => {
    try {
      await localParticipant.setCameraEnabled(!isCameraEnabled);
    } catch (err) {
      console.warn("Camera toggle note:", err.message);
    }
  };

  // 3. Initialize Whiteboard Canvas & Background Grid
  const drawBackground = (ctx, width, height, theme) => {
    ctx.save();
    if (theme === "dark") {
      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, width, height);

      // Subtle Dot Grid
      ctx.fillStyle = "#1e293b";
      const dotSpacing = 32;
      for (let x = dotSpacing; x < width; x += dotSpacing) {
        for (let y = dotSpacing; y < height; y += dotSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, width, height);

      // Subtle Math Dot Grid
      ctx.fillStyle = "#cbd5e1";
      const dotSpacing = 28;
      for (let x = dotSpacing; x < width; x += dotSpacing) {
        for (let y = dotSpacing; y < height; y += dotSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  };

  const initializedThemeRef = useRef(null);

  // Ensure canvas dimensions match 1:1 container display pixels (True MS Paint feel)
  useEffect(() => {
    const handleResize = () => {
      const container = boardContainerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const rect = container.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);

      if (w <= 50 || h <= 50) return;

      if (canvas.width !== w || canvas.height !== h) {
        let tempCanvas = null;
        if (canvas.width > 0 && canvas.height > 0) {
          tempCanvas = document.createElement("canvas");
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          const tempCtx = tempCanvas.getContext("2d");
          tempCtx.drawImage(canvas, 0, 0);
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        drawBackground(ctx, w, h, boardTheme);

        if (tempCanvas) {
          ctx.drawImage(tempCanvas, 0, 0, w, h);
        } else if (liveClass?.id) {
          const savedDataUrl = localStorage.getItem(`isml_wb_canvas_${liveClass.id}`);
          if (savedDataUrl) {
            const img = new Image();
            img.onload = () => {
              try {
                ctx.drawImage(img, 0, 0, w, h);
                historyRef.current = [ctx.getImageData(0, 0, w, h)];
                broadcastWhiteboardState();
              } catch (_) {}
            };
            img.src = savedDataUrl;
          }
        }

        historyRef.current = [ctx.getImageData(0, 0, w, h)];
        redoRef.current = [];
        initializedThemeRef.current = boardTheme;
      }
    };

    handleResize();

    let ro = null;
    if (boardContainerRef.current && window.ResizeObserver) {
      ro = new ResizeObserver(() => {
        handleResize();
      });
      ro.observe(boardContainerRef.current);
    }

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (ro) ro.disconnect();
    };
  }, [activeTab, boardTheme]);

  // Direct 1:1 pixel coordinate helper (Zero-offset, sub-pixel accurate)
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;

    const x = Math.max(0, Math.min(canvas.width, clientX - rect.left));
    const y = Math.max(0, Math.min(canvas.height, clientY - rect.top));

    return { x, y };
  };

  // Whiteboard Drawing Handlers (MS Paint Smooth Ink Engine)
  const startDrawing = (e) => {
    if (e.button && e.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      if (e.pointerId) canvas.setPointerCapture(e.pointerId);
    } catch (_) {}

    const { x, y } = getCanvasCoords(e);
    setIsDrawing(true);
    startPosRef.current = { x, y };
    pointsRef.current = [{ x, y }];

    const ctx = canvas.getContext("2d");
    snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const resolvedColor = boardTheme === "dark" && drawColor === "#0f172a" ? "#ffffff" : drawColor;

    if (activeTool === "text") {
      const text = window.prompt("Enter text to add to whiteboard:");
      if (text) {
        ctx.fillStyle = resolvedColor;
        ctx.font = `bold ${strokeWidth * 3 + 16}px Inter, sans-serif`;
        ctx.fillText(text, x, y);
        historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        redoRef.current = [];
      }
      setIsDrawing(false);
      return;
    }

    // Instant click dot render (decimals, periods, dots, math symbols)
    if (activeTool === "pen") {
      ctx.beginPath();
      ctx.arc(x, y, strokeWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = resolvedColor;
      ctx.fill();
    } else if (activeTool === "highlighter") {
      ctx.beginPath();
      ctx.arc(x, y, (strokeWidth * 3) / 2, 0, Math.PI * 2);
      ctx.fillStyle = resolvedColor;
      ctx.globalAlpha = 0.35;
      ctx.fill();
      ctx.globalAlpha = 1.0;
    } else if (activeTool === "eraser") {
      ctx.beginPath();
      ctx.arc(x, y, (strokeWidth * 5) / 2, 0, Math.PI * 2);
      ctx.fillStyle = boardTheme === "dark" ? "#090d16" : "#f8fafc";
      ctx.fill();
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { x, y } = getCanvasCoords(e);
    const startPos = startPosRef.current;

    const resolvedColor = boardTheme === "dark" && drawColor === "#0f172a" ? "#ffffff" : drawColor;
    const points = pointsRef.current;
    points.push({ x, y });

    if (activeTool === "pen") {
      ctx.strokeStyle = resolvedColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (points.length === 2) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else if (points.length > 2) {
        // High-precision Midpoint Quadratic Bézier Spline for silky smooth penmanship
        const p0 = points[points.length - 3];
        const p1 = points[points.length - 2];
        const p2 = points[points.length - 1];

        const mid1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
        const mid2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

        ctx.beginPath();
        ctx.moveTo(mid1.x, mid1.y);
        ctx.quadraticCurveTo(p1.x, p1.y, mid2.x, mid2.y);
        ctx.stroke();
      }
    } else if (activeTool === "highlighter") {
      ctx.strokeStyle = resolvedColor;
      ctx.lineWidth = strokeWidth * 4;
      ctx.lineCap = "square";
      ctx.lineJoin = "miter";
      ctx.globalAlpha = 0.35;

      const prev = points[points.length - 2];
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    } else if (activeTool === "eraser") {
      ctx.strokeStyle = boardTheme === "dark" ? "#090d16" : "#f8fafc";
      ctx.lineWidth = strokeWidth * 5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const prev = points[points.length - 2];
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (snapshotRef.current) {
      // Shapes Live Preview
      ctx.putImageData(snapshotRef.current, 0, 0);
      ctx.strokeStyle = resolvedColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (activeTool === "line") {
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else if (activeTool === "arrow") {
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(x, y);
        ctx.stroke();

        const angle = Math.atan2(y - startPos.y, x - startPos.x);
        const headLen = strokeWidth * 3 + 12;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - headLen * Math.cos(angle - Math.PI / 6), y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(x, y);
        ctx.lineTo(x - headLen * Math.cos(angle + Math.PI / 6), y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      } else if (activeTool === "rect") {
        ctx.strokeRect(startPos.x, startPos.y, x - startPos.x, y - startPos.y);
      } else if (activeTool === "circle") {
        const radiusX = Math.abs(x - startPos.x) / 2;
        const radiusY = Math.abs(y - startPos.y) / 2;
        const centerX = Math.min(startPos.x, x) + radiusX;
        const centerY = Math.min(startPos.y, y) + radiusY;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  };

  // Whiteboard Real-Time Broadcaster to Room Data Channel
  const broadcastWhiteboardState = (override = {}) => {
    try {
      if (!room || room.state !== "connected" || !room.localParticipant) {
        return;
      }
      const canvas = canvasRef.current;
      let dataUrl = null;
      if (canvas) {
        dataUrl = canvas.toDataURL("image/webp", 0.6);
        if (liveClass?.id) {
          try {
            localStorage.setItem(`isml_wb_canvas_${liveClass.id}`, dataUrl);
          } catch (_) {}
        }
      }
      const payload = JSON.stringify({
        type: "WHITEBOARD_SYNC",
        activeTab,
        boardTheme,
        dataUrl,
        ...override
      });
      room.localParticipant.publishData(new TextEncoder().encode(payload), { reliable: true }).catch(() => {});
    } catch (err) {
      console.warn("Whiteboard broadcast error:", err);
    }
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    pointsRef.current = [];
    const canvas = canvasRef.current;
    if (canvas) {
      if (e?.pointerId) {
        try {
          canvas.releasePointerCapture(e.pointerId);
        } catch (_) {}
      }
      const ctx = canvas.getContext("2d");
      historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      if (historyRef.current.length > 30) {
        historyRef.current.shift();
      }
      redoRef.current = [];
      broadcastWhiteboardState();
    }
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || historyRef.current.length <= 1) return;
    const current = historyRef.current.pop();
    redoRef.current.push(current);
    const prev = historyRef.current[historyRef.current.length - 1];
    if (prev) {
      const ctx = canvas.getContext("2d");
      ctx.putImageData(prev, 0, 0);
      broadcastWhiteboardState();
    }
  };

  const handleRedo = () => {
    const canvas = canvasRef.current;
    if (!canvas || redoRef.current.length === 0) return;
    const next = redoRef.current.pop();
    historyRef.current.push(next);
    const ctx = canvas.getContext("2d");
    ctx.putImageData(next, 0, 0);
    broadcastWhiteboardState();
  };

  const clearWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    drawBackground(ctx, canvas.width, canvas.height, boardTheme);
    historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
    redoRef.current = [];
    if (liveClass?.id) {
      localStorage.removeItem(`isml_wb_canvas_${liveClass.id}`);
    }
    broadcastWhiteboardState();
  };

  // Broadcast Tab Change or Board Theme Change to all attendees
  useEffect(() => {
    broadcastWhiteboardState({ activeTab, boardTheme });
  }, [activeTab, boardTheme]);

  // Handle incoming room data (Sync requests, Hand Raises)
  useEffect(() => {
    if (!room) return;
    const handleData = (payload) => {
      try {
        const decoded = JSON.parse(new TextDecoder().decode(payload));
        if (decoded.type === "REQUEST_SYNC") {
          broadcastWhiteboardState();
        }
      } catch (e) {}
    };
    room.on("dataReceived", handleData);
    return () => {
      room.off("dataReceived", handleData);
    };
  }, [room, activeTab, boardTheme]);

  // Keyboard Shortcuts: Ctrl+Z (Undo), Ctrl+Y / Ctrl+Shift+Z (Redo)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (activeTab !== "whiteboard") return;
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab]);

  const exportWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `ISML_Lecture_Notes_${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  // 4. UNIFIED CLASSROOM COMPOSITOR (Records Whiteboard + Dynamic Participant Stage Grid + Clear Mic Audio)
  useEffect(() => {
    if (!liveClass?.recording_enabled) return;

    // Helper: Draw smooth rounded rectangle
    const drawRoundedRect = (ctx, x, y, width, height, radius = 12) => {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.arcTo(x + width, y, x + width, y + radius, radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
      ctx.lineTo(x + radius, y + height);
      ctx.arcTo(x, y + height, x, y + height - radius, radius);
      ctx.lineTo(x, y + radius);
      ctx.arcTo(x, y, x + radius, y, radius);
      ctx.closePath();
    };

    // Helper: Draw participant tile (Video or Stylized Virtual Classroom Avatar Card)
    const drawParticipantTile = (ctx, p, x, y, w, h, timeNow) => {
      ctx.save();

      // 1. Base Tile Shape & Clip
      const cardRadius = Math.min(16, Math.max(8, Math.round(w * 0.03)));
      drawRoundedRect(ctx, x, y, w, h, cardRadius);
      ctx.clip();

      // 2. Card Background Gradient (Deep slate studio look, NEVER pure black)
      const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
      bgGrad.addColorStop(0, "#1e293b");
      bgGrad.addColorStop(1, "#0b0f19");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(x, y, w, h);

      // Subtle interior grid lines for rich texture
      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 1;
      const gridStep = 32;
      for (let gx = x; gx < x + w; gx += gridStep) {
        ctx.beginPath();
        ctx.moveTo(gx, y);
        ctx.lineTo(gx, y + h);
        ctx.stroke();
      }

      // 3. Render Video Stream OR Stylized Avatar
      const isVideoLive = p.isCameraEnabled && p.videoEl && p.videoEl.readyState >= 2 && p.videoEl.videoWidth > 0;
      if (isVideoLive) {
        try {
          const vw = p.videoEl.videoWidth;
          const vh = p.videoEl.videoHeight;
          const scale = Math.max(w / vw, h / vh);
          const sw = w / scale;
          const sh = h / scale;
          const sx = (vw - sw) / 2;
          const sy = (vh - sh) / 2;
          ctx.drawImage(p.videoEl, sx, sy, sw, sh, x, y, w, h);
        } catch (e) {
          // Fallback if drawImage encounters a transient frame state
        }
      } else {
        // Elegant Virtual Classroom Avatar Presentation
        const avatarRadius = Math.min(w * 0.16, h * 0.22, 58);
        const avatarCenterX = x + w / 2;
        const avatarCenterY = y + h / 2 - Math.max(16, h * 0.08);

        // Glowing wave ring if speaking
        if (p.isSpeaking) {
          const pulseSize = 4 + Math.sin(timeNow / 150) * 3;
          ctx.beginPath();
          ctx.arc(avatarCenterX, avatarCenterY, avatarRadius + pulseSize, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(16, 185, 129, 0.35)";
          ctx.fill();
        }

        // Avatar Circle
        ctx.beginPath();
        ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
        const avGrad = ctx.createLinearGradient(
          avatarCenterX - avatarRadius,
          avatarCenterY - avatarRadius,
          avatarCenterX + avatarRadius,
          avatarCenterY + avatarRadius
        );
        const isAcademic = (p.role || "").includes("Academic");
        if (p.isHost) {
          avGrad.addColorStop(0, "#2563eb");
          avGrad.addColorStop(1, "#1d4ed8");
        } else if (isAcademic) {
          avGrad.addColorStop(0, "#7c3aed");
          avGrad.addColorStop(1, "#6b21a8");
        } else {
          avGrad.addColorStop(0, "#059669");
          avGrad.addColorStop(1, "#047857");
        }
        ctx.fillStyle = avGrad;
        ctx.fill();

        ctx.strokeStyle = p.isSpeaking ? "#10b981" : "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = p.isSpeaking ? 3 : 2;
        ctx.stroke();

        // Initial Letter
        const initial = (p.name || (p.isHost ? "T" : (isAcademic ? "A" : "S")))[0]?.toUpperCase() || (p.isHost ? "T" : (isAcademic ? "A" : "S"));
        ctx.fillStyle = "#ffffff";
        const letterFontSize = Math.max(16, Math.round(avatarRadius * 0.9));
        ctx.font = `bold ${letterFontSize}px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(initial, avatarCenterX, avatarCenterY);

        // Name under avatar
        const nameY = avatarCenterY + avatarRadius + Math.max(18, h * 0.09);
        ctx.fillStyle = "#f8fafc";
        const nameFontSize = Math.min(22, Math.max(13, Math.round(w * 0.045)));
        ctx.font = `bold ${nameFontSize}px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const displayName = p.name || (p.isHost ? "Instructor" : (isAcademic ? "Academic Manager" : "Student"));
        ctx.fillText(displayName, avatarCenterX, nameY);

        // Role Tag under Name
        const badgeY = nameY + Math.max(18, h * 0.07);
        const roleText = p.role || (p.isHost ? "Instructor (Host)" : (isAcademic ? "Academic Manager" : "Student"));
        const badgeFontSize = Math.max(10, Math.min(13, Math.round(nameFontSize * 0.7)));
        ctx.font = `600 ${badgeFontSize}px Inter, sans-serif`;
        const textWidth = ctx.measureText(roleText).width;
        const badgeW = textWidth + 16;
        const badgeH = badgeFontSize + 10;

        drawRoundedRect(ctx, avatarCenterX - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 6);
        ctx.fillStyle = isAcademic
          ? "rgba(126, 34, 206, 0.35)"
          : (p.isHost ? "rgba(37, 99, 235, 0.25)" : "rgba(71, 85, 105, 0.3)");
        ctx.fill();
        ctx.strokeStyle = isAcademic
          ? "rgba(192, 132, 252, 0.8)"
          : (p.isHost ? "rgba(59, 130, 246, 0.6)" : "rgba(148, 163, 184, 0.4)");
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = isAcademic ? "#f3e8ff" : (p.isHost ? "#93c5fd" : "#cbd5e1");
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(roleText, avatarCenterX, badgeY);
      }

      // Restore clip for outer overlays
      ctx.restore();
      ctx.save();

      // 4. Outer Border Ring (Emerald for speaking, Amber for hand raise, Slate otherwise)
      drawRoundedRect(ctx, x, y, w, h, cardRadius);
      if (p.isSpeaking) {
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 3.5;
      } else if (p.isHandRaised) {
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 3.5;
      } else {
        ctx.strokeStyle = "rgba(51, 65, 85, 0.8)";
        ctx.lineWidth = 1.5;
      }
      ctx.stroke();

      // 5. Bottom Left Status Pill
      const pillH = Math.max(22, Math.min(30, Math.round(h * 0.09)));
      const pillY = y + h - pillH - 10;
      const pillX = x + 10;
      const pillFontSize = Math.max(10, Math.min(12, Math.round(w * 0.03)));
      ctx.font = `500 ${pillFontSize}px Inter, sans-serif`;
      const pillIsAcademic = (p.role || "").includes("Academic");
      const pillLabel = p.isHost
        ? `${p.name || "Instructor"} (Host)`
        : (pillIsAcademic ? `${p.name || "Academic Manager"} (Academic Manager)` : `${p.name || "Student"}`);
      const pillTextW = ctx.measureText(pillLabel).width;
      const pillW = pillTextW + (p.isSpeaking ? 50 : 32);

      drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 8);
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Status Dot
      ctx.beginPath();
      ctx.arc(pillX + 11, pillY + pillH / 2, 4, 0, Math.PI * 2);
      ctx.fillStyle = p.isSpeaking ? "#10b981" : "#64748b";
      ctx.fill();

      // Pill Name
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(pillLabel, pillX + 20, pillY + pillH / 2);

      // Equalizer Bars if Speaking
      if (p.isSpeaking) {
        const eqX = pillX + 24 + pillTextW;
        const eqCenterY = pillY + pillH / 2;
        const b1 = 4 + Math.abs(Math.sin(timeNow / 120)) * 8;
        const b2 = 5 + Math.abs(Math.sin((timeNow + 60) / 100)) * 11;
        const b3 = 3 + Math.abs(Math.sin((timeNow + 120) / 140)) * 7;

        ctx.fillStyle = "#10b981";
        ctx.fillRect(eqX, eqCenterY - b1 / 2, 2.5, b1);
        ctx.fillRect(eqX + 4.5, eqCenterY - b2 / 2, 2.5, b2);
        ctx.fillRect(eqX + 9, eqCenterY - b3 / 2, 2.5, b3);
      }

      // 6. Top Right Hand Raised Indicator (if raised)
      if (p.isHandRaised) {
        const hrW = 105;
        const hrH = 26;
        const hrX = x + w - hrW - 10;
        const hrY = y + 10;

        drawRoundedRect(ctx, hrX, hrY, hrW, hrH, 6);
        ctx.fillStyle = "#f59e0b";
        ctx.fill();

        ctx.fillStyle = "#000000";
        ctx.font = "bold 11px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("✋ Hand Raised", hrX + hrW / 2, hrY + hrH / 2);
      }

      ctx.restore();
    };

    // Helper: Render Studio Header Bar on Compositor Canvas
    const drawStudioHeader = (ctx, liveClassData, participantCount, role, hostName, timeNow) => {
      ctx.save();
      // Header background
      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, 1280, 52);
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 52);
      ctx.lineTo(1280, 52);
      ctx.stroke();

      // Pulsing RED REC indicator
      const recRadius = 4.5;
      const pulse = Math.abs(Math.sin(timeNow / 400));
      ctx.beginPath();
      ctx.arc(28, 26, recRadius + pulse * 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(239, 68, 68, ${0.4 + pulse * 0.4})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(28, 26, recRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.fill();

      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 12px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText("REC", 40, 26);

      // Vertical separator
      ctx.strokeStyle = "#334155";
      ctx.beginPath();
      ctx.moveTo(76, 17);
      ctx.lineTo(76, 35);
      ctx.stroke();

      // Batch Name & Class Title
      const batchName = liveClassData?.batches?.batch_name || "Modern Languages";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px Inter, sans-serif";
      ctx.fillText(batchName, 88, 26);

      const batchWidth = ctx.measureText(batchName).width;
      ctx.fillStyle = "#64748b";
      ctx.font = "13px Inter, sans-serif";
      ctx.fillText("•", 98 + batchWidth, 26);

      const classTitle = liveClassData?.title || "Virtual Classroom Session";
      ctx.fillStyle = "#94a3b8";
      ctx.font = "500 13px Inter, sans-serif";
      ctx.fillText(classTitle, 110 + batchWidth, 26);

      // Right Side: Attendees Count Pill
      const countLabel = `👥 ${participantCount} Attendee${participantCount === 1 ? "" : "s"}`;
      ctx.font = "600 12px Inter, sans-serif";
      const cW = ctx.measureText(countLabel).width + 20;
      const cX = 1280 - cW - 20;
      drawRoundedRect(ctx, cX, 13, cW, 26, 13);
      ctx.fillStyle = "#1e293b";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#38bdf8";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(countLabel, cX + cW / 2, 26);

      ctx.restore();
    };

    // 1. Connect local camera track to hidden offscreen video element
    const localCamPub = localParticipant.getTrackPublication(Track.Source.Camera);
    const localCamTrack =
      localCamPub?.track?.mediaStreamTrack ||
      tracks.find((t) => t.participant.isLocal && t.source === Track.Source.Camera)?.publication?.track?.mediaStreamTrack ||
      tracks.find((t) => t.participant.isLocal && t.source === Track.Source.Camera)?.track?.mediaStreamTrack;

    if (cameraVideoElRef.current) {
      if (isCameraEnabled && localCamTrack) {
        const curStream = cameraVideoElRef.current.srcObject;
        if (!curStream || curStream.getVideoTracks()[0] !== localCamTrack) {
          cameraVideoElRef.current.srcObject = new MediaStream([localCamTrack]);
        }
        if (cameraVideoElRef.current.paused) {
          cameraVideoElRef.current.play().catch(() => {});
        }
      } else if (!isCameraEnabled && cameraVideoElRef.current.srcObject) {
        cameraVideoElRef.current.srcObject = null;
      }
    }

    // 2. Connect remote participants' camera tracks to their video elements
    remoteParticipants.forEach((p) => {
      const rEl = remoteVideoElsRef.current[p.identity];
      if (!rEl) return;
      const pTrack = tracks.find((t) => t.participant.identity === p.identity && t.source === Track.Source.Camera);
      const rCamTrack =
        pTrack?.publication?.track?.mediaStreamTrack ||
        pTrack?.track?.mediaStreamTrack ||
        p.getTrackPublication(Track.Source.Camera)?.track?.mediaStreamTrack;

      if (p.isCameraEnabled && rCamTrack) {
        const curStream = rEl.srcObject;
        if (!curStream || curStream.getVideoTracks()[0] !== rCamTrack) {
          rEl.srcObject = new MediaStream([rCamTrack]);
        }
        if (rEl.paused) {
          rEl.play().catch(() => {});
        }
      } else if (!p.isCameraEnabled && rEl.srcObject) {
        rEl.srcObject = null;
      }
    });

    const micTrack = localParticipant.getTrackPublication(Track.Source.Microphone)?.track?.mediaStreamTrack;

    // Initialize 30fps Compositor Loop
    const compCanvas = compositorCanvasRef.current;
    if (!compCanvas) return;
    const cCtx = compCanvas.getContext("2d");

    if (compTimerRef.current) clearInterval(compTimerRef.current);

    compTimerRef.current = setInterval(() => {
      const timeNow = Date.now();

      // Assemble all participants (Tutor + Remote Students)
      const allParticipants = [
        {
          identity: localParticipant.identity,
          name: localParticipant.name && localParticipant.name !== "Tutor" ? localParticipant.name : (userDisplayName || roleTitle),
          role: hostBadge || "Instructor (Host)",
          isHost: true,
          isSpeaking: isSpeaking,
          isCameraEnabled: isCameraEnabled,
          videoEl: cameraVideoElRef.current
        },
        ...remoteParticipants.map((p) => {
          const isHandRaised = !!raisedHands[p.identity];
          const rEl = remoteVideoElsRef.current[p.identity];
          const isCamOn = !!(p.isCameraEnabled || tracks.some((t) => t.participant.identity === p.identity && t.source === Track.Source.Camera && !t.publication?.isMuted));
          const pRole = getParticipantRole(p);
          return {
            identity: p.identity,
            name: p.name || (pRole === "Academic Manager" ? "Academic Manager" : "Student"),
            role: pRole,
            isHost: pRole === "Instructor (Host)",
            isSpeaking: p.isSpeaking,
            isHandRaised: isHandRaised,
            isCameraEnabled: isCamOn,
            videoEl: rEl
          };
        })
      ];

      if (activeTab === "whiteboard" && canvasRef.current) {
        // Mode A: Whiteboard Presentation Active
        cCtx.fillStyle = boardTheme === "dark" ? "#090d16" : "#f8fafc";
        cCtx.fillRect(0, 0, 1280, 720);

        // Composite Whiteboard Canvas
        cCtx.drawImage(canvasRef.current, 0, 0, 1280, 720);

        // Corner PiP for Tutor
        const pw = 250;
        const ph = 145;
        const px = 1280 - pw - 20;
        const py = 720 - ph - 20;
        drawParticipantTile(cCtx, allParticipants[0], px, py, pw, ph, timeNow);
      } else {
        // Mode B: DYNAMIC VIRTUAL CLASSROOM GRID STAGE (Records Full Attendees Grid View)
        // 1. Studio Stage Background (Deep rich gradient, NEVER flat black)
        const stageGrad = cCtx.createLinearGradient(0, 0, 0, 720);
        stageGrad.addColorStop(0, "#0b101d");
        stageGrad.addColorStop(1, "#060911");
        cCtx.fillStyle = stageGrad;
        cCtx.fillRect(0, 0, 1280, 720);

        // 2. Studio Top Header Bar
        drawStudioHeader(cCtx, liveClass, allParticipants.length, roleTitle, allParticipants[0].name, timeNow);

        // 3. Dynamic Participant Grid Layout
        const count = allParticipants.length;
        if (count === 1) {
          // Single Hero Tile (Tutor)
          const tileW = 980;
          const tileH = 551;
          const tileX = 20 + (1240 - tileW) / 2;
          const tileY = 68 + (636 - tileH) / 2;
          drawParticipantTile(cCtx, allParticipants[0], tileX, tileY, tileW, tileH, timeNow);
        } else if (count === 2) {
          // 2 Side-by-Side Equal Tiles (Tutor + Student)
          const gap = 20;
          const tileW = (1240 - gap) / 2;
          const tileH = 460;
          const tileY = 68 + (636 - tileH) / 2;
          drawParticipantTile(cCtx, allParticipants[0], 20, tileY, tileW, tileH, timeNow);
          drawParticipantTile(cCtx, allParticipants[1], 20 + tileW + gap, tileY, tileW, tileH, timeNow);
        } else if (count === 3 || count === 4) {
          // 2x2 Grid
          const gapX = 20;
          const gapY = 16;
          const tileW = (1240 - gapX) / 2;
          const tileH = (636 - gapY) / 2;
          if (count === 3) {
            drawParticipantTile(cCtx, allParticipants[0], 20, 68, tileW, tileH, timeNow);
            drawParticipantTile(cCtx, allParticipants[1], 20 + tileW + gapX, 68, tileW, tileH, timeNow);
            // Center the 3rd tile on the 2nd row
            const centerTileX = 20 + (1240 - tileW) / 2;
            drawParticipantTile(cCtx, allParticipants[2], centerTileX, 68 + tileH + gapY, tileW, tileH, timeNow);
          } else {
            drawParticipantTile(cCtx, allParticipants[0], 20, 68, tileW, tileH, timeNow);
            drawParticipantTile(cCtx, allParticipants[1], 20 + tileW + gapX, 68, tileW, tileH, timeNow);
            drawParticipantTile(cCtx, allParticipants[2], 20, 68 + tileH + gapY, tileW, tileH, timeNow);
            drawParticipantTile(cCtx, allParticipants[3], 20 + tileW + gapX, 68 + tileH + gapY, tileW, tileH, timeNow);
          }
        } else {
          // Multi-card Responsive Grid (3 cols x rows)
          const cols = Math.min(3, count);
          const rows = Math.ceil(count / cols);
          const gapX = 16;
          const gapY = 14;
          const tileW = (1240 - (cols - 1) * gapX) / cols;
          const tileH = (636 - (rows - 1) * gapY) / rows;

          allParticipants.forEach((p, idx) => {
            const r = Math.floor(idx / cols);
            const c = idx % cols;
            const px = 20 + c * (tileW + gapX);
            const py = 68 + r * (tileH + gapY);
            drawParticipantTile(cCtx, p, px, py, tileW, tileH, timeNow);
          });
        }
      }
    }, 1000 / 30); // 30 FPS steady composite

    // Connect LiveKit microphone track to audio mixer as secondary redundant source if available
    if (micTrack && audioContextRef.current && masterGainRef.current && !micConnectedRef.current) {
      try {
        const livekitMicSource = audioContextRef.current.createMediaStreamSource(new MediaStream([micTrack]));
        livekitMicSource.connect(masterGainRef.current);
        micConnectedRef.current = true;
        console.log("LiveKit mic track linked to audio mixer!");
      } catch (e) {
        console.warn("LiveKit mic link note:", e.message);
      }
    }

    // Initialize MediaRecorder from Composite Canvas Stream + Clean Audio Destination
    if (!mediaRecorderRef.current && audioDestRef.current) {
      try {
        const compVideoStream = compCanvas.captureStream(30);
        const combinedStream = new MediaStream();

        // 1. Add 30fps composite video track
        const vTrack = compVideoStream.getVideoTracks()[0];
        if (vTrack) {
          combinedStream.addTrack(vTrack);
        }

        // 2. Add guaranteed audio track from AudioDestination
        const aTrack = audioDestRef.current.stream.getAudioTracks()[0];
        if (aTrack) {
          combinedStream.addTrack(aTrack);
          console.log("Opus audio track successfully attached to MediaRecorder!");
        } else {
          console.warn("Audio destination had no audio track!");
        }

        let mimeType = "video/webm;codecs=vp8,opus";
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "video/webm";
        }

        const recorder = new MediaRecorder(combinedStream, {
          mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
          videoBitsPerSecond: 2500000, // 2.5 Mbps crisp 720p HD
          audioBitsPerSecond: 128000   // 128 kbps crystal-clear Opus audio
        });

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };

        recorder.start(1000);
        mediaRecorderRef.current = recorder;
        console.log("Classroom Compositor & Audio Recorder started successfully with VIDEO + AUDIO!");
      } catch (err) {
        console.warn("MediaRecorder start note:", err.message);
      }
    }

    return () => {
      if (compTimerRef.current) clearInterval(compTimerRef.current);
    };
  }, [tracks, activeTab, isCameraEnabled, liveClass, localParticipant, remoteParticipants, boardTheme, isSpeaking, raisedHands, hostBadge, roleTitle, userDisplayName]);

  // Comprehensive Room Data Channel Listener (Chat, Hand Raise, Hand Lower)
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (payload, participant) => {
      try {
        const decoded = new TextDecoder().decode(payload);
        const data = JSON.parse(decoded);

        if (data.type === "HAND_RAISE") {
          const studentId = data.studentId || participant?.identity || "student";
          const studentName = data.studentName || participant?.name || "Student";
          setRaisedHands((prev) => ({
            ...prev,
            [studentId]: {
              id: studentId,
              name: studentName,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            }
          }));
          playHandRaiseChime();
        } else if (data.type === "HAND_LOWER") {
          const studentId = data.studentId || participant?.identity || "student";
          setRaisedHands((prev) => {
            const next = { ...prev };
            delete next[studentId];
            return next;
          });
        }
      } catch (err) {
        console.warn("Room data receive note:", err);
      }
    };

    room.on("dataReceived", handleDataReceived);
    return () => {
      room.off("dataReceived", handleDataReceived);
    };
  }, [room]);



  // Safe End Class Trigger (Gathers Compositor Video and Hands Over)
  const handleConfirmEnd = async () => {
    setIsEnding(true);
    let recordedBlob = null;
    if (compTimerRef.current) clearInterval(compTimerRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        await new Promise((resolve) => {
          const to = setTimeout(resolve, 1000);
          mediaRecorderRef.current.onstop = () => {
            clearTimeout(to);
            resolve();
          };
          try {
            mediaRecorderRef.current.stop();
          } catch (_) {
            clearTimeout(to);
            resolve();
          }
        });
        if (recordedChunksRef.current.length > 0) {
          recordedBlob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        }
      } catch (e) {
        console.warn("Recorder stopping note:", e.message);
      }
    }
    setShowEndModal(false);
    setIsEnding(false);
    onEndClass(recordedBlob, elapsedSeconds, topicsCovered.trim());
  };

  const getLanguageTopicPlaceholder = () => {
    const courseLang = (liveClass?.courses?.language || liveClass?.language || "").toUpperCase();
    const batchName = (liveClass?.batches?.batch_name || liveClass?.batch_name || "").toUpperCase();
    const courseName = (liveClass?.courses?.course_name || liveClass?.course_name || liveClass?.title || "").toUpperCase();
    const combined = `${courseLang} ${batchName} ${courseName}`;

    if (combined.includes("FRENCH") || combined.includes("-FR-")) {
      return "e.g., Leçon 4 : Les Verbes au Passé Composé, Vocabulaire du Voyage & Prononciation (or leave blank)";
    }
    if (combined.includes("GERMAN") || combined.includes("-DE-") || combined.includes("-GE-")) {
      return "e.g., Lektion 4 : Perfekt & Modalverben, Alltagskommunikation & Aussprache (or leave blank)";
    }
    if (combined.includes("JAPANESE") || combined.includes("-JA-") || combined.includes("-JP-")) {
      return "e.g., Lesson 4 : JLPT N5 Kanji, Te-form Conjugation & Conversation Practice (or leave blank)";
    }
    if (combined.includes("SPANISH") || combined.includes("-ES-")) {
      return "e.g., Lección 4 : El Pretérito Indefinido, Conversación Diaria & Fonética (or leave blank)";
    }
    return "e.g., Module 4: Grammar Conjugation, Daily Vocabulary & Oral Pronunciation Practice (or leave blank)";
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white font-sans overflow-hidden">
      {/* Active Offscreen Canvas & Participant Video Elements for HD Recording (Kept active in DOM tree for GPU decoding) */}
      <div
        style={{
          position: "fixed",
          top: "-9999px",
          left: "-9999px",
          width: "640px",
          height: "360px",
          opacity: 0,
          pointerEvents: "none",
          zIndex: -9999
        }}
        aria-hidden="true"
      >
        <canvas ref={compositorCanvasRef} width={1280} height={720} />
        <video ref={cameraVideoElRef} autoPlay playsInline muted />
        {remoteParticipants.map((p) => (
          <video
            key={p.identity}
            ref={(el) => {
              if (el) {
                remoteVideoElsRef.current[p.identity] = el;
              } else {
                delete remoteVideoElsRef.current[p.identity];
              }
            }}
            autoPlay
            playsInline
            muted
          />
        ))}
      </div>

      {/* Top Studio Header */}
      <header className="h-13 sm:h-16 bg-slate-900/95 border-b border-slate-800 px-2.5 sm:px-6 flex items-center justify-between z-20 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-4 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-bold text-xs sm:text-sm tracking-wide uppercase text-slate-200 truncate max-w-[100px] xs:max-w-[130px] sm:max-w-xs md:max-w-md">
              {liveClass?.batches?.batch_name || "Modern Languages"}
            </span>
          </div>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-sm font-medium text-slate-300 truncate max-w-xs md:max-w-md hidden sm:inline">
            {liveClass?.title || "Live Lecture Session"}
          </span>

          {/* Academic Manager Inspection Role Badge */}
          {isAcademic && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-amber-950/70 border border-amber-700/60 rounded-full text-amber-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Inspection Mode (Observer)</span>
            </div>
          )}

          {/* Auto Recording Badge */}
          {liveClass?.recording_enabled && (
            <div className="flex items-center gap-1 px-1.5 sm:px-3 py-0.5 sm:py-1 bg-red-950/70 border border-red-800/80 rounded-full text-red-400 text-[10px] sm:text-xs font-semibold shrink-0">
              <Disc className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-500 animate-pulse" />
              <span className="hidden sm:inline">REC • Activity Recorded</span>
              <span className="sm:hidden font-mono font-bold text-[9px]">REC</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-mono bg-slate-800/80 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-slate-700 text-slate-300">
            <span>⏱️ {formatTime(elapsedSeconds)}</span>
            {!isAcademic && (
              <button
                onClick={handleRestartTimer}
                title="Restart session timer from 00:00"
                className="ml-0.5 p-0.5 hover:bg-slate-700 text-slate-400 hover:text-emerald-400 rounded transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>

          {isAcademic ? (
            <button
              onClick={handleLeaveInspection}
              className="flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-750 text-amber-300 border border-amber-600/50 text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
              title="Leave inspection without ending the live class"
            >
              <LogOut className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Leave Inspection</span>
              <span className="sm:hidden">Leave</span>
            </button>
          ) : (
            <>
              {/* Hand Raised Alert Button in Header */}
              {Object.keys(raisedHands).length > 0 && (
                <button
                  onClick={() => setShowAttendees(true)}
                  className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-amber-500 hover:bg-amber-400 text-black text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl shadow-md shadow-amber-500/30 animate-bounce cursor-pointer transition-all shrink-0"
                  title="Students raised hand! Click to view"
                >
                  <Hand className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">Hand Raised</span>
                  <span>({Object.keys(raisedHands).length})</span>
                </button>
              )}

              {pendingRequests.length > 0 && (
                <button
                  onClick={() => setShowAdmissionsModal(true)}
                  className="flex items-center gap-1 px-2 sm:px-3.5 py-1.5 sm:py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl transition-all cursor-pointer animate-pulse"
                >
                  <UserPlus className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Admissions</span>
                  <span>({pendingRequests.length})</span>
                </button>
              )}
              <button
                onClick={() => setShowEndModal(true)}
                className="flex items-center gap-1 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-red-600 hover:bg-red-700 text-white text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl shadow-md shadow-red-600/30 transition-all cursor-pointer"
              >
                <PhoneOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">End Class</span>
                <span className="sm:hidden">End</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Floating Hand Raised Notification Banner */}
      {Object.keys(raisedHands).length > 0 && (
        <div className="fixed top-15 sm:top-18 left-1/2 -translate-x-1/2 z-40 max-w-md w-[92%] sm:w-auto bg-slate-900/98 border-2 border-amber-500/80 rounded-2xl px-3.5 sm:px-4 py-2 sm:py-2.5 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 text-sm font-bold shrink-0 animate-bounce">
              ✋
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-amber-200 truncate">
                {Object.values(raisedHands)[0].name} {Object.keys(raisedHands).length > 1 ? `+${Object.keys(raisedHands).length - 1} more` : ""} raised hand!
              </p>
              <p className="text-[10px] text-slate-400 truncate">Wants to speak or ask a doubt</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => handleLowerHand(Object.values(raisedHands)[0].id)}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-bold rounded-lg shadow cursor-pointer transition-all"
            >
              Acknowledge
            </button>
            {Object.keys(raisedHands).length > 1 && (
              <button
                onClick={handleLowerAllHands}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-semibold rounded-lg border border-amber-500/40 cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Classroom Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Center Presentation Stage */}
        <div className="flex-1 flex flex-col p-0 sm:p-2 md:p-3 bg-slate-950 overflow-hidden relative">
          {/* PROFESSIONAL DIGITAL WHITEBOARD SUITE */}
          <div
            className={`flex-1 min-h-0 min-w-0 flex flex-col rounded-none sm:rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl relative border-0 sm:border ${
              boardTheme === "dark" ? "bg-[#090d16] border-slate-800" : "bg-[#f8fafc] border-slate-200"
            } ${activeTab === "whiteboard" ? "flex" : "hidden"}`}
          >
              {/* Floating Top Whiteboard Toolbar */}
              <div className="h-11 sm:h-14 lg:h-16 px-1.5 sm:px-4 flex items-center gap-1.5 sm:gap-2 z-10 border-b border-slate-800/80 bg-slate-900/95 backdrop-blur-xl shadow-lg text-slate-200 overflow-x-auto no-scrollbar touch-pan-x shrink-0">
                {/* Tool Selector */}
                <div className="flex items-center gap-0.5 bg-slate-800/80 p-0.5 rounded-lg sm:rounded-xl border border-slate-700/60 shrink-0">
                  <button
                    onClick={() => setActiveTool("pen")}
                    className={`p-1.5 sm:p-2 rounded-md sm:rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                      activeTool === "pen" ? "bg-blue-600 text-white shadow-md shadow-blue-500/30" : "text-slate-400 hover:text-white"
                    }`}
                    title="Smooth Pen"
                  >
                    <PenTool className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Pen</span>
                  </button>

                  <button
                    onClick={() => setActiveTool("highlighter")}
                    className={`p-1.5 sm:p-2 rounded-md sm:rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                      activeTool === "highlighter" ? "bg-amber-600 text-white shadow-md shadow-amber-500/30" : "text-slate-400 hover:text-white"
                    }`}
                    title="Highlight Marker"
                  >
                    <Highlighter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Marker</span>
                  </button>

                  <button
                    onClick={() => setActiveTool("line")}
                    className={`p-1.5 sm:p-2 rounded-md sm:rounded-lg transition-all ${
                      activeTool === "line" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                    title="Straight Line"
                  >
                    <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  <button
                    onClick={() => setActiveTool("arrow")}
                    className={`p-1.5 sm:p-2 rounded-md sm:rounded-lg transition-all ${
                      activeTool === "arrow" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                    title="Arrow Pointer"
                  >
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  <button
                    onClick={() => setActiveTool("rect")}
                    className={`p-1.5 sm:p-2 rounded-md sm:rounded-lg transition-all ${
                      activeTool === "rect" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                    title="Rectangle Box"
                  >
                    <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  <button
                    onClick={() => setActiveTool("circle")}
                    className={`p-1.5 sm:p-2 rounded-md sm:rounded-lg transition-all ${
                      activeTool === "circle" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                    title="Circle / Oval"
                  >
                    <Circle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  <button
                    onClick={() => setActiveTool("text")}
                    className={`p-1.5 sm:p-2 rounded-md sm:rounded-lg transition-all ${
                      activeTool === "text" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                    title="Text Note"
                  >
                    <Type className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  <button
                    onClick={() => setActiveTool("eraser")}
                    className={`p-1.5 sm:p-2 rounded-md sm:rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                      activeTool === "eraser" ? "bg-red-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                    title="Eraser"
                  >
                    <Eraser className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Eraser</span>
                  </button>
                </div>

                <div className="h-5 w-px bg-slate-700/60 shrink-0" />

                {/* Color Swatches + Custom Picker (Visible on Mobile & Desktop) */}
                <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-slate-700/60 shrink-0">
                  {WHITEBOARD_COLORS.slice(0, 4).map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setDrawColor(c.value)}
                      className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full transition-all cursor-pointer ${
                        drawColor === c.value ? "scale-125 ring-2 ring-white shadow-lg" : "opacity-85 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                  <div className="hidden sm:flex items-center gap-1">
                    {WHITEBOARD_COLORS.slice(4, 7).map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setDrawColor(c.value)}
                        className={`w-5 h-5 rounded-full transition-all cursor-pointer ${
                          drawColor === c.value ? "scale-125 ring-2 ring-white shadow-lg" : "opacity-85 hover:opacity-100"
                        }`}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      />
                    ))}
                  </div>
                  <label className="relative w-4 h-4 sm:w-5 sm:h-5 rounded-full cursor-pointer flex items-center justify-center border border-slate-600 hover:scale-110 transition-transform overflow-hidden ml-0.5" title="Custom Color">
                    <input type="color" value={drawColor} onChange={(e) => setDrawColor(e.target.value)} className="opacity-0 absolute inset-0 cursor-pointer w-full h-full" />
                    <span className="text-[9px] sm:text-[10px]" style={{ color: drawColor }}>🎨</span>
                  </label>
                </div>

                {/* Stroke Width Selector (Desktop) */}
                <div className="hidden lg:flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-xl border border-slate-700/60 text-xs shrink-0">
                  {STROKE_WIDTHS.map((s) => (
                    <button
                      key={s.width}
                      onClick={() => setStrokeWidth(s.width)}
                      className={`px-2 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                        strokeWidth === s.width ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <span className="rounded-full bg-current" style={{ width: s.dotSize, height: s.dotSize }} />
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>

                <div className="h-5 w-px bg-slate-700/60 shrink-0" />

                {/* Actions & Theme Toggles */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={handleUndo}
                    className="p-1.5 sm:p-2 rounded-md sm:rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer"
                    title="Undo (Ctrl+Z)"
                  >
                    <Undo2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  <button
                    onClick={handleRedo}
                    className="p-1.5 sm:p-2 rounded-md sm:rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer"
                    title="Redo (Ctrl+Y)"
                  >
                    <Redo2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  <button
                    onClick={clearWhiteboard}
                    className="p-1.5 sm:p-2 rounded-md sm:rounded-lg bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-400 border border-slate-700 transition-all cursor-pointer"
                    title="Clear Board"
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  <button
                    onClick={exportWhiteboard}
                    className="p-1.5 sm:p-2 rounded-md sm:rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer"
                    title="Download Notes (PNG)"
                  >
                    <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  <button
                    onClick={() => setBoardTheme((prev) => (prev === "dark" ? "light" : "dark"))}
                    className="flex items-center gap-1 px-1.5 sm:px-3 py-1.5 rounded-md sm:rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition-all cursor-pointer"
                    title="Toggle Theme"
                  >
                    {boardTheme === "dark" ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-blue-400" />}
                    <span className="hidden md:inline">{boardTheme === "dark" ? "Paper Grid" : "Blackboard"}</span>
                  </button>
                </div>
              </div>

              {/* Whiteboard Workspace with Responsive Edge-to-Edge Canvas Frame */}
              <div className="flex-1 min-h-0 min-w-0 w-full h-full flex items-center justify-center p-0 sm:p-2 relative overflow-hidden bg-slate-950/90">
                <div
                  ref={boardContainerRef}
                  className={`relative aspect-video max-w-full max-h-full w-full h-auto flex items-center justify-center rounded-none sm:rounded-2xl overflow-hidden shadow-2xl border-0 sm:border transition-all ${
                    boardTheme === "dark"
                      ? "bg-[#090d16] border-slate-700/80 shadow-black/80"
                      : "bg-[#f8fafc] border-slate-300/80 shadow-slate-900/10"
                  }`}
                  style={{ aspectRatio: "16 / 9" }}
                >
                  <canvas
                    ref={canvasRef}
                    onPointerDown={startDrawing}
                    onPointerMove={draw}
                    onPointerUp={stopDrawing}
                    onPointerCancel={stopDrawing}
                    className={`w-full h-full block touch-none select-none ${
                      activeTool === "eraser"
                        ? "cursor-cell"
                        : activeTool === "text"
                        ? "cursor-text"
                        : "cursor-crosshair"
                    }`}
                  />

                  {/* Floating HD Studio Badge */}
                  <div className="absolute top-1.5 sm:top-3 left-1.5 sm:left-3 flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[9px] sm:text-[11px] font-medium text-slate-300 pointer-events-none select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="hidden sm:inline">1080p Studio Board • 16:9</span>
                    <span className="sm:hidden font-mono">16:9 HD</span>
                  </div>

                  {/* Floating Tutor PiP in Whiteboard Corner */}
                  {isCameraEnabled && (
                    <div className="absolute bottom-1.5 sm:bottom-4 right-1.5 sm:right-4 w-24 sm:w-44 md:w-52 aspect-video rounded-lg sm:rounded-2xl overflow-hidden shadow-2xl border sm:border-2 border-blue-500 bg-slate-900 z-10 pointer-events-none">
                      <VideoTrack
                        trackRef={tracks.find((t) => t.participant.isLocal && t.source === Track.Source.Camera)}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0.5 left-1 bg-black/70 px-1 py-0.2 rounded text-[8px] sm:text-[10px] font-semibold text-white">
                        {roleTitle} (Live)
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CAMERA VIDEO STAGE */}
            <div
              className={`flex-1 p-2 sm:p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 auto-rows-fr ${
                activeTab === "stage" ? "grid" : "hidden"
              }`}
            >
              {/* Local Participant (Tutor) Tile with Animated Speaking Ring */}
              <div
                className={`bg-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden relative flex items-center justify-center shadow-lg transition-all duration-300 ${
                  isSpeaking
                    ? "border-2 border-emerald-500 ring-4 ring-emerald-500/20 shadow-emerald-500/20 shadow-2xl"
                    : "border border-slate-800"
                }`}
              >
                {localParticipant.isCameraEnabled ? (
                  <VideoTrack
                    trackRef={tracks.find((t) => t.participant.isLocal && t.source === Track.Source.Camera)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-4">
                    <div
                      className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 shadow-lg transition-all ${
                        isSpeaking
                          ? "bg-emerald-600 text-white ring-4 ring-emerald-400/50 scale-110"
                          : "bg-blue-600 text-white"
                      }`}
                    >
                      <span className="text-2xl sm:text-3xl font-bold">
                        {((localParticipant.name && localParticipant.name !== "Tutor" ? localParticipant.name : userDisplayName) || roleTitle)[0]}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-200">
                      {localParticipant.name && localParticipant.name !== "Tutor"
                        ? localParticipant.name
                        : (userDisplayName ? `${userDisplayName} (You)` : `${roleTitle} (You)`)}
                    </p>
                    <span className="text-[11px] sm:text-xs text-blue-400 font-medium">{hostBadge}</span>
                  </div>
                )}

                {/* Bottom Left Status Pill */}
                <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 bg-black/60 backdrop-blur-md px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-medium flex items-center gap-1.5 sm:gap-2 border border-white/10">
                  <span className={`w-2 h-2 rounded-full ${isSpeaking ? "bg-emerald-400 animate-ping" : "bg-emerald-500"}`}></span>
                  <span className="truncate max-w-[120px] sm:max-w-none">
                    {localParticipant.name && localParticipant.name !== "Tutor"
                      ? localParticipant.name
                      : (userDisplayName || "You")} ({roleTitle})
                  </span>

                  {/* Animated Speaking Equalizer Wave Bars */}
                  {isSpeaking && (
                    <div className="flex items-end gap-0.5 h-3 ml-0.5">
                      <span className="w-0.5 bg-emerald-400 rounded-full animate-pulse h-2" />
                      <span className="w-0.5 bg-emerald-400 rounded-full animate-bounce h-3" />
                      <span className="w-0.5 bg-emerald-400 rounded-full animate-pulse h-1.5" />
                    </div>
                  )}
                </div>
              </div>

              {/* Remote Participants (Students) */}
              {remoteParticipants.map((p) => {
                const pTrack = tracks.find((t) => t.participant.identity === p.identity && t.source === Track.Source.Camera);
                const hasHandRaised = !!raisedHands[p.identity];
                return (
                  <div
                    key={p.identity}
                    className={`bg-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden relative flex items-center justify-center shadow-lg transition-all duration-300 ${
                      hasHandRaised
                        ? "border-2 border-amber-500 ring-4 ring-amber-500/30 shadow-amber-500/20 shadow-2xl"
                        : "border border-slate-800"
                    }`}
                  >
                    {/* Hand Raised badge on Student Tile */}
                    {hasHandRaised && (
                      <div className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-amber-500 text-black px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold flex items-center gap-1 shadow-lg animate-pulse z-10">
                        <span>✋</span>
                        <span>Hand Raised</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLowerHand(p.identity);
                          }}
                          className="ml-1 px-1.5 py-0.2 bg-black/20 hover:bg-black/40 text-black rounded text-[9px] cursor-pointer"
                          title="Lower hand"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {pTrack ? (
                      <VideoTrack trackRef={pTrack} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-4">
                        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full text-lg sm:text-xl font-bold flex items-center justify-center mx-auto mb-2 border ${
                          getParticipantRole(p) === "Academic Manager"
                            ? "bg-purple-950/80 border-purple-500/80 text-purple-200 shadow-lg shadow-purple-950/50"
                            : "bg-slate-800 border-slate-700 text-slate-300"
                        }`}>
                          {(p.name || (getParticipantRole(p) === "Academic Manager" ? "A" : "S"))[0]}
                        </div>
                        <p className="text-xs font-semibold text-slate-200">{p.name || getParticipantRole(p)}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          getParticipantRole(p) === "Academic Manager"
                            ? "bg-purple-950/80 border-purple-600/70 text-purple-300"
                            : "bg-slate-800/80 border-slate-700 text-slate-400"
                        }`}>
                          {getParticipantRole(p)}
                        </span>
                      </div>
                    )}
                    <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 bg-black/60 backdrop-blur-md px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-medium flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${p.isSpeaking ? "bg-emerald-400 animate-ping" : "bg-emerald-500"}`} />
                      <span className="text-white">{p.name || getParticipantRole(p)}</span>
                      {getParticipantRole(p) === "Academic Manager" && (
                        <span className="text-purple-300 font-bold text-[9px] px-1.5 py-0.2 bg-purple-950/90 rounded border border-purple-600/70">
                          Academic Manager
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
        </div>

        {/* Right Drawer: Attendees (Mobile Full-Height Sheet, Desktop Side Drawer) */}
        {showAttendees && (
          <aside className="fixed sm:relative inset-y-0 right-0 w-full sm:w-80 bg-slate-900/98 sm:bg-slate-900 border-l border-slate-800 flex flex-col z-40 sm:z-10 animate-in slide-in-from-right duration-200">
            <div className="flex-1 flex flex-col p-4">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
                <h4 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  Enrolled Attendees ({remoteParticipants.length + 1})
                </h4>
                <button onClick={() => setShowAttendees(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                <div className="p-2.5 bg-blue-950/40 border border-blue-800/60 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-blue-200">
                      {localParticipant.name && localParticipant.name !== "Tutor" ? localParticipant.name : (userDisplayName || "You")} ({roleTitle})
                    </p>
                    <p className="text-[10px] text-blue-400">{hostBadge}</p>
                  </div>
                  <span className="text-xs">🎤</span>
                </div>
                {remoteParticipants.map((p) => {
                  const hasHandRaised = !!raisedHands[p.identity];
                  return (
                    <div
                      key={p.identity}
                      className={`p-2.5 rounded-xl flex items-center justify-between border transition-all ${
                        hasHandRaised
                          ? "bg-amber-950/40 border-amber-500/60 shadow-md shadow-amber-500/10"
                          : "bg-slate-800/60 border-slate-800"
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-slate-200 truncate">{p.name || getParticipantRole(p)}</p>
                          {getParticipantRole(p) === "Academic Manager" && (
                            <span className="px-1.5 py-0.2 bg-purple-950/90 text-purple-300 border border-purple-600/70 text-[9px] font-bold rounded shrink-0">
                              Academic Manager
                            </span>
                          )}
                          {hasHandRaised && (
                            <span className="px-1.5 py-0.2 bg-amber-500 text-black text-[9px] font-bold rounded flex items-center gap-0.5 animate-pulse shrink-0">
                              <span>✋</span>
                              <span>Raised</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">{getParticipantRole(p)} • Online</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {hasHandRaised && (
                          <button
                            onClick={() => handleLowerHand(p.identity)}
                            className="px-2 py-0.5 bg-slate-750 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-[10px] font-semibold rounded cursor-pointer transition-all"
                          >
                            Lower
                          </button>
                        )}
                        <span className="text-xs">{p.isMicrophoneEnabled ? "🎤" : "🔇"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Floating Bottom Control Bar */}
      <footer className="h-16 sm:h-20 bg-slate-900 border-t border-slate-800 px-2 sm:px-6 flex items-center justify-between z-20 gap-1.5 sm:gap-4 shrink-0">
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Whiteboard vs Camera Stage Toggle */}
          <button
            onClick={() => setActiveTab((prev) => (prev === "stage" ? "whiteboard" : "stage"))}
            className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
              activeTab === "whiteboard"
                ? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-500/30"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750"
            }`}
          >
            <PenTool className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">{activeTab === "whiteboard" ? "Back to Video Stage" : "Open Whiteboard"}</span>
            <span className="sm:hidden">{activeTab === "whiteboard" ? "Stage" : "Board"}</span>
          </button>
        </div>

        {/* Core Media Controls with Mic Speaking Animations & Raised Hands */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Microphone with Real-time Speaking Equalizer Animation */}
          <button
            onClick={handleToggleMicrophone}
            className={`relative p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all shadow-md cursor-pointer flex items-center justify-center ${
              !isMicrophoneEnabled
                ? "bg-red-600 text-white hover:bg-red-700"
                : isSpeaking
                ? "bg-emerald-600 text-white ring-2 sm:ring-4 ring-emerald-400/50 shadow-lg shadow-emerald-500/40 scale-105"
                : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
            }`}
            title={isMicrophoneEnabled ? "Mute Mic" : "Unmute Mic"}
          >
            {isMicrophoneEnabled ? <Mic className="w-4 h-4 sm:w-5 sm:h-5" /> : <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />}

            {/* Speaking animated wave dots */}
            {isMicrophoneEnabled && isSpeaking && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 sm:h-3 sm:w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-emerald-500"></span>
              </span>
            )}
          </button>

          {/* Camera Button */}
          <button
            onClick={handleToggleCamera}
            className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all shadow-md cursor-pointer ${
              isCameraEnabled
                ? "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
            title={isCameraEnabled ? "Turn Off Camera" : "Turn On Camera"}
          >
            {isCameraEnabled ? <VideoIcon className="w-4 h-4 sm:w-5 sm:h-5" /> : <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          {/* Raised Hands Button right next to Mic & Camera */}
          <button
            onClick={() => setShowAttendees((prev) => !prev)}
            className={`relative p-2.5 sm:px-3.5 sm:py-3.5 rounded-xl sm:rounded-2xl transition-all shadow-md cursor-pointer flex items-center gap-1.5 sm:gap-2 ${
              Object.keys(raisedHands).length > 0
                ? "bg-amber-500 text-black hover:bg-amber-400 ring-2 sm:ring-4 ring-amber-400/50 shadow-lg shadow-amber-500/40 animate-pulse font-bold"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
            }`}
            title={
              Object.keys(raisedHands).length > 0
                ? `${Object.keys(raisedHands).length} student(s) raised hand! Click to view attendees`
                : "No hands raised"
            }
          >
            <Hand className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="text-xs sm:text-sm font-bold font-mono">
              {Object.keys(raisedHands).length}
            </span>
            <span className="hidden md:inline text-xs font-semibold">
              {Object.keys(raisedHands).length === 1 ? "Hand Raised" : "Hands Raised"}
            </span>
            {Object.keys(raisedHands).length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 sm:h-3 sm:w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-amber-500"></span>
              </span>
            )}
          </button>
        </div>

        {/* Side Panel Toggles */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={() => setShowAttendees((prev) => !prev)}
            className={`relative p-2 sm:p-3 rounded-lg sm:rounded-xl border transition-all cursor-pointer ${
              showAttendees ? "bg-blue-600 text-white border-blue-500" : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
            }`}
            title="Attendees"
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {Object.keys(raisedHands).length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-500 text-black text-[9px] font-bold rounded-full flex items-center justify-center animate-bounce shadow">
                ✋
              </span>
            )}
          </button>
        </div>
      </footer>

      {/* Responsive Confirmation Popup Modal for Ending Class */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative text-left">
            {/* Top Bar with Icon & Close */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
                  <PhoneOff className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">End Live Class?</h3>
                  <p className="text-xs text-slate-400">Classroom session will conclude for all students</p>
                </div>
              </div>
              <button
                onClick={() => !isEnding && setShowEndModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Session Info Pill */}
            <div className="bg-slate-800/70 border border-slate-700/50 rounded-2xl p-3.5 mb-4 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Class Batch:</span>
                <span className="font-semibold text-slate-200 truncate max-w-[200px]">
                  {liveClass?.batches?.batch_name || "Live Class Session"}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Session Duration:</span>
                <span className="font-mono font-bold text-emerald-400">⏱️ {formatTime(elapsedSeconds)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Recording Status:</span>
                <span className="text-blue-400 font-medium">Auto-saving lecture recording</span>
              </div>
            </div>

            {/* Optional Topics Covered Input Field */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                  Topics Covered Today
                </span>
                <span className="text-[11px] text-slate-500 font-normal italic">Optional</span>
              </label>
              <textarea
                value={topicsCovered}
                onChange={(e) => setTopicsCovered(e.target.value)}
                placeholder={getLanguageTopicPlaceholder()}
                rows={2}
                className="w-full px-3.5 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 resize-none transition-all"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                📌 This will be highlighted on the Recordings page for students and academic review.
              </p>
            </div>

            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Are you sure you want to end this live class now? All attendees will be disconnected and the classroom recording will be finalized.
            </p>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowEndModal(false)}
                disabled={isEnding}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel / Keep Teaching
              </button>
              <button
                onClick={handleConfirmEnd}
                disabled={isEnding}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isEnding ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Finalizing...</span>
                  </>
                ) : (
                  <>
                    <PhoneOff className="w-3.5 h-3.5" />
                    <span>Yes, End Class</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Quick Admission Notification for Tutor */}
      {!isAcademic && pendingRequests.length > 0 && !showAdmissionsModal && (
        <div className="fixed bottom-18 sm:bottom-24 left-2.5 right-2.5 sm:left-auto sm:right-6 sm:max-w-sm z-40 bg-slate-900/98 border border-amber-500/50 rounded-2xl p-3.5 sm:p-4 shadow-2xl animate-in slide-in-from-bottom-5 duration-300 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-300">
                  Student Knocking ({pendingRequests.length})
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">Just now</span>
              </div>
              <p className="text-xs text-slate-200 font-semibold truncate mt-1">
                {pendingRequests[0].studentName}
              </p>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                Reg: {pendingRequests[0].regNo}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => handleReject(pendingRequests[0].studentId)}
                  disabled={actionLoadingId === pendingRequests[0].studentId}
                  className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleAdmit(pendingRequests[0].studentId)}
                  disabled={actionLoadingId === pendingRequests[0].studentId}
                  className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Admit</span>
                </button>
                {pendingRequests.length > 1 && (
                  <button
                    onClick={() => setShowAdmissionsModal(true)}
                    className="py-1.5 px-2.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    All ({pendingRequests.length})
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Admissions Waiting Room Modal for Tutor */}
      {showAdmissionsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 shadow-2xl text-left">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Classroom Waiting Room</h3>
                  <p className="text-xs text-slate-400">
                    {pendingRequests.length} student(s) requesting to join
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAdmissionsModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto my-4 pr-1">
              {pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p className="text-xs">No students currently in the waiting room.</p>
                </div>
              ) : (
                pendingRequests.map((req) => (
                  <div
                    key={req.studentId}
                    className="flex items-center justify-between p-3 bg-slate-800/80 border border-slate-700 rounded-xl"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{req.studentName}</p>
                      <p className="text-[11px] text-slate-400 font-mono">Reg: {req.regNo}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReject(req.studentId)}
                        disabled={actionLoadingId === req.studentId}
                        className="px-2.5 py-1 text-xs text-slate-400 hover:text-red-400 bg-slate-700/50 hover:bg-slate-700 rounded-lg cursor-pointer"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleAdmit(req.studentId)}
                        disabled={actionLoadingId === req.studentId}
                        className="px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm cursor-pointer flex items-center gap-1 disabled:opacity-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Admit</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {pendingRequests.length > 1 && (
              <button
                onClick={handleAdmitAll}
                disabled={actionLoadingId === "ALL"}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/25 cursor-pointer mt-2 flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Admit All ({pendingRequests.length}) Students</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Main Studio Wrapper with Token fetching
const TutorLiveStudioPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [wsUrl, setWsUrl] = useState(null);
  const [liveClass, setLiveClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [endStatus, setEndStatus] = useState(null);

  // Decode JWT to identify Academic Manager vs Teacher vs Admin
  const userToken = localStorage.getItem("token");
  let userRole = "teacher";
  let userDisplayName = "";
  if (userToken) {
    try {
      const decoded = JSON.parse(atob(userToken.split(".")[1]));
      userRole = decoded.role || (decoded.student_id ? "student" : "teacher");
      userDisplayName = decoded.full_name || decoded.name || "";
    } catch (e) {
      console.warn("Token decode note:", e.message);
    }
  }

  const roleTitle = userRole === "academic"
    ? "Academic Manager"
    : (userRole === "admin" ? "Administrator" : "Tutor");

  const hostBadge = userRole === "academic"
    ? "Academic Manager (Inspector)"
    : (userRole === "admin" ? "Administrator (Inspector)" : "Instructor (Host)");

  const returnDestination = userRole === "teacher" ? "/teacher" : "/academic/live-classes";

  useEffect(() => {
    initLiveSession();
  }, [id]);

  const initLiveSession = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Get Class Details
      const classRes = await getLiveClassById(id);
      const lc = classRes.liveClass;
      setLiveClass(lc);

      // 2. Start or Join session (Academic Manager inspects, Tutor starts or continues)
      let sessionRes;
      if (userRole === "academic" || userRole === "admin") {
        if (lc?.status !== "LIVE") {
          setError("This live class has not been started yet. Please wait for the assigned tutor to start the class.");
          setLoading(false);
          return;
        }
        sessionRes = await joinLiveClass(id);
      } else {
        if (lc?.status === "LIVE") {
          // Class is already LIVE! Tutor is continuing active session across refresh
          try {
            sessionRes = await joinLiveClass(id);
          } catch (e) {
            sessionRes = await startLiveClass(id);
          }
        } else {
          try {
            sessionRes = await startLiveClass(id);
          } catch (e) {
            sessionRes = await joinLiveClass(id);
          }
        }
      }

      setToken(sessionRes.token);
      setWsUrl(sessionRes.wsUrl || "wss://neet-n80sqwyo.livekit.cloud");
    } catch (err) {
      console.error("Failed to initialize studio:", err);
      setError(err.message || "Failed to connect to live classroom studio");
    } finally {
      setLoading(false);
    }
  };

  const handleEndClass = async (recordedBlob, elapsedSecs, topics = "") => {
    setEndStatus({
      status: "saving",
      title: "Finalizing & Saving Session...",
      message: "Closing classroom, saving attendance, and finalizing class recordings..."
    });

    try {
      // 1. Immediately end live class in backend - fast, guaranteed < 1s
      await endLiveClass(id, { topics_covered: topics });

      // 2. Clear all persistent session storage keys
      if (id) {
        localStorage.removeItem(`isml_wb_canvas_${id}`);
        sessionStorage.removeItem(`isml_class_start_${id}`);
        sessionStorage.removeItem(`isml_active_tab_${id}`);
        sessionStorage.removeItem(`isml_chat_${id}`);
        sessionStorage.removeItem(`isml_raised_hands_${id}`);
      }

      // 3. Optional client video upload with 3.5s race timeout (server LiveKit egress is primary)
      if (recordedBlob && recordedBlob.size > 2000) {
        try {
          const uploadPromise = async () => {
            const formData = new FormData();
            formData.append("video", recordedBlob, `class_${id}_${Date.now()}.webm`);
            formData.append("duration_seconds", elapsedSecs || 60);
            if (topics) formData.append("topics_covered", topics);
            await uploadRecordingVideo(id, formData);
          };
          await Promise.race([
            uploadPromise(),
            new Promise((resolve) => setTimeout(resolve, 3500))
          ]);
        } catch (uploadErr) {
          console.warn("Client upload note:", uploadErr.message);
        }
      }

      setEndStatus({
        status: "success",
        title: "Live Class Ended Successfully",
        message: userRole === "teacher"
          ? "Class completed and recordings finalized. Redirecting to your dashboard..."
          : "Class completed and recordings finalized. Redirecting to classes schedule..."
      });

      setTimeout(() => {
        navigate(returnDestination);
      }, 1500);
    } catch (err) {
      console.error("End class error:", err);
      if (id) {
        sessionStorage.removeItem(`isml_class_start_${id}`);
      }
      setEndStatus({
        status: "error",
        title: "Notice While Ending Class",
        message: err.message || "Failed to finalize session cleanly."
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <h2 className="text-xl font-bold">Preparing ISML Live Studio...</h2>
        <p className="text-sm text-slate-400 mt-1">Connecting camera, microphone & live session</p>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-red-950 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-800">
            ✕
          </div>
          <h2 className="text-xl font-bold mb-2">Connection Failed</h2>
          <p className="text-sm text-slate-400 mb-6">{error || "Unable to connect to live studio"}</p>
          <button
            onClick={() => navigate(returnDestination)}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-all"
          >
            {userRole === "teacher" ? "Back to Dashboard" : "Back to Schedule"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Responsive End Class & Recording Status Modal */}
      {endStatus && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative">
            {endStatus.status === "saving" && (
              <>
                <div className="w-16 h-16 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{endStatus.title}</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4">
                  {endStatus.message}
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-950/60 border border-blue-800/60 rounded-full text-blue-400 text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                  Saving class audio and video
                </div>
                <div className="mt-6 pt-4 border-t border-slate-800/80">
                  <button
                    onClick={() => {
                      if (id) sessionStorage.removeItem(`isml_class_start_${id}`);
                      navigate(returnDestination);
                    }}
                    className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    Taking longer? Click here to return to {userRole === "teacher" ? "Dashboard" : "Schedule"}
                  </button>
                </div>
              </>
            )}

            {endStatus.status === "success" && (
              <>
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{endStatus.title}</h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
                  {endStatus.message}
                </p>
                <button
                  onClick={() => navigate(returnDestination)}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
                >
                  {userRole === "teacher" ? "Return to Dashboard Now" : "Return to Schedule Now"}
                </button>
              </>
            )}

            {endStatus.status === "error" && (
              <>
                <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
                  <PhoneOff className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{endStatus.title}</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">
                  {endStatus.message}
                </p>
                <button
                  onClick={() => navigate(returnDestination)}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer"
                >
                  {userRole === "teacher" ? "Return to Dashboard" : "Return to Schedule"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
      <LiveKitRoom
        video={false}
        audio={false}
        token={token}
        serverUrl={wsUrl}
        connect={true}
        data-lk-theme="default"
      >
        <RoomAudioRenderer />
        <LiveStudioStage
          liveClass={liveClass}
          isTeacher={true}
          userRole={userRole}
          roleTitle={roleTitle}
          hostBadge={hostBadge}
          userDisplayName={userDisplayName}
          onEndClass={handleEndClass}
        />
      </LiveKitRoom>
    </>
  );
};

export default TutorLiveStudioPage;
