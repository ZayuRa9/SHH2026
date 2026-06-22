export interface WeekActivity {
  id: number;
  weekNumber: number;
  theme: string;
  date: string;
  time: string;
  location: string;
  mapsLink: string;
  description: string;
  objectives: string[];
  games: string[];
  activities: string[];
  videoUrl?: string;
  images: string[];
  coverImage: string;
  lessonUrl?: string; // Link bài học / Tài liệu sinh hoạt hè đồng bộ
  solidarityQuarter?: string; // Khu phố đoàn kết phụ trách tuần đó
}

export interface AttendanceRecord {
  id: string;
  fullName: string;
  quarter: string;
  weeksAttended: number[]; // Array of week numbers
  timestamp: string;
}

export interface VolunteerAttendance {
  id: string;
  fullName: string;
  quarter: string;
  role: string;
  weeksAttended: number[]; // Tuần tham gia phụ trách
  timestamp: string;
}

export interface Gift {
  id: string;
  name: string;
  category: "weekly" | "points" | "special";
  reqAttendances: number;
  icon: string;
  description: string;
  countLeft: number;
  image?: string;
}

export interface Announcement {
  id: string;
  text: string;
  isActive: boolean;
  scheduledTime?: string;
}

export interface StoredAsset {
  id: string;
  name: string;
  url: string; // Base64 or standard asset URL
  type: "image" | "video";
  timestamp: string;
  likes?: number; // Số lượt thích từ phụ huynh
  album?: string; // Tên album phân loại hình ảnh
}

export interface AuditLog {
  id: string;
  user: string;
  role: string;
  action: string;
  details: string;
  ipAddress: string;
  device: string;
  browser: string;
  timestamp: string;
  isError?: boolean;
}

