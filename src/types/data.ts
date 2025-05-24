// src/types/data.ts
export interface Quota {
  id: string; // UUID, duy nhất cho mỗi định mức
  stageCode: string; // Mã công đoạn (người dùng nhập, nên là duy nhất)
  dailyQuota: number; // Định mức ngày
  order: number; // Để sắp xếp thứ tự hiển thị
}

export interface ProductionEntry {
  id: string; // UUID, duy nhất cho mỗi lần nhập
  date: string; // Định dạng YYYY-MM-DD (khóa chính cùng với stageCode cho một ngày)
  stageCode: string; // Mã công đoạn, tham chiếu đến Quota.stageCode
  quantity: number; // Số lượng sản xuất
}

// Dùng để nhóm các ProductionEntry theo ngày cho việc hiển thị trên Card
export interface DailyProductionData {
  date: string; // YYYY-MM-DD
  dayOfWeek: string; // Thứ trong tuần (ví dụ: "Thứ 2")
  formattedDate: string; // Ngày tháng định dạng (ví dụ: "21/04")
  entries: Array<{
    id: string; // <<<< THÊM DÒNG NÀY - ID của ProductionEntry
    stageCode: string;
    quantity: number;
    workAmount?: number; // Số công = quantity / dailyQuota (của stageCode đó)
  }>;
  totalWorkForDay?: number; // Tổng công của ngày
}

// ++ THÊM MỚI ++
// Interface for supplementary daily data (nghỉ, tăng ca, họp)
export interface DailySupplementaryData {
  date: string; // Primary key: YYYY-MM-DD, duy nhất cho mỗi entry
  leaveHours?: number | null; // Số giờ nghỉ
  overtimeHours?: number | null; // Số giờ tăng ca
  meetingMinutes?: number | null; // Số phút họp/đào tạo
}
// ++ KẾT THÚC THÊM MỚI ++