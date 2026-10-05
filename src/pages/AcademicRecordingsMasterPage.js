import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
  Film,
  Play,
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
  AlertCircle,
  Menu
} from "lucide-react";
import { getAllRecordings, getRecordingStreamUrl, uploadRecordingVideo } from "../services/liveClassApi";
import { getBatches } from "../services/Api";

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
  const fileInputRef = React.useRef(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [targetUploadRec, setTargetUploadRec] = useState(null);

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    return localStorage.getItem("sidebarCollapsed") === "true" ? "6rem" : "16rem";
  });

  useEffect(() => {
    loadData();
  }, [batchFilter, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    const params = {};
    if (batchFilter) params.batch_id = batchFilter;
    if (statusFilter !== "ALL") params.status = statusFilter;

    try {
      const recRes = await getAllRecordings(params);
      setRecordings(recRes.recordings || []);
    } catch (err) {
      console.error("Error loading master recordings:", err);
    }

    try {
      const batchRes = await getBatches(token);
      const batchList = Array.isArray(batchRes) 
        ? batchRes 
        : (batchRes?.data || batchRes?.batches || []);
      setBatches(batchList);
    } catch (err) {
      console.error("Error loading batches for recordings:", err);
    }

    setLoading(false);
  };

  const handlePlayRecording = async (rec) => {
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
        title: rec.live_classes?.title || "Class Recording",
        status: streamRes.status || rec.status || "READY"
      });
    } catch (err) {
      console.error("Failed to load recording stream:", err);
      alert("Failed to load recording video: " + (err.message || "Recording file not found"));
    } finally {
      setPlaybackLoading(false);
    }
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
      const dur = (isFinite(vid.duration) && vid.duration > 0)
        ? vid.duration
        : (activeVideo?.duration_seconds || 0);
      let nextTime = cur + seconds;
      if (nextTime < 0) nextTime = 0;
      if (dur > 0 && nextTime > dur) nextTime = dur;
      vid.currentTime = nextTime;
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
      
      const res = await uploadRecordingVideo(targetUploadRec.id, formData);
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
    if (!seconds) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 MB";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const filtered = recordings.filter((r) => {
    const title = r.live_classes?.title || "";
    const batchName = r.batches?.batch_name || "";
    const tutorName = r.live_classes?.teachers?.full_name || r.live_classes?.teachers?.name || "";
    const term = searchTerm.toLowerCase();
    return title.toLowerCase().includes(term) || batchName.toLowerCase().includes(term) || tutorName.toLowerCase().includes(term);
  });

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
                  ? "Review and playback your past live class recordings"
                  : "Centralized repository of all auto-recorded lectures"}
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate(isTeacher ? "/teacher/live-classes" : "/academic/live-classes")}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-all"
          >
            <Video className="w-4 h-4 shrink-0" />
            <span>Live Timetable</span>
          </button>
        </div>

        {/* Filters Row */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-3 sm:gap-4 items-stretch md:items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3 sm:top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search recordings by lecture title, batch, or teacher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <div className="flex gap-2 sm:gap-3 w-full md:w-auto">
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="flex-1 md:flex-initial px-3 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
            >
              <option value="">All Batches</option>
              {batches.map((b) => (
                <option key={b.batch_id} value={b.batch_id}>
                  {b.batch_name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 md:flex-initial px-3 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="READY">Ready to Watch</option>
              <option value="RECORDING">Currently Recording</option>
              <option value="PROCESSING">Processing</option>
            </select>
          </div>
        </div>

        {/* Recordings Grid */}
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-sm">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-3" />
            <p>Loading class recordings...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-sm">
            <Film className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">No Recorded Lectures Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              When a tutor completes a scheduled live class, the video recording will automatically process and appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group"
              >
                {/* Thumbnail / Header Preview */}
                <div className="h-44 bg-slate-900 relative flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent z-10" />

                  {/* Play Button Overlay */}
                  <button
                    onClick={() => handlePlayRecording(item)}
                    className="w-12 h-12 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-purple-600 transition-all z-20"
                  >
                    <Play className="w-5 h-5 ml-0.5" />
                  </button>

                  <div className="absolute top-3 left-3 z-20">
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-900/90 text-purple-300 border border-purple-500/30">
                      Session #{item.live_classes?.session_number || 1}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 z-20 flex justify-between items-center text-xs text-slate-300">
                    <span className="font-semibold text-white truncate max-w-[200px]">
                      {item.batches?.batch_name || "General Batch"}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-black/60 font-mono text-[11px]">
                      {formatDuration(item.duration_seconds)}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base line-clamp-1 mb-1">
                      {item.live_classes?.title || "Untitled Lecture"}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-1 mb-2.5">
                      Tutor: {item.live_classes?.teachers?.full_name || item.live_classes?.teachers?.name || "Assigned Instructor"}
                    </p>

                    {item.live_classes?.description && (
                      <div className="bg-purple-50/70 border border-purple-100/80 rounded-xl p-2.5 mb-3 text-left">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-0.5">
                          <BookOpen className="w-3 h-3 text-purple-600" />
                          <span>Topics Covered</span>
                        </div>
                        <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed font-medium">
                          {item.live_classes.description}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5" />
                      <span>{item.storage_object_path ? formatFileSize(item.file_size_bytes) : "No Video File"}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUploadClick(item)}
                        disabled={uploadingId === item.id}
                        className="text-xs font-semibold text-slate-600 hover:text-purple-600 flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition-all cursor-pointer"
                        title="Upload recorded video file for this class"
                      >
                        {uploadingId === item.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                            <span>Uploading Video...</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-3.5 h-3.5 text-purple-600" />
                            <span>{item.storage_object_path ? "Replace Video" : "Upload Video"}</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handlePlayRecording(item)}
                        className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                      >
                        Watch Replay →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Video Player Modal */}
        {activeVideo && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
            <div className="bg-slate-950 rounded-2xl sm:rounded-3xl max-w-4xl w-full max-h-[96vh] overflow-y-auto shadow-2xl border border-slate-800 flex flex-col animate-in fade-in zoom-in duration-200">
              {/* Modal Top Bar */}
              <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-white">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-100">{activeVideo.title}</h3>
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

              {/* Video Player */}
              <div className="relative bg-black aspect-video flex items-center justify-center">
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
                  <video
                    ref={videoRef}
                    key={activeVideo.playbackUrl}
                    src={activeVideo.playbackUrl}
                    controls
                    autoPlay
                    playsInline
                    onLoadedMetadata={(e) => {
                      const vid = e.currentTarget;
                      vid.volume = 1.0;
                      vid.muted = false;
                      if (!isFinite(vid.duration) || isNaN(vid.duration) || vid.duration <= 0) {
                        vid.currentTime = 1e101;
                        vid.ontimeupdate = function() {
                          this.ontimeupdate = null;
                          vid.currentTime = 0;
                        };
                      }
                    }}
                    onPlay={(e) => {
                      e.currentTarget.volume = 1.0;
                      e.currentTarget.muted = false;
                    }}
                    onError={(e) => {
                      console.error("Video stream load error:", e);
                      setPlaybackError("Unable to load recorded class video. Please check your network or try refreshing.");
                    }}
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              {/* Player Controls Bar (Speed Options & Skip) */}
              <div className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 text-slate-300">
                <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 text-xs w-full sm:w-auto">
                  {/* Skip Buttons */}
                  <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
                    <button
                      onClick={() => skipTime(-10)}
                      className="px-2 sm:px-2.5 py-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                      title="Rewind 10 seconds"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      -10s
                    </button>
                    <button
                      onClick={() => skipTime(10)}
                      className="px-2 sm:px-2.5 py-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                      title="Forward 10 seconds"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      +10s
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Gauge className="w-4 h-4 text-purple-400 shrink-0" />
                    <span className="font-semibold text-slate-400 hidden sm:inline">Speed:</span>
                    <select
                      value={playbackSpeed}
                      onChange={(e) => handleSpeedChange(Number(e.target.value))}
                      className="sm:hidden px-2 py-1 bg-slate-800 text-slate-200 rounded-lg text-xs border border-slate-700"
                    >
                      {SPEED_OPTIONS.map((speed) => (
                        <option key={speed} value={speed}>{speed}x</option>
                      ))}
                    </select>
                    <div className="hidden sm:flex gap-1">
                      {SPEED_OPTIONS.map((speed) => (
                        <button
                          key={speed}
                          onClick={() => handleSpeedChange(speed)}
                          className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                            playbackSpeed === speed
                              ? "bg-purple-600 text-white shadow-sm"
                              : "bg-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] sm:text-xs text-slate-500 font-mono text-center sm:text-right">
                  HD Recording • Ready to Watch
                </div>
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
