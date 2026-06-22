# HƯỚNG DẪN TRIỂN KHAI PHÂN TÁN PORTAL TRÊN VERCEL & SUPABASE
*(Dành cho Kiến trúc sư Fullstack / Phát triển Hệ thống)*

Tài liệu này hướng dẫn chi tiết cách đóng gói, di chuyển và triển khai hệ thống Portal Sinh hoạt hè từ môi trường sandbox hiện tại sang nền tảng đám mây phân tán chuyên nghiệp (**Next.js 15 App Router** chạy trên **Vercel** kết nối cơ sở dữ liệu **Supabase PostgreSQL Realtime**).

---

## 1. PHÂN TÍCH LUỒNG ĐỒNG BỘ DỮ LIỆU ĐANG CHẠY (SANDBOX)

Trong môi trường hiện tại, chúng tôi đã khắc phục triệt để lỗi bất đồng bộ bằng kiến trúc **Server-Authoritative** (Máy chủ làm trọng tâm):
* **Tắt bỏ initialization từ LocalStorage**: Các mảng dữ liệu không còn khởi tạo từ cache cục bộ của riêng mỗi trình duyệt.
* **Tách biệt luồng Admin & Khách**: Quyền hạn `Guest` và `User` mặc định không bao giờ có thể tự cấu hình và tự ý thực hiện lưu đè (`/api/save-all-data`). Chỉ khi Admin chỉnh sửa thủ công mới đẩy cấu hình tổng thể.
* **Giao dịch nhỏ hạt (Granular API)**: Các hoạt động đăng ký chuyên cần thiếu nhi (`/api/register-attendance`), đăng ký ban phụ trách (`/api/register-volunteer`), thích ảnh dạo, ghi nhật ký hoạt động hệ thống (`/api/add-audit-log`) được tách thành các **REST API cục bộ**. Khi chạy, Client gửi đúng bản ghi bị thay đổi, Server tự giải quyết xung đột bằng thuật toán Merge ở tầng Backend, sau đó ghi trực tiếp vào File Store mà không gây đè hoặc xóa mất dữ liệu của người dùng khác đang sửa đổi song song.
* **Realtime Polling (2.5 giây/lần)**: Đảm bảo toàn bộ thiết bị đang trực tuyến đều thấy cấu hình mới nhất mà không phải tải lại trang (Không cần F5).

---

## 2. CHUYỂN ĐỔI SANG KỶ NGUYÊN SUPABASE & VERCEL

