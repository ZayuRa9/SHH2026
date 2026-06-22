import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  WeekActivity, Gift, Announcement, AttendanceRecord, StoredAsset, VolunteerAttendance, AuditLog 
} from "../types";
import { 
  exportAttendanceToCsv, exportVolunteersToCsv, compressImageFile, optimizeVideoFile, CompressProgress 
} from "../utils";
import { 
  Settings, KeyRound, Calendar, Award, Bell, Shield, Activity, Eye,
  Users, Trash2, Plus, Edit3, Image, Download, CheckCircle, Info, LogOut, AlertCircle, FileVideo, Copy, Check 
} from "lucide-react";
import { DoanLogo, DoiLogo, ThanhNienLogo, DefaultLogoCluster } from "./OfficialLogos";
import { AdminChart } from "./AdminChart";

interface AdminPanelProps {
  weeks: WeekActivity[];
  setWeeks: React.Dispatch<React.SetStateAction<WeekActivity[]>>;
  gifts: Gift[];
  setGifts: React.Dispatch<React.SetStateAction<Gift[]>>;
  announcements: Announcement[];
  setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>>;
  attendance: AttendanceRecord[];
  setAttendance: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  developerEmail?: string;
  customLogo: string;
  setCustomLogo: (val: string) => void;
  storedAssets: StoredAsset[];
  setStoredAssets: React.Dispatch<React.SetStateAction<StoredAsset[]>>;
  volunteers?: VolunteerAttendance[];
  setVolunteers?: React.Dispatch<React.SetStateAction<VolunteerAttendance[]>>;
  currentRole: "Super Admin" | "Admin" | "User" | "Guest";
  setCurrentRole: (val: "Super Admin" | "Admin" | "User" | "Guest") => void;
  auditLogs: AuditLog[];
  addSystemLog: (action: string, details: string, isError?: boolean) => void;
}

const uploadBase64ToServer = async (base64Str: string, filename: string = "cropped.png"): Promise<string> => {
  const res = await fetch(base64Str);
  const blob = await res.blob();
  const file = new File([blob], filename, { type: "image/png" });
  
  const formData = new FormData();
  formData.append("file", file);
  const uploadRes = await fetch("/api/upload", {
    method: "POST",
    body: formData
  });
  const data = await uploadRes.json();
  if (data.success && data.url) {
    return data.url;
  }
  throw new Error("Tải ảnh thất bại");
};

