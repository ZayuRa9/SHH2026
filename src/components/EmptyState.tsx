import React from "react";
import { FolderOpen, Image, Bell, Gift, Users } from "lucide-react";

interface EmptyStateProps {
  type: "gallery" | "announcements" | "weeks" | "gifts" | "attendance" | "general";
  title?: string;
  description?: string;
  actionButton?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  title,
  description,
  actionButton
}) => {
  // Select icon and default texts based on empty state type
  let Icon = FolderOpen;
  let defaultTitle = "Không có dữ liệu hiển thị";
  let defaultDescription = "Hiện tại danh mục này chưa có thông tin cập nhật mới nhất.";
  let bgGradient = "from-slate-50 to-slate-100/50";
  let iconColor = "text-slate-400";

  switch (type) {
    case "gallery":
      Icon = Image;
      defaultTitle = "Thư viện ảnh trống";
      defaultDescription = "Chưa có hình ảnh khoảnh khắc sinh hoạt hè nào được đăng tải cho tuần này.";
      bgGradient = "from-sky-50/50 to-blue-50/20";
      iconColor = "text-sky-500";
      break;
    case "announcements":
      Icon = Bell;
      defaultTitle = "Không có bản tin mới";
      defaultDescription = "Tất cả các hoạt động hiện hành đều diễn ra tuần tự, chưa có thông báo khẩn.";
      bgGradient = "from-amber-50/40 to-orange-50/20";
      iconColor = "text-orange-500";
      break;
    case "gifts":
      Icon = Gift;
      defaultTitle = "Kho quà tặng tạm hết";
      defaultDescription = "Vui lòng quay lại sau, Ban chỉ huy phường đang chuẩn bị thêm nhiều phần quà mới.";
      bgGradient = "from-rose-50/50 to-pink-50/20";
      iconColor = "text-rose-500";
      break;
    case "attendance":
      Icon = Users;
      defaultTitle = "Chưa có lượt đăng ký";
      defaultDescription = "Hãy là phụ huynh đầu tiên ghi danh chuyên cần cho bé trong tuần này nhé!";
      bgGradient = "from-emerald-50/50 to-teal-50/20";
      iconColor = "text-emerald-500";
      break;
  }

  const displayTitle = title || defaultTitle;
  const displayDescription = description || defaultDescription;

  return (
    <div className={`w-full py-16 px-6 text-center rounded-3xl border border-dashed border-slate-200/80 bg-gradient-to-b ${bgGradient} flex flex-col items-center justify-center font-sans relative overflow-hidden select-none`}>
      {/* Soft background glow decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-white rounded-full blur-3xl opacity-60 pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center max-w-sm">
        {/* Animated Icon wrapper */}
        <div className={`w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4 border border-slate-100 group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`w-7 h-7 ${iconColor} stroke-[1.75]`} />
        </div>

        <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide mb-1.5 font-sans">
          {displayTitle}
        </h3>
        
        <p className="text-xs text-slate-500 leading-relaxed font-sans mb-5 font-normal">
          {displayDescription}
        </p>

        {actionButton && (
          <div className="mt-1">
            {actionButton}
          </div>
        )}
      </div>
    </div>
  );
};
