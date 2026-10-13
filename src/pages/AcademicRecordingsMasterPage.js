import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
  Film,
  Play,
  Pause,
  Search,
  Clock,
  Calendar,
  HardDrive,
  X,
  Gauge,
  CheckCircle2,
  Loader2,
  Video,
  ArrowLeft,
  Filter,
  UploadCloud,
  Check,
  BookOpen,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  AlertCircle,
  Menu,
  Radio,
  Layers,
  LayoutGrid,
  ChevronRight,
  GraduationCap,
  ArrowUpDown,
  Sparkles,
  Info,
  ArrowRight,
  ExternalLink
} from "lucide-react";
import { getAllRecordings, getRecordingStreamUrl, uploadRecordingVideo } from "../services/liveClassApi";
import { getBatches, getTeacherBatches } from "../services/Api";

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

const AcademicRecordingsMasterPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const decoded = token ? JSON.parse(atob(token.split(".")[1])) : null;
  const isTeacher = decoded?.role === "teacher";

  const [recordings, setRecordings] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [batchFilter, setBatchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grouped"); // 'grouped' | 'grid'
  const [sortOrder, setSortOrder] = useState("session_asc"); // 'session_asc' | 'session_desc' | 'newest'

  // Responsive Mobile Navigation State
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const handleMobileMenuStateChange = (event) => {
      setIsMobileMenuOpen(event.detail);
    };
    window.addEventListener("mobileMenuStateChange", handleMobileMenuStateChange);
    return () => window.removeEventListener("mobileMenuStateChange", handleMobileMenuStateChange);
  }, []);

  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    window.dispatchEvent(new CustomEvent("toggleMobileMenu", { detail: newState }));
  };

  const [activeVideo, setActiveVideo] = useState(null);
  const [playbackLoading, setPlaybackLoading] = useState(false);
  const [playbackError, setPlaybackError] = useState(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const videoRef = React.useRef(null);
  const playerContainerRef = React.useRef(null);
  const progressBarRef = React.useRef(null);
  const fileInputRef = React.useRef(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [targetUploadRec, setTargetUploadRec] = useState(null);

  // Advanced Video Player Controls State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverX, setHoverX] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = React.useRef(null);

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    return localStorage.getItem("sidebarCollapsed") === "true" ? "6rem" : "16rem";
  });

  useEffect(() => {
    loadData();
  }, [batchFilter, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    const params = { limit: 200 };
    if (batchFilter) params.batch_id = batchFilter;
    if (statusFilter !== "ALL") params.status = statusFilter;

    try {
      const recRes = await getAllRecordings(params);
      setRecordings(recRes.recordings || []);
    } catch (err) {
      console.error("Error loading master recordings:", err);
    }

    try {
      let batchList = [];
      if (isTeacher) {
        const tBatchRes = await getTeacherBatches(token);
        batchList = tBatchRes?.data || (Array.isArray(tBatchRes) ? tBatchRes : []);
      } else {
        const batchRes = await getBatches(token);
        batchList = Array.isArray(batchRes) 
          ? batchRes 
          : (batchRes?.data || batchRes?.batches || []);
      }
      setBatches(batchList);
    } catch (err) {
      console.error("Error loading batches for recordings:", err);
    }

    setLoading(false);
  };

  const handlePlayRecording = async (rec) => {
    const hasVideo = Boolean(rec.storage_object_path || rec.raw_egress_url || (rec.file_size_bytes && rec.file_size_bytes > 0));
    const isRecording = rec.status === 'RECORDING' || rec.live_classes?.status === 'LIVE';

    if (isRecording) {
      alert("🔴 This class session is currently LIVE in progress. The video recording will be ready once the session ends.");
      return;
    }

    if (!hasVideo) {
      alert("⚠️ No video file is available for this session yet.\n\nPlease click the 'Upload Video' button on this card to attach an MP4 or WebM video file.");
      return;
    }

    setPlaybackLoading(true);
    setPlaybackError(null);
    try {
      const streamRes = await getRecordingStreamUrl(rec.id);
      const url = streamRes.playbackUrl || streamRes.streamUrl;
      if (!url) {
        throw new Error(streamRes.error || "Recording video stream is not available yet");
      }
      setActiveVideo({
        ...rec,
        playbackUrl: url,
        title: rec.display_title || rec.live_classes?.title || "Class Recording",
        status: streamRes.status || rec.status || "READY"
      });
      setCurrentTime(0);
      setSeekValue(0);
      setIsPlaying(true);
      setShowControls(true);
      setDuration(Number(rec.duration_seconds) || 0);
    } catch (err) {
      console.error("Failed to load recording stream:", err);
      alert(err.message || "Failed to load recording video. Please verify the video file exists.");
    } finally {
      setPlaybackLoading(false);
    }
  };

  const getEffectiveDuration = () => {
    if (duration > 0 && isFinite(duration)) return duration;
    if (videoRef.current && isFinite(videoRef.current.duration) && videoRef.current.duration > 0) {
      return videoRef.current.duration;
    }
    if (activeVideo?.duration_seconds && Number(activeVideo.duration_seconds) > 0) {
      return Number(activeVideo.duration_seconds);
    }
    return 0;
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '00:00';
    const totalSecs = Math.floor(seconds);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const commitSeek = (targetTime) => {
    if (videoRef.current && isFinite(targetTime)) {
      const effDur = getEffectiveDuration();
      let clamped = Math.max(0, targetTime);
      if (effDur > 0) clamped = Math.min(clamped, effDur);
      videoRef.current.currentTime = clamped;
      setCurrentTime(clamped);
      setSeekValue(clamped);
    }
  };

  const handleSeekChange = (e) => {
    const val = parseFloat(e.target.value);
    setSeekValue(val);
    setCurrentTime(val);
  };

  const handleSeekEnd = (e) => {
    setIsSeeking(false);
    const targetTime = parseFloat(e.currentTarget.value);
    commitSeek(targetTime);
  };

  const handleProgressMouseMove = (e) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const effDur = getEffectiveDuration();
    if (effDur <= 0) return;
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = clickX / rect.width;
    setHoverX(clickX);
    setHoverTime(percent * effDur);
  };

  const handleProgressClick = (e) => {
    if (!progressBarRef.current || !videoRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const effDur = getEffectiveDuration();
    if (effDur <= 0) return;
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const targetTime = (clickX / rect.width) * effDur;
    commitSeek(targetTime);
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const skipTime = (seconds) => {
    if (videoRef.current) {
      const vid = videoRef.current;
      const cur = vid.currentTime;
      const dur = getEffectiveDuration();
      let nextTime = cur + seconds;
      if (nextTime < 0) nextTime = 0;
      if (dur > 0 && nextTime > dur) nextTime = dur;
      vid.currentTime = nextTime;
      setCurrentTime(nextTime);
      setSeekValue(nextTime);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch((err) => console.error(err));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch((err) => console.error(err));
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  };

  const handleUploadClick = (rec) => {
    setTargetUploadRec(rec);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !targetUploadRec) return;

    if (!file.type.includes("video") && !file.name.match(/\.(mp4|webm|mkv|mov)$/i)) {
      alert("Please select a valid video file (.mp4 or .webm)");
      return;
    }

    setUploadingId(targetUploadRec.id);
    try {
      const formData = new FormData();
      formData.append("video", file);
      
      await uploadRecordingVideo(targetUploadRec.id, formData);
      alert("✅ Video successfully uploaded and saved for this class!");
      await loadData();
    } catch (err) {
      alert("❌ Upload failed: " + err.message);
    } finally {
      setUploadingId(null);
      setTargetUploadRec(null);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds || Number(seconds) <= 0) return null;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 MB";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatISTDate = (isoString) => {
    if (!isoString) return "";
    try {
      return new Date(isoString).toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch (_) {
      return "";
    }
  };

  const formatISTTime = (isoString) => {
    if (!isoString) return "";
    try {
      return new Date(isoString).toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      }) + " IST";
    } catch (_) {
      return "";
    }
  };

  // Compute recordings count per batch
  const batchRecordingCounts = useMemo(() => {
    const counts = {};
    recordings.forEach((r) => {
      const bId = r.batch_id || r.batches?.batch_id;
      if (bId) {
        counts[bId] = (counts[bId] || 0) + 1;
      }
    });
    return counts;
  }, [recordings]);

  // Filtered and sorted recordings
  const filtered = useMemo(() => {
    const list = recordings.filter((r) => {
      const title = r.live_classes?.title || "";
      const batchName = r.batches?.batch_name || "";
      const tutorName = r.live_classes?.teachers?.full_name || r.live_classes?.teachers?.name || "";
      const term = searchTerm.toLowerCase();
      const matchesSearch = title.toLowerCase().includes(term) || batchName.toLowerCase().includes(term) || tutorName.toLowerCase().includes(term);
      const matchesBatch = !batchFilter || r.batch_id === batchFilter || r.batches?.batch_id === batchFilter;
      return matchesSearch && matchesBatch;
    });

    return list.sort((a, b) => {
      if (sortOrder === "session_asc") {
        return (a.live_classes?.session_number || 1) - (b.live_classes?.session_number || 1);
      }
      if (sortOrder === "session_desc") {
        return (b.live_classes?.session_number || 1) - (a.live_classes?.session_number || 1);
      }
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [recordings, searchTerm, batchFilter, sortOrder]);

  // Group filtered recordings by batch
  const groupedBatches = useMemo(() => {
    const map = new Map();
    filtered.forEach((rec) => {
      const bId = rec.batch_id || rec.batches?.batch_id || "general";
      if (!map.has(bId)) {
        map.set(bId, {
          batchId: bId,
          batchName: rec.batches?.batch_name || "General Batch",
          courseName: rec.live_classes?.courses?.course_name,
          language: rec.live_classes?.courses?.language,
          teacherName: rec.live_classes?.teachers?.full_name || rec.live_classes?.teachers?.name,
          items: []
        });
      }
      map.get(bId).items.push(rec);
    });

    // Ensure sessions inside each batch group are ordered chronologically by session_number
    const groups = Array.from(map.values());
    groups.forEach((g) => {
      g.items.sort((a, b) => (a.live_classes?.session_number || 1) - (b.live_classes?.session_number || 1));
    });
    return groups;
  }, [filtered]);

  // Selected batch object
  const selectedBatchObj = useMemo(() => {
    if (!batchFilter) return null;
    return batches.find((b) => (b.batch_id || b.id) === batchFilter);
  }, [batches, batchFilter]);

  // Single card renderer component
  const renderRecordingCard = (item) => {
    const hasVideo = Boolean(item.storage_object_path || item.raw_egress_url || (item.file_size_bytes && item.file_size_bytes > 0));
    const isRecording = item.status === 'RECORDING' || item.live_classes?.status === 'LIVE';
    const durationText = formatDuration(item.duration_seconds);
    const scheduledDateText = formatISTDate(item.live_classes?.scheduled_start);
    const scheduledTimeText = formatISTTime(item.live_classes?.scheduled_start);

    return (
      <div
        key={item.id}
        className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col group relative"
      >
        {/* Card Header Preview */}
        <div className="h-44 bg-slate-900 relative flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/40 to-transparent z-10" />

          {/* Action Overlay */}
          {isRecording ? (
            <div className="flex flex-col items-center gap-1.5 z-20">
              <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg shadow-red-600/30 animate-pulse">
                <Radio className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-300 bg-black/60 px-2 py-0.5 rounded">
                Class In Session
              </span>
            </div>
          ) : hasVideo ? (
            <button
              onClick={() => handlePlayRecording(item)}
              className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:bg-purple-500 transition-all z-20 cursor-pointer"
              title="Play Recording"
            >
              <Play className="w-5 h-5 ml-0.5 fill-white" />
            </button>
          ) : (
            <button
              onClick={() => handleUploadClick(item)}
              className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 hover:border-purple-400 hover:bg-purple-600 text-slate-300 hover:text-white flex items-center justify-center transition-all z-20 cursor-pointer group/btn"
              title="Click to upload video for this session"
            >
              <UploadCloud className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
            </button>
          )}

          {/* Top Session Number Pill & Part Badge */}
          <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900/90 text-purple-300 border border-purple-500/30 shadow-sm flex items-center gap-1">
              <span>Session #{item.live_classes?.session_number || 1}</span>
            </span>
            {item.part_number && (
              <span className="px-2 py-1 rounded-lg text-xs font-extrabold bg-purple-600 text-white shadow-sm flex items-center gap-1">
                <span>Part {item.part_number}</span>
              </span>
            )}
          </div>

          {/* Top Batch Badge */}
          <div className="absolute top-3 right-3 z-20">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-black/60 text-slate-200 backdrop-blur-sm border border-white/10 max-w-[140px] truncate">
              {item.batches?.batch_name || "General Batch"}
            </span>
          </div>

          {/* Bottom Info Bar */}
          <div className="absolute bottom-3 left-3 right-3 z-20 flex justify-between items-center text-xs text-slate-300">
            <div className="flex items-center gap-1.5 text-slate-300 text-[11px] truncate">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-medium text-white">{scheduledDateText || "Recorded"}</span>
            </div>

            {isRecording ? (
              <span className="px-2 py-0.5 rounded bg-red-600/90 text-white font-bold text-[10px] flex items-center gap-1 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                LIVE
              </span>
            ) : hasVideo && durationText ? (
              <span className="px-2 py-0.5 rounded bg-black/70 font-mono text-[11px] text-white">
                {durationText}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold">
                NO VIDEO
              </span>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {item.part_number && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-purple-100 text-purple-700">
                    Part {item.part_number}
                  </span>
                )}
                <h3 className="font-bold text-slate-800 text-sm sm:text-base line-clamp-1">
                  {item.display_title || item.live_classes?.title || "Untitled Lecture"}
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-500 line-clamp-1 mb-2">
              <span className="text-slate-400">Tutor: </span>
              <strong className="text-slate-700 font-semibold">
                {item.live_classes?.teachers?.full_name || item.live_classes?.teachers?.name || "Assigned Instructor"}
              </strong>
            </p>

            {scheduledTimeText && (
              <p className="text-[11px] text-slate-400 flex items-center gap-1 mb-2.5">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{scheduledTimeText}</span>
              </p>
            )}

            {item.live_classes?.description && (
              <div className="bg-purple-50/70 border border-purple-100/80 rounded-xl p-2.5 mb-3 text-left">
                <div className="flex items-center gap-1 text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-0.5">
                  <BookOpen className="w-3 h-3 text-purple-600" />
                  <span>Topics Covered</span>
                </div>
                <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">
                  {item.live_classes.description}
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5" />
              <span>{hasVideo ? formatFileSize(item.file_size_bytes) : "No Video File"}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleUploadClick(item)}
                disabled={uploadingId === item.id}
                className="text-xs font-semibold text-slate-600 hover:text-purple-600 flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition-all cursor-pointer"
                title="Upload or replace video file"
              >
                {uploadingId === item.id ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5 text-purple-600" />
                    <span>{hasVideo ? "Replace" : "Upload"}</span>
                  </>
                )}
              </button>

              {isRecording ? (
                <button
                  onClick={() => navigate(isTeacher ? "/teacher/live-classes" : "/academic/live-classes")}
                  className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg border border-red-200 cursor-pointer"
                >
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  <span>Live</span>
                </button>
              ) : hasVideo ? (
                <button
                  onClick={() => handlePlayRecording(item)}
                  className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-purple-600" />
                  <span>Play</span>
                </button>
              ) : (
                <button
                  onClick={() => handleUploadClick(item)}
                  className="text-xs font-semibold text-amber-600 hover:text-purple-600 flex items-center gap-1 cursor-pointer"
                  title="Upload video to watch replay"
                >
                  Add Video →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Navbar setSidebarWidth={setSidebarWidth} />

      <main
        className="flex-1 transition-all duration-300 p-3.5 sm:p-5 md:p-8 min-w-0 overflow-x-hidden"
        style={{ marginLeft: isMobile ? '0' : (sidebarWidth === '6rem' ? '96px' : '256px') }}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6">
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Hamburger Menu Toggle (Mobile/Tablet Only) */}
            <button 
              onClick={toggleMobileMenu}
              className="lg:hidden p-2 sm:p-2.5 rounded-lg transition-all duration-200 shrink-0"
              style={{ backgroundColor: '#e3f2fd' }}
              title={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-blue-600" />
              ) : (
                <Menu className="w-5 h-5 text-blue-600" />
              )}
            </button>

            <button
              onClick={() => navigate(isTeacher ? "/teacher/live-classes" : "/academic/live-classes")}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
              title="Back to live classes"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="p-2 sm:p-2.5 bg-purple-600 text-white rounded-xl shadow-md shrink-0">
              <Film className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 leading-tight">
                {isTeacher ? "My Class Recordings" : "Class Recordings Archive"}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {isTeacher
                  ? "Organized batch-wise lecture recordings & high-speed cloud playback"
                  : "Batch-wise organized repository of all recorded live sessions"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(isTeacher ? "/teacher/live-classes" : "/academic/live-classes")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-all"
            >
              <Video className="w-4 h-4 shrink-0" />
              <span>Live Timetable</span>
            </button>
          </div>
        </div>

        {/* 🌟 USER-FRIENDLY BATCH DROPDOWN & FILTER HUB */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
            {/* Left: Responsive Batch Selector Dropdown */}
            <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Select Batch</span>
                  <span className="text-xs text-slate-400 hidden sm:inline">Filter recordings by batch</span>
                </div>
              </div>

              {/* Clean User-Friendly Select Dropdown */}
              <div className="relative flex-1">
                <select
                  value={batchFilter}
                  onChange={(e) => setBatchFilter(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 sm:py-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-300 focus:border-purple-500 focus:bg-white rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer shadow-xs"
                >
                  <option value="" className="font-bold text-purple-700">
                    ✨ All Batches ({recordings.length} Total Videos)
                  </option>
                  {batches.map((b) => {
                    const bId = b.batch_id || b.id;
                    const count = batchRecordingCounts[bId] || 0;
                    const courseText = b.courses?.course_name || b.course_name ? ` • ${b.courses?.course_name || b.course_name}` : "";
                    return (
                      <option key={bId} value={bId} className="text-slate-800 py-1 font-medium">
                        {b.batch_name} ({count} {count === 1 ? "video" : "videos"}){courseText}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Reset to All Batches Button (if a batch is currently selected) */}
              {batchFilter && (
                <button
                  onClick={() => setBatchFilter("")}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                  title="Clear batch selection"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Show All</span>
                </button>
              )}
            </div>

            {/* Right: Grouped / Grid View Switcher */}
            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
              <span className="text-xs font-semibold text-slate-400 sm:hidden">Layout:</span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode("grouped")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === "grouped"
                      ? "bg-white text-purple-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Group recordings by batch sections"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Grouped</span>
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-white text-purple-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="View all in unified grid"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Grid</span>
                </button>
              </div>
            </div>
          </div>

          {/* Active Batch Summary Tag if selected */}
          {selectedBatchObj && (
            <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 font-bold text-[11px]">
                  Batch Active
                </span>
                <strong className="text-slate-800">{selectedBatchObj.batch_name}</strong>
                {selectedBatchObj.course_name && (
                  <span className="text-slate-500 hidden sm:inline">• Course: {selectedBatchObj.course_name}</span>
                )}
                {selectedBatchObj.teacher_name && (
                  <span className="text-slate-500 hidden sm:inline">• Faculty: {selectedBatchObj.teacher_name}</span>
                )}
              </div>
              <span className="text-purple-600 font-bold">
                {filtered.length} {filtered.length === 1 ? "video" : "videos"} available
              </span>
            </div>
          )}
        </div>

        {/* Search & Sort Filters Bar */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-3 sm:gap-4 items-stretch md:items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3 sm:top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by session title, topic, or tutor name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3 w-full md:w-auto items-center">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer"
              >
                <option value="session_asc">Order: Session #1 → #N</option>
                <option value="session_desc">Order: Session #N → #1</option>
                <option value="newest">Order: Latest Date First</option>
              </select>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="READY">Ready to Watch</option>
              <option value="RECORDING">Currently Recording</option>
              <option value="PROCESSING">Processing</option>
            </select>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-sm">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-3" />
            <p>Loading class recordings repository...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-sm">
            <Film className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">
              {batchFilter ? "No Recordings Found for this Batch" : "No Recorded Lectures Found"}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {batchFilter
                ? "This batch has not completed any recorded live classes yet, or matching search filters were not found."
                : "When tutors complete scheduled live classes, video recordings automatically process and appear here."}
            </p>
            {batchFilter && (
              <button
                onClick={() => setBatchFilter("")}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-semibold shadow hover:bg-purple-700"
              >
                View All Batches
              </button>
            )}
          </div>
        ) : viewMode === "grouped" && !batchFilter ? (
          /* 🗂️ GROUPED BY BATCH VIEW */
          <div className="space-y-8">
            {groupedBatches.map((group) => (
              <div
                key={group.batchId}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 transition-all"
              >
                {/* Batch Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-slate-100 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-base shrink-0">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-bold text-slate-800">
                          {group.batchName}
                        </h2>
                        {group.courseName && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            {group.courseName}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {group.teacherName ? `Instructor: ${group.teacherName} • ` : ""}
                        <strong className="text-purple-600">{group.items.length}</strong> recorded {group.items.length === 1 ? "session" : "sessions"} available
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setBatchFilter(group.batchId)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-colors self-start sm:self-auto cursor-pointer"
                  >
                    <span>Filter this batch</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Grid of sessions for this batch */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {group.items.map((item) => renderRecordingCard(item))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ▦ UNIFIED GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item) => renderRecordingCard(item))}
          </div>
        )}

        {/* Video Player Modal */}
        {activeVideo && (
          <div className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
            <div className="bg-slate-950 rounded-2xl sm:rounded-3xl max-w-5xl lg:max-w-6xl w-full max-h-[96vh] overflow-hidden shadow-2xl border border-slate-800 flex flex-col">
              {/* Modal Top Bar */}
              <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-white shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-100">
                      {activeVideo.display_title || activeVideo.title || "Class Recording"}
                    </h3>
                    {activeVideo.part_number && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-600 text-white shadow-sm">
                        Part {activeVideo.part_number}
                      </span>
                    )}
                    {activeVideo.status === 'RECORDING' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                        🔴 RECORDING IN PROGRESS
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        RECORDED
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Session #{activeVideo.live_classes?.session_number || 1} • {activeVideo.batches?.batch_name || ""}
                  </p>
                  {activeVideo.live_classes?.description && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-purple-950/60 border border-purple-600/40 rounded-lg text-xs text-purple-200">
                      <BookOpen className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span><strong className="text-purple-300">Topics Covered:</strong> {activeVideo.live_classes.description}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setActiveVideo(null);
                    setPlaybackError(null);
                  }}
                  className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Video Player & Stage */}
              <div
                ref={playerContainerRef}
                onMouseMove={handleMouseMove}
                className="relative bg-black aspect-video flex items-center justify-center select-none group"
              >
                {playbackError ? (
                  <div className="flex flex-col items-center justify-center text-center p-6 text-slate-300">
                    <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
                    <p className="text-sm font-semibold text-white mb-1">Video Stream Error</p>
                    <p className="text-xs text-slate-400 max-w-md mb-4">{playbackError}</p>
                    <button
                      onClick={() => handlePlayRecording(activeVideo)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Retry Loading Video
                    </button>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      key={activeVideo.playbackUrl}
                      src={activeVideo.playbackUrl}
                      onClick={togglePlay}
                      autoPlay
                      playsInline
                      onTimeUpdate={() => {
                        if (!videoRef.current) return;
                        const cur = videoRef.current.currentTime;
                        if (!isSeeking) {
                          setCurrentTime(cur);
                        }
                        const vidDur = videoRef.current.duration;
                        if (isFinite(vidDur) && vidDur > 0 && Math.abs(vidDur - duration) > 1) {
                          setDuration(vidDur);
                        } else if ((duration === 0 || !isFinite(duration)) && activeVideo?.duration_seconds) {
                          setDuration(Number(activeVideo.duration_seconds));
                        }
                      }}
                      onLoadedMetadata={(e) => {
                        const vid = e.currentTarget;
                        vid.volume = volume;
                        vid.muted = isMuted;
                        const vidDur = vid.duration;
                        if (isFinite(vidDur) && !isNaN(vidDur) && vidDur > 0) {
                          setDuration(vidDur);
                        } else if (activeVideo?.duration_seconds) {
                          setDuration(Number(activeVideo.duration_seconds));
                        }
                      }}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onEnded={() => setIsPlaying(false)}
                      onError={(e) => {
                        console.error("Video stream load error:", e);
                        setPlaybackError("Unable to load recorded class video. Please check your network or try refreshing.");
                      }}
                      className="w-full h-full object-contain cursor-pointer"
                    />

                    {/* Big Center Play Button Overlay when Paused */}
                    {!isPlaying && (
                      <button
                        onClick={togglePlay}
                        className="absolute w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-transform cursor-pointer z-20"
                        title="Click to Play"
                      >
                        <Play className="w-8 h-8 fill-white ml-1" />
                      </button>
                    )}

                    {/* Bottom Floating Controls inside Video Stage (Supports Fullscreen & Normal Screen) */}
                    <div
                      className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-3 sm:p-4 z-30 transition-opacity duration-300 ${
                        showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
                      }`}
                    >
                      {/* Interactive Progress / Seek Bar */}
                      {(() => {
                        const effDur = getEffectiveDuration();
                        const displayTime = isSeeking ? seekValue : currentTime;
                        const progressPercent = effDur > 0 ? Math.min(100, Math.max(0, (displayTime / effDur) * 100)) : 0;
                        return (
                          <div
                            ref={progressBarRef}
                            className="mb-2.5 relative group/bar cursor-pointer select-none py-1.5"
                            onMouseMove={handleProgressMouseMove}
                            onMouseLeave={() => setHoverTime(null)}
                            onClick={handleProgressClick}
                          >
                            {/* Hover Time Tooltip */}
                            {hoverTime !== null && (
                              <div
                                className="absolute -top-7 px-2 py-0.5 bg-slate-900/95 text-white text-[11px] font-mono rounded-md shadow-lg border border-slate-700 pointer-events-none transform -translate-x-1/2 transition-opacity z-40"
                                style={{ left: `${hoverX}px` }}
                              >
                                {formatTime(hoverTime)}
                              </div>
                            )}

                            {/* Track Background */}
                            <div className="w-full h-1.5 group-hover/bar:h-2.5 bg-slate-700/80 rounded-full overflow-hidden transition-all duration-150 relative">
                              <div
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full pointer-events-none transition-all duration-75"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>

                            {/* Scrubber Knob Thumb */}
                            <div
                              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md border-2 border-blue-500 pointer-events-none transition-all duration-75 group-hover/bar:scale-125 z-30"
                              style={{ left: `calc(${progressPercent}% - 7px)` }}
                            />

                            {/* Range Input Overlay for Drag / Touch Seeking */}
                            <input
                              type="range"
                              min={0}
                              max={effDur > 0 ? effDur : 100}
                              step="any"
                              value={effDur > 0 ? displayTime : 0}
                              onMouseDown={() => setIsSeeking(true)}
                              onTouchStart={() => setIsSeeking(true)}
                              onChange={handleSeekChange}
                              onMouseUp={handleSeekEnd}
                              onTouchEnd={handleSeekEnd}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                            />
                          </div>
                        );
                      })()}

                      {/* Controls Row */}
                      <div className="flex items-center justify-between text-white text-xs gap-2">
                        {/* Left Controls: Play, Skip, Time, Volume */}
                        <div className="flex items-center gap-2 sm:gap-3">
                          <button
                            onClick={togglePlay}
                            className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg text-white transition-colors cursor-pointer"
                            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
                          >
                            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
                          </button>

                          {/* 10s Rewind */}
                          <button
                            onClick={() => skipTime(-10)}
                            className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors flex items-center gap-0.5 font-semibold text-[11px] cursor-pointer"
                            title="Rewind 10 seconds"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span className="hidden xs:inline">-10s</span>
                          </button>

                          {/* 10s Fast-Forward */}
                          <button
                            onClick={() => skipTime(10)}
                            className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors flex items-center gap-0.5 font-semibold text-[11px] cursor-pointer"
                            title="Forward 10 seconds"
                          >
                            <RotateCw className="w-4 h-4" />
                            <span className="hidden xs:inline">+10s</span>
                          </button>

                          {/* Live Time Display */}
                          <div className="text-slate-300 font-mono text-[11px] sm:text-xs select-none ml-1">
                            <span className="text-white font-semibold">
                              {formatTime(isSeeking ? seekValue : currentTime)}
                            </span>
                            <span className="text-slate-500 mx-1">/</span>
                            <span className="text-slate-400">
                              {formatTime(getEffectiveDuration())}
                            </span>
                          </div>

                          {/* Volume Controls */}
                          <div className="hidden sm:flex items-center gap-1.5 ml-2">
                            <button
                              onClick={toggleMute}
                              className="p-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
                              title={isMuted ? "Unmute" : "Mute"}
                            >
                              {isMuted || volume === 0 ? (
                                <VolumeX className="w-4 h-4 text-red-400" />
                              ) : (
                                <Volume2 className="w-4 h-4" />
                              )}
                            </button>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={isMuted ? 0 : volume}
                              onChange={handleVolumeChange}
                              className="w-16 h-1 bg-slate-700 accent-blue-500 rounded cursor-pointer"
                            />
                          </div>
                        </div>

                        {/* Right Controls: Speed & Fullscreen */}
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          {/* Speed Selector */}
                          <div className="flex items-center gap-1 bg-slate-800/80 px-1.5 py-0.5 rounded-lg border border-slate-700">
                            <Gauge className="w-3.5 h-3.5 text-purple-400 shrink-0 hidden sm:inline" />
                            <select
                              value={playbackSpeed}
                              onChange={(e) => handleSpeedChange(Number(e.target.value))}
                              aria-label="Playback Speed"
                              className="bg-transparent text-[11px] font-semibold text-slate-200 focus:outline-none cursor-pointer"
                            >
                              {SPEED_OPTIONS.map((speed) => (
                                <option key={speed} value={speed} className="bg-slate-900 text-white">
                                  {speed}x
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Fullscreen Button */}
                          <button
                            onClick={toggleFullscreen}
                            className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                          >
                            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Hidden File Input for Video Uploads */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="video/mp4,video/webm"
          className="hidden"
        />
      </main>
    </div>
  );
};

export default AcademicRecordingsMasterPage;
