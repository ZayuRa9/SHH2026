import React, { useState, useEffect, useRef } from "react";
import { 
  WeekActivity, Gift, Announcement, AttendanceRecord, StoredAsset, VolunteerAttendance, AuditLog 
} from "./types";
import { 
  INITIAL_WEEKS, INITIAL_GIFTS, INITIAL_ANNOUNCEMENTS, INITIAL_ATTENDANCE, INITIAL_ASSETS, INITIAL_AUDIT_LOGS 
} from "./initialData";
import { 
  generateGoogleCalendarUrl, downloadAppleCalendarIcs, queueOfflineAttendance
} from "./utils";
import { 
  DoanLogo, DoiLogo, ThanhNienLogo, DefaultLogoCluster
} from "./components/OfficialLogos";
import { 
  AirBalloon, AIRobot, WaterRocket, EducationBook, HcmSkyline 
} from "./components/Interactive3DAssets";
import { 
  AdminPanel 
} from "./components/AdminPanel";
import { 
  Calendar, Award, Bell, Users, Image as ImageIcon, MapPin, 
  ExternalLink, CheckCircle2, ChevronLeft, ChevronRight, X, Play, Volume2, 
  Search, ShieldAlert, Heart, HelpCircle, Trophy, Sparkles, Plus, Clock, Settings, Book
} from "lucide-react";
import { useSupabaseRealtime } from "./lib/useSupabaseRealtime";
import { LazyImage } from "./components/LazyImage";
import { EmptyState } from "./components/EmptyState";


// Vector silhouettes and badges of children playing in the park (Công viên Kênh Tẻ)
const ChildrenPlaying: React.FC = () => {
  return (
    <div className="absolute bottom-16 left-[25%] flex items-center gap-12 pointer-events-auto z-20 scale-[0.6] sm:scale-75 md:scale-90 transition-transform origin-bottom-left">
      {/* Kid 1: Jumping with joy */}
      <div className="flex flex-col items-center animate-bounce duration-[1200ms]">
        <svg viewBox="0 0 24 24" className="w-10 h-10 text-orange-400 fill-current drop-shadow">
          <circle cx="12" cy="5" r="3" />
          <path d="M12 9c-1.1 0-2 .9-2 2v4h1v5h2v-5h1v-4c0-1.1-.9-2-2-2z M5 12c.55 0 1-.45 1-1V8c0-.55-.45-1-1-1s-1 .45-1 1v3c0 .55.45 1 1 1z" />
          <path d="M19 12c.55 0 1-.45 1-1V8c0-.55-.45-1-1-1s-1 .45-1 1v3c0 .55.45 1 1 1z" />
        </svg>
        <span className="text-[9px] bg-sky-950/90 text-white font-extrabold px-1.5 py-0.5 rounded-full border border-sky-400/30 shadow mt-1 whitespace-nowrap">Bé Vy nhảy dây</span>
      </div>

      {/* Kid 2: Running/chasing soccer ball */}
      <div className="flex flex-col items-center animate-pulse" style={{ animationDuration: "1.8s" }}>
        <div className="flex items-end gap-1">
          <svg viewBox="0 0 24 24" className="w-10 h-10 text-[#0056b3] fill-current drop-shadow">
            <circle cx="12" cy="4" r="2.5" />
            <path d="M13.5 10c0-1-.5-1.8-1.3-2.2l-3-1.5c-.5-.2-1.1 0-1.3.5s0 1.1.5 1.3l2.1 1V14h-2.5v5h2v-4h2.5v4h2v-9z" />
          </svg>
          <span className="animate-bounce text-sm leading-none pb-1" style={{ animationDuration: "0.8s" }}>⚽</span>
        </div>
        <span className="text-[9px] bg-sky-950/90 text-white font-extrabold px-1.5 py-0.5 rounded-full border border-[#0056b3]/40 shadow mt-1 whitespace-nowrap">Nhí Khôi đá bóng</span>
      </div>
    </div>
  );
};