export const AdminPanel: React.FC<AdminPanelProps> = ({
  weeks, setWeeks,
  gifts, setGifts,
  announcements, setAnnouncements,
  attendance, setAttendance,
  developerEmail = "ngsoanng@gmail.com",
  customLogo, setCustomLogo,
  storedAssets, setStoredAssets,
  volunteers = [],
  setVolunteers,
  currentRole,
  setCurrentRole,
  auditLogs,
  addSystemLog
}) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  // Tab control
  const [activeTab, setActiveTab] = useState<"weeks" | "gifts" | "announcements" | "attendance" | "gallery" | "logos" | "security">("weeks");
  const [attendanceSubTab, setAttendanceSubTab] = useState<"kids" | "volunteers">("kids");
  const [selectedAdminAlbum, setSelectedAdminAlbum] = useState<string>("Tất cả");
  const [isFabOpen, setIsFabOpen] = useState(false);

  // Premium Delete Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    actionName: string;
    targetId: string | number;
    targetLabel: string;
    deleteType: "week" | "gift" | "announcement" | "attendance" | "volunteer" | "asset";
    confirmText: string;
  }>({
    isOpen: false,
    actionName: "",
    targetId: "",
    targetLabel: "",
    deleteType: "week",
    confirmText: ""
  });

  const checkDeletePermission = (actionName: string, targetName: string): boolean => {
    if (currentRole !== "Super Admin" && currentRole !== "Admin") {
      alert(`⚠️ CHẶN TRUY CẬP: Bạn đang ở vai trò '${currentRole}'. Chỉ quản trị viên (Admin/Super Admin) mới có thẩm quyền xóa dữ liệu đồng bộ hệ thống!`);
      addSystemLog("Ngăn Chặn Truy Cập", `Từ chối xóa trái phép [${actionName}] cho mục '${targetName}' do thiếu quyền hạn (Vai trò hiện tại: ${currentRole}).`, true);
      return false;
    }
    return true;
  };

  const handleSystemInitializeReset = () => {
    if (currentRole !== "Super Admin" && currentRole !== "Admin") {
      alert("⚠️ CHẶN TRUY CẬP: Chỉ Super Admin hoặc Admin mới có quyền thực hiện khôi phục hệ thống và xóa toàn bộ nội dung!");
      addSystemLog("Từ chối Khôi phục", "Cố gắng xóa toàn bộ cơ sở dữ liệu bị từ chối do thiếu quyền hạn.", true);
      return;
    }

    if (!confirm("🚨 CẢNH BÁO NGUY HIỂM: Bạn đang thực hiện hành động 'XÓA TOÀN BỘ NỘI DUNG' để biến ứng dụng này thành PHẦN MỀM CHÍNH THỨC.\n\nHành động này sẽ XÓA VĨNH VIỄN toàn bộ danh sách điểm danh, đăng ký thiếu nhi, thông tin phụ trách đồng hành, quà tặng, thông báo và tệp lưu trữ phương tiện trên hệ thống.\n\nBạn có CHẮC CHẮN muốn tiếp tục?")) {
      return;
    }

    if (!confirm("🚨 XÁC NHẬN LẦN HAI (CRITICAL CONFIRMATION):\nTất cả dữ liệu thử nghiệm sẽ bị hủy và KHÔNG THỂ KHÔI PHỤC. Toàn bộ thiết bị kết nối sẽ đồng bộ trạng thái trống rỗng mới ngay lập tức. Xác nhận thực hiện?")) {
      return;
    }

    // Perform deletions
    setAttendance([]);
    if (setVolunteers) setVolunteers([]);
    setStoredAssets([]);
    setAnnouncements([]);
    setGifts([]);
    setCustomLogo("");

    alert("🎉 Khởi tạo hệ thống thành công! Toàn bộ nội dung thử nghiệm đã được dọn sạch hoàn toàn. Ứng dụng đã sẵn sàng trở thành PHẦN MỀM CHÍNH THỨC của Cụm hoạt động!");
    addSystemLog("KHỞI TẠO TOÀN DIỆN", "Đã dọn sạch toàn bộ cơ sở dữ liệu (Điểm danh, Phụ trách, Quà tặng, Thông báo, Logo tùy chỉnh) và chuyển giao sang phần mềm chính thức.");
  };

  const triggerCreateWeekMobile = () => {
    setActiveTab("weeks");
    setEditingWeekId(null);
    setWeekForm({
      weekNumber: weeks.length + 1,
      theme: "",
      date: "",
      time: "",
      location: "",
      mapsLink: "",
      description: "",
      objectives: [],
      games: [],
      activities: [],
      coverImage: "https://images.unsplash.com/photo-1544717202-bde6a155502c?auto=format&fit=crop&w=1200&q=80",
      videoUrl: "",
      lessonUrl: "",
      solidarityQuarter: "Khu phố 10"
    });
    setTimeout(() => {
      const el = document.querySelector("form");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 150);
  };

  const triggerPostAnnouncementMobile = () => {
    setActiveTab("announcements");
    setTimeout(() => {
      const inputEl = document.querySelector('input[placeholder*="Nhập dòng tin chạy chữ"]');
      if (inputEl) {
        (inputEl as HTMLInputElement).focus();
        inputEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 150);
  };

  // Logo customization state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [logoSrc, setLogoSrc] = useState<string>("");
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);

  const logoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const logoImageRef = useRef<HTMLImageElement | null>(null);

  // Dynamic live canvas update for previewing custom 1096x391 logo banner
  useEffect(() => {
    if (!logoSrc) return;
    
    const canvas = logoCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.clearRect(0, 0, 1096, 391);
      ctx.save();
      
      // Draw rectangular clipping of 1096x391 size
      ctx.beginPath();
      ctx.rect(0, 0, 1096, 391);
      ctx.clip();
      
      // Center position coordinates
      ctx.translate(1096 / 2 + offsetX, 391 / 2 + offsetY);
      ctx.rotate((rotation * Math.PI) / 180);
      
      // Scale calculation
      const imgWidth = img.width;
      const imgHeight = img.height;
      const renderRatio = Math.max(1096 / imgWidth, 391 / imgHeight);
      const drawW = imgWidth * renderRatio * scale;
      const drawH = imgHeight * renderRatio * scale;
      
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
      
      // High-contrast gold rim border representing 1096x391 region
      ctx.strokeStyle = "#EAB308";
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, 1096, 391);
    };
    img.src = logoSrc;
    logoImageRef.current = img;
  }, [logoSrc, scale, rotation, offsetX, offsetY]);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setLogoSrc(event.target.result as string);
          setScale(1.0);
          setRotation(0);
          setOffsetX(0);
          setOffsetY(0);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const saveCroppedLogo = async () => {
    const canvas = logoCanvasRef.current;
    if (canvas) {
      try {
        const croppedBase64 = canvas.toDataURL("image/png");
        const fileUrl = await uploadBase64ToServer(croppedBase64, "logo.png");
        setCustomLogo(fileUrl);
        alert("Đã cập nhật & đồng bộ hóa Cụm Logo Nhận Diện toàn hệ thống!");
        addSystemLog("Cập nhật Logo Cụm", `Đã thành công cập nhật Logo cụm tại đường dẫn thực tế: ${fileUrl}`);
        setLogoSrc("");
        setSelectedFile(null);
      } catch (err: any) {
        alert("Lỗi tải logo lên máy chủ: " + err.message);
      }
    }
  };

  // Media Vault States & Handlers
  const [copiedAssetId, setCopiedAssetId] = useState<string | null>(null);
  const [uploadAssetName, setUploadAssetName] = useState("");
  const [uploadAssetType, setUploadAssetType] = useState<"image" | "video">("image");
  const [uploadCustomUrl, setUploadCustomUrl] = useState("");
  const [uploadAssetAlbum, setUploadAssetAlbum] = useState("Vui chơi hè");
  const [customAlbumName, setCustomAlbumName] = useState("");
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressProgress, setCompressProgress] = useState<CompressProgress | null>(null);

  const handleAssetFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!uploadAssetName.trim()) {
      const cleanName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setUploadAssetName(cleanName);
    }

    setIsCompressing(true);
    setCompressProgress(null);

    try {
      // Direct physical upload to Express backend
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });
      const data = await uploadRes.json();
      if (data.success && data.url) {
        setUploadCustomUrl(data.url);
        setCompressProgress({
          originalSize: file.size,
          compressedSize: file.size,
          percentageSaved: 0
        });
      } else {
        throw new Error(data.error || "Tải hình ảnh lên máy chủ thất bại");
      }
    } catch (err) {
      console.warn("Client compression fallback used due to error loading file:", err);
      try {
        if (uploadAssetType === "image") {
          const res = await compressImageFile(file, 0.70, 1100);
          setUploadCustomUrl(res.result);
          setCompressProgress(res.progress);
        } else {
          const res = await optimizeVideoFile(file);
          setUploadCustomUrl(res.result);
          setCompressProgress(res.progress);
        }
      } catch (err2) {
        console.error("Client fallback error:", err2);
      }
    } finally {
      setIsCompressing(false);
    }
  };

  const saveAssetToVault = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentRole === "Guest") {
      alert("⚠️ CHẶN TRUY CẬP: Bạn đang ở vai trò 'Guest'. Khách truy cập không được phép tải lên hoặc lưu trữ tài nguyên hệ thống!");
      addSystemLog("Ngăn Chặn Truy Cập", "Từ chối tải lên tài nguyên phương tiện mới từ vai trò 'Guest'.", true);
      return;
    }
    if (!uploadCustomUrl.trim()) {
      alert("Vui lòng chọn tài nguyên ảnh/video cần tải lên!");
      return;
    }

    const assetNameText = uploadAssetName.trim() || `Tài nguyên ${storedAssets.length + 1}`;
    const selectedAlbum = uploadAssetAlbum === "Khác" ? (customAlbumName.trim() || "Chung") : uploadAssetAlbum;
    
    const newAsset: StoredAsset = {
      id: `asset-${Date.now()}`,
      name: assetNameText,
      url: uploadCustomUrl.trim(),
      type: uploadAssetType,
      timestamp: new Date().toISOString(),
      album: selectedAlbum
    };

    setStoredAssets(prev => [newAsset, ...prev]);
    addSystemLog("Tải lên tài nguyên", `Tải lên thành công và nén tự động lưu trữ tệp: '${assetNameText}' trong album '${selectedAlbum}'.`);
    alert(`Đã nén tối ưu & đồng bộ tài nguyên lên Album "${selectedAlbum}" thành công!`);

    // Reset Form
    setUploadAssetName("");
    setUploadCustomUrl("");
    setCustomAlbumName("");
    setCompressProgress(null);
    const fileInput = document.getElementById("asset-file-uploader") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const deleteAssetFromVault = (id: string) => {
    const asset = storedAssets.find(a => a.id === id);
    const assetName = asset ? asset.name : "Tài nguyên không hợp lệ";
    if (!checkDeletePermission("Xóa Tài nguyên", assetName)) return;
    setDeleteModal({
      isOpen: true,
      actionName: "Xóa Tài nguyên Phương tiện",
      targetId: id,
      targetLabel: assetName,
      deleteType: "asset",
      confirmText: ""
    });
  };

  const copyAssetUrl = (asset: StoredAsset) => {
    navigator.clipboard.writeText(asset.url).then(() => {
      setCopiedAssetId(asset.id);
      setTimeout(() => setCopiedAssetId(null), 2500);
    }).catch(() => {
      alert("Sao chép thủ công liên kết: " + asset.url);
    });
  };

  // Form states - Weeks
  const [editingWeekId, setEditingWeekId] = useState<number | null>(null);
  const [weekForm, setWeekForm] = useState<Partial<WeekActivity>>({
    weekNumber: 1,
    theme: "",
    date: "",
    time: "",
    location: "",
    mapsLink: "",
    description: "",
    objectives: [],
    games: [],
    activities: [],
    coverImage: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    videoUrl: ""
  });
  const [tempObjective, setTempObjective] = useState("");
  const [tempGame, setTempGame] = useState("");
  const [tempActivity, setTempActivity] = useState("");

  // Form states - Gifts
  const [editingGiftId, setEditingGiftId] = useState<string | null>(null);
  const [giftForm, setGiftForm] = useState<Partial<Gift>>({
    name: "",
    category: "points",
    reqAttendances: 3,
    icon: "🎁",
    description: "",
    countLeft: 10
  });

  // Form states - Announcements
  const [newAnnouncement, setNewAnnouncement] = useState("");

  // Form states - Add custom simulated image
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImageWeek, setNewImageWeek] = useState<number>(1);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const isOfficialCredential = (emailInput.trim() === "CHĐS2@068205000072" && passcode.trim() === "CHĐS2@068205000072");
    const isFallbackCredential = ((emailInput.toLowerCase() === developerEmail.toLowerCase() || emailInput === "admin") && (passcode === "2026" || passcode === "admin"));
    
    if (isOfficialCredential || isFallbackCredential) {
      setIsLoggedIn(true);
      setErrorMsg("");
      // Automatically elevate logged in session to Super Admin role for real-production operations
      setCurrentRole("Super Admin");
      addSystemLog("Đăng Nhập Quản Trị", `Tài khoản ${emailInput} đăng nhập thành công với quyền hạn Super Admin.`);
    } else {
      setErrorMsg("Tên đăng nhập hoặc mật khẩu bảo mật chưa chính xác!");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setPasscode("");
  };

  // Week operations
  const saveWeek = (e: React.FormEvent) => {
    e.preventDefault();
    if (!weekForm.theme || !weekForm.date) {
      alert("Vui lòng điền tiêu đề chủ đề và ngày của tuần sinh hoạt.");
      return;
    }

    if (editingWeekId !== null) {
      setWeeks(prev => prev.map(w => w.id === editingWeekId ? { ...w, ...weekForm as WeekActivity } : w));
      alert("Đã cập nhật chi tiết tuần sinh hoạt hè!");
    } else {
      const nextId = weeks.length > 0 ? Math.max(...weeks.map(w => w.id)) + 1 : 1;
      const nextNum = weeks.length > 0 ? Math.max(...weeks.map(w => w.weekNumber)) + 1 : 1;
      const newWeekRecord: WeekActivity = {
        id: nextId,
        weekNumber: nextNum,
        theme: weekForm.theme || "Chủ đề mới",
        date: weekForm.date || "14/06/2026",
        time: weekForm.time || "08:00 - 10:00",
        location: weekForm.location || "Địa điểm sinh hoạt hè KP Cụm 2",
        mapsLink: weekForm.mapsLink || "https://maps.google.com",
        description: weekForm.description || "Mô tả hoạt động chi tiết",
        objectives: weekForm.objectives || [],
        games: weekForm.games || [],
        activities: weekForm.activities || [],
        coverImage: weekForm.coverImage || "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
        videoUrl: weekForm.videoUrl || "",
        images: [],
        lessonUrl: weekForm.lessonUrl || "",
        solidarityQuarter: weekForm.solidarityQuarter || "Khu phố 10"
      };
      setWeeks(prev => [...prev, newWeekRecord]);
      alert("Đã thêm tuần sinh hoạt hè mới thành công!");
    }

    // Reset Form
    setEditingWeekId(null);
    setWeekForm({
      weekNumber: weeks.length + 1,
      theme: "",
      date: "",
      time: "",
      location: "",
      mapsLink: "",
      description: "",
      objectives: [],
      games: [],
      activities: [],
      coverImage: "https://images.unsplash.com/photo-1544717202-bde6a155502c?auto=format&fit=crop&w=1200&q=80",
      videoUrl: "",
      lessonUrl: "",
      solidarityQuarter: "Khu phố 10"
    });
  };

  const startEditWeek = (w: WeekActivity) => {
    setEditingWeekId(w.id);
    setWeekForm(w);
  };

  const deleteWeek = (id: number) => {
    const week = weeks.find(w => w.id === id);
    if (!week) return;
    const weekTitle = `Tuần ${week.weekNumber}: ${week.theme || week.title}`;
    if (!checkDeletePermission("Xóa Tuần Hoạt Động", weekTitle)) return;
    setDeleteModal({
      isOpen: true,
      actionName: "Xóa Tuần Hoạt Động",
      targetId: id,
      targetLabel: weekTitle,
      deleteType: "week",
      confirmText: ""
    });
  };

  const addObjective = () => {
    if (tempObjective.trim()) {
      setWeekForm(prev => ({
        ...prev,
        objectives: [...(prev.objectives || []), tempObjective.trim()]
      }));
      setTempObjective("");
    }
  };

  const addGame = () => {
    if (tempGame.trim()) {
      setWeekForm(prev => ({
        ...prev,
        games: [...(prev.games || []), tempGame.trim()]
      }));
      setTempGame("");
    }
  };

  const addActivity = () => {
    if (tempActivity.trim()) {
      setWeekForm(prev => ({
        ...prev,
        activities: [...(prev.activities || []), tempActivity.trim()]
      }));
      setTempActivity("");
    }
  };

  // Gift operations
  const saveGift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!giftForm.name) return;

    if (editingGiftId) {
      setGifts(prev => prev.map(g => g.id === editingGiftId ? { ...g, ...giftForm as Gift } : g));
      alert("Đã cập nhật quà tặng!");
      setEditingGiftId(null);
    } else {
      const newG: Gift = {
        id: "gift-" + Date.now(),
        name: giftForm.name || "Quà mới",
        category: giftForm.category || "points",
        reqAttendances: giftForm.reqAttendances || 3,
        icon: giftForm.icon || "🎁",
        description: giftForm.description || "Chi tiết phần thưởng",
        countLeft: giftForm.countLeft || 10,
        image: giftForm.image
      };
      setGifts(prev => [...prev, newG]);
      alert("Đã thêm quà tặng mới!");
    }

    setGiftForm({
      name: "",
      category: "points",
      reqAttendances: 3,
      icon: "🎁",
      description: "",
      countLeft: 10,
      image: ""
    });
  };

  const handleGiftImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });
        const data = await res.json();
        if (data.success && data.url) {
          setGiftForm(prev => ({
            ...prev,
            image: data.url
          }));
        } else {
          throw new Error();
        }
      } catch (err) {
        console.warn("Lỗi tải lên máy chủ, lùi về lưu trữ base64 cục bộ:", err);
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setGiftForm(prev => ({
              ...prev,
              image: event.target.result as string
            }));
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const deleteGift = (id: string) => {
    const gift = gifts.find(g => g.id === id);
    const giftName = gift ? gift.name : "Quà tặng không tên";
    if (!checkDeletePermission("Xóa Quà Tặng", giftName)) return;
    setDeleteModal({
      isOpen: true,
      actionName: "Xóa Quà Tặng Tích Lũy",
      targetId: id,
      targetLabel: giftName,
      deleteType: "gift",
      confirmText: ""
    });
  };

  // Announcement operations
  const addAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncement.trim()) return;
    const item: Announcement = {
      id: "ann-" + Date.now(),
      text: newAnnouncement.trim(),
      isActive: true
    };
    setAnnouncements(prev => [item, ...prev]);
    setNewAnnouncement("");
    alert("Bộ phận Quản lý đã phát sóng thông báo mới chạy chữ!");
  };

  const toggleAnnouncement = (id: string) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a));
  };

  const deleteAnnouncement = (id: string) => {
    const ann = announcements.find(a => a.id === id);
    const annText = ann ? (ann.text.substring(0, 30) + "...") : "Thông báo không rõ";
    if (!checkDeletePermission("Xóa Thông Báo", annText)) return;
    setDeleteModal({
      isOpen: true,
      actionName: "Xóa Bản Tin Thông Báo",
      targetId: id,
      targetLabel: annText,
      deleteType: "announcement",
      confirmText: ""
    });
  };

  // Attendance/Registration operations
  const removeAttendance = (id: string) => {
    const req = attendance.find(a => a.id === id);
    const nominee = req ? req.studentName : "Thiếu nhi tuyển sinh";
    if (!checkDeletePermission("Xóa Phiếu Thiếu Nhi", nominee)) return;
    setDeleteModal({
      isOpen: true,
      actionName: "Xóa Phiếu Ghi Danh Thiếu Nhi",
      targetId: id,
      targetLabel: nominee,
      deleteType: "attendance",
      confirmText: ""
    });
  };

  // Volunteer operations
  const removeVolunteer = (id: string) => {
    const v = volunteers.find(x => x.id === id);
    const vName = v ? v.fullName : "Phụ trách hè";
    if (!checkDeletePermission("Xóa Đoàn Viên Phụ Trách", vName)) return;
    setDeleteModal({
      isOpen: true,
      actionName: "Xóa Đoàn Viên Phụ Trách",
      targetId: id,
      targetLabel: vName,
      deleteType: "volunteer",
      confirmText: ""
    });
  };

  const executeDeletion = () => {
    const { targetId, targetLabel, deleteType } = deleteModal;
    
    // Safety check role once again
    if (currentRole !== "Super Admin" && currentRole !== "Admin") {
      alert("⚠️ Lỗi phân quyền: Bạn không có quyền thực hiện hành động này!");
      setDeleteModal(prev => ({ ...prev, isOpen: false }));
      return;
    }

    switch (deleteType) {
      case "asset": {
        setStoredAssets(prev => prev.filter(a => a.id !== targetId));
        addSystemLog("Xóa tài nguyên", `Đồng bộ loại bỏ tệp tin phương tiện: '${targetLabel}' thành công.`);
        break;
      }
      case "week": {
        const week = weeks.find(w => w.id === targetId);
        if (week) {
          const weekNum = week.weekNumber;
          // Remove week from weeks list
          setWeeks(prev => prev.filter(w => w.id !== targetId));
          // Clean student attendance records system-wide
          setAttendance(prev => prev.map(rec => ({
            ...rec,
            weeksAttended: rec.weeksAttended.filter(num => num !== weekNum)
          })));
          // Clean volunteer companion records system-wide
          if (setVolunteers) {
            setVolunteers(prev => prev.map(v => ({
              ...v,
              weeksAttended: v.weeksAttended.filter(num => num !== weekNum)
            })));
          }
          addSystemLog("Xóa đồng bộ", `Đã xóa tuần hoạt động và lịch sự kiện: '${targetLabel}' khỏi hệ thống đồng bộ toàn diện.`);
        }
        break;
      }
      case "gift": {
        setGifts(prev => prev.filter(g => g.id !== targetId));
        addSystemLog("Xóa đồng bộ", `Đã xóa phần quà tích điểm: '${targetLabel}' ra khỏi danh sách.`);
        break;
      }
      case "announcement": {
        setAnnouncements(prev => prev.filter(a => a.id !== targetId));
        addSystemLog("Xóa đồng bộ", `Đã xóa dòng truyền thông chạy chữ: '${targetLabel}' thành công.`);
        break;
      }
      case "attendance": {
        setAttendance(prev => prev.filter(a => a.id !== targetId));
        addSystemLog("Xóa đồng bộ", `Đã gỡ bỏ phiếu đăng ký chính thức của thiếu nhi: '${targetLabel}' khỏi cơ sở dữ liệu.`);
        break;
      }
      case "volunteer": {
        if (setVolunteers) {
          setVolunteers(prev => prev.filter(x => x.id !== targetId));
          addSystemLog("Xóa đồng bộ", `Đã loại bỏ đơn đăng ký đồng hành hè của Phụ trách viên: '${targetLabel}' thành công.`);
        }
        break;
      }
      default:
        break;
    }

    // Reset delete confirmation modal
    setDeleteModal({
      isOpen: false,
      actionName: "",
      targetId: "",
      targetLabel: "",
      deleteType: "week",
      confirmText: ""
    });

    alert(`🎉 Đồng bộ và cập nhật hệ thống thành công: Đã xóa mục "${targetLabel}" vĩnh viễn.`);
  };

  // Gallery simulation image additions
  const handleAddImageToWeek = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImageUrl.trim()) return;
    
    setWeeks(prev => prev.map(w => {
      if (w.weekNumber === newImageWeek) {
        return {
          ...w,
          images: [newImageUrl.trim(), ...w.images]
        };
      }
      return w;
    }));

    setNewImageUrl("");
    alert(`Đã đăng tải một ảnh mới vào thư viện của Tuần ${newImageWeek}!`);
  };

  // Metrics computation for administrative insight card
  const totalKids = attendance.length;
  const uniqueQuarters = Array.from(new Set(attendance.map(a => a.quarter))).length;
  const totalAdmissions = attendance.reduce((acc, curr) => acc + curr.weeksAttended.length, 0);

  if (!isLoggedIn) {
    return (
      <div className="w-full max-w-lg mx-auto py-12 px-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle neon gradients */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full"></div>

          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/5 animate-pulse">
              <KeyRound className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">Xác Thực Quản Trị Viên</h3>
            <p className="text-xs text-slate-400 text-center mt-1">Đoàn Thanh niên Phường Tân Hưng - Cụm hoạt động số 2</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Tên Đăng Nhập / Email</label>
              <input 
                type="text" 
                placeholder="ngsoanng@gmail.com hoặc 'admin'"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white placeholder-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all font-sans"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Mật Mã An Toàn (2026)</label>
              <input 
                type="password" 
                placeholder="Nhập mã bảo mật (gợi ý: 2026)"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white placeholder-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all font-sans"
                required
              />
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 bg-red-950/40 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="font-medium">{errorMsg}</p>
              </div>
            )}

            <button 
              type="submit"
              className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-xl hover:shadow-blue-500/10 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Đăng Nhập Hệ Thống
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800 text-center text-[11px] text-slate-500 leading-normal">
            Hệ thống quản lý thời gian thực sinh hoạt hè, cập nhật trực tiếp máy chủ và trạng thái cục bộ của thiết bị. Thẩm quyền thuộc Đoàn Phường.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-950 border border-slate-800 rounded-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden font-sans text-white">
      {/* Background Gradients */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 blur-3xl rounded-full"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-500/5 blur-3xl rounded-full"></div>

      {/* Admin Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-800 relative z-10">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="bg-orange-500/10 text-orange-400 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-orange-500/20">
              TRANG QUẢN TRỊ ADMIN
            </span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mt-1">Cơ Sở Dữ Liệu Sinh Hoạt Hè</h2>
          <p className="text-xs text-slate-400 mt-0.5">Xử lý toàn diện nội dung, xuất danh sách, điều phối tuần năng động.</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 max-w-[200px] truncate" title={developerEmail}>
            👤 {developerEmail}
          </span>
          <button 
            onClick={handleLogout}
            className="bg-red-950/50 hover:bg-red-900/40 border border-red-500/20 text-red-300 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 hover:scale-105 active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Metrics Analytics Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-6 relative z-10">
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
          <span className="text-slate-400 text-[11px] font-semibold tracking-wider block uppercase">Tổng Số Tuần Sinh Hoạt</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold tracking-tight text-sky-400">{weeks.length}</span>
            <span className="text-xs text-slate-500">Chương trình hè</span>
          </div>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
          <span className="text-slate-400 text-[11px] font-semibold tracking-wider block uppercase">Thiếu Nhi Thu Hút</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold tracking-tight text-emerald-400">{totalKids}</span>
            <span className="text-xs text-slate-500">Em đăng ký</span>
          </div>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
          <span className="text-slate-400 text-[11px] font-semibold tracking-wider block uppercase">Tổng Lượt Đăng Ký</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold tracking-tight text-yellow-400">{totalAdmissions}</span>
            <span className="text-xs text-slate-500">Lượt tham gia</span>
          </div>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
          <span className="text-slate-400 text-[11px] font-semibold tracking-wider block uppercase">Khu Phố Đoàn Kết</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold tracking-tight text-orange-400">{uniqueQuarters} / 10</span>
            <span className="text-xs text-slate-500">KP tham dự</span>
          </div>
        </div>
      </div>

      {/* Recharts Live Visual Charts (Weeks & Quarters stats) */}
      <AdminChart weeks={weeks} attendance={attendance} />

      {/* Navigation Sub-Tabs */}
      <div className="flex gap-2 p-1 bg-slate-900 rounded-xl mb-6 relative z-10 border border-slate-800 overflow-x-auto select-none">
        <button 
          type="button"
          onClick={() => setActiveTab("weeks")}
          className={`flex-1 shrink-0 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === "weeks" ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
        >
          <Calendar className="w-4 h-4" />
          Tuần & Lịch Sinh Hoạt
        </button>

        <button 
          type="button"
          onClick={() => setActiveTab("gifts")}
          className={`flex-1 shrink-0 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === "gifts" ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
        >
          <Award className="w-4 h-4" />
          Quà Tặng
        </button>

        <button 
          type="button"
          onClick={() => setActiveTab("announcements")}
          className={`flex-1 shrink-0 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === "announcements" ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
        >
          <Bell className="w-4 h-4" />
          Thông báo chạy chữ
        </button>

        <button 
          type="button"
          onClick={() => setActiveTab("attendance")}
          className={`flex-1 shrink-0 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === "attendance" ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
        >
          <Users className="w-4 h-4" />
          Bảng Đăng Ký ({totalKids})
        </button>

        <button 
          type="button"
          onClick={() => setActiveTab("gallery")}
          className={`flex-1 shrink-0 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === "gallery" ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
        >
          <Image className="w-4 h-4" />
          Đăng Ảnh Phòng Tranh
        </button>

        <button 
          type="button"
          onClick={() => setActiveTab("logos")}
          className={`flex-1 shrink-0 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === "logos" ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
        >
          <Settings className="w-4 h-4 text-orange-400 animate-spin" style={{ animationDuration: "12s" }} />
          <span>Đồng Bộ Logos</span>
        </button>

        <button 
          type="button"
          onClick={() => setActiveTab("security")}
          className={`flex-1 shrink-0 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === "security" ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
        >
          <Shield className="w-4 h-4 text-rose-400 animate-pulse" />
          <span>Bảo mật & Logs</span>
        </button>
      </div>

      {/* Detailed Tab Content panels */}
      <div className="relative z-10">
        
        {/* TAB 1: MANAGE WEEKS */}
        {activeTab === "weeks" && (
          <div className="space-y-8 animate-fade-in">
            {/* Form to Create/Edit */}
            <form onSubmit={saveWeek} className="bg-slate-900/45 p-5 md:p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-sky-400 flex items-center gap-2">
                <Edit3 className="w-5 h-5" />
                {editingWeekId ? `Chỉnh sửa: Tuần ${weekForm.weekNumber}` : "Thêm Mới / Thiết Kế Tuần Mới"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Chủ Đề (Theme)</label>
                  <input 
                    type="text"
                    required
                    placeholder="Ví dụ: Em yêu Khoa học"
                    value={weekForm.theme || ""}
                    onChange={(e) => setWeekForm(prev => ({ ...prev, theme: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Thời Gian Tổ Chức</label>
                  <input 
                    type="text"
                    placeholder="Ví dụ: 08:00 - 10:00"
                    value={weekForm.time || ""}
                    onChange={(e) => setWeekForm(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Ngày Sinh Hoạt (DD/MM/YYYY)</label>
                  <input 
                    type="text"
                    required
                    placeholder="Ví dụ: 14/06/2026"
                    value={weekForm.date || ""}
                    onChange={(e) => setWeekForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Địa Điểm Tổ Chức</label>
                  <input 
                    type="text"
                    placeholder="Ví dụ: Điểm sinh hoạt Cụm 2"
                    value={weekForm.location || ""}
                    onChange={(e) => setWeekForm(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-sans"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Link Bản Đồ Google Maps (Prefilled cho đường đi)</label>
                  <input 
                    type="text"
                    placeholder="Nhập đường dẫn chỉ đường Google Maps"
                    value={weekForm.mapsLink || ""}
                    onChange={(e) => setWeekForm(prev => ({ ...prev, mapsLink: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-sans"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-amber-400 mb-1">📖 Link Tài liệu / Giáo án Bài học Tuần (Đồng bộ hệ thống)</label>
                  <input 
                    type="text"
                    placeholder="Nhập URL tài liệu bài giảng, Slide PowerPoint, Google Drive..."
                    value={weekForm.lessonUrl || ""}
                    onChange={(e) => setWeekForm(prev => ({ ...prev, lessonUrl: e.target.value }))}
                    className="w-full bg-slate-950 border border-amber-950 border-dashed rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-sans"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Gia sư, phụ huynh và thiếu nhi nhấp thẳng vào nút chuẩn bị bài học của tuần ở trang chủ để xem học trình.</p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-emerald-400 mb-1">🤝 Khu Phố Đoàn Kết Phụ Trách Hành Trình Hè</label>
                  <select 
                    value={weekForm.solidarityQuarter || "Khu phố 10"}
                    onChange={(e) => setWeekForm(prev => ({ ...prev, solidarityQuarter: e.target.value }))}
                    className="w-full bg-slate-950 border border-emerald-950/40 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-sans"
                  >
                    {Array.from({ length: 9 }, (_, i) => `Khu phố ${i + 10}`).map(q => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Đơn vị Khu phố nòng cốt chủ trì tổ chức buổi sinh hoạt hè cho tuần tương ứng.</p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Mô Tả Sinh Hoạt Đậm Chất Khát Vọng Gia Giáo</label>
                  <textarea 
                    rows={2}
                    placeholder="Ghi ngắn gọn mục tiêu giáo dục tuần..."
                    value={weekForm.description || ""}
                    onChange={(e) => setWeekForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-sans"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1 font-sans">Đường dẫn Ảnh Bìa (Cover Image URL)</label>
                  <input 
                    type="text"
                    placeholder="Ví dụ: https://images.unsplash.com/photo-..."
                    value={weekForm.coverImage || ""}
                    onChange={(e) => setWeekForm(prev => ({ ...prev, coverImage: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-sans"
                  />
                  <div className="mt-1.5 flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-sans">Hoặc tải ảnh trực tiếp từ thiết bị:</span>
                    <input 
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const formData = new FormData();
                            formData.append("file", file);
                            const res = await fetch("/api/upload", {
                              method: "POST",
                              body: formData
                            });
                            const data = await res.json();
                            if (data.success && data.url) {
                              setWeekForm(prev => ({ ...prev, coverImage: data.url }));
                              const newAsset: StoredAsset = {
                                id: `asset-img-${Date.now()}`,
                                name: `Bìa Tuần ${weekForm.weekNumber || 1} - ${file.name}`,
                                url: data.url,
                                type: "image",
                                timestamp: new Date().toISOString()
                              };
                              setStoredAssets(prev => [newAsset, ...prev]);
                            } else {
                              throw new Error();
                            }
                          } catch (err) {
                            console.warn("Lỗi tải lên máy chủ, lùi về base64 cục bộ:", err);
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                const base64Url = event.target.result as string;
                                setWeekForm(prev => ({ ...prev, coverImage: base64Url }));
                                const newAsset: StoredAsset = {
                                  id: `asset-img-${Date.now()}`,
                                  name: `Bìa Tuần ${weekForm.weekNumber || 1} - ${file.name}`,
                                  url: base64Url,
                                  type: "image",
                                  timestamp: new Date().toISOString()
                                };
                                setStoredAssets(prev => [newAsset, ...prev]);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }
                      }}
                      className="text-[10px] text-slate-300 bg-slate-950 px-2 py-0.5 rounded cursor-pointer border border-slate-800 font-sans"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1 font-sans">Đường dẫn Video Nhắc Lịch (Recap Video Embed URL / File)</label>
                  <input 
                    type="text"
                    placeholder="Ví dụ: https://www.youtube.com/embed/YpXQpI2eH_g hoặc Base64 Video"
                    value={weekForm.videoUrl || ""}
                    onChange={(e) => setWeekForm(prev => ({ ...prev, videoUrl: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-sans"
                  />
                  <div className="mt-1.5 flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-sans">Hoặc tải video trực tiếp từ thiết bị:</span>
                    <input 
                      type="file"
                      accept="video/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const formData = new FormData();
                            formData.append("file", file);
                            const res = await fetch("/api/upload", {
                              method: "POST",
                              body: formData
                            });
                            const data = await res.json();
                            if (data.success && data.url) {
                              setWeekForm(prev => ({ ...prev, videoUrl: data.url }));
                              const newAsset: StoredAsset = {
                                id: `asset-vid-${Date.now()}`,
                                name: `Video Tuần ${weekForm.weekNumber || 1} - ${file.name}`,
                                url: data.url,
                                type: "video",
                                timestamp: new Date().toISOString()
                              };
                              setStoredAssets(prev => [newAsset, ...prev]);
                              alert("Đã tải video thành công lên máy chủ!");
                            } else {
                              throw new Error();
                            }
                          } catch (err) {
                            console.warn("Lỗi tải video lên máy chủ, lùi về base64 cục bộ:", err);
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                const base64Url = event.target.result as string;
                                setWeekForm(prev => ({ ...prev, videoUrl: base64Url }));
                                const newAsset: StoredAsset = {
                                  id: `asset-vid-${Date.now()}`,
                                  name: `Video Tuần ${weekForm.weekNumber || 1} - ${file.name}`,
                                  url: base64Url,
                                  type: "video",
                                  timestamp: new Date().toISOString()
                                };
                                setStoredAssets(prev => [newAsset, ...prev]);
                                alert("Đã mã hóa và lưu trữ tệp video vào nguồn hệ thống!");
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }
                      }}
                      className="text-[10px] text-slate-300 bg-slate-950 px-2 py-0.5 rounded cursor-pointer border border-slate-800 font-sans"
                    />
                  </div>
                </div>
              </div>

              {/* Incremental Bullet Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Mục Tiêu Giáo Dục (Objectives)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="Nhập và ấn + "
                      value={tempObjective}
                      onChange={(e) => setTempObjective(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                    <button type="button" onClick={addObjective} className="bg-sky-600 text-white p-1.5 rounded-lg text-xs font-bold"><Plus className="w-4 h-4" /></button>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {weekForm.objectives?.map((obj, i) => (
                      <li key={i} className="text-[11px] text-slate-300 flex items-center justify-between bg-slate-950 px-2 py-1 rounded">
                        <span className="truncate">{obj}</span>
                        <Trash2 
                          onClick={() => {
                            if (confirm(`Xác nhận xóa mục tiêu: "${obj}"?`)) {
                              setWeekForm(prev => ({ ...prev, objectives: prev.objectives?.filter((_, idx) => idx !== i) }));
                            }
                          }} 
                          className="w-3.5 h-3.5 text-red-400 cursor-pointer hover:text-red-300 ml-2" 
                        />
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Trò Chơi Chính (Games)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="Nhập và ấn + "
                      value={tempGame}
                      onChange={(e) => setTempGame(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                    <button type="button" onClick={addGame} className="bg-sky-600 text-white p-1.5 rounded-lg text-xs font-bold"><Plus className="w-4 h-4" /></button>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {weekForm.games?.map((g, i) => (
                      <li key={i} className="text-[11px] text-slate-300 flex items-center justify-between bg-slate-950 px-2 py-1 rounded">
                        <span className="truncate">{g}</span>
                        <Trash2 
                          onClick={() => {
                            if (confirm(`Xác nhận xóa trò chơi: "${g}"?`)) {
                              setWeekForm(prev => ({ ...prev, games: prev.games?.filter((_, idx) => idx !== i) }));
                            }
                          }} 
                          className="w-3.5 h-3.5 text-red-400 cursor-pointer hover:text-red-300 ml-2" 
                        />
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Hoạt Động / Trải nghiệm</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="Nhập và ấn + "
                      value={tempActivity}
                      onChange={(e) => setTempActivity(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                    <button type="button" onClick={addActivity} className="bg-sky-600 text-white p-1.5 rounded-lg text-xs font-bold"><Plus className="w-4 h-4" /></button>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {weekForm.activities?.map((act, i) => (
                      <li key={i} className="text-[11px] text-slate-300 flex items-center justify-between bg-slate-950 px-2 py-1 rounded">
                        <span className="truncate">{act}</span>
                        <Trash2 
                          onClick={() => {
                            if (confirm(`Xác nhận xóa hoạt động: "${act}"?`)) {
                              setWeekForm(prev => ({ ...prev, activities: prev.activities?.filter((_, idx) => idx !== i) }));
                            }
                          }} 
                          className="w-3.5 h-3.5 text-red-400 cursor-pointer hover:text-red-300 ml-2" 
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Confirm Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/60">
                {editingWeekId !== null && (
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingWeekId(null);
                      setWeekForm({
                        weekNumber: weeks.length + 1,
                        theme: "",
                        date: "",
                        time: "",
                        location: "",
                        mapsLink: "",
                        description: "",
                        objectives: [],
                        games: [],
                        activities: [],
                        coverImage: "https://images.unsplash.com/photo-1544717202-bde6a155502c?auto=format&fit=crop&w=1200&q=80"
                      });
                    }}
                    className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-700 select-none"
                  >
                    Ủy Thác Hủy
                  </button>
                )}
                <button 
                  type="submit"
                  className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs py-2 px-5 rounded-xl transition-all hover:scale-105"
                >
                  {editingWeekId !== null ? "💾 Cập Nhật Ngay" : "✨ Tạo Tuần Mới"}
                </button>
              </div>
            </form>

            {/* List of current Weeks */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Danh sách tuần hiện tại ({weeks.length})</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {weeks.map((w) => (
                  <div key={w.id} className="bg-slate-900 border border-slate-800/80 p-4 rounded-2xl flex justify-between items-start">
                    <div className="space-y-1.5 max-w-[70%]">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-blue-400">Tuần {w.weekNumber}</span>
                        <span className="text-[10px] bg-slate-850 px-2 py-0.5 rounded text-slate-400">{w.date}</span>
                      </div>
                      <h4 className="font-bold text-sm text-white line-clamp-1">{w.theme}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{w.description}</p>
                      <p className="text-[10px] text-amber-400 truncate">📍 {w.location}</p>
                    </div>

                    <div className="flex gap-1.5 shrink-0">
                      <button 
                        onClick={() => startEditWeek(w)}
                        className="p-2 bg-blue-950/40 hover:bg-blue-900/40 border border-blue-500/20 text-blue-300 rounded-xl transition-all"
                        title="Chỉnh sửa"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteWeek(w.id)}
                        className="p-2 bg-red-950/40 hover:bg-red-900/40 border border-red-500/20 text-red-400 rounded-xl transition-all"
                        title="Xóa tuần"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MANAGE GIFTS */}
        {activeTab === "gifts" && (
          <div className="space-y-8 animate-fade-in">
            {/* Gift Forms */}
            <form onSubmit={saveGift} className="bg-slate-900/45 p-5 md:p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-sky-400 flex items-center gap-2">
                <Edit3 className="w-5 h-5" />
                {editingGiftId ? `Sửa: ${giftForm.name}` : "Tạo Mới Phần Thưởng Tích Điểm"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tên Quà Tặng</label>
                  <input 
                    type="text"
                    required
                    placeholder="Ví dụ: Bình nước Đoàn Thanh Niên"
                    value={giftForm.name || ""}
                    onChange={(e) => setGiftForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Mã Icon Emoji</label>
                  <input 
                    type="text"
                    placeholder="Ví dụ: 🥤"
                    value={giftForm.icon || ""}
                    onChange={(e) => setGiftForm(prev => ({ ...prev, icon: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-blue-500 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Phân Loại Quà</label>
                  <select
                    value={giftForm.category}
                    onChange={(e) => setGiftForm(prev => ({ ...prev, category: e.target.value as any }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="weekly">Quà tặng theo tuần (Weekly)</option>
                    <option value="points">Quà tích lũy điểm (Points Threshold)</option>
                    <option value="special">Phần quà xuất sắc đặc biệt (Special)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Yêu Cầu Số Buổi Gặp Gỡ (Attendances) </label>
                  <input 
                    type="number"
                    min={1}
                    value={giftForm.reqAttendances || 3}
                    onChange={(e) => setGiftForm(prev => ({ ...prev, reqAttendances: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Hạn mức Số Lượng Quà còn lại</label>
                  <input 
                    type="number"
                    min={0}
                    value={giftForm.countLeft || 10}
                    onChange={(e) => setGiftForm(prev => ({ ...prev, countLeft: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-sans"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Chi tiết / Mô tả quà thưởng</label>
                  <textarea 
                    rows={2}
                    placeholder="Gợi ý: Bình nước in logo Phường Tân Hưng..."
                    value={giftForm.description || ""}
                    onChange={(e) => setGiftForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-3 border border-slate-800/80 bg-slate-950/40 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <span className="text-sky-400">🖼️</span> Tải Lên / Cập Nhật Hình Ảnh Quà Tặng
                    </span>
                    {giftForm.image && (
                      <button 
                        type="button" 
                        onClick={() => setGiftForm(prev => ({ ...prev, image: "" }))}
                        className="text-[10px] text-red-400 hover:text-red-300 font-bold bg-red-950/20 px-2 py-0.5 rounded border border-red-900/30 cursor-pointer"
                      >
                        Gỡ bỏ ảnh
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Cách 1: Chọn Tệp Ảnh Từ Bộ Nhớ Thiết Bị</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleGiftImageChange}
                        className="w-full text-xs text-slate-400 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 focus:outline-none file:mr-2.5 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-slate-800 file:text-white hover:file:bg-slate-700 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Cách 2: Nhập Đường Dẫn (URL) Ảnh Trực Tuyến</label>
                      <input 
                        type="text"
                        placeholder="https://images.unsplash.com/... hoặc dán link ảnh"
                        value={giftForm.image || ""}
                        onChange={(e) => setGiftForm(prev => ({ ...prev, image: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-sans"
                      />
                    </div>
                  </div>

                  {giftForm.image && (
                    <div className="pt-2 flex items-center gap-3">
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-800 bg-slate-900 shrink-0">
                        <img 
                          src={giftForm.image} 
                          alt="Preview quà" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-emerald-400">✓ Đã nạp thành công hình ảnh quà tặng!</div>
                        <div className="text-[10px] text-slate-500">Ảnh này sẽ hiển thị dưới dạng pop-up xem nhanh khi người dùng nhấp vào biểu tượng biểu trưng quà.</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                {editingGiftId && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setEditingGiftId(null);
                      setGiftForm({ name: "", category: "points", reqAttendances: 3, icon: "🎁", description: "", countLeft: 10, image: "" });
                    }}
                    className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                  >
                    Hủy sửa
                  </button>
                )}
                <button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs py-2 px-5 rounded-xl">
                  {editingGiftId ? "Cập Nhật Quà" : "Thêm Quà Mới"}
                </button>
              </div>
            </form>

            {/* List of current Gifts */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Danh Mục Quà Tải Lên ({gifts.length})</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gifts.map(g => (
                  <div key={g.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl" id={`gift-em-icon-${g.id}`}>{g.icon}</span>
                          {g.image && (
                            <img 
                              src={g.image} 
                              alt={g.name}
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 object-cover rounded-lg border border-slate-700"
                            />
                          )}
                        </div>
                        <span className="text-[10px] bg-slate-800 text-amber-400 font-bold px-2 py-0.5 rounded-full border border-slate-700">
                          {g.reqAttendances} buổi tham gia
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-white mt-2 line-clamp-1">{g.name}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">{g.description}</p>
                      <div className="mt-2 text-[10px] text-slate-500">
                        Còn lại: <span className="text-emerald-400 font-bold">{g.countLeft}</span> sản phẩm
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-800/60">
                      <button 
                        onClick={() => { setEditingGiftId(g.id); setGiftForm(g); }}
                        className="p-1.5 bg-blue-950/30 hover:bg-blue-900/40 text-blue-300 rounded-lg text-xs"
                      >
                        Sửa
                      </button>
                      <button 
                        onClick={() => deleteGift(g.id)}
                        className="p-1.5 bg-red-950/30 hover:bg-red-900/40 text-red-400 rounded-lg text-xs"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MANAGE ANNOUNCEMENTS */}
        {activeTab === "announcements" && (
          <div className="space-y-6 animate-fade-in">
            <form onSubmit={addAnnouncement} className="bg-slate-900/45 p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-sky-400 flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Đăng ký bản tin chạy chữ trực quan (Marquee)
              </h3>
              
              <div className="flex flex-col md:flex-row gap-3">
                <input 
                  type="text" 
                  required
                  placeholder="Nhập dòng tin chạy chữ. Ví dụ: 🔔 Sân chơi tên lửa nước hấp dẫn sáng mai nhé!"
                  value={newAnnouncement}
                  onChange={(e) => setNewAnnouncement(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white"
                />
                <button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-6 py-3 rounded-xl shrink-0">
                  Phát Sóng Ngay
                </button>
              </div>
            </form>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">Lịch Sử & Bật Tắt Bản Tin</h4>
              <div className="divide-y divide-slate-800 space-y-3">
                {announcements.map((a, idx) => (
                  <div key={a.id} className="pt-3 first:pt-0 flex items-center justify-between gap-4">
                    <p className={`text-xs ${a.isActive ? "text-slate-200" : "text-slate-600 line-through"}`}>
                      {idx + 1}. {a.text}
                    </p>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => toggleAnnouncement(a.id)}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold ${a.isActive ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30" : "bg-slate-800 text-slate-500"}`}
                      >
                        {a.isActive ? "ĐANG HIỆN" : "ẨN TIN"}
                      </button>
                      <button 
                        onClick={() => deleteAnnouncement(a.id)}
                        className="p-1.5 bg-red-950/40 hover:bg-red-900/40 text-red-400 rounded transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ENTIRE ATTENDANCE REGISTER */}
        {activeTab === "attendance" && (
          <div className="space-y-6 animate-fade-in">
            {/* Sub-tab switcher */}
            <div className="flex gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800 self-start max-w-sm mb-2 text-xs font-bold font-sans">
              <button
                type="button"
                onClick={() => setAttendanceSubTab("kids")}
                className={`flex-1 py-1.5 px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap ${attendanceSubTab === "kids" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
              >
                🧒 Thiếu Nhi Đăng Ký ({attendance.length})
              </button>
              <button
                type="button"
                onClick={() => setAttendanceSubTab("volunteers")}
                className={`flex-1 py-1.5 px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap ${attendanceSubTab === "volunteers" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
              >
                ✊ Phụ Trách Hè ({volunteers.length})
              </button>
            </div>

            {attendanceSubTab === "kids" ? (
              <>
                <div className="bg-slate-900/45 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-sky-400">Danh Sách Học Sinh Nộp Đơn Đăng Ký</h3>
                    <p className="text-xs text-slate-400 mt-1">Hệ thống lưu trữ và đồng bộ hóa thông tin đăng ký của các em thiếu nhi trên toàn hệ thống.</p>
                  </div>

                  <button 
                    onClick={() => exportAttendanceToCsv(attendance, weeks)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                    Xuất Excel (.csv)
                  </button>
                </div>

                {/* Attendance Data Grid Table */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                          <th className="p-4 font-semibold">Thiếu nhi</th>
                          <th className="p-4 font-semibold">Khu Phố</th>
                          <th className="p-4 font-semibold">Thời gian nộp</th>
                          <th className="p-4 font-semibold text-center">Buổi tham gia</th>
                          <th className="p-4 font-semibold">Chi tiết tuần đăng ký</th>
                          <th className="p-4 font-semibold text-center">Hành động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-sm">
                        {attendance.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-500 font-medium font-sans">Chưa có thiếu nhi nào nộp phiếu đăng ký hè.</td>
                          </tr>
                        ) : (
                          attendance.map((rec) => (
                            <tr key={rec.id} className="hover:bg-slate-850/40">
                              <td className="p-4 font-bold text-slate-200 font-sans">{rec.fullName}</td>
                              <td className="p-4">
                                <span className="bg-blue-950 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded text-xs font-sans">
                                  {rec.quarter}
                                </span>
                              </td>
                              <td className="p-4 text-xs text-slate-400 font-mono">
                                {new Date(rec.timestamp).toLocaleString("vi-VN")}
                              </td>
                              <td className="p-4 text-center font-mono font-bold text-teal-400">
                                {rec.weeksAttended.length} b.
                              </td>
                              <td className="p-4 text-xs text-slate-300">
                                <div className="flex flex-wrap gap-1">
                                  {rec.weeksAttended.map(n => (
                                    <span key={n} className="bg-slate-950 px-1.5 py-0.5 rounded text-[10px] text-slate-400 font-mono">
                                      T.{n}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <button 
                                  type="button"
                                  onClick={() => removeAttendance(rec.id)}
                                  className="text-red-400 hover:text-red-300 p-1 bg-red-950/20 rounded border border-red-500/10 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="bg-slate-900/45 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-sky-400 font-sans">Danh Sách Phụ Trách Hè Cụm 2</h3>
                    <p className="text-xs text-slate-400 mt-1 font-sans">Dữ liệu ghi danh và đồng hành của các anh/chị đoàn viên, phụ trách thiếu nhi hè 2026.</p>
                  </div>

                  <button 
                    type="button"
                    onClick={() => exportVolunteersToCsv(volunteers)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg cursor-pointer shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    Xuất Excel (.csv)
                  </button>
                </div>

                {/* Volunteers Data Grid Table */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                          <th className="p-4 font-semibold">Họ và tên</th>
                          <th className="p-4 font-semibold">Chức vụ / Vai trò</th>
                          <th className="p-4 font-semibold">Khu Phố Đoàn Kết</th>
                          <th className="p-4 font-semibold">Thời gian ghi nhận</th>
                          <th className="p-4 font-semibold text-center">Tuần đồng hành</th>
                          <th className="p-4 font-semibold">Chi tiết tuần</th>
                          <th className="p-4 font-semibold text-center">Hành động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-sm">
                        {volunteers.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-500 font-medium font-sans">Chưa có phụ trách hè nào nộp đơn đăng ký tham gia.</td>
                          </tr>
                        ) : (
                          volunteers.map((vRecord) => (
                            <tr key={vRecord.id} className="hover:bg-slate-850/40">
                              <td className="p-4 font-bold text-slate-200 font-sans">{vRecord.fullName}</td>
                              <td className="p-4 text-xs font-sans">
                                <span className="bg-emerald-950 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded text-xs select-none">
                                  {vRecord.role}
                                </span>
                              </td>
                              <td className="p-4">
                                <span className="bg-blue-950 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded text-xs font-sans">
                                  KP {vRecord.quarter}
                                </span>
                              </td>
                              <td className="p-4 text-xs text-slate-400 font-mono">
                                {new Date(vRecord.timestamp).toLocaleString("vi-VN")}
                              </td>
                              <td className="p-4 text-center font-mono font-bold text-emerald-400">
                                {vRecord.weeksAttended.length} tuần
                              </td>
                              <td className="p-4 text-xs text-slate-300 font-sans">
                                <div className="flex flex-wrap gap-1">
                                  {vRecord.weeksAttended.map(n => (
                                    <span key={n} className="bg-slate-950 px-1.5 py-0.5 rounded text-[10px] text-slate-400 font-mono">
                                      T.{n}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <button 
                                  type="button"
                                  onClick={() => removeVolunteer(vRecord.id)}
                                  className="text-red-400 hover:text-red-300 p-1 bg-red-950/20 rounded border border-red-500/10 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        
        {/* TAB 4.5: STORED MEDIA ASSETS VAULT */}
        {activeTab === "gallery" && (() => {
          // Gather unique albums
          const dynamicAlbums = Array.from(new Set(storedAssets.map(a => a.album || "Chung").filter(Boolean)));
          
          const filteredAssets = selectedAdminAlbum === "Tất cả" 
            ? storedAssets 
            : storedAssets.filter(a => (a.album || "Chung") === selectedAdminAlbum);

          return (
            <div className="space-y-6 animate-fade-in text-slate-100">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-base font-black text-amber-400 flex items-center gap-1.5 font-sans">
                    📁 QUẢN LÝ ALBUM & KHO TÀI NGUYÊN HOẠT ĐỘNG
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Hỗ trợ <b>nén tự động (client-side compression)</b> bằng thuật toán Canvas giảm tới 80% dung lượng hình ảnh mà vẫn giữ độ nét cao, giúp tải nhanh hoàn hảo, đồng bộ tức thì.
                  </p>
                </div>
              </div>

              {/* Uploader Section */}
              <form onSubmit={saveAssetToVault} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 font-sans">
                <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                  <span className="text-amber-400">✨</span> TẢI TRỮ & TỰ ĐỘNG NÉN TÀI NGUYÊN MỚI
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* File name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Tên tệp / Chú thích</label>
                    <input 
                      type="text"
                      required
                      placeholder="Hình tập thể tên lửa nước"
                      value={uploadAssetName}
                      onChange={(e) => setUploadAssetName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Format */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Loại định dạng</label>
                    <select 
                      value={uploadAssetType}
                      onChange={(e) => {
                        setUploadAssetType(e.target.value as "image" | "video");
                        setCompressProgress(null);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="image">🏞️ Hình ảnh (Tự Động Nén)</option>
                      <option value="video">🎥 Video Clip (Tối Ưu Đồng Bộ)</option>
                    </select>
                  </div>

                  {/* Album Category selection */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Chọn mục Album để phân loại</label>
                    <select 
                      value={uploadAssetAlbum}
                      onChange={(e) => setUploadAssetAlbum(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="Vui chơi hè">Vui chơi hè 🎪</option>
                      <option value="Khai mạc hè">Khai mạc hè ✨</option>
                      <option value="Giáo dục truyền thống">Giáo dục truyền thống 🇻🇳</option>
                      <option value="Trò chơi & Thể thao">Trò chơi & Thể thao ⚽</option>
                      <option value="Học tập hè">Học tập hè 📚</option>
                      <option value="Hoạt động Xã hội">Hoạt động Xã hội 🌱</option>
                      <option value="Bế mạc tổng kết">Bế mạc tổng kết 🏆</option>
                      <option value="Khác">-- Viết Album khác --</option>
                    </select>
                  </div>

                  {/* Device Picker */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Chọn file từ thiết bị</label>
                    <input 
                      id="asset-file-uploader"
                      type="file"
                      accept={uploadAssetType === "image" ? "image/*" : "video/*"}
                      onChange={handleAssetFileUpload}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-400 focus:outline-none focus:border-amber-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Custom Album Name Input if "Khác" is selected */}
                {uploadAssetAlbum === "Khác" && (
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center gap-3 animate-fade-in">
                    <span className="text-xs text-orange-400 font-bold shrink-0">✍ Nhập tên Album mới:</span>
                    <input 
                      type="text"
                      required
                      placeholder="Nhập tên Album mới của bạn (ví dụ: Hội trại kỹ năng)"
                      value={customAlbumName}
                      onChange={(e) => setCustomAlbumName(e.target.value)}
                      className="flex-grow bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                )}

                {/* Optional Custom link fallback */}
                <div className="relative">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-400 mb-1">
                    <span>Hoặc dán trực tiếp đường dẫn liên kết ngoài (URL):</span>
                    {uploadCustomUrl && uploadCustomUrl.startsWith("data:") && (
                      <span className="text-emerald-400 font-bold flex items-center gap-1 text-[10px]">
                        ✓ Đã tự động nén & tạo Base64 cực đại tối ưu!
                      </span>
                    )}
                  </div>
                  <input 
                    type="text"
                    placeholder="Nhập link Unsplash hoặc link Youtube ngoài hệ thống"
                    value={uploadCustomUrl}
                    onChange={(e) => {
                      setUploadCustomUrl(e.target.value);
                      setCompressProgress(null); // Manual paste doesn't have local compress metrics
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                {/* Compression loading animation */}
                {isCompressing && (
                  <div className="bg-slate-950/80 border border-amber-500/20 p-4 rounded-xl flex items-center gap-3 text-xs text-amber-300 font-bold animate-pulse">
                    <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0"></span>
                    <span>⏳ Hệ thống đang xử lý và nén tự động dữ liệu bằng Canvas siêu tốc để tối ưu bộ nhớ...</span>
                  </div>
                )}

                {/* Compression Progress Success Result View */}
                {compressProgress && (
                  <div className="bg-emerald-950/30 border border-emerald-500/40 p-4 rounded-xl space-y-2 animate-fade-in">
                    <div className="flex justify-between items-center text-xs font-extrabold text-emerald-400">
                      <span className="flex items-center gap-1.5">
                        ✨ HOÀN TẤT NÉN TỰ ĐỘNG CLIENT-SIDE THÀNH CÔNG!
                      </span>
                      <span className="bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        Giảm được {compressProgress.percentageSaved}% dung lượng
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-center md:text-left text-[11px] font-medium text-slate-300">
                      <div>
                        <span className="text-slate-500 block">Dung lượng gốc:</span>
                        <b className="font-mono text-xs">{(compressProgress.originalSize / 1024).toFixed(1)} KB</b>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Dung lượng thực tế sau nén:</span>
                        <b className="font-mono text-emerald-300 text-xs text-left">{(compressProgress.compressedSize / 1024).toFixed(1)} KB</b>
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        <span className="text-slate-500 block">Tương thích lưu trữ:</span>
                        <b className="text-sky-300">Nhanh gấp 5 lần, đồng bộ tức thì</b>
                      </div>
                    </div>

                    {/* visual bar representation */}
                    <div className="relative h-2 bg-slate-950 rounded-full overflow-hidden mt-1 border border-slate-800">
                      <div 
                        style={{ width: `${100 - compressProgress.percentageSaved}%` }}
                        className="h-full bg-gradient-to-r from-emerald-500 to-sky-400 rounded-full"
                      ></div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button 
                    type="submit"
                    disabled={isCompressing}
                    className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs py-2 px-5 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow"
                  >
                    <Plus className="w-4 h-4" /> Lưu Lên Album Hệ Thống
                  </button>
                </div>
              </form>

              {/* Dynamic Album Filtering Bar */}
              <div className="flex flex-wrap items-center gap-2 p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
                <span className="text-xs text-amber-500 font-extrabold uppercase tracking-wider pl-1 font-sans">
                  🗂️ DUYỆT THEO ALBUM:
                </span>
                
                <div className="flex flex-wrap gap-1.5 font-sans">
                  <button 
                    onClick={() => setSelectedAdminAlbum("Tất cả")}
                    className={`text-xs font-black py-1.5 px-3 rounded-lg border transition-all cursor-pointer ${selectedAdminAlbum === "Tất cả" ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md font-extrabold" : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"}`}
                  >
                    TẤT CẢ ({storedAssets.length})
                  </button>

                  {dynamicAlbums.map(albumName => {
                    const count = storedAssets.filter(a => (a.album || "Chung") === albumName).length;
                    return (
                      <button 
                        key={albumName}
                        onClick={() => setSelectedAdminAlbum(albumName)}
                        className={`text-xs font-black py-1.5 px-3 rounded-lg border transition-all cursor-pointer ${selectedAdminAlbum === albumName ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md font-extrabold" : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"}`}
                      >
                        📁 {albumName} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Assets Gallery Grid */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                    DANH SÁCH TÀI NGUYÊN {selectedAdminAlbum !== "Tất cả" && `THUỘC ALBUM "${selectedAdminAlbum}"`} ({filteredAssets.length})
                  </h4>
                </div>
                
                {filteredAssets.length === 0 ? (
                  <div className="text-center py-12 bg-slate-900 rounded-2xl border border-slate-800">
                    <span className="text-2xl block mb-2">📂</span>
                    <p className="text-xs text-slate-500 font-bold">Album này chưa có ảnh hoặc clip nào!</p>
                    <p className="text-[10px] text-slate-600 mt-1">Sử dụng form tải lên ở trên để thêm tài nguyên mới vào album này.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAssets.map((asset) => (
                      <div key={asset.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between group">
                        <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
                          {asset.type === "image" ? (
                            <img 
                              src={asset.url} 
                              alt={asset.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-slate-950">
                              <FileVideo className="w-10 h-10 text-rose-500 mb-2" />
                              <span className="text-[10px] text-slate-400 font-mono break-all line-clamp-2">{asset.url}</span>
                            </div>
                          )}
                          
                          {/* Floating format tag */}
                          <span className={`absolute top-2 left-2 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-md ${asset.type === "image" ? "bg-teal-950 text-teal-300 border-teal-500/30" : "bg-rose-950 text-rose-300 border-rose-500/30"}`}>
                            {asset.type === "image" ? "HÌNH ẢNH" : "VIDEO EMBED"}
                          </span>

                          {/* Floating album indicator */}
                          <span className="absolute bottom-2 left-2 text-[8px] font-bold bg-slate-950/80 text-orange-400 border border-slate-800 px-2 py-0.5 rounded-lg shrink-0">
                            📁 {asset.album || "Chung"}
                          </span>
                        </div>

                        <div className="p-4 space-y-3 flex-grow flex flex-col justify-between font-sans">
                          <div>
                            <h5 className="font-extrabold text-sm text-slate-100 line-clamp-1 uppercase tracking-tight">{asset.name}</h5>
                            <p className="text-[9px] text-slate-500 font-mono mt-1 font-semibold">Đăng ngày: {new Date(asset.timestamp).toLocaleString("vi-VN")}</p>
                          </div>

                          <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
                            <button 
                              type="button"
                              onClick={() => copyAssetUrl(asset)}
                              className={`flex-grow py-1.5 px-2.5 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${copiedAssetId === asset.id ? "bg-emerald-900 text-emerald-300 border border-emerald-500/30" : "bg-slate-800 text-slate-300 hover:bg-slate-750"}`}
                            >
                              {copiedAssetId === asset.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span>ĐÃ SAO CHÉP</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>SAO CHÉP LIÊN KẾT NHANH</span>
                                </>
                              )}
                            </button>

                            <button 
                              type="button"
                              onClick={() => deleteAssetFromVault(asset.id)}
                              className="p-2 bg-red-950/40 border border-red-500/20 text-red-400 hover:bg-red-900/40 rounded-lg transition-colors cursor-pointer"
                              title="Xóa tài nguyên"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* TAB 5: GALLERY IMAGE SUBMISSION */}
        {activeTab === "logos" && (
          <div className="space-y-8 animate-fade-in text-slate-100">
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
              <h3 className="text-base font-bold text-sky-450 flex items-center gap-2">
                <Settings className="w-5 h-5 text-sky-400" />
                Đồng Bộ Hóa & Thiết Kế Logo Nhận Diện Cụm Sinh Hoạt Hè
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-3xl font-medium">
                Quản trị viên có thể thay đổi, tải lên tệp Logo Nhận Diện cho toàn bộ hệ thống. Tính năng này hỗ trợ tải lên 1 tệp ảnh đại diện duy nhất theo <strong>đúng tỷ lệ chuẩn 1096x391 px</strong>, tích hợp bộ căn chỉnh, xoay trục và thu phóng bằng canvas trực quan giúp hiển thị đồng bộ tuyệt vời nhất ở đầu trang và cuối trang!
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* CỘT TRÁI: LOGO CỤM ĐANG SỬ DỤNG */}
              <div className="space-y-6">
                <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col items-center gap-6">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex items-center justify-center w-full aspect-[1096/391] relative overflow-hidden">
                    {customLogo ? (
                      <img 
                        src={customLogo} 
                        alt="Custom Local Cluster Logo" 
                        className="w-full h-full object-contain" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <DefaultLogoCluster className="h-16 md:h-20" />
                    )}
                  </div>
                  <div className="w-full space-y-2 text-center sm:text-left">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Cụm Logo Nhận Diện Hiện Tại</h4>
                    <p className="text-xs text-slate-450 font-semibold leading-relaxed">
                      {customLogo 
                        ? "Đang sử dụng cụm logo tùy chỉnh chất lượng cao do bạn tải lên và xử lý theo đúng tỷ lệ 1096x391 px."
                        : "Đang sử dụng Cụm 3 Logo chuẩn Vector do Đoàn - Hội - Đội hiệu chuẩn mặc định."}
                    </p>
                    <div className="pt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
                      <button
                        type="button"
                        onClick={() => {
                          setLogoSrc("");
                          setSelectedFile(null);
                          const fileInput = document.getElementById("logo-file-uploader-btn");
                          if (fileInput) fileInput.click();
                        }}
                        className="bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-[11px] px-3.5 py-2 rounded-xl cursor-pointer flex items-center gap-1.5 transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Thay Mới Cụm Logo
                      </button>
                      {customLogo && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm("Khôi phục cụm logo nhận diện về mặc định?")) {
                              setCustomLogo("");
                            }
                          }}
                          className="bg-slate-800 hover:bg-slate-750 text-slate-300 font-extrabold text-[11px] px-3.5 py-2 rounded-xl cursor-pointer flex items-center gap-1.5 transition-all"
                        >
                          Khôi Phục Gốc
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* CỘT PHẢI: BỘ CẮT CHỈNH SỬA VÀ TẢI LÊN IMAGE CROPPER */}
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-6">
                <div>
                  <h4 className="text-xs font-black text-white mb-2 uppercase tracking-wide">Bộ Biên Tập & Cắt Ảnh Trực Quan</h4>
                  <p className="text-xs text-slate-450 leading-normal font-semibold">
                    Tải lên tệp ảnh nguồn từ máy của bạn, sau đó dùng các thanh trượt bên dưới để xoay, thu phóng và căn chỉnh tọa độ tâm chuẩn xác nhất theo đúng khung thiết kế tỷ lệ vàng <strong className="text-yellow-400">1096x391 px</strong>.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Chọn Tệp Hình Ảnh Đồng Bộ</label>
                    <input 
                      type="file"
                      id="logo-file-uploader-btn"
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const btn = document.getElementById("logo-file-uploader-btn");
                        if (btn) btn.click();
                      }}
                      className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-extrabold text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <Download className="w-4 h-4 uppercase rotate-180" /> {selectedFile ? `Đã chọn: ${selectedFile.name.substring(0, 20)}...` : "Chọn ảnh từ máy..."}
                    </button>
                  </div>
                </div>

                {logoSrc ? (
                  <div className="space-y-6 pt-2 animate-fade-in">
                    {/* Live preview section */}
                    <div className="space-y-4 bg-slate-950/75 p-4 rounded-2xl border border-slate-850">
                      <div>
                        <span className="block text-center text-[10px] font-bold text-slate-500 mb-2.5">Xem trước vùng cắt (Tỷ lệ 1096x391 px)</span>
                        <div className="w-full aspect-[1096/391] bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center shadow-inner relative">
                          <canvas 
                            ref={logoCanvasRef} 
                            width={1096} 
                            height={391}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </div>

                      {/* Info on current adjustment */}
                      <div className="text-slate-400 text-xs space-y-1 text-center sm:text-left flex-grow">
                        <p className="font-extrabold text-white text-xs uppercase tracking-wide">Bộ Điều Chỉnh Tọa Độ</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] py-1">
                          <p>• Thu phóng: <span className="font-mono text-emerald-400 font-bold">{scale.toFixed(2)}x</span></p>
                          <p>• Góc xoay: <span className="font-mono text-sky-400 font-bold">{rotation}°</span></p>
                          <p>• Trục X: <span className="font-mono text-orange-400 font-bold">{offsetX}px</span></p>
                          <p>• Trục Y: <span className="font-mono text-orange-400 font-bold">{offsetY}px</span></p>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed leading-normal pt-1 bg-slate-900/50 p-2 rounded border border-slate-800">
                          Kéo thanh trượt bên dưới để hình ảnh lấp đầy và nằm cân đối chính giữa khung viền vàng.
                        </p>
                      </div>
                    </div>

                    {/* Fine-tuning Sliders */}
                    <div className="space-y-4 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-slate-400">🔍 Thu Phóng Kích Thước (Scale)</span>
                          <span className="text-emerald-400 font-mono font-black">{scale.toFixed(2)}x</span>
                        </div>
                        <input 
                          type="range"
                          min="0.2"
                          max="3.0"
                          step="0.01"
                          value={scale}
                          onChange={(e) => setScale(parseFloat(e.target.value))}
                          className="w-full accent-emerald-500 h-2 bg-slate-850 rounded-lg cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-slate-400">🔄 Xoay Ảnh Góc (Rotation)</span>
                          <span className="text-sky-400 font-mono font-black">{rotation}°</span>
                        </div>
                        <input 
                          type="range"
                          min="0"
                          max="360"
                          step="1"
                          value={rotation}
                          onChange={(e) => setRotation(parseInt(e.target.value))}
                          className="w-full accent-sky-500 h-2 bg-slate-850 rounded-lg cursor-pointer"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <div className="flex justify-between text-xs font-semibold mb-1">
                            <span className="text-slate-400">↔️ Trục Ngang (Offset X)</span>
                            <span className="text-orange-400 font-mono font-black">{offsetX}px</span>
                          </div>
                          <input 
                            type="range"
                            min="-500"
                            max="500"
                            step="1"
                            value={offsetX}
                            onChange={(e) => setOffsetX(parseInt(e.target.value))}
                            className="w-full accent-blue-500 h-2 bg-slate-850 rounded-lg cursor-pointer"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-xs font-semibold mb-1">
                            <span className="text-slate-400">↕️ Trục Dọc (Offset Y)</span>
                            <span className="text-orange-400 font-mono font-black">{offsetY}px</span>
                          </div>
                          <input 
                            type="range"
                            min="-500"
                            max="500"
                            step="1"
                            value={offsetY}
                            onChange={(e) => setOffsetY(parseInt(e.target.value))}
                            className="w-full accent-blue-500 h-2 bg-slate-850 rounded-lg cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setLogoSrc("");
                          setSelectedFile(null);
                        }}
                        className="bg-slate-800 hover:bg-slate-750 text-slate-300 font-extrabold text-xs py-2.5 px-4 rounded-xl cursor-pointer transition-all"
                      >
                        Hủy Bỏ
                      </button>

                      <button
                        type="button"
                        onClick={saveCroppedLogo}
                        className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-550 hover:to-teal-550 text-white font-black text-xs py-2.5 px-6 rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 cursor-pointer active:scale-95 transition-all"
                      >
                        <CheckCircle className="w-4 h-4" /> Xác Nhận & Cắt Logo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-800 p-8 rounded-2xl flex flex-col items-center justify-center text-center bg-slate-950/20">
                    <span className="text-3xl">🏞️</span>
                    <p className="text-xs text-slate-300 font-bold mt-3">Chưa có ảnh nào được chọn</p>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-[240px] font-medium leading-normal">Ấn nút "Chọn ảnh từ máy..." bên trên để tải lên cụm logo nhận diện đồng bộ độc quyền của bạn ngay lập tức.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: SECURITY SYSTEM & OPERATION AUDIT LOGS */}
        {activeTab === "security" && (
          <div className="space-y-6 font-sans">
            {/* Header Area */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Shield className="w-40 h-40 text-blue-500 animate-pulse" />
              </div>
              <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-sky-400 bg-sky-950/60 px-3 py-1.5 rounded-full border border-sky-800/60">
                <Shield className="w-3.5 h-3.5" />
                <span>AI Security System Shield</span>
              </div>
              <h3 className="text-xl md:text-2xl font-black text-white mt-3 font-sans">
                QUẢN LÝ PHÂN QUYỀN VAI TRÒ & NHẬT KÝ KIỂM TOÁN HỆ THỐNG
              </h3>
              <p className="text-xs text-slate-400 mt-2 max-w-2xl leading-relaxed">
                Hệ thống phân quyền 4 vai trò (Super Admin, Admin, User, Guest) đã được áp đặt nghiêm ngặt trên toàn hệ thống. Mọi tương tác bao gồm tạo lập, cập nhật, xóa đồng bộ và kiểm soát dữ liệu đều được lưu vết tức thời dưới dạng các chữ ký kiểm toán không thể sửa đổi (Immutable Audit Logs).
              </p>
            </div>

            {/* Top Stat Indices Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-extrabold text-base">
                  🟢
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Sức khỏe bảo mật</span>
                  <span className="text-sm font-black text-white font-sans mt-0.5 block">100% An Toàn</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-extrabold text-base">
                  📊
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Số lượng Nhật ký</span>
                  <span className="text-sm font-black text-white font-sans mt-0.5 block">{auditLogs.length} Bản ghi</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 font-extrabold text-base">
                  🛡️
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Tác vụ Bị Ngăn Chặn</span>
                  <span className="text-sm font-black text-rose-400 font-sans mt-0.5 block">{auditLogs.filter(l => l.isError).length} Sự cố</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 font-extrabold text-base">
                  ⚡
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Tiêu Chuẩn Đồng Bộ</span>
                  <span className="text-sm font-black text-white font-sans mt-0.5 block">AES-256 Sync</span>
                </div>
              </div>
            </div>

            {/* Main Interactive Work Area */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column - Fast Role Switcher & Business Rules (5 Columns) */}
              <div className="lg:col-span-5 space-y-6">
                {/* Switcher Card */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
                  <h4 className="font-extrabold text-xs text-white uppercase tracking-wider border-b border-slate-850 pb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-orange-400" />
                    BỘ THỬ NGHIỆM VAI TRÒ NHANH TRÊN PORTAL
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Bạn có thể nhấp chọn vai trò bên dưới để chuyển đổi quyền hạn lập tức. Việc này giúp kiểm thử tính năng ngăn chặn Guest sửa đổi, kiểm soát quyền xóa đồng bộ của Admin, và toàn quyền tối thượng của Super Admin!
                  </p>

                  <div className="grid grid-cols-2 gap-2.5 pt-2">
                    {[
                      { role: "Super Admin", desc: "Toàn quyền tối cao", color: "from-red-600 to-rose-600", tag: "👑 Super Admin" },
                      { role: "Admin", desc: "Quản trị viên sự vụ", color: "from-blue-600 to-indigo-600", tag: "💼 Admin" },
                      { role: "User", desc: "Phụ huynh & Đoàn viên", color: "from-emerald-600 to-teal-600", tag: "👦 User / Member" },
                      { role: "Guest", desc: "Khách xem thông tin", color: "from-slate-600 to-slate-700", tag: "👀 Guest" }
                    ].map(r => {
                      const isSelected = currentRole === r.role;
                      return (
                        <button
                          key={r.role}
                          type="button"
                          onClick={() => {
                            setCurrentRole(r.role as any);
                            addSystemLog("Cấp phát quyền", `Người dùng đã chuyển đổi nhanh vai trò hệ thống sang: ${r.role} để kiểm tra bảo mật.`);
                          }}
                          className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${isSelected ? "bg-slate-800 border-yellow-400 shadow-md shadow-yellow-400/5 scale-[1.01]" : "bg-slate-950/40 border-slate-850 hover:bg-slate-900"}`}
                        >
                          <span className="font-sans font-black text-xs block text-white">{r.tag}</span>
                          <span className="text-[9px] text-slate-500 mt-0.5 block leading-none font-semibold">{r.desc}</span>
                          {isSelected && (
                            <span className="inline-block mt-2 text-[9px] bg-yellow-400 text-slate-950 font-black px-1.5 py-0.5 rounded uppercase leading-none">
                              Đang áp dụng ✅
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Business Rules Description */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 text-slate-300">
                  <h4 className="font-extrabold text-xs text-white uppercase tracking-wider border-b border-slate-850 pb-3 flex items-center gap-2">
                    <Info className="w-4 h-4 text-sky-400" />
                    BẢNG ĐỐI CHIẾU QUY TRẮC NGHIỆP VỤ AN NINH
                  </h4>

                  <div className="space-y-4 text-xs leading-relaxed font-sans">
                    <div className="flex items-start gap-2.5">
                      <span className="text-red-400 font-extrabold whitespace-nowrap">👑 Super Admin:</span>
                      <span className="text-slate-400 text-[11px] leading-relaxed">Được quyền xóa dữ liệu vĩnh viễn (xóa đồng bộ), cập nhật logo nòng cốt, chỉnh sửa thông tin lịch trình, quà tặng, và can dự vào bất kỳ mô đun chức năng nào.</span>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="text-blue-400 font-extrabold whitespace-nowrap">💼 Admin:</span>
                      <span className="text-slate-400 text-[11px] leading-relaxed">Thêm/sửa thời hạn tuần sinh hoạt, cập nhật logo, quản lý quà, đệ trình phòng ảnh sự vụ. <strong>Nghiêm cấm quyền xóa vĩnh viễn đồng bộ</strong> trên toàn hệ thống khỏi Database.</span>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="text-emerald-400 font-extrabold whitespace-nowrap">👦 User:</span>
                      <span className="text-slate-400 text-[11px] leading-relaxed">Được dùng các chức năng công bố, viết phiếu đăng ký chuyên cần thiếu nhi hoặc phụ trách hè, gửi đánh giá thích phòng tranh. Không can thiệp cấu trúc dữ liệu.</span>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="text-slate-400 font-extrabold whitespace-nowrap">👀 Guest:</span>
                      <span className="text-slate-400 text-[11px] leading-relaxed">Quyền chỉ xem (Read-Only). Mọi hành động chỉnh sửa, lưu trữ tệp tin hoặc ghi danh chuyên cần sẽ lập tức bị hệ thống từ chối đệ trình.</span>
                    </div>
                  </div>
                </div>

                {/* Clear All System Data card */}
                <div className="bg-slate-900 border border-red-950/40 p-6 rounded-3xl space-y-4 text-slate-300 shadow-md">
                  <h4 className="font-extrabold text-xs text-rose-400 uppercase tracking-wider border-b border-rose-950/40 pb-3 flex items-center gap-1.5 font-sans">
                    <span className="text-sm">🚨</span>
                    BỘ KHỞI TẠO & CHUYỂN GIAO CHÍNH THỨC
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                    Tính năng đặc quyền của Quản trị viên giúp dọn dẹp toàn bộ cơ sở dữ liệu huấn luyện/nháp (bao gồm toàn bộ đăng ký thiếu nhi, phụ trách viên đồng hành, danh sách quà tặng, thông báo chạy chữ, logo tùy chỉnh) nhằm hoàn thiện ứng dụng sạch đẹp, sẵn sàng đưa vào vận hành chính thức trên toàn phường.
                  </p>
                  <button
                    type="button"
                    onClick={handleSystemInitializeReset}
                    className="w-full bg-gradient-to-r from-red-700 to-rose-750 hover:from-red-650 hover:to-rose-700 text-white font-black text-xs py-3 px-5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-rose-950/20 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    🗑️ Khởi Tạo Lập Phần Mềm Hoạt Động Chính Thức
                  </button>
                </div>
              </div>

              {/* Right Column - Audit Log Records with search & CSV (7 Columns) */}
              <div className="lg:col-span-7 bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-850 pb-4">
                  <div>
                    <h4 className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                      <Settings className="w-4 h-4 text-[#0080ff]" />
                      BẢN GHI NHẬT KÝ SỰ KIỆN KIỂM TOÁN (LIVE TIMELINE)
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-1">Dữ liệu kiểm toán lưu hành tức thì đại diện cho tính trung thực.</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      addSystemLog("Tải tệp Log", "Xuất ra bộ hồ sơ kiểm toán định dạng mã hóa JSON thành công.");
                      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
                      const downloadAnchor = document.createElement("a");
                      downloadAnchor.setAttribute("href", dataStr);
                      downloadAnchor.setAttribute("download", `Bao_Cao_Audit_Logs_Tan_Hung_He_2026.json`);
                      document.body.appendChild(downloadAnchor);
                      downloadAnchor.click();
                      downloadAnchor.remove();
                    }}
                    className="bg-slate-800 hover:bg-slate-755 text-white font-extrabold text-[11px] py-2 px-4 rounded-xl border border-slate-700/60 flex items-center gap-1.5 transition-all cursor-pointer select-none active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    Tải File Log JSON
                  </button>
                </div>

                {/* Audit Logs list wrapper with max height for neat scrolling scrollbar */}
                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-2 custom-scrollbar">
                  {auditLogs.map((log) => {
                    return (
                      <div 
                        key={log.id} 
                        className={`p-3.5 rounded-2xl border text-xs leading-normal transition-all ${log.isError ? "bg-rose-950/20 border-rose-900/40 text-rose-350" : "bg-slate-950/30 border-slate-850/60 text-slate-300"}`}
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-slate-800/40 pb-1.5 mb-1.5 font-mono text-[9.5px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-1.5 py-0.5 rounded uppercase font-black tracking-wider leading-none ${log.isError ? "bg-rose-500 text-white" : "bg-slate-800 text-slate-400"}`}>
                              {log.action}
                            </span>
                            <span className="text-slate-500">| Người làm:</span>
                            <span className="font-bold text-slate-300">{log.user}</span>
                            <span className="text-slate-500 font-semibold">({log.role})</span>
                          </div>
                          <span className="text-slate-500 font-sans">{new Date(log.timestamp).toLocaleTimeString() || "Vừa xong"}</span>
                        </div>

                        <p className="text-[11px] font-sans text-slate-300 mt-1 font-medium">
                          {log.details}
                        </p>

                        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-850 text-[9.5px] font-mono text-slate-500">
                          <span>🌐 IP: {log.ipAddress}</span>
                          <span>📱 {log.device}</span>
                          <span>🖥️ {log.browser}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PREMIUM SECURE SYSTEM-WIDE DELETION MODAL */}
        {deleteModal.isOpen && (
          <div 
            className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-xs animate-fade-in"
            onClick={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
          >
            <div 
              className="bg-slate-900 border border-red-900/30 text-slate-100 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl shadow-black/80 animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header block with Alert Red Banner */}
              <div className="bg-gradient-to-r from-red-950 to-rose-950 px-5 py-4 border-b border-red-900/30 flex items-center gap-3">
                <span className="text-xl">🚨</span>
                <div>
                  <h3 className="text-xs uppercase font-black tracking-widest text-red-400">Yêu Cầu Xác Thực Quyền Điểm</h3>
                  <p className="text-[10px] text-slate-400 font-sans">Hành động xóa đồng bộ dữ liệu vĩnh viễn trên toàn hệ thống.</p>
                </div>
              </div>

              {/* Detailed Context Area */}
              <div className="p-6 space-y-5">
                <div className="space-y-2">
                  <div className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider font-sans">Hạng Mục Xóa</div>
                  <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl font-mono text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">Thao tác:</span>
                      <span className="text-red-400 font-extrabold text-right">{deleteModal.actionName}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-850/60 mt-1.5 pt-1.5">
                      <span className="text-slate-500 font-bold">Tên mục:</span>
                      <span className="text-white font-extrabold text-right max-w-[200px] truncate" title={String(deleteModal.targetLabel)}>
                        {deleteModal.targetLabel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Important warning paragraphs */}
                <div className="text-[11px] text-slate-300 bg-red-950/20 border border-red-900/20 p-3 rounded-xl leading-relaxed space-y-1 font-sans">
                  <p className="font-extrabold text-red-400 text-xs text-left">⚠️ CẢNH BÁO AN TOÀN:</p>
                  <p className="text-left">Hành động này sẽ <strong>XÓA VĨNH VIỄN</strong> và không thể khôi phục lại dữ liệu này dưới bất kỳ hình thức nào. Trạng thái dọn dẹp sẽ lập tức đồng bộ hóa đến tất cả mọi máy chủ & thiết bị di động trong Cụm hoạt động.</p>
                </div>

                {/* Typing conformation block */}
                <div className="space-y-2 text-left">
                  <label htmlFor="confirm-entry-text" className="block text-[11px] text-slate-400 font-medium font-sans">
                    Để xác nhận xóa, hãy nhập đúng từ khóa <span className="font-mono bg-red-950 text-red-400 px-1.5 py-0.5 rounded font-black select-none">XÓA ĐỒNG BỘ</span> bên dưới:
                  </label>
                  <input
                    id="confirm-entry-text"
                    type="text"
                    value={deleteModal.confirmText}
                    onChange={(e) => setDeleteModal(prev => ({ ...prev, confirmText: e.target.value }))}
                    placeholder="Nhập: XÓA ĐỒNG BỘ"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-black tracking-wider placeholder-slate-600 focus:outline-hidden focus:border-red-500 transition-all text-center font-sans"
                  />
                </div>

                {/* Action Buttons row */}
                <div className="grid grid-cols-2 gap-3.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
                    className="bg-slate-800 hover:bg-slate-755 text-slate-300 font-extrabold text-[11.5px] py-2.5 px-4 rounded-xl border border-slate-700/50 transition-all cursor-pointer font-sans"
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    type="button"
                    disabled={deleteModal.confirmText !== "XÓA ĐỒNG BỘ"}
                    onClick={executeDeletion}
                    className={`font-black text-[11.5px] py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md font-sans ${
                      deleteModal.confirmText === "XÓA ĐỒNG BỘ"
                        ? "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-950/40 cursor-pointer active:scale-95"
                        : "bg-slate-800 text-slate-500 border border-slate-800/40 cursor-not-allowed opacity-45"
                    }`}
                  >
                    Đồng Ý Xóa
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Unified PWA Admin Floating Action Button (FAB) Component */}
        <div className="fixed bottom-6 right-6 z-[99] flex flex-col items-end">
          {/* Backdrop overlay only visible when FAB is open, to dismiss it gracefully */}
          <AnimatePresence>
            {isFabOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsFabOpen(false)}
                className="fixed inset-0 bg-slate-950/40 backdrop-blur-[1px] z-[-1]"
              />
            )}
          </ AnimatePresence>

          {/* Expanded Menu Actions */}
          <AnimatePresence>
            {isFabOpen && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.85, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: 15 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className="flex flex-col gap-3 mb-4 items-end pointer-events-auto"
              >
                {/* Action 1: Create new week */}
                <button
                  type="button"
                  onClick={() => {
                    triggerCreateWeekMobile();
                    setIsFabOpen(false);
                  }}
                  className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 active:scale-95 text-white pr-4 pl-3 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 border border-sky-400/25 transition-all text-xs font-black cursor-pointer group"
                >
                  <Calendar className="w-4 h-4 text-sky-200 group-hover:scale-110 transition-transform" />
                  <span className="font-sans">Lập Tuần Mới 📅</span>
                </button>

                {/* Action 2: Create new announcement */}
                <button
                  type="button"
                  onClick={() => {
                    triggerPostAnnouncementMobile();
                    setIsFabOpen(false);
                  }}
                  className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 active:scale-95 text-white pr-4 pl-3 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 border border-violet-400/25 transition-all text-xs font-black cursor-pointer group"
                >
                  <Bell className="w-4 h-4 text-violet-200 group-hover:scale-110 transition-transform" />
                  <span className="font-sans">Phát Tin Chạy 🔔</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Master Trigger Toggle Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsFabOpen(!isFabOpen)}
            className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center border border-indigo-400/30 cursor-pointer focus:outline-none relative group hover:scale-105 transition-transform"
            style={{ boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.45)" }}
          >
            {/* Spinning/pulsing soft background ring */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 animate-ping group-hover:animate-none opacity-40"></div>
            
            {/* Rotating central icon */}
            <motion.div
              animate={{ rotate: isFabOpen ? 135 : 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 20 }}
              className="flex items-center justify-center text-white"
            >
              <Plus className="w-7 h-7 stroke-[2.5]" />
            </motion.div>
          </motion.button>
        </div>

      </div>
    </div>
  );
};