### Bước 1: Khởi tạo Cơ sở dữ liệu Supabase
1. Truy cập [Supabase Console](https://supabase.com) và khởi tạo một dự án mới.
2. Mở mục **SQL Editor**, sao chép toàn bộ mã nguồn SQL trong tệp `supabase_schema.sql` hiện có ở thư mục gốc mã nguồn của bạn và nhấn **Run** để khởi chạy.
3. Kịch bản SQL này sẽ tự động:
   * Tạo toàn bộ bảng chuẩn chỉ (`portal_weeks`, `portal_banners`, `portal_attendance`, `portal_volunteers`, `audit_logs`, v.v.).
   * Kích hoạt sẵn tính năng **Row-Level-Security (RLS)** trên toàn hệ thống để chống đánh cắp hoặc đổi bừa dữ liệu.
   * Cấp quyền đọc tự do cho công chúng (`Viewer` / `Public`) nhưng khóa chặt quyền thêm/sửa/xóa chỉ dành riêng cho tài khoản có vai trò `Super Admin` và `Admin`.
   * Gán tài khoản điều hành mặc định `ngsoanng@gmail.com` của bạn nắm quyền tối cao `Super Admin`.

### Bước 2: Tạo dự án Next.js 15 App Router
Trong mã nguồn Next.js 15 mới của bạn, cấu trúc thư mục được khuyến nghị cho CMS quản trị như sau:
```text
my-portal-cms/
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Gốc bọc của toàn bộ trang
│   │   ├── page.tsx               # Trang chính Portal (Server component lấy trực tiếp từ Supabase, force-dynamic)
│   │   ├── admin/
│   │   │   ├── page.tsx           # Trang quản trị dành riêng cho Admin/Super Admin
│   │   │   └── middleware.ts      # Chặn truy cập phi pháp tại Edge bằng Next Middleware
│   │   └── api/
│   │       ├── register/route.ts  # Thay thế REST Endpoint lưu chuyên cần
│   │       └── logs/route.ts      # Nhật ký tác vụ trực tiếp
│   ├── components/                # Thư mục chứa các thành phần React UI mịn đẹp
│   │   ├── GalleryCarousel.tsx
│   │   ├── ActivityCard.tsx
│   │   └── AdminDashboard.tsx
│   └── lib/
│       └── supabase.ts            # Client khởi tạo Supabase (@supabase/supabase-js)
├── public/                        # Chứa các tài nguyên / ảnh tĩnh
├── supabase_schema.sql            # Bản thiết kế Cơ sở dữ liệu
└── .env.example                   # Khai báo môi trường chuẩn mẫu
```

### Bước 3: Thiết lập API Connectors & Realtime Hooks
Để đảm bảo cập nhật đồng bộ trong vòng **dưới 1 giây** mà hoàn toàn tắt cache, tại trang `src/app/page.tsx` và các component tương tác, áp dụng công nghệ Subscription Realtime của Supabase:

```typescript
// Thư viện quản lý Supabase Client (src/lib/supabase.ts)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

Tắt bộ nhớ đệm cache cưỡng bức tại tệp chính để đảm bảo Single Source of Truth luôn phục vụ dữ liệu mới nhất:
```typescript
// Ở đầu src/app/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;
```

Tích hợp lắng nghe Realtime trên Client thông qua React Hooks:
```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function usePortalRealtimeData() {
  const [weeks, setWeeks] = useState([]);

  useEffect(() => {
    // 1. Fetch dữ liệu lần đầu tiên từ DB
    const fetchData = async () => {
      const { data } = await supabase.from('portal_weeks').select('*').order('week_number', { ascending: true });
      if (data) setWeeks(data);
    };
    fetchData();

    // 2. Lắng nghe sự kiện sửa đổi từ Supabase Channel Realtime phát tín hiệu
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'portal_weeks' },
        (payload) => {
          console.log('Phát hiện cập nhật DB ngay tức thì!', payload);
          // Tự động kéo lại dữ liệu mới nhất mà không cần tải lại toàn bộ trang
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { weeks };
}
```

---

## 3. TRIỂN KHAI LÊN VERCEL TRONG 3 BƯỚC

1. Đẩy mã nguồn của bạn lên một tài khoản GitHub bí mật hoặc công khai.
2. Truy cập [Vercel Dashboard](https://vercel.com), nhấp chọn **Add New Project**, chọn liên kết kho GitHub chứa mã nguồn Next.js của bạn.
3. Trong mục **Environment Variables** (Biến môi trường cấu hình), nhập đầy đủ các khóa bảo mật sau:
   ```env
   # Liên kết kết nối cơ sở dữ liệu Supabase của bạn
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-key
   SUPABASE_SERVICE_ROLE_KEY=your-private-service-role-key-never-expose-to-browser
   ```
4. Nhấn **Deploy**. Vercel sẽ tự động tối ưu hóa, đóng gói mã nguồn phân tán toàn cầu (Edge Network) và khởi chạy trang web rực rỡ của bạn!

**KẾT THÚC TRIỂN KHAI:** Mọi hành động chỉnh sửa của Admin A tại bất cứ thiết bị nào đều kích hoạt luồng phát sự kiện Postgres thực tế. Hệ thống Vercel nhận thông báo dưới 1 giây và đồng bộ hiển thị màn hình mượt mà cho tất cả người đọc trên toàn cầu!