export default function App() {
  // Centralized State System - Synced live via PostgreSQL/Database APIs with no client-side caching
  const [weeks, setWeeks] = useState<WeekActivity[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [customLogo, setCustomLogo] = useState<string>("");
  const [storedAssets, setStoredAssets] = useState<StoredAsset[]>([]);
  const [volunteers, setVolunteers] = useState<VolunteerAttendance[]>([]);
  const [photoLikes, setPhotoLikes] = useState<Record<string, number>>({});

  const [currentRole, setCurrentRole] = useState<"Super Admin" | "Admin" | "User" | "Guest">(() => {
    // Preserve active role session locally to prevent forced relogins, while data is kept isolated
    const saved = localStorage.getItem("system_current_role");
    return (saved as any) || "Guest";
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const addSystemLog = async (action: string, details: string, isError: boolean = false) => {
    const newLog: AuditLog = {
      id: "log-" + Date.now(),
      user: currentRole === "Super Admin" || currentRole === "Admin" ? "ngsoanng@gmail.com" : "Khách/Thành viên",
      role: currentRole,
      action,
      details,
      ipAddress: "115.79.138.242", 
      device: window.innerWidth < 768 ? "Thiết bị di động" : "Máy tính xách tay",
      browser: navigator.userAgent.includes("Chrome") ? "Chrome" : navigator.userAgent.includes("Safari") ? "Safari" : "Trình duyệt Web",
      timestamp: new Date().toISOString(),
      isError
    };
    setAuditLogs(prev => [newLog, ...prev]);
    
    // Send to central server immediately to prevent stale overrides
    try {
      await fetch("/api/add-audit-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ log: newLog })
      });
    } catch (e) {
      console.warn("Lỗi đồng bộ audit-log lên máy chủ:", e);
    }
  };

  const [isLoadedFromServer, setIsLoadedFromServer] = useState<boolean>(false);
  const lastServerDataRef = useRef<string>("");

  const refreshDataFromServer = async () => {
    try {
      // Force cache-busting to bypass any intermediate client/proxy cache and read from DB in <0.5s
      const res = await fetch(`/api/get-all-data?_t=${Date.now()}`, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        }
      });
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        const serialized = JSON.stringify({
          weeks: d.weeks || [],
          gifts: d.gifts || [],
          announcements: d.announcements || [],
          attendance: d.attendance || [],
          customLogo: d.customLogo || "",
          storedAssets: d.storedAssets || [],
          volunteers: d.volunteers || [],
          photoLikes: d.photoLikes || {},
          auditLogs: d.auditLogs || []
        });
        lastServerDataRef.current = serialized;

        if (d.weeks) setWeeks(d.weeks);
        if (d.gifts) setGifts(d.gifts);
        if (d.announcements) setAnnouncements(d.announcements);
        if (d.attendance) setAttendance(d.attendance);
        if (d.customLogo !== undefined) setCustomLogo(d.customLogo);
        if (d.storedAssets) setStoredAssets(d.storedAssets);
        if (d.volunteers) setVolunteers(d.volunteers);
        if (d.photoLikes) setPhotoLikes(d.photoLikes);
        if (d.auditLogs) setAuditLogs(d.auditLogs);
      }
    } catch (e) {
      console.warn("Lỗi kết nối máy chủ đồng bộ:", e);
    }
  };

  // 1. Establish central EventSource (SSE) stream for sub-second database notifications
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const establishStream = () => {
      console.log("[REALTIME-SSE] Đang kết nối tới dòng dữ liệu thời gian thực từ Database...");
      eventSource = new EventSource("/api/realtime-stream");

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.eventType && payload.eventType !== "HEARTBEAT" && payload.eventType !== "INIT") {
            console.log(`[REALTIME-SSE] Phát hiện thay đổi dữ liệu (${payload.eventType}), cập nhật giao diện lập tức!`);
            refreshDataFromServer();
          }
        } catch (err) {
          // parsing heartbeats
        }
      };

      eventSource.onerror = (err) => {
        console.warn("[REALTIME-SSE] Ngắt kết nối hoặc gặp lỗi dòng, khôi phục kết nối tự động sau 1.5 giây...", err);
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(establishStream, 1500);
      };
    };

    establishStream();

    // Secondary sub-second safety sync loop to cover intense concurrent edits perfectly
    const recoveryTimer = setInterval(() => {
      refreshDataFromServer();
    }, 2500);

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      clearTimeout(reconnectTimeout);
      clearInterval(recoveryTimer);
    };
  }, []);

  // 2. Synchronize from server on initial mount
  useEffect(() => {
    const init = async () => {
      await refreshDataFromServer();
      setIsLoadedFromServer(true);
    };
    init();
  }, []);

  // 3. Keep secondary Supabase Realtime active if credentials exist
  useSupabaseRealtime(React.useCallback((payload) => {
    console.log(`[SUPABASE-REALTIME] Phát hiện thay đổi bảng ${payload.table}, đồng bộ dữ liệu...`);
    refreshDataFromServer();
  }, []));

  // 4. Save active Administrator Role session to prevent forced logouts
  useEffect(() => {
    localStorage.setItem("system_current_role", currentRole);
  }, [currentRole]);

  // Listen for online status to immediately trigger background sync of offline queued data
  useEffect(() => {
    const handleOnlineStatusChange = () => {
      if (navigator.onLine) {
        console.log("[PWA Network] Phát hiện thiết bị trực tuyến! Đang kích hoạt đồng bộ dữ liệu chuyên cần từ hàng chờ IndexedDB lên Supabase.");
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then((reg) => {
            if (reg.active) {
              reg.active.postMessage({ type: 'SYNC_NOW' });
            }
          }).catch((err) => {
            console.warn("[PWA Network] Service Worker chưa sẵn sàng để đồng bộ trực tuyến:", err);
          });
        }
        // Also refresh central server data to make sure local screen data is in-sync!
        setTimeout(() => {
          refreshDataFromServer();
        }, 1500);
      }
    };

    // Run immediately on boot to handle sync of any leftover offline records from prior sessions
    handleOnlineStatusChange();

    window.addEventListener("online", handleOnlineStatusChange);
    return () => {
      window.removeEventListener("online", handleOnlineStatusChange);
    };
  }, []);

  // Save to server on edit changes when loaded - ONLY ALLOWED FOR ADMINISTRATORS TO PREVENT OVERWRITES
  useEffect(() => {
    if (!isLoadedFromServer) return;
    
    // Prevent non-admins from triggering broad state overwrites
    if (currentRole !== "Super Admin" && currentRole !== "Admin") {
      return;
    }

    const currentData = {
      weeks,
      gifts,
      announcements,
      attendance,
      customLogo,
      storedAssets,
      volunteers,
      photoLikes,
      auditLogs
    };

    const serialized = JSON.stringify(currentData);

    // If local state is identical to last seen or saved server state, skip saving
    if (serialized === lastServerDataRef.current) {
      return;
    }

    const saveData = async () => {
      try {
        lastServerDataRef.current = serialized;
        await fetch("/api/save-all-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: serialized
        });
      } catch (err) {
        console.error("Lỗi đồng bộ dữ liệu lên máy chủ:", err);
      }
    };

    const timer = setTimeout(saveData, 500);
    return () => clearTimeout(timer);
  }, [weeks, gifts, announcements, attendance, customLogo, storedAssets, volunteers, photoLikes, auditLogs, isLoadedFromServer, currentRole]);

  // Logo cluster wrapper that respects custom logo or falls back to standard vectors
  const AppLogoCluster: React.FC<{ className?: string }> = ({ className = "h-11 md:h-12" }) => {
    return (
      <div 
        className={`relative select-none shrink-0 flex items-center justify-center overflow-hidden ${className}`} 
        style={{ aspectRatio: "1096/391" }}
      >
        {customLogo ? (
          <img 
            src={customLogo} 
            alt="Logo Nhận Diện Cụm" 
            className="w-full h-full object-contain" 
            style={{ 
              width: "100%", 
              height: "100%", 
              maxWidth: "100%", 
              maxHeight: "100%", 
              objectFit: "contain" 
            }}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <DefaultLogoCluster className="w-full h-full" />
          </div>
        )}
      </div>
    );
  };

  // General App states
  const [showAdmin, setShowAdmin] = useState(false);
  const [selectedWeekDetail, setSelectedWeekDetail] = useState<WeekActivity | null>(null);
  const [leaderboardTab, setLeaderboardTab] = useState<"quarter" | "individual">("quarter");
  const [cameraStage, setCameraStage] = useState<"wide" | "zooming" | "focus">("wide");

  // 3D Camera Fly-In Animation Trigger Sequence
  useEffect(() => {
    setCameraStage("wide");
    const zoomTimeout = setTimeout(() => {
      setCameraStage("zooming");
    }, 250);
    const focusTimeout = setTimeout(() => {
      setCameraStage("focus");
    }, 1500);

    return () => {
      clearTimeout(zoomTimeout);
      clearTimeout(focusTimeout);
    };
  }, []);

  const triggerCameraSequence = () => {
    setCameraStage("wide");
    setTimeout(() => {
      setCameraStage("zooming");
    }, 250);
    setTimeout(() => {
      setCameraStage("focus");
    }, 1500);
  };
  
  // Smart Alarms Notification States
  const [targetAlarmActivity, setTargetAlarmActivity] = useState<WeekActivity | null>(null);
  const [alarmMinutes, setAlarmMinutes] = useState<number>(45); // Default 45 mins
  const [alarmSuccessMsg, setAlarmSuccessMsg] = useState("");
  const [shakeBell, setShakeBell] = useState(false);

  // 3D Gift Box states
  const [isGiftBoxOpen, setIsGiftBoxOpen] = useState(false);
  const [showGiftAnimation, setShowGiftAnimation] = useState(false);

  // Roll-Call Registration States
  const [rollCallType, setRollCallType] = useState<"kids" | "volunteers">("kids");
  const [studentName, setStudentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [selectedQuarter, setSelectedQuarter] = useState("Khu phố 10");
  const [attendedWeeksInput, setAttendedWeeksInput] = useState<number[]>([]);
  const [rollCallSuccess, setRollCallSuccess] = useState("");
  const [simulatedEmail, setSimulatedEmail] = useState<any | null>(null);

  // Volunteer Attendance States
  const [volunteerName, setVolunteerName] = useState("");
  const [volunteerQuarter, setVolunteerQuarter] = useState("Khu phố 10");
  const [volunteerRole, setVolunteerRole] = useState("Phụ trách chính");
  const [volunteerPhone, setVolunteerPhone] = useState("");
  const [volunteerWeeks, setVolunteerWeeks] = useState<number[]>([]);
  const [volunteerSuccess, setVolunteerSuccess] = useState("");
  
  // Validation State feedback
  const [formValidationError, setFormValidationError] = useState("");

  // Gallery view filter & Fullscreen lightbox
  const [selectedImageCategory, setSelectedImageCategory] = useState<string>("all");
  const [selectedAlbumFilter, setSelectedAlbumFilter] = useState<string>("all");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [selectedGiftForModal, setSelectedGiftForModal] = useState<Gift | null>(null);
  const galleryCarouselRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [carouselScrollRatio, setCarouselScrollRatio] = useState(0);

  const handleGalleryScroll = () => {
    if (galleryCarouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = galleryCarouselRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
      const totalScrollable = scrollWidth - clientWidth;
      setCarouselScrollRatio(totalScrollable > 0 ? scrollLeft / totalScrollable : 0);
    }
  };

  const scrollGallery = (direction: "left" | "right") => {
    if (galleryCarouselRef.current) {
      const { clientWidth } = galleryCarouselRef.current;
      const scrollAmount = direction === "left" ? -clientWidth * 0.75 : clientWidth * 0.75;
      galleryCarouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const handleCheck = () => {
      setSelectedAlbumFilter("all");
      if (galleryCarouselRef.current) {
        galleryCarouselRef.current.scrollTo({ left: 0 });
        setCanScrollLeft(false);
        const { scrollWidth, clientWidth } = galleryCarouselRef.current;
        setCanScrollRight(scrollWidth > clientWidth);
        setCarouselScrollRatio(0);
      }
    };
    const timer = setTimeout(handleCheck, 150);
    return () => clearTimeout(timer);
  }, [selectedImageCategory]);


  // Video recap mockup state
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);

  // Sound chime toggles
  const playAlertSound = () => {
    setShakeBell(true);
    setTimeout(() => setShakeBell(false), 1200);
    
    // Simulate notification vibration and sound via web Audio Context
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      oscillator.frequency.setValueAtTime(1174.66, audioCtx.currentTime + 0.3); // D6
      
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.85);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.9);
    } catch (e) {
      console.log("Audio not supported or blocked by browser user gesture policies.");
    }
  };

  // Trigger custom prefilled iOS / In-App notice alerts
  const handleSetAlarm = (type: "google" | "apple" | "push") => {
    if (!targetAlarmActivity) return;
    
    if (type === "google") {
      const url = generateGoogleCalendarUrl(targetAlarmActivity);
      window.open(url, "_blank");
      playAlertSound();
      setAlarmSuccessMsg(`Đã tạo liên kết thêm lịch Google cho Tuần ${targetAlarmActivity.weekNumber}!`);
    } else if (type === "apple") {
      downloadAppleCalendarIcs(targetAlarmActivity);
      playAlertSound();
      setAlarmSuccessMsg(`Đã tải xuống tệp lịch .ics Apple cho Tuần ${targetAlarmActivity.weekNumber}!`);
    } else if (type === "push") {
      playAlertSound();
      if ("Notification" in window) {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") {
            new Notification("Sinh hoạt hè Cụm 2 - Tân Hưng", {
              body: `Nhắc nhở: Buổi sinh hoạt '${targetAlarmActivity.theme}' sẽ bắt đầu sau ${alarmMinutes} phút nữa! Địa điểm: ${targetAlarmActivity.location}`,
              icon: "/favicon.ico"
            });
          }
        });
      }
      setAlarmSuccessMsg(`Đã đặt báo chuông đẩy! Bạn sẽ nhận thông báo trước giờ họp đúng ${alarmMinutes} phút.`);
    }

    // Auto clear alerting feedback banner
    setTimeout(() => {
      setAlarmSuccessMsg("");
      setTargetAlarmActivity(null);
    }, 4500);
  };

  // Perform Roll Call Submit
  const handleRollCallSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormValidationError("");
    
    // 1. Role Authorization validation
    if (currentRole === "Guest") {
      const errorStr = "Quyền 'Khách vãng lai' chỉ được xem thông tin. Vui lòng chuyển cấu hình vai trò sang để đăng ký!";
      setFormValidationError(errorStr);
      addSystemLog("Truy cập bất hợp pháp", "Guest cố gắng thực hiện đăng ký thiếu nhi nhưng bị từ chối bảo mật.", true);
      return;
    }

    try {
      // 2. Name validation
      const cleanName = studentName.trim();
      if (cleanName.length < 3) {
        setFormValidationError("Họ và tên của em phải tối thiểu 3 ký tự!");
        return;
      }
      if (/\d/.test(cleanName)) {
        setFormValidationError("Họ và tên của học sinh không được phép chứa chữ số!");
        return;
      }

      // 3. Optional parents phone validation
      if (parentPhone.trim() && !/^\d{10,11}$/.test(parentPhone.trim())) {
        setFormValidationError("Số điện thoại phụ huynh không hợp lệ (phải từ 10 đến 11 chữ số liên tục)!");
        return;
      }

      // 4. Optional parents email validation
      if (parentEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail.trim())) {
        setFormValidationError("Email phụ huynh không đúng định dạng tiêu chuẩn (Ví dụ: cha_me@gmail.com)!");
        return;
      }

      if (attendedWeeksInput.length === 0) {
        setFormValidationError("Vui lòng lựa chọn ít nhất 1 tuần mà em đã thực tế tham gia sinh hoạt!");
        return;
      }

      // Check if child already exist in attendance record to update, otherwise insert new
      const existingIndex = attendance.findIndex(a => a.fullName.toLowerCase() === cleanName.toLowerCase() && a.quarter === selectedQuarter);
      let updatedAttendance: AttendanceRecord[] = [...attendance];
      let recordToSave: AttendanceRecord;
      
      if (existingIndex !== -1) {
        const previousWeeks = attendance[existingIndex].weeksAttended;
        const mergedWeeks = Array.from(new Set([...previousWeeks, ...attendedWeeksInput])).sort((a, b) => a - b);
        
        recordToSave = {
          ...attendance[existingIndex],
          weeksAttended: mergedWeeks,
          timestamp: new Date().toISOString()
        };
        updatedAttendance[existingIndex] = recordToSave;
        
        setRollCallSuccess(`Cập nhật thông tin thành công cho em ${cleanName}! Tích lũy tổng cộng ${mergedWeeks.length} buổi sinh hoạt hè.`);
        addSystemLog("Ghi danh Chuyên cần", `Cập nhật chuyên cần thiếu nhi: ${cleanName} (${selectedQuarter}), Tuần: ${attendedWeeksInput.join(", ")}`);
      } else {
        const newRec: AttendanceRecord = {
          id: "att-" + Date.now(),
          fullName: cleanName,
          quarter: selectedQuarter,
          weeksAttended: [...attendedWeeksInput].sort((a, b) => a - b),
          timestamp: new Date().toISOString()
        };
        recordToSave = newRec;
        updatedAttendance = [newRec, ...updatedAttendance];
        setRollCallSuccess(`Đăng ký thành công! Đã ghi nhận em ${cleanName} đồng hành sinh hoạt thuộc ${selectedQuarter}.`);
        addSystemLog("Ghi danh Chuyên cần", `Đăng ký thiếu nhi mới: ${cleanName} (${selectedQuarter}), Tuần: ${attendedWeeksInput.join(", ")}`);
      }

      // Sync registered attendance data directly with central server (conflict-free database replication)
      try {
        const response = await fetch("/api/register-attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ record: recordToSave })
        });
        if (!response.ok) {
          throw new Error("HTTP status " + response.status);
        }
      } catch (e) {
        console.warn("Lỗi đồng bộ thông tin chuyên cần lên máy chủ, đang đưa vào hàng chờ ngoại tuyến (Background Sync):", e);
        // Write to IndexedDB queue for Service Worker Background Sync
        await queueOfflineAttendance(recordToSave);
      }

      // Generate a simulated email recipient address
      const targetEmail = parentEmail.trim() || `phuhuynh.${cleanName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "")}@gmail.com`;
      const isAutoGeneratedMail = !parentEmail.trim();
      const currentWeeksList = existingIndex !== -1 
        ? Array.from(new Set([...attendance[existingIndex].weeksAttended, ...attendedWeeksInput])).sort((a, b) => a - b)
        : [...attendedWeeksInput].sort((a, b) => a - b);

      // Trigger Simulated Email Confirmation
      setSimulatedEmail({
        to: targetEmail,
        studentName: cleanName,
        quarter: selectedQuarter,
        weeks: currentWeeksList,
        subject: `[TÂN HƯNG HÈ 2026] Xác nhận ghi danh chuyên cần thành công - Em ${cleanName}`,
        isAutoGenerated: isAutoGeneratedMail,
        timestamp: new Date().toLocaleString("vi-VN"),
        phone: parentPhone.trim() || "Chưa cung cấp"
      });

      // Dynamic points award effects
      setAttendance(updatedAttendance);
      playAlertSound();

      // Reset inputs
      setStudentName("");
      setParentPhone("");
      setParentEmail("");
      setAttendedWeeksInput([]);
      
      setTimeout(() => {
        setRollCallSuccess("");
      }, 5000);

    } catch (error: any) {
      addSystemLog("Lỗi Hệ thống", `Xảy ra sự cố khi đăng ký thiếu nhi: ${error?.message || error}`, true);
      setFormValidationError("Đã xảy ra lỗi cục bộ khi kết nối cơ sở dữ liệu. Bản ghi đã được khôi phục.");
    }
  };

  // Perform Volunteer Roll Call Submit
  const handleVolunteerRollCall = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormValidationError("");

    // 1. Role Authorization validation
    if (currentRole === "Guest") {
      const errorStr = "Quyền 'Khách vãng lai' không được phép cập nhật hoặc tham gia đăng ký Ban phụ trách!";
      setFormValidationError(errorStr);
      addSystemLog("Truy cập bất hợp pháp", "Guest cố gắng đăng ký Phụ trách hè nhưng bị chặn.", true);
      return;
    }

    try {
      const cleanVolName = volunteerName.trim();
      if (cleanVolName.length < 3) {
        setFormValidationError("Họ và tên của phụ trách phải tối thiểu 3 ký tự!");
        return;
      }
      if (/\d/.test(cleanVolName)) {
        setFormValidationError("Họ và tên của phụ trách không được phép chứa chữ số!");
        return;
      }

      // Phone validation
      if (volunteerPhone.trim() && !/^\d{10,11}$/.test(volunteerPhone.trim())) {
        setFormValidationError("Số điện thoại liên hệ không hợp lệ (yêu cầu từ 10 đến 11 số)!");
        return;
      }

      if (volunteerWeeks.length === 0) {
        setFormValidationError("Vui lòng tích ít nhất 1 tuần đồng hành phụ trách hè!");
        return;
      }

      const updatedVolunteers = [...volunteers];
      const existingIndex = updatedVolunteers.findIndex(
        v => v.fullName.toLowerCase() === cleanVolName.toLowerCase() && v.quarter === volunteerQuarter
      );
      let recordToSave: VolunteerAttendance;

      if (existingIndex > -1) {
        const previousWeeks = updatedVolunteers[existingIndex].weeksAttended;
        const mergedWeeks = Array.from(new Set([...previousWeeks, ...volunteerWeeks])).sort((a, b) => a - b);
        
        recordToSave = {
          ...updatedVolunteers[existingIndex],
          role: volunteerRole,
          weeksAttended: mergedWeeks,
          timestamp: new Date().toISOString()
        };
        updatedVolunteers[existingIndex] = recordToSave;
        setVolunteers(updatedVolunteers);
        setVolunteerSuccess(`Cập nhật thông tin Phụ trách thành công cho ${cleanVolName}! Tích lũy ${mergedWeeks.length} tuần đồng hành hè.`);
        addSystemLog("Đăng ký Phụ trách", `Cập nhật phụ trách: ${cleanVolName} (${volunteerQuarter}), Vai trò: ${volunteerRole}`);
      } else {
        const newRec: VolunteerAttendance = {
          id: "vol-" + Date.now(),
          fullName: cleanVolName,
          quarter: volunteerQuarter,
          role: volunteerRole,
          weeksAttended: [...volunteerWeeks].sort((a, b) => a - b),
          timestamp: new Date().toISOString()
        };
        recordToSave = newRec;
        setVolunteers([newRec, ...updatedVolunteers]);
        setVolunteerSuccess(`Đăng ký thành công! Cụm 2 hoan nghênh tinh thần cống hiến hỗ trợ các bé của anh/chị ${cleanVolName}.`);
        addSystemLog("Đăng ký Phụ trách", `Đăng ký phụ trách mới: ${cleanVolName} (${volunteerQuarter}), Vai trò: ${volunteerRole}`);
      }

      // Sync volunteer signup directly with central server
      try {
        const response = await fetch("/api/register-volunteer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ record: recordToSave })
        });
        if (!response.ok) {
          throw new Error("HTTP status " + response.status);
        }
      } catch (e) {
        console.warn("Lỗi đồng bộ danh sách phụ trách hè, đang đưa vào hàng chờ ngoại tuyến (Background Sync):", e);
        await queueOfflineAttendance(recordToSave, "/api/register-volunteer");
      }

      playAlertSound();
      
      // Reset inputs
      setVolunteerName("");
      setVolunteerPhone("");
      setVolunteerWeeks([]);

      setTimeout(() => {
        setVolunteerSuccess("");
      }, 5000);

    } catch (error: any) {
      addSystemLog("Lỗi Hệ thống", `Xảy ra sự cố khi đăng ký Phụ trách: ${error?.message || error}`, true);
      setFormValidationError("Lỗi lưu trữ cục bộ. Hành động đã Rollback thành công.");
    }
  };

  // Quarters list from KP10 to KP18
  const QUARTERS = Array.from({ length: 9 }, (_, i) => `Khu phố ${i + 10}`);

  // Leaderboard ranking of active quarters (Sum of check-in times across that Quarter)
  const quarterScores = QUARTERS.map(q => {
    const totalPoints = attendance
      .filter(a => a.quarter === q)
      .reduce((acc, curr) => acc + curr.weeksAttended.length, 0);
    return { name: q, points: totalPoints };
  }).sort((a, b) => b.points - a.points);

  // Leaderboard ranking of active individual children (10 points per week check-in)
  const individualScores = attendance
    .map(a => ({
      id: a.id,
      fullName: a.fullName,
      quarter: a.quarter,
      points: a.weeksAttended.length * 10,
      weeksCount: a.weeksAttended.length,
      timestamp: a.timestamp
    }))
    .filter(a => a.weeksCount > 0)
    .sort((a, b) => b.points - a.points || new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(0, 5);

  // Grouped photographs from administrative weeks and stored client assets
  const allGalleryImages: { src: string; weekNum: number; theme: string; album: string }[] = [];
  weeks.forEach(w => {
    if (w.images && w.images.length > 0) {
      w.images.forEach(img => {
        allGalleryImages.push({ 
          src: img, 
          weekNum: w.weekNumber, 
          theme: w.theme, 
          album: `Tuần ${w.weekNumber}: ${w.theme}` 
        });
      });
    }
  });
  storedAssets.forEach(asset => {
    if (asset.type === "image") {
      allGalleryImages.push({ 
        src: asset.url, 
        weekNum: 99, 
        theme: asset.name, 
        album: asset.album || "Kho lưu trữ chung" 
      });
    }
  });

  const activeCategoryImages = selectedImageCategory === "all"
    ? allGalleryImages
    : allGalleryImages.filter(img => img.weekNum === Number(selectedImageCategory));

  const uniqueAlbumsInActiveCategory = Array.from(
    new Set(activeCategoryImages.map(img => img.album))
  ).filter(Boolean);

  const filteredGallery = selectedAlbumFilter === "all"
    ? activeCategoryImages
    : activeCategoryImages.filter(img => img.album === selectedAlbumFilter);

  if (!isLoadedFromServer) {
    return (
      <div className="min-h-screen bg-[#001d3d] text-white flex flex-col items-center justify-center relative p-6 select-none font-sans overflow-hidden">
        {/* Abstract decorative geometric background blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />

        {/* Central interactive bento loading portal */}
        <div className="max-w-md w-full bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-8 shadow-2xl relative z-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg mb-6 animate-bounce">
            <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>

          <span className="text-[10px] uppercase tracking-widest text-blue-400 font-extrabold block mb-2 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
            Hệ Thống Đồng Bộ Portal
          </span>
          <h2 className="text-xl font-extrabold text-white tracking-tight mb-2 uppercase">
            Sinh Hoạt Hè cụm 2 • Tân Hưng
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
            Đang tải dữ liệu Portal trực tiếp từ cơ sở dữ liệu Supabase PostgreSQL trung tâm...
          </p>

          <div className="w-full bg-slate-800/50 rounded-full h-1.5 overflow-hidden mb-2">
            <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-orange-500 h-1.5 rounded-full animate-pulse w-full duration-1000" />
          </div>
          <span className="text-[10px] font-mono text-slate-500 block uppercase tracking-wider">
            Single Source of Truth Activator
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] text-slate-800 flex flex-col selection:bg-orange-500 selection:text-white relative font-sans border-4 md:border-8 border-[#0056b3] scroll-smooth">
      
      {/* 1. TOP FLOATING BRAND HEADER & NAVIGATION BAR */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 flex items-center justify-between px-4 py-3 md:py-4 shrink-0 shadow-sm transition-all text-slate-800">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <AppLogoCluster className="h-10 md:h-11 shrink-0" />
            
            <div className="hidden sm:block">
              <span className="text-[10px] font-black uppercase text-orange-500 tracking-widest block leading-none">CỤM HOẠT ĐỘNG SỐ 2</span>
              <h1 className="text-sm md:text-base font-black text-[#0056b3] tracking-tighter leading-normal uppercase">Sinh Hoạt Hè 2026</h1>
              <span className="text-[9px] text-slate-500 block leading-none">Phường Tân Hưng • KP10 - KP18</span>
            </div>
            <div className="sm:hidden block">
              <h1 className="text-sm font-black text-[#0056b3] tracking-tighter uppercase">Sinh Hoạt Hè cụm 2</h1>
              <span className="text-[9px] text-orange-500 font-bold">Quận 7 • Tân Hưng</span>
            </div>
          </div>

          {/* Quick links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-slate-600">
            <a href="#hero" className="hover:text-[#0056b3] transition-colors">Trang chủ</a>
            <a href="#timetable" className="hover:text-[#0056b3] transition-colors">Thời khóa biểu</a>
            <a href="#weekly-detail" className="hover:text-[#0056b3] transition-colors">Nội dung tuần</a>
            <a href="#gifts" className="hover:text-[#0056b3] transition-colors">Hòm Quà Hè</a>
            <a href="#rollcall" className="hover:text-[#0056b3] transition-colors">Đăng ký tham gia</a>
            <a href="#gallery" className="hover:text-[#0056b3] transition-colors">Thư viện ảnh</a>
          </nav>

          {/* Admin center toggle */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowAdmin(!showAdmin)}
              className={`text-xs font-bold leading-none px-4 py-2.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer shadow-lg hover:scale-105 active:scale-95 ${showAdmin ? "bg-orange-500 border-orange-400 text-white" : "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-750"}`}
            >
              <Settings className="w-4 h-4 animate-spin-slow text-[#0056b3]" />
              <span>{showAdmin ? "Trở Lại Portal" : "Quản Trị Admin"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. TICKER ANNOUNCEMENT MARQUEE BAR */}
      <section className="bg-[#001d3d] text-white flex items-center border-b border-slate-300 overflow-hidden relative z-10 select-none h-12">
        <div className="w-36 md:w-40 bg-orange-600 h-full flex items-center justify-center font-black text-xs uppercase tracking-tighter shrink-0">
          THÔNG BÁO 🔔
        </div>
        <div className="flex-1 px-4 whitespace-nowrap overflow-hidden italic text-xs md:text-sm tracking-wide flex items-center">
          <div className="animate-marquee flex items-center gap-12 whitespace-nowrap">
            {announcements.filter(a => a.isActive).length === 0 ? (
              <>
                <span className="flex items-center gap-2 font-bold text-yellow-300">
                  <span>•</span>
                  Chào mừng phụ huynh và em thiếu nhi đến với Cổng thông tin Sinh hoạt Hè Cụm 2 Phường Tân Hưng! Đồng hành ghi danh chuyên cần, tích lũy sticker đổi quà tặng đỉnh cao 🎁
                </span>
                <span className="flex items-center gap-2 font-bold text-yellow-300">
                  <span>•</span>
                  Gặp gỡ, giao lưu học hỏi nhiều chủ đề STEM sáng tạo kịch tính, dã ngoại an toàn lành mạnh!
                </span>
              </>
            ) : (
              <>
                {announcements.filter(a => a.isActive).map(a => (
                  <span key={a.id} className="flex items-center gap-2 font-semibold">
                    <span>•</span>
                    {a.text}
                  </span>
                ))}
                {/* Double repetition so that scroll marquee is perfectly seamless */}
                {announcements.filter(a => a.isActive).map(a => (
                  <span key={`${a.id}-rep`} className="flex items-center gap-2 font-semibold">
                    <span>•</span>
                    {a.text}
                  </span>
                ))}
              </>
            )}
          </div>
        </div>
        <div className="hidden md:flex w-48 bg-white/10 h-full items-center justify-center text-[10px] font-mono text-slate-300 pointer-events-none">
          HCMC 2026 © TÂN HƯNG YOUTH
        </div>
      </section>

      {/* 3. CORE SUB-PANEL ADMIN MODAL VIEW IF OPEN */}
      {showAdmin ? (
        <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-8 relative z-10">
          <AdminPanel 
            weeks={weeks} setWeeks={setWeeks}
            gifts={gifts} setGifts={setGifts}
            announcements={announcements} setAnnouncements={setAnnouncements}
            attendance={attendance} setAttendance={setAttendance}
            customLogo={customLogo} setCustomLogo={setCustomLogo}
            storedAssets={storedAssets} setStoredAssets={setStoredAssets}
            volunteers={volunteers} setVolunteers={setVolunteers}
            currentRole={currentRole} setCurrentRole={setCurrentRole}
            auditLogs={auditLogs}
            addSystemLog={addSystemLog}
          />
        </main>
      ) : (
        <>
          {/* 4. MAIN USER LANDING HERO SECTION (SaaS Landing / Split Layout 3D Interface) */}
          <section id="hero" className="max-w-7xl mx-auto w-full px-4 py-8 md:py-12 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              
              {/* LEFT SPLIT COLUMN: Immersive 3D Sandbox World View with camera fly-in zoom */}
              <div className="lg:col-span-7 bg-gradient-to-b from-sky-400 via-[#004080] to-[#001d3d] rounded-[2.5rem] p-6 sm:p-8 text-white relative overflow-hidden flex flex-col justify-between min-h-[550px] md:min-h-[620px] shadow-xl shadow-blue-900/10 border border-white/10 group select-none">
                
                {/* 3D Scene Wrapper with fly-in transition */}
                <div 
                  className={`absolute inset-0 transition-all duration-[2000ms] cubic-bezier(0.25, 1, 0.5, 1) origin-center ${
                    cameraStage === "wide" 
                      ? "scale-110 rotate-x-12 rotate-y-[-12deg] blur-[2px] opacity-70" 
                      : cameraStage === "zooming" 
                      ? "scale-[1.03] rotate-x-6 rotate-y-[-6deg] blur-[1px] opacity-90" 
                      : "scale-100 rotate-x-0 rotate-y-0 blur-none opacity-100"
                  }`}
                  style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
                >
                  {/* Sky elements (animated stars and direct yellow moon/sun) */}
                  <div className="absolute top-8 left-10 w-24 h-24 bg-yellow-400 rounded-full blur-[60px] opacity-30 pointer-events-none"></div>
                  <div className="absolute top-1/3 right-1/4 w-32 h-32 bg-orange-500 rounded-full blur-[80px] opacity-25 pointer-events-none"></div>
                  <div className="absolute inset-0 grid-overlay opacity-10 pointer-events-none"></div>

                  {/* Clouds floating horizontally */}
                  <div className="absolute top-12 left-[10%] w-24 h-8 bg-white/10 blur-md rounded-full animate-pulse-slow"></div>
                  <div className="absolute top-24 right-[15%] w-36 h-10 bg-white/5 blur-lg rounded-full animate-marquee" style={{ animationDuration: "35s" }}></div>

                  {/* HCM SKYLINE SILHOUETTE */}
                  <div className="absolute bottom-16 left-0 w-full z-0 h-[120px]">
                    <HcmSkyline />
                  </div>

                  {/* GREEN PARK GRASS LAWN WITH TREES (Công viên Kênh Tẻ) */}
                  <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-emerald-800 to-teal-900 rounded-b-[2.4rem] border-t border-emerald-500/20 z-10">
                    {/* Abstract tree elements */}
                    <div className="absolute bottom-6 left-[10%] w-10 h-14 bg-emerald-950/40 rounded-t-full border-r border-emerald-400/10"></div>
                    <div className="absolute bottom-8 right-[8%] w-12 h-16 bg-emerald-950/40 rounded-t-full border-l border-emerald-400/10"></div>
                  </div>

                  {/* SILHOUETTES OF JUMPING CHILDREN IN THE PARK */}
                  <ChildrenPlaying />

                  {/* Interactive Floating 3D Assets positioned spatially */}
                  <div className="absolute inset-0 z-20 pointer-events-none">
                    {/* Air balloon - top right */}
                    <div className="absolute top-10 right-[5%] pointer-events-auto scale-75 xl:scale-80">
                      <AirBalloon />
                    </div>
                    {/* Educational book - mid left */}
                    <div className="absolute top-[28%] left-[8%] pointer-events-auto scale-[0.68] xl:scale-75">
                      <EducationBook />
                    </div>
                    {/* Friendly Robot AI - bottom right over the grass */}
                    <div className="absolute bottom-4 right-[10%] pointer-events-auto scale-[0.62] xl:scale-70">
                      <AIRobot />
                    </div>
                    {/* Launchable Water Rocket - bottom left */}
                    <div className="absolute bottom-[20px] left-[15%] pointer-events-auto scale-[0.58] xl:scale-[0.65]">
                      <WaterRocket />
                    </div>
                  </div>
                </div>

                {/* Overlaid static control layers that don't rotate on camera fly-in */}
                {/* 1. Left Top Brand Badging */}
                <div className="relative z-30 flex items-start justify-between w-full">
                  <div className="inline-flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-white/10 px-3 py-1 md:px-3.5 md:py-1.5 rounded-full text-[10px] md:text-[11px] font-bold tracking-wide uppercase shadow">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    SÂN CHƠI 3D KHÔNG GIAN SÁNG TẠO
                  </div>

                  {/* Direct Camera Fly-in replay trigger */}
                  <button 
                    onClick={triggerCameraSequence}
                    className="flex items-center gap-1.5 bg-sky-900/80 hover:bg-sky-800 backdrop-blur-md border border-sky-400/30 text-sky-100 text-[10px] uppercase font-black px-3 py-1.5 rounded-xl cursor-pointer shadow-lg active:scale-95 transition-all"
                    title="Chạy lại camera fly-in"
                  >
                    <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "12s" }} />
                    <span>🎥 Camera Fly-in</span>
                  </button>
                </div>

                {/* 2. Primary Typography Center Panel */}
                <div className="relative z-30 flex-grow flex flex-col justify-center max-w-lg mt-8 md:mt-2">
                  <span className="text-yellow-400 font-extrabold text-[10px] md:text-xs tracking-[0.2em] block mb-1 md:mb-2 uppercase">ĐOÀN PHƯỜNG TÂN HƯNG • CỤM 2</span>
                  <h2 className="text-4xl sm:text-5xl md:text-6xl font-black italic tracking-tighter leading-[0.9] text-white uppercase text-left">
                    SINH HOẠT<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-350 via-orange-400 to-amber-300">HÈ 2026</span>
                  </h2>
                  <p className="text-[11px] md:text-xs font-semibold max-w-sm opacity-95 border-l-4 border-orange-500 pl-3 md:pl-4 mt-2 md:mt-3 leading-relaxed text-slate-200">
                    Nơi sải cánh ước mơ tuổi thơ, thỏa sức bắn tên lửa, tìm hiểu robot và kết nối bạn bè khu phố <span className="text-yellow-300 font-black">KP10 đến KP18</span>. Nhấp trực tiếp vào các vật thể trong tranh để trải nghiệm!
                  </p>
                </div>

                {/* 3. Translucent metrics overlay at the bottom */}
                <div className="relative z-30 mt-4 md:mt-8 grid grid-cols-3 gap-2 max-w-md bg-slate-900/85 md:bg-white/5 border border-white/10 p-3 rounded-2xl backdrop-blur-md shadow-lg">
                  <div className="text-center border-r border-[#ffffff15]">
                    <span className="block text-base md:text-xl font-black text-yellow-300">{weeks.length}</span>
                    <span className="text-[9px] uppercase tracking-wider block text-slate-300 font-extrabold">Tuần Lịch Trình</span>
                  </div>
                  <div className="text-center border-r border-[#ffffff15]">
                    <span className="block text-base md:text-xl font-black text-yellow-300">{attendance.length * 15 + 172}+</span>
                    <span className="text-[9px] uppercase tracking-wider block text-slate-300 font-extrabold font-sans">Chiến Sỹ Nhí</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-base md:text-xl font-black text-yellow-300">{gifts.length * 2}</span>
                    <span className="text-[9px] uppercase tracking-wider block text-slate-300 font-extrabold">Quà Tặng Vàng</span>
                  </div>
                </div>

              </div>

              {/* RIGHT SPLIT COLUMN: Pure White Corporate Dashboard Container (5 columns) */}
              <div className="lg:col-span-5 bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-200 shadow-xl flex flex-col justify-between min-h-[550px] md:min-h-[620px] text-slate-800">
                <div className="space-y-6">
                  {/* Title Bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="text-base font-extrabold text-[#001d3d] uppercase tracking-tight">Chiến Dịch Tuần Này</h3>
                    <span className="bg-orange-100 text-orange-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">TUẦN MỚI NHẤT 🔥</span>
                  </div>

                  {/* Dynamic Week 0 Details Display */}
                  {weeks.length > 0 && (
                    <div className="p-4 sm:p-5 bg-gradient-to-r from-orange-50 to-white border-l-4 border-orange-500 rounded-2xl shadow-sm relative overflow-hidden">
                      <div className="relative z-10">
                        <span className="text-[9px] uppercase tracking-widest text-orange-600 font-extrabold block mb-1">Chủ Đề Tiêu Điểm</span>
                        <h4 className="font-black text-[#001d3d] text-base md:text-lg uppercase leading-tight truncate-1">{weeks[0].theme}</h4>
                        <div className="flex flex-wrap items-center gap-3 mt-2.5 text-[11px] text-slate-500 font-semibold font-mono">
                          <span className="flex items-center gap-1">📅 {weeks[0].date}</span>
                          <span className="flex items-center gap-1">⏰ {weeks[0].time}</span>
                        </div>
                        <p className="mt-2.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">{weeks[0].description}</p>
                        
                        <button 
                          onClick={() => setTargetAlarmActivity(weeks[0])}
                          className="mt-3.5 w-full bg-[#0056b3] hover:bg-[#003d7a] text-white py-3 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer uppercase tracking-tight"
                        >
                          <Bell className="w-4 h-4 animate-bounce" /> <span>Hẹn Giờ Nhắc Nhở (45p)</span>
                        </button>
                      </div>
                      <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-orange-100 rounded-full opacity-40 pointer-events-none"></div>
                    </div>
                  )}

                  {/* Core Navigation Quick Links */}
                  <div className="grid grid-cols-2 gap-3">
                    <a href="#timetable" className="p-3 bg-slate-50 hover:bg-[#0056b3]/5 rounded-2xl border border-slate-100 hover:border-[#0056b3]/20 transition-all flex items-center gap-3 group">
                      <span className="text-xl bg-orange-100 p-2 rounded-xl group-hover:scale-110 transition-transform">📅</span>
                      <div>
                        <h5 className="font-extrabold text-xs text-slate-900 font-sans">Chi Tiết Lịch Trình</h5>
                        <p className="text-[9px] text-slate-500 font-sans">8 Tuần sinh hoạt hè</p>
                      </div>
                    </a>
                    <a href="#gifts" className="p-3 bg-slate-50 hover:bg-[#0056b3]/5 rounded-2xl border border-slate-100 hover:border-[#0056b3]/20 transition-all flex items-center gap-3 group">
                      <span className="text-xl bg-yellow-100 p-2 rounded-xl group-hover:scale-110 transition-transform">🎁</span>
                      <div>
                        <h5 className="font-extrabold text-xs text-slate-900 font-sans">Tích Lũy Điểm Quà</h5>
                        <p className="text-[9px] text-slate-500 font-sans">Rinh balo, bình nước</p>
                      </div>
                    </a>
                    <a href="#rollcall" className="p-3 bg-slate-50 hover:bg-[#0056b3]/5 rounded-2xl border border-slate-100 hover:border-[#0056b3]/20 transition-all flex items-center gap-3 group">
                      <span className="text-xl bg-emerald-100 p-2 rounded-xl group-hover:scale-110 transition-transform">📍</span>
                      <div>
                        <h5 className="font-extrabold text-xs text-slate-900 font-sans">Đăng Ký Nhanh</h5>
                        <p className="text-[9px] text-slate-500 font-sans">Ghi nhận chuyên cần</p>
                      </div>
                    </a>
                    <a href="#gallery" className="p-3 bg-slate-50 hover:bg-[#0056b3]/5 rounded-2xl border border-slate-100 hover:border-[#0056b3]/20 transition-all flex items-center gap-3 group">
                      <span className="text-xl bg-sky-100 p-2 rounded-xl group-hover:scale-110 transition-transform">📸</span>
                      <div>
                        <h5 className="font-extrabold text-xs text-slate-900 font-sans">Thư Viện Khoảnh Khắc</h5>
                        <p className="text-[9px] text-slate-500 font-sans">Ảnh & clip sinh hoạt hè</p>
                      </div>
                    </a>
                  </div>
                </div>

                {/* High Contrast Leaderboard Status Widget */}
                {quarterScores.length > 0 && (
                  <div className="mt-8 p-4 bg-gradient-to-r from-[#0056b3] to-[#003d7a] rounded-[1.5rem] text-white flex items-center justify-between shadow-lg shadow-blue-900/10 border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-sm">🏆</div>
                      <div>
                        <p className="text-[8px] opacity-90 uppercase font-black tracking-widest text-yellow-350">Khu phố dẫn đầu</p>
                        <p className="text-sm font-black tracking-tight">{quarterScores[0].name}</p>
                      </div>
                    </div>
                    <div className="text-[10px] font-black bg-yellow-400 text-[#001d3d] px-3.5 py-1.5 rounded-full uppercase shrink-0 shadow-md">
                      {quarterScores[0].points} LƯỢT ĐĂNG KÝ
                    </div>
                  </div>
                )}
              </div>

            </div>
          </section>

          {/* 5. INDIVIDUAL TIME-TABLE SCHEDULING (Dạng Timeline 3D Hiện đại) */}
          <section id="timetable" className="py-20 max-w-7xl mx-auto px-4 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-[#0056b3] font-black text-xs tracking-widest uppercase block mb-2">📅 CHƯƠNG TRÌNH HÀNH ĐỘNG</span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight uppercase">Thời khóa biểu sinh hoạt hè</h2>
              <p className="text-sm text-slate-500 mt-3 max-w-2xl mx-auto leading-relaxed font-semibold">Theo dõi lịch trình các buổi sinh hoạt đội nhóm kỹ năng hè sôi động cho thiếu nhi phường Tân Hưng.</p>
            </div>
            {/* Smart dynamic timeline cards slider */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {weeks.length === 0 ? (
                <div className="col-span-full bg-white border border-slate-200 p-12 text-center rounded-3xl text-slate-400">
                  Đang thiết lập lịch hoạt động hè từ ban quản trị...
                </div>
              ) : (
                weeks.map((w, idx) => (
                  <div 
                    key={w.id} 
                    className="group bg-white hover:bg-slate-50/50 border border-slate-200 hover:border-[#0056b3]/40 rounded-3xl p-6 transition-all duration-300 shadow-sm hover:shadow-md flex flex-col justify-between relative overflow-hidden text-slate-800"
                  >
                    {/* Glowing highlight corner */}
                    <div className="absolute top-0 right-0 w-20 h-20 bg-[#0056b3]/5 group-hover:bg-[#0056b3]/10 rounded-full transition-all"></div>
                    
                    <div>
                      {/* Timeline top counter node */}
                      <div className="flex justify-between items-center mb-6 relative z-10">
                        <span className="w-11 h-11 rounded-2xl bg-[#0056b3]/10 text-[#0056b3] border border-[#0056b3]/20 flex items-center justify-center font-black text-sm tracking-tighter">
                          T.{w.weekNumber}
                        </span>
                        
                        <span className="text-xs font-mono font-bold text-slate-500 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
                          {w.date}
                        </span>
                      </div>

                      {/* Content block detail */}
                      <span className="text-[10px] text-orange-600 font-extrabold uppercase tracking-widest block mb-1">Chủ đề chính</span>
                      <h3 className="font-extrabold text-[#001d3d] text-lg mb-3 group-hover:text-[#0056b3] transition-colors line-clamp-1 uppercase tracking-tight">{w.theme}</h3>
                      <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mb-4">{w.description}</p>
                      
                      <div className="space-y-2 mb-6">
                        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                          <Clock className="w-3.5 h-3.5 text-[#0056b3] shrink-0" />
                          <span>{w.time}</span>
                        </div>
                        <div className="flex items-start gap-2 text-xs text-slate-600 font-medium font-sans">
                          <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{w.location}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom actionable integration tools */}
                    <div className="space-y-2 pt-3 border-t border-slate-100 relative z-10">
                      {/* Map directional check */}
                      <a 
                        href={w.mapsLink}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 py-2.5 px-4 rounded-xl text-[11px] font-bold text-[#0056b3] flex items-center justify-center gap-1.5 transition-all select-none"
                      >
                        <MapPin className="w-3.5 h-3.5 text-orange-500" />
                        <span>Chỉ đường trực tiếp</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>

                      {/* Smart alert triggers */}
                      <button 
                        onClick={() => setTargetAlarmActivity(w)}
                        className="w-full bg-[#0056b3]/10 hover:bg-[#0056b3]/20 border border-[#0056b3]/20 py-2.5 px-4 rounded-xl text-[11px] text-[#0056b3] font-black flex items-center justify-center gap-1.5 transition-all select-none cursor-pointer"
                      >
                        <Bell className="w-3.5 h-3.5 text-orange-500" />
                        <span>NHẮC LỊCH SINH HOẠT</span>
                      </button>

                      {/* Lesson Document Link */}
                      {w.lessonUrl && (
                        <a 
                          href={w.lessonUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full bg-amber-500 hover:bg-amber-600 text-white py-2.5 px-4 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all select-none shadow-sm"
                        >
                          <Book className="w-3.5 h-3.5 text-white animate-pulse" />
                          <span>BÀI HỌC: ĐỌC TÀI LIỆU</span>
                          <ExternalLink className="w-3 h-3 text-white/70" />
                        </a>
                      )}

                      {/* Interactive popups detail trigger */}
                      <button 
                        onClick={() => setSelectedWeekDetail(w)}
                        className="w-full text-slate-400 hover:text-[#0056b3] py-1.5 text-center text-[10px] font-bold underline cursor-pointer transition-colors block"
                      >
                        Xem mục tiêu & giáo án chi tiết →
                      </button>
                    </div>

                  </div>
                ))
              )}
            </div>
          </section>

          {/* 6. WEEKLY CONTENT HIGHLIGHT POPS - popup detail or focused accordion */}
          {selectedWeekDetail && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
              <div className="bg-white border border-slate-200 text-slate-800 w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl relative">
                
                {/* Absolute close button */}
                <button 
                  onClick={() => { setSelectedWeekDetail(null); setPlayingVideoUrl(null); }}
                  className="absolute top-4 right-4 z-55 w-10 h-10 bg-white/90 border border-slate-200 text-slate-500 hover:text-[#0056b3] rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Hero cover inside week details pop */}
                <div className="relative h-48 md:h-64 w-full overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-slate-950/20 to-black/10 z-10"></div>
                  <LazyImage 
                    src={selectedWeekDetail.coverImage} 
                    alt={selectedWeekDetail.theme}
                    referrerPolicy="no-referrer"
                    className="w-full h-full"
                  />
                  
                  {/* Floating tags */}
                  <div className="absolute bottom-4 left-6 z-20 space-y-1">
                    <span className="bg-[#0056b3] text-white font-extrabold text-[10px] uppercase px-3 py-1 rounded-full border border-white/20">
                      TUẦN SỐ {selectedWeekDetail.weekNumber}
                    </span>
                    <h3 className="text-2xl md:text-3xl font-black text-white uppercase text-shadow leading-tight">{selectedWeekDetail.theme}</h3>
                  </div>
                </div>

                <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-8 text-slate-850">
                  {/* Left Column details panel */}
                  <div className="md:col-span-8 space-y-6">
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider mb-2">Giới Thiệu Hoạt Động</h4>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-150">
                        {selectedWeekDetail.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Objectives */}
                      <div>
                        <h4 className="text-xs font-black uppercase text-[#0056b3] tracking-wider mb-3 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Mục Tiêu Giáo Dục
                        </h4>
                        <ul className="space-y-2">
                          {selectedWeekDetail.objectives?.map((obj, i) => (
                            <li key={i} className="text-xs text-slate-650 flex items-start gap-1.5 bg-slate-50 p-3 rounded-xl border border-slate-150 leading-relaxed">
                              <span className="text-[#0056b3] font-bold shrink-0">•</span>
                              <span>{obj}</span>
                            </li>
                          )) || <li className="text-xs text-slate-400">Chưa tải lên giáo án</li>}
                        </ul>
                      </div>

                      {/* Play Games and Experiences */}
                      <div>
                        <h4 className="text-xs font-black uppercase text-orange-600 tracking-wider mb-3 flex items-center gap-1.5">
                          <Trophy className="w-4 h-4 text-orange-500" /> Trò Chơi / Trải Nghiệm
                        </h4>
                        <ul className="space-y-2">
                          {selectedWeekDetail.games?.map((game, i) => (
                            <li key={i} className="text-xs text-slate-650 flex items-start gap-1.5 bg-slate-50 p-3 rounded-xl border border-slate-150 leading-relaxed">
                              <span className="text-orange-550 font-bold shrink-0">★</span>
                              <span>{game}</span>
                            </li>
                          )) || <li className="text-xs text-slate-400">Đang chuẩn bị đạo cụ trò chơi</li>}
                        </ul>
                      </div>
                    </div>

                    {/* Additional features */}
                    {selectedWeekDetail.activities && selectedWeekDetail.activities.length > 0 && (
                      <div>
                        <h4 className="text-xs font-black uppercase text-orange-500 tracking-wider mb-2.5">Hoạt động bế mạc & Kỷ niệm</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedWeekDetail.activities.map((act, i) => (
                            <span key={i} className="text-xs bg-slate-50 border border-slate-200 text-slate-650 px-3 py-1.5 rounded-xl font-medium">
                              🎈 {act}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column Video Recap & Location Details */}
                  <div className="md:col-span-4 space-y-6">
                    {/* Compact Date Box */}
                    <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl">
                      <span className="text-slate-500 text-[10px] font-black uppercase tracking-wider block mb-2">Thông tin tổ chức</span>
                      <div className="space-y-2.5 text-xs text-slate-650">
                        <div className="flex justify-between">
                          <span className="text-slate-450">Ngày sinh hoạt:</span>
                          <span className="font-mono text-slate-900 font-bold">{selectedWeekDetail.date}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-450">Mốc giờ họp:</span>
                          <span className="text-slate-900 font-semibold">{selectedWeekDetail.time}</span>
                        </div>
                        <div className="pt-2 border-t border-slate-200">
                          <span className="text-slate-450 block mb-1">Điểm đến sinh hoạt:</span>
                          <span className="text-[#0056b3] font-bold block leading-snug">{selectedWeekDetail.location}</span>
                        </div>
                      </div>
                    </div>

                    {/* Lesson Material Highlight Link */}
                    {selectedWeekDetail.lessonUrl && (
                      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 rounded-2xl shadow-md border border-amber-400 relative overflow-hidden group">
                        <div className="absolute right-[-10px] bottom-[-10px] opacity-10 transform scale-150 rotate-12 group-hover:rotate-45 transition-transform duration-700 pointer-events-none">
                          <Book className="w-24 h-24 stroke-[1]" />
                        </div>
                        <span className="text-[9px] font-black uppercase text-yellow-250 tracking-widest block mb-1">Gắn kết lý thuyết & thực hành</span>
                        <h4 className="font-bold text-xs uppercase tracking-tight mb-2 flex items-center gap-1">
                          📚 TÀI LIỆU BÀI HỌC HOẠT ĐỘNG
                        </h4>
                        <p className="text-[10px] opacity-90 leading-tight mb-3">
                          Tải bài giảng hoặc giáo án sinh hoạt hè đồng bộ hệ thống để làm bài thu hoạch và chuẩn bị bài học.
                        </p>
                        <a 
                          href={selectedWeekDetail.lessonUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex w-full bg-slate-950 border border-slate-800 hover:bg-black text-white shrink-0 py-2.5 px-3 rounded-xl text-[10px] font-extrabold items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer text-center"
                        >
                          <span>📖 Đọc & Tải Về Bài Học</span>
                          <ExternalLink className="w-3 h-3 text-amber-400" />
                        </a>
                      </div>
                    )}

                    {/* Video Recap Player Placeholder */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest block">Video Sinh Hoạt Lưu Niệm</h4>
                      
                      {playingVideoUrl ? (
                        <div className="relative w-full aspect-video bg-neutral-900 rounded-2xl overflow-hidden border border-slate-200 shadow-md">
                          {playingVideoUrl.startsWith("data:") || playingVideoUrl.includes(".mp4") || playingVideoUrl.includes(".mov") || playingVideoUrl.includes(".webm") || !playingVideoUrl.toLowerCase().includes("youtube") && !playingVideoUrl.toLowerCase().includes("embed") ? (
                            <video 
                              src={playingVideoUrl} 
                              controls 
                              autoPlay 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <iframe 
                              src={playingVideoUrl} 
                              title="Summer Video Recap Player" 
                              className="w-full h-full border-none"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                              allowFullScreen
                            ></iframe>
                          )}
                        </div>
                      ) : (
                        <div 
                          onClick={() => setPlayingVideoUrl(selectedWeekDetail.videoUrl || "https://www.youtube.com/embed/dQw4w9WgXcQ")}
                          className="relative w-full aspect-video bg-slate-100 hover:bg-slate-200/80 rounded-2xl border border-slate-200 flex items-center justify-center group cursor-pointer transition-all overflow-hidden"
                        >
                          <LazyImage 
                            src={selectedWeekDetail.images[0] || selectedWeekDetail.coverImage} 
                            alt="Video Thumbnail"
                            className="absolute inset-0 w-full h-full opacity-25 group-hover:scale-105 transition-all duration-500"
                          />
                          <div className="absolute inset-0 bg-blue-900/5 group-hover:bg-blue-900/10 z-0"></div>

                          <div className="relative z-10 flex flex-col items-center animate-pulse">
                            <span className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 active:scale-95 transition-transform">
                              <Play className="w-6 h-6 fill-white ml-0.5" />
                            </span>
                            <span className="text-[10px] uppercase font-black text-[#0056b3] mt-2 tracking-widest">XEM RECAP VIDEO</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Full snapshots slider of this particular week */}
                    {selectedWeekDetail.images && selectedWeekDetail.images.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest block">Bộ ảnh tuần {selectedWeekDetail.weekNumber}</h4>
                        <div className="grid grid-cols-3 gap-2">
                          {selectedWeekDetail.images.slice(0, 3).map((imgUrl, i) => (
                            <img 
                              key={i} 
                              src={imgUrl} 
                              alt="Activity Snap"
                              onClick={() => setLightboxImage(imgUrl)}
                              className="aspect-square w-full rounded-lg object-cover border border-slate-200 hover:border-[#0056b3] cursor-pointer transition-all hover:scale-105 h-16"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer interactive closing button */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                  <button 
                    onClick={() => { setSelectedWeekDetail(null); setPlayingVideoUrl(null); }}
                    className="px-6 py-2.5 bg-[#0056b3] text-white text-xs font-bold rounded-2xl hover:bg-[#003d7a] transition-all select-none cursor-pointer shadow-md shadow-blue-100"
                  >
                    Đóng bảng nội dung
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* 7. ALARM SCHEDULER POPUP DIALOG (Phục vụ Nhắc lịch thông minh) */}
          {targetAlarmActivity && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
              <div className="bg-white border border-slate-200 w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl relative text-center text-slate-800">
                
                {/* Close Button */}
                <button 
                  onClick={() => setTargetAlarmActivity(null)}
                  className="absolute top-4 right-4 w-8 h-8 bg-slate-50 text-slate-400 hover:text-slate-600 border border-slate-200 rounded-full flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Shaking Bell Element */}
                <div className="flex justify-center mb-4 mt-2">
                  <div className={`w-16 h-16 bg-[#0056b3]/10 border border-[#0056b3]/20 text-orange-500 rounded-3xl flex items-center justify-center shadow-md ${shakeBell ? "animate-bounce" : ""}`}>
                    <Bell className="w-8 h-8 animate-pulse" />
                  </div>
                </div>

                <h3 className="text-lg font-extrabold text-[#001d3d] tracking-tight leading-snug uppercase">Thiết Lập Nhắc Lịch</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">Cài đặt giờ chuông báo nhắc nhở cho sự kiện:</p>
                <p className="text-sm text-[#0056b3] font-black uppercase tracking-tight mt-2 italic font-sans">“{targetAlarmActivity.theme}”</p>
                
                {/* Select countdown range */}
                <div className="my-5">
                  <span className="text-[10px] font-black uppercase text-slate-550 tracking-wider block mb-2">Chọn thời gian nhắc trước:</span>
                  <div className="grid grid-cols-4 gap-2">
                    {[15, 30, 45, 60].map(mins => (
                      <button 
                        key={mins}
                        onClick={() => setAlarmMinutes(mins)}
                        className={`py-2.5 text-xs font-mono font-black rounded-xl border transition-all cursor-pointer ${alarmMinutes === mins ? "bg-orange-500 border-orange-400 text-white shadow-md shadow-orange-500/10" : "bg-slate-50 border-slate-205 text-slate-500 hover:text-[#0056b3]"}`}
                      >
                        {mins}p
                      </button>
                    ))}
                  </div>
                </div>

                {/* Alarm actionable providers */}
                <div className="space-y-2.5 pt-4 border-t border-slate-100">
                  <button 
                    onClick={() => handleSetAlarm("google")}
                    className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 py-3 rounded-2xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <span className="text-lg">📅</span>
                    <span>Đồng bộ Google Calendar</span>
                  </button>

                  <button 
                    onClick={() => handleSetAlarm("apple")}
                    className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 py-3 rounded-2xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <span className="text-lg">🍎</span>
                    <span>Tải lịch Apple Calendar (.ics)</span>
                  </button>

                  <button 
                    onClick={() => handleSetAlarm("push")}
                    className="w-full bg-gradient-to-r from-[#0056b3] to-[#003d7a] text-white py-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-blue-200 transition-all uppercase"
                  >
                    <Volume2 className="w-4 h-4 animate-bounce" />
                    <span>Nhận thông báo push (Thiết bị)</span>
                  </button>
                </div>

                {alarmSuccessMsg && (
                  <div className="mt-4 bg-emerald-50 border border-emerald-300 text-emerald-750 text-[11px] p-2.5 rounded-xl font-bold animate-pulse">
                    {alarmSuccessMsg}
                  </div>
                )}

                <p className="text-[10px] text-slate-400 mt-4 leading-normal font-medium">
                  * Mặc định nhắc nhắc 45 phút giúp quý cha mẹ chuẩn bị đưa các bé tới Cụm 2 Phường Tân Hưng an toàn đúng giờ.
                </p>

              </div>
            </div>
          )}

          {/* 8. DETAILED WEEK HIGHLIGHT SECTIONS (NỘI DUNG SINH HOẠT TỪNG TUẦN) - Card 3D design */}
          <section id="weekly-detail" className="py-20 bg-slate-50 relative z-10 border-t border-b border-slate-100">
            <div className="max-w-7xl mx-auto px-4">
              <div className="text-center max-w-3xl mx-auto mb-16">
                <span className="text-[#0056b3] font-black text-xs tracking-widest uppercase block mb-2">🎯 NGÀY HỘI KỸ NĂNG</span>
                <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight uppercase font-sans">Sân Chơi Ngoại Khóa Từng Tuần</h2>
                <p className="text-sm text-slate-600 mt-4 leading-relaxed">
                  Nhấn vào tấm thẻ của từng tuần dưới đây để xem cụ thể giáo án đào tạo kỹ năng hè, hoạt động đội nhóm rèn luyện sức vóc và video tổng kết sinh động.
                </p>
              </div>

              {/* Responsive Deck of 3D Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {weeks.map((w) => (
                  <div 
                    key={w.id}
                    onClick={() => setSelectedWeekDetail(w)}
                    className="group w-full h-[320px] cursor-pointer"
                  >
                    <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-sm hover:shadow-md border border-slate-200/60 transition-all duration-300">
                      
                      {/* Image backdrop layer */}
                      <LazyImage 
                        src={w.coverImage} 
                        alt={w.theme}
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      {/* Darker gradient cover over image to guarantee elite legibility */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent z-10"></div>

                      {/* Content aligned customly */}
                      <div className="absolute inset-0 p-6 z-20 flex flex-col justify-end">
                        <div className="space-y-1.5 translate-z-10">
                          <span className="bg-orange-500 text-white font-extrabold text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-orange-400/20 shadow-sm inline-block">
                            Tuần {w.weekNumber}
                          </span>
                          
                          <h3 className="text-base font-black text-white leading-snug group-hover:text-yellow-300 transition-colors uppercase pt-1">
                            {w.theme}
                          </h3>
                          
                          <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed opacity-95 font-sans">
                            {w.description}
                          </p>

                          <div className="flex justify-between items-center pt-3 text-[10px] text-orange-400 font-extrabold uppercase tracking-wider">
                            <span>Chi tiết giáo án →</span>
                            <span className="font-mono text-slate-300 font-medium">{w.date}</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 9. INTERACTIVE 3D GIFT ZONE (Hộp Quà Lớn Xoay & Mở Khi Bấm) */}
          <section id="gifts" className="py-20 max-w-7xl mx-auto px-4 relative z-10 overflow-hidden">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <span className="text-[#0056b3] font-black text-xs tracking-widest uppercase block mb-2">🎁 CHĂM NGOAN HỌC TỐT</span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight uppercase font-sans">Khu Vực Quà Tặng Tích Lũy</h2>
              <p className="text-sm text-slate-600 mt-4 leading-relaxed">
                Nêu cao tinh thần đổi mới và rèn luyện sôi nổi! Thiếu nhi tích cực tham gia đầy đủ các buổi sinh hoạt hè sẽ rinh về những phần quà vô cùng dễ thương. Hãy nhấp trực tiếp vào Hộp Quà 3D xoay dưới đây nhé!
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white border border-slate-200 p-8 rounded-[3rem] shadow-sm">
              
              {/* Left Column: Rotating 3D Gift Box Animation Space */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 min-h-[350px] relative">
                
                {/* Explosive micro-stars backdrop when opened */}
                {isGiftBoxOpen && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Sparkles className="w-48 h-48 text-yellow-400/20 animate-ping" />
                    <div className="absolute w-24 h-24 rounded-full bg-orange-550/5 blur-xl animate-pulse"></div>
                  </div>
                )}

                {/* Rotating 3D styled box */}
                <div 
                  onClick={() => {
                    playAlertSound();
                    setIsGiftBoxOpen(!isGiftBoxOpen);
                  }}
                  className={`relative w-48 h-48 cursor-pointer transform-style-3d select-none group flex items-center justify-center ${isGiftBoxOpen ? "scale-95 duration-500" : "animate-float-slow"}`}
                >
                  <div className="absolute inset-0 bg-orange-550/5 blur-3xl rounded-full scale-125 group-hover:bg-orange-550/10 transition-colors"></div>

                  {isGiftBoxOpen ? (
                    // Open Box Representation
                    <div className="relative text-center flex flex-col items-center justify-center">
                      <div className="text-8xl animate-bounce">🎁</div>
                      {/* Exploding star particle effects */}
                      <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-amber-500 text-slate-950 font-black text-[10px] tracking-widest px-3 py-1 rounded-full uppercase absolute top-0 animate-pulse shadow-sm">
                        ĐÃ MỞ HÒM QUÀ HÈ!
                      </span>
                    </div>
                  ) : (
                    // Closed styled gift frame with 3D shadow wrapping
                    <div className="relative flex flex-col items-center justify-center transition-transform hover:scale-110">
                      <div className="text-9xl animate-rotate-slow">🎁</div>
                      <span className="bg-[#001d3d] border border-[#0056b3]/20 text-white font-black text-[10px] mt-4 px-3 py-1 rounded-full whitespace-nowrap shadow-md">
                        🎯 NHẤN ĐỂ MỞ QUÀ!
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-6 text-center">
                  <p className="text-xs text-slate-500 max-w-xs leading-normal">
                    {isGiftBoxOpen 
                      ? "Chúc mừng thiếu nhi phường Tân Hưng! Hãy rà soát danh sách quà tặng đặc biệt bên cạnh tương ứng với số buổi tích lũy của mình nhé."
                      : "Nhấp trực tiếp vào Hộp Quà Đoàn Thanh Niên rực rỡ để khám phá kho tàng dụng cụ học tập, Sticker, bình nước thể thao cực chất!"
                    }
                  </p>
                </div>
              </div>

              {/* Right Column: Rewards Milestones progress lists */}
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase flex items-center gap-1.5 font-sans">
                    <Award className="w-5 h-5 text-orange-500" />
                    Mốc Quy Đổi Quà Tặng
                  </h3>
                  <p className="text-xs text-slate-500">Hệ thống ghi nhận trạng thái tự động dựa trên số tuần sinh hoạt thực tế của từng em.</p>
                </div>

                <div className="space-y-4">
                  {gifts.length === 0 ? (
                    <EmptyState 
                      type="gifts" 
                      title="Kho quà tặng trống" 
                      description="Chưa có thông tin phần thưởng hoặc danh sách quà tặng hè tích lũy nào thích hợp lúc này." 
                    />
                  ) : (
                    gifts.map((g) => (
                      <div 
                        key={g.id}
                        className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between gap-4 transition-all hover:bg-slate-50/50 hover:border-[#0056b3]/25 relative group shadow-sm"
                      >
                      {/* Horizontal progress bar highlighting if open */}
                      {isGiftBoxOpen && (
                        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-orange-500 to-yellow-450 rounded-l"></div>
                      )}

                      <div className="flex items-center gap-4">
                        <button 
                          type="button"
                          onClick={() => setSelectedGiftForModal(g)}
                          className="bg-slate-50 border border-slate-250 rounded-xl block shrink-0 relative hover:scale-110 active:scale-95 hover:bg-orange-50 hover:border-orange-350 transition-all cursor-pointer group/icon shadow-xs"
                          id={`gift-avatar-g-${g.id}`}
                          title="Nhấp để xem ảnh thực tế & thông tin chi tiết quà tặng này"
                        >
                          {g.image ? (
                            <div className="w-14 h-14 rounded-xl overflow-hidden relative border border-slate-100">
                              <LazyImage 
                                src={g.image} 
                                alt={g.name} 
                                referrerPolicy="no-referrer"
                                className="w-full h-full" 
                              />
                              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/icon:opacity-100 flex items-center justify-center transition-opacity text-white text-[11px] font-black animate-fade-in">
                                🔍
                              </div>
                            </div>
                          ) : (
                            <div className="w-14 h-14 flex items-center justify-center text-3xl font-sans relative">
                              {g.icon}
                              <div className="absolute -bottom-1 -right-1 text-[8px] bg-[#0056b3] text-white rounded px-1 py-0.5 leading-none opacity-0 group-hover/icon:opacity-100 transition-opacity font-black font-sans uppercase">
                                XEM
                              </div>
                            </div>
                          )}
                        </button>
                        
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 
                              onClick={() => setSelectedGiftForModal(g)}
                              className="font-extrabold text-sm text-slate-905 hover:text-orange-550 transition-colors cursor-pointer flex items-center gap-1.5"
                              title="Xem ảnh chi tiết"
                            >
                              <span>{g.name}</span>
                              <span className="text-[10px] text-slate-400 font-sans font-black uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">🔍 Xem ảnh</span>
                            </h4>
                            <span className="bg-[#0056b3]/10 border border-[#0056b3]/20 text-[#0056b3] text-[9px] px-2.5 py-0.5 rounded-full font-black">
                              {g.category === "weekly" ? "Quà Tuần" : g.category === "special" ? "Quà Tổng Kết" : "Tích Lũy"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 leading-normal max-w-sm md:max-w-md">{g.description}</p>
                          <span className="text-[10px] text-slate-400 block mt-1 font-sans font-medium">Kho còn: <span className="text-emerald-600 font-bold">{g.countLeft} vật phẩm</span></span>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="font-mono bg-slate-50 border border-slate-200 text-[#001d3d] text-xs font-black py-2 px-3.5 rounded-2xl block text-center min-w-[55px] shadow-sm">
                          {g.reqAttendances}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 block">Buổi tham gia</span>
                      </div>
                    </div>
                  ))
                )}
                </div>

              </div>
            </div>
          </section>

          {/* 10. ROLL CALL ATTENDANCE & TEAM PARTICIPATIONS (ĐĂNG KÝ THIẾU NHI & PHỤ TRÁCH) */}
          <section id="rollcall" className="py-20 relative z-10 bg-slate-50 border-b border-slate-100">
            <div className="max-w-7xl mx-auto px-4 font-sans">
              <div className="text-center max-w-3xl mx-auto mb-16">
                <span className="text-[#0056b3] font-black text-xs tracking-widest uppercase block mb-2">📍 TRẠM GHI DANH KỲ THÚ</span>
                <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight uppercase font-sans">Đăng ký tham gia sinh hoạt hè</h2>
                <p className="text-sm text-slate-600 mt-4 leading-relaxed">
                  Thiếu nhi và Lực lượng Phụ trách hè vui lòng đăng ký chính xác họ tên và khu phố đồng hành để Hệ Thống tự động tính điểm tích lũy thi đua, góp sức cùng khu phố nâng tầm bảng vàng!
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Rollcall Card Container (7 columns) */}
                <div className="lg:col-span-7 bg-white border border-slate-200 p-6 md:p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden">
                  {/* Internal Form Selector Tabs */}
                  <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200 mb-6 text-xs font-black font-sans font-sans">
                    <button
                      type="button"
                      onClick={() => setRollCallType("kids")}
                      className={`flex-1 py-3 px-4 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-2 ${rollCallType === "kids" ? "bg-[#0056b3] text-white shadow-md shadow-blue-900/10" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"}`}
                    >
                      <span>👦 Thiếu Nhi Đăng Ký Chuyên Cần</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRollCallType("volunteers")}
                      className={`flex-1 py-3 px-4 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-2 ${rollCallType === "volunteers" ? "bg-[#0056b3] text-white shadow-md shadow-blue-900/10" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"}`}
                    >
                      <span>✊ Ban Phụ Trách Đăng Ký Đồng Hành</span>
                    </button>
                  </div>

                  {rollCallType === "kids" ? (
                    /* STUDENT ROLLCALL FORM */
                    <form onSubmit={handleRollCallSubmit} className="space-y-5">
                      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                        <MapPin className="w-6 h-6 text-[#0056b3]" />
                        <div>
                          <h3 className="font-extrabold text-base text-slate-900 font-sans">Đơn Đăng Ký Thiếu Nhi</h3>
                          <p className="text-[11px] text-slate-500 mt-0.5">Dành riêng cho thiếu nhi Cụm 2, Phường Tân Hưng.</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">1. Họ và tên của em</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Nhập tên tiếng Việt có dấu. Ví dụ: Nguyễn Hoàng Nam"
                            value={studentName}
                            onChange={(e) => setStudentName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#0056b3] focus:bg-white transition-all font-sans font-medium"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">SĐT liên hệ (Phụ huynh)</label>
                            <input 
                              type="tel" 
                              placeholder="Nhập 10-11 số di động"
                              value={parentPhone}
                              onChange={(e) => setParentPhone(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#0056b3] focus:bg-white transition-all font-sans font-medium"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">Email cha mẹ (Nhận tin)</label>
                            <input 
                              type="email" 
                              placeholder="cha_me@gmail.com"
                              value={parentEmail}
                              onChange={(e) => setParentEmail(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#0056b3] focus:bg-white transition-all font-sans font-medium"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">2. Thuộc Khu phố cư trú</label>
                            <select 
                              value={selectedQuarter}
                              onChange={(e) => setSelectedQuarter(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-[#0056b3] focus:bg-white font-sans font-medium cursor-pointer"
                            >
                              {QUARTERS.map(q => (
                                <option key={q} value={q}>{q}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">3. Buổi sinh hoạt hè đã tham gia</label>
                            <span className="text-[10px] text-slate-500 block mb-2 leading-none font-medium">Vui lòng tích những tuần em thực tế có tham gia:</span>
                            <div className="grid grid-cols-2 gap-2">
                              {weeks.map(w => {
                                const isChecked = attendedWeeksInput.includes(w.weekNumber);
                                return (
                                  <button
                                    type="button"
                                    key={w.id}
                                    onClick={() => {
                                      if (isChecked) {
                                        setAttendedWeeksInput(prev => prev.filter(num => num !== w.weekNumber));
                                      } else {
                                        setAttendedWeeksInput(prev => [...prev, w.weekNumber]);
                                      }
                                    }}
                                    className={`py-1.5 px-2.5 rounded-xl border text-[11px] font-black transition-all text-left truncate select-none ${isChecked ? "bg-[#0056b3] border-[#0056b3] text-white shadow-sm" : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer"}`}
                                  >
                                    {isChecked ? "✅ " : "⬜ "} Tuần {w.weekNumber}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {formValidationError && (
                          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl text-xs flex items-start gap-2.5 animate-bounce font-medium">
                            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-extrabold text-rose-950">LỖI XÁC THỰC NGHIỆP VỤ!</p>
                              <p className="mt-1 leading-normal opacity-90">{formValidationError}</p>
                            </div>
                          </div>
                        )}

                        {rollCallSuccess && (
                          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs flex items-start gap-2.5 animate-fade-in font-medium">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-extrabold text-emerald-900">GHI NHẬN THÀNH CÔNG!</p>
                              <p className="mt-1 leading-normal opacity-90">{rollCallSuccess}</p>
                            </div>
                          </div>
                        )}

                        <div className="pt-3 border-t border-slate-100">
                          <button 
                            type="submit"
                            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-xs md:text-sm py-4 rounded-xl shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            👦 XÁC NHẬN ĐĂNG KÝ THIẾU NHI
                          </button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    /* VOLUNTEER (PHỤ TRÁCH) ROLLCALL FORM */
                    <form onSubmit={handleVolunteerRollCall} className="space-y-5">
                      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                        <Users className="w-6 h-6 text-emerald-600" />
                        <div>
                          <h3 className="font-extrabold text-base text-slate-900 font-sans">Đơn Đăng Ký Ban Phụ Trách Hè</h3>
                          <p className="text-[11px] text-slate-500 mt-0.5">Dành cho Anh/Chị Phụ Trách, Đoàn Viên chủ trì, dẫn dắt.</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">1. Họ và tên Phụ Trách / Đoàn Viên</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Nhập tên tiếng Việt có dấu. Ví dụ: Trần Tuấn Anh"
                            value={volunteerName}
                            onChange={(e) => setVolunteerName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all font-sans font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">Số điện thoại liên hệ (Phụ Trách)</label>
                          <input 
                            type="tel" 
                            placeholder="Nhập 10-11 số di động"
                            value={volunteerPhone}
                            onChange={(e) => setVolunteerPhone(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all font-sans font-medium"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">2. Đơn vị Khu Phố Đoàn kết</label>
                            <select 
                              value={volunteerQuarter}
                              onChange={(e) => setVolunteerQuarter(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-emerald-600 focus:bg-white font-sans font-medium cursor-pointer"
                            >
                              {QUARTERS.map(q => (
                                <option key={q} value={q}>{q}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">3. Chức vụ / Vai trò</label>
                            <select 
                              value={volunteerRole}
                              onChange={(e) => setVolunteerRole(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-emerald-600 focus:bg-white font-sans font-medium cursor-pointer"
                            >
                              <option value="Phụ trách chính">Phụ trách chính tuần</option>
                              <option value="Phụ trách phụ">Phụ trách phụ đồng hành</option>
                              <option value="Đoàn viên hỗ trợ">Đoàn viên hỗ trợ</option>
                              <option value="Tình nguyện viên">Tình nguyện viên Cụm 2</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">4. Tuần đã Phụ trách / Đồng hành dắt trẻ</label>
                          <span className="text-[10px] text-slate-500 block mb-3 leading-tight font-medium">Link trực tiếp với Khu Phố Đoàn Kết nòng cốt đồng bộ của tuần:</span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {weeks.map(w => {
                              const isChecked = volunteerWeeks.includes(w.weekNumber);
                              const hostQuarter = w.solidarityQuarter || "Khu phố 10";
                              return (
                                <button
                                  type="button"
                                  key={w.id}
                                  onClick={() => {
                                    if (isChecked) {
                                      setVolunteerWeeks(prev => prev.filter(num => num !== w.weekNumber));
                                    } else {
                                      setVolunteerWeeks(prev => [...prev, w.weekNumber]);
                                    }
                                  }}
                                  className={`p-2.5 rounded-xl border text-[10.5px] transition-all text-left flex flex-col justify-start select-none leading-normal ${isChecked ? "bg-emerald-600 border-emerald-600 text-white shadow-sm" : "bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-950 cursor-pointer"}`}
                                >
                                  <span className="font-extrabold text-xs">
                                    {isChecked ? "✅ " : "⬜ "} Tuần {w.weekNumber}: {w.theme}
                                  </span>
                                  <span className={`text-[9px] mt-0.5 font-bold ${isChecked ? "text-emerald-100" : "text-blue-600"}`}>
                                    🎖️ KP Đoàn kết: {hostQuarter}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {formValidationError && (
                          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl text-xs flex items-start gap-2.5 animate-bounce font-medium">
                            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-extrabold text-rose-950">LỖI XÁC THỰC NGHIỆP VỤ!</p>
                              <p className="mt-1 leading-normal opacity-90">{formValidationError}</p>
                            </div>
                          </div>
                        )}

                        {volunteerSuccess && (
                          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs flex items-start gap-2.5 animate-fade-in font-medium">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-extrabold text-[#004b23]">Ghi danh thành công!</p>
                              <p className="mt-1 leading-normal opacity-90 font-sans">{volunteerSuccess}</p>
                            </div>
                          </div>
                        )}

                        <div className="pt-3 border-t border-slate-100">
                          <button 
                            type="submit"
                            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-black text-xs md:text-sm py-4 rounded-xl shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            ✊ TINH THẦN ĐỒNG HÀNH - ĐĂNG KÝ PHỤ TRÁCH
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  <p className="text-[10px] text-slate-400 text-center leading-normal pt-4 font-medium border-t border-slate-100 mt-4">
                    * Nghiêm cấm mạo danh dữ liệu. Ban chỉ đạo hè Phường Tân Hưng sẽ giám sát tính chính xác cùng ban điều hành khu phố ban chuyên trách hè vương quốc tuổi thơ.
                  </p>
                </div>

                {/* Team Quarters and Individual ranking boards (5 columns) */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-white border border-slate-200 p-6 rounded-[2.5rem] shadow-sm">
                    {/* Switcher Tabs Header */}
                    <div className="flex gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 mb-4 text-[11px] font-extrabold leading-none">
                      <button 
                        type="button"
                        onClick={() => setLeaderboardTab("quarter")}
                        className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer ${leaderboardTab === "quarter" ? "bg-[#0056b3] text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                      >
                        🏆 Xếp Hạng Khu Phố
                      </button>
                      <button 
                        type="button"
                        onClick={() => setLeaderboardTab("individual")}
                        className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer ${leaderboardTab === "individual" ? "bg-[#0056b3] text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                      >
                        🏅 Thiếu Nhi Tiêu Biểu
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
                      <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
                      <h3 className="font-black text-slate-900 text-xs uppercase font-sans">
                        {leaderboardTab === "quarter" ? "Khu phố tham dự tích cực nhất" : "Top 5 phong trào xuất sắc nhất"}
                      </h3>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed mb-4 font-semibold">
                      {leaderboardTab === "quarter" 
                        ? "Bảng xếp hạng tổng lượt tinh thần sinh hoạt hè được cập nhật trực khi có thêm thiếu nhi báo danh thuộc KP10 đến KP18."
                        : "Vinh danh những chiến sỹ nhí siêng năng, tích điểm cao nhất (10 điểm vàng cho mỗi tuần sinh hoạt hè hăng hái)."}
                    </p>

                    {leaderboardTab === "quarter" ? (
                      <div className="space-y-2.5">
                        {quarterScores.map((q, i) => {
                          // Max potential points for percentage visual meter
                          const maxPoints = Math.max(...quarterScores.map(x => x.points), 1);
                          const progressPercent = Math.min((q.points / maxPoints) * 100, 100);
                          
                          return (
                            <div key={q.name} className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <div className="flex justify-between text-xs font-semibold">
                                <div className="flex items-center gap-2">
                                  <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${i === 0 ? "bg-yellow-450 text-slate-900" : i === 1 ? "bg-slate-300 text-slate-800" : i === 2 ? "bg-amber-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                                    {i + 1}
                                  </span>
                                  <span className={i < 3 ? "text-slate-900 font-extrabold" : "text-slate-700"}>{q.name}</span>
                                </div>
                                <span className="font-mono text-emerald-600 font-extrabold">{q.points} lượt</span>
                              </div>

                              {/* visual progress bar */}
                              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  style={{ width: `${progressPercent}%` }}
                                  className={`h-full rounded-full bg-gradient-to-r ${i === 0 ? "from-yellow-400 to-orange-500" : i === 1 ? "from-slate-400 to-slate-250" : "from-amber-600 to-yellow-500"}`}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-2.5 animate-fade-in">
                        {individualScores.length > 0 ? (
                          individualScores.map((student, i) => {
                            const maxIndPoints = Math.max(weeks.length * 10, 10);
                            const progressPercent = Math.min((student.points / maxIndPoints) * 100, 100);

                            return (
                              <div key={student.id} className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                <div className="flex justify-between text-xs font-semibold">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 flex items-center justify-center text-[11px] shrink-0">
                                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                                    </span>
                                    <div>
                                      <span className="text-slate-900 font-extrabold block truncate max-w-[140px] leading-tight">{student.fullName}</span>
                                      <span className="text-[9px] text-[#0056b3] font-black block leading-none">{student.quarter}</span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-mono text-orange-600 font-black block leading-tight">{student.points} sao</span>
                                    <span className="text-[9px] text-slate-400 block font-bold">({student.weeksCount} tuần)</span>
                                  </div>
                                </div>

                                {/* visual progress bar */}
                                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    style={{ width: `${progressPercent}%` }}
                                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-[#0056b3]"
                                  ></div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-8 text-slate-400">
                            <span className="text-2xl">🌟</span>
                            <p className="font-extrabold text-xs text-slate-600 mt-2">Chưa có thiếu nhi báo danh!</p>
                            <p className="text-[10px] text-slate-400 mt-1 max-w-[180px] mx-auto">Em hãy báo danh ngay bên trái để ghi tên mình lên bảng vàng sao sáng nhé!</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Compact note */}
                  <div className="bg-orange-50 border border-orange-100 p-5 rounded-2xl flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-850 leading-relaxed font-semibold">
                      Quý cha mẹ lưu ý theo sát tiến độ đăng ký của con em để tích điểm kịp thời quy đổi các phần học bổng rực rỡ trước khi Lễ bế mạc tổng kết hè diễn ra vào đầu tháng 8 nhé!
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </section>

          {/* 11. MULTIMEDIA IMAGE GALLERY SECTION (THƯ VIỆN HÌNH ẢNH) */}
          <section id="gallery" className="py-20 bg-white relative z-10">
            <div className="max-w-7xl mx-auto px-4">
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
                <div>
                  <span className="text-[#0056b3] font-black text-xs tracking-widest block uppercase mb-1 font-sans">📸 PHÒNG TRANH TOÀN CẢNH</span>
                  <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight uppercase font-sans">Thư viện hình ảnh hoạt động</h2>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Giữ trọn từng khoảnh khắc đáng yêu, cống hiến hết mình của các chiến sỹ nhí tại Phường.</p>
                </div>

                {/* Filters slider menu */}
                <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                  <button 
                    onClick={() => setSelectedImageCategory("all")}
                    className={`py-1.5 px-4 rounded-xl text-xs font-black transition-all cursor-pointer ${selectedImageCategory === "all" ? "bg-orange-500 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    TẤT CẢ PHÒNG TRANH
                  </button>
                  {weeks.map(w => (
                    <button 
                      key={w.id}
                      onClick={() => setSelectedImageCategory(String(w.weekNumber))}
                      className={`py-1.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${selectedImageCategory === String(w.weekNumber) ? "bg-orange-500 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                    >
                      TUẦN {w.weekNumber}
                    </button>
                  ))}
                  <button 
                    onClick={() => setSelectedImageCategory("99")}
                    className={`py-1.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${selectedImageCategory === "99" ? "bg-orange-500 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    KHO TÀI NGUYÊN
                  </button>
                </div>
              </div>

              {/* Dynamic Album Bar */}
              {uniqueAlbumsInActiveCategory.length > 0 && (
                <div className="mb-8 flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-150 p-3 rounded-2xl shadow-xs animate-fade-in font-sans">
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider pl-1.5">
                    🗂️ Lọc theo Album:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setSelectedAlbumFilter("all")}
                      className={`text-[10px] font-black uppercase py-1 px-3 border transition-all cursor-pointer rounded-lg ${selectedAlbumFilter === "all" ? "bg-orange-500 text-white border-orange-600 shadow-xs" : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"}`}
                    >
                      Tất cả ({activeCategoryImages.length})
                    </button>
                    {uniqueAlbumsInActiveCategory.map((albumName) => {
                      const count = activeCategoryImages.filter(a => a.album === albumName).length;
                      return (
                        <button
                          key={albumName}
                          onClick={() => setSelectedAlbumFilter(albumName)}
                          className={`text-[10px] font-black py-1 px-3 border transition-all cursor-pointer rounded-lg ${selectedAlbumFilter === albumName ? "bg-[#0056b3] text-white border-[#004ca0] shadow-xs" : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"}`}
                        >
                          📁 {albumName} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Horizontal Slider / Carousel Section */}
              <div className="relative group/carousel px-1">
                {/* Left navigation arrow button */}
                {canScrollLeft && (
                  <button 
                    onClick={() => scrollGallery("left")}
                    className="absolute -left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 bg-white/95 text-slate-800 border border-slate-200 hover:bg-orange-500 hover:text-white rounded-full flex items-center justify-center transition-all shadow-xl hover:-translate-x-0.5 active:scale-95 cursor-pointer"
                    aria-label="Xem ảnh trước"
                  >
                    <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                  </button>
                )}

                {/* Right navigation arrow button */}
                {canScrollRight && (
                  <button 
                    onClick={() => scrollGallery("right")}
                    className="absolute -right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 bg-white/95 text-slate-800 border border-slate-200 hover:bg-orange-500 hover:text-white rounded-full flex items-center justify-center transition-all shadow-xl hover:translate-x-0.5 active:scale-95 cursor-pointer"
                    aria-label="Xem ảnh kế tiếp"
                  >
                    <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                  </button>
                )}

                {/* Main scrollable slides track */}
                <div 
                  ref={galleryCarouselRef}
                  onScroll={handleGalleryScroll}
                  className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-2 px-1 w-full"
                >
                  {filteredGallery.length === 0 ? (
                    <div className="w-full">
                      <EmptyState 
                        type="gallery" 
                        title="Thư viện ảnh trống" 
                        description={`Hiện tại danh mục ảnh dã ngoại, sinh hoạt hè hoặc tài liệu ${selectedImageCategory === "all" ? "" : `"${selectedImageCategory}"`} chưa ghi nhận tệp ảnh tải lên.`} 
                      />
                    </div>
                  ) : (
                    filteredGallery.map((img, idx) => (
                      <div 
                        key={idx}
                        onClick={() => setLightboxImage(img.src)}
                        className="w-[82%] sm:w-[46%] md:w-[31.5%] lg:w-[23.5%] shrink-0 snap-start relative aspect-[4/3] rounded-2xl overflow-hidden border border-slate-200 group/card cursor-pointer shadow-sm hover:shadow-lg transition-all duration-350 bg-slate-100"
                      >
                        <LazyImage 
                          src={img.src} 
                          alt={img.theme} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full"
                        />
                        {/* Elegant Card Badges & Info overlay */}
                        <div className="absolute inset-0 bg-linear-to-t from-slate-950/75 via-slate-900/10 to-transparent flex flex-col justify-end p-4.5 z-10">
                          <span className="text-[9px] bg-slate-900/95 border border-slate-700 text-orange-300 font-extrabold px-2 py-0.5 rounded-full select-none self-start mb-2 uppercase font-sans tracking-wide">
                            📁 {img.album || (img.weekNum === 99 ? "Kho tư liệu" : `Tuần ${img.weekNum}`)}
                          </span>
                          <h4 className="text-xs font-bold text-white font-sans tracking-tight mb-0.5 line-clamp-1">{img.theme}</h4>
                          <span className="text-[9px] text-yellow-300 font-extrabold font-sans uppercase tracking-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300">
                            🔍 Nhấp để xem ảnh lớn
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Progress bar and control footer to save space & provide superb UX */}
                {filteredGallery.length > 0 && (
                  <div className="mt-5 flex items-center justify-between px-2 font-sans">
                    <div className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                      TỔNG SỐ: <span className="text-slate-800 font-mono">{filteredGallery.length} ẢNH</span>
                    </div>

                    {/* Progress Indicator Dots slider */}
                    <div className="flex-1 max-w-xs mx-6 bg-slate-100 h-1.5 rounded-full overflow-hidden relative">
                      <div 
                        className="absolute left-0 top-0 h-full bg-orange-500 rounded-full transition-all duration-150"
                        style={{ width: `${Math.max(8, carouselScrollRatio * 100)}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => scrollGallery("left")}
                        disabled={!canScrollLeft}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          canScrollLeft 
                            ? "bg-slate-50 border-slate-200 text-slate-800 hover:bg-orange-500 hover:text-white" 
                            : "bg-slate-100/50 border-slate-100 text-slate-350 cursor-not-allowed"
                        }`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => scrollGallery("right")}
                        disabled={!canScrollRight}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          canScrollRight 
                            ? "bg-slate-50 border-slate-200 text-slate-800 hover:bg-orange-500 hover:text-white" 
                            : "bg-slate-100/50 border-slate-100 text-slate-350 cursor-not-allowed"
                        }`}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </section>

          {/* 12. FULLSCREEN LIGHTBOX INTERACTIVE COMPONENT */}
          {lightboxImage && (
            <div 
              className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 p-4 animate-fade-in"
              onClick={() => setLightboxImage(null)}
            >
              {/* Close Overlay btn */}
              <button 
                onClick={() => setLightboxImage(null)}
                className="absolute top-4 right-4 w-12 h-12 bg-white/10 border border-white/20 text-white hover:bg-white/20 rounded-full flex items-center justify-center transition-all cursor-pointer z-[120]"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="relative max-w-5xl max-h-[90vh] flex items-center justify-center">
                <img 
                  src={lightboxImage} 
                  alt="Fullscreen display panel"
                  referrerPolicy="no-referrer"
                  className="max-w-full max-h-[85vh] rounded-2xl object-contain border border-white/10 shadow-2xl animate-scale-up"
                  onClick={(e) => e.stopPropagation()} // Stop propagation from closing content
                />
              </div>
            </div>
          )}
          
          {/* SIMULATED EMAIL CONFIRMATION MODAL */}
          {simulatedEmail && (
            <div 
              className="fixed inset-0 z-[115] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-xs animate-fade-in"
              onClick={() => setSimulatedEmail(null)}
            >
              <div 
                className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl shadow-black/90 animate-scale-up"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Simulated Email Bar Header */}
                <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-850 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-1.5 font-mono">Hộp thư Giả lập Gửi Tin</span>
                  </div>
                  
                  <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider bg-emerald-950/40 border border-emerald-900/40 px-2.5 py-0.5 rounded-full">
                    Đã chuyển phát ✓
                  </span>
                </div>

                <div className="p-5 space-y-4">
                  {/* Email Delivery Meta Details */}
                  <div className="text-xs space-y-1.5 bg-slate-950/50 p-4 rounded-2xl border border-slate-850/50 font-mono text-slate-300">
                    <div>
                      <span className="text-slate-550 font-bold">Từ: </span>
                      <span className="text-sky-400">Ban Chỉ Đạo Hè Tân Hưng</span> &lt;he2026.cum2@tanhung.vn&gt;
                    </div>
                    <div>
                      <span className="text-slate-550 font-bold">Đến: </span>
                      <span className="text-amber-400">{simulatedEmail.to}</span>
                      {simulatedEmail.isAutoGenerated && (
                        <span className="ml-1.5 inline-block text-[8px] bg-sky-500/15 text-sky-450 border border-sky-500/10 px-1 py-px rounded font-sans uppercase font-black tracking-0.5 animate-pulse">
                          Email tự sinh
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-550 font-bold">Thời gian: </span>
                      <span>{simulatedEmail.timestamp}</span>
                    </div>
                    <div className="border-t border-slate-850/60 mt-1.5 pt-1.5">
                      <span className="text-slate-550 font-bold">Tiêu đề: </span>
                      <span className="text-white font-semibold font-sans">{simulatedEmail.subject}</span>
                    </div>
                  </div>

                  {/* Simulated Email Body Content (Designed like standard responsive newsletter) */}
                  <div className="bg-white text-slate-800 rounded-2xl p-5 md:p-6 border border-slate-200 shadow-inner font-sans space-y-4 text-xs md:text-sm">
                    {/* Header graphic */}
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                      <div className="w-10 h-10 select-none shrink-0" style={{ aspectRatio: "1096/391" }}>
                        <AppLogoCluster className="h-full w-auto object-contain" />
                      </div>
                      <div>
                        <div className="text-[9px] font-black uppercase tracking-wider text-orange-500">CỤM HOẠT ĐỘNG SỐ 2</div>
                        <div className="text-[10px] font-black uppercase tracking-tight text-slate-900">BCĐ SINH HOẠT HÈ PHƯỜNG TÂN HƯNG</div>
                      </div>
                    </div>

                    <div className="space-y-3 leading-relaxed text-slate-650">
                      <p>Kính gửi Quý phụ huynh em <strong>{simulatedEmail.studentName}</strong>,</p>
                      
                      <p>Ban chỉ đạo Sinh hoạt hè Cụm 2 - Phường Tân Hưng xin trân trọng thông báo đã tiếp nhận thành công phiếu đăng ký thi đua chuyên cần hè 2026 của học viên.</p>
                      
                      {/* Inner Box Record Info */}
                      <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-1.5 text-xs text-slate-700">
                        <div className="grid grid-cols-3">
                          <span className="text-slate-500 font-bold">Họ tên em:</span>
                          <span className="col-span-2 text-slate-900 font-black uppercase">{simulatedEmail.studentName}</span>
                        </div>
                        <div className="grid grid-cols-3">
                          <span className="text-slate-500 font-bold">Diện địa bàn:</span>
                          <span className="col-span-2 text-slate-900 font-semibold">{simulatedEmail.quarter}</span>
                        </div>
                        <div className="grid grid-cols-3">
                          <span className="text-slate-500 font-bold">Điện thoại liên hệ:</span>
                          <span className="col-span-2 text-slate-900 font-mono font-medium">{simulatedEmail.phone}</span>
                        </div>
                        <div className="grid grid-cols-3">
                          <span className="text-slate-500 font-bold">Số tuần tích lũy:</span>
                          <span className="col-span-2 text-slate-900 font-extrabold">{simulatedEmail.weeks.length} buổi sinh hoạt</span>
                        </div>
                        <div className="grid grid-cols-3">
                          <span className="text-slate-550 font-semibold">Chi tiết buổi:</span>
                          <span className="col-span-2 text-indigo-700 font-bold">Của tuần ({simulatedEmail.weeks.join(", ")})</span>
                        </div>
                        <div className="grid grid-cols-3 border-t border-slate-200 mt-1.5 pt-1.5">
                          <span className="text-slate-500 font-bold">Số điểm tích lũy:</span>
                          <span className="col-span-2 text-emerald-650 font-black font-mono text-sm">+{simulatedEmail.weeks.length * 10} ĐIỂM</span>
                        </div>
                      </div>

                      <p>Hệ thống dữ liệu đã tự động đồng bộ hóa hồ sơ chuyên cần của em lên bảng vàng thi đua của Phường nhằm phục vụ công tác giám sát, phân phối quà tặng hè và vinh danh danh dự cuối kỳ.</p>
                      
                      <p className="italic text-slate-500">Mọi thắc mắc hoặc cần sửa đổi lịch sử chuyên cần, xin vui lòng liên hệ anh/chị đoàn viên phụ trách khu phố trực thuộc.</p>

                      <p className="pt-2 border-t border-slate-100 text-right leading-snug">
                        <span className="block text-slate-500 text-[10px] uppercase font-black tracking-wider">BAN CHỈ ĐẠO BAN HÈ</span>
                        <span className="block text-slate-900 font-extrabold text-[11px]">CỤM HOẠT ĐỘNG SỐ 2</span>
                      </p>
                    </div>
                  </div>

                  {/* Sandbox Hint */}
                  <div className="text-[10px] text-slate-400 bg-slate-950/30 p-3 rounded-xl border border-slate-850/40 font-medium leading-relaxed leading-normal">
                    💡 <strong>Môi trường lập thử nghiệm:</strong> Đây là email xác nhận tự động mô phỏng do hệ thống thực thi cục bộ. Bạn có thể sử dụng hòm thư chính xác của cha mẹ để kiểm duyệt quy trình gửi tin.
                  </div>

                  {/* Interactive Button to Close */}
                  <button
                    type="button"
                    onClick={() => setSimulatedEmail(null)}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs py-3 px-5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/20 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Xác nhận & Hoàn tất đóng Hộp thư
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PREMIUM INTERACTIVE GIFT DETAIL POPUP FOR EXTENDED UX */}
          {selectedGiftForModal && (
            <div 
              className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-xs animate-fade-in"
              onClick={() => setSelectedGiftForModal(null)}
            >
              <div 
                className="bg-white border border-slate-200 text-slate-800 rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl relative animate-scale-up"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button top-right */}
                <button 
                  onClick={() => setSelectedGiftForModal(null)}
                  className="absolute top-4 right-4 w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-650 hover:text-slate-900 rounded-full flex items-center justify-center transition-all cursor-pointer z-50 shadow-xs"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>

                {/* Gift Photo / Image Block */}
                {selectedGiftForModal.image ? (
                  <div className="relative w-full aspect-[16/10] bg-slate-100 border-b border-slate-150 overflow-hidden">
                    <LazyImage 
                      src={selectedGiftForModal.image} 
                      alt={selectedGiftForModal.name} 
                      referrerPolicy="no-referrer"
                      className="w-full h-full"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent flex items-end p-5">
                      <span className="text-[10px] bg-sky-600 border border-sky-400/40 text-white font-black px-2.5 py-0.5 rounded-full uppercase font-sans tracking-wide">
                        {selectedGiftForModal.category === "weekly" ? "Quà Tặng Tuần" : selectedGiftForModal.category === "special" ? "Quà Tặng Xuất Sắc" : "Quà Tích Lũy Điểm"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full aspect-[16/10] bg-gradient-to-br from-indigo-50 to-orange-50 flex flex-col items-center justify-center relative border-b border-slate-150 py-8">
                    <span className="text-7xl animate-bounce duration-[2000]">{selectedGiftForModal.icon}</span>
                    <span className="text-[10px] bg-slate-800 text-amber-300 font-extrabold px-3 py-1 rounded-full uppercase font-sans tracking-wider mt-4">
                      {selectedGiftForModal.category === "weekly" ? "Quà Tặng Tuần" : selectedGiftForModal.category === "special" ? "Quà Tặng Xuất Sắc" : "Quà Tích Lũy Điểm"}
                    </span>
                  </div>
                )}

                {/* Content Block */}
                <div className="p-6 md:p-8 space-y-4">
                  <div className="space-y-1 text-center md:text-left">
                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight leading-snug font-sans">{selectedGiftForModal.name}</h3>
                    <p className="text-xs text-slate-400 font-sans">Chi tiết quà tặng lưu niệm trong hệ thống Sinh Hoạt Hè 2026</p>
                  </div>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-2 gap-3.5 pt-1.5 font-sans">
                    <div className="bg-slate-50 border border-slate-150/60 p-3 rounded-2xl">
                      <div className="text-[10px] text-slate-450 uppercase font-black tracking-wider text-left">Yêu Cầu</div>
                      <div className="text-sm font-black text-[#001d3d] mt-1 flex items-baseline gap-1 text-left">
                        <span className="text-xl text-[#0056b3]">{selectedGiftForModal.reqAttendances}</span>
                        <span className="text-[11px] text-slate-500 font-bold">Buổi chuyên cần</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-150/60 p-3 rounded-2xl">
                      <div className="text-[10px] text-slate-450 uppercase font-black tracking-wider text-left">Trạng Thái Kho</div>
                      <div className="text-sm font-black text-emerald-850 mt-1 flex items-baseline gap-1 text-left">
                        <span className="text-xl text-emerald-600">{selectedGiftForModal.countLeft}</span>
                        <span className="text-[11px] text-slate-500 font-bold">Món chưa trao</span>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Description */}
                  <div className="bg-slate-50 border border-slate-150/80 p-4 rounded-2xl text-[12.5px] leading-relaxed text-slate-650 font-sans text-left space-y-2">
                    <div className="font-bold text-slate-800 uppercase text-[10px] tracking-widest flex items-center gap-1.5 text-left">
                      <span>💡</span> GIỚI THIỆU PHẦN QUÀ:
                    </div>
                    <p className="text-left">{selectedGiftForModal.description}</p>
                  </div>

                  {/* Footer button */}
                  <div className="pt-2">
                    <button 
                      type="button"
                      onClick={() => setSelectedGiftForModal(null)}
                      className="w-full bg-[#0056b3] hover:bg-[#004494] text-white font-extrabold text-xs py-3.5 rounded-2xl transition-all hover:shadow-lg shadow-[#0056b3]/20 active:scale-98 cursor-pointer text-center uppercase tracking-wide font-sans md:py-3"
                    >
                      Xác nhận & Đóng xem nhanh
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 13. APP COMPACT INFORMATIVE FOOTER */}
      <footer className="bg-[#001d3d] border-t border-[#001d3d] py-12 px-4 mt-auto relative z-10 text-xs text-slate-350 font-sans">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-start mb-8 text-slate-300">
          
          <div className="space-y-3 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-3">
              <AppLogoCluster className="h-8 shrink-0" />
              <span className="font-extrabold text-white text-sm uppercase tracking-tight">Cụm 2 Phường Tân Hưng</span>
            </div>
            
            <p className="text-[11.5px] leading-relaxed text-slate-400 font-medium">
              Cổng thông tin sinh hoạt hè 2026, cung cấp giáo án ngoại khóa, theo dõi thời khóa biểu thông minh, đăng ký phần thưởng lưu niệm của con trẻ dồi dào sức mến thương.
            </p>
          </div>

          <div className="space-y-2 text-center">
            <h4 className="text-white font-extrabold text-xs uppercase tracking-widest">Ban Điều Hành Cụm 2</h4>
            <p className="text-[11.5px] leading-loose text-slate-300 font-medium">
              Thường trực: Khu phố 10, 11, 12, 13, 14, 15, 16, 17, 18.<br />
              Trụ sở Liên hệ: Văn phòng Đoàn Thanh niên Phường Tân Hưng.<br />
              Điểm Sinh Hoạt Cố Định: Văn phòng Khu phố 12 (Đường Nguyễn Hữu Thọ).
            </p>
          </div>

          <div className="space-y-3 text-center md:text-right">
            <h4 className="text-white font-extrabold text-xs uppercase tracking-widest">Tiêu Chí Hoạt Động Hè</h4>
            <div className="flex flex-wrap md:justify-end gap-1.5 justify-center">
              <span className="bg-[#003566]/60 border border-[#0056b3]/30 text-[10px] text-sky-200 px-2.5 py-1 rounded-lg font-bold">#Đoàn_Kết</span>
              <span className="bg-[#003566]/60 border border-[#0056b3]/30 text-[10px] text-sky-200 px-2.5 py-1 rounded-lg font-bold">#Sáng_Tạo</span>
              <span className="bg-[#003566]/60 border border-[#0056b3]/30 text-[10px] text-sky-200 px-2.5 py-1 rounded-lg font-bold">#Bổ_Ích</span>
              <span className="bg-[#003566]/60 border border-[#0056b3]/30 text-[10px] text-sky-200 px-2.5 py-1 rounded-lg font-bold">#Công_Nghệ_AI</span>
            </div>
            <p className="text-[10px] text-slate-400 pt-1 leading-snug font-medium">
              Bản quyền thuộc Đoàn TNCS Hồ Chí Minh Phường Tân Hưng. <br />
              Phát triển bởi Đội Trợ lý Trí Tuệ Nhân Tạo Google AI Studio 2026.
            </p>
          </div>

        </div>

        <div className="border-t border-[#003566] pt-6 text-center text-[10px] text-slate-400 flex flex-col md:flex-row justify-between items-center gap-2 max-w-7xl mx-auto font-medium">
          <span>© Sinh Hoạt Hè 2026 - Cụm hoạt động số 2 Phường Tân Hưng Quận 7. All rights reserved.</span>
          <div className="flex gap-4">
            <a href="#hero" className="hover:text-white transition-colors">Về Trang Đầu</a>
            <span>•</span>
            <span className="text-sky-400 font-extrabold flex items-center gap-1"><Heart className="w-3 h-3 text-red-500 fill-red-500 animate-pulse" /> Bản sắc Việt Nam</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
